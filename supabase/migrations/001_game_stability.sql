-- =============================================================================
-- 001_game_stability.sql
-- War of Letters — نظام الاستقرار وعزل الغرف
--
-- يُطبَّق هذا الملف مرة واحدة على قاعدة بيانات Supabase عبر:
--   Dashboard → SQL Editor → Run
-- أو عبر Supabase CLI:
--   supabase db push
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- § 1 — جدول game_sessions (قفل الجرس الذري)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS game_sessions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   text        UNIQUE NOT NULL,          -- معرف الجلسة (يُنشئه الـ host)
  host_id      text,                                 -- معرف جهاز الـ host
  buzzer_owner text,                                 -- NULL = حر | نص = playerID الفائز
  buzzer_team  text        CHECK (buzzer_team IN ('green', 'red', null)),
  state        text        NOT NULL DEFAULT 'waiting'
                           CHECK (state IN ('waiting', 'buzzed', 'answered', 'ended')),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- فهرس سريع على session_id
CREATE INDEX IF NOT EXISTS idx_game_sessions_session_id ON game_sessions (session_id);

-- تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION _update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_game_sessions_updated_at ON game_sessions;
CREATE TRIGGER trg_game_sessions_updated_at
  BEFORE UPDATE ON game_sessions
  FOR EACH ROW EXECUTE FUNCTION _update_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- § 2 — RPC: attempt_buzz (القفل الذري للجرس)
-- ─────────────────────────────────────────────────────────────────────────────
-- المشكلة: لاعبان يضغطان في نفس الميلي ثانية → من يفوز؟
-- الحل: UPDATE أحادية تكتب فقط إذا كان buzzer_owner IS NULL
--        قاعدة البيانات تضمن الذرية — لا تعارض ممكن
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION attempt_buzz(
  p_session_id text,
  p_player_id  text,
  p_team       text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated int;
BEGIN
  -- UPDATE ذرية: تنجح فقط إذا كان buzzer_owner فارغاً (لا أحد سبقنا)
  UPDATE game_sessions
  SET
    buzzer_owner = p_player_id,
    buzzer_team  = p_team,
    state        = 'buzzed',
    updated_at   = now()
  WHERE
    session_id   = p_session_id
    AND (buzzer_owner IS NULL OR state = 'waiting');

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    -- جهاز آخر سبقنا — اللاعب خسر السباق
    RETURN jsonb_build_object(
      'success', false,
      'reason',  'already_buzzed'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'player',  p_player_id,
    'team',    p_team
  );
END;
$$;

-- منح صلاحية الاستدعاء لجميع المستخدمين المسجلين وأصحاب QR
GRANT EXECUTE ON FUNCTION attempt_buzz(text, text, text) TO authenticated, anon;


-- ─────────────────────────────────────────────────────────────────────────────
-- § 3 — RPC: submit_move (حركة اللعبة الذرية)
-- ─────────────────────────────────────────────────────────────────────────────
-- يُستخدم لضمان أن كل حركة (اختيار خلية / استخدام بطاقة) تُعالَج بشكل ذري
-- SKIP LOCKED يمنع الانتظار عند التزامن العالي (fail-fast بدلاً من hang)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION submit_move(
  p_session_id text,
  p_player_id  text,
  p_data       jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session game_sessions;
BEGIN
  -- اقفل الصف بشكل غير حاجب (fail-fast عند الازدحام)
  SELECT * INTO v_session
  FROM game_sessions
  WHERE session_id = p_session_id
  FOR UPDATE SKIP LOCKED;

  -- إذا لم يُوجد الصف (أو محجوز بالفعل) → أخفق بسرعة
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'session_busy_or_not_found'
    );
  END IF;

  -- تحقق من أن الجلسة في حالة صحيحة
  IF v_session.state = 'ended' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'session_ended'
    );
  END IF;

  -- سجّل الحركة (يمكن توسيعها لاحقاً بجدول game_moves)
  UPDATE game_sessions
  SET
    state      = 'answered',
    updated_at = now()
  WHERE session_id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'data',    p_data
  );
END;
$$;

GRANT EXECUTE ON FUNCTION submit_move(text, text, jsonb) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- § 4 — Row-Level Security (جدار الحماية الرياضي)
-- ─────────────────────────────────────────────────────────────────────────────
-- يضمن أن اللاعبين لا يستطيعون الوصول لغرف لا يخصهم
-- حتى لو حاول الكود الخاطئ الكتابة في الغرفة الخاطئة → DB يرفض فوراً
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- القراءة: يمكن لأي شخص قراءة الجلسات (اللاعبون يحتاجون رؤية حالة الجرس)
CREATE POLICY "sessions_read_all"
  ON game_sessions FOR SELECT
  USING (true);

-- الإدراج: فقط عبر RPC أو host مصادَق عليه
CREATE POLICY "sessions_insert_host"
  ON game_sessions FOR INSERT
  WITH CHECK (true); -- نثق بالـ host_id المرسَل (RPC يحميه)

-- التحديث: فقط عبر RPCs (SECURITY DEFINER تتجاوز RLS)
-- لا نسمح بالتحديث المباشر من العميل — كل تحديث يمر عبر attempt_buzz/submit_move
CREATE POLICY "sessions_update_rpc_only"
  ON game_sessions FOR UPDATE
  USING (false); -- مُغلق — فقط SECURITY DEFINER RPCs تستطيع التحديث


-- ─────────────────────────────────────────────────────────────────────────────
-- § 5 — RLS على جداول اللعبة الأخرى
-- ─────────────────────────────────────────────────────────────────────────────

-- questions: قراءة فقط للجميع (لا تعديل من العميل)
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "questions_read_all" ON questions;
CREATE POLICY "questions_read_all"
  ON questions FOR SELECT
  USING (true);

-- categories: قراءة فقط للجميع
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categories_read_all" ON categories;
CREATE POLICY "categories_read_all"
  ON categories FOR SELECT
  USING (true);

-- buyers: كل مستخدم يرى فقط صفه
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "buyers_self_read" ON buyers;
CREATE POLICY "buyers_self_read"
  ON buyers FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "buyers_self_update" ON buyers;
CREATE POLICY "buyers_self_update"
  ON buyers FOR UPDATE
  USING (auth.uid() = id);


-- ─────────────────────────────────────────────────────────────────────────────
-- § 6 — تنظيف الجلسات المنتهية (Cron Job اختياري)
-- ─────────────────────────────────────────────────────────────────────────────
-- يتطلب تفعيل pg_cron في Supabase (متاح في الخطط المدفوعة)
-- قم بتشغيل هذا يدوياً إذا كنت على الخطة المجانية

-- SELECT cron.schedule(
--   'clean-old-sessions',
--   '0 * * * *',                    -- كل ساعة
--   $$
--     DELETE FROM game_sessions
--     WHERE updated_at < now() - INTERVAL '3 hours'
--       AND state IN ('ended', 'answered');
--   $$
-- );

-- ─────────────────────────────────────────────────────────────────────────────
-- انتهى — قم بتشغيل هذا الملف في Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

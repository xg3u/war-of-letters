-- 014_session_analytics.sql
-- نظام تتبع الجلسات + تحليلات الأدمن
--
-- الجداول:
--   session_logs — سجل كل جلسة لعب (بداية، نهاية، لاعبين، وضع اللعبة)
--
-- RPCs:
--   log_session_start   — يُسجل بداية جلسة جديدة (يُستدعى من HostScreen)
--   log_session_end     — يُسجل نهاية الجلسة (عادية أو إجبارية)
--   get_admin_analytics — يُرجع إحصائيات مُجمعة للأدمن (استدعاء واحد = كل البيانات)

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. جدول session_logs
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS session_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_code    TEXT NOT NULL,              -- كود الغرفة (مثل "ABC12")
  host_user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  host_email      TEXT,                       -- للعرض بدون join
  game_mode       TEXT DEFAULT 'wall-to-wall',-- وضع الفوز
  rounds_setting  INT  DEFAULT 3,            -- عدد الجولات المُعد
  rounds_played   INT  DEFAULT 0,            -- عدد الجولات المُنجزة
  peak_players    INT  DEFAULT 0,            -- أقصى عدد لاعبين متزامنين
  started_at      TIMESTAMPTZ DEFAULT now(),
  ended_at        TIMESTAMPTZ,               -- NULL = الجلسة لا تزال نشطة
  status          TEXT DEFAULT 'active'
                  CHECK (status IN ('active', 'ended', 'force_closed'))
);

-- فهرس لتسريع بحث الجلسات النشطة + التاريخية
CREATE INDEX IF NOT EXISTS idx_session_logs_status   ON session_logs(status);
CREATE INDEX IF NOT EXISTS idx_session_logs_started  ON session_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_logs_host     ON session_logs(host_user_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. RLS — الأدمن يقرأ الكل، المستخدم يدير جلساته
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;

-- الأدمن يشوف + يعدّل الكل
DROP POLICY IF EXISTS "sl_admin_all" ON session_logs;
CREATE POLICY "sl_admin_all"
  ON session_logs FOR ALL
  USING (is_admin());

-- المضيف يقدر يدير جلساته
DROP POLICY IF EXISTS "sl_host_manage" ON session_logs;
CREATE POLICY "sl_host_manage"
  ON session_logs FOR ALL
  USING (auth.uid() = host_user_id)
  WITH CHECK (auth.uid() = host_user_id);

-- أي مستخدم مسجّل يقدر يُنشئ جلسة
DROP POLICY IF EXISTS "sl_auth_insert" ON session_logs;
CREATE POLICY "sl_auth_insert"
  ON session_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. RPC: log_session_start
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION log_session_start(
  p_session_code TEXT,
  p_game_mode    TEXT DEFAULT 'wall-to-wall',
  p_rounds       INT  DEFAULT 3
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid     UUID := auth.uid();
  u_email TEXT;
  new_id  UUID;
BEGIN
  -- جلب البريد الإلكتروني للمضيف
  SELECT email INTO u_email FROM auth.users WHERE id = uid;

  -- إنهاء أي جلسة سابقة لنفس الكود لم تُغلق
  UPDATE session_logs
  SET status = 'ended', ended_at = now()
  WHERE session_code = p_session_code AND status = 'active';

  -- إنشاء سجل جديد
  INSERT INTO session_logs (session_code, host_user_id, host_email, game_mode, rounds_setting)
  VALUES (p_session_code, uid, u_email, p_game_mode, p_rounds)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. RPC: log_session_end
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION log_session_end(
  p_session_code  TEXT,
  p_rounds_played INT DEFAULT 0,
  p_peak_players  INT DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE session_logs
  SET status         = 'ended',
      ended_at       = now(),
      rounds_played  = p_rounds_played,
      peak_players   = GREATEST(peak_players, p_peak_players)
  WHERE session_code = p_session_code
    AND status       = 'active'
    AND (host_user_id = auth.uid() OR is_admin());
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. RPC: update_session_players (تحديث أقصى عدد لاعبين)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_session_players(
  p_session_code TEXT,
  p_player_count INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE session_logs
  SET peak_players = GREATEST(peak_players, p_player_count)
  WHERE session_code = p_session_code
    AND status       = 'active'
    AND host_user_id = auth.uid();
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. RPC: admin_force_close_session
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION admin_force_close_session(p_session_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can force-close sessions';
  END IF;

  UPDATE session_logs
  SET status   = 'force_closed',
      ended_at = now()
  WHERE session_code = p_session_code
    AND status       = 'active';
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. RPC: get_admin_analytics — استدعاء واحد = كل الإحصائيات
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_admin_analytics(p_days INT DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  result    JSONB;
  from_date TIMESTAMPTZ;
BEGIN
  IF NOT is_admin() THEN
    RETURN '{}'::jsonb;
  END IF;

  from_date := now() - (p_days || ' days')::interval;

  SELECT jsonb_build_object(

    -- ── الجلسات النشطة حالياً ──────────────────────────────────────────────
    'active_sessions', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id',             s.id,
        'session_code',   s.session_code,
        'host_email',     s.host_email,
        'game_mode',      s.game_mode,
        'rounds_setting', s.rounds_setting,
        'peak_players',   s.peak_players,
        'started_at',     s.started_at,
        'duration_min',   ROUND(EXTRACT(EPOCH FROM (now() - s.started_at)) / 60)
      ) ORDER BY s.started_at DESC), '[]'::jsonb)
      FROM session_logs s WHERE s.status = 'active'
    ),

    -- ── إحصائيات يومية ─────────────────────────────────────────────────────
    'daily_sessions', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'd',       sub.d,
        'sessions', sub.cnt,
        'players', sub.total_players,
        'avg_dur', sub.avg_dur
      ) ORDER BY sub.d), '[]'::jsonb)
      FROM (
        SELECT started_at::date AS d,
               COUNT(*)         AS cnt,
               SUM(peak_players) AS total_players,
               ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(ended_at, now()) - started_at)) / 60)) AS avg_dur
        FROM session_logs
        WHERE started_at >= from_date
        GROUP BY started_at::date
      ) sub
    ),

    -- ── تسجيلات يومية ──────────────────────────────────────────────────────
    'daily_registrations', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'd', sub.d, 'cnt', sub.cnt
      ) ORDER BY sub.d), '[]'::jsonb)
      FROM (
        SELECT created_at::date AS d, COUNT(*) AS cnt
        FROM buyers
        WHERE created_at >= from_date
        GROUP BY created_at::date
      ) sub
    ),

    -- ── توزيع الباقات ──────────────────────────────────────────────────────
    'plan_distribution', (
      SELECT jsonb_build_object(
        'free',     COUNT(*) FILTER (WHERE plan_type = 'free'),
        'temp',     COUNT(*) FILTER (WHERE plan_type IN ('single','3_days','72_hours')),
        'lifetime', COUNT(*) FILTER (WHERE plan_type = 'lifetime')
      )
      FROM buyers
    ),

    -- ── توزيع ساعات اللعب ──────────────────────────────────────────────────
    'hourly_distribution', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'h', sub.h, 'cnt', sub.cnt
      ) ORDER BY sub.h), '[]'::jsonb)
      FROM (
        SELECT EXTRACT(HOUR FROM started_at)::int AS h, COUNT(*) AS cnt
        FROM session_logs
        WHERE started_at >= from_date
        GROUP BY EXTRACT(HOUR FROM started_at)::int
      ) sub
    ),

    -- ── أكثر المضيفين نشاطاً ────────────────────────────────────────────────
    'top_hosts', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'email', sub.host_email,
        'cnt',   sub.cnt,
        'total_players', sub.tp
      ) ORDER BY sub.cnt DESC), '[]'::jsonb)
      FROM (
        SELECT host_email, COUNT(*) AS cnt, SUM(peak_players) AS tp
        FROM session_logs
        WHERE started_at >= from_date AND host_email IS NOT NULL
        GROUP BY host_email
        ORDER BY cnt DESC
        LIMIT 10
      ) sub
    ),

    -- ── ملخص عام ────────────────────────────────────────────────────────────
    'summary', jsonb_build_object(
      'total_sessions',    (SELECT COUNT(*) FROM session_logs WHERE started_at >= from_date),
      'total_active',      (SELECT COUNT(*) FROM session_logs WHERE status = 'active'),
      'avg_duration_min',  (SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60)), 0) FROM session_logs WHERE started_at >= from_date AND ended_at IS NOT NULL),
      'avg_players',       (SELECT COALESCE(ROUND(AVG(peak_players)::numeric, 1), 0) FROM session_logs WHERE started_at >= from_date AND peak_players > 0),
      'total_users',       (SELECT COUNT(*) FROM buyers),
      'active_hosts',      (SELECT COUNT(DISTINCT host_user_id) FROM session_logs WHERE started_at >= from_date)
    )

  ) INTO result;

  RETURN result;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 004_lobby_table.sql
-- جدول غرفة الانتظار — يُستخدم للتسجيل عبر HTTP بدلاً من Supabase Realtime
-- الهدف: تخفيض استهلاك حصة Realtime خلال مرحلة اللوبي (قبل بدء اللعبة)
--
-- الاستخدام:
--   اللاعب: INSERT / UPSERT عند التسجيل (HTTP POST)
--   المضيف: SELECT كل 5 ثوانٍ عبر usePolling (HTTP GET، لا WebSocket)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS game_lobby (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  TEXT        NOT NULL,
  player_name TEXT        NOT NULL,
  team        TEXT        NOT NULL CHECK (team IN ('green', 'red')),
  avatar      JSONB,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- اسم فريد لكل لاعب داخل نفس الجلسة
  UNIQUE (session_id, player_name)
);

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE game_lobby ENABLE ROW LEVEL SECURITY;

-- القراءة العامة (المضيف + اللاعبون يقرؤون قائمة الانتظار)
CREATE POLICY "Public read game_lobby"
  ON game_lobby FOR SELECT
  USING (true);

-- الإدراج العام (اللاعبون يسجلون أنفسهم)
CREATE POLICY "Public insert game_lobby"
  ON game_lobby FOR INSERT
  WITH CHECK (true);

-- التحديث العام (تغيير الفريق أو الأفاتار)
CREATE POLICY "Public update game_lobby"
  ON game_lobby FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- الحذف العام (اللاعب يغادر اللوبي)
CREATE POLICY "Public delete game_lobby"
  ON game_lobby FOR DELETE
  USING (true);

-- ── Indexes ───────────────────────────────────────────────────────────────
-- الاستعلام الرئيسي: SELECT ... WHERE session_id = ? ORDER BY joined_at
CREATE INDEX IF NOT EXISTS idx_game_lobby_session
  ON game_lobby (session_id, joined_at);

-- ── RPC: upsert_lobby_player ───────────────────────────────────────────────
-- إدراج أو تحديث اللاعب في نفس استدعاء RPC واحد
CREATE OR REPLACE FUNCTION upsert_lobby_player(
  p_session_id  TEXT,
  p_player_name TEXT,
  p_team        TEXT,
  p_avatar      JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO game_lobby (session_id, player_name, team, avatar)
  VALUES (p_session_id, p_player_name, p_team, p_avatar)
  ON CONFLICT (session_id, player_name)
  DO UPDATE SET
    team      = EXCLUDED.team,
    avatar    = EXCLUDED.avatar,
    joined_at = NOW();
END;
$$;

-- ── RPC: leave_lobby ──────────────────────────────────────────────────────
-- حذف اللاعب عند المغادرة
CREATE OR REPLACE FUNCTION leave_lobby(
  p_session_id  TEXT,
  p_player_name TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM game_lobby
  WHERE session_id = p_session_id
    AND player_name = p_player_name;
END;
$$;

-- ── RPC: clear_lobby_session ──────────────────────────────────────────────
-- المضيف يُنظّف الجلسة كاملة عند انتهاء اللعبة أو إعادة التشغيل
CREATE OR REPLACE FUNCTION clear_lobby_session(p_session_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM game_lobby WHERE session_id = p_session_id;
END;
$$;

-- ── تنظيف تلقائي: حذف إدخالات أقدم من 24 ساعة ───────────────────────────
-- (يمكن تشغيله عبر Supabase pg_cron أو Scheduled Functions)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('cleanup-game-lobby', '0 * * * *',
--   'DELETE FROM game_lobby WHERE joined_at < NOW() - INTERVAL ''24 hours''');

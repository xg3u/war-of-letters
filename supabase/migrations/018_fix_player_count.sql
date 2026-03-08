-- 018_fix_player_count.sql
-- إصلاح تحديث عدد اللاعبين — إزالة شرط host_user_id لأن SECURITY DEFINER يكفي

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. تحديث update_session_players — أي مستخدم مسجّل يقدر يحدّث عدد اللاعبين
--    لجلسته (شرط session_code + active يكفي)
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
    AND status       = 'active';
END;
$$;

GRANT EXECUTE ON FUNCTION update_session_players(TEXT, INT) TO authenticated;

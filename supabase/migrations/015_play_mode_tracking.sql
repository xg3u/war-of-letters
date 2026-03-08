-- 015_play_mode_tracking.sql
-- تتبع نوع اللعبة (حرب الحروف vs حروف مع عزيز)

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. إضافة عمود play_mode لجدول session_logs
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE session_logs
  ADD COLUMN IF NOT EXISTS play_mode TEXT DEFAULT 'normal'
  CHECK (play_mode IN ('normal', 'tv-show'));

COMMENT ON COLUMN session_logs.play_mode IS 'normal = حرب الحروف, tv-show = حروف مع عزيز';

-- فهرس لتسريع التجميع حسب play_mode
CREATE INDEX IF NOT EXISTS idx_session_logs_play_mode ON session_logs(play_mode);

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. تحديث log_session_start لقبول p_play_mode
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION log_session_start(
  p_session_code TEXT,
  p_game_mode    TEXT DEFAULT 'wall-to-wall',
  p_rounds       INT  DEFAULT 3,
  p_play_mode    TEXT DEFAULT 'normal'
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
  SELECT email INTO u_email FROM auth.users WHERE id = uid;

  UPDATE session_logs
  SET status = 'ended', ended_at = now()
  WHERE session_code = p_session_code AND status = 'active';

  INSERT INTO session_logs (session_code, host_user_id, host_email, game_mode, rounds_setting, play_mode)
  VALUES (p_session_code, uid, u_email, p_game_mode, p_rounds, COALESCE(p_play_mode, 'normal'))
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. تحديث get_admin_analytics لإضافة mode_distribution
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
        'play_mode',      COALESCE(s.play_mode, 'normal'),
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

    -- ── توزيع أوضاع اللعب (جديد) ──────────────────────────────────────────
    'mode_distribution', (
      SELECT jsonb_build_object(
        'normal',  COUNT(*) FILTER (WHERE COALESCE(play_mode, 'normal') = 'normal'),
        'tv_show', COUNT(*) FILTER (WHERE play_mode = 'tv-show')
      )
      FROM session_logs
      WHERE started_at >= from_date
    ),

    -- ── توزيع أوضاع الفوز ──────────────────────────────────────────────────
    'win_mode_distribution', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'mode', sub.gm, 'cnt', sub.cnt
      ) ORDER BY sub.cnt DESC), '[]'::jsonb)
      FROM (
        SELECT game_mode AS gm, COUNT(*) AS cnt
        FROM session_logs
        WHERE started_at >= from_date
        GROUP BY game_mode
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

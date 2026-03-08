-- ═══════════════════════════════════════════════════════════════════════════
-- SETUP_ALL.sql — War of Letters
-- شغّل هذا الملف كاملاً في: Supabase Dashboard → SQL Editor → Run
-- آمن للتشغيل أكثر من مرة (IF NOT EXISTS + CREATE OR REPLACE)
-- ═══════════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════
-- PART 1 — game_sessions + RPCs الأساسية
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS game_sessions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   text        UNIQUE NOT NULL,
  host_id      text,
  buzzer_owner text,
  buzzer_team  text        CHECK (buzzer_team IN ('green', 'red', null)),
  state        text        NOT NULL DEFAULT 'waiting'
                           CHECK (state IN ('waiting', 'buzzed', 'answered', 'ended')),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_session_id ON game_sessions (session_id);

CREATE OR REPLACE FUNCTION _update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_game_sessions_updated_at ON game_sessions;
CREATE TRIGGER trg_game_sessions_updated_at
  BEFORE UPDATE ON game_sessions
  FOR EACH ROW EXECUTE FUNCTION _update_updated_at();

CREATE OR REPLACE FUNCTION attempt_buzz(p_session_id text, p_player_id text, p_team text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_updated int;
BEGIN
  UPDATE game_sessions
  SET buzzer_owner = p_player_id, buzzer_team = p_team, state = 'buzzed', updated_at = now()
  WHERE session_id = p_session_id AND (buzzer_owner IS NULL OR state = 'waiting');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_buzzed');
  END IF;
  RETURN jsonb_build_object('success', true, 'player', p_player_id, 'team', p_team);
END;
$$;
GRANT EXECUTE ON FUNCTION attempt_buzz(text, text, text) TO authenticated, anon;

CREATE OR REPLACE FUNCTION submit_move(p_session_id text, p_player_id text, p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_session game_sessions;
BEGIN
  SELECT * INTO v_session FROM game_sessions WHERE session_id = p_session_id FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'session_busy_or_not_found'); END IF;
  IF v_session.state = 'ended' THEN RETURN jsonb_build_object('success', false, 'error', 'session_ended'); END IF;
  UPDATE game_sessions SET state = 'answered', updated_at = now() WHERE session_id = p_session_id;
  RETURN jsonb_build_object('success', true, 'data', p_data);
END;
$$;
GRANT EXECUTE ON FUNCTION submit_move(text, text, jsonb) TO authenticated;

-- RLS للجداول الأساسية
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sessions_read_all"     ON game_sessions;
DROP POLICY IF EXISTS "sessions_insert_host"  ON game_sessions;
DROP POLICY IF EXISTS "sessions_update_rpc_only" ON game_sessions;
CREATE POLICY "sessions_read_all"        ON game_sessions FOR SELECT USING (true);
CREATE POLICY "sessions_insert_host"     ON game_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "sessions_update_rpc_only" ON game_sessions FOR UPDATE USING (false);

-- questions
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "questions_read_all" ON questions;
CREATE POLICY "questions_read_all" ON questions FOR SELECT USING (true);

-- categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categories_read_all" ON categories;
CREATE POLICY "categories_read_all" ON categories FOR SELECT USING (true);

-- buyers
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "buyers_self_read"   ON buyers;
DROP POLICY IF EXISTS "buyers_self_update" ON buyers;
DROP POLICY IF EXISTS "buyers_insert_self" ON buyers;
CREATE POLICY "buyers_self_read"   ON buyers FOR SELECT USING (auth.uid() = id);
CREATE POLICY "buyers_self_update" ON buyers FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "buyers_insert_self" ON buyers FOR INSERT WITH CHECK (auth.uid() = id);


-- ══════════════════════════════════════════════════════════════════════
-- PART 2 — get_random_questions RPC
-- ══════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_questions_letter ON questions (letter_assigned);

CREATE OR REPLACE FUNCTION get_random_questions(
  p_letter       text,
  p_limit        int     DEFAULT 50,
  p_exclude_ids  uuid[]  DEFAULT '{}'
)
RETURNS TABLE (
  id               uuid,
  question_text    text,
  correct_answer   text,
  letter_assigned  text,
  category_id      uuid
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_count bigint;
BEGIN
  SELECT COUNT(*) INTO v_count FROM questions WHERE letter_assigned = p_letter;
  IF v_count > 500 THEN
    RETURN QUERY
      SELECT q.id, q.question_text, q.correct_answer, q.letter_assigned, q.category_id
      FROM questions TABLESAMPLE BERNOULLI(10) AS q
      WHERE q.letter_assigned = p_letter AND NOT (q.id = ANY(p_exclude_ids))
      ORDER BY random() LIMIT p_limit;
  ELSE
    RETURN QUERY
      SELECT q.id, q.question_text, q.correct_answer, q.letter_assigned, q.category_id
      FROM questions q
      WHERE q.letter_assigned = p_letter AND NOT (q.id = ANY(p_exclude_ids))
      ORDER BY random() LIMIT p_limit;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION get_random_questions(text, int, uuid[]) TO authenticated, anon;

CREATE OR REPLACE FUNCTION get_question_counts_by_letter()
RETURNS TABLE (letter_assigned text, question_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT letter_assigned, COUNT(*) AS question_count
  FROM questions
  WHERE letter_assigned IS NOT NULL
  GROUP BY letter_assigned;
$$;
GRANT EXECUTE ON FUNCTION get_question_counts_by_letter() TO authenticated, anon;


-- ══════════════════════════════════════════════════════════════════════
-- PART 3 — partner_profiles + partner_orders
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS partner_profiles (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT    NOT NULL,
  whatsapp_number TEXT    NOT NULL,
  gender          TEXT    NOT NULL CHECK (gender IN ('male', 'female')),
  age             INTEGER NOT NULL CHECK (age BETWEEN 16 AND 100),
  store_link      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE partner_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Partners manage own profile" ON partner_profiles;
DROP POLICY IF EXISTS "Admins view all profiles"    ON partner_profiles;
CREATE POLICY "Partners manage own profile"
  ON partner_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins view all profiles"
  ON partner_profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM buyers WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE IF NOT EXISTS partner_orders (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name  TEXT        NOT NULL,
  quantity   INTEGER     NOT NULL CHECK (quantity > 0 AND quantity <= 1000),
  status     TEXT        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'approved', 'rejected')),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE partner_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Partners read own orders"   ON partner_orders;
DROP POLICY IF EXISTS "Partners insert own orders" ON partner_orders;
DROP POLICY IF EXISTS "Admins manage all orders"   ON partner_orders;
CREATE POLICY "Partners read own orders"   ON partner_orders FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "Partners insert own orders" ON partner_orders FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage all orders"   ON partner_orders FOR ALL
  USING (EXISTS (SELECT 1 FROM buyers WHERE id = auth.uid() AND role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_partner_orders_status ON partner_orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_orders_user   ON partner_orders (user_id, created_at DESC);


-- ══════════════════════════════════════════════════════════════════════
-- PART 4 — game_lobby
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS game_lobby (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  TEXT        NOT NULL,
  player_name TEXT        NOT NULL,
  team        TEXT        NOT NULL CHECK (team IN ('green', 'red')),
  avatar      JSONB,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, player_name)
);

ALTER TABLE game_lobby ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read game_lobby"   ON game_lobby;
DROP POLICY IF EXISTS "Public insert game_lobby" ON game_lobby;
DROP POLICY IF EXISTS "Public update game_lobby" ON game_lobby;
DROP POLICY IF EXISTS "Public delete game_lobby" ON game_lobby;
CREATE POLICY "Public read game_lobby"   ON game_lobby FOR SELECT USING (true);
CREATE POLICY "Public insert game_lobby" ON game_lobby FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update game_lobby" ON game_lobby FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete game_lobby" ON game_lobby FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_game_lobby_session ON game_lobby (session_id, joined_at);

CREATE OR REPLACE FUNCTION upsert_lobby_player(p_session_id TEXT, p_player_name TEXT, p_team TEXT, p_avatar JSONB DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO game_lobby (session_id, player_name, team, avatar)
  VALUES (p_session_id, p_player_name, p_team, p_avatar)
  ON CONFLICT (session_id, player_name)
  DO UPDATE SET team = EXCLUDED.team, avatar = EXCLUDED.avatar, joined_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION leave_lobby(p_session_id TEXT, p_player_name TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM game_lobby WHERE session_id = p_session_id AND player_name = p_player_name;
END;
$$;

CREATE OR REPLACE FUNCTION clear_lobby_session(p_session_id TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM game_lobby WHERE session_id = p_session_id;
END;
$$;


-- ══════════════════════════════════════════════════════════════════════
-- PART 5 — get_my_subscription RPC (تحسين سرعة جلب الباقة)
-- ══════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_buyers_email_lower ON buyers (lower(email));

CREATE OR REPLACE FUNCTION get_my_subscription()
RETURNS TABLE (plan_type text, subscription_status text, expires_at timestamptz, role text, referred_by_partner_id uuid)
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  _uid   uuid := auth.uid();
  _email text := lower(auth.email());
BEGIN
  RETURN QUERY SELECT b.plan_type, b.subscription_status, b.expires_at, b.role, b.referred_by_partner_id
    FROM buyers b WHERE b.id = _uid LIMIT 1;
  IF NOT FOUND THEN
    RETURN QUERY SELECT b.plan_type, b.subscription_status, b.expires_at, b.role, b.referred_by_partner_id
      FROM buyers b WHERE lower(b.email) = _email LIMIT 1;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION get_my_subscription() TO authenticated;


-- ══════════════════════════════════════════════════════════════════════
-- PART 6 — Realtime على buyers (إشعار فوري بتغيير الباقة)
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE buyers REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'buyers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE buyers;
  END IF;
END $$;


-- ══════════════════════════════════════════════════════════════════════
-- PART 7 — تعيين دور الأدمن لـ mmshlfars@gmail.com
-- ══════════════════════════════════════════════════════════════════════

-- تحديث الدور إذا كان الصف موجوداً
UPDATE buyers SET role = 'admin' WHERE lower(email) = 'mmshlfars@gmail.com';

-- إضافته إذا لم يكن موجوداً
INSERT INTO buyers (id, email, plan_type, role, subscription_status)
SELECT u.id, u.email, 'free', 'admin', 'active'
FROM auth.users u
WHERE lower(u.email) = 'mmshlfars@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';


-- ══════════════════════════════════════════════════════════════════════
-- تحقق نهائي — يجب أن يُظهر role = admin
-- ══════════════════════════════════════════════════════════════════════
SELECT id, email, role, plan_type FROM buyers WHERE lower(email) = 'mmshlfars@gmail.com';

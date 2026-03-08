-- ═══════════════════════════════════════════════════════════════════════════
-- SETUP_PARTNER.sql — إنشاء جداول الشراكة فقط
-- شغّل هذا الملف في: Supabase Dashboard → SQL Editor → Run
-- آمن للتشغيل أكثر من مرة
-- ═══════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════
-- 1. partner_profiles
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS partner_profiles (
  user_id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT        NOT NULL,
  whatsapp_number TEXT        NOT NULL,
  gender          TEXT        NOT NULL CHECK (gender IN ('male', 'female')),
  age             INTEGER     NOT NULL CHECK (age BETWEEN 16 AND 100),
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


-- ══════════════════════════════════════════════════════════════════════
-- 2. partner_orders
-- ══════════════════════════════════════════════════════════════════════
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
CREATE INDEX IF NOT EXISTS idx_partner_orders_user   ON partner_orders (user_id,  created_at DESC);


-- ══════════════════════════════════════════════════════════════════════
-- 3. game_lobby (مطلوبة للعبة)
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
-- 4. تعيين دور الأدمن (تشغيله دائماً لا يضر)
-- ══════════════════════════════════════════════════════════════════════
UPDATE buyers SET role = 'admin' WHERE lower(email) = 'mmshlfars@gmail.com';

INSERT INTO buyers (id, email, plan_type, role, subscription_status)
SELECT u.id, u.email, 'free', 'admin', 'active'
FROM auth.users u
WHERE lower(u.email) = 'mmshlfars@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';


-- ══════════════════════════════════════════════════════════════════════
-- تحقق نهائي
-- ══════════════════════════════════════════════════════════════════════
SELECT 'partner_profiles' AS table_name, COUNT(*) AS rows FROM partner_profiles
UNION ALL
SELECT 'partner_orders',  COUNT(*) FROM partner_orders
UNION ALL
SELECT 'game_lobby',      COUNT(*) FROM game_lobby;

SELECT id, email, role FROM buyers WHERE lower(email) = 'mmshlfars@gmail.com';

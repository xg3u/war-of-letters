-- Migration 010 — Fix categories RLS + seed defaults + consolidate partner fixes
-- Run this in Supabase SQL Editor.

-- ── 1. Create categories table if not exists ─────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id       TEXT PRIMARY KEY,
  name_ar  TEXT NOT NULL
);

-- ── 2. Seed default categories (idempotent) ──────────────────────────────
INSERT INTO categories (id, name_ar) VALUES
  ('sports',    'رياضة'),
  ('history',   'تاريخ'),
  ('science',   'علوم'),
  ('geography', 'جغرافيا'),
  ('culture',   'ثقافة عامة'),
  ('islamic',   'ثقافة إسلامية')
ON CONFLICT (id) DO NOTHING;

-- ── 3. Enable RLS on categories ─────────────────────────────────────────
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- ── 4. Drop old policies (idempotent) ───────────────────────────────────
DROP POLICY IF EXISTS "Public read categories"              ON categories;
DROP POLICY IF EXISTS "Admins manage categories"            ON categories;
DROP POLICY IF EXISTS "Allow read for all"                  ON categories;
DROP POLICY IF EXISTS "Enable read access for all users"    ON categories;

-- ── 5. Everyone (anon + authenticated) can read categories ───────────────
CREATE POLICY "Public read categories"
  ON categories FOR SELECT
  USING (true);

-- ── 6. Admins can insert/update/delete categories ────────────────────────
CREATE POLICY "Admins manage categories"
  ON categories FOR ALL
  USING (
    EXISTS (SELECT 1 FROM buyers WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM buyers WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 7. Fix questions table RLS ───────────────────────────────────────────
ALTER TABLE IF EXISTS questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read questions"   ON questions;
DROP POLICY IF EXISTS "Admins manage questions" ON questions;

CREATE POLICY "Public read questions"
  ON questions FOR SELECT
  USING (true);

CREATE POLICY "Admins manage questions"
  ON questions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM buyers WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM buyers WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 8. partner_profiles table + correct RLS ─────────────────────────────
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
  ON partner_profiles FOR ALL
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all profiles"
  ON partner_profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM buyers WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 9. partner_orders table + correct RLS ───────────────────────────────
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

CREATE POLICY "Partners read own orders"
  ON partner_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Partners insert own orders"
  ON partner_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all orders"
  ON partner_orders FOR ALL
  USING (EXISTS (SELECT 1 FROM buyers WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM buyers WHERE id = auth.uid() AND role = 'admin'));

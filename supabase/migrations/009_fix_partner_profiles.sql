-- Migration 009 — Ensure partner_profiles table & correct RLS
-- Run this in Supabase SQL Editor if the partner onboarding form fails to save.

-- ── 1. Create table if it doesn't exist yet ────────────────────────────────
CREATE TABLE IF NOT EXISTS partner_profiles (
  user_id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT        NOT NULL,
  whatsapp_number TEXT        NOT NULL,
  gender          TEXT        NOT NULL CHECK (gender IN ('male', 'female')),
  age             INTEGER     NOT NULL CHECK (age BETWEEN 16 AND 100),
  store_link      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Enable RLS ─────────────────────────────────────────────────────────
ALTER TABLE partner_profiles ENABLE ROW LEVEL SECURITY;

-- ── 3. Drop old policies (idempotent) ─────────────────────────────────────
DROP POLICY IF EXISTS "Partners manage own profile" ON partner_profiles;
DROP POLICY IF EXISTS "Admins view all profiles"    ON partner_profiles;

-- ── 4. Recreate policies with explicit WITH CHECK (required for INSERT) ────
-- Partners can read/write only their own row
CREATE POLICY "Partners manage own profile"
  ON partner_profiles FOR ALL
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all profiles
CREATE POLICY "Admins view all profiles"
  ON partner_profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM buyers WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 5. Ensure partner_orders table exists too ─────────────────────────────
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
  USING (EXISTS (SELECT 1 FROM buyers WHERE id = auth.uid() AND role = 'admin'));

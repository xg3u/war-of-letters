-- ═══════════════════════════════════════════════════════════
-- Migration 003 — Partner Features
-- Tables: partner_profiles, partner_orders
-- ═══════════════════════════════════════════════════════════

-- ── partner_profiles ──────────────────────────────────────
-- Stores partner onboarding survey data (one row per partner)
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

-- Partners can read/write their own profile
CREATE POLICY "Partners manage own profile"
  ON partner_profiles FOR ALL
  USING (auth.uid() = user_id);

-- Admins can view all profiles (for "View Details" modal)
CREATE POLICY "Admins view all profiles"
  ON partner_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM buyers WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── partner_orders ─────────────────────────────────────────
-- Partners request code bundles; admins approve/reject
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

-- Partners can read and insert their own orders (but NOT update/delete)
CREATE POLICY "Partners read own orders"
  ON partner_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Partners insert own orders"
  ON partner_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can fully manage all orders
CREATE POLICY "Admins manage all orders"
  ON partner_orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM buyers WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Index for admin queries (filter by status)
CREATE INDEX IF NOT EXISTS idx_partner_orders_status
  ON partner_orders (status, created_at DESC);

-- Index for partner queries (filter by user_id)
CREATE INDEX IF NOT EXISTS idx_partner_orders_user
  ON partner_orders (user_id, created_at DESC);

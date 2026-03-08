-- 019_fix_partner_orders.sql
-- إصلاح طلبات الشركاء: إضافة حقل البادئة + إصلاح سياسات RLS

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. إنشاء الجدول إذا لم يكن موجوداً (للأمان)
-- ══════════════════════════════════════════════════════════════════════════════

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

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. إضافة عمود prefix (البادئة) — يستخدمها الأدمن عند إنشاء الأكواد
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE partner_orders
  ADD COLUMN IF NOT EXISTS prefix TEXT DEFAULT 'WOL';

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. إصلاح سياسات RLS — حذف القديمة وإنشاء جديدة
-- ══════════════════════════════════════════════════════════════════════════════

-- حذف السياسات القديمة (إن وُجدت)
DROP POLICY IF EXISTS "Partners read own orders" ON partner_orders;
DROP POLICY IF EXISTS "Partners insert own orders" ON partner_orders;
DROP POLICY IF EXISTS "Admins manage all orders" ON partner_orders;

-- الشركاء يقرأون طلباتهم فقط
CREATE POLICY "Partners read own orders"
  ON partner_orders FOR SELECT
  USING (auth.uid() = user_id);

-- الشركاء ينشئون طلبات لأنفسهم فقط
CREATE POLICY "Partners insert own orders"
  ON partner_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- الأدمن يدير كل الطلبات (قراءة + تحديث + حذف)
CREATE POLICY "Admins manage all orders"
  ON partner_orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM buyers WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. فهارس
-- ══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_partner_orders_status
  ON partner_orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_orders_user
  ON partner_orders (user_id, created_at DESC);

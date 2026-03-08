-- 012_fix_buyers_rls.sql
-- إصلاح RLS لجدول buyers:
--   1. السماح لكل مستخدم مسجل بإضافة صفه الخاص (INSERT)
--   2. السماح للأدمن بقراءة + تعديل + حذف كل الصفوف
--   3. السماح للشريك بقراءة عملاءه فقط
--
-- ملاحظة: نستخدم SECURITY DEFINER functions لتجنب infinite recursion
--         لأن الـ policies تحتاج تفحص جدول buyers نفسه

-- ── 0. Helper functions (SECURITY DEFINER — تتجاوز RLS) ─────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM buyers WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION is_partner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM buyers WHERE id = auth.uid() AND role = 'partner'
  );
$$;

-- ── 1. INSERT policy — المستخدم يضيف صفه فقط ────────────────────────────────
DROP POLICY IF EXISTS "buyers_self_insert" ON buyers;
CREATE POLICY "buyers_self_insert"
  ON buyers FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ── 2. Admin SELECT — الأدمن يشوف كل المستخدمين ─────────────────────────────
DROP POLICY IF EXISTS "buyers_admin_read" ON buyers;
CREATE POLICY "buyers_admin_read"
  ON buyers FOR SELECT
  USING (is_admin());

-- ── 3. Admin UPDATE — الأدمن يعدّل أي مستخدم ────────────────────────────────
DROP POLICY IF EXISTS "buyers_admin_update" ON buyers;
CREATE POLICY "buyers_admin_update"
  ON buyers FOR UPDATE
  USING (is_admin());

-- ── 4. Admin DELETE — الأدمن يحذف أي مستخدم ─────────────────────────────────
DROP POLICY IF EXISTS "buyers_admin_delete" ON buyers;
CREATE POLICY "buyers_admin_delete"
  ON buyers FOR DELETE
  USING (is_admin());

-- ── 5. Partner SELECT — الشريك يشوف عملاءه فقط ──────────────────────────────
DROP POLICY IF EXISTS "buyers_partner_read" ON buyers;
CREATE POLICY "buyers_partner_read"
  ON buyers FOR SELECT
  USING (is_partner() AND referred_by_partner_id = auth.uid());

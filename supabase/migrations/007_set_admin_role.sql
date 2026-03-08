-- ═══════════════════════════════════════════════════════════════════════════
-- 007_set_admin_role.sql
-- تعيين دور الأدمن لحساب mmshlfars@gmail.com
--
-- شغّل هذا في Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. تحديث الدور إذا كان الصف موجوداً ────────────────────────────────────
UPDATE buyers
SET role = 'admin'
WHERE lower(email) = 'mmshlfars@gmail.com';

-- ── 2. إذا لم يكن موجوداً → أضفه (يحتاج auth.uid المرتبط بالبريد) ──────────
-- ملاحظة: هذا يجلب UUID من جدول auth.users تلقائياً
INSERT INTO buyers (id, email, plan_type, role, subscription_status)
SELECT
  u.id,
  u.email,
  'free',
  'admin',
  'active'
FROM auth.users u
WHERE lower(u.email) = 'mmshlfars@gmail.com'
ON CONFLICT (id) DO UPDATE
  SET role = 'admin';

-- ── 3. تحقق من النتيجة ──────────────────────────────────────────────────────
SELECT id, email, role, plan_type
FROM buyers
WHERE lower(email) = 'mmshlfars@gmail.com';

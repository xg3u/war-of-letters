-- ═══════════════════════════════════════════════════════════════════════════
-- 005_subscription_rpc.sql
-- تسريع جلب بيانات الباقة:
--   1. فهرس على lower(email) يجعل البحث بالبريد O(log n) بدل O(n)
--   2. RPC get_my_subscription() تُجري كلا البحثين (UUID + email) في رحلة واحدة
--      بدل رحلتين HTTP متسلسلتين من العميل
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. فهرس البريد الإلكتروني (Case-Insensitive) ──────────────────────────
-- يُستخدم في: WHERE lower(email) = lower(?) بدل ILIKE الذي لا يستخدم الفهرس
CREATE INDEX IF NOT EXISTS idx_buyers_email_lower
  ON buyers (lower(email));

-- ── 2. RPC: get_my_subscription ────────────────────────────────────────────
-- تُعيد بيانات الباقة للمستخدم المُسجَّل حالياً
-- الخطوة 1: بحث بـ auth.uid()  ← O(1) PRIMARY KEY
-- الخطوة 2: إذا لم يُوجَد، بحث بـ lower(auth.email()) ← O(log n) INDEX
-- كلا الخطوتين تحدثان داخل استدعاء Postgres واحد — لا رحلة HTTP ثانية
CREATE OR REPLACE FUNCTION get_my_subscription()
RETURNS TABLE (
  plan_type             text,
  subscription_status   text,
  expires_at            timestamptz,
  role                  text,
  referred_by_partner_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  _uid   uuid := auth.uid();
  _email text := lower(auth.email());
BEGIN
  -- محاولة أولى: UUID (PRIMARY KEY — أسرع استعلام ممكن)
  RETURN QUERY
    SELECT b.plan_type, b.subscription_status, b.expires_at, b.role, b.referred_by_partner_id
    FROM buyers b
    WHERE b.id = _uid
    LIMIT 1;

  -- إذا لم يُعثَر على شيء → بحث بالبريد (عملاء Salla)
  IF NOT FOUND THEN
    RETURN QUERY
      SELECT b.plan_type, b.subscription_status, b.expires_at, b.role, b.referred_by_partner_id
      FROM buyers b
      WHERE lower(b.email) = _email
      LIMIT 1;
  END IF;
END;
$$;

-- ── 3. منح الصلاحية لـ authenticated ──────────────────────────────────────
GRANT EXECUTE ON FUNCTION get_my_subscription() TO authenticated;

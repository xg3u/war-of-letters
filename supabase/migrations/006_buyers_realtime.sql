-- ═══════════════════════════════════════════════════════════════════════════
-- 006_buyers_realtime.sql
-- تفعيل Supabase Realtime الفوري لجدول buyers:
--   • REPLICA IDENTITY FULL → يُرسل جميع الحقول في UPDATE (new + old)
--   • إضافة الجدول لـ supabase_realtime publication → يصل التغيير للعميل
-- بعد تطبيق هذه Migration، تغييرات الأدمن على باقة المستخدم
-- تظهر فورياً بدون انتظار (لا polling — Realtime مباشر)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. REPLICA IDENTITY FULL ────────────────────────────────────────────────
-- يضمن أن حدث UPDATE يحتوي على جميع الأعمدة في payload.new
ALTER TABLE buyers REPLICA IDENTITY FULL;

-- ── 2. إضافة buyers لـ Realtime publication ────────────────────────────────
-- supabase_realtime هي الـ publication الافتراضية في Supabase
-- ignoreDuplicates: لا مشكلة إذا كانت الجدول مضافاً مسبقاً
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'buyers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE buyers;
  END IF;
END $$;

-- migration 011: auto-expire time-limited plans → reset to 'free'
-- يُنفَّذ تلقائياً كل ساعة عبر pg_cron

-- ① تفعيل امتداد pg_cron (مطلوب تفعيله من Dashboard → Database → Extensions أيضاً)
create extension if not exists pg_cron with schema extensions;

-- ② دالة إعادة الباقات المنتهية إلى 'free'
create or replace function reset_expired_plans()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update buyers
  set
    plan_type            = 'free',
    subscription_status  = 'expired',
    expires_at           = null
  where
    plan_type in ('3_days', '72_hours', 'single')
    and expires_at is not null
    and expires_at < now();
end;
$$;

-- ③ جدولة الدالة كل ساعة عبر pg_cron
-- إذا كان الجدول موجوداً سلفاً، احذف القديم أولاً
select cron.unschedule('reset-expired-plans') where exists (
  select 1 from cron.job where jobname = 'reset-expired-plans'
);

select cron.schedule(
  'reset-expired-plans',   -- اسم الجوب
  '0 * * * *',             -- كل ساعة عند الدقيقة 0
  $$ select reset_expired_plans(); $$
);

-- ④ تشغيل فوري لتنظيف الباقات المنتهية الموجودة حالياً
select reset_expired_plans();

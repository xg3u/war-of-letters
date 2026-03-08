// supabase/functions/delete-user/index.ts
// Edge Function — حذف مستخدم كاملاً (Auth + buyers)
//
// الاستدعاء:
//   supabase.functions.invoke('delete-user', { body: { userId: '...' } })
//
// الأمان:
//   1. يتحقق أن المُستدعي مسجّل الدخول
//   2. يتحقق أن دور المُستدعي = 'admin' من جدول buyers
//   3. يمنع الأدمن من حذف نفسه
//
// النشر:
//   supabase functions deploy delete-user --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // OPTIONS pre-flight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 1. إنشاء Admin client بـ service_role key ─────────────
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // ── 2. تحقق من هوية المُستدعي ──────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    const token      = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'مطلوب تسجيل دخول' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !caller) {
      return new Response(
        JSON.stringify({ error: 'توكن غير صالح' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── 3. تحقق أن المُستدعي admin ─────────────────────────────
    const { data: callerRow } = await supabaseAdmin
      .from('buyers')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (callerRow?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'غير مصرح — المدير فقط يمكنه الحذف' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── 4. استخرج userId من الـ body ────────────────────────────
    const { userId } = await req.json() as { userId: string };

    if (!userId || typeof userId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'userId مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── 5. منع الأدمن من حذف نفسه ──────────────────────────────
    if (userId === caller.id) {
      return new Response(
        JSON.stringify({ error: 'لا يمكنك حذف حسابك الخاص' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── 6. احذف من buyers أولاً (لو ما فيه CASCADE) ────────────
    await supabaseAdmin.from('buyers').delete().eq('id', userId);

    // ── 7. احذف من auth.users ───────────────────────────────────
    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteErr) {
      return new Response(
        JSON.stringify({ error: deleteErr.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'خطأ غير معروف';
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

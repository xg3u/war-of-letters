// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────
export type UserRole = 'user' | 'partner' | 'admin';

export interface PlanChangeEvent {
  prevPlan: string | null;
  nextPlan: string | null;
  message:  string;
  at:       number;
}

interface SubscriptionData {
  plan_type: 'free' | 'single' | '72_hours' | '3_days' | 'lifetime' | null;
  subscription_status: string | null;
  expires_at: string | null;
  role: UserRole;
  referred_by_partner_id: string | null;
}

export type PlanDisplay = 'free' | '72hours' | 'unlimited';

interface AuthContextValue {
  isAuthenticated: boolean | null;
  user: User | null;
  subscription: SubscriptionData | null;
  isLoadingSubscription: boolean;
  planDisplay: PlanDisplay;
  hoursRemaining: number | null;
  role: UserRole | null;
  isRecoveryMode: boolean;
  planChangeEvent: PlanChangeEvent | null;
  clearPlanChangeEvent: () => void;
  signOut: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

// ── Cache ──────────────────────────────────────────────────────────────────
const SUB_CACHE_KEY = 'wol_sub_v3';
interface CacheEntry { userId: string; data: SubscriptionData; }

function readSubCache(userId: string): SubscriptionData | null {
  try {
    const raw = localStorage.getItem(SUB_CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (entry?.userId !== userId || !entry?.data) return null;
    const d = entry.data as Partial<SubscriptionData>;
    return {
      plan_type:              d.plan_type              ?? null,
      subscription_status:    d.subscription_status   ?? null,
      expires_at:             d.expires_at             ?? null,
      role:                  d.role                   ?? 'user',
      referred_by_partner_id: d.referred_by_partner_id ?? null,
    };
  } catch { return null; }
}

function writeSubCache(data: SubscriptionData, userId: string) {
  try { localStorage.setItem(SUB_CACHE_KEY, JSON.stringify({ userId, data })); } catch {}
}

// ── Helpers ────────────────────────────────────────────────────────────────
function computePlanDisplay(sub: SubscriptionData | null): { plan: PlanDisplay; hours: number | null } {
  if (sub?.role === 'admin' || sub?.role === 'partner') return { plan: 'unlimited', hours: null };
  if (!sub || sub.plan_type === 'free' || !sub.plan_type)  return { plan: 'free', hours: null };
  if (sub.plan_type === 'lifetime') return { plan: 'unlimited', hours: null };
  if (['72_hours', '3_days', 'single'].includes(sub.plan_type)) {
    if (!sub.expires_at) return { plan: 'free', hours: null };
    const expiry = new Date(sub.expires_at);
    if (expiry <= new Date()) return { plan: 'free', hours: null };
    return { plan: '72hours', hours: Math.ceil((expiry.getTime() - Date.now()) / 3_600_000) };
  }
  return { plan: 'free', hours: null };
}

function buildPlanMsg(next: string | null, prev: string | null): string {
  const up = next === 'lifetime' || (['3_days','72_hours','single'].includes(next ?? '') && (prev === 'free' || !prev));
  if (up) return 'تمت ترقية باقتك! 🌟 يمكنك الآن اللعب بشكل كامل';
  if (!next || next === 'free') return 'تم تغيير باقتك — يمكنك التجديد من المتجر';
  return 'تم تحديث باقتك';
}

// ── جلب بيانات الباقة من قاعدة البيانات ────────────────────────────────────
// يحاول عبر UUID أولاً ثم email — بدون الاعتماد على RPC خارجي
async function fetchFromDB(userId: string, userEmail: string): Promise<SubscriptionData | null> {
  try {
    // ① البحث بـ UUID (الأسرع — يعمل دائماً إذا كان المستخدم في buyers)
    const { data: byId } = await supabase
      .from('buyers')
      .select('plan_type, subscription_status, expires_at, role, referred_by_partner_id')
      .eq('id', userId)
      .maybeSingle();

    if (byId) {
      return {
        plan_type:              (byId.plan_type as SubscriptionData['plan_type']) ?? null,
        subscription_status:    byId.subscription_status   ?? null,
        expires_at:             byId.expires_at             ?? null,
        role:                  (byId.role as UserRole)      ?? 'user',
        referred_by_partner_id: byId.referred_by_partner_id ?? null,
      };
    }

    // ② الـ UUID لم يُوجد → جرّب بـ email (عملاء سلة)
    if (userEmail) {
      const { data: byEmail } = await supabase
        .from('buyers')
        .select('plan_type, subscription_status, expires_at, role, referred_by_partner_id')
        .ilike('email', userEmail)
        .maybeSingle();

      if (byEmail) {
        return {
          plan_type:              (byEmail.plan_type as SubscriptionData['plan_type']) ?? null,
          subscription_status:    byEmail.subscription_status   ?? null,
          expires_at:             byEmail.expires_at             ?? null,
          role:                  (byEmail.role as UserRole)      ?? 'user',
          referred_by_partner_id: byEmail.referred_by_partner_id ?? null,
        };
      }
    }

    // ③ مستخدم جديد تماماً — أضفه كـ free (ننتظر النتيجة لضمان الحفظ)
    const { error: insertErr } = await supabase.from('buyers').upsert(
      { id: userId, email: userEmail, plan_type: 'free', role: 'user' },
      { onConflict: 'id', ignoreDuplicates: true },
    );
    if (insertErr) {
      console.warn('[Auth] Failed to insert new buyer:', insertErr.message);
      // إعادة المحاولة مرة واحدة بعد 2 ثانية
      setTimeout(async () => {
        const { error: retryErr } = await supabase.from('buyers').upsert(
          { id: userId, email: userEmail, plan_type: 'free', role: 'user' },
          { onConflict: 'id', ignoreDuplicates: true },
        );
        if (retryErr) console.error('[Auth] Retry insert also failed:', retryErr.message);
        else console.log('[Auth] Retry insert succeeded for:', userEmail);
      }, 2000);
    }
    return { plan_type: 'free', subscription_status: null, expires_at: null, role: 'user', referred_by_partner_id: null };

  } catch (err) {
    console.error('[Auth] fetchFromDB failed:', err);
    return null; // إرجاع null = استخدم الكاش القديم
  }
}

// ── Context ────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}

// ── Provider ───────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isQREntry = (() => {
    const p = new URLSearchParams(window.location.search);
    const s = p.get('session'), sc = p.get('screen');
    return !!(s && (sc === 'players' || sc === 'buzzers' || sc === 'join'));
  })();

  const [isAuthenticated,       setIsAuthenticated]       = useState<boolean | null>(isQREntry ? true : null);
  const [user,                  setUser]                  = useState<User | null>(null);
  const [subscription,          setSubscription]          = useState<SubscriptionData | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const [isRecoveryMode,        setIsRecoveryMode]        = useState(false);
  const [planChangeEvent,       setPlanChangeEvent]       = useState<PlanChangeEvent | null>(null);
  const expiredNotifShownRef = useRef(false);
  const subscriptionRef      = useRef<SubscriptionData | null>(null);
  // Keep subscriptionRef synced so effects that capture stale closures see the latest value
  useEffect(() => { subscriptionRef.current = subscription; }, [subscription]);

  // ── تسجيل الدخول: جلب الباقة بشكل مضمون ─────────────────────────────────
  // الأولوية: كاش admin/partner (فوري) → DB (لكل مستخدم آخر)
  // setIsAuthenticated(true) يُستدعى فقط بعد معرفة الباقة
  const loginAndLoadSubscription = useCallback(async (u: User) => {
    const cached = readSubCache(u.id);

    // admin أو partner موثوق من الكاش → وصول فوري + تحقق خلفي
    if (cached?.role === 'admin' || cached?.role === 'partner') {
      setSubscription(cached);
      setIsLoadingSubscription(false);
      setIsAuthenticated(true);

      // تحقق خلفي صامت لتحديث أي بيانات تغيّرت
      fetchFromDB(u.id, u.email ?? '').then(fresh => {
        if (fresh) { setSubscription(fresh); writeSubCache(fresh, u.id); }
      });
      return;
    }

    // أي مستخدم آخر → اسأل قاعدة البيانات أولاً
    // إظهار الكاش مؤقتاً كـ optimistic UI (إن وُجد)
    if (cached) setSubscription(cached);
    setIsLoadingSubscription(true);

    const fresh = await fetchFromDB(u.id, u.email ?? '');

    setIsLoadingSubscription(false);

    if (fresh) {
      setSubscription(fresh);
      writeSubCache(fresh, u.id);

      // إشعار بانتهاء الباقة المحدودة
      const limited = ['72_hours', '3_days', 'single'].includes(fresh.plan_type ?? '');
      if (!expiredNotifShownRef.current && limited && fresh.expires_at) {
        if (new Date(fresh.expires_at) <= new Date()) {
          expiredNotifShownRef.current = true;
          setPlanChangeEvent({
            prevPlan: fresh.plan_type, nextPlan: 'expired',
            message: 'انتهت صلاحية باقتك — جدّد الآن للاستمرار', at: Date.now(),
          });
        }
      }
    } else if (cached) {
      // DB فشل → استخدم الكاش (أفضل من لا شيء)
      setSubscription(cached);
    }

    // فعّل الوصول بعد معرفة الباقة
    setIsAuthenticated(true);
  }, []);

  const refreshSubscription = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingSubscription(true);
    const fresh = await fetchFromDB(user.id, user.email ?? '');
    setIsLoadingSubscription(false);
    if (fresh) { setSubscription(fresh); writeSubCache(fresh, user.id); }
  }, [user]);

  // ── الاستماع لحالة المصادقة ────────────────────────────────────────────────
  useEffect(() => {
    if (isQREntry) return;

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setUser(session?.user ?? null);
        setIsRecoveryMode(true);
        setIsAuthenticated(false);
        return;
      }

      if (session?.user) {
        const u = session.user;
        setUser(u);
        if (event === 'TOKEN_REFRESHED') return;
        if (event === 'USER_UPDATED') { setIsRecoveryMode(false); return; }
        setIsRecoveryMode(false);
        localStorage.setItem('game_user_id', u.id);
        await loginAndLoadSubscription(u);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setIsRecoveryMode(false);
        setSubscription(null);
        setIsLoadingSubscription(false);
        localStorage.removeItem('game_user_id');
      }
    });

    return () => authSub.unsubscribe();
  }, [loginAndLoadSubscription, isQREntry]);

  // ── Realtime: تغيير الباقة الفوري عند تعديل الأدمن ──────────────────────
  useEffect(() => {
    if (!user?.id || isQREntry || subscription?.role === 'admin') return;

    const uid = user.id;
    // Use subscriptionRef so we get the actual current plan even if the effect
    // fires before subscription state has propagated to this closure
    const prevPlanRef = { current: subscriptionRef.current?.plan_type ?? null };

    const channel = supabase
      .channel(`plan-${uid}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'buyers', filter: `id=eq.${uid}` },
        (payload) => {
          const row = payload.new as Partial<SubscriptionData>;
          if (!row || !('plan_type' in row)) return;
          const nextPlan = (row.plan_type ?? null) as SubscriptionData['plan_type'];
          const prevPlan = prevPlanRef.current;
          const updated: SubscriptionData = {
            plan_type: nextPlan, subscription_status: row.subscription_status ?? null,
            expires_at: row.expires_at ?? null, role: (row.role as UserRole) ?? 'user',
            referred_by_partner_id: row.referred_by_partner_id ?? null,
          };
          setSubscription(updated);
          writeSubCache(updated, uid);
          prevPlanRef.current = nextPlan;
          if (nextPlan !== prevPlan)
            setPlanChangeEvent({ prevPlan, nextPlan, message: buildPlanMsg(nextPlan, prevPlan), at: Date.now() });
        })
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      fetchFromDB(uid, '').then(fresh => {
        if (!fresh) return;
        const prevPlan = prevPlanRef.current;

        // Check expiry first — plan_type stays '3_days' in DB, only expires_at changes
        const isLimited = ['72_hours', '3_days', 'single'].includes(fresh.plan_type ?? '');
        if (!expiredNotifShownRef.current && isLimited && fresh.expires_at && new Date(fresh.expires_at) <= new Date()) {
          expiredNotifShownRef.current = true;
          setSubscription(fresh);
          writeSubCache(fresh, uid);
          setPlanChangeEvent({ prevPlan: fresh.plan_type, nextPlan: 'expired', message: 'انتهت صلاحية باقتك — جدّد الآن للاستمرار', at: Date.now() });
          return;
        }

        setSubscription(fresh);
        writeSubCache(fresh, uid);
        if (fresh.plan_type !== prevPlan) {
          prevPlanRef.current = fresh.plan_type;
          setPlanChangeEvent({ prevPlan, nextPlan: fresh.plan_type, message: buildPlanMsg(fresh.plan_type, prevPlan), at: Date.now() });
        }
      });
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => { supabase.removeChannel(channel); document.removeEventListener('visibilitychange', onVisible); };
  }, [user?.id, isQREntry]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Expiry Polling — detects when 3-day plan expires while user is logged in ─
  useEffect(() => {
    if (!user?.id) return;
    const check = () => {
      if (expiredNotifShownRef.current) return;
      const current = subscriptionRef.current;
      const isLimited = ['72_hours', '3_days', 'single'].includes(current?.plan_type ?? '');
      if (!isLimited || !current?.expires_at) return;
      if (new Date(current.expires_at) <= new Date()) {
        expiredNotifShownRef.current = true;
        setPlanChangeEvent({
          prevPlan: current.plan_type, nextPlan: 'expired',
          message: 'انتهت صلاحية باقتك — جدّد الآن للاستمرار', at: Date.now(),
        });
      }
    };
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // ── تسجيل الخروج ───────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    try { await supabase.auth.signOut(); } catch (err) { console.error(err); }
    finally {
      setUser(null); setIsAuthenticated(false); setSubscription(null);
      localStorage.removeItem('game_user_id');
    }
  }, []);

  const clearPlanChangeEvent = useCallback(() => setPlanChangeEvent(null), []);
  const { plan: planDisplay, hours: hoursRemaining } = computePlanDisplay(subscription);
  const role: UserRole | null = subscription?.role ?? null;

  return (
    <AuthContext.Provider value={{
      isAuthenticated, user, subscription, isLoadingSubscription,
      planDisplay, hoursRemaining, role, isRecoveryMode,
      planChangeEvent, clearPlanChangeEvent, signOut, refreshSubscription,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────
interface SubscriptionData {
  plan_type: 'free' | 'single' | '72_hours' | 'lifetime' | null;
  subscription_status: string | null;
  expires_at: string | null;
}

export type PlanDisplay = 'free' | '72hours' | 'unlimited';

interface AuthContextValue {
  isAuthenticated: boolean | null; // null = loading
  user: User | null;
  subscription: SubscriptionData | null;
  isLoadingSubscription: boolean;
  planDisplay: PlanDisplay;
  hoursRemaining: number | null;   // للباقة 72h فقط
  isRecoveryMode: boolean;         // true عند إعادة تعيين كلمة المرور عبر رابط البريد
  signOut: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

// ── Subscription Cache (localStorage) ─────────────────────────────────────
const SUB_CACHE_KEY = 'wol_sub_cache';

function readSubCache(): SubscriptionData | null {
  try {
    const raw = localStorage.getItem(SUB_CACHE_KEY);
    return raw ? (JSON.parse(raw) as SubscriptionData) : null;
  } catch { return null; }
}

function writeSubCache(data: SubscriptionData | null) {
  try {
    if (data) localStorage.setItem(SUB_CACHE_KEY, JSON.stringify(data));
    else localStorage.removeItem(SUB_CACHE_KEY);
  } catch {}
}

// ── Helpers ────────────────────────────────────────────────────────────────
function computePlanDisplay(sub: SubscriptionData | null): { plan: PlanDisplay; hours: number | null } {
  if (!sub || sub.plan_type === 'free' || !sub.plan_type) {
    return { plan: 'free', hours: null };
  }
  if (sub.plan_type === 'lifetime') {
    return { plan: 'unlimited', hours: null };
  }
  // سلة تحفظ باقة 72 ساعة بـ plan_type='72_hours'، بعض السجلات القديمة قد تكون 'single'
  if (sub.plan_type === '72_hours' || sub.plan_type === 'single') {
    if (!sub.expires_at) return { plan: 'free', hours: null };
    const now = new Date();
    const expiry = new Date(sub.expires_at);
    if (expiry <= now) return { plan: 'free', hours: null };
    const hoursLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60));
    return { plan: '72hours', hours: hoursLeft };
  }
  return { plan: 'free', hours: null };
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
  // فحص QR Code bypass مرة واحدة عند التهيئة
  const isQREntry = (() => {
    const params = new URLSearchParams(window.location.search);
    const session = params.get('session');
    const screen = params.get('screen');
    return !!(session && (screen === 'players' || screen === 'buzzers' || screen === 'join'));
  })();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(isQREntry ? true : null);
  const [user, setUser] = useState<User | null>(null);
  // نبدأ بالـ cache مباشرةً حتى لا يظهر planDisplay='free' قبل جلب البيانات
  const [subscription, setSubscription] = useState<SubscriptionData | null>(readSubCache);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  // جلب بيانات الباقة من buyers table
  const fetchSubscription = useCallback(async (userId: string, userEmail: string) => {
    // إذا كان الـ cache موجوداً نُحدّث بصمت (بدون مؤشر تحميل) — المستخدم يرى بياناته فوراً
    const hasCached = readSubCache() !== null;
    if (!hasCached) setIsLoadingSubscription(true);

    // timeout safety: إذا تجاوز الطلب 5 ثوانٍ، نبقى على الـ cache
    const timeoutId = setTimeout(() => {
      setIsLoadingSubscription(false);
    }, 5000);

    try {
      // محاولة أولى: بالـ UUID
      let { data } = await supabase
        .from('buyers')
        .select('plan_type, subscription_status, expires_at')
        .eq('id', userId)
        .maybeSingle();

      // محاولة ثانية: بالبريد الإلكتروني بصرف النظر عن حالة الأحرف (Salla قد يحفظ البريد بحرف كبير)
      if (!data && userEmail) {
        const res = await supabase
          .from('buyers')
          .select('plan_type, subscription_status, expires_at')
          .ilike('email', userEmail)
          .maybeSingle();
        data = res.data;
      }

      clearTimeout(timeoutId);

      if (data) {
        const sub = data as SubscriptionData;
        setSubscription(sub);
        writeSubCache(sub); // ← حفظ في localStorage
      } else {
        // مستخدم جديد غير موجود في buyers — أضفه free في الخلفية
        supabase.from('buyers').upsert(
          { id: userId, email: userEmail, plan_type: 'free' },
          { onConflict: 'id', ignoreDuplicates: true }
        ).then(() => {});
        const freeSub: SubscriptionData = { plan_type: 'free', subscription_status: null, expires_at: null };
        setSubscription(freeSub);
        writeSubCache(freeSub);
      }
    } catch (e) {
      clearTimeout(timeoutId);
      console.error('fetchSubscription error:', e);
      // عند الخطأ نبقى على الـ cache الحالي ولا نرجّع free بشكل تعسفي
      // (فقط نسجّل الخطأ وننهي حالة التحميل)
    } finally {
      setIsLoadingSubscription(false);
    }
  }, []);

  const refreshSubscription = useCallback(async () => {
    if (user?.id && user?.email) await fetchSubscription(user.id, user.email);
  }, [user, fetchSubscription]);

  // الاستماع لحالة المصادقة
  // onAuthStateChange يُطلق INITIAL_SESSION تلقائياً عند أول تحميل فلا حاجة لـ getSession منفصلة
  useEffect(() => {
    if (isQREntry) return; // تجاوز كامل لـ QR users

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // وضع استعادة كلمة المرور — المستخدم فتح رابط إعادة التعيين من بريده
      if (event === 'PASSWORD_RECOVERY') {
        setUser(session?.user || null);
        setIsRecoveryMode(true);
        setIsAuthenticated(false); // لا نسجّل دخوله رسمياً حتى يعيّن كلمة مرور جديدة
        return;
      }

      if (session?.user) {
        const u = session.user;
        setUser(u);
        // تجاهل TOKEN_REFRESHED — لا داعي لإعادة جلب الباقة
        if (event === 'TOKEN_REFRESHED') return;
        // USER_UPDATED يأتي بعد تحديث كلمة المرور — أنهِ وضع الاستعادة
        if (event === 'USER_UPDATED') {
          setIsRecoveryMode(false);
          return;
        }
        setIsAuthenticated(true);
        setIsRecoveryMode(false);
        localStorage.setItem('game_user_id', u.id);
        await fetchSubscription(u.id, u.email!);
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
  }, [fetchSubscription, isQREntry]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      // نضمن تنظيف الحالة دائماً بغض النظر عن نتيجة supabase
      setUser(null);
      setIsAuthenticated(false);
      setSubscription(null);
      writeSubCache(null); // ← مسح الـ cache عند تسجيل الخروج
      localStorage.removeItem('game_user_id');
    }
  }, []);

  const { plan: planDisplay, hours: hoursRemaining } = computePlanDisplay(subscription);

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      subscription,
      isLoadingSubscription,
      planDisplay,
      hoursRemaining,
      isRecoveryMode,
      signOut,
      refreshSubscription,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
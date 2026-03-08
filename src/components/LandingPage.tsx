// src/components/LandingPage.tsx
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { CategoryCard } from './CategoryCard';
import { ActionCardComponent } from './ActionCardComponent';
import { categories } from '../lib/categories';
import { actionCards } from '../lib/actionCards';
import {
  Play, BookOpen, Home, Layers,
  Trophy, ShieldCheck, Zap, HelpCircle, ChevronDown, LogOut, BarChart2, Crown
} from 'lucide-react';
import { PaymentModal } from './PaymentModal';
import { supabase } from '../lib/supabase';
import { useScreenSize } from '../hooks/useScreenSize';
import HeaderImage from '../assets/ForDesign/Header.png';
import { useTheme, themeList } from '../context/ThemeContext';
import { useAuthContext } from '../context/AuthContext';

// الحروف العربية للتساقط
const ARABIC_LETTERS = "أبتثجحخدذرزسشصضطظعغفقكلمنهوي";
const LETTER_COLORS = ['#a855f7', '#10b981', '#f97316', '#ef4444', '#3b82f6', '#fbbf24', '#ec4899', '#14b8a6'];

// ربط category_id في DB مع id المحلي في categories.ts
const DB_CATEGORY_MAP: Record<number, string> = {
  1: 'culture',
  2: 'history',
  3: 'sports',
  4: 'science',
  5: 'geography',
  6: 'islamic',
};

interface LandingPageProps {
  onOpenSettings: () => void;
  onNavigateToLogin: () => void;
  onOpenAdmin?: () => void;
  onOpenPartner?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenSettings, onNavigateToLogin, onOpenAdmin, onOpenPartner }) => {
  const { isMobile, isTablet } = useScreenSize();
  const { theme, themeId, setTheme } = useTheme();
  const { isAuthenticated, user, planDisplay, hoursRemaining, signOut, isLoadingSubscription, role } = useAuthContext();

  const [showPayment, setShowPayment] = useState(false);
  const [paymentDefaultPlan, setPaymentDefaultPlan] = useState<'single' | 'lifetime' | undefined>(undefined);
  const [paymentDefaultTab, setPaymentDefaultTab] = useState<'payment' | 'redeem' | undefined>(undefined);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [statsCount, setStatsCount] = useState<number | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // ── إشعار الطرد بسبب الخمول (kicked=true في URL) ──────────────────────────
  const [showKickedBanner, setShowKickedBanner] = useState(
    () => window.location.search.includes('kicked=true'),
  );
  useEffect(() => {
    if (!showKickedBanner) return;
    // نظّف الـ URL حتى لا تظهر الرسالة مجدداً عند التحديث
    window.history.replaceState({}, document.title, window.location.pathname);
    const t = setTimeout(() => setShowKickedBanner(false), 6000);
    return () => clearTimeout(t);
  }, [showKickedBanner]);

  // عدد الأسئلة لكل كاتيجوري من DB
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    const fetchCounts = async () => {
      // جلب الكاتيجوريز الحقيقية من DB للحصول على IDs الصحيحة
      const { data: dbCats } = await supabase.from('categories').select('id, name');
      if (!dbCats?.length) return;

      // جلب عدد الأسئلة لكل كاتيجوري بالتوازي
      const results = await Promise.all(
        dbCats.map(cat =>
          supabase.from('questions').select('*', { count: 'exact', head: true }).eq('category_id', cat.id)
        )
      );

      const counts: Record<string, number> = {};
      dbCats.forEach((cat, i) => {
        // البحث عن الـ local id المقابل بالاسم (غير حساس للمسافات)
        const localId = DB_CATEGORY_MAP[cat.id as unknown as number]
          ?? Object.entries({ 'ثقافة عامة': 'culture', 'تاريخ': 'history', 'رياضة': 'sports', 'علوم': 'science', 'جغرافيا': 'geography', 'ثقافة إسلامية': 'islamic' }).find(([ar]) => cat.name?.includes(ar))?.[1];
        if (localId) counts[localId] = results[i].count ?? 0;
      });
      setCategoryCounts(counts);
    };
    fetchCounts();
  }, []);

  // Avatar
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.user_metadata?.avatar_url ?? null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // مزامنة الأفاتار عند تغيير المستخدم
  useEffect(() => {
    setAvatarUrl(user?.user_metadata?.avatar_url ?? null);
  }, [user?.user_metadata?.avatar_url]);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) return;
    setAvatarUploading(true);
    try {
      // تصغير الصورة إلى 128×128 وتحويلها إلى base64 — بدون Supabase Storage
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          const canvas = document.createElement('canvas');
          canvas.width = 128;
          canvas.height = 128;
          const ctx = canvas.getContext('2d')!;
          // crop مربع من المنتصف
          const side = Math.min(img.width, img.height);
          const sx = (img.width - side) / 2;
          const sy = (img.height - side) / 2;
          ctx.drawImage(img, sx, sy, side, side, 0, 0, 128, 128);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = reject;
        img.src = objectUrl;
      });
      await supabase.auth.updateUser({ data: { avatar_url: dataUrl } });
      setAvatarUrl(dataUrl);
    } catch (err) {
      console.error('Avatar upload error:', err);
      alert('حدث خطأ في تحديث الصورة، حاول مجدداً');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [user]);

  // جلب إحصائيات المستخدم
  const fetchStats = useCallback(async () => {
    if (!user) return;
    setStatsLoading(true);
    try {
      const { count } = await supabase
        .from('user_seen_questions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setStatsCount(count ?? 0);
    } catch {
      setStatsCount(null);
    } finally {
      setStatsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (showStats && statsCount === null) fetchStats();
  }, [showStats, statsCount, fetchStats]);

  // دالة بدء اللعبة الموحدة
  const handleStartGame = useCallback(() => {
    if (!isAuthenticated) {
      onNavigateToLogin();
      return;
    }
    if (isLoadingSubscription) return; // انتظر تحميل بيانات الباقة
    // الأدمن والشريك يدخلون مباشرة بدون قيد الباقة
    if (role === 'admin' || role === 'partner') {
      onOpenSettings();
      return;
    }
    if (planDisplay === 'free') {
      setPaymentDefaultPlan(undefined);
      setShowPayment(true);
      return;
    }
    onOpenSettings();
  }, [isAuthenticated, isLoadingSubscription, planDisplay, role, onNavigateToLogin, onOpenSettings]);

  // الحروف المتساقطة
  const fallingLetters = useMemo(() =>
    Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      char: ARABIC_LETTERS[Math.floor(Math.random() * ARABIC_LETTERS.length)],
      color: LETTER_COLORS[Math.floor(Math.random() * LETTER_COLORS.length)],
      left: `${Math.random() * 100}%`,
      duration: `${18 + Math.random() * 22}s`,
      delay: `${Math.random() * 15}s`,
      size: `${1.5 + Math.random() * 2}rem`,
      opacity: 0.12 + Math.random() * 0.15,
    }))
  , []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // تسجيل الخروج — ننتقل صراحةً لشاشة الدخول بدل الاعتماد على useEffect في App.tsx
  const handleLogout = useCallback(async () => {
    setShowDropdown(false);
    await signOut();
    onNavigateToLogin();
  }, [signOut, onNavigateToLogin]);


  // جميع الثيمات داكنة - isDarkMode دائماً true للحفاظ على التوافق مع الكود الموجود
  const isDarkMode = true;
  const colors = {
    bg: theme.bgGradient,
    bgGradient: theme.bgGradient,
    cardBg: theme.cardBg,
    text: theme.textPrimary,
    textSecondary: theme.textSecondary,
    border: theme.cardBorder,
  };

  return (
    <div className="screen-scroll" style={{
      background: colors.bgGradient,
      color: colors.text,
      transition: 'background 0.5s ease, color 0.3s ease',
      position: 'relative',
      direction: 'rtl',
    }}>

      {/* ── بانر الطرد بسبب الخمول ───────────────────────────────────── */}
      {showKickedBanner && (
        <div style={{
          position:       'fixed',
          top:            0,
          left:           0,
          right:          0,
          zIndex:         99999,
          background:     'linear-gradient(90deg,#d97706,#f59e0b)',
          color:          '#fff',
          padding:        '0.75rem 1.25rem',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          gap:            '1rem',
          fontFamily:     'Tajawal,sans-serif',
          fontSize:       '0.95rem',
          fontWeight:     700,
          direction:      'rtl',
          boxShadow:      '0 4px 20px rgba(0,0,0,0.35)',
        }}>
          <span>⏰ تم تسجيل خروجك تلقائياً بسبب عدم التفاعل لفترة طويلة</span>
          <button
            onClick={() => setShowKickedBanner(false)}
            style={{
              background:   'rgba(255,255,255,0.2)',
              border:       '1px solid rgba(255,255,255,0.4)',
              borderRadius: '0.5rem',
              color:        '#fff',
              padding:      '0.2rem 0.75rem',
              cursor:       'pointer',
              fontSize:     '0.9rem',
              fontFamily:   'inherit',
            }}
          >✕</button>
        </div>
      )}

      {showPayment && (
        <PaymentModal
          onClose={() => { setShowPayment(false); setPaymentDefaultTab(undefined); }}
          defaultPlan={paymentDefaultPlan}
          defaultTab={paymentDefaultTab}
          onPaidPlanDetected={() => { setShowPayment(false); setPaymentDefaultTab(undefined); onOpenSettings(); }}
        />
      )}

      {/* Stats Modal */}
      {showStats && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => setShowStats(false)}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #0f0525, #1a0b2e)',
              border: '1px solid rgba(168,85,247,0.4)', borderRadius: '2rem',
              padding: isMobile ? '1.5rem' : '2.5rem', maxWidth: '380px', width: '100%',
              boxShadow: '0 30px 80px rgba(0,0,0,0.7)', textAlign: 'center',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📊</div>
            <h2 style={{ fontWeight: 900, fontSize: '1.5rem', marginBottom: '1.5rem', color: '#e9d5ff' }}>إحصائياتي</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {/* الأسئلة التي شوهدت */}
              <div style={{
                background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)',
                borderRadius: '1rem', padding: '1.25rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>الأسئلة التي شوهدت</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#a855f7' }}>
                    {statsLoading ? '...' : (statsCount ?? '--')}
                  </div>
                </div>
                <span style={{ fontSize: '2rem' }}>🎯</span>
              </div>

              {/* جلسات اللعب */}
              <div style={{
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: '1rem', padding: '1.25rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>جلسات اللعب</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#10b981' }}>--</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>قريباً</div>
                </div>
                <span style={{ fontSize: '2rem' }}>⚔️</span>
              </div>

              {/* عضو منذ */}
              <div style={{
                background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)',
                borderRadius: '1rem', padding: '1.25rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>عضو منذ</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fb923c' }}>
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }) : '--'}
                  </div>
                </div>
                <span style={{ fontSize: '2rem' }}>📅</span>
              </div>
            </div>

            <button
              onClick={() => setShowStats(false)}
              style={{
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '0.75rem', padding: '0.75rem 2rem',
                color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem',
              }}
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* الحروف المتساقطة */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        {fallingLetters.map((letter) => (
          <div
            key={letter.id}
            style={{
              position: 'absolute',
              left: letter.left,
              top: '-5%',
              fontSize: letter.size,
              color: letter.color,
              opacity: isDarkMode ? letter.opacity : letter.opacity * 0.5,
              fontWeight: 900,
              fontFamily: 'Tajawal, sans-serif',
              animation: `letterFall ${letter.duration} linear infinite`,
              animationDelay: letter.delay,
              willChange: 'transform',
            }}
          >
            {letter.char}
          </div>
        ))}
      </div>

      {/* Header - تصميم عصري واحترافي */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        paddingTop: 'env(safe-area-inset-top)',
        background: isDarkMode
          ? 'linear-gradient(180deg, rgba(10, 1, 24, 0.98) 0%, rgba(10, 1, 24, 0.9) 50%, rgba(10, 1, 24, 0.7) 100%)'
          : 'linear-gradient(180deg, rgba(248, 249, 250, 0.98) 0%, rgba(248, 249, 250, 0.9) 50%, rgba(248, 249, 250, 0.7) 100%)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${isDarkMode ? 'rgba(168, 85, 247, 0.2)' : 'rgba(124, 58, 237, 0.15)'}`,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '0.5rem 1rem' : '0.75rem 2rem',
          maxWidth: '1400px',
          margin: '0 auto',
        }}>
          {/* الشعار واسم اللعبة */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <img
              src={HeaderImage}
              alt="حرب الحروف"
              style={{
                height: isMobile ? '36px' : '50px',
                objectFit: 'contain',
                filter: isDarkMode ? 'drop-shadow(0 2px 8px rgba(168, 85, 247, 0.4))' : 'none',
              }}
            />
          </div>

          {/* قائمة التنقل المركزية — مخفية على الجوال (تُستبدل بـ Bottom Nav) */}
          <nav style={{
            display: isMobile ? 'none' : 'flex',
            gap: '0.25rem',
            alignItems: 'center',
            background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
            borderRadius: '1rem',
            padding: '0.35rem',
            border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          }}>
            {([
              { label: 'الرئيسية', section: 'hero',       Icon: Home       },
              { label: 'الأسئلة',  section: 'categories', Icon: HelpCircle },
              { label: 'البطاقات', section: 'cards',      Icon: Layers     },
              { label: 'الدليل',   section: 'guide',      Icon: BookOpen   },
            ] as { label: string; section: string; Icon: React.ComponentType<{ size?: number }> }[]).map((item) => (
              <button
                key={item.section}
                aria-label={`الانتقال إلى قسم ${item.label}`}
                title={item.label}
                onClick={() => scrollToSection(item.section)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isDarkMode ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.65)',
                  cursor: 'pointer',
                  padding: isMobile ? '0.55rem' : '0.55rem 0.9rem',
                  transition: 'all 0.2s ease',
                  borderRadius: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  minWidth: '44px',
                  minHeight: '44px',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(168,85,247,0.18)';
                  e.currentTarget.style.color = '#c084fc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = isDarkMode ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.65)';
                }}
              >
                <item.Icon size={18} />
                {!isMobile && <span>{item.label}</span>}
              </button>
            ))}
          </nav>

          {/* أزرار الإجراءات */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>

            {/* منتقي الثيم */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowThemePicker(!showThemePicker)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: `1px solid ${theme.cardBorder}`,
                  borderRadius: '0.75rem',
                  padding: isMobile ? '0.6rem' : '0.6rem 1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s ease',
                  color: theme.textPrimary,
                  fontSize: '0.9rem',
                  fontWeight: 600,
                }}
                title="تغيير الثيم"
              >
                <span style={{ fontSize: '1.1rem' }}>{theme.emoji}</span>
                {!isMobile && <span>{theme.nameAr}</span>}
              </button>

              {showThemePicker && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowThemePicker(false)} />
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 0.5rem)', left: 0,
                    background: 'rgba(10, 1, 24, 0.97)', backdropFilter: 'blur(20px)',
                    border: `1px solid ${theme.cardBorder}`, borderRadius: '1rem',
                    padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem',
                    zIndex: 200, minWidth: '180px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                  }}>
                    {themeList.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => { setTheme(t.id); setShowThemePicker(false); }}
                        style={{
                          background: themeId === t.id ? t.cardBg : 'transparent',
                          border: `1px solid ${themeId === t.id ? t.accent : 'rgba(255,255,255,0.1)'}`,
                          borderRadius: '0.6rem', padding: '0.6rem 0.9rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '0.6rem',
                          color: '#fff', fontSize: '0.9rem', fontWeight: themeId === t.id ? 700 : 500,
                          transition: 'all 0.15s ease', textAlign: 'right', width: '100%',
                        }}
                      >
                        <span style={{ fontSize: '1.2rem' }}>{t.emoji}</span>
                        <span style={{ flex: 1 }}>{t.nameAr}</span>
                        {themeId === t.id && <span style={{ color: t.accent, fontSize: '0.8rem' }}>✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* ── زر الملف التعريفي / تسجيل الدخول ── */}
            {!isAuthenticated ? (
              /* غير مسجل: زر تسجيل دخول */
              <button
                onClick={onNavigateToLogin}
                style={{
                  background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                  border: 'none', borderRadius: '0.75rem',
                  padding: isMobile ? '0.6rem' : '0.6rem 1.2rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                  color: 'white', fontWeight: 700, fontSize: '0.9rem',
                  boxShadow: '0 4px 15px rgba(168,85,247,0.4)',
                }}
              >
                <span>🔐</span>
                {!isMobile && <span>تسجيل دخول</span>}
              </button>
            ) : (
              /* مسجل: زر الملف التعريفي مع Dropdown */
              <div style={{ position: 'relative' }}>
                {showDropdown && (
                  <div style={{ position: 'fixed', inset: 0, zIndex: 298 }} onClick={() => setShowDropdown(false)} />
                )}
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  style={{
                    background: showDropdown ? 'rgba(168,85,247,0.25)' : 'rgba(168,85,247,0.12)',
                    border: `1px solid rgba(168,85,247,${showDropdown ? '0.6' : '0.3'})`,
                    borderRadius: '0.75rem',
                    padding: isMobile ? '0.5rem 0.7rem' : '0.5rem 1rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    color: '#e9d5ff', fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s',
                  }}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="أفاتار"
                      style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(168,85,247,0.5)', flexShrink: 0 }}
                    />
                  ) : (
                    <span style={{ fontSize: '1.1rem' }}>👤</span>
                  )}
                  {!isMobile && (
                    <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'حسابي'}
                    </span>
                  )}
                  <ChevronDown size={14} style={{ opacity: 0.7, transform: showDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

                {showDropdown && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 0.5rem)', left: 0,
                    background: 'rgba(10,1,24,0.97)', backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(168,85,247,0.3)', borderRadius: '1.25rem',
                    padding: '1rem', zIndex: 299, minWidth: '230px',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
                    display: 'flex', flexDirection: 'column', gap: '0.25rem',
                  }}>
                    {/* الأفاتار + معلومات المستخدم */}
                    <div style={{ padding: '0.5rem 0.25rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {/* صورة الملف الشخصي */}
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        title="تغيير الصورة الشخصية"
                        style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
                      >
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt="أفاتار"
                            style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(168,85,247,0.6)', display: 'block' }}
                          />
                        ) : (
                          <div style={{
                            width: '52px', height: '52px', borderRadius: '50%',
                            background: 'rgba(168,85,247,0.15)',
                            border: '2px dashed rgba(168,85,247,0.5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.6rem',
                          }}>
                            👤
                          </div>
                        )}
                        {/* overlay كاميرا */}
                        <div style={{
                          position: 'absolute', inset: 0, borderRadius: '50%',
                          background: 'rgba(0,0,0,0.55)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.1rem',
                          opacity: avatarUploading ? 1 : 0,
                          transition: 'opacity 0.2s',
                        }}
                          onMouseEnter={e => { if (!avatarUploading) (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                          onMouseLeave={e => { if (!avatarUploading) (e.currentTarget as HTMLElement).style.opacity = '0'; }}
                        >
                          {avatarUploading ? '⏳' : '📷'}
                        </div>
                      </div>

                      {/* الاسم والبريد */}
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#e9d5ff', marginBottom: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {user?.user_metadata?.first_name || '—'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', direction: 'ltr', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {user?.email}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(168,85,247,0.7)', marginTop: '0.2rem', cursor: 'pointer' }}
                          onClick={() => fileInputRef.current?.click()}>
                          {avatarUploading ? 'جارٍ الرفع...' : 'تغيير الصورة'}
                        </div>
                      </div>
                    </div>

                    {/* input الصورة المخفي */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleAvatarUpload}
                    />

                    {/* الباقة */}
                    <div style={{ padding: '0.75rem 0.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.4rem' }}>الباقة الحالية</div>
                      {planDisplay === 'free' && (
                        <button
                          onClick={() => { setShowDropdown(false); setPaymentDefaultPlan(undefined); setShowPayment(true); }}
                          style={{
                            background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(249,115,22,0.2))',
                            border: '1px solid rgba(249,115,22,0.5)', borderRadius: '0.6rem',
                            padding: '0.5rem 0.75rem', cursor: 'pointer', width: '100%',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            color: '#fb923c', fontWeight: 700, fontSize: '0.88rem',
                          }}
                        >
                          <span>🔓</span> ترقية الباقة
                        </button>
                      )}
                      {planDisplay === '72hours' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <div style={{
                            background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)',
                            borderRadius: '0.6rem', padding: '0.5rem 0.75rem',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            color: '#fbbf24', fontWeight: 700, fontSize: '0.88rem',
                          }}>
                            <span>⏰</span> متبقي {hoursRemaining} ساعة
                          </div>
                          <button
                            onClick={() => {
                              setShowDropdown(false);
                              setPaymentDefaultPlan('lifetime');
                              setShowPayment(true);
                            }}
                            style={{
                              width: '100%',
                              background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(236,72,153,0.2))',
                              border: '1px solid rgba(168,85,247,0.4)',
                              borderRadius: '0.6rem', padding: '0.5rem 0.75rem',
                              display: 'flex', alignItems: 'center', gap: '0.5rem',
                              color: '#a855f7', fontWeight: 700, fontSize: '0.85rem',
                              cursor: 'pointer',
                            }}
                          >
                            <span>♾️</span> ترقية لبلا حدود
                          </button>
                        </div>
                      )}
                      {planDisplay === 'unlimited' && (
                        <div style={{
                          background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)',
                          borderRadius: '0.6rem', padding: '0.5rem 0.75rem',
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          color: '#a855f7', fontWeight: 700, fontSize: '0.88rem',
                        }}>
                          <Crown size={14} /> باقة بلا حدود ♾️
                        </div>
                      )}
                    </div>

                    {/* إحصائياتي */}
                    <button
                      onClick={() => { setShowDropdown(false); setShowStats(true); }}
                      style={{
                        background: 'transparent', border: 'none', borderRadius: '0.6rem',
                        padding: '0.6rem 0.5rem', cursor: 'pointer', width: '100%',
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        color: 'rgba(255,255,255,0.75)', fontWeight: 600, fontSize: '0.9rem',
                        textAlign: 'right', transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <BarChart2 size={16} color="#a855f7" /> إحصائياتي
                    </button>

                    {/* لوحة الإدارة — للمدير فقط */}
                    {role === 'admin' && (
                      <button
                        onClick={() => { setShowDropdown(false); onOpenAdmin?.(); }}
                        style={{
                          background: 'transparent', border: 'none', borderRadius: '0.6rem',
                          padding: '0.6rem 0.5rem', cursor: 'pointer', width: '100%',
                          display: 'flex', alignItems: 'center', gap: '0.6rem',
                          color: '#a855f7', fontWeight: 700, fontSize: '0.9rem',
                          textAlign: 'right', transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(168,85,247,0.1)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span style={{ fontSize: '1rem' }}>⚙️</span> لوحة الإدارة
                      </button>
                    )}

                    {/* بوابة الشريك — للشركاء فقط */}
                    {role === 'partner' && (
                      <button
                        onClick={() => { setShowDropdown(false); onOpenPartner?.(); }}
                        style={{
                          background: 'transparent', border: 'none', borderRadius: '0.6rem',
                          padding: '0.6rem 0.5rem', cursor: 'pointer', width: '100%',
                          display: 'flex', alignItems: 'center', gap: '0.6rem',
                          color: '#10b981', fontWeight: 700, fontSize: '0.9rem',
                          textAlign: 'right', transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.1)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span style={{ fontSize: '1rem' }}>🤝</span> بوابة الشريك
                      </button>
                    )}

                    {/* تسجيل خروج */}
                    <button
                      onClick={handleLogout}
                      style={{
                        background: 'transparent', border: 'none', borderRadius: '0.6rem',
                        padding: '0.6rem 0.5rem', cursor: 'pointer', width: '100%',
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        color: '#ef4444', fontWeight: 600, fontSize: '0.9rem',
                        textAlign: 'right', transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <LogOut size={16} /> تسجيل الخروج
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main style={{ paddingTop: isMobile ? 'calc(4rem + env(safe-area-inset-top))' : 'calc(5rem + env(safe-area-inset-top))', paddingBottom: isMobile ? 'calc(4.5rem + env(safe-area-inset-bottom))' : 0, position: 'relative', zIndex: 1 }}>

        {/* Hero Section */}
        <section id="hero" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{
            maxWidth: '700px', width: '100%', padding: isMobile ? '1.5rem 1rem' : '3rem', borderRadius: isMobile ? '1.5rem' : '3rem',
            background: colors.cardBg, backdropFilter: 'blur(20px)', border: `2px solid ${colors.border}`,
            textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
          }}>
            <div style={{ fontSize: isMobile ? '3.5rem' : '5rem', marginBottom: '1rem' }}>⚔️</div>
            <h1 style={{ fontSize: isMobile ? '2rem' : isTablet ? '2.75rem' : '3.5rem', fontWeight: 900, background: 'linear-gradient(to left, #f97316, #ec4899, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              حرب الحروف — لعبة مسابقات للجمعات
            </h1>
            <p style={{ fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: 600, color: colors.textSecondary, marginBottom: '2rem' }}>
              سباق الحروف الاستراتيجي — مثالية لفعاليات الشاليهات والويكند مع أصدقاءك
            </p>
            <button
              onClick={handleStartGame}
              disabled={isAuthenticated === true && isLoadingSubscription}
              aria-label="ابدأ لعبة حرب الحروف الآن"
              style={{
                width: '100%', padding: isMobile ? '1.1rem' : '1.5rem', borderRadius: '1.5rem',
                background: (isAuthenticated === true && isLoadingSubscription)
                  ? 'rgba(168, 85, 247, 0.4)'
                  : 'linear-gradient(135deg, #f97316, #ec4899)',
                color: 'white', fontSize: isMobile ? '1.1rem' : '1.5rem', fontWeight: 900, border: 'none',
                cursor: (isAuthenticated === true && isLoadingSubscription) ? 'wait' : 'pointer',
                boxShadow: '0 10px 30px rgba(249, 115, 22, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem',
                opacity: (isAuthenticated === true && isLoadingSubscription) ? 0.7 : 1,
              }}
            >
              {isAuthenticated === true && isLoadingSubscription
                ? <><span style={{ fontSize: '1.2rem' }}>⏳</span> جارٍ التحقق من باقتك...</>
                : <><Play fill="white" /> ابدأ التحدي الآن</>
              }
            </button>
          </div>
        </section>

        {/* Categories Section */}
        <section id="categories" style={{ padding: isMobile ? '2rem 1rem' : '4rem 2rem' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: isMobile ? '1.5rem' : '3rem' }}>
              <h2 style={{ fontSize: isMobile ? '1.75rem' : '3rem', fontWeight: 900 }}>🎯 أنواع الأسئلة</h2>
              <p style={{ color: colors.textSecondary, fontSize: '1.2rem' }}>آلاف الأسئلة في كافة المجالات بانتظارك</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: isMobile ? '1rem' : '2rem' }}>
              {categories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  category={{ ...cat, questionsCount: categoryCounts[cat.id] ?? cat.questionsCount }}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Cards Section */}
        <section id="cards" style={{ padding: isMobile ? '2rem 1rem' : '4rem 2rem' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: isMobile ? '1.5rem' : '3rem' }}>
              <h2 style={{ fontSize: isMobile ? '1.75rem' : '3rem', fontWeight: 900 }}>🃏 البطاقات الإستراتيجية</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(250px, 1fr))', gap: isMobile ? '0.75rem' : '2rem' }}>
              {actionCards.map((card) => <ActionCardComponent key={card.id} card={card} />)}
            </div>
          </div>
        </section>

        {/* Game Guide Section - الدليل الشامل */}
        <section id="guide" style={{ padding: isMobile ? '2rem 1rem' : '4rem 2rem', background: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            {/* العنوان */}
            <div style={{ textAlign: 'center', marginBottom: isMobile ? '1.5rem' : '3rem' }}>
              <div style={{
                display: 'inline-flex',
                padding: isMobile ? '0.75rem 1rem' : '1rem 2rem',
                borderRadius: '1.5rem',
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                marginBottom: '1rem',
                gap: '0.75rem',
                alignItems: 'center',
              }}>
                <BookOpen size={32} color="#a855f7" />
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a855f7' }}>الدليل الشامل</span>
              </div>
              <h2 style={{ fontSize: isMobile ? '1.5rem' : '2.5rem', fontWeight: 900, margin: '0.5rem 0' }}>كل ما تحتاج معرفته عن اللعبة</h2>
              <p style={{ fontSize: '1.1rem', color: colors.textSecondary, maxWidth: '600px', margin: '0 auto' }}>
                اقرأ هذا الدليل بعناية لتفهم آليات اللعبة وتصبح محترفاً
              </p>
            </div>

            {/* القسم الأول: فكرة اللعبة وطريقة الفوز */}
            <div style={{
              background: colors.cardBg,
              borderRadius: '2rem',
              padding: '2rem',
              marginBottom: '2rem',
              border: `2px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '1rem',
                  background: 'linear-gradient(135deg, #f97316, #ea580c)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Trophy size={28} color="white" />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>فكرة اللعبة وطرق الفوز</h3>
              </div>

              <div style={{
                background: isDarkMode ? 'rgba(249, 115, 22, 0.1)' : 'rgba(249, 115, 22, 0.05)',
                borderRadius: '1rem',
                padding: '1.5rem',
                marginBottom: '1.5rem',
                border: '1px solid rgba(249, 115, 22, 0.2)',
              }}>
                <p style={{ margin: 0, lineHeight: 1.8, fontSize: '1.05rem' }}>
                  <b>حرب الحروف</b> هي لعبة استراتيجية بين فريقين (أخضر وأحمر). الهدف هو بناء <b>جسر متصل</b> من الحروف
                  يربط جانبي الملعب. كل فريق له اتجاه فوز مختلف!
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: isMobile ? '1rem' : '1.5rem', maxWidth: '700px', margin: '0 auto' }}>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))',
                  borderRadius: '1rem',
                  padding: '1.5rem',
                  border: '2px solid rgba(16, 185, 129, 0.3)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🟢</div>
                  <h4 style={{ color: '#10b981', fontWeight: 800, marginBottom: '0.75rem', fontSize: '1.25rem' }}>الفريق الأخضر</h4>
                  <p style={{ margin: 0, fontSize: '1rem', lineHeight: 1.7 }}>
                    يفوز بربط جسر <b>عمودي</b> من الأعلى إلى الأسفل (من الصف الأول إلى الصف الخامس)
                  </p>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))',
                  borderRadius: '1rem',
                  padding: '1.5rem',
                  border: '2px solid rgba(239, 68, 68, 0.3)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔴</div>
                  <h4 style={{ color: '#ef4444', fontWeight: 800, marginBottom: '0.75rem', fontSize: '1.25rem' }}>الفريق الأحمر</h4>
                  <p style={{ margin: 0, fontSize: '1rem', lineHeight: 1.7 }}>
                    يفوز بربط جسر <b>أفقي</b> من اليمين إلى اليسار (من العمود الأول إلى العمود الخامس)
                  </p>
                </div>
              </div>
            </div>

            {/* القسم الثاني: طرق الحصول على البطاقات */}
            <div style={{
              background: colors.cardBg,
              borderRadius: '2rem',
              padding: '2rem',
              marginBottom: '2rem',
              border: `2px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '1rem',
                  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{ fontSize: '1.5rem' }}>🎁</span>
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>طرق الحصول على البطاقات</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(250px, 1fr))', gap: isMobile ? '0.75rem' : '1rem' }}>
                <div style={{
                  background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  borderRadius: '1rem',
                  padding: isMobile ? '1rem' : '1.25rem',
                  border: `1px solid ${colors.border}`,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', marginBottom: '0.75rem' }}>🃏</div>
                  <h4 style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#ec4899' }}>البطاقات المخفية</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.6 }}>
                    بعض الخلايا تحتوي على بطاقات مخفية. عند الإجابة الصحيحة على سؤال الخلية، تحصل على بطاقة عشوائية!
                  </p>
                </div>

                <div style={{
                  background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  borderRadius: '1rem',
                  padding: isMobile ? '1rem' : '1.25rem',
                  border: `1px solid ${colors.border}`,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', marginBottom: '0.75rem' }}>✨</div>
                  <h4 style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#fbbf24' }}>الحرف الذهبي</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.6 }}>
                    الخلايا الذهبية المتوهجة تمنحك بطاقة مباشرة عند الإجابة الصحيحة. ابحث عنها!
                  </p>
                </div>

                <div style={{
                  background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  borderRadius: '1rem',
                  padding: isMobile ? '1rem' : '1.25rem',
                  border: `1px solid ${colors.border}`,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', marginBottom: '0.75rem' }}>🔥</div>
                  <h4 style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#f97316' }}>سلسلة الانتصارات</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.6 }}>
                    أجب على <b>3 أسئلة صحيحة متتالية</b> واحصل على بطاقة مكافأة تلقائياً!
                  </p>
                </div>

                <div style={{
                  background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  borderRadius: '1rem',
                  padding: isMobile ? '1rem' : '1.25rem',
                  border: `1px solid ${colors.border}`,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', marginBottom: '0.75rem' }}>🎲</div>
                  <h4 style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#3b82f6' }}>الحرف العشوائي</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.6 }}>
                    في بداية كل جولة، يظهر حرف عشوائي. من يجيب عليه أولاً يحصل على بطاقة!
                  </p>
                </div>
              </div>
            </div>

            {/* القسم الثالث: شرح البطاقات بالتفصيل */}
            <div style={{
              background: colors.cardBg,
              borderRadius: '2rem',
              padding: '2rem',
              marginBottom: '2rem',
              border: `2px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '1rem',
                  background: 'linear-gradient(135deg, #ec4899, #db2777)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Zap size={28} color="white" />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>البطاقات الأربعة وتأثيراتها</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: isMobile ? '0.75rem' : '1.5rem' }}>
                {/* بطاقة التجميد */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.05))',
                  borderRadius: '1.25rem',
                  padding: '1.5rem',
                  border: '2px solid rgba(59, 130, 246, 0.3)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '2.5rem' }}>🧊</span>
                    <div>
                      <h4 style={{ margin: 0, fontWeight: 800, color: '#3b82f6', fontSize: '1.25rem' }}>بطاقة التجميد</h4>
                      <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Freeze Card</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
                    <p style={{ margin: '0 0 0.75rem 0' }}><b>الهدف:</b> خلية فارغة (بيضاء) فقط</p>
                    <p style={{ margin: '0 0 0.75rem 0' }}><b>التأثير:</b> تجميد الخلية لمدة <b>دورتين</b></p>
                    <p style={{ margin: 0, color: '#60a5fa' }}>
                      <b>الفائدة:</b> الخلية المجمدة لا يمكن لأي فريق اختيارها حتى ينتهي التجميد. استخدمها لقطع طريق الخصم!
                    </p>
                  </div>
                </div>

                {/* بطاقة القنبلة */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.05))',
                  borderRadius: '1.25rem',
                  padding: '1.5rem',
                  border: '2px solid rgba(239, 68, 68, 0.3)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '2.5rem' }}>💣</span>
                    <div>
                      <h4 style={{ margin: 0, fontWeight: 800, color: '#ef4444', fontSize: '1.25rem' }}>بطاقة القنبلة</h4>
                      <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Bomb Card</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
                    <p style={{ margin: '0 0 0.75rem 0' }}><b>الهدف:</b> خلية يملكها الخصم فقط</p>
                    <p style={{ margin: '0 0 0.75rem 0' }}><b>التأثير:</b> تفجير الخلية وإعادتها <b>فارغة</b></p>
                    <p style={{ margin: 0, color: '#f87171' }}>
                      <b>الفائدة:</b> دمر تقدم الخصم! الخلية تعود بيضاء ويمكن لأي فريق المنافسة عليها من جديد.
                    </p>
                  </div>
                </div>

                {/* بطاقة المعركة */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(234, 88, 12, 0.05))',
                  borderRadius: '1.25rem',
                  padding: '1.5rem',
                  border: '2px solid rgba(249, 115, 22, 0.3)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '2.5rem' }}>⚔️</span>
                    <div>
                      <h4 style={{ margin: 0, fontWeight: 800, color: '#f97316', fontSize: '1.25rem' }}>بطاقة المعركة</h4>
                      <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Battle Card</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
                    <p style={{ margin: '0 0 0.75rem 0' }}><b>الهدف:</b> خلية يملكها الخصم</p>
                    <p style={{ margin: '0 0 0.75rem 0' }}><b>التأثير:</b> تحدي على سؤال جديد</p>
                    <p style={{ margin: 0, color: '#fb923c' }}>
                      <b>الفائدة:</b> إذا أجبت صح تسرق الخلية! إذا أخطأت تبقى للخصم. فرصة ذهبية لقلب الموازين!
                    </p>
                  </div>
                </div>

                {/* بطاقة الدرع */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.05))',
                  borderRadius: '1.25rem',
                  padding: '1.5rem',
                  border: '2px solid rgba(16, 185, 129, 0.3)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '2.5rem' }}>🛡️</span>
                    <div>
                      <h4 style={{ margin: 0, fontWeight: 800, color: '#10b981', fontSize: '1.25rem' }}>بطاقة الدرع</h4>
                      <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Shield Card</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
                    <p style={{ margin: '0 0 0.75rem 0' }}><b>الهدف:</b> خلية تملكها أنت</p>
                    <p style={{ margin: '0 0 0.75rem 0' }}><b>التأثير:</b> حماية لمدة <b>3 دورات</b></p>
                    <p style={{ margin: 0, color: '#34d399' }}>
                      <b>الفائدة:</b> الخلية المحمية لا تتأثر بالقنبلة أو المعركة! احمِ خلاياك الاستراتيجية.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* القسم الرابع: قواعد مهمة */}
            <div style={{
              background: colors.cardBg,
              borderRadius: '2rem',
              padding: '2rem',
              border: `2px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '1rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <ShieldCheck size={28} color="white" />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>قواعد مهمة يجب معرفتها</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: isMobile ? '0.75rem' : '1.25rem' }}>
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start',
                  background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  padding: '1rem',
                  borderRadius: '1rem',
                }}>
                  <span style={{ fontSize: '1.5rem' }}>📝</span>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 700 }}>قاعدة الحرف</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.6 }}>
                      الإجابة يجب أن تبدأ بنفس حرف الخلية المختارة (يُتجاهل "ال" التعريف)
                    </p>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start',
                  background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  padding: '1rem',
                  borderRadius: '1rem',
                }}>
                  <span style={{ fontSize: '1.5rem' }}>👨‍⚖️</span>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 700 }}>المقدم هو الحكم</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.6 }}>
                      قرار المقدم نهائي في قبول الإجابات واستخدام البطاقات
                    </p>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start',
                  background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  padding: '1rem',
                  borderRadius: '1rem',
                }}>
                  <span style={{ fontSize: '1.5rem' }}>🎯</span>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 700 }}>المباراة والجولات</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.6 }}>
                      المباراة تتكون من عدة جولات. من يفوز بأغلب الجولات يفوز بالمباراة!
                    </p>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start',
                  background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  padding: '1rem',
                  borderRadius: '1rem',
                }}>
                  <span style={{ fontSize: '1.5rem' }}>📱</span>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 700 }}>شاشتين متزامنتين</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.6 }}>
                      افتح شاشة المقدم + شاشة اللاعبين على جهازين للتجربة المثالية!
                    </p>
                  </div>
                </div>
              </div>

              {/* نصيحة ختامية */}
              <div style={{
                marginTop: '1.5rem',
                padding: '1.25rem',
                borderRadius: '1rem',
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(236, 72, 153, 0.1))',
                border: '1px dashed rgba(168, 85, 247, 0.3)',
                textAlign: 'center',
              }}>
                <HelpCircle size={24} color="#a855f7" style={{ marginBottom: '0.5rem' }} />
                <p style={{ margin: 0, fontWeight: 600, lineHeight: 1.6 }}>
                  <b>نصيحة:</b> استخدم البطاقات بحكمة! لا تستخدمها عشوائياً، بل احتفظ بها للحظات الحاسمة.
                  بطاقة المعركة ممتازة لسرقة خلية استراتيجية، والدرع مثالي لحماية خلية قريبة من إكمال جسرك!
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ══ Footer ══ */}
        <footer style={{
          borderTop: `1px solid ${colors.border}`,
          padding: isMobile ? '2.5rem 1.25rem 2rem' : '3.5rem 4rem 2.5rem',
          background: 'rgba(0,0,0,0.25)',
        }}>
          <div style={{
            maxWidth: '1100px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr auto 1fr',
            gap: isMobile ? '2rem' : '3rem',
            alignItems: 'start',
          }}>
            {/* العمود الأيمن — الهوية */}
            <div style={{ textAlign: isMobile ? 'center' : 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', justifyContent: isMobile ? 'center' : 'flex-start', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>⚔️</span>
                <span style={{
                  fontSize: '1.15rem', fontWeight: 900,
                  background: 'linear-gradient(135deg, #a855f7, #ec4899, #f97316)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>حرب الحروف</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: colors.textSecondary, lineHeight: 1.65, maxWidth: '260px', margin: isMobile ? '0 auto' : '0' }}>
                لعبة استراتيجية جماعية مستوحاة من سباق الحروف وحروف مع عزيز — مثالية للجمعات والشاليهات.
              </p>
            </div>

            {/* العمود الأوسط — روابط */}
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: '1rem', opacity: 0.6 }}>روابط</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', alignItems: 'center' }}>
                <a href="https://battleofletter.com" style={{ color: colors.textSecondary, textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, opacity: 0.75, transition: 'opacity 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.75')}>
                  الصفحة الرئيسية
                </a>
                <a href="https://salla.sa/battle_of_letters_store/" target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#ff6b35', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 700, opacity: 0.9, transition: 'opacity 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.9')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect width="24" height="24" rx="6" fill="#ff6b35"/>
                    <path d="M7 9h10M7 12h7M7 15h5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M15 14l2 2 3-3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  متجر سلة
                </a>
                <a href="https://wa.me/message/CEACUCTW6E7BB1" target="_blank" rel="noopener noreferrer"
                  style={{ color: '#25d366', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, opacity: 0.85, transition: 'opacity 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.85')}>
                  تواصل معنا
                </a>
              </div>
            </div>

            {/* العمود الأيسر — المطور والسوشيال */}
            <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: '0.9rem', opacity: 0.6 }}>المطور</p>
              <p style={{ fontSize: '0.88rem', fontWeight: 700, color: colors.text, marginBottom: '0.9rem' }}>Meshal Alshammari</p>
              <div style={{ display: 'flex', gap: '0.55rem', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                {/* X */}
                <a href="https://x.com/xg3u3?s=21" target="_blank" rel="noopener noreferrer" title="@xg3u3"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '38px', height: '38px', borderRadius: '11px',
                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                    textDecoration: 'none', transition: 'transform 0.15s, background 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px) scale(1.1)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; }}
                >
                  <svg width="15" height="15" viewBox="0 0 1200 1227" fill="none">
                    <path d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z" fill="rgba(233,213,255,0.75)"/>
                  </svg>
                </a>
                {/* Instagram */}
                <a href="https://www.instagram.com/xg3u?igsh" target="_blank" rel="noopener noreferrer" title="@xg3u"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '38px', height: '38px', borderRadius: '11px',
                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                    textDecoration: 'none', transition: 'transform 0.15s, background 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px) scale(1.1)'; (e.currentTarget as HTMLElement).style.background = 'rgba(253,84,73,0.18)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <defs>
                      <radialGradient id="ig-footer" cx="30%" cy="107%" r="150%">
                        <stop offset="0%" stopColor="#fdf497"/>
                        <stop offset="45%" stopColor="#fd5949"/>
                        <stop offset="60%" stopColor="#d6249f"/>
                        <stop offset="90%" stopColor="#285AEB"/>
                      </radialGradient>
                    </defs>
                    <rect x="2" y="2" width="20" height="20" rx="5.5" fill="url(#ig-footer)"/>
                    <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none"/>
                    <circle cx="17.5" cy="6.5" r="1.1" fill="white"/>
                  </svg>
                </a>
                {/* WhatsApp */}
                <a href="https://wa.me/message/CEACUCTW6E7BB1" target="_blank" rel="noopener noreferrer" title="واتساب"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '38px', height: '38px', borderRadius: '11px',
                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                    textDecoration: 'none', transition: 'transform 0.15s, background 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px) scale(1.1)'; (e.currentTarget as HTMLElement).style.background = 'rgba(37,211,102,0.18)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="#25d366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </a>
                {/* Salla Store */}
                <a href="https://salla.sa/battle_of_letters_store/" target="_blank" rel="noopener noreferrer" title="متجر سلة"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '38px', height: '38px', borderRadius: '11px',
                    background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.3)',
                    textDecoration: 'none', transition: 'transform 0.15s, background 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px) scale(1.1)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,107,53,0.25)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,107,53,0.12)'; }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="#ff6b35" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="3" y1="6" x2="21" y2="6" stroke="#ff6b35" strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M16 10a4 4 0 01-8 0" stroke="#ff6b35" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* شريط حقوق النشر */}
          <div style={{
            marginTop: '2.5rem',
            paddingTop: '1.25rem',
            borderTop: `1px solid ${colors.border}`,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <p style={{ fontSize: '0.75rem', color: colors.textSecondary, opacity: 0.5, margin: 0, fontWeight: 600 }}>
              © 2026 حرب الحروف — جميع الحقوق محفوظة
            </p>
            <p style={{ fontSize: '0.72rem', color: colors.textSecondary, opacity: 0.4, margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Meshal Alshammari · XG3U
            </p>
          </div>
        </footer>
      </main>

      {/* ── Bottom Navigation (للجوال فقط) ─────────────────────────────────── */}
      {isMobile && (
        <nav style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          background: isDarkMode
            ? 'rgba(8, 2, 20, 0.97)'
            : 'rgba(248, 249, 250, 0.97)',
          backdropFilter: 'blur(16px)',
          borderTop: `1px solid ${isDarkMode ? 'rgba(168,85,247,0.25)' : 'rgba(124,58,237,0.15)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingTop: '0.35rem',
          paddingLeft: '0.5rem',
          paddingRight: '0.5rem',
        }}>
          {([
            { label: 'الرئيسية', section: 'hero',       Icon: Home       },
            { label: 'الأسئلة',  section: 'categories', Icon: HelpCircle },
            { label: 'البطاقات', section: 'cards',      Icon: Layers     },
            { label: 'الدليل',   section: 'guide',      Icon: BookOpen   },
          ] as { label: string; section: string; Icon: React.ComponentType<{ size?: number }> }[]).map((item) => (
            <button
              key={item.section}
              onClick={() => scrollToSection(item.section)}
              aria-label={item.label}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.2rem',
                padding: '0.4rem 0.25rem',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                fontFamily: 'Tajawal, sans-serif',
                fontWeight: 600,
                fontSize: '0.6rem',
                borderRadius: '0.75rem',
                minHeight: '52px',
                transition: 'color 0.2s',
              }}
              onTouchStart={(e) => { e.currentTarget.style.color = '#c084fc'; }}
              onTouchEnd={(e) => { e.currentTarget.style.color = isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)'; }}
            >
              <item.Icon size={22} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* زر واتساب عائم */}
      <a
        href="https://wa.me/message/CEACUCTW6E7BB1"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="تواصل معنا عبر واتساب"
        style={{
          position: 'fixed',
          bottom: isMobile ? 'calc(5rem + env(safe-area-inset-bottom))' : 'calc(1.5rem + env(safe-area-inset-bottom))',
          left: '1.5rem',
          zIndex: 150,
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #25d366, #128c7e)',
          boxShadow: '0 4px 20px rgba(37, 211, 102, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textDecoration: 'none',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 28px rgba(37,211,102,0.7)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(37,211,102,0.5)';
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>

      {/* CSS Animations */}
      <style>{`
        @keyframes letterFall {
          0% {
            transform: translate3d(0, -10vh, 0) rotate(0deg);
            opacity: 0;
          }
          5% { opacity: 1; }
          95% { opacity: 1; }
          100% {
            transform: translate3d(0, 110vh, 0) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes float {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -10px, 0); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
};

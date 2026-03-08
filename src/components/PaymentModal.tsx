// src/components/PaymentModal.tsx
import React, { useState, useEffect } from 'react';
import { CreditCard, Check, X, Sparkles, Ticket } from 'lucide-react';
import { useScreenSize } from '../hooks/useScreenSize';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../context/AuthContext';

type Tab = 'payment' | 'redeem';

interface PaymentModalProps {
  onClose: () => void;
  defaultPlan?: 'single' | 'lifetime';
  /** أي تبويب يُفتح أولاً — افتراضي: 'payment' */
  defaultTab?: Tab;
  /** يُستدعى عند اكتشاف باقة مدفوعة نشطة → ينقل المستخدم لشاشة الإعدادات */
  onPaidPlanDetected?: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  onClose,
  defaultPlan,
  defaultTab = 'payment',
  onPaidPlanDetected,
}) => {
  const { isMobile, isTablet } = useScreenSize();
  const { refreshSubscription, planDisplay } = useAuthContext();

  // ── تبويب نشط ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);

  // ── حالة الدفع ──────────────────────────────────────────────────────────────
  const [selectedPlan, setSelectedPlan] = useState<'single' | 'lifetime' | null>(defaultPlan ?? null);

  // ── حالة تفعيل الكود ────────────────────────────────────────────────────────
  const [redeemCode, setRedeemCode]       = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemError, setRedeemError]     = useState('');
  const [redeemSuccess, setRedeemSuccess] = useState('');

  // ── حالة التحقق من الباقة ───────────────────────────────────────────────────
  const [checkingPlan, setCheckingPlan]   = useState(false);
  const [planCheckDone, setPlanCheckDone] = useState(false);
  const [planCheckMsg, setPlanCheckMsg]   = useState('');

  // ── مساعدات responsive ─────────────────────────────────────────────────────
  const isCompact = isMobile || isTablet; // جوال + آيباد = تخطيط مضغوط

  // ── فتح صفحة سلة ───────────────────────────────────────────────────────────
  const handlePayment = () => {
    if (!selectedPlan) return;
    const sallaLinks: Record<string, string> = {
      single:   'https://salla.sa/battle_of_letters_store/bwPoXen',
      lifetime: 'https://salla.sa/battle_of_letters_store/ABZmvNb',
    };
    window.open(sallaLinks[selectedPlan], '_blank', 'noopener,noreferrer');
    onClose();
  };

  // ── تفعيل كود الاشتراك ─────────────────────────────────────────────────────
  const handleRedeemCode = async () => {
    if (!redeemCode.trim()) { setRedeemError('أدخل الكود أولاً'); return; }
    setRedeemLoading(true);
    setRedeemError('');
    setRedeemSuccess('');
    try {
      const { data, error } = await supabase.rpc('redeem_activation_code', {
        input_code: redeemCode.trim().toUpperCase(),
      });
      if (error || !data?.success) {
        setRedeemError(data?.error || error?.message || 'كود غير صالح أو مستخدم مسبقاً');
      } else {
        const planLabel = data.plan_type === 'lifetime' ? 'بلا حدود ♾️' : '72 ساعة ⏰';
        setRedeemSuccess(`✅ تم تفعيل باقة ${planLabel} بنجاح!`);
        setRedeemCode('');
        await refreshSubscription();
      }
    } catch {
      setRedeemError('حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى');
    }
    setRedeemLoading(false);
  };

  // ── التحقق من الباقة ────────────────────────────────────────────────────────
  const handleCheckPlan = async () => {
    if (planDisplay !== 'free') {
      onPaidPlanDetected?.();
      return;
    }
    setCheckingPlan(true);
    setPlanCheckMsg('');
    setPlanCheckDone(false);
    await refreshSubscription();
    setCheckingPlan(false);
    setPlanCheckDone(true);
  };

  useEffect(() => {
    if (!planCheckDone) return;
    setPlanCheckDone(false);
    if (planDisplay !== 'free') {
      onPaidPlanDetected?.();
      return;
    }
    setPlanCheckMsg('📋 باقتك لا تزال مجانية — يمكنك الشراء من الأسفل');
  }, [planCheckDone, planDisplay, onPaidPlanDetected]);

  // ── إعادة ضبط عند تبديل التبويب ───────────────────────────────────────────
  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setRedeemError('');
    setRedeemSuccess('');
    setRedeemCode('');
    setPlanCheckMsg('');
  };

  // ── Style helpers ───────────────────────────────────────────────────────────
  // الجوال: sheet من الأسفل | الآيباد والديسكتوب: modal في المنتصف
  const overlayAlign  = isMobile ? 'flex-end' : 'center';
  const overlayPad    = isMobile ? '0' : isTablet ? '1rem' : '1.5rem';
  const cardRadius    = isMobile ? '1.5rem 1.5rem 0 0' : '2rem';
  const cardPad       = isMobile ? '0.9rem 1rem 0' : isTablet ? '1.75rem 1.5rem' : '2.5rem';
  const cardPadBottom = isMobile
    ? 'calc(1.25rem + env(safe-area-inset-bottom, 16px))'
    : isTablet ? '1.75rem' : '2.5rem';
  // الحد الأقصى للعرض: الدفع أوسع من الكود
  const cardMaxWidth  = activeTab === 'payment'
    ? (isMobile ? '100%' : isTablet ? '680px' : '900px')
    : (isMobile ? '100%' : '480px');
  // dvh يستثني شريط المتصفح في iOS Safari — أفضل من vh وحدها
  const cardMaxHeight = isMobile ? 'min(92dvh, 92vh)' : isTablet ? '90vh' : 'none';

  const titleSize    = isMobile ? '1rem'    : isTablet ? '1.4rem'  : '1.75rem';
  const subtitleSize = isMobile ? '0.78rem' : '1rem';
  const priceSize    = isMobile ? '1.45rem' : isTablet ? '2rem'    : '2.5rem';
  const planPad      = isMobile ? '0.85rem' : isTablet ? '1.35rem' : '1.75rem';
  const tabFontSize  = isMobile ? '0.8rem'  : '0.95rem';
  const tabPadding   = isMobile ? '0.5rem 0.5rem' : '0.7rem 1rem';
  const btnFontSize  = isMobile ? '0.93rem' : '1.1rem';
  const btnPadding   = isMobile ? '0.85rem' : isTablet ? '1.05rem' : '1.25rem';

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: overlayAlign,
        justifyContent: 'center',
        zIndex: 9999,
        padding: overlayPad,
        overflow: 'hidden', // الـ card نفسها هي التي تتمرر — لا الـ overlay
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: cardMaxWidth,
          width: '100%',
          maxHeight: cardMaxHeight,
          overflowY: isCompact ? 'auto' : 'visible',
          background: 'linear-gradient(135deg, #1a0b2e, #2d1154)',
          borderRadius: cardRadius,
          padding: cardPad,
          paddingBottom: cardPadBottom,
          border: '2px solid rgba(168,85,247,0.4)',
          position: 'relative',
          transition: 'max-width 0.3s ease',
          WebkitOverflowScrolling: 'touch', // smooth scroll on iOS
        }}
      >
        {/* ── مؤشر السحب (جوال فقط) ───────────────────────────────────── */}
        {isMobile && (
          <div style={{
            width: '36px', height: '4px',
            background: 'rgba(255,255,255,0.18)',
            borderRadius: '2px',
            margin: '0 auto 0.65rem',
          }} />
        )}

        {/* ── زر الإغلاق ─────────────────────────────────────────────────── */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: isMobile ? '0.65rem' : '0.9rem', right: '0.9rem',
            background: 'rgba(239,68,68,0.15)',
            border: '1.5px solid rgba(239,68,68,0.3)',
            borderRadius: '50%',
            width: isMobile ? '44px' : '40px',
            height: isMobile ? '44px' : '40px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 1,
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          } as React.CSSProperties}
        >
          <X size={isMobile ? 18 : 18} color="#ef4444" />
        </button>

        {/* ── Tab Switcher ────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', gap: '0.5rem',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '1rem', padding: '0.35rem',
          marginBottom: isMobile ? '0.9rem' : '1.75rem',
          marginTop: isMobile ? '0.05rem' : '0.1rem',
          marginRight: isMobile ? '3rem' : '3.25rem', // مساحة لزر الإغلاق 44px
        }}>
          {([
            { key: 'payment', label: 'الدفع',       icon: <CreditCard size={15} /> },
            { key: 'redeem',  label: 'تفعيل كود',   icon: <Ticket size={15} /> },
          ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '0.35rem', padding: tabPadding,
                borderRadius: '0.75rem', border: 'none', cursor: 'pointer',
                fontFamily: 'Tajawal, sans-serif',
                fontWeight: 700, fontSize: tabFontSize,
                transition: 'all 0.2s',
                background: activeTab === tab.key
                  ? 'linear-gradient(135deg, #a855f7, #ec4899)'
                  : 'transparent',
                color: activeTab === tab.key ? '#fff' : 'rgba(255,255,255,0.5)',
                boxShadow: activeTab === tab.key ? '0 4px 16px rgba(168,85,247,0.35)' : 'none',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            تبويب الدفع
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'payment' && (
          <>
            {/* عنوان */}
            <div style={{ textAlign: 'center', marginBottom: isMobile ? '0.75rem' : '1.75rem' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: isMobile ? '0.5rem 0.9rem' : '0.85rem 1.75rem',
                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                borderRadius: '1rem', marginBottom: isMobile ? '0.4rem' : '0.65rem',
              }}>
                <Sparkles size={isMobile ? 18 : 22} color="white" />
                <h2 style={{ fontSize: titleSize, fontWeight: 900, color: 'white', margin: 0 }}>
                  اختر باقتك
                </h2>
              </div>
              <p style={{ fontSize: subtitleSize, color: '#e9d5ff', margin: 0, lineHeight: 1.5 }}>
                اختر الباقة المناسبة واستمتع بجميع ميزات اللعبة
              </p>
            </div>

            {/* الباقات — عمودان على الآيباد والديسكتوب، عمود واحد على الجوال */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: isMobile ? '0.6rem' : '1.25rem',
              marginBottom: isMobile ? '0.75rem' : '1.1rem',
            }}>
              {/* باقة 72 ساعة */}
              <div
                onClick={() => setSelectedPlan('single')}
                style={{
                  padding: planPad,
                  background: selectedPlan === 'single'
                    ? 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(37,99,235,0.25))'
                    : 'rgba(255,255,255,0.04)',
                  border: selectedPlan === 'single' ? '2.5px solid #3b82f6' : '1.5px solid rgba(255,255,255,0.1)',
                  borderRadius: '1.25rem', cursor: 'pointer', transition: 'all 0.25s',
                  transform: selectedPlan === 'single' ? 'scale(1.01)' : 'scale(1)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: priceSize, fontWeight: 900, color: 'white', lineHeight: 1 }}>
                      7.99 ر.س
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#60a5fa', margin: '0.25rem 0' }}>
                      باقة الثلاث أيام
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'rgba(96,165,250,0.65)', marginBottom: '0.65rem' }}>
                      لمدة 72 ساعة
                    </div>
                  </div>
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                    border: selectedPlan === 'single' ? '3px solid #3b82f6' : '2px solid rgba(255,255,255,0.2)',
                    background: selectedPlan === 'single' ? '#3b82f6' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {selectedPlan === 'single' && <Check size={13} color="white" strokeWidth={3} />}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.83rem', color: 'rgba(255,255,255,0.75)' }}>
                  {['لعبة واحدة كاملة', 'جميع البطاقات', 'جميع الفئات', 'مزامنة متعددة الشاشات'].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Check size={13} color="#10b981" strokeWidth={2.5} />{f}
                    </div>
                  ))}
                </div>
              </div>

              {/* باقة لامحدودة */}
              <div
                onClick={() => setSelectedPlan('lifetime')}
                style={{
                  padding: planPad,
                  background: selectedPlan === 'lifetime'
                    ? 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(236,72,153,0.25))'
                    : 'rgba(255,255,255,0.04)',
                  border: selectedPlan === 'lifetime' ? '2.5px solid #a855f7' : '1.5px solid rgba(255,255,255,0.1)',
                  borderRadius: '1.25rem', cursor: 'pointer', transition: 'all 0.25s',
                  transform: selectedPlan === 'lifetime' ? 'scale(1.01)' : 'scale(1)',
                  position: 'relative',
                  marginTop: isMobile ? '0.5rem' : '0', // مسافة لـ badge على الجوال
                }}
              >
                <div style={{
                  position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)',
                  padding: '0.28rem 0.9rem',
                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                  borderRadius: '1rem', fontSize: '0.72rem', fontWeight: 900, color: '#1a0b2e', whiteSpace: 'nowrap',
                }}>
                  الأفضل قيمة 🔥
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: priceSize, fontWeight: 900, color: 'white', lineHeight: 1 }}>
                      29.99 ر.س
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#a855f7', margin: '0.25rem 0 0.65rem' }}>
                      باقة اللعب اللامحدود
                    </div>
                  </div>
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                    border: selectedPlan === 'lifetime' ? '3px solid #a855f7' : '2px solid rgba(255,255,255,0.2)',
                    background: selectedPlan === 'lifetime' ? '#a855f7' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {selectedPlan === 'lifetime' && <Check size={13} color="white" strokeWidth={3} />}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.83rem', color: 'rgba(255,255,255,0.75)' }}>
                  {[
                    'ألعاب غير محدودة',
                    'جميع البطاقات الحالية والمستقبلية',
                    'جميع الفئات الحالية والمستقبلية',
                    'تحديثات مجانية دائماً',
                    'دعم فني مميز',
                  ].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Check size={13} color="#10b981" strokeWidth={2.5} />{f}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* زر الدفع */}
            <button
              onClick={handlePayment}
              disabled={!selectedPlan}
              style={{
                width: '100%', padding: btnPadding,
                background: selectedPlan ? 'linear-gradient(135deg, #10b981, #14b8a6)' : 'rgba(255,255,255,0.08)',
                border: 'none', borderRadius: '1rem',
                color: 'white', fontSize: btnFontSize, fontWeight: 900,
                cursor: selectedPlan ? 'pointer' : 'not-allowed',
                opacity: selectedPlan ? 1 : 0.45,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                fontFamily: 'Tajawal, sans-serif',
                transition: 'opacity 0.2s',
              }}
            >
              <CreditCard size={20} />
              {selectedPlan ? 'إتمام الدفع — الانتقال لسلة' : 'اختر الباقة أولاً'}
            </button>

            {/* أمان + واتساب + تحقق */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? '0.45rem' : '0.6rem', marginTop: isMobile ? '0.6rem' : '0.85rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', margin: 0, textAlign: 'center' }}>
                🔒 جميع المعاملات آمنة ومشفرة عبر سلة
              </p>

              {/* واتساب */}
              <a
                href="https://wa.me/message/CEACUCTW6E7BB1"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                  padding: isMobile ? '0.5rem 1rem' : '0.5rem 1.25rem',
                  background: 'rgba(37,211,102,0.1)',
                  border: '1px solid rgba(37,211,102,0.3)',
                  borderRadius: '2rem',
                  color: '#25d366', fontWeight: 700, fontSize: '0.83rem', textDecoration: 'none',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#25d366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                للاستفسار تواصل معنا عبر واتساب
              </a>

              {/* تحقق من الباقة */}
              <button
                onClick={handleCheckPlan}
                disabled={checkingPlan}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.45rem 1.1rem',
                  background: 'rgba(168,85,247,0.08)',
                  border: '1px solid rgba(168,85,247,0.25)',
                  borderRadius: '2rem', cursor: checkingPlan ? 'wait' : 'pointer',
                  color: 'rgba(168,85,247,0.85)', fontWeight: 600, fontSize: '0.82rem',
                  fontFamily: 'Tajawal, sans-serif', transition: 'opacity 0.2s',
                  opacity: checkingPlan ? 0.6 : 1,
                }}
              >
                {checkingPlan ? '⟳ جارٍ التحقق...' : '🔄 تحقق من الباقة'}
              </button>

              {planCheckMsg && (
                <div style={{
                  padding: '0.5rem 1rem',
                  background: planDisplay === 'free' ? 'rgba(251,191,36,0.08)' : 'rgba(16,185,129,0.1)',
                  border: `1px solid ${planDisplay === 'free' ? 'rgba(251,191,36,0.25)' : 'rgba(16,185,129,0.3)'}`,
                  borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 700,
                  color: planDisplay === 'free' ? '#fbbf24' : '#34d399', textAlign: 'center',
                  width: '100%',
                }}>
                  {planCheckMsg}
                </div>
              )}
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            تبويب تفعيل الكود
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'redeem' && (
          <div style={{ textAlign: 'center' }}>
            {/* أيقونة + عنوان */}
            <div style={{ fontSize: isMobile ? '2.75rem' : '3.5rem', marginBottom: '0.4rem' }}>🎟️</div>
            <h2 style={{
              fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: 900,
              color: '#fbbf24', margin: '0 0 0.35rem',
            }}>
              تفعيل كود الاشتراك
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
              أدخل الكود الذي حصلت عليه لتفعيل باقتك فوراً
            </p>

            {/* حقل الكود */}
            <input
              value={redeemCode}
              onChange={e => {
                setRedeemCode(e.target.value.toUpperCase());
                setRedeemError('');
                setRedeemSuccess('');
              }}
              onKeyDown={e => e.key === 'Enter' && !redeemLoading && handleRedeemCode()}
              placeholder="مثال: WOL-ABC123"
              maxLength={20}
              autoCapitalize="characters"
              style={{
                width: '100%',
                padding: isMobile ? '0.9rem 1rem' : '1rem 1.25rem',
                borderRadius: '0.875rem',
                background: 'rgba(251,191,36,0.07)',
                border: `2px solid ${redeemError ? 'rgba(239,68,68,0.5)' : redeemSuccess ? 'rgba(16,185,129,0.5)' : 'rgba(251,191,36,0.25)'}`,
                color: '#fff',
                fontSize: isMobile ? '1rem' : '1.1rem',
                fontWeight: 700,
                textAlign: 'center',
                direction: 'ltr',
                letterSpacing: '0.12em',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
                fontFamily: 'monospace, Tajawal, sans-serif',
              }}
              onFocus={e => { if (!redeemError && !redeemSuccess) e.target.style.borderColor = 'rgba(251,191,36,0.6)'; }}
              onBlur={e => { if (!redeemError && !redeemSuccess) e.target.style.borderColor = 'rgba(251,191,36,0.25)'; }}
            />

            {/* رسائل الخطأ / النجاح */}
            {redeemError && (
              <div style={{
                marginTop: '0.65rem', padding: '0.6rem 1rem',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '0.75rem', color: '#f87171', fontSize: '0.875rem',
              }}>
                {redeemError}
              </div>
            )}
            {redeemSuccess && (
              <div style={{
                marginTop: '0.65rem', padding: '0.6rem 1rem',
                background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)',
                borderRadius: '0.75rem', color: '#34d399', fontSize: '0.9rem', fontWeight: 700,
              }}>
                {redeemSuccess}
              </div>
            )}

            {/* أزرار تفعيل + إغلاق */}
            <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1.1rem' }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: isMobile ? '0.85rem' : '0.9rem',
                  borderRadius: '0.875rem',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.6)',
                  fontWeight: 600, cursor: 'pointer', fontSize: '0.93rem',
                  fontFamily: 'Tajawal, sans-serif',
                }}
              >
                إغلاق
              </button>
              <button
                onClick={handleRedeemCode}
                disabled={redeemLoading || !!redeemSuccess}
                style={{
                  flex: 2, padding: isMobile ? '0.85rem' : '0.9rem',
                  borderRadius: '0.875rem',
                  background: redeemSuccess
                    ? 'rgba(16,185,129,0.25)'
                    : 'linear-gradient(135deg, #d97706, #f59e0b)',
                  border: 'none', color: '#fff',
                  fontWeight: 700, cursor: redeemLoading ? 'wait' : redeemSuccess ? 'default' : 'pointer',
                  fontSize: '0.93rem',
                  opacity: redeemLoading ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                  fontFamily: 'Tajawal, sans-serif',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                }}
              >
                {redeemLoading
                  ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> جارٍ التفعيل...</>
                  : redeemSuccess
                  ? '✅ تم التفعيل'
                  : <><Ticket size={16} /> تفعيل الكود</>
                }
              </button>
            </div>

            {/* تحقق من الباقة */}
            <div style={{ marginTop: '1.1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={handleCheckPlan}
                disabled={checkingPlan}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.45rem 1.1rem',
                  background: 'rgba(168,85,247,0.08)',
                  border: '1px solid rgba(168,85,247,0.25)',
                  borderRadius: '2rem', cursor: checkingPlan ? 'wait' : 'pointer',
                  color: 'rgba(168,85,247,0.85)', fontWeight: 600, fontSize: '0.82rem',
                  fontFamily: 'Tajawal, sans-serif', transition: 'opacity 0.2s',
                  opacity: checkingPlan ? 0.6 : 1,
                }}
              >
                {checkingPlan ? '⟳ جارٍ التحقق...' : '🔄 تحقق من الباقة'}
              </button>
              {planCheckMsg && (
                <div style={{
                  padding: '0.5rem 1rem',
                  background: planDisplay === 'free' ? 'rgba(251,191,36,0.08)' : 'rgba(16,185,129,0.1)',
                  border: `1px solid ${planDisplay === 'free' ? 'rgba(251,191,36,0.25)' : 'rgba(16,185,129,0.3)'}`,
                  borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 700,
                  color: planDisplay === 'free' ? '#fbbf24' : '#34d399', textAlign: 'center',
                }}>
                  {planCheckMsg}
                </div>
              )}
            </div>

            {/* مشكلة في الكود؟ */}
            <p style={{ marginTop: '0.65rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
              مشكلة في الكود؟{' '}
              <a
                href="https://wa.me/message/CEACUCTW6E7BB1"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#25d366', fontWeight: 700, textDecoration: 'none' }}
              >
                تواصل معنا
              </a>
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

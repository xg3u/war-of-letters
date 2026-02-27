// src/components/PaymentModal.tsx
import React, { useState } from 'react';
import { CreditCard, Check, X, Sparkles } from 'lucide-react';
import { useScreenSize } from '../hooks/useScreenSize';

interface PaymentModalProps {
  onClose: () => void;
  onSuccess: () => void;
  defaultPlan?: 'single' | 'lifetime';
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ onClose, onSuccess, defaultPlan }) => {
  const { isMobile } = useScreenSize();
  const [selectedPlan, setSelectedPlan] = useState<'single' | 'lifetime' | null>(defaultPlan ?? null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handlePayment = () => {
    if (!selectedPlan) return;

    const sallaLinks: Record<string, string> = {
      single: 'https://salla.sa/battle_of_letters_store/bwPoXen',
      lifetime: 'https://salla.sa/battle_of_letters_store/ABZmvNb',
    };

    // يُفتح مباشرة من حدث المستخدم (لا يحتاج await) — لضمان عدم حجب المتصفح
    window.open(sallaLinks[selectedPlan], '_blank', 'noopener,noreferrer');
    onClose();
  };

  if (showSuccess) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0, 0, 0, 0.9)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      }}>
        <div style={{
          maxWidth: '500px', width: '90%',
          background: 'linear-gradient(135deg, #10b981, #14b8a6)',
          borderRadius: '2rem', padding: '3rem', textAlign: 'center',
          animation: 'scaleUp 0.5s ease-out',
        }}>
          <div style={{
            width: '100px', height: '100px', borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 2rem auto',
          }}>
            <Check size={60} color="white" strokeWidth={3} />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'white', marginBottom: '1rem' }}>
            تم الدفع بنجاح! 🎉
          </h2>
          <p style={{ fontSize: '1.125rem', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '2rem' }}>
            يمكنك الآن الاستمتاع بجميع ميزات اللعبة
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.92)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: isMobile ? 'flex-start' : 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: isMobile ? '0' : '1.5rem',
      overflowY: 'auto',
    }}>
      <div style={{
        maxWidth: '900px',
        width: '100%',
        background: 'linear-gradient(135deg, #1a0b2e, #2d1154)',
        borderRadius: isMobile ? '1.5rem 1.5rem 0 0' : '2rem',
        padding: isMobile ? '1.25rem 1rem' : '3rem',
        border: '3px solid rgba(168, 85, 247, 0.5)',
        position: 'relative',
        marginTop: isMobile ? 'auto' : '0',
        /* على الجوال: يظهر من الأسفل */
        alignSelf: isMobile ? 'flex-end' : 'center',
        /* لضمان ظهور كامل المحتوى عند التمرير */
        paddingBottom: isMobile ? 'calc(1.25rem + env(safe-area-inset-bottom))' : '3rem',
      }}>

        {/* زر الإغلاق */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem', right: '1rem',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '2px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '50%',
            width: '44px', height: '44px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={20} color="#ef4444" />
        </button>

        {/* العنوان */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? '1.5rem' : '3rem', paddingTop: isMobile ? '0.5rem' : '0' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
            padding: isMobile ? '0.75rem 1.25rem' : '1rem 2rem',
            background: 'linear-gradient(135deg, #a855f7, #ec4899)',
            borderRadius: '1rem', marginBottom: '1rem',
          }}>
            <Sparkles size={isMobile ? 22 : 28} color="white" />
            <h2 style={{ fontSize: isMobile ? '1.4rem' : '2rem', fontWeight: 900, color: 'white', margin: 0 }}>
              اختر باقتك
            </h2>
          </div>
          <p style={{ fontSize: isMobile ? '0.95rem' : '1.125rem', color: '#e9d5ff', marginTop: '0.75rem' }}>
            اختر الباقة المناسبة واستمتع بجميع ميزات اللعبة
          </p>
        </div>

        {/* الباقات */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: isMobile ? '1rem' : '2rem',
          marginBottom: '1.5rem',
        }}>
          {/* باقة الثلاث أيام */}
          <div
            onClick={() => setSelectedPlan('single')}
            style={{
              padding: isMobile ? '1.25rem' : '2rem',
              background: selectedPlan === 'single'
                ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(37, 99, 235, 0.3))'
                : 'rgba(255, 255, 255, 0.05)',
              border: selectedPlan === 'single' ? '3px solid #3b82f6' : '2px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '1.5rem',
              cursor: 'pointer',
              transition: 'all 0.3s',
              transform: selectedPlan === 'single' ? 'scale(1.02)' : 'scale(1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: isMobile ? '2rem' : '3rem', fontWeight: 900, color: 'white', marginBottom: '0.25rem' }}>
                  7.99 ر.س
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#60a5fa', marginBottom: '0.25rem' }}>
                  باقة الثلاث أيام
                </div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(96, 165, 250, 0.7)', marginBottom: '0.75rem' }}>
                  لمدة 72 ساعة
                </div>
              </div>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                border: selectedPlan === 'single' ? '3px solid #3b82f6' : '2px solid rgba(255,255,255,0.2)',
                background: selectedPlan === 'single' ? '#3b82f6' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: '0.25rem',
              }}>
                {selectedPlan === 'single' && <Check size={14} color="white" strokeWidth={3} />}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
              {['لعبة واحدة كاملة', 'جميع البطاقات', 'جميع الفئات', 'مزامنة متعددة الشاشات'].map((feat) => (
                <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Check size={16} color="#10b981" strokeWidth={2.5} />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* باقة اللعب اللامحدود */}
          <div
            onClick={() => setSelectedPlan('lifetime')}
            style={{
              padding: isMobile ? '1.25rem' : '2rem',
              background: selectedPlan === 'lifetime'
                ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(236, 72, 153, 0.3))'
                : 'rgba(255, 255, 255, 0.05)',
              border: selectedPlan === 'lifetime' ? '3px solid #a855f7' : '2px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '1.5rem',
              cursor: 'pointer',
              transition: 'all 0.3s',
              transform: selectedPlan === 'lifetime' ? 'scale(1.02)' : 'scale(1)',
              position: 'relative',
            }}
          >
            {/* شارة الأفضل */}
            <div style={{
              position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
              padding: '0.35rem 1.25rem',
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 900, color: '#1a0b2e',
              whiteSpace: 'nowrap',
            }}>
              الأفضل قيمة 🔥
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginTop: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: isMobile ? '2rem' : '3rem', fontWeight: 900, color: 'white', marginBottom: '0.25rem' }}>
                  29.99 ر.س
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#a855f7', marginBottom: '0.75rem' }}>
                  باقة اللعب اللامحدود
                </div>
              </div>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                border: selectedPlan === 'lifetime' ? '3px solid #a855f7' : '2px solid rgba(255,255,255,0.2)',
                background: selectedPlan === 'lifetime' ? '#a855f7' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: '0.25rem',
              }}>
                {selectedPlan === 'lifetime' && <Check size={14} color="white" strokeWidth={3} />}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
              {[
                'ألعاب غير محدودة',
                'جميع البطاقات الحالية والمستقبلية',
                'جميع الفئات الحالية والمستقبلية',
                'تحديثات مجانية دائماً',
                'دعم فني مميز',
              ].map((feat) => (
                <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Check size={16} color="#10b981" strokeWidth={2.5} />
                  <span>{feat}</span>
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
            width: '100%', padding: isMobile ? '1.1rem' : '1.5rem',
            background: selectedPlan ? 'linear-gradient(135deg, #10b981, #14b8a6)' : 'rgba(255, 255, 255, 0.1)',
            border: 'none', borderRadius: '1rem',
            color: 'white', fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: 900,
            cursor: selectedPlan ? 'pointer' : 'not-allowed',
            opacity: selectedPlan ? 1 : 0.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
          }}
        >
          <CreditCard size={24} /> {selectedPlan ? 'إتمام الدفع — الانتقال لسلة' : 'اختر الباقة أولاً'}
        </button>

        {/* أمان + واتساب */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginTop: '1.25rem' }}>
          <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.4)', margin: 0 }}>
            🔒 جميع المعاملات آمنة ومشفرة عبر سلة
          </p>
          <a
            href="https://wa.me/message/CEACUCTW6E7BB1"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.6rem 1.25rem',
              background: 'rgba(37, 211, 102, 0.12)',
              border: '1px solid rgba(37, 211, 102, 0.35)',
              borderRadius: '2rem',
              color: '#25d366',
              fontWeight: 700, fontSize: '0.9rem',
              textDecoration: 'none',
              transition: 'background 0.2s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#25d366">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            للاستفسار تواصل معنا عبر واتساب
          </a>
        </div>
      </div>

      <style>{`
        @keyframes scaleUp { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

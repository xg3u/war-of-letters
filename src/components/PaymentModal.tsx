// src/components/PaymentModal.tsx
// نافذة الدفع المحاكاة (Mocked Payment UI)

import React, { useState } from 'react';
import { CreditCard, Check, X, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PaymentModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ onClose, onSuccess }) => {
  const [selectedPlan, setSelectedPlan] = useState<'single' | 'lifetime' | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    if (!selectedPlan) return;

    setIsProcessing(true);
    setError(null);

    try {
      // الحصول على المستخدم الحالي
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('يجب تسجيل الدخول أولاً');
      }

      // روابط Salla للباقات
      const sallaLinks = {
        single: 'https://salla.sa/battle_of_letters_store/bwPoXen',
        lifetime: 'https://salla.sa/battle_of_letters_store/ABZmvNb'
      };

      // توجيه المستخدم إلى صفحة الدفع في Salla
      const paymentUrl = sallaLinks[selectedPlan];

      console.log(`🔗 Redirecting to Salla payment page for ${selectedPlan} plan`);
      console.log(`Amount: ${selectedPlan === 'single' ? '7.99' : '29.99'} SAR`);

      // فتح رابط الدفع في نافذة جديدة
      window.open(paymentUrl, '_blank');

      // إغلاق المودال بعد فترة قصيرة
      setTimeout(() => {
        onClose();
      }, 500);

    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setIsProcessing(false);
    }
  };

  if (showSuccess) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}>
        <div style={{
          maxWidth: '500px',
          width: '90%',
          background: 'linear-gradient(135deg, #10b981, #14b8a6)',
          borderRadius: '2rem',
          padding: '3rem',
          textAlign: 'center',
          animation: 'scaleUp 0.5s ease-out',
        }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 2rem auto',
          }}>
            <Check size={60} color="white" strokeWidth={3} />
          </div>

          <h2 style={{
            fontSize: '2rem',
            fontWeight: 900,
            color: 'white',
            marginBottom: '1rem',
          }}>
            تم الدفع بنجاح! 🎉
          </h2>

          <p style={{
            fontSize: '1.125rem',
            color: 'rgba(255, 255, 255, 0.9)',
            marginBottom: '2rem',
          }}>
            يمكنك الآن الاستمتاع بجميع ميزات اللعبة
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.9)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '2rem',
    }}>
      <div style={{
        maxWidth: '900px',
        width: '100%',
        background: 'linear-gradient(135deg, #1a0b2e, #2d1154)',
        borderRadius: '2rem',
        padding: '3rem',
        border: '3px solid rgba(168, 85, 247, 0.5)',
        position: 'relative',
      }}>
        {/* زر الإغلاق */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.5rem',
            right: '1.5rem',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '2px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <X size={24} color="#ef4444" />
        </button>

        {/* العنوان */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem 2rem',
            background: 'linear-gradient(135deg, #a855f7, #ec4899)',
            borderRadius: '1rem',
            marginBottom: '1rem',
          }}>
            <Sparkles size={28} color="white" />
            <h2 style={{
              fontSize: '2rem',
              fontWeight: 900,
              color: 'white',
              margin: 0,
            }}>
              اختر باقتك
            </h2>
          </div>

          <p style={{
            fontSize: '1.125rem',
            color: '#e9d5ff',
            marginTop: '1rem',
          }}>
            اختر الباقة المناسبة لك واستمتع بجميع ميزات اللعبة
          </p>
        </div>

        {/* الباقات */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          marginBottom: '2rem',
        }}>
          {/* باقة الثلاث أيام */}
          <div
            onClick={() => setSelectedPlan('single')}
            style={{
              padding: '2rem',
              background: selectedPlan === 'single'
                ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(37, 99, 235, 0.3))'
                : 'rgba(255, 255, 255, 0.05)',
              border: selectedPlan === 'single'
                ? '3px solid #3b82f6'
                : '2px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '1.5rem',
              cursor: 'pointer',
              transition: 'all 0.3s',
              transform: selectedPlan === 'single' ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            <div style={{
              fontSize: '3rem',
              fontWeight: 900,
              color: 'white',
              marginBottom: '0.5rem',
            }}>
              7.99 ر.س
            </div>

            <div style={{
              fontSize: '1.125rem',
              fontWeight: 700,
              color: '#60a5fa',
              marginBottom: '0.5rem',
            }}>
              باقة الثلاث أيام
            </div>

            <div style={{
              fontSize: '0.875rem',
              color: 'rgba(96, 165, 250, 0.7)',
              marginBottom: '1rem',
            }}>
              لمدة 72 ساعة
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.95rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Check size={20} color="#10b981" />
                <span>لعبة واحدة كاملة</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Check size={20} color="#10b981" />
                <span>جميع البطاقات</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Check size={20} color="#10b981" />
                <span>جميع الفئات</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Check size={20} color="#10b981" />
                <span>مزامنة متعددة الشاشات</span>
              </div>
            </div>
          </div>

          {/* باقة اللعب اللامحدود */}
          <div
            onClick={() => setSelectedPlan('lifetime')}
            style={{
              padding: '2rem',
              background: selectedPlan === 'lifetime'
                ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(236, 72, 153, 0.3))'
                : 'rgba(255, 255, 255, 0.05)',
              border: selectedPlan === 'lifetime'
                ? '3px solid #a855f7'
                : '2px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '1.5rem',
              cursor: 'pointer',
              transition: 'all 0.3s',
              transform: selectedPlan === 'lifetime' ? 'scale(1.05)' : 'scale(1)',
              position: 'relative',
            }}
          >
            {/* شارة الأفضل */}
            <div style={{
              position: 'absolute',
              top: '-12px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '0.5rem 1.5rem',
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              borderRadius: '1rem',
              fontSize: '0.875rem',
              fontWeight: 900,
              color: '#1a0b2e',
            }}>
              الأفضل قيمة 🔥
            </div>

            <div style={{
              fontSize: '3rem',
              fontWeight: 900,
              color: 'white',
              marginBottom: '0.5rem',
            }}>
              29.99 ر.س
            </div>

            <div style={{
              fontSize: '1.125rem',
              fontWeight: 700,
              color: '#a855f7',
              marginBottom: '1.5rem',
            }}>
              باقة اللعب اللامحدود
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.95rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Check size={20} color="#10b981" />
                <span>ألعاب غير محدودة</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Check size={20} color="#10b981" />
                <span>جميع البطاقات الحالية والمستقبلية</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Check size={20} color="#10b981" />
                <span>جميع الفئات الحالية والمستقبلية</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Check size={20} color="#10b981" />
                <span>تحديثات مجانية دائماً</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Check size={20} color="#10b981" />
                <span>دعم فني مميز</span>
              </div>
            </div>
          </div>
        </div>

        {/* رسالة الخطأ */}
        {error && (
          <div style={{
            padding: '1rem',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '2px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '1rem',
            color: '#fca5a5',
            textAlign: 'center',
            marginBottom: '1rem',
          }}>
            {error}
          </div>
        )}

        {/* زر الدفع */}
        <button
          onClick={handlePayment}
          disabled={!selectedPlan || isProcessing}
          style={{
            width: '100%',
            padding: '1.5rem',
            background: selectedPlan && !isProcessing
              ? 'linear-gradient(135deg, #10b981, #14b8a6)'
              : 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '1rem',
            color: 'white',
            fontSize: '1.25rem',
            fontWeight: 900,
            cursor: selectedPlan && !isProcessing ? 'pointer' : 'not-allowed',
            opacity: selectedPlan && !isProcessing ? 1 : 0.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            transition: 'all 0.3s',
          }}
        >
          {isProcessing ? (
            <>
              <Loader2 size={28} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
              جاري المعالجة...
            </>
          ) : (
            <>
              <CreditCard size={28} />
              {selectedPlan ? 'إتمام الدفع' : 'اختر الباقة أولاً'}
            </>
          )}
        </button>

        {/* ملاحظة */}
        <p style={{
          textAlign: 'center',
          fontSize: '0.875rem',
          color: 'rgba(255, 255, 255, 0.5)',
          marginTop: '1.5rem',
        }}>
          🔒 جميع المعاملات آمنة ومشفرة
        </p>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes scaleUp {
          from {
            transform: scale(0.5);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

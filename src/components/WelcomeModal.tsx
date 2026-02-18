// src/components/WelcomeModal.tsx
// مودال الترحيب وشرح اللعبة

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Target, Zap, Trophy } from 'lucide-react';
import { useScreenSize } from '../hooks/useScreenSize';
import { supabase } from '../lib/supabase';

interface WelcomeModalProps {
  onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const { isMobile, isTablet } = useScreenSize();

  const handleClose = async () => {
    // احفظ فقط إذا اختار المستخدم "لا تظهر مرة أخرى"
    if (dontShowAgain) {
      // جلب معرف المستخدم الحالي
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const hideModalKey = `hideWelcomeModal_${user.id}`;
        localStorage.setItem(hideModalKey, 'true');
      }
    }
    onClose();
  };

  const handleSkip = () => {
    // عند الضغط على X، لا نحفظ - الرسالة ستظهر مرة أخرى
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'linear-gradient(135deg, rgba(10, 1, 24, 0.75) 0%, rgba(26, 11, 46, 0.85) 50%, rgba(45, 17, 84, 0.75) 100%)',
        backdropFilter: 'blur(20px)',
        animation: 'fadeIn 0.3s ease',
      }}
      onClick={handleSkip}
    >
      {/* المودال */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: isMobile ? '95%' : '700px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: isMobile ? '1rem' : '2rem',
          background: 'linear-gradient(135deg, #1a0b2e 0%, #2d1154 100%)',
          border: '2px solid rgba(168, 85, 247, 0.3)',
          boxShadow: '0 20px 60px rgba(168, 85, 247, 0.4)',
          position: 'relative',
        }}
      >
        {/* زر الإغلاق */}
        <button
          onClick={handleSkip}
          style={{
            position: 'absolute',
            top: isMobile ? '1rem' : '1.5rem',
            right: isMobile ? '1rem' : '1.5rem',
            width: isMobile ? '2rem' : '2.5rem',
            height: isMobile ? '2rem' : '2.5rem',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <X size={20} color="white" />
        </button>

        {/* المحتوى */}
        <div style={{ padding: isMobile ? '1.5rem 1.25rem' : '3rem 2.5rem' }}>

          {/* الأيقونة */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: isMobile ? '1rem' : '2rem',
          }}>
            <div style={{
              width: isMobile ? '3.5rem' : '5rem',
              height: isMobile ? '3.5rem' : '5rem',
              borderRadius: '1.5rem',
              background: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 30px rgba(249, 115, 22, 0.4)',
              animation: 'float 3s ease-in-out infinite',
            }}>
              <Sparkles size={isMobile ? 28 : 40} color="white" strokeWidth={2.5} />
            </div>
          </div>

          {/* العنوان */}
          <h2 style={{
            fontSize: isMobile ? '1.5rem' : '2.25rem',
            fontWeight: 900,
            textAlign: 'center',
            marginBottom: '1rem',
            background: 'linear-gradient(135deg, #f97316, #ec4899, #a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            ⚔️ أهلاً بكم في معركة "حرب الحروف"! ⚔️
          </h2>

          <p style={{
            textAlign: 'center',
            color: '#e9d5ff',
            fontSize: isMobile ? '0.9rem' : '1.05rem',
            lineHeight: '1.8',
            marginBottom: isMobile ? '1.25rem' : '1.5rem',
          }}>
            فكرة اللعبة مألوفة لكم من اللعبة الشهيرة <strong style={{ color: '#f59e0b' }}>"حروف مع عزيز"</strong>..
            <br />
            بس زدنا عليها حماس ومقالب! 🤩
          </p>

          {/* الطورين */}
          <div style={{
            background: 'rgba(168, 85, 247, 0.1)',
            borderRadius: '1rem',
            padding: isMobile ? '1.25rem' : '1.5rem',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            marginBottom: isMobile ? '1rem' : '1.25rem',
          }}>
            <h3 style={{
              fontSize: isMobile ? '1rem' : '1.15rem',
              fontWeight: 900,
              color: 'white',
              marginBottom: '1rem',
              textAlign: 'center',
            }}>
              ✌️ اللعبة فيها طورين:
            </h3>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}>
              <div style={{
                background: 'rgba(59, 130, 246, 0.15)',
                borderRadius: '0.75rem',
                padding: isMobile ? '0.75rem' : '1rem',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}>
                <div style={{
                  color: '#60a5fa',
                  fontSize: isMobile ? '0.85rem' : '0.95rem',
                  fontWeight: 700,
                  marginBottom: '0.25rem',
                }}>
                  1. الطور الكلاسيكي 🧠
                </div>
                <p style={{
                  color: '#e9d5ff',
                  fontSize: isMobile ? '0.8rem' : '0.9rem',
                  margin: 0,
                  lineHeight: '1.6',
                }}>
                  ثقافة وسرعة بديهة.. اللي يسبق يجاوب صح، ياخذ الحرف!
                </p>
              </div>

              <div style={{
                background: 'rgba(236, 72, 153, 0.15)',
                borderRadius: '0.75rem',
                padding: isMobile ? '0.75rem' : '1rem',
                border: '1px solid rgba(236, 72, 153, 0.3)',
              }}>
                <div style={{
                  color: '#ec4899',
                  fontSize: isMobile ? '0.85rem' : '0.95rem',
                  fontWeight: 700,
                  marginBottom: '0.25rem',
                }}>
                  2. طور الأكشن كارد 🃏
                </div>
                <p style={{
                  color: '#e9d5ff',
                  fontSize: isMobile ? '0.8rem' : '0.9rem',
                  margin: 0,
                  lineHeight: '1.6',
                }}>
                  مو شرط تكون مثقف عشان تفوز! استخدم بطاقات الأكشن في الوقت المناسب عشان تخرب خطة الفريق الثاني أو تنقذ فريقك.
                </p>
              </div>
            </div>
          </div>

          {/* القاعدة الذهبية */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(245, 158, 11, 0.2))',
            borderRadius: '1rem',
            padding: isMobile ? '1rem' : '1.25rem',
            border: '2px solid rgba(249, 115, 22, 0.5)',
            marginBottom: isMobile ? '1rem' : '1.25rem',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: isMobile ? '2rem' : '2.5rem', marginBottom: '0.5rem' }}>🚨</div>
            <div style={{
              color: '#fbbf24',
              fontSize: isMobile ? '0.9rem' : '1.05rem',
              fontWeight: 900,
              marginBottom: '0.5rem',
            }}>
              القاعدة الذهبية:
            </div>
            <p style={{
              color: 'white',
              fontSize: isMobile ? '0.85rem' : '1rem',
              fontWeight: 700,
              margin: 0,
              lineHeight: '1.6',
            }}>
              الأولوية دائماً للي يسبق!<br />
              <span style={{ fontSize: isMobile ? '0.75rem' : '0.85rem', color: '#e9d5ff' }}>
                (سواء للإجابة أو لطلب استخدام بطاقة)
              </span>
            </p>
          </div>

          {/* ملاحظة الدليل */}
          <div style={{
            textAlign: 'center',
            color: '#c084fc',
            fontSize: isMobile ? '0.75rem' : '0.85rem',
            marginBottom: isMobile ? '1rem' : '1.25rem',
            padding: '0.75rem',
            background: 'rgba(168, 85, 247, 0.05)',
            borderRadius: '0.5rem',
            border: '1px dashed rgba(168, 85, 247, 0.3)',
          }}>
            💡 للتعمق في اللعبة أكثر ومعرفة تفاصيل البطاقات، اطلب من المقدم شرح القوانين
          </div>

          {/* Checkbox: لا تظهر مرة أخرى */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            marginBottom: isMobile ? '1rem' : '1.5rem',
            padding: isMobile ? '0.75rem' : '1rem',
            background: 'rgba(168, 85, 247, 0.1)',
            borderRadius: '0.75rem',
            border: '1px solid rgba(168, 85, 247, 0.2)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onClick={() => setDontShowAgain(!dontShowAgain)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(168, 85, 247, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(168, 85, 247, 0.1)';
          }}
          >
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              style={{
                width: isMobile ? '1.25rem' : '1.5rem',
                height: isMobile ? '1.25rem' : '1.5rem',
                cursor: 'pointer',
                accentColor: '#a855f7',
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <label style={{
              color: '#e9d5ff',
              fontSize: isMobile ? '0.875rem' : '1rem',
              cursor: 'pointer',
              userSelect: 'none',
            }}>
              لا تظهر هذه الرسالة مرة أخرى
            </label>
          </div>

          {/* زر ابدأ */}
          <button
            onClick={handleClose}
            style={{
              width: '100%',
              padding: isMobile ? '1rem' : '1.25rem',
              borderRadius: '1.25rem',
              background: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #a855f7 100%)',
              border: 'none',
              color: 'white',
              fontSize: isMobile ? '1.1rem' : '1.5rem',
              fontWeight: 900,
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 8px 25px rgba(249, 115, 22, 0.4)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 12px 35px rgba(249, 115, 22, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(249, 115, 22, 0.4)';
            }}
          >
            هيا نبدأ! 🚀
          </button>
        </div>
      </div>

      {/* CSS للأنيميشنز */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        /* Custom scrollbar */
        div::-webkit-scrollbar {
          width: 8px;
        }

        div::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
        }

        div::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.5);
          border-radius: 10px;
        }

        div::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.7);
        }
      `}</style>
    </div>
  );
};

// Hook للتحقق من عرض المودال
export const useWelcomeModal = () => {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const hideModal = localStorage.getItem('hideWelcomeModal');
    if (!hideModal) {
      setShouldShow(true);
    }
  }, []);

  return shouldShow;
};

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
            fontSize: isMobile ? '1.5rem' : '2.5rem',
            fontWeight: 900,
            textAlign: 'center',
            marginBottom: '0.5rem',
            background: 'linear-gradient(135deg, #f97316, #ec4899, #a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            مرحباً بك في حرب الحروف! 🎮
          </h2>

          <p style={{
            textAlign: 'center',
            color: '#e9d5ff',
            fontSize: isMobile ? '0.875rem' : '1.125rem',
            marginBottom: isMobile ? '1rem' : '2rem',
          }}>
            استعد لخوض أقوى معركة معلومات باللغة العربية!
          </p>

          {/* الخط الفاصل */}
          <div style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.5), transparent)',
            marginBottom: isMobile ? '1rem' : '2rem',
          }} />

          {/* شرح اللعبة */}
          <div style={{ marginBottom: isMobile ? '1rem' : '2rem' }}>
            <h3 style={{
              fontSize: isMobile ? '1.1rem' : '1.5rem',
              fontWeight: 900,
              color: 'white',
              marginBottom: isMobile ? '1rem' : '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <Target size={isMobile ? 20 : 24} color="#f97316" />
              فكرة اللعبة
            </h3>
            <p style={{
              color: '#e9d5ff',
              fontSize: isMobile ? '0.875rem' : '1rem',
              lineHeight: '1.8',
              marginBottom: isMobile ? '0.75rem' : '1rem',
            }}>
              لعبة استراتيجية بين فريقين (أخضر وأحمر). الهدف هو بناء <strong>جسر متصل</strong> من الحروف يربط جانبي الملعب!
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: isMobile ? '0.5rem' : '1rem',
            }}>
              <div style={{
                background: 'rgba(16, 185, 129, 0.15)',
                borderRadius: '0.75rem',
                padding: '1rem',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🟢</div>
                <strong style={{ color: '#10b981' }}>الأخضر</strong>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#e9d5ff' }}>جسر عمودي ↕️</p>
              </div>
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                borderRadius: '0.75rem',
                padding: '1rem',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🔴</div>
                <strong style={{ color: '#ef4444' }}>الأحمر</strong>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#e9d5ff' }}>جسر أفقي ↔️</p>
              </div>
            </div>
          </div>

          {/* البطاقات الإستراتيجية */}
          <div style={{ marginBottom: isMobile ? '1rem' : '2rem' }}>
            <h3 style={{
              fontSize: isMobile ? '1.1rem' : '1.5rem',
              fontWeight: 900,
              color: 'white',
              marginBottom: isMobile ? '1rem' : '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <Zap size={isMobile ? 20 : 24} color="#ec4899" />
              البطاقات الأربعة
            </h3>
            <div style={{
              background: 'rgba(236, 72, 153, 0.1)',
              borderRadius: '1rem',
              padding: isMobile ? '1rem' : '1.5rem',
              border: '1px solid rgba(236, 72, 153, 0.2)',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: isMobile ? '0.5rem' : '0.75rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: isMobile ? '1rem' : '1.25rem' }}>🧊</span>
                  <span style={{ color: '#e9d5ff', fontSize: isMobile ? '0.8rem' : '0.9rem' }}><strong>تجميد:</strong> جمّد خلية فارغة</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: isMobile ? '1rem' : '1.25rem' }}>💣</span>
                  <span style={{ color: '#e9d5ff', fontSize: isMobile ? '0.8rem' : '0.9rem' }}><strong>قنبلة:</strong> دمّر خلية الخصم</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: isMobile ? '1rem' : '1.25rem' }}>⚔️</span>
                  <span style={{ color: '#e9d5ff', fontSize: isMobile ? '0.8rem' : '0.9rem' }}><strong>معركة:</strong> تحدي لسرقة خلية</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: isMobile ? '1rem' : '1.25rem' }}>🛡️</span>
                  <span style={{ color: '#e9d5ff', fontSize: isMobile ? '0.8rem' : '0.9rem' }}><strong>درع:</strong> احمِ خليتك</span>
                </div>
              </div>
            </div>
          </div>

          {/* طرق الحصول على البطاقات */}
          <div style={{ marginBottom: isMobile ? '1rem' : '2rem' }}>
            <h3 style={{
              fontSize: isMobile ? '1.1rem' : '1.5rem',
              fontWeight: 900,
              color: 'white',
              marginBottom: isMobile ? '0.75rem' : '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              🎁 كيف تحصل على البطاقات؟
            </h3>
            <div style={{
              background: 'rgba(168, 85, 247, 0.1)',
              borderRadius: '1rem',
              padding: isMobile ? '1rem' : '1.25rem',
              border: '1px solid rgba(168, 85, 247, 0.2)',
            }}>
              <ul style={{
                color: '#e9d5ff',
                fontSize: isMobile ? '0.8rem' : '0.95rem',
                lineHeight: '2',
                paddingRight: isMobile ? '1.25rem' : '1.5rem',
                margin: 0,
              }}>
                <li>🃏 بعض الخلايا تحتوي على بطاقات مخفية</li>
                <li>✨ الحروف الذهبية تمنحك بطاقة</li>
                <li>🔥 3 إجابات صحيحة متتالية = بطاقة مكافأة</li>
              </ul>
            </div>
          </div>

          {/* نصيحة أخيرة */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(168, 85, 247, 0.1))',
            borderRadius: '1rem',
            padding: isMobile ? '1rem' : '1.5rem',
            border: '2px solid rgba(249, 115, 22, 0.3)',
            marginBottom: isMobile ? '1rem' : '2rem',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '0.75rem',
            }}>
              <Trophy size={isMobile ? 20 : 24} color="#fbbf24" />
              <h4 style={{
                fontSize: isMobile ? '1rem' : '1.25rem',
                fontWeight: 900,
                color: 'white',
                margin: 0,
              }}>
                قاعدة مهمة
              </h4>
            </div>
            <p style={{
              color: '#e9d5ff',
              fontSize: isMobile ? '0.875rem' : '1rem',
              lineHeight: '1.8',
              margin: 0,
            }}>
              الإجابة يجب أن تبدأ بنفس حرف الخلية المختارة! 📝
            </p>
          </div>

          {/* الخط الفاصل */}
          <div style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.5), transparent)',
            marginBottom: isMobile ? '1rem' : '2rem',
          }} />

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

// src/components/WelcomeModal.tsx
// مودال الترحيب وشرح اللعبة

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Target, Zap, Trophy } from 'lucide-react';

interface WelcomeModalProps {
  onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('hideWelcomeModal', 'true');
    }
    onClose();
  };

  const handleSkip = () => {
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
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        animation: 'fadeIn 0.3s ease',
      }}
      onClick={handleSkip}
    >
      {/* المودال */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '700px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '2rem',
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
            top: '1.5rem',
            right: '1.5rem',
            width: '2.5rem',
            height: '2.5rem',
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
        <div style={{ padding: '3rem 2.5rem' }}>
          
          {/* الأيقونة */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '2rem',
          }}>
            <div style={{
              width: '5rem',
              height: '5rem',
              borderRadius: '1.5rem',
              background: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 30px rgba(249, 115, 22, 0.4)',
              animation: 'float 3s ease-in-out infinite',
            }}>
              <Sparkles size={40} color="white" strokeWidth={2.5} />
            </div>
          </div>

          {/* العنوان */}
          <h2 style={{
            fontSize: '2.5rem',
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
            fontSize: '1.125rem',
            marginBottom: '2rem',
          }}>
            استعد لخوض أقوى معركة معلومات باللغة العربية!
          </p>

          {/* الخط الفاصل */}
          <div style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.5), transparent)',
            marginBottom: '2rem',
          }} />

          {/* شرح اللعبة */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: 900,
              color: 'white',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <Target size={24} color="#f97316" />
              فكرة اللعبة
            </h3>
            <p style={{
              color: '#e9d5ff',
              fontSize: '1rem',
              lineHeight: '1.8',
              marginBottom: '1rem',
            }}>
              لعبة استراتيجية بين فريقين (أخضر وأحمر). الهدف هو بناء <strong>جسر متصل</strong> من الحروف يربط جانبي الملعب!
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
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
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: 900,
              color: 'white',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <Zap size={24} color="#ec4899" />
              البطاقات الأربعة
            </h3>
            <div style={{
              background: 'rgba(236, 72, 153, 0.1)',
              borderRadius: '1rem',
              padding: '1.5rem',
              border: '1px solid rgba(236, 72, 153, 0.2)',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>🧊</span>
                  <span style={{ color: '#e9d5ff', fontSize: '0.9rem' }}><strong>تجميد:</strong> جمّد خلية فارغة</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>💣</span>
                  <span style={{ color: '#e9d5ff', fontSize: '0.9rem' }}><strong>قنبلة:</strong> دمّر خلية الخصم</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>⚔️</span>
                  <span style={{ color: '#e9d5ff', fontSize: '0.9rem' }}><strong>معركة:</strong> تحدي لسرقة خلية</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>🛡️</span>
                  <span style={{ color: '#e9d5ff', fontSize: '0.9rem' }}><strong>درع:</strong> احمِ خليتك</span>
                </div>
              </div>
            </div>
          </div>

          {/* طرق الحصول على البطاقات */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: 900,
              color: 'white',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              🎁 كيف تحصل على البطاقات؟
            </h3>
            <div style={{
              background: 'rgba(168, 85, 247, 0.1)',
              borderRadius: '1rem',
              padding: '1.25rem',
              border: '1px solid rgba(168, 85, 247, 0.2)',
            }}>
              <ul style={{
                color: '#e9d5ff',
                fontSize: '0.95rem',
                lineHeight: '2',
                paddingRight: '1.5rem',
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
            padding: '1.5rem',
            border: '2px solid rgba(249, 115, 22, 0.3)',
            marginBottom: '2rem',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '0.75rem',
            }}>
              <Trophy size={24} color="#fbbf24" />
              <h4 style={{
                fontSize: '1.25rem',
                fontWeight: 900,
                color: 'white',
                margin: 0,
              }}>
                قاعدة مهمة
              </h4>
            </div>
            <p style={{
              color: '#e9d5ff',
              fontSize: '1rem',
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
            marginBottom: '2rem',
          }} />

          {/* Checkbox عدم الإظهار */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
            marginBottom: '1.5rem',
            padding: '1rem',
            borderRadius: '1rem',
            background: 'rgba(255, 255, 255, 0.05)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
          }}
          >
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              style={{
                width: '1.25rem',
                height: '1.25rem',
                cursor: 'pointer',
                accentColor: '#a855f7',
              }}
            />
            <span style={{
              color: '#e9d5ff',
              fontSize: '1rem',
              fontWeight: 600,
            }}>
              لا تظهر هذه الرسالة مرة أخرى
            </span>
          </label>

          {/* زر ابدأ */}
          <button
            onClick={handleClose}
            style={{
              width: '100%',
              padding: '1.25rem',
              borderRadius: '1.25rem',
              background: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #a855f7 100%)',
              border: 'none',
              color: 'white',
              fontSize: '1.5rem',
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

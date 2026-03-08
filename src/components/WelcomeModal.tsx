// src/components/WelcomeModal.tsx
// مودال الترحيب وشرح اللعبة

import React, { useState, useEffect, useCallback } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useScreenSize } from '../hooks/useScreenSize';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

interface WelcomeModalProps {
  onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const { isMobile } = useScreenSize();
  const { theme } = useTheme();

  const rgba = useCallback((hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }, []);

  const a = theme.accent;
  const a2 = theme.accentSecondary;
  const tp = theme.textPrimary;
  const ts = theme.textSecondary;

  const handleClose = async () => {
    if (dontShowAgain) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const hideModalKey = `hideWelcomeModal_${user.id}`;
        localStorage.setItem(hideModalKey, 'true');
      }
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
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? '0' : '1rem',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(12px)',
        animation: 'welcomeFadeIn 0.3s ease',
      }}
      onClick={handleSkip}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: isMobile ? '100%' : '580px',
          width: '100%',
          maxHeight: isMobile ? 'min(96dvh, 96vh)' : '90vh',
          overflowY: 'auto',
          borderRadius: isMobile ? '1.5rem 1.5rem 0 0' : theme.borderRadius,
          background: theme.bgGradient,
          border: `1px solid ${rgba(a, 0.2)}`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.5)`,
          position: 'relative',
          paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : undefined,
        }}
      >
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.75rem', paddingBottom: '0.25rem' }}>
            <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.2)' }} />
          </div>
        )}

        {/* زر الإغلاق */}
        <button
          onClick={handleSkip}
          style={{
            position: 'absolute',
            top: isMobile ? '1rem' : '1.25rem',
            right: isMobile ? '1rem' : '1.25rem',
            width: '2rem',
            height: '2rem',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          }}
        >
          <X size={16} color="white" />
        </button>

        {/* المحتوى */}
        <div style={{ padding: isMobile ? '1.5rem 1.25rem' : '2.5rem 2rem' }}>

          {/* الأيقونة */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: isMobile ? '0.75rem' : '1.25rem',
          }}>
            <div style={{
              width: isMobile ? '3rem' : '4rem',
              height: isMobile ? '3rem' : '4rem',
              borderRadius: '1rem',
              background: `linear-gradient(135deg, ${a}, ${a2})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 16px ${rgba(a, 0.3)}`,
              animation: 'welcomeFloat 3s ease-in-out infinite',
            }}>
              <Sparkles size={isMobile ? 22 : 30} color="white" strokeWidth={2.5} />
            </div>
          </div>

          {/* العنوان */}
          <h2 style={{
            fontSize: isMobile ? '1.35rem' : '1.75rem',
            fontWeight: 800,
            textAlign: 'center',
            marginBottom: '0.5rem',
            color: tp,
            letterSpacing: '-0.01em',
          }}>
            أهلاً في حرب الحروف!
          </h2>

          <p style={{
            textAlign: 'center',
            color: ts,
            fontSize: isMobile ? '0.85rem' : '0.95rem',
            lineHeight: '1.7',
            marginBottom: isMobile ? '1.25rem' : '1.5rem',
          }}>
            مستوحاة من <strong style={{ color: a }}>"حروف مع عزيز"</strong> — بمقالب وحماس أكثر!
          </p>

          {/* الطورين */}
          <div style={{
            background: theme.panelBg,
            borderRadius: '0.875rem',
            padding: isMobile ? '1rem' : '1.25rem',
            border: `1px solid ${theme.panelBorder}`,
            marginBottom: isMobile ? '0.75rem' : '1rem',
          }}>
            <div style={{
              fontSize: isMobile ? '0.9rem' : '1rem',
              fontWeight: 700,
              color: tp,
              marginBottom: '0.75rem',
              textAlign: 'center',
            }}>
              طوران في اللعبة:
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}>
              {/* الطور الكلاسيكي */}
              <div style={{
                background: rgba(a2, 0.1),
                borderRadius: '0.625rem',
                padding: isMobile ? '0.625rem 0.75rem' : '0.75rem 1rem',
                border: `1px solid ${rgba(a2, 0.2)}`,
                display: 'flex',
                gap: '0.625rem',
                alignItems: 'flex-start',
              }}>
                <div style={{
                  minWidth: '1.75rem',
                  height: '1.75rem',
                  borderRadius: '0.5rem',
                  background: rgba(a2, 0.2),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: a2,
                  marginTop: '0.1rem',
                }}>1</div>
                <div>
                  <div style={{
                    color: a2,
                    fontSize: isMobile ? '0.8rem' : '0.88rem',
                    fontWeight: 700,
                    marginBottom: '0.15rem',
                  }}>
                    الطور الكلاسيكي
                  </div>
                  <p style={{
                    color: ts,
                    fontSize: isMobile ? '0.75rem' : '0.82rem',
                    margin: 0,
                    lineHeight: '1.5',
                  }}>
                    اسبق وجاوب صح — الحرف لك!
                  </p>
                </div>
              </div>

              {/* طور الأكشن كارد */}
              <div style={{
                background: rgba(a, 0.08),
                borderRadius: '0.625rem',
                padding: isMobile ? '0.625rem 0.75rem' : '0.75rem 1rem',
                border: `1px solid ${rgba(a, 0.15)}`,
                display: 'flex',
                gap: '0.625rem',
                alignItems: 'flex-start',
              }}>
                <div style={{
                  minWidth: '1.75rem',
                  height: '1.75rem',
                  borderRadius: '0.5rem',
                  background: rgba(a, 0.15),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: a,
                  marginTop: '0.1rem',
                }}>2</div>
                <div>
                  <div style={{
                    color: a,
                    fontSize: isMobile ? '0.8rem' : '0.88rem',
                    fontWeight: 700,
                    marginBottom: '0.15rem',
                  }}>
                    طور الأكشن كارد
                  </div>
                  <p style={{
                    color: ts,
                    fontSize: isMobile ? '0.75rem' : '0.82rem',
                    margin: 0,
                    lineHeight: '1.5',
                  }}>
                    استخدم البطاقات في الوقت الصح — خرّب خطة الخصم أو أنقذ فريقك!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* القاعدة الذهبية */}
          <div style={{
            background: 'rgba(251, 191, 36, 0.08)',
            borderRadius: '0.875rem',
            padding: isMobile ? '0.875rem' : '1rem',
            border: '1px solid rgba(251, 191, 36, 0.2)',
            marginBottom: isMobile ? '0.75rem' : '1rem',
            textAlign: 'center',
          }}>
            <div style={{
              color: '#fbbf24',
              fontSize: isMobile ? '0.85rem' : '0.95rem',
              fontWeight: 800,
              marginBottom: '0.35rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
            }}>
              <span style={{ fontSize: '1.1rem' }}>⚡</span>
              القاعدة الذهبية
            </div>
            <p style={{
              color: 'rgba(255,255,255,0.9)',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              fontWeight: 600,
              margin: 0,
              lineHeight: '1.5',
            }}>
              الأولوية دائماً للي يسبق!
              <span style={{ fontSize: isMobile ? '0.7rem' : '0.78rem', color: ts, display: 'block', marginTop: '0.2rem' }}>
                (للإجابة ولطلب البطاقة)
              </span>
            </p>
          </div>

          {/* ملاحظة */}
          <div style={{
            textAlign: 'center',
            color: ts,
            fontSize: isMobile ? '0.72rem' : '0.8rem',
            marginBottom: isMobile ? '0.875rem' : '1rem',
            padding: '0.5rem 0.75rem',
            background: theme.panelBg,
            borderRadius: '0.5rem',
            border: `1px dashed ${rgba(a, 0.15)}`,
          }}>
            اطلب من المقدم شرح القوانين بالتفصيل
          </div>

          {/* Checkbox */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.625rem',
            marginBottom: isMobile ? '0.875rem' : '1.25rem',
            padding: isMobile ? '0.625rem' : '0.75rem',
            background: theme.panelBg,
            borderRadius: '0.625rem',
            border: `1px solid ${theme.panelBorder}`,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onClick={() => setDontShowAgain(!dontShowAgain)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = rgba(a, 0.1);
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = theme.panelBg;
          }}
          >
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              style={{
                width: '1.125rem',
                height: '1.125rem',
                cursor: 'pointer',
                accentColor: a,
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <label style={{
              color: ts,
              fontSize: isMobile ? '0.8rem' : '0.88rem',
              cursor: 'pointer',
              userSelect: 'none',
            }}>
              لا تظهر مجدداً
            </label>
          </div>

          {/* زر ابدأ */}
          <button
            onClick={handleClose}
            style={{
              width: '100%',
              padding: isMobile ? '0.875rem' : '1rem',
              borderRadius: theme.borderRadius,
              background: `linear-gradient(135deg, ${a}, ${a2})`,
              border: 'none',
              color: 'white',
              fontSize: isMobile ? '1rem' : '1.2rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: theme.shadow,
              letterSpacing: '0.02em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.filter = 'brightness(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.filter = 'brightness(1)';
            }}
          >
            هيا نبدأ!
          </button>
        </div>
      </div>

      <style>{`
        @keyframes welcomeFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes welcomeFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
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

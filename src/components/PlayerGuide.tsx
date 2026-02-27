// src/components/PlayerGuide.tsx
// دليل اللاعبين - تصميم محسّن

import React, { useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useScreenSize } from '../hooks/useScreenSize';

interface PlayerGuideProps {
  onClose: () => void;
  onDontShowAgain?: () => void;
}

interface GuideStep {
  title: string;
  icon: string;
  content: React.ReactNode;
}

export const PlayerGuide: React.FC<PlayerGuideProps> = ({ onClose, onDontShowAgain }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShow, setDontShow] = useState(false);
  const { isMobile } = useScreenSize();

  const handleComplete = () => {
    if (dontShow && onDontShowAgain) {
      onDontShowAgain();
    }
    onClose();
  };

  const steps: GuideStep[] = [
    {
      title: 'شاشة اللاعبين',
      icon: '📺',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: isMobile ? '3.5rem' : '4.5rem', lineHeight: 1 }}>🎮</div>
          <p style={{ color: 'white', fontSize: isMobile ? '1.15rem' : '1.35rem', lineHeight: '2', margin: 0, fontWeight: 600 }}>
            شاشة العرض على <span style={{ color: '#fbbf24', fontWeight: 900 }}>التلفزيون أو الشاشة الكبيرة</span>
          </p>
          <div style={{
            background: 'rgba(168, 85, 247, 0.12)',
            borderRadius: '1rem',
            padding: isMobile ? '1rem' : '1.25rem',
            border: '2px solid rgba(168, 85, 247, 0.35)',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.6rem' : '0.75rem' }}>
              {[
                { text: 'شبكة الحروف', emoji: '🔤' },
                { text: 'النقاط والبطاقات', emoji: '📊' },
                { text: 'تأثيرات البطاقات والروليت', emoji: '🃏' },
                { text: 'إشعارات الأزرار', emoji: '📣' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: isMobile ? '1.5rem' : '1.75rem', lineHeight: 1 }}>{item.emoji}</span>
                  <span style={{ color: '#e9d5ff', fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: 600, textAlign: 'right' }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'مصادر البطاقات',
      icon: '🎁',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1.25rem' }}>
          {[
            { emoji: '🎲', color: '#34d399', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', name: 'الحرف العشوائي', desc: 'حرف عشوائي ببداية الجولة — الرابح يأخذ بطاقة' },
            { emoji: '🃏', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)', border: 'rgba(251, 191, 36, 0.3)', name: 'بطاقات مخفية', desc: 'خلايا تفتح روليت — الرابح يأخذ البطاقة' },
            { emoji: '✨', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', name: 'الحرف الذهبي', desc: 'حرف واحد ذهبي في كل جولة - يعطي بطاقة إضافية!' },
            { emoji: '🔥', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', name: 'مكافأة السلسلة', desc: '3 إجابات صحيحة متتالية لفريق واحد = بطاقة مكافأة مجانية!' },
          ].map((item, i) => (
            <div key={i} style={{
              background: item.bg,
              borderRadius: '1rem',
              padding: isMobile ? '1rem' : '1.25rem',
              border: `2px solid ${item.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: isMobile ? '2rem' : '2.25rem', lineHeight: 1 }}>{item.emoji}</span>
                <span style={{ color: item.color, fontWeight: 800, fontSize: isMobile ? '1.1rem' : '1.2rem' }}>{item.name}</span>
              </div>
              <p style={{ color: '#d4bfff', fontSize: isMobile ? '0.95rem' : '1.05rem', margin: 0, lineHeight: '1.7', paddingRight: isMobile ? '0' : '2.75rem' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'البطاقات',
      icon: '🃏',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.75rem' : '1rem' }}>
          {[
            { emoji: '🧊', color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)', name: 'تجميد', desc: 'تمنع الخصم من اختيارها لدورتين' },
            { emoji: '💣', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', name: 'قنبلة', desc: 'دمّر حرف الخصم — يرجع فارغاً' },
            { emoji: '⚔️', color: '#fb923c', bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.3)', name: 'معركة', desc: 'تحدٍّ على حرف الخصم — الرابح يأخذه' },
            { emoji: '🛡️', color: '#34d399', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', name: 'درع', desc: 'حصانة من القنبلة والمعركة لـ 5 أسئلة' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '0.75rem' : '1rem',
              background: item.bg,
              borderRadius: '1rem',
              padding: isMobile ? '0.85rem' : '1.1rem',
              border: `2px solid ${item.border}`,
            }}>
              <span style={{ fontSize: isMobile ? '2.25rem' : '2.75rem', lineHeight: 1 }}>{item.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: item.color, fontWeight: 800, fontSize: isMobile ? '1.05rem' : '1.15rem', marginBottom: '3px' }}>{item.name}</div>
                <div style={{ color: '#d4bfff', fontSize: isMobile ? '0.9rem' : '1rem', lineHeight: '1.5' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
  ];

  const totalSteps = steps.length;
  const step = steps[currentStep];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50000,
      padding: isMobile ? '0.75rem' : '2rem',
    }}>
      <div style={{
        maxWidth: isMobile ? '100%' : '620px',
        width: '100%',
        maxHeight: '92vh',
        background: 'linear-gradient(145deg, rgba(26, 11, 46, 0.95) 0%, rgba(45, 17, 84, 0.95) 50%, rgba(30, 9, 64, 0.95) 100%)',
        border: '3px solid rgba(168, 85, 247, 0.45)',
        borderRadius: isMobile ? '1.5rem' : '2rem',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 80px rgba(88, 28, 135, 0.5), 0 0 40px rgba(168, 85, 247, 0.15)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '1.25rem 1.5rem' : '1.75rem 2.25rem',
          borderBottom: '2px solid rgba(168, 85, 247, 0.15)',
          background: 'rgba(168, 85, 247, 0.05)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: isMobile ? '2rem' : '2.5rem' }}>{step.icon}</span>
            <h2 style={{
              fontSize: isMobile ? '1.35rem' : '1.6rem',
              fontWeight: 900,
              color: 'white',
              margin: 0,
              letterSpacing: '-0.02em',
            }}>
              {step.title}
            </h2>
          </div>
          <button
            onClick={handleComplete}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1.5px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '10px',
              padding: isMobile ? '0.45rem 0.85rem' : '0.5rem 1rem',
              cursor: 'pointer',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: isMobile ? '0.85rem' : '0.9rem',
              fontWeight: 700,
              transition: 'all 0.2s',
            }}
          >
            تخطي
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: isMobile ? '1.5rem' : '2.25rem',
          overflowY: 'auto',
          flex: 1,
        }}>
          {step.content}
        </div>

        {/* Footer */}
        <div style={{
          padding: isMobile ? '1.25rem 1.5rem' : '1.5rem 2.25rem',
          borderTop: '2px solid rgba(168, 85, 247, 0.15)',
          background: 'rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          flexShrink: 0,
        }}>
          {/* Progress */}
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
            {steps.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === currentStep ? '28px' : '10px',
                  height: '10px',
                  borderRadius: '5px',
                  background: i === currentStep
                    ? 'linear-gradient(135deg, #f97316, #ec4899)'
                    : i < currentStep
                      ? 'rgba(168, 85, 247, 0.6)'
                      : 'rgba(255, 255, 255, 0.12)',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>

          {/* Navigation */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}>
            <button
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              style={{
                padding: isMobile ? '0.75rem 1.25rem' : '0.85rem 1.75rem',
                borderRadius: '0.85rem',
                background: currentStep === 0 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.08)',
                border: '1.5px solid rgba(255, 255, 255, 0.1)',
                color: currentStep === 0 ? 'rgba(255, 255, 255, 0.2)' : 'white',
                fontSize: isMobile ? '0.95rem' : '1.05rem',
                fontWeight: 700,
                cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <ChevronRight size={18} />
              السابق
            </button>

            <span style={{
              color: 'rgba(255, 255, 255, 0.4)',
              fontSize: isMobile ? '0.85rem' : '0.95rem',
              fontWeight: 600,
            }}>
              {currentStep + 1} / {totalSteps}
            </span>

            {currentStep < totalSteps - 1 ? (
              <button
                onClick={() => setCurrentStep(prev => Math.min(totalSteps - 1, prev + 1))}
                style={{
                  padding: isMobile ? '0.75rem 1.25rem' : '0.85rem 1.75rem',
                  borderRadius: '0.85rem',
                  background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                  border: 'none',
                  color: 'white',
                  fontSize: isMobile ? '0.95rem' : '1.05rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 16px rgba(168, 85, 247, 0.35)',
                }}
              >
                التالي
                <ChevronLeft size={18} />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                style={{
                  padding: isMobile ? '0.75rem 1.25rem' : '0.85rem 1.75rem',
                  borderRadius: '0.85rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  color: 'white',
                  fontSize: isMobile ? '0.95rem' : '1.05rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
                }}
              >
                فهمت! ✅
              </button>
            )}
          </div>

          {/* Don't show again */}
          {onDontShowAgain && (
            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              cursor: 'pointer',
              color: 'rgba(255, 255, 255, 0.4)',
              fontSize: isMobile ? '0.85rem' : '0.9rem',
            }}>
              <input
                type="checkbox"
                checked={dontShow}
                onChange={(e) => setDontShow(e.target.checked)}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
              لا تظهر مجدداً
            </label>
          )}
        </div>
      </div>
    </div>
  );
};

// src/components/BuzzerGuide.tsx
// دليل شاشة Answer Buzzers - مصمم للجوالات

import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';

interface BuzzerGuideProps {
  onClose: () => void;
  onDontShowAgain?: () => void;
}

interface GuideStep {
  title: string;
  icon: string;
  content: React.ReactNode;
}

export const BuzzerGuide: React.FC<BuzzerGuideProps> = ({ onClose, onDontShowAgain }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShow, setDontShow] = useState(false);

  const handleComplete = () => {
    if (dontShow && onDontShowAgain) {
      onDontShowAgain();
    }
    onClose();
  };

  const steps: GuideStep[] = [
    {
      title: 'كيف تشتغل الأزرار؟',
      icon: '📣',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ textAlign: 'center', fontSize: '3rem', lineHeight: 1 }}>⚡</div>
          <p style={{ color: 'white', fontSize: '1.1rem', lineHeight: '2', margin: 0, fontWeight: 600, textAlign: 'center' }}>
            هذي شاشتك الخاصة عشان
            <br /><span style={{ color: '#fbbf24', fontWeight: 900 }}>تنافس على الإجابة!</span>
          </p>

          <div style={{
            background: 'rgba(245, 158, 11, 0.12)',
            borderRadius: '1rem',
            padding: '1rem',
            border: '2px solid rgba(245, 158, 11, 0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '2rem', lineHeight: 1 }}>📣</span>
              <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: '1.1rem' }}>زر "إجابة"</span>
            </div>
            <p style={{ color: '#d4bfff', fontSize: '1rem', margin: 0, lineHeight: '1.7' }}>
              لما تعرف الإجابة، اضغط بسرعة! أول واحد يضغط اسمه يطلع على الشاشة الكبيرة ويجاوب
            </p>
          </div>

          <div style={{
            background: 'rgba(168, 85, 247, 0.12)',
            borderRadius: '1rem',
            padding: '1rem',
            border: '2px solid rgba(168, 85, 247, 0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '2rem', lineHeight: 1 }}>🎴</span>
              <span style={{ color: '#c084fc', fontWeight: 800, fontSize: '1.1rem' }}>زر "طلب بطاقة"</span>
            </div>
            <p style={{ color: '#d4bfff', fontSize: '1rem', margin: 0, lineHeight: '1.7' }}>
              لما تبي تستخدم بطاقة من بطاقاتك، اضغط هنا عشان المقدم يعرف
            </p>
          </div>

          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '0.75rem',
            padding: '0.85rem',
            border: '1.5px solid rgba(239, 68, 68, 0.25)',
            textAlign: 'center',
          }}>
            <p style={{ color: '#fca5a5', fontSize: '0.95rem', margin: 0, fontWeight: 600 }}>
              ⚡ السرعة هي المفتاح! أول من يضغط هو من يظهر اسمه
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'سير اللعبة',
      icon: '🎯',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { num: '1', color: '#34d399', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', emoji: '🎲', title: 'الحرف العشوائي', desc: 'بداية كل جولة، يُختار حرف عشوائي - اللي يجاوب عليه صح ياخذ بطاقة مكافأة!' },
            { num: '2', color: '#c084fc', bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.3)', emoji: '🔤', title: 'المقدم يختار حرف', desc: 'المقدم يختار حرف من الشبكة ويقرأ السؤال - جاوب بأسرع وقت!' },
            { num: '3', color: '#fb923c', bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.3)', emoji: '📣', title: 'اضغط الزر!', desc: 'لما تعرف الإجابة اضغط زر "إجابة" بسرعة - أول واحد يضغط يجاوب' },
            { num: '4', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)', border: 'rgba(251, 191, 36, 0.3)', emoji: '✅', title: 'الفريق الفائز', desc: 'اللي يجاوب صح ياخذ الحرف لفريقه - والهدف تسيطر على الشبكة!' },
          ].map((item, i) => (
            <div key={i} style={{
              background: item.bg,
              borderRadius: '1rem',
              padding: '1rem',
              border: `2px solid ${item.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                <div style={{
                  width: '30px', height: '30px', borderRadius: '50%',
                  background: `${item.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.9rem', fontWeight: 900, color: item.color, flexShrink: 0,
                }}>{item.num}</div>
                <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{item.emoji}</span>
                <span style={{ color: item.color, fontWeight: 800, fontSize: '1.05rem' }}>{item.title}</span>
              </div>
              <p style={{ color: '#d4bfff', fontSize: '0.95rem', margin: 0, lineHeight: '1.7', paddingRight: '2.5rem' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'بطاقات الأكشن',
      icon: '🃏',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <p style={{ color: '#d4bfff', fontSize: '1rem', margin: 0, lineHeight: '1.7', textAlign: 'center' }}>
            كل بطاقة لها تأثير خاص على اللعبة
          </p>
          {[
            { emoji: '🧊', color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)', name: 'تجميد', desc: 'جمّد خلية فارغة لدورتين' },
            { emoji: '💣', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', name: 'قنبلة', desc: 'دمّر حرف الخصم - يرجع فارغ!' },
            { emoji: '⚔️', color: '#fb923c', bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.3)', name: 'معركة', desc: 'تحدّي على حرف الخصم!' },
            { emoji: '🛡️', color: '#34d399', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', name: 'درع', desc: 'احمِ حرفك لـ 5 أسئلة' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              background: item.bg, borderRadius: '1rem',
              padding: '0.85rem', border: `2px solid ${item.border}`,
            }}>
              <span style={{ fontSize: '2.25rem', lineHeight: 1 }}>{item.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: item.color, fontWeight: 800, fontSize: '1.05rem', marginBottom: '2px' }}>{item.name}</div>
                <div style={{ color: '#d4bfff', fontSize: '0.9rem', lineHeight: '1.5' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'طرق الحصول على بطاقات',
      icon: '🎁',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { emoji: '🎲', color: '#34d399', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', name: 'الحرف العشوائي', desc: 'بداية كل جولة يُختار حرف عشوائي - اللي يجاوب صح ياخذ بطاقة!' },
            { emoji: '🃏', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)', border: 'rgba(251, 191, 36, 0.3)', name: 'بطاقات مخفية', desc: 'بعض الخلايا فيها بطاقات مخفية - الفريق اللي يجاوب صح ياخذها!' },
            { emoji: '✨', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', name: 'الحرف الذهبي', desc: 'حرف واحد ذهبي في كل جولة يعطي بطاقة إضافية!' },
            { emoji: '🔥', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', name: 'مكافأة السلسلة', desc: '3 إجابات صحيحة متتالية = بطاقة مجانية!' },
          ].map((item, i) => (
            <div key={i} style={{
              background: item.bg, borderRadius: '1rem',
              padding: '1rem', border: `2px solid ${item.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '1.75rem', lineHeight: 1 }}>{item.emoji}</span>
                <span style={{ color: item.color, fontWeight: 800, fontSize: '1.05rem' }}>{item.name}</span>
              </div>
              <p style={{ color: '#d4bfff', fontSize: '0.95rem', margin: 0, lineHeight: '1.7' }}>{item.desc}</p>
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
      padding: '0.5rem',
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        maxHeight: '94vh',
        background: 'linear-gradient(145deg, rgba(26, 11, 46, 0.95) 0%, rgba(45, 17, 84, 0.95) 50%, rgba(30, 9, 64, 0.95) 100%)',
        border: '3px solid rgba(168, 85, 247, 0.45)',
        borderRadius: '1.5rem',
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
          padding: '1.15rem 1.25rem',
          borderBottom: '2px solid rgba(168, 85, 247, 0.15)',
          background: 'rgba(168, 85, 247, 0.05)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.75rem' }}>{step.icon}</span>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: 900,
              color: 'white',
              margin: 0,
            }}>
              {step.title}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={handleComplete}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1.5px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '10px',
                padding: '0.45rem 0.85rem',
                cursor: 'pointer',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.85rem',
                fontWeight: 700,
                transition: 'all 0.2s',
              }}
            >
              تخطي
            </button>
            <button
              onClick={handleComplete}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1.5px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '10px',
                padding: '0.5rem',
                cursor: 'pointer',
                color: 'rgba(255, 255, 255, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{
          padding: '1.25rem',
          overflowY: 'auto',
          flex: 1,
        }}>
          {step.content}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.25rem',
          borderTop: '2px solid rgba(168, 85, 247, 0.15)',
          background: 'rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
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
            gap: '0.75rem',
          }}>
            <button
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              style={{
                padding: '0.7rem 1.15rem',
                borderRadius: '0.85rem',
                background: currentStep === 0 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.08)',
                border: '1.5px solid rgba(255, 255, 255, 0.1)',
                color: currentStep === 0 ? 'rgba(255, 255, 255, 0.2)' : 'white',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <ChevronRight size={16} />
              السابق
            </button>

            <span style={{
              color: 'rgba(255, 255, 255, 0.4)',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}>
              {currentStep + 1} / {totalSteps}
            </span>

            {currentStep < totalSteps - 1 ? (
              <button
                onClick={() => setCurrentStep(prev => Math.min(totalSteps - 1, prev + 1))}
                style={{
                  padding: '0.7rem 1.15rem',
                  borderRadius: '0.85rem',
                  background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                  border: 'none',
                  color: 'white',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 4px 16px rgba(168, 85, 247, 0.35)',
                }}
              >
                التالي
                <ChevronLeft size={16} />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                style={{
                  padding: '0.7rem 1.15rem',
                  borderRadius: '0.85rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  color: 'white',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
                }}
              >
                يلّا نلعب! 🚀
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
              fontSize: '0.85rem',
            }}>
              <input
                type="checkbox"
                checked={dontShow}
                onChange={(e) => setDontShow(e.target.checked)}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
              لا تظهر هذا الشرح مرة أخرى
            </label>
          )}
        </div>
      </div>
    </div>
  );
};

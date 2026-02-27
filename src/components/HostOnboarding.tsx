// src/components/HostOnboarding.tsx
// شاشات التعليم التفاعلية للمقدم - تصميم محسّن

import React, { useState } from 'react';
import {
  RefreshCw, Maximize, Pause, Dices, Palette,
  Tv, Zap, Sparkles, ChevronRight, ChevronLeft
} from 'lucide-react';
import { useScreenSize } from '../hooks/useScreenSize';

interface HostOnboardingProps {
  onComplete: () => void;
  onDontShowAgain: () => void;
}

interface TutorialStep {
  title: string;
  icon: string;
  content: React.ReactNode;
}

export const HostOnboarding: React.FC<HostOnboardingProps> = ({ onComplete, onDontShowAgain }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShow, setDontShow] = useState(false);
  const { isMobile } = useScreenSize();

  // أحجام محسّنة
  const iconSize = isMobile ? 22 : 26;
  const btnStyle = (color: string): React.CSSProperties => ({
    width: isMobile ? '48px' : '56px',
    height: isMobile ? '48px' : '56px',
    borderRadius: '14px',
    background: `${color}25`,
    border: `2.5px solid ${color}55`,
    color: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: `0 2px 8px ${color}15`,
  });

  const cardBox = (color: string, borderColor: string): React.CSSProperties => ({
    background: `${color}`,
    borderRadius: '1rem',
    padding: isMobile ? '1rem' : '1.25rem',
    border: `2px solid ${borderColor}`,
  });

  const steps: TutorialStep[] = [
    {
      title: 'شاشة المقدم 🎮',
      icon: '👋',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: isMobile ? '3.5rem' : '4.5rem', lineHeight: 1 }}>🎮</div>
          <p style={{ color: 'white', fontSize: isMobile ? '1.15rem' : '1.35rem', lineHeight: '2', margin: 0, fontWeight: 600 }}>
            أنت <span style={{ color: '#fbbf24', fontWeight: 900 }}>المتحكم الكامل</span> باللعبة
          </p>
          <div style={cardBox('rgba(168, 85, 247, 0.12)', 'rgba(168, 85, 247, 0.35)')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.6rem' : '0.75rem' }}>
              {[
                { num: '1', text: 'افتح شاشة اللاعبين على شاشة كبيرة', emoji: '📺' },
                { num: '2', text: 'اختر الحروف واقرأ الأسئلة', emoji: '🎤' },
                { num: '3', text: 'حدد الفريق الفائز بكل سؤال', emoji: '✅' },
                { num: '4', text: 'أدر البطاقات والمفاجآت!', emoji: '🃏' },
              ].map((item) => (
                <div key={item.num} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: isMobile ? '32px' : '36px',
                    height: isMobile ? '32px' : '36px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isMobile ? '0.85rem' : '0.95rem',
                    fontWeight: 900,
                    color: 'white',
                    flexShrink: 0,
                  }}>{item.num}</div>
                  <span style={{ color: '#e9d5ff', fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: 600 }}>
                    {item.text} {item.emoji}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'سير اللعبة',
      icon: '🎯',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1.25rem' }}>
          {[
            { color: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.35)', titleColor: '#34d399', title: 'ابدأ الجولة ▶️', desc: 'اضغط "ابدأ الجولة" — يبدأ الحرف العشوائي (إن مُفعَّل)' },
            { color: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.35)', titleColor: '#c084fc', title: 'اختر حرف 🔤', desc: 'اضغط خلية — يظهر السؤال والإجابة' },
            { color: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.35)', titleColor: '#fb923c', title: 'حدد الفائز ✅', desc: 'اضغط اسم الفريق الرابح — الحرف يصير له' },
          ].map((item, i) => (
            <div key={i} style={cardBox(item.color, item.border)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{
                  width: isMobile ? '32px' : '36px',
                  height: isMobile ? '32px' : '36px',
                  borderRadius: '50%',
                  background: `${item.titleColor}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? '1rem' : '1.1rem',
                  fontWeight: 900,
                  color: item.titleColor,
                  flexShrink: 0,
                }}>{i + 1}</div>
                <span style={{ color: item.titleColor, fontWeight: 800, fontSize: isMobile ? '1.05rem' : '1.15rem' }}>{item.title}</span>
              </div>
              <p style={{ color: '#e9d5ff', fontSize: isMobile ? '0.95rem' : '1.05rem', margin: 0, lineHeight: '1.8', paddingRight: isMobile ? '0' : '2.75rem' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'أزرار التحكم',
      icon: '🎛️',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.75rem' : '1rem' }}>
          {[
            { color: '#ef4444', icon: <RefreshCw size={iconSize} />, name: 'إعادة الجولة', desc: 'يعيد الجولة من البداية ويحذف البطاقات' },
            { color: '#3b82f6', icon: <Maximize size={iconSize} />, name: 'ملء الشاشة', desc: 'يكبّر الشاشة (مناسب للعرض)' },
            { color: '#8b5cf6', icon: <Pause size={iconSize} />, name: 'إيقاف مؤقت', desc: 'يوقف اللعبة مؤقتاً (استراحة)' },
            { color: '#ec4899', icon: <Dices size={iconSize} />, name: 'حرف عشوائي', desc: 'يختار حرف عشوائي من المتبقي' },
            { color: '#a855f7', icon: <Palette size={iconSize} />, name: 'عكس الألوان', desc: 'يعكس اتجاه الجسر بين الفريقين' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '0.75rem' : '1rem',
              background: `${item.color}0a`,
              borderRadius: '1rem',
              padding: isMobile ? '0.75rem' : '1rem',
              border: `1.5px solid ${item.color}25`,
            }}>
              <div style={btnStyle(item.color)}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: item.color, fontWeight: 800, fontSize: isMobile ? '1rem' : '1.1rem', marginBottom: '2px' }}>{item.name}</div>
                <div style={{ color: '#d4bfff', fontSize: isMobile ? '0.85rem' : '0.95rem', lineHeight: '1.5' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'أزرار الشاشات',
      icon: '🔧',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.75rem' : '1rem' }}>
          {[
            { color: '#14b8a6', icon: <Tv size={iconSize} />, name: 'شاشة اللاعبين', desc: 'تاب جديد أو QR لجهاز آخر' },
            { color: '#f59e0b', icon: <Zap size={iconSize} />, name: 'Answer Buzzers', desc: 'QR يربط جوالات اللاعبين للإجابة' },
            { color: '#f97316', icon: <Sparkles size={iconSize} />, name: 'البطاقات', desc: 'لوحة استخدام البطاقات' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '0.75rem' : '1rem',
              background: `${item.color}0a`,
              borderRadius: '1rem',
              padding: isMobile ? '0.75rem' : '1rem',
              border: `1.5px solid ${item.color}25`,
            }}>
              <div style={btnStyle(item.color)}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: item.color, fontWeight: 800, fontSize: isMobile ? '1rem' : '1.1rem', marginBottom: '2px' }}>{item.name}</div>
                <div style={{ color: '#d4bfff', fontSize: isMobile ? '0.85rem' : '0.95rem', lineHeight: '1.5' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'ربط شاشة العرض',
      icon: '📺',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1.25rem' }}>
          <p style={{ color: '#d4bfff', fontSize: isMobile ? '0.95rem' : '1.1rem', margin: 0, lineHeight: '1.8', textAlign: 'center' }}>
            اضغط على زر <span style={{ color: '#14b8a6', fontWeight: 800 }}>شاشة اللاعبين</span> وستظهر لك ثلاث طرق:
          </p>

          {/* طريقة 1: نفس الجهاز */}
          <div style={cardBox('rgba(16, 185, 129, 0.12)', 'rgba(16, 185, 129, 0.35)')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: isMobile ? '1.75rem' : '2rem', lineHeight: 1 }}>💻</span>
              <span style={{ color: '#34d399', fontWeight: 800, fontSize: isMobile ? '1.05rem' : '1.15rem' }}>من نفس الجهاز</span>
            </div>
            <p style={{ color: '#d4bfff', fontSize: isMobile ? '0.9rem' : '1rem', margin: 0, lineHeight: '1.7' }}>
              تفتح في تاب جديد — مناسب للبروجكتر أو شاشتين
            </p>
          </div>

          {/* طريقة 2: جهاز ثاني بالباركود */}
          <div style={cardBox('rgba(168, 85, 247, 0.12)', 'rgba(168, 85, 247, 0.35)')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: isMobile ? '1.75rem' : '2rem', lineHeight: 1 }}>📱</span>
              <span style={{ color: '#c084fc', fontWeight: 800, fontSize: isMobile ? '1.05rem' : '1.15rem' }}>بالباركود (QR)</span>
            </div>
            <p style={{ color: '#d4bfff', fontSize: isMobile ? '0.9rem' : '1rem', margin: 0, lineHeight: '1.7' }}>
              امسح QR من أي جهاز — تتزامن تلقائياً
            </p>
          </div>

          {/* طريقة 3: نسخ الرابط */}
          <div style={cardBox('rgba(99, 102, 241, 0.12)', 'rgba(99, 102, 241, 0.35)')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: isMobile ? '1.75rem' : '2rem', lineHeight: 1 }}>🔗</span>
              <span style={{ color: '#818cf8', fontWeight: 800, fontSize: isMobile ? '1.05rem' : '1.15rem' }}>نسخ الرابط أو مشاركة</span>
            </div>
            <p style={{ color: '#d4bfff', fontSize: isMobile ? '0.9rem' : '1rem', margin: 0, lineHeight: '1.7' }}>
              أرسل الرابط بالواتساب — يتزامن لحظياً
            </p>
          </div>

          {/* نصيحة */}
          <div style={{
            background: 'rgba(251, 191, 36, 0.1)',
            border: '2px solid rgba(251, 191, 36, 0.3)',
            borderRadius: '1rem',
            padding: isMobile ? '0.85rem' : '1rem',
            textAlign: 'center',
          }}>
            <p style={{ color: '#fbbf24', fontSize: isMobile ? '0.9rem' : '1rem', margin: 0, lineHeight: '1.8', fontWeight: 700 }}>
              💡 لا يشترط تسجيل دخول في الجهاز الثاني
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'البطاقات',
      icon: '🃏',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.75rem' : '1rem' }}>
          <p style={{ color: '#d4bfff', fontSize: isMobile ? '0.95rem' : '1.1rem', margin: 0, lineHeight: '1.7', textAlign: 'center' }}>
            البطاقات تظهر عشوائياً في الخلايا أو كمكافأة للسلسلة
          </p>
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
      title: 'جاهز للبدء!',
      icon: '🚀',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center', alignItems: 'center' }}>
          <div style={{ fontSize: isMobile ? '5rem' : '6rem', lineHeight: 1 }}>🎮</div>
          <p style={{ color: 'white', fontSize: isMobile ? '1.25rem' : '1.5rem', margin: 0, lineHeight: '1.8', fontWeight: 700 }}>
            أنت جاهز لإدارة المعركة!
          </p>
          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            borderRadius: '1.25rem',
            padding: isMobile ? '1.25rem' : '1.5rem',
            border: '2px solid rgba(16, 185, 129, 0.35)',
            width: '100%',
          }}>
            <p style={{ color: '#34d399', fontSize: isMobile ? '1.05rem' : '1.15rem', margin: 0, lineHeight: '1.8', fontWeight: 700 }}>
              💡 افتح شاشة اللاعبين على شاشة كبيرة وأدِر اللعبة من جهازك
            </p>
          </div>
        </div>
      ),
    },
  ];

  const totalSteps = steps.length;
  const step = steps[currentStep];

  const handleComplete = () => {
    if (dontShow) {
      onDontShowAgain();
    }
    onComplete();
  };

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
        maxWidth: isMobile ? '100%' : '660px',
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
                يلّا نبدأ! 🚀
              </button>
            )}
          </div>

          {/* Don't show again */}
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
        </div>
      </div>
    </div>
  );
};

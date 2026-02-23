// src/components/CardTeaserOverlay.tsx
// شاشة التشويق قبل كشف البطاقة

import React, { useState, useEffect } from 'react';
import { useScreenSize } from '../hooks/useScreenSize';

interface CardTeaserOverlayProps {
  letter: string;
  isGolden: boolean;
  isHost: boolean;       // المقدم = زر "اكشف", الجمهور = شاشة انتظار
  onReveal?: () => void; // فقط للمقدم
}

// ثوابت الجسيمات لتجنب إعادة الحساب عند كل render
const PARTICLES = [...Array(18)].map((_, i) => ({
  id: i,
  size: 4 + (i * 7) % 8,
  left: (i * 17 + 5) % 100,
  top: (i * 23 + 10) % 100,
  dur: 2 + (i * 3) % 2,
  delay: (i * 4) % 20 / 10,
}));

export const CardTeaserOverlay: React.FC<CardTeaserOverlayProps> = ({
  letter,
  isGolden,
  isHost,
  onReveal,
}) => {
  const { isMobile, isTablet } = useScreenSize();
  const isSmall = isMobile || isTablet;
  const [dotStep, setDotStep] = useState(0);
  const [buttonHovered, setButtonHovered] = useState(false);

  // ثلاث نقاط متدرجة للمشاهدين
  useEffect(() => {
    if (!isHost) {
      const timer = setInterval(() => {
        setDotStep(prev => (prev + 1) % 4);
      }, 450);
      return () => clearInterval(timer);
    }
  }, [isHost]);

  const accentColor = isGolden ? '#fbbf24' : '#ec4899';
  const accentDim   = isGolden ? '#92400e' : '#7c1d5a';
  const bgGradient  = isGolden
    ? 'linear-gradient(160deg, #0f0800 0%, #2a1800 40%, #1c1000 100%)'
    : 'linear-gradient(160deg, #0d0118 0%, #280a4a 40%, #1a0533 100%)';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: bgGradient,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2400,
      gap: isSmall ? '1.1rem' : '1.5rem',
      overflow: 'hidden',
      direction: 'rtl',
    }}>

      {/* توهج خلفي */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse at 50% 42%, ${accentColor}20 0%, transparent 60%)`,
        animation: 'teaserGlow 2s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* شعاع علوي */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '2px',
        height: '45%',
        background: `linear-gradient(to bottom, transparent, ${accentColor}60, transparent)`,
        animation: 'teaserBeam 2.4s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* جسيمات */}
      {PARTICLES.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          width: `${p.size}px`,
          height: `${p.size}px`,
          borderRadius: '50%',
          background: accentColor,
          left: `${p.left}%`,
          top: `${p.top}%`,
          opacity: 0.35,
          animation: `teaserFloat ${p.dur}s ease-in-out infinite`,
          animationDelay: `${p.delay}s`,
          pointerEvents: 'none',
        }} />
      ))}

      {/* ===== الأيقونة + الحرف ===== */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        animation: 'teaserBounce 2.4s ease-in-out infinite',
      }}>
        <div style={{
          fontSize: isSmall ? '5.5rem' : '8.5rem',
          lineHeight: 1,
          filter: `drop-shadow(0 0 28px ${accentColor}) drop-shadow(0 0 10px ${accentColor}90)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'teaserIconSway 3.2s ease-in-out infinite',
        }}>
          {isGolden ? '✨' : '🎴'}
        </div>

        {/* دائرة الحرف */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: isSmall ? '68px' : '90px',
          height: isSmall ? '68px' : '90px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${accentColor}, ${accentDim})`,
          border: `4px solid rgba(255,255,255,0.9)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: isSmall ? '1.9rem' : '2.6rem',
          fontWeight: 900,
          color: 'white',
          boxShadow: `0 0 0 10px ${accentColor}25, 0 10px 35px rgba(0,0,0,0.5)`,
          animation: 'teaserLetterPop 1.4s ease-in-out infinite',
        }}>
          {letter}
        </div>
      </div>

      {/* ===== النصوص ===== */}
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1, padding: '0 1.5rem' }}>
        <h1 style={{
          fontSize: isSmall ? '1.5rem' : '2.2rem',
          fontWeight: 900,
          color: 'white',
          margin: '0 0 0.4rem 0',
          textShadow: `0 0 30px ${accentColor}80`,
          animation: 'teaserTitleIn 0.5s ease-out',
          letterSpacing: '0.02em',
        }}>
          {isGolden ? '✨ اكتُشف الحرف الذهبي!' : '🎴 بطاقة مخفية اكتُشفت!'}
        </h1>
        <p style={{
          fontSize: isSmall ? '0.95rem' : '1.25rem',
          color: 'rgba(255,255,255,0.75)',
          margin: 0,
          fontWeight: 700,
          lineHeight: 1.6,
          maxWidth: isSmall ? '280px' : '420px',
        }}>
          {isHost
            ? (isGolden
              ? `حرف "${letter}" يخفي مفاجأة ذهبية — اكشف البطاقة التي ستتنافس الفرق عليها!`
              : `حرف "${letter}" يخفي بطاقة — اكشف البطاقة التي ستتنافس الفرق عليها!`)
            : (isGolden
              ? `حرف "${letter}" ذهبي! الفرقان ستتنافسان على بطاقة نادرة`
              : `حرف "${letter}" يخفي بطاقة قوية! الفرقان ستتنافسان عليها`)}
        </p>
      </div>

      {/* ===== زر الكشف (المقدم فقط) ===== */}
      {isHost && onReveal && (
        <button
          onClick={onReveal}
          onMouseEnter={() => setButtonHovered(true)}
          onMouseLeave={() => setButtonHovered(false)}
          style={{
            position: 'relative',
            zIndex: 1,
            padding: isSmall ? '1rem 2.25rem' : '1.25rem 3.5rem',
            background: `linear-gradient(135deg, ${accentColor}, ${accentDim}dd)`,
            border: '3px solid rgba(255,255,255,0.55)',
            borderRadius: '2rem',
            color: 'white',
            fontSize: isSmall ? '1.15rem' : '1.5rem',
            fontWeight: 900,
            cursor: 'pointer',
            boxShadow: buttonHovered
              ? `0 0 55px ${accentColor}99, 0 18px 55px rgba(0,0,0,0.55)`
              : `0 0 32px ${accentColor}55, 0 12px 40px rgba(0,0,0,0.4)`,
            transform: buttonHovered ? 'scale(1.07) translateY(-4px)' : 'scale(1)',
            transition: 'all 0.2s ease',
            animation: buttonHovered ? 'none' : 'teaserButtonPulse 1.2s ease-in-out infinite',
          }}
        >
          🎲 اكشف البطاقة الآن!
        </button>
      )}

      {/* ===== قسم الانتظار (المشاهدون فقط) ===== */}
      {!isHost && (
        <div style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: isSmall ? '0.85rem' : '1.1rem',
          animation: 'teaserTitleIn 0.6s ease-out',
        }}>

          {/* شارة "انتظروا" */}
          <div style={{
            padding: isSmall ? '0.45rem 1.2rem' : '0.55rem 1.6rem',
            background: `${accentColor}22`,
            border: `1.5px solid ${accentColor}55`,
            borderRadius: '2rem',
            color: accentColor,
            fontSize: isSmall ? '0.82rem' : '0.95rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            {isGolden ? '⭐ لحظة ذهبية' : '🔥 لحظة الكشف'}
          </div>

          {/* نص الانتظار */}
          <p style={{
            margin: 0,
            color: 'rgba(255,255,255,0.9)',
            fontSize: isSmall ? '1.15rem' : '1.45rem',
            fontWeight: 900,
            textAlign: 'center',
            textShadow: `0 0 20px ${accentColor}60`,
          }}>
            المقدم يكشف البطاقة
          </p>

          {/* ثلاث نقاط متحركة */}
          <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'center' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: isSmall ? '12px' : '16px',
                height: isSmall ? '12px' : '16px',
                borderRadius: '50%',
                background: accentColor,
                opacity: dotStep > i ? 1 : 0.25,
                transform: dotStep === i ? 'scale(1.4)' : 'scale(1)',
                transition: 'all 0.3s ease',
                boxShadow: dotStep > i ? `0 0 10px ${accentColor}` : 'none',
              }} />
            ))}
          </div>

          {/* شريط التحميل النابض */}
          <div style={{
            width: isSmall ? '160px' : '220px',
            height: '4px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '2px',
            overflow: 'hidden',
            marginTop: '0.2rem',
          }}>
            <div style={{
              height: '100%',
              background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
              animation: 'teaserBar 1.8s ease-in-out infinite',
              borderRadius: '2px',
            }} />
          </div>

        </div>
      )}

      <style>{`
        @keyframes teaserGlow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes teaserBeam {
          0%, 100% { opacity: 0.2; transform: translateX(-50%) scaleY(1); }
          50% { opacity: 0.8; transform: translateX(-50%) scaleY(1.1); }
        }
        @keyframes teaserFloat {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.35; }
          50% { transform: translateY(-18px) scale(1.25); opacity: 0.75; }
        }
        @keyframes teaserBounce {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-16px) rotate(2deg); }
        }
        @keyframes teaserIconSway {
          0%, 100% { transform: rotate(-7deg) scale(1); }
          50% { transform: rotate(7deg) scale(1.06); }
        }
        @keyframes teaserLetterPop {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.12); }
        }
        @keyframes teaserTitleIn {
          from { opacity: 0; transform: translateY(-14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes teaserButtonPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes teaserBar {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
};

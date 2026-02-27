// src/components/CardAnimation.tsx
// أنيميشن البطاقات الأربعة

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CardType } from '../core/types';
import { useScreenSize } from '../hooks/useScreenSize';

// ثوابت الجسيمات — خارج المكوّن لتجنب إعادة الحساب
const PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  left: (i * 13 + 5) % 100,
  top:  (i * 17 + 10) % 100,
  dur:  2.5 + (i % 3) * 0.5,
  delay: (i * 0.25) % 1.5,
}));

interface CardAnimationProps {
  type: CardType | 'cardFound';
  message?: string;
  onComplete: () => void;
}

export const CardAnimation: React.FC<CardAnimationProps> = ({
  type,
  message,
  onComplete
}) => {
  const { isMobile, isTablet } = useScreenSize();
  const isSmall = isMobile || isTablet;
  const [show, setShow] = useState(true);

  // نحتفظ بأحدث نسخة من onComplete في ref
  // حتى لا يتسبب تغيير المرجع في إعادة تشغيل الـ timer
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; });

  // timer يعمل مرة واحدة عند mount — لا يتأثر بأي re-render
  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(() => onCompleteRef.current(), 200);
    }, 2800);
    return () => clearTimeout(timer);
  }, []); // ← deps فارغة: يعمل مرة واحدة فقط

  const getAnimationConfig = () => {
    switch (type) {
      // 🧊 التجميد - تساقط الثلوج والشعور بالبرد
      case 'freeze':
        return {
          emoji: '🧊',
          title: 'جمّدناها! ❄️',
          color: '#60a5fa',
          particles: '❄️',
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        };

      // 💣 القنبلة - انفجار وتدمير
      case 'bomb':
        return {
          emoji: '💣',
          title: 'دمّرناها! 💥',
          color: '#ef4444',
          particles: '💥',
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
        };

      // ⚔️ المعركة - ضرب سيوف وغبار
      case 'battle':
        return {
          emoji: '⚔️',
          title: 'على السيف! ⚔️',
          color: '#fb923c',
          particles: '⚡',
          background: 'linear-gradient(135deg, #fb923c, #ea580c)',
        };

      // 🛡️ الدرع - حماية
      case 'shield':
        return {
          emoji: '🛡️',
          title: 'ما تلمسها! 🛡️',
          color: '#34d399',
          particles: '✨',
          background: 'linear-gradient(135deg, #34d399, #10b981)',
        };

      // 🎁 بطاقة مكتشفة
      case 'cardFound':
        return {
          emoji: '🎁',
          title: 'مبروووك! 🎊',
          color: '#fbbf24',
          particles: '🎉',
          background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
        };

      default:
        return {
          emoji: '✨',
          title: 'يسلمو! ✨',
          color: '#a855f7',
          particles: '⭐',
          background: 'linear-gradient(135deg, #a855f7, #ec4899)',
        };
    }
  };

  const config = getAnimationConfig();

  if (!show) return null;

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      animation: 'fadeIn 0.3s ease',
    }}>
      {/* الجزيئات المتحركة — مواضع ثابتة لتجنب re-renders */}
      {PARTICLES.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          fontSize: '1.75rem',
          animation: `float ${p.dur}s ease-in-out infinite`,
          animationDelay: `${p.delay}s`,
          left: `${p.left}%`,
          top:  `${p.top}%`,
          opacity: 0.5,
          willChange: 'transform',
          pointerEvents: 'none',
        }}>
          {config.particles}
        </div>
      ))}

      {/* المحتوى الرئيسي */}
      <div style={{
        background: config.background,
        border: `${isSmall ? '3px' : '4px'} solid ${config.color}`,
        borderRadius: isSmall ? '1.25rem' : '2rem',
        padding: isSmall ? '1.5rem' : '3rem',
        textAlign: 'center',
        boxShadow: `0 12px 35px ${config.color}60`,
        animation: 'scaleIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        maxWidth: isSmall ? '85vw' : '500px',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* الإيموجي */}
        <div style={{
          fontSize: isSmall ? '3rem' : '5rem',
          marginBottom: isSmall ? '0.5rem' : '1rem',
          animation: 'bounce 1s ease infinite',
        }}>
          {config.emoji}
        </div>

        {/* العنوان */}
        <h2 style={{
          fontSize: isSmall ? '1.75rem' : '3rem',
          fontWeight: 900,
          color: 'white',
          margin: `0 0 ${isSmall ? '0.5rem' : '1rem'} 0`,
          textShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
          fontFamily: "'Lalezar', sans-serif",
        }}>
          {config.title}
        </h2>

        {/* الرسالة */}
        {message && (
          <p style={{
            fontSize: isSmall ? '1rem' : '1.5rem',
            fontWeight: 700,
            color: 'white',
            margin: 0,
            textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
            fontFamily: "'Lalezar', sans-serif",
          }}>
            {message}
          </p>
        )}
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.5); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes bounce {
            0%, 100% { transform: translate3d(0, 0, 0); }
            50% { transform: translate3d(0, -15px, 0); }
          }
          @keyframes float {
            0% { transform: translate3d(0, 0, 0); opacity: 0; }
            10% { opacity: 0.5; }
            90% { opacity: 0.5; }
            100% { transform: translate3d(0, -80vh, 0); opacity: 0; }
          }
        `}
      </style>
    </div>,
    document.body,
  );
};
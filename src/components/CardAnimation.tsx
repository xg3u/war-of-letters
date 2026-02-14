// src/components/CardAnimation.tsx
// أنيميشن البطاقات الأربعة

import React, { useEffect, useState } from 'react';
import type { CardType } from '../core/types';

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
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onComplete, 200);
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const getAnimationConfig = () => {
    switch (type) {
      // 🧊 التجميد - تساقط الثلوج والشعور بالبرد
      case 'freeze':
        return {
          emoji: '🧊',
          title: 'تجميد!',
          color: '#60a5fa',
          particles: '❄️',
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        };

      // 💣 القنبلة - انفجار وتدمير
      case 'bomb':
        return {
          emoji: '💣',
          title: 'انفجار!',
          color: '#ef4444',
          particles: '💥',
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
        };

      // ⚔️ المعركة - ضرب سيوف وغبار
      case 'battle':
        return {
          emoji: '⚔️',
          title: 'معركة!',
          color: '#fb923c',
          particles: '⚡',
          background: 'linear-gradient(135deg, #fb923c, #ea580c)',
        };

      // 🛡️ الدرع - حماية
      case 'shield':
        return {
          emoji: '🛡️',
          title: 'حماية!',
          color: '#34d399',
          particles: '✨',
          background: 'linear-gradient(135deg, #34d399, #10b981)',
        };

      // 🎁 بطاقة مكتشفة
      case 'cardFound':
        return {
          emoji: '🎁',
          title: 'مبروك!',
          color: '#fbbf24',
          particles: '🎉',
          background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
        };

      default:
        return {
          emoji: '✨',
          title: 'رائع!',
          color: '#a855f7',
          particles: '⭐',
          background: 'linear-gradient(135deg, #a855f7, #ec4899)',
        };
    }
  };

  const config = getAnimationConfig();

  if (!show) return null;

  return (
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
      {/* الجزيئات المتحركة */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            fontSize: '1.75rem',
            animation: `float ${2.5 + Math.random() * 2}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: 0.5,
            willChange: 'transform',
          }}
        >
          {config.particles}
        </div>
      ))}

      {/* المحتوى الرئيسي */}
      <div style={{
        background: config.background,
        border: `4px solid ${config.color}`,
        borderRadius: '2rem',
        padding: '3rem',
        textAlign: 'center',
        boxShadow: `0 12px 35px ${config.color}60`,
        animation: 'scaleIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        maxWidth: '500px',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* الإيموجي */}
        <div style={{
          fontSize: '5rem',
          marginBottom: '1rem',
          animation: 'bounce 1s ease infinite',
        }}>
          {config.emoji}
        </div>

        {/* العنوان */}
        <h2 style={{
          fontSize: '3rem',
          fontWeight: 900,
          color: 'white',
          margin: '0 0 1rem 0',
          textShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
        }}>
          {config.title}
        </h2>

        {/* الرسالة */}
        {message && (
          <p style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'white',
            margin: 0,
            textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
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
    </div>
  );
};
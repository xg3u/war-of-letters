// src/components/CardAnimation.tsx
// أنيميشن البطاقات

import React, { useEffect, useState } from 'react';
import type { CardType } from './ActionCardPanel';

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
      setTimeout(onComplete, 500);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const getAnimationConfig = () => {
    switch (type) {
      case 'freeze':
        return {
          emoji: '🧊',
          title: 'تجميد!',
          color: '#60a5fa',
          particles: '❄️',
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        };
      case 'bomb':
        return {
          emoji: '💣',
          title: 'انفجار!',
          color: '#ef4444',
          particles: '💥',
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
        };
      case 'battle':
        return {
          emoji: '⚔️',
          title: 'معركة!',
          color: '#fb923c',
          particles: '⚡',
          background: 'linear-gradient(135deg, #fb923c, #ea580c)',
        };
      case 'shield':
        return {
          emoji: '🛡️',
          title: 'حماية!',
          color: '#34d399',
          particles: '✨',
          background: 'linear-gradient(135deg, #34d399, #10b981)',
        };
      case 'demonShuffle':
        return {
          emoji: '👹',
          title: 'خلط الشيطان!',
          color: '#a855f7',
          particles: '🌀',
          background: 'linear-gradient(135deg, #a855f7, #9333ea)',
        };
      case 'speedUp':
        return {
          emoji: '⚡',
          title: 'تسريع!',
          color: '#facc15',
          particles: '💨',
          background: 'linear-gradient(135deg, #facc15, #eab308)',
        };
      case 'luck':
        return {
          emoji: '🍀',
          title: 'حظ سعيد!',
          color: '#f472b6',
          particles: '⭐',
          background: 'linear-gradient(135deg, #f472b6, #ec4899)',
        };
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
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      animation: 'fadeIn 0.3s ease',
    }}>
      {/* الجزيئات المتحركة */}
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            fontSize: '2rem',
            animation: `float ${2 + Math.random() * 2}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: 0.6,
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
        boxShadow: `0 20px 60px ${config.color}80`,
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
          textShadow: '0 4px 10px rgba(0, 0, 0, 0.5)',
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
            textShadow: '0 2px 5px rgba(0, 0, 0, 0.3)',
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
            from {
              opacity: 0;
              transform: scale(0.5) rotate(-10deg);
            }
            to {
              opacity: 1;
              transform: scale(1) rotate(0deg);
            }
          }

          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
          }

          @keyframes float {
            0%, 100% {
              transform: translateY(0) rotate(0deg);
              opacity: 0;
            }
            10% {
              opacity: 0.6;
            }
            90% {
              opacity: 0.6;
            }
            100% {
              transform: translateY(-100vh) rotate(360deg);
              opacity: 0;
            }
          }
        `}
      </style>
    </div>
  );
};
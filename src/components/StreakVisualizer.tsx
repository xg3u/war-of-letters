// src/components/StreakVisualizer.tsx
// عداد الطاقة البصري (3 فتحات زجاجية نيون)

import React from 'react';

interface StreakVisualizerProps {
  streak: number; // 0, 1, 2, or 3
  team: 'green' | 'red';
  enabled: boolean; // هل النظام مفعل من الإعدادات؟
}

export const StreakVisualizer: React.FC<StreakVisualizerProps> = ({
  streak,
  team,
  enabled,
}) => {
  if (!enabled) return null;

  const teamColor = team === 'green'
    ? {
        primary: '#10b981',
        glow: 'rgba(16, 185, 129, 0.8)',
        gradient: 'linear-gradient(135deg, #10b981, #14b8a6)'
      }
    : {
        primary: '#ef4444',
        glow: 'rgba(239, 68, 68, 0.8)',
        gradient: 'linear-gradient(135deg, #ef4444, #dc2626)'
      };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      alignItems: 'center',
      padding: '1rem',
      background: 'rgba(0, 0, 0, 0.2)',
      borderRadius: '1rem',
      border: `2px solid ${teamColor.primary}40`,
    }}>
      {/* العنوان */}
      <div style={{
        fontSize: '0.75rem',
        fontWeight: 700,
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        عداد الطاقة
      </div>

      {/* 3 فتحات */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
      }}>
        {[1, 2, 3].map((slotNumber) => {
          const isActive = slotNumber <= streak;
          const isCompleting = streak === 3 && slotNumber === 3;

          return (
            <div
              key={slotNumber}
              style={{
                width: '32px',
                height: '48px',
                borderRadius: '8px',
                background: isActive
                  ? teamColor.gradient
                  : 'rgba(255, 255, 255, 0.05)',
                border: isActive
                  ? `3px solid ${teamColor.primary}`
                  : '2px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                boxShadow: isActive
                  ? `0 0 20px ${teamColor.glow}, inset 0 0 10px ${teamColor.glow}`
                  : 'none',
                transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transform: isActive ? 'scale(1.05)' : 'scale(1)',
                animation: isCompleting
                  ? 'sparkleComplete 1s ease-in-out infinite'
                  : isActive
                    ? 'pulseEnergy 2s ease-in-out infinite'
                    : 'none',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* تأثير الضوء الداخلي */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  right: '0',
                  bottom: '0',
                  background: `radial-gradient(circle at center, ${teamColor.glow} 0%, transparent 70%)`,
                  opacity: 0.6,
                }} />
              )}

              {/* رقم الفتحة (صغير جداً) */}
              <div style={{
                position: 'absolute',
                bottom: '2px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '0.5rem',
                fontWeight: 900,
                color: isActive ? 'white' : 'rgba(255, 255, 255, 0.3)',
                textShadow: isActive ? `0 0 5px ${teamColor.glow}` : 'none',
              }}>
                {slotNumber}
              </div>
            </div>
          );
        })}
      </div>

      {/* مؤشر التقدم النصي */}
      <div style={{
        fontSize: '0.625rem',
        color: streak === 3 ? teamColor.primary : 'rgba(255, 255, 255, 0.5)',
        fontWeight: 700,
        textAlign: 'center',
        animation: streak === 3 ? 'pulse 0.8s ease-in-out infinite' : 'none',
      }}>
        {streak === 0 && 'ابدأ السلسلة!'}
        {streak === 1 && 'استمر! 🔥'}
        {streak === 2 && 'واحدة فقط! ⚡'}
        {streak === 3 && 'مكتملة! 🎉'}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes pulseEnergy {
          0%, 100% {
            opacity: 1;
            filter: brightness(1);
          }
          50% {
            opacity: 0.8;
            filter: brightness(1.2);
          }
        }

        @keyframes sparkleComplete {
          0%, 100% {
            transform: scale(1.05);
            filter: brightness(1.2);
          }
          50% {
            transform: scale(1.15);
            filter: brightness(1.5) drop-shadow(0 0 10px currentColor);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
};

// src/components/StreakVisualizer.tsx
// عرض سلسلة الإجابات مع الشخصيات التذكيرية

import React from 'react';
import { Flame } from 'lucide-react';
import { useScreenSize } from '../hooks/useScreenSize';

// استيراد صور الشخصيات
import GreenCharacter from '../assets/Green/الفريق الاخضر يضحك.png';
import RedCharacter from '../assets/Red/الفريق الاحمر يضحك.png';

interface StreakVisualizerProps {
  greenStreak: number;
  redStreak: number;
  greenTeamName: string;
  redTeamName: string;
  enabled: boolean;
}

export const StreakVisualizer: React.FC<StreakVisualizerProps> = ({
  greenStreak,
  redStreak,
  greenTeamName,
  redTeamName,
  enabled,
}) => {
  const { isMobile, isTablet } = useScreenSize();
  const isSmall = isMobile || isTablet;

  if (!enabled) return null;

  return (
    <>
      {/* عداد سلسلة الفريق الأحمر - فوق لوحة الفريق (يسار) */}
      <div style={{
        position: 'fixed',
        top: isSmall ? '0.35rem' : '0.75rem',
        left: isSmall ? '0.5rem' : '1.5rem',
        zIndex: 100,
      }}>
        <StreakCounter
          streak={redStreak}
          teamName={redTeamName}
          color="#ef4444"
          isSmall={isSmall}
        />
      </div>

      {/* عداد سلسلة الفريق الأخضر - فوق لوحة الفريق (يمين) */}
      <div style={{
        position: 'fixed',
        top: isSmall ? '0.35rem' : '0.75rem',
        right: isSmall ? '0.5rem' : '1.5rem',
        zIndex: 100,
      }}>
        <StreakCounter
          streak={greenStreak}
          teamName={greenTeamName}
          color="#10b981"
          isSmall={isSmall}
        />
      </div>

      {/* شخصية تذكيرية للأخضر - تظهر عند 2 إجابات (أسفل اليمين) */}
      {greenStreak === 2 && (
        <StreakReminder
          teamName={greenTeamName}
          color="#10b981"
          position="right"
          characterImage={GreenCharacter}
          isSmall={isSmall}
        />
      )}

      {/* شخصية تذكيرية للأحمر - تظهر عند 2 إجابات (أسفل اليسار) */}
      {redStreak === 2 && (
        <StreakReminder
          teamName={redTeamName}
          color="#ef4444"
          position="left"
          characterImage={RedCharacter}
          isSmall={isSmall}
        />
      )}
    </>
  );
};

// مكون عداد السلسلة
const StreakCounter: React.FC<{
  streak: number;
  teamName: string;
  color: string;
  isSmall?: boolean;
}> = ({ streak, teamName, color, isSmall = false }) => (
  <div style={{
    background: streak > 0
      ? `linear-gradient(135deg, ${color}40, ${color}20)`
      : 'rgba(0, 0, 0, 0.4)',
    border: `${isSmall ? '1.5px' : '2px'} solid ${streak > 0 ? color : 'rgba(255,255,255,0.2)'}`,
    borderRadius: isSmall ? '0.75rem' : '1rem',
    padding: isSmall ? '0.35rem 0.6rem' : '0.75rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: isSmall ? '0.35rem' : '0.75rem',
    backdropFilter: 'blur(6px)',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    transform: streak > 0 ? 'scale(1.05)' : 'scale(1)',
    boxShadow: streak > 0 ? `0 3px 12px ${color}30` : 'none',
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: isSmall ? '0.1rem' : '0.25rem',
    }}>
      {[1, 2, 3].map((i) => (
        <Flame
          key={i}
          size={isSmall ? 14 : 20}
          fill={i <= streak ? color : 'transparent'}
          color={i <= streak ? color : 'rgba(255,255,255,0.3)'}
          style={{
            transition: 'all 0.3s ease',
            transform: i <= streak ? 'scale(1.1)' : 'scale(0.9)',
            animation: i <= streak ? 'flameFlicker 0.8s ease-in-out infinite' : 'none',
          }}
        />
      ))}
    </div>
    {!isSmall && (
      <span style={{
        color: streak > 0 ? 'white' : 'rgba(255,255,255,0.5)',
        fontSize: '0.875rem',
        fontWeight: 700,
      }}>
        {teamName}
      </span>
    )}

    <style>{`
      @keyframes flameFlicker {
        0%, 100% { transform: scale(1.1); }
        50% { transform: scale(1.15); }
      }
    `}</style>
  </div>
);

// مكون الشخصية التذكيرية - تصميم عصري
const StreakReminder: React.FC<{
  teamName: string;
  color: string;
  position: 'left' | 'right';
  characterImage: string;
  isSmall?: boolean;
}> = ({ teamName, color, position, characterImage, isSmall = false }) => {
  const imgSize = isSmall ? '80px' : '140px';
  const borderRad = isSmall ? '14px' : '24px';

  return (
    <div style={{
      position: 'fixed',
      bottom: isSmall ? '4.5rem' : '1.5rem',
      [position]: isSmall ? '0.5rem' : '1.5rem',
      display: 'flex',
      flexDirection: position === 'left' ? 'row' : 'row-reverse',
      alignItems: 'flex-end',
      gap: isSmall ? '0.3rem' : '0.5rem',
      zIndex: 150,
      animation: 'slideInCharacter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
      maxWidth: isSmall ? '85vw' : 'none',
    }}>
      {/* الشخصية - تصميم عصري */}
      <div style={{
        position: 'relative',
        animation: 'characterFloat 2s ease-in-out infinite',
        flexShrink: 0,
      }}>
        {/* الهالة المتوهجة */}
        <div style={{
          position: 'absolute',
          inset: isSmall ? '-4px' : '-8px',
          background: `radial-gradient(circle, ${color}60 0%, transparent 70%)`,
          borderRadius: '50%',
          animation: 'glowPulse 1.5s ease-in-out infinite',
        }} />

        {/* حاوية الصورة */}
        <div style={{
          width: imgSize,
          height: imgSize,
          borderRadius: borderRad,
          overflow: 'hidden',
          position: 'relative',
          background: `linear-gradient(145deg, ${color}20, ${color}40)`,
          boxShadow: `0 8px 24px ${color}40, 0 0 0 ${isSmall ? '2px' : '3px'} ${color}`,
        }}>
          <img
            src={characterImage}
            alt={`${teamName} character`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />

          {/* تأثير اللمعان على الصورة */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* رمز النار المتحركة */}
        <div style={{
          position: 'absolute',
          top: isSmall ? '-10px' : '-15px',
          [position === 'left' ? 'right' : 'left']: isSmall ? '-6px' : '-10px',
          fontSize: isSmall ? '1.25rem' : '2rem',
          animation: 'fireWiggle 0.5s ease-in-out infinite',
        }}>
          🔥
        </div>
      </div>

      {/* فقاعة الرسالة - تصميم عصري */}
      <div style={{
        position: 'relative',
        maxWidth: isSmall ? '160px' : '260px',
        animation: 'bubbleAppear 0.5s ease-out 0.2s both',
      }}>
        {/* خلفية الفقاعة */}
        <div style={{
          background: `linear-gradient(135deg, rgba(0,0,0,0.85), rgba(0,0,0,0.9))`,
          backdropFilter: 'blur(8px)',
          borderRadius: isSmall ? '0.85rem' : '1.25rem',
          padding: isSmall ? '0.5rem 0.65rem' : '1rem 1.25rem',
          border: `2px solid ${color}`,
          boxShadow: `0 8px 24px rgba(0,0,0,0.3), 0 0 12px ${color}20`,
        }}>
          {/* العنوان */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginBottom: isSmall ? '0.25rem' : '0.5rem',
          }}>
            <span style={{
              background: `linear-gradient(135deg, ${color}, ${color}dd)`,
              color: 'white',
              padding: isSmall ? '0.15rem 0.5rem' : '0.25rem 0.75rem',
              borderRadius: '1rem',
              fontSize: isSmall ? '0.65rem' : '0.875rem',
              fontWeight: 900,
              boxShadow: `0 2px 6px ${color}40`,
            }}>
              ⚡ سلسلة الإجابات
            </span>
          </div>

          {/* الرسالة */}
          <div style={{
            color: 'white',
            fontSize: isSmall ? '0.7rem' : '1rem',
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.5,
          }}>
            <span style={{ color }}>
              {teamName}
            </span>
            {' '}على بُعد إجابة واحدة!
          </div>

          {/* التحذير */}
          <div style={{
            marginTop: isSmall ? '0.25rem' : '0.5rem',
            textAlign: 'center',
            fontSize: isSmall ? '0.65rem' : '0.875rem',
            color: 'rgba(255,255,255,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.25rem',
          }}>
            <span>🎁</span>
            <span>سيحصلون على بطاقة!</span>
          </div>
        </div>

        {/* ذيل الفقاعة */}
        <div style={{
          position: 'absolute',
          bottom: isSmall ? '15px' : '25px',
          [position === 'left' ? 'left' : 'right']: '-8px',
          width: isSmall ? '12px' : '16px',
          height: isSmall ? '12px' : '16px',
          background: 'rgba(0,0,0,0.85)',
          border: `2px solid ${color}`,
          borderTop: 'none',
          borderLeft: position === 'left' ? 'none' : `2px solid ${color}`,
          borderRight: position === 'right' ? 'none' : `2px solid ${color}`,
          transform: position === 'left' ? 'rotate(-45deg)' : 'rotate(45deg)',
        }} />
      </div>

      <style>{`
        @keyframes slideInCharacter {
          from { opacity: 0; transform: translate3d(0, 60px, 0) scale(0.85); }
          to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }
        @keyframes characterFloat {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -6px, 0); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        @keyframes fireWiggle {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(8deg); }
        }
        @keyframes bubbleAppear {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default StreakVisualizer;

// src/components/StreakVisualizer.tsx
// عرض سلسلة الإجابات مع الشخصيات التذكيرية

import React from 'react';
import { Flame } from 'lucide-react';

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
  if (!enabled) return null;

  return (
    <>
      {/* عداد سلسلة الفريق الأحمر - فوق لوحة الفريق (يسار) */}
      <div style={{
        position: 'fixed',
        top: '0.75rem',
        left: '1.5rem',
        zIndex: 100,
      }}>
        <StreakCounter
          streak={redStreak}
          teamName={redTeamName}
          color="#ef4444"
        />
      </div>

      {/* عداد سلسلة الفريق الأخضر - فوق لوحة الفريق (يمين) */}
      <div style={{
        position: 'fixed',
        top: '0.75rem',
        right: '1.5rem',
        zIndex: 100,
      }}>
        <StreakCounter
          streak={greenStreak}
          teamName={greenTeamName}
          color="#10b981"
        />
      </div>

      {/* شخصية تذكيرية للأخضر - تظهر عند 2 إجابات (أسفل اليمين) */}
      {greenStreak === 2 && (
        <StreakReminder
          teamName={greenTeamName}
          color="#10b981"
          position="right"
          characterImage={GreenCharacter}
        />
      )}

      {/* شخصية تذكيرية للأحمر - تظهر عند 2 إجابات (أسفل اليسار) */}
      {redStreak === 2 && (
        <StreakReminder
          teamName={redTeamName}
          color="#ef4444"
          position="left"
          characterImage={RedCharacter}
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
}> = ({ streak, teamName, color }) => (
  <div style={{
    background: streak > 0
      ? `linear-gradient(135deg, ${color}40, ${color}20)`
      : 'rgba(0, 0, 0, 0.4)',
    border: `2px solid ${streak > 0 ? color : 'rgba(255,255,255,0.2)'}`,
    borderRadius: '1rem',
    padding: '0.75rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease',
    transform: streak > 0 ? 'scale(1.05)' : 'scale(1)',
    boxShadow: streak > 0 ? `0 4px 20px ${color}40` : 'none',
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
    }}>
      {[1, 2, 3].map((i) => (
        <Flame
          key={i}
          size={20}
          fill={i <= streak ? color : 'transparent'}
          color={i <= streak ? color : 'rgba(255,255,255,0.3)'}
          style={{
            transition: 'all 0.3s ease',
            transform: i <= streak ? 'scale(1.1)' : 'scale(0.9)',
            filter: i <= streak ? `drop-shadow(0 0 6px ${color})` : 'none',
            animation: i <= streak ? 'flameFlicker 0.5s ease-in-out infinite' : 'none',
          }}
        />
      ))}
    </div>
    <span style={{
      color: streak > 0 ? 'white' : 'rgba(255,255,255,0.5)',
      fontSize: '0.875rem',
      fontWeight: 700,
    }}>
      {teamName}
    </span>

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
}> = ({ teamName, color, position, characterImage }) => {
  return (
    <div style={{
      position: 'fixed',
      bottom: '1.5rem',
      [position]: '1.5rem',
      display: 'flex',
      flexDirection: position === 'left' ? 'row' : 'row-reverse',
      alignItems: 'flex-end',
      gap: '0.5rem',
      zIndex: 150,
      animation: 'slideInCharacter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
    }}>
      {/* الشخصية - تصميم عصري */}
      <div style={{
        position: 'relative',
        animation: 'characterFloat 2s ease-in-out infinite',
      }}>
        {/* الهالة المتوهجة */}
        <div style={{
          position: 'absolute',
          inset: '-8px',
          background: `radial-gradient(circle, ${color}60 0%, transparent 70%)`,
          borderRadius: '50%',
          animation: 'glowPulse 1.5s ease-in-out infinite',
        }} />

        {/* حاوية الصورة */}
        <div style={{
          width: '140px',
          height: '140px',
          borderRadius: '24px',
          overflow: 'hidden',
          position: 'relative',
          background: `linear-gradient(145deg, ${color}20, ${color}40)`,
          boxShadow: `
            0 20px 40px ${color}50,
            0 0 0 3px ${color},
            inset 0 2px 4px rgba(255,255,255,0.3)
          `,
        }}>
          <img
            src={characterImage}
            alt={`${teamName} character`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
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
          top: '-15px',
          [position === 'left' ? 'right' : 'left']: '-10px',
          fontSize: '2rem',
          animation: 'fireWiggle 0.5s ease-in-out infinite',
        }}>
          🔥
        </div>
      </div>

      {/* فقاعة الرسالة - تصميم عصري */}
      <div style={{
        position: 'relative',
        maxWidth: '260px',
        animation: 'bubbleAppear 0.5s ease-out 0.2s both',
      }}>
        {/* خلفية الفقاعة */}
        <div style={{
          background: `linear-gradient(135deg, rgba(0,0,0,0.8), rgba(0,0,0,0.9))`,
          backdropFilter: 'blur(20px)',
          borderRadius: '1.25rem',
          padding: '1rem 1.25rem',
          border: `2px solid ${color}`,
          boxShadow: `
            0 10px 30px rgba(0,0,0,0.4),
            0 0 20px ${color}30,
            inset 0 1px 0 rgba(255,255,255,0.1)
          `,
        }}>
          {/* العنوان */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem',
          }}>
            <span style={{
              background: `linear-gradient(135deg, ${color}, ${color}dd)`,
              color: 'white',
              padding: '0.25rem 0.75rem',
              borderRadius: '1rem',
              fontSize: '0.875rem',
              fontWeight: 900,
              boxShadow: `0 2px 10px ${color}50`,
            }}>
              ⚡ سلسلة الإجابات
            </span>
          </div>

          {/* الرسالة */}
          <div style={{
            color: 'white',
            fontSize: '1rem',
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
            marginTop: '0.5rem',
            textAlign: 'center',
            fontSize: '0.875rem',
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
          bottom: '25px',
          [position === 'left' ? 'left' : 'right']: '-8px',
          width: '16px',
          height: '16px',
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
          from {
            opacity: 0;
            transform: translateY(80px) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes characterFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes fireWiggle {
          0%, 100% { transform: rotate(-10deg) scale(1); }
          50% { transform: rotate(10deg) scale(1.1); }
        }
        @keyframes bubbleAppear {
          from {
            opacity: 0;
            transform: scale(0.9) translateX(${position === 'left' ? '-20px' : '20px'});
          }
          to {
            opacity: 1;
            transform: scale(1) translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default StreakVisualizer;

// src/components/MatchScoreTracker.tsx
// عداد نتيجة المباراة - نظام Best of X

import React from 'react';
import { useScreenSize } from '../hooks/useScreenSize';

interface MatchScoreTrackerProps {
  greenScore: number;
  redScore: number;
  greenTeamName: string;
  redTeamName: string;
  totalRounds: number | 'infinite';
  currentRound: number;
  gameName?: string;
}

export const MatchScoreTracker: React.FC<MatchScoreTrackerProps> = ({
  greenScore,
  redScore,
  greenTeamName,
  redTeamName,
  totalRounds,
  currentRound,
  gameName,
}) => {
  const { isMobile, isTablet } = useScreenSize();
  const isSmall = isMobile || isTablet;

  const isInfinite = totalRounds === 'infinite' || totalRounds === Infinity;
  const rounds = isInfinite ? 5 : totalRounds; // Default display for infinite
  const winsNeeded = isInfinite ? Infinity : Math.ceil(rounds / 2);

  // Check if match is won
  const matchWinner = greenScore >= winsNeeded ? 'green' : redScore >= winsNeeded ? 'red' : null;

  const dotSize = isSmall ? '16px' : '24px';
  const dotGap = isSmall ? '0.2rem' : '0.35rem';

  return (
    <div style={{
      position: 'fixed',
      top: isSmall ? '0.5rem' : '1rem',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: isSmall ? '0.25rem' : '0.5rem',
      maxWidth: isSmall ? '95vw' : 'none',
    }}>
      {/* عنوان اللعبة - بنفس أسلوب الصورة */}
      {gameName && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'baseline',
          gap: isSmall ? '0.3rem' : '0.55rem',
          marginBottom: isSmall ? '0.1rem' : '0.15rem',
          maxWidth: isSmall ? '88vw' : '500px',
          direction: 'rtl',
          lineHeight: 1,
        }}>
          {/* حرب — أحمر */}
          <span style={{
            fontSize: isSmall ? '1.45rem' : '2.4rem',
            fontWeight: 900,
            color: '#ef4444',
            WebkitTextStroke: isSmall ? '1.5px #1a0000' : '2.5px #1a0000',
            textShadow: isSmall
              ? '2px 3px 0 #1a0000, 0 0 12px rgba(239,68,68,0.4)'
              : '3px 4px 0 #1a0000, 0 0 20px rgba(239,68,68,0.4)',
            letterSpacing: '0.01em',
          }}>حرب</span>

          {/* الحروف — ذهبي */}
          <span style={{
            fontSize: isSmall ? '1.45rem' : '2.4rem',
            fontWeight: 900,
            color: '#fbbf24',
            WebkitTextStroke: isSmall ? '1.5px #1a0000' : '2.5px #1a0000',
            textShadow: isSmall
              ? '2px 3px 0 #1a0000, 0 0 12px rgba(251,191,36,0.4)'
              : '3px 4px 0 #1a0000, 0 0 20px rgba(251,191,36,0.4)',
            letterSpacing: '0.01em',
          }}>الحروف</span>

          {/* مع — سماوي */}
          <span style={{
            fontSize: isSmall ? '1.05rem' : '1.7rem',
            fontWeight: 900,
            color: '#22d3ee',
            WebkitTextStroke: isSmall ? '1.5px #1a0000' : '2px #1a0000',
            textShadow: isSmall
              ? '2px 3px 0 #1a0000, 0 0 10px rgba(34,211,238,0.4)'
              : '3px 4px 0 #1a0000, 0 0 16px rgba(34,211,238,0.4)',
            letterSpacing: '0.01em',
          }}>مع</span>

          {/* اسم اللعبة من الإعدادات — كل كلمة بلون */}
          {gameName.trim().split(/\s+/).map((word, i) => {
            const palette = [
              { color: '#ef4444', glow: 'rgba(239,68,68,0.4)' },
              { color: '#fbbf24', glow: 'rgba(251,191,36,0.4)' },
              { color: '#a78bfa', glow: 'rgba(167,139,250,0.4)' },
              { color: '#34d399', glow: 'rgba(52,211,153,0.4)' },
            ];
            const p = palette[i % palette.length];
            return (
              <span key={i} style={{
                fontSize: isSmall ? '1.45rem' : '2.4rem',
                fontWeight: 900,
                color: p.color,
                WebkitTextStroke: isSmall ? '1.5px #1a0000' : '2.5px #1a0000',
                textShadow: isSmall
                  ? `2px 3px 0 #1a0000, 0 0 12px ${p.glow}`
                  : `3px 4px 0 #1a0000, 0 0 20px ${p.glow}`,
                letterSpacing: '0.01em',
              }}>{word}</span>
            );
          })}
        </div>
      )}

      {/* نوع الجولات */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(10px)',
        padding: isSmall ? '0.2rem 0.6rem' : '0.35rem 1rem',
        borderRadius: '1rem',
        border: '1px solid rgba(168, 85, 247, 0.3)',
      }}>
        <span style={{
          color: 'rgba(255, 255, 255, 0.8)',
          fontSize: isSmall ? '0.6rem' : '0.75rem',
          fontWeight: 700,
        }}>
          {isInfinite ? '🎮 جولات مفتوحة' : `🏆 Best of ${rounds}`}
        </span>
      </div>

      {/* عداد النتيجة الرئيسي */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: isSmall ? '0.35rem' : '0.75rem',
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.9))',
        backdropFilter: 'blur(20px)',
        padding: isSmall ? '0.4rem 0.6rem' : '0.75rem 1.5rem',
        borderRadius: isSmall ? '1rem' : '1.5rem',
        border: '2px solid rgba(168, 85, 247, 0.4)',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
        maxWidth: '100%',
        overflowX: 'hidden' as const,
      }}>
        {/* الفريق الأخضر */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isSmall ? '0.25rem' : '0.5rem',
        }}>
          {!isMobile && (
            <span style={{
              color: '#10b981',
              fontSize: isSmall ? '0.7rem' : '0.85rem',
              fontWeight: 700,
              maxWidth: isSmall ? '50px' : '80px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {greenTeamName}
            </span>
          )}

          {/* نقاط الفريق الأخضر */}
          <div style={{
            display: 'flex',
            gap: dotGap,
            flexWrap: 'wrap',
            maxWidth: isSmall ? '72px' : 'none',
          }}>
            {Array.from({ length: isInfinite ? Math.max(greenScore, 3) : winsNeeded }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: dotSize,
                  height: dotSize,
                  borderRadius: '50%',
                  background: i < greenScore
                    ? 'linear-gradient(135deg, #10b981, #14b8a6)'
                    : 'rgba(16, 185, 129, 0.2)',
                  border: i < greenScore
                    ? `${isSmall ? '1.5px' : '2px'} solid #10b981`
                    : `${isSmall ? '1.5px' : '2px'} solid rgba(16, 185, 129, 0.3)`,
                  boxShadow: i < greenScore
                    ? '0 0 10px rgba(16, 185, 129, 0.5)'
                    : 'none',
                  transition: 'all 0.3s ease',
                  animation: i === greenScore - 1 ? 'scorePopIn 0.5s ease-out' : 'none',
                }}
              />
            ))}
          </div>
        </div>

        {/* الفاصل */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isSmall ? '0.2rem' : '0.5rem',
          padding: isSmall ? '0 0.15rem' : '0 0.5rem',
        }}>
          <div style={{
            fontSize: isSmall ? '1.1rem' : '1.75rem',
            fontWeight: 900,
            color: '#10b981',
            textShadow: '0 0 10px rgba(16, 185, 129, 0.5)',
          }}>
            {greenScore}
          </div>
          <div style={{
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: isSmall ? '0.85rem' : '1.25rem',
            fontWeight: 900,
          }}>
            :
          </div>
          <div style={{
            fontSize: isSmall ? '1.1rem' : '1.75rem',
            fontWeight: 900,
            color: '#ef4444',
            textShadow: '0 0 10px rgba(239, 68, 68, 0.5)',
          }}>
            {redScore}
          </div>
        </div>

        {/* نقاط الفريق الأحمر */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isSmall ? '0.25rem' : '0.5rem',
        }}>
          <div style={{
            display: 'flex',
            gap: dotGap,
            flexWrap: 'wrap',
            maxWidth: isSmall ? '72px' : 'none',
          }}>
            {Array.from({ length: isInfinite ? Math.max(redScore, 3) : winsNeeded }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: dotSize,
                  height: dotSize,
                  borderRadius: '50%',
                  background: i < redScore
                    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                    : 'rgba(239, 68, 68, 0.2)',
                  border: i < redScore
                    ? `${isSmall ? '1.5px' : '2px'} solid #ef4444`
                    : `${isSmall ? '1.5px' : '2px'} solid rgba(239, 68, 68, 0.3)`,
                  boxShadow: i < redScore
                    ? '0 0 10px rgba(239, 68, 68, 0.5)'
                    : 'none',
                  transition: 'all 0.3s ease',
                  animation: i === redScore - 1 ? 'scorePopIn 0.5s ease-out' : 'none',
                }}
              />
            ))}
          </div>

          {!isMobile && (
            <span style={{
              color: '#ef4444',
              fontSize: isSmall ? '0.7rem' : '0.85rem',
              fontWeight: 700,
              maxWidth: isSmall ? '50px' : '80px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {redTeamName}
            </span>
          )}
        </div>
      </div>

      {/* رقم الجولة الحالية */}
      {!matchWinner && (
        <div style={{
          background: 'rgba(168, 85, 247, 0.2)',
          backdropFilter: 'blur(10px)',
          padding: isSmall ? '0.15rem 0.5rem' : '0.25rem 0.75rem',
          borderRadius: '0.75rem',
          border: '1px solid rgba(168, 85, 247, 0.4)',
        }}>
          <span style={{
            color: '#c4b5fd',
            fontSize: isSmall ? '0.6rem' : '0.7rem',
            fontWeight: 700,
          }}>
            الجولة {currentRound}
          </span>
        </div>
      )}

      {/* إعلان الفائز بالمباراة */}
      {matchWinner && (
        <div style={{
          background: matchWinner === 'green'
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(20, 184, 166, 0.2))'
            : 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(220, 38, 38, 0.2))',
          backdropFilter: 'blur(10px)',
          padding: isSmall ? '0.3rem 0.6rem' : '0.5rem 1rem',
          borderRadius: '1rem',
          border: `2px solid ${matchWinner === 'green' ? '#10b981' : '#ef4444'}`,
          animation: 'matchWinPulse 1s ease-in-out infinite',
        }}>
          <span style={{
            color: 'white',
            fontSize: isSmall ? '0.7rem' : '0.85rem',
            fontWeight: 900,
          }}>
            🏆 {matchWinner === 'green' ? greenTeamName : redTeamName} فاز بالمباراة!
          </span>
        </div>
      )}

      <style>{`
        @keyframes scorePopIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.3);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes matchWinPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 20px ${matchWinner === 'green' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'};
          }
          50% {
            transform: scale(1.02);
            box-shadow: 0 0 30px ${matchWinner === 'green' ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)'};
          }
        }
      `}</style>
    </div>
  );
};

export default MatchScoreTracker;

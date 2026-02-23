// src/components/MatchScoreTracker.tsx
// لوحة نتائج المباراة — عنوان بارز + لوحة النتيجة + معلومات الجولة

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
  const rounds     = isInfinite ? 5 : (totalRounds as number);
  const winsNeeded = isInfinite ? Infinity : Math.ceil(rounds / 2);
  const matchWinner = greenScore >= winsNeeded ? 'green' : redScore >= winsNeeded ? 'red' : null;

  const greenDots = isInfinite ? Math.max(greenScore + 1, 3) : winsNeeded;
  const redDots   = isInfinite ? Math.max(redScore  + 1, 3) : winsNeeded;
  const dotSize   = isMobile ? 11 : isTablet ? 13 : 17;

  return (
    <div style={{
      position: 'fixed',
      top: isSmall ? '0.35rem' : '0.5rem',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 200,
      direction: 'rtl',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: isSmall ? '0.25rem' : '0.35rem',
      maxWidth: isSmall ? '96vw' : 'none',
    }}>

      {/* ══ ١. عنوان اللعبة — خارج اللوحة، بارز ومميز ══ */}
      {gameName && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'baseline',
          gap: isSmall ? '0.25rem' : '0.45rem',
          lineHeight: 1,
          direction: 'rtl',
          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))',
        }}>
          {/* حرب */}
          <span style={{
            fontSize: isMobile ? '1.15rem' : isTablet ? '1.5rem' : '2.2rem',
            fontWeight: 900,
            color: '#ef4444',
            WebkitTextStroke: isMobile ? '1px #1a0000' : isTablet ? '1.5px #1a0000' : '2px #1a0000',
            textShadow: `0 2px 0 #1a0000, 0 0 16px rgba(239,68,68,0.6)`,
            letterSpacing: '0.01em',
          }}>حرب</span>

          {/* الحروف */}
          <span style={{
            fontSize: isMobile ? '1.15rem' : isTablet ? '1.5rem' : '2.2rem',
            fontWeight: 900,
            color: '#fbbf24',
            WebkitTextStroke: isMobile ? '1px #1a0000' : isTablet ? '1.5px #1a0000' : '2px #1a0000',
            textShadow: `0 2px 0 #1a0000, 0 0 16px rgba(251,191,36,0.6)`,
            letterSpacing: '0.01em',
          }}>الحروف</span>

          {/* مع */}
          <span style={{
            fontSize: isMobile ? '0.85rem' : isTablet ? '1.1rem' : '1.6rem',
            fontWeight: 900,
            color: '#22d3ee',
            WebkitTextStroke: isMobile ? '1px #001a1a' : isTablet ? '1.5px #001a1a' : '1.5px #001a1a',
            textShadow: `0 2px 0 #001a1a, 0 0 12px rgba(34,211,238,0.5)`,
            letterSpacing: '0.01em',
          }}>مع</span>

          {/* اسم اللعبة — كل كلمة بلون مختلف */}
          {gameName.trim().split(/\s+/).map((word, i) => {
            const palette = [
              { color: '#ef4444', glow: 'rgba(239,68,68,0.5)'  },
              { color: '#fbbf24', glow: 'rgba(251,191,36,0.5)' },
              { color: '#a78bfa', glow: 'rgba(167,139,250,0.5)'},
              { color: '#34d399', glow: 'rgba(52,211,153,0.5)' },
            ];
            const p = palette[i % palette.length];
            return (
              <span key={i} style={{
                fontSize: isMobile ? '1.15rem' : isTablet ? '1.5rem' : '2.2rem',
                fontWeight: 900,
                color: p.color,
                WebkitTextStroke: isMobile ? '1px #0a0014' : isTablet ? '1.5px #0a0014' : '2px #0a0014',
                textShadow: `0 2px 0 #0a0014, 0 0 16px ${p.glow}`,
                letterSpacing: '0.01em',
              }}>{word}</span>
            );
          })}
        </div>
      )}

      {/* ══ ٢. لوحة النتيجة ══ */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: isSmall ? '0.45rem' : '0.85rem',
        background: 'linear-gradient(135deg, rgba(10,1,24,0.97) 0%, rgba(26,11,46,0.97) 100%)',
        backdropFilter: 'blur(24px)',
        border: '1.5px solid rgba(168,85,247,0.35)',
        borderRadius: isSmall ? '1rem' : '1.4rem',
        padding: isSmall ? '0.45rem 0.85rem' : '0.6rem 1.4rem',
        boxShadow: '0 6px 28px rgba(0,0,0,0.6), 0 0 0 1px rgba(168,85,247,0.08)',
      }}>

        {/* الفريق الأخضر */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isSmall ? '0.35rem' : '0.55rem', flexDirection: 'row-reverse' }}>
          <span style={{
            fontSize: isMobile ? '0.7rem' : isTablet ? '0.75rem' : '0.85rem',
            fontWeight: 800,
            color: '#10b981',
            maxWidth: isMobile ? '58px' : isTablet ? '68px' : '95px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{greenTeamName}</span>
          <div style={{ display: 'flex', gap: '3px' }}>
            {Array.from({ length: greenDots }).map((_, i) => (
              <div key={i} style={{
                width: dotSize, height: dotSize, borderRadius: '50%',
                background: i < greenScore ? 'linear-gradient(135deg,#10b981,#14b8a6)' : 'rgba(16,185,129,0.18)',
                border: `1.5px solid ${i < greenScore ? '#10b981' : 'rgba(16,185,129,0.3)'}`,
                boxShadow: i < greenScore ? '0 0 6px rgba(16,185,129,0.5)' : 'none',
                transition: 'all 0.3s',
                animation: i === greenScore - 1 ? 'dotPop 0.4s ease-out' : 'none',
              }} />
            ))}
          </div>
        </div>

        {/* رقم النتيجة */}
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: isMobile ? '0.25rem' : '0.4rem',
          padding: isMobile ? '0.2rem 0.5rem' : '0.25rem 0.7rem',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '0.7rem',
          border: '1px solid rgba(255,255,255,0.09)',
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: isMobile ? '1.1rem' : isTablet ? '1.25rem' : '1.55rem',
            fontWeight: 900, color: '#10b981', lineHeight: 1,
            textShadow: '0 0 10px rgba(16,185,129,0.4)',
          }}>{greenScore}</span>
          <span style={{ fontSize: isMobile ? '0.75rem' : '0.9rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>:</span>
          <span style={{
            fontSize: isMobile ? '1.1rem' : isTablet ? '1.25rem' : '1.55rem',
            fontWeight: 900, color: '#ef4444', lineHeight: 1,
            textShadow: '0 0 10px rgba(239,68,68,0.4)',
          }}>{redScore}</span>
        </div>

        {/* الفريق الأحمر */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isSmall ? '0.35rem' : '0.55rem' }}>
          <div style={{ display: 'flex', gap: '3px' }}>
            {Array.from({ length: redDots }).map((_, i) => (
              <div key={i} style={{
                width: dotSize, height: dotSize, borderRadius: '50%',
                background: i < redScore ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'rgba(239,68,68,0.18)',
                border: `1.5px solid ${i < redScore ? '#ef4444' : 'rgba(239,68,68,0.3)'}`,
                boxShadow: i < redScore ? '0 0 6px rgba(239,68,68,0.5)' : 'none',
                transition: 'all 0.3s',
                animation: i === redScore - 1 ? 'dotPop 0.4s ease-out' : 'none',
              }} />
            ))}
          </div>
          <span style={{
            fontSize: isMobile ? '0.7rem' : isTablet ? '0.75rem' : '0.85rem',
            fontWeight: 800,
            color: '#ef4444',
            maxWidth: isMobile ? '58px' : isTablet ? '68px' : '95px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{redTeamName}</span>
        </div>
      </div>

      {/* ══ ٣. معلومات الجولة — تحت اللوحة بالمنتصف ══ */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.4rem',
      }}>
        <span style={{
          fontSize: isMobile ? '0.6rem' : isTablet ? '0.65rem' : '0.7rem',
          fontWeight: 700,
          color: '#c4b5fd',
          background: 'rgba(168,85,247,0.15)',
          border: '1px solid rgba(168,85,247,0.3)',
          borderRadius: '0.45rem',
          padding: isMobile ? '0.1rem 0.45rem' : '0.15rem 0.55rem',
        }}>الجولة {currentRound}</span>

        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.55rem' }}>·</span>

        <span style={{
          fontSize: isMobile ? '0.6rem' : isTablet ? '0.65rem' : '0.7rem',
          fontWeight: 700,
          color: 'rgba(255,255,255,0.5)',
          background: 'rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '0.45rem',
          padding: isMobile ? '0.1rem 0.45rem' : '0.15rem 0.55rem',
          backdropFilter: 'blur(6px)',
        }}>
          {isInfinite ? '🎮 جولات مفتوحة' : `🏆 Best of ${rounds}`}
        </span>
      </div>

      {/* ══ بانر الفوز بالمباراة ══ */}
      {matchWinner && (
        <div style={{
          padding: isMobile ? '0.3rem 0.85rem' : '0.4rem 1.25rem',
          background: matchWinner === 'green'
            ? 'linear-gradient(135deg,rgba(16,185,129,0.28),rgba(20,184,166,0.18))'
            : 'linear-gradient(135deg,rgba(239,68,68,0.28),rgba(220,38,38,0.18))',
          backdropFilter: 'blur(12px)',
          border: `1.5px solid ${matchWinner === 'green' ? 'rgba(16,185,129,0.55)' : 'rgba(239,68,68,0.55)'}`,
          borderRadius: '1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
          animation: 'winnerPulse 1.2s ease-in-out infinite',
        }}>
          <span style={{ fontSize: isMobile ? '0.8rem' : '1rem' }}>🏆</span>
          <span style={{ fontSize: isMobile ? '0.7rem' : '0.85rem', fontWeight: 900, color: 'white' }}>
            {matchWinner === 'green' ? greenTeamName : redTeamName} فاز بالمباراة!
          </span>
        </div>
      )}

      <style>{`
        @keyframes dotPop {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.4); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes winnerPulse {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50%       { opacity: 1;    transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
};

export default MatchScoreTracker;

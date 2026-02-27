// src/components/MatchWinnerOverlay.tsx
// شاشة الفوز بالمباراة — متناسقة مع هوية حرب الحروف

import React from 'react';
import { createPortal } from 'react-dom';
import { Trophy, Star, Crown } from 'lucide-react';
import { useScreenSize } from '../hooks/useScreenSize';

interface MatchWinnerOverlayProps {
  winner: 'green' | 'red';
  winnerName: string;
  greenScore: number;
  redScore: number;
  greenTeamName: string;
  redTeamName: string;
  onNewSettings: () => void;
  onRestartMatch: () => void;
  onGoHome: () => void;
}

export const MatchWinnerOverlay: React.FC<MatchWinnerOverlayProps> = ({
  winner,
  winnerName,
  greenScore,
  redScore,
  greenTeamName,
  redTeamName,
  onNewSettings,
  onRestartMatch,
  onGoHome,
}) => {
  const { isMobile, isTablet } = useScreenSize();
  const isSmall = isMobile || isTablet;

  const winnerColor = winner === 'green' ? '#10b981' : '#ef4444';
  const winnerGlow  = winner === 'green' ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)';
  const winnerGrad  = winner === 'green'
    ? 'linear-gradient(135deg,#10b981,#14b8a6,#059669)'
    : 'linear-gradient(135deg,#ef4444,#dc2626,#b91c1c)';

  return createPortal(
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(180deg, rgba(5,0,15,0.98) 0%, rgba(15,5,35,0.98) 100%)',
      backdropFilter: 'blur(28px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5000,
      direction: 'rtl',
      animation: 'mwFadeIn 0.45s ease-out',
      padding: '1rem',
    }}>

      {/* جسيمات احتفالية */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(40)].map((_, i) => {
          const palette = [winnerColor, '#fbbf24', '#a855f7', '#ffffff', '#ec4899'];
          return (
            <div key={i} style={{
              position: 'absolute',
              width: `${2 + (i % 6)}px`,
              height: `${2 + (i % 6)}px`,
              borderRadius: i % 4 === 0 ? '0' : '50%',
              background: palette[i % palette.length],
              opacity: 0.65,
              left: `${(i * 41) % 100}%`,
              top: `${(i * 59) % 100}%`,
              animation: `mwFloat ${2 + (i % 4) * 0.6}s ease-in-out infinite`,
              animationDelay: `${(i * 0.11) % 2.5}s`,
            }} />
          );
        })}
      </div>

      {/* البطاقة الرئيسية */}
      <div style={{
        position: 'relative',
        maxWidth: isSmall ? '95vw' : '640px',
        width: '100%',
        background: 'linear-gradient(145deg, rgba(26,11,46,0.99), rgba(8,0,20,0.99))',
        border: `2px solid ${winnerColor}65`,
        borderRadius: isSmall ? '1.5rem' : '2.25rem',
        padding: isSmall ? '1.75rem 1.25rem' : '2.75rem 2.25rem',
        boxShadow: `0 0 80px ${winnerGlow}, 0 40px 100px rgba(0,0,0,0.7)`,
        textAlign: 'center',
        animation: 'mwSlideUp 0.55s cubic-bezier(0.34,1.56,0.64,1)',
        overflow: 'hidden',
      }}>

        {/* شريط علوي */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '5px',
          background: winnerGrad,
          borderRadius: '2rem 2rem 0 0',
        }} />

        {/* تاج + كأس */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: isSmall ? '1rem' : '1.5rem',
        }}>
          <Crown size={isSmall ? 28 : 40} color="#fbbf24" fill="#fbbf24"
            style={{ marginBottom: isSmall ? '0.3rem' : '0.5rem', filter: 'drop-shadow(0 0 12px rgba(251,191,36,0.8))' }} />
          <div style={{
            width: isSmall ? '80px' : '120px',
            height: isSmall ? '80px' : '120px',
            background: winnerGrad,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 50px ${winnerGlow}, 0 0 100px ${winnerGlow}`,
            border: '4px solid rgba(255,255,255,0.2)',
            animation: 'mwBounce 1.2s ease-in-out infinite',
          }}>
            <Trophy size={isSmall ? 40 : 62} color="white" strokeWidth={1.5} />
          </div>
        </div>

        {/* بطل المباراة */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          marginBottom: '0.4rem',
        }}>
          <Star size={isSmall ? 18 : 24} color="#fbbf24" fill="#fbbf24" />
          <span style={{
            fontSize: isSmall ? '1rem' : '1.2rem',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: '0.06em',
            fontFamily: "'Lalezar', sans-serif",
          }}>
            بطل اليوم!
          </span>
          <Star size={isSmall ? 18 : 24} color="#fbbf24" fill="#fbbf24" />
        </div>

        {/* اسم الفائز — عنوان بارز */}
        <div style={{
          fontSize: isSmall ? '1.8rem' : '2.8rem',
          fontWeight: 900,
          color: winnerColor,
          textShadow: `0 0 30px ${winnerGlow}`,
          marginBottom: isSmall ? '0.75rem' : '1.25rem',
          lineHeight: 1.15,
          fontFamily: "'Lalezar', sans-serif",
        }}>
          {winnerName} 🏆
        </div>

        {/* لوحة النتيجة النهائية */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: `1.5px solid ${winnerColor}35`,
          borderRadius: '1.25rem',
          padding: isSmall ? '0.9rem 1rem' : '1.25rem 2rem',
          marginBottom: isSmall ? '1.25rem' : '1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isSmall ? '1.25rem' : '3rem',
        }}>
          {/* أخضر */}
          <div style={{
            textAlign: 'center',
            opacity: winner === 'green' ? 1 : 0.4,
            transform: winner === 'green' ? 'scale(1.1)' : 'scale(1)',
            transition: 'all 0.3s',
          }}>
            <div style={{ fontSize: isSmall ? '0.7rem' : '0.85rem', color: '#10b981', fontWeight: 700, marginBottom: '0.3rem' }}>
              {greenTeamName}
            </div>
            <div style={{
              fontSize: isSmall ? '2.25rem' : '3.5rem',
              fontWeight: 900,
              color: '#10b981',
              lineHeight: 1,
              textShadow: winner === 'green' ? '0 0 20px rgba(16,185,129,0.5)' : 'none',
            }}>
              {greenScore}
            </div>
          </div>

          <div style={{ fontSize: isSmall ? '1.5rem' : '2.25rem', color: 'rgba(255,255,255,0.18)', fontWeight: 900 }}>
            :
          </div>

          {/* أحمر */}
          <div style={{
            textAlign: 'center',
            opacity: winner === 'red' ? 1 : 0.4,
            transform: winner === 'red' ? 'scale(1.1)' : 'scale(1)',
            transition: 'all 0.3s',
          }}>
            <div style={{ fontSize: isSmall ? '0.7rem' : '0.85rem', color: '#ef4444', fontWeight: 700, marginBottom: '0.3rem' }}>
              {redTeamName}
            </div>
            <div style={{
              fontSize: isSmall ? '2.25rem' : '3.5rem',
              fontWeight: 900,
              color: '#ef4444',
              lineHeight: 1,
              textShadow: winner === 'red' ? '0 0 20px rgba(239,68,68,0.5)' : 'none',
            }}>
              {redScore}
            </div>
          </div>
        </div>

        {/* الأزرار */}
        <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onNewSettings} style={{
            padding: isSmall ? '0.7rem 1.1rem' : '0.9rem 1.75rem',
            background: winnerGrad,
            border: 'none',
            borderRadius: '0.9rem',
            color: 'white',
            fontSize: isSmall ? '0.82rem' : '0.95rem',
            fontWeight: 900,
            cursor: 'pointer',
            boxShadow: `0 6px 24px ${winnerGlow}`,
            transition: 'transform 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            🎮 مباراة جديدة
          </button>

          <button onClick={onRestartMatch} style={{
            padding: isSmall ? '0.7rem 1.1rem' : '0.9rem 1.75rem',
            background: 'linear-gradient(135deg,#a855f7,#7c3aed)',
            border: 'none',
            borderRadius: '0.9rem',
            color: 'white',
            fontSize: isSmall ? '0.82rem' : '0.95rem',
            fontWeight: 900,
            cursor: 'pointer',
            boxShadow: '0 6px 24px rgba(168,85,247,0.4)',
            transition: 'transform 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            🔄 العب مرة ثانية
          </button>

          <button onClick={onGoHome} style={{
            padding: isSmall ? '0.7rem 1.1rem' : '0.9rem 1.75rem',
            background: 'rgba(255,255,255,0.07)',
            border: '1.5px solid rgba(255,255,255,0.2)',
            borderRadius: '0.9rem',
            color: 'rgba(255,255,255,0.7)',
            fontSize: isSmall ? '0.82rem' : '0.95rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.13)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
          >
            🏠 الرئيسية
          </button>
        </div>
      </div>

      <style>{`
        @keyframes mwFadeIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes mwSlideUp { from { opacity:0; transform:translateY(50px) scale(0.9); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes mwBounce  { 0%,100% { transform:translateY(0) rotate(-4deg); } 50% { transform:translateY(-18px) rotate(4deg); } }
        @keyframes mwFloat   { 0%,100% { opacity:0; transform:scale(0) translateY(0); } 50% { opacity:0.7; transform:scale(1) translateY(-25px); } }
      `}</style>
    </div>,
    document.body,
  );
};

export default MatchWinnerOverlay;

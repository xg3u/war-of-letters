// src/components/ResultsOverlay.tsx
// نافذة نتائج الجولة — متناسقة مع هوية حرب الحروف

import React from 'react';
import { createPortal } from 'react-dom';
import { Trophy, Star } from 'lucide-react';
import type { Team } from '../core/types';
import { useScreenSize } from '../hooks/useScreenSize';

interface ResultsOverlayProps {
  winner: Team | null;
  winType: 'wall-to-wall' | 'five-connected' | 'most-letters';
  winMessage: string;
  greenScore: number;
  redScore: number;
  greenTeamName: string;
  redTeamName: string;
  onClose?: () => void;
  onNewGame?: () => void;
}

export const ResultsOverlay: React.FC<ResultsOverlayProps> = ({
  winner,
  winType,
  winMessage,
  greenScore,
  redScore,
  greenTeamName,
  redTeamName,
  onClose,
  onNewGame,
}) => {
  const { isMobile, isTablet } = useScreenSize();
  const isSmall = isMobile || isTablet;

  const winnerColor  = winner === 'green' ? '#10b981' : winner === 'red' ? '#ef4444' : '#a855f7';
  const winnerGlow   = winner === 'green' ? 'rgba(16,185,129,0.45)' : winner === 'red' ? 'rgba(239,68,68,0.45)' : 'rgba(168,85,247,0.45)';
  const winnerGrad   = winner === 'green'
    ? 'linear-gradient(135deg,#10b981,#14b8a6,#059669)'
    : winner === 'red'
    ? 'linear-gradient(135deg,#ef4444,#dc2626,#b91c1c)'
    : 'linear-gradient(135deg,#a855f7,#7c3aed)';
  const winnerName   = winner === 'green' ? greenTeamName : winner === 'red' ? redTeamName : '';

  const winTypeLabel: Record<string, string> = {
    'wall-to-wall':   '🧱 وصّل الجدارين!',
    'five-connected': '🔗 خمس متصلة مع بعض!',
    'most-letters':   '📊 أكثر حروف!',
  };

  return createPortal(
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(180deg, rgba(5,0,15,0.97) 0%, rgba(15,5,35,0.97) 100%)',
      backdropFilter: 'blur(24px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5000,
      direction: 'rtl',
      animation: 'rwFadeIn 0.45s ease-out',
    }}>

      {/* جسيمات متطايرة */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(28)].map((_, i) => {
          const colors = [winnerColor, '#fbbf24', '#ffffff', '#a855f7'];
          return (
            <div key={i} style={{
              position: 'absolute',
              width: `${3 + (i % 5)}px`,
              height: `${3 + (i % 5)}px`,
              borderRadius: '50%',
              background: colors[i % colors.length],
              opacity: 0.6,
              left: `${(i * 37) % 100}%`,
              top: `${(i * 53) % 100}%`,
              animation: `rwFloat ${2.5 + (i % 3) * 0.7}s ease-in-out infinite`,
              animationDelay: `${(i * 0.13) % 2}s`,
            }} />
          );
        })}
      </div>

      {/* البطاقة الرئيسية */}
      <div style={{
        position: 'relative',
        maxWidth: isSmall ? '95vw' : '620px',
        width: '100%',
        background: 'linear-gradient(145deg, rgba(26,11,46,0.98), rgba(10,1,24,0.98))',
        border: `2px solid ${winnerColor}60`,
        borderRadius: isSmall ? '1.5rem' : '2rem',
        padding: isSmall ? '1.5rem 1.25rem' : '2.5rem 2rem',
        boxShadow: `0 0 60px ${winnerGlow}, 0 30px 80px rgba(0,0,0,0.6)`,
        textAlign: 'center',
        animation: 'rwSlideUp 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        overflow: 'hidden',
      }}>

        {/* شريط لوني علوي */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '4px',
          background: winnerGrad,
          borderRadius: '2rem 2rem 0 0',
        }} />

        {/* أيقونة الكأس */}
        <div style={{
          width: isSmall ? '72px' : '100px',
          height: isSmall ? '72px' : '100px',
          margin: '0 auto',
          marginBottom: isSmall ? '0.75rem' : '1.25rem',
          background: winnerGrad,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 40px ${winnerGlow}, 0 0 80px ${winnerGlow}`,
          border: '3px solid rgba(255,255,255,0.2)',
          animation: 'rwBounce 1.2s ease-in-out infinite',
        }}>
          <Trophy size={isSmall ? 34 : 50} color="white" strokeWidth={1.5} />
        </div>

        {/* فائز الجولة */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          marginBottom: '0.35rem',
        }}>
          <Star size={isSmall ? 16 : 20} color="#fbbf24" fill="#fbbf24" />
          <span style={{
            fontSize: isSmall ? '0.9rem' : '1.1rem',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.6)',
            letterSpacing: '0.05em',
            fontFamily: "'Lalezar', sans-serif",
          }}>
            اكتسح الجولة!
          </span>
          <Star size={isSmall ? 16 : 20} color="#fbbf24" fill="#fbbf24" />
        </div>

        {/* اسم الفريق الفائز */}
        <div style={{
          fontSize: isSmall ? '1.6rem' : '2.4rem',
          fontWeight: 900,
          color: winnerColor,
          textShadow: `0 0 24px ${winnerGlow}`,
          marginBottom: isSmall ? '0.6rem' : '1rem',
          lineHeight: 1.2,
          fontFamily: "'Lalezar', sans-serif",
        }}>
          {winnerName}
        </div>

        {/* نوع الفوز */}
        <div style={{
          display: 'inline-block',
          padding: isSmall ? '0.35rem 0.9rem' : '0.5rem 1.25rem',
          background: `${winnerColor}18`,
          border: `1.5px solid ${winnerColor}45`,
          borderRadius: '0.75rem',
          fontSize: isSmall ? '0.8rem' : '0.95rem',
          fontWeight: 700,
          color: winnerColor,
          marginBottom: isSmall ? '1rem' : '1.5rem',
        }}>
          {winTypeLabel[winType] ?? winMessage}
        </div>

        {/* لوحة النتيجة */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1.5px solid rgba(255,255,255,0.1)',
          borderRadius: '1.25rem',
          padding: isSmall ? '0.9rem 1rem' : '1.25rem 1.5rem',
          marginBottom: isSmall ? '1rem' : '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isSmall ? '1.25rem' : '2.5rem',
        }}>
          {/* أخضر */}
          <div style={{
            textAlign: 'center',
            opacity: winner === 'green' ? 1 : 0.45,
            transform: winner === 'green' ? 'scale(1.08)' : 'scale(1)',
          }}>
            <div style={{ fontSize: isSmall ? '0.7rem' : '0.82rem', color: '#10b981', fontWeight: 700, marginBottom: '0.3rem' }}>
              {greenTeamName}
            </div>
            <div style={{
              fontSize: isSmall ? '2rem' : '3rem',
              fontWeight: 900,
              color: '#10b981',
              textShadow: winner === 'green' ? '0 0 20px rgba(16,185,129,0.5)' : 'none',
              lineHeight: 1,
            }}>
              {greenScore}
            </div>
          </div>

          <div style={{ fontSize: isSmall ? '1.5rem' : '2rem', color: 'rgba(255,255,255,0.2)', fontWeight: 900 }}>
            :
          </div>

          {/* أحمر */}
          <div style={{
            textAlign: 'center',
            opacity: winner === 'red' ? 1 : 0.45,
            transform: winner === 'red' ? 'scale(1.08)' : 'scale(1)',
          }}>
            <div style={{ fontSize: isSmall ? '0.7rem' : '0.82rem', color: '#ef4444', fontWeight: 700, marginBottom: '0.3rem' }}>
              {redTeamName}
            </div>
            <div style={{
              fontSize: isSmall ? '2rem' : '3rem',
              fontWeight: 900,
              color: '#ef4444',
              textShadow: winner === 'red' ? '0 0 20px rgba(239,68,68,0.5)' : 'none',
              lineHeight: 1,
            }}>
              {redScore}
            </div>
          </div>
        </div>

        {/* أزرار التحكم — تظهر فقط في شاشة المقدم */}
        {(onNewGame || onClose) && (
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {onNewGame && (
              <button onClick={onNewGame} style={{
                padding: isSmall ? '0.7rem 1.4rem' : '0.9rem 2rem',
                background: winnerGrad,
                border: 'none',
                borderRadius: '0.9rem',
                color: 'white',
                fontSize: isSmall ? '0.9rem' : '1.05rem',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: `0 6px 24px ${winnerGlow}`,
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                🎮 جولة ثانية
              </button>
            )}
            {onClose && (
              <button onClick={onClose} style={{
                padding: isSmall ? '0.7rem 1.4rem' : '0.9rem 2rem',
                background: 'rgba(255,255,255,0.08)',
                border: '1.5px solid rgba(255,255,255,0.2)',
                borderRadius: '0.9rem',
                color: 'rgba(255,255,255,0.75)',
                fontSize: isSmall ? '0.9rem' : '1.05rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.13)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              >
                سكّر
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes rwFadeIn   { from { opacity:0; } to { opacity:1; } }
        @keyframes rwSlideUp  { from { opacity:0; transform:translateY(40px) scale(0.93); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes rwBounce   { 0%,100% { transform:translateY(0) rotate(-3deg); } 50% { transform:translateY(-14px) rotate(3deg); } }
        @keyframes rwFloat    { 0%,100% { opacity:0; transform:scale(0) translateY(0); } 50% { opacity:0.7; transform:scale(1) translateY(-20px); } }
      `}</style>
    </div>,
    document.body,
  );
};

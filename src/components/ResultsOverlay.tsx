// src/components/ResultsOverlay.tsx
// نافذة نتائج الجولة - تصميم عصري مشابه لـ MatchWinnerOverlay

import React from 'react';
import { Trophy, Star, Sparkles } from 'lucide-react';
import type { Team } from '../core/types';

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
  const winnerColor = winner === 'green' ? '#10b981' : winner === 'red' ? '#ef4444' : '#a855f7';
  const winnerGradient = winner === 'green'
    ? 'linear-gradient(135deg, #10b981, #14b8a6, #059669)'
    : winner === 'red'
    ? 'linear-gradient(135deg, #ef4444, #dc2626, #b91c1c)'
    : 'linear-gradient(135deg, #a855f7, #7c3aed, #6d28d9)';

  const getWinTypeIcon = () => {
    switch (winType) {
      case 'wall-to-wall': return '🧱';
      case 'five-connected': return '🔗';
      case 'most-letters': return '📊';
      default: return '🏆';
    }
  };

  const getWinTypeText = () => {
    switch (winType) {
      case 'wall-to-wall': return 'ربط الجدار من جانب للجانب';
      case 'five-connected': return '5 خلايا متصلة';
      case 'most-letters': return 'الأكثر حروفاً';
      default: return 'فوز';
    }
  };

  const winnerName = winner === 'green' ? greenTeamName : winner === 'red' ? redTeamName : '';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.95)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5000,
      animation: 'fadeIn 0.5s ease-out',
    }}>
      {/* الخلفية المتحركة */}
      <div style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        opacity: 0.3,
        pointerEvents: 'none',
      }}>
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: `${4 + Math.random() * 6}px`,
              height: `${4 + Math.random() * 6}px`,
              background: i % 3 === 0 ? winnerColor : i % 3 === 1 ? '#fbbf24' : '#ffffff',
              borderRadius: '50%',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `sparkle ${2 + Math.random() * 2}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* المحتوى الرئيسي */}
      <div style={{
        maxWidth: '700px',
        width: '90%',
        textAlign: 'center',
        animation: 'scaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        {/* الكأس */}
        <div style={{
          marginBottom: '1.5rem',
          animation: 'trophyBounce 1s ease-in-out infinite',
        }}>
          <div style={{
            width: '120px',
            height: '120px',
            margin: '0 auto',
            background: winnerGradient,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `
              0 0 60px ${winnerColor}80,
              0 0 120px ${winnerColor}40,
              inset 0 -5px 20px rgba(0,0,0,0.3)
            `,
            border: '4px solid rgba(255, 255, 255, 0.3)',
          }}>
            <Trophy size={60} color="white" strokeWidth={1.5} />
          </div>
        </div>

        {/* العنوان - فائز الجولة */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '0.75rem',
        }}>
          <Star size={28} color="#fbbf24" fill="#fbbf24" />
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 900,
            background: winnerGradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
          }}>
            فائز الجولة!
          </h1>
          <Star size={28} color="#fbbf24" fill="#fbbf24" />
        </div>

        {/* اسم الفائز */}
        <div style={{
          fontSize: '2rem',
          fontWeight: 900,
          color: 'white',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
        }}>
          <Sparkles size={28} color={winnerColor} />
          <span style={{ color: winnerColor }}>{winnerName}</span>
          <Sparkles size={28} color={winnerColor} />
        </div>

        {/* نوع الفوز */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 1.5rem',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '1rem',
          marginBottom: '1.5rem',
          border: `2px solid ${winnerColor}50`,
        }}>
          <span style={{ fontSize: '1.5rem' }}>{getWinTypeIcon()}</span>
          <span style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            color: 'white',
          }}>
            {getWinTypeText()}
          </span>
        </div>

        {/* النتيجة */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '1.5rem',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          border: `3px solid ${winnerColor}50`,
        }}>
          <div style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '0.9rem',
            fontWeight: 700,
            marginBottom: '1rem',
          }}>
            عدد الحروف
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2rem',
          }}>
            {/* الفريق الأخضر */}
            <div style={{
              textAlign: 'center',
              opacity: winner === 'green' ? 1 : 0.5,
              transform: winner === 'green' ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.3s ease',
            }}>
              <div style={{
                fontSize: '0.85rem',
                color: '#10b981',
                fontWeight: 700,
                marginBottom: '0.5rem',
              }}>
                {greenTeamName}
              </div>
              <div style={{
                fontSize: '3.5rem',
                fontWeight: 900,
                color: '#10b981',
                textShadow: winner === 'green' ? '0 0 20px rgba(16, 185, 129, 0.5)' : 'none',
              }}>
                {greenScore}
              </div>
            </div>

            {/* الفاصل */}
            <div style={{
              fontSize: '2.5rem',
              color: 'rgba(255, 255, 255, 0.3)',
              fontWeight: 900,
            }}>
              :
            </div>

            {/* الفريق الأحمر */}
            <div style={{
              textAlign: 'center',
              opacity: winner === 'red' ? 1 : 0.5,
              transform: winner === 'red' ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.3s ease',
            }}>
              <div style={{
                fontSize: '0.85rem',
                color: '#ef4444',
                fontWeight: 700,
                marginBottom: '0.5rem',
              }}>
                {redTeamName}
              </div>
              <div style={{
                fontSize: '3.5rem',
                fontWeight: 900,
                color: '#ef4444',
                textShadow: winner === 'red' ? '0 0 20px rgba(239, 68, 68, 0.5)' : 'none',
              }}>
                {redScore}
              </div>
            </div>
          </div>
        </div>

        {/* الأزرار - تظهر فقط في شاشة المقدم */}
        {(onNewGame || onClose) && (
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            {onNewGame && (
              <button
                onClick={onNewGame}
                style={{
                  padding: '1rem 2rem',
                  background: winnerGradient,
                  border: 'none',
                  borderRadius: '1rem',
                  color: 'white',
                  fontSize: '1.1rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: `0 8px 30px ${winnerColor}50`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                }}
              >
                جولة جديدة 🎮
              </button>
            )}

            {onClose && (
              <button
                onClick={onClose}
                style={{
                  padding: '1rem 2rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '1rem',
                  color: 'white',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                إغلاق
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes trophyBounce {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-15px) rotate(2deg); }
        }
        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

// src/components/ResultsOverlay.tsx
// نافذة النتائج النهائية

import React from 'react';
import { Trophy, Users,  } from 'lucide-react';
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

  const winnerColor = winner === 'green'
    ? 'linear-gradient(135deg, #10b981, #14b8a6)'
    : winner === 'red'
    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
    : 'linear-gradient(135deg, #a855f7, #ec4899)';

  const getWinTypeIcon = () => {
    switch (winType) {
      case 'wall-to-wall':
        return '🧱';
      case 'five-connected':
        return '🔗';
      case 'most-letters':
        return '🏆';
      default:
        return '🎉';
    }
  };

  const getWinTypeText = () => {
    switch (winType) {
      case 'wall-to-wall':
        return 'ربط الجدار من جانب للجانب';
      case 'five-connected':
        return '5 خلايا متصلة';
      case 'most-letters':
        return 'الأكثر حروفاً';
      default:
        return 'فوز';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.95)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5000,
      animation: 'fadeIn 0.5s ease-in-out',
    }}>
      {/* Confetti Animation */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}>
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: '10px',
              height: '10px',
              background: ['#10b981', '#ef4444', '#a855f7', '#fbbf24'][i % 4],
              top: `-${Math.random() * 100}px`,
              left: `${Math.random() * 100}%`,
              animation: `fall ${2 + Math.random() * 3}s linear infinite`,
              animationDelay: `${Math.random() * 2}s`,
              borderRadius: '50%',
            }}
          />
        ))}
      </div>

      {/* النافذة الرئيسية */}
      <div style={{
        maxWidth: '900px',
        width: '90%',
        background: winnerColor,
        border: '6px solid white',
        borderRadius: '2rem',
        padding: '4rem 2rem',
        textAlign: 'center',
        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.5)',
        animation: 'scaleUp 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* الأيقونة الرئيسية */}
        <div style={{
          fontSize: '8rem',
          marginBottom: '2rem',
          animation: 'bounce 1s infinite',
        }}>
          <Trophy size={120} color="white" style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))' }} />
        </div>

        {/* رسالة الفوز */}
        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 4rem)',
          fontWeight: 900,
          color: 'white',
          margin: '0 0 1rem 0',
          textShadow: '0 6px 20px rgba(0, 0, 0, 0.5)',
          animation: 'slideInFromTop 0.8s ease-out',
        }}>
          {winMessage}
        </h1>

        {/* نوع الفوز */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1rem 2rem',
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '1rem',
          marginBottom: '3rem',
          backdropFilter: 'blur(10px)',
        }}>
          <span style={{ fontSize: '2rem' }}>{getWinTypeIcon()}</span>
          <span style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'white',
          }}>
            {getWinTypeText()}
          </span>
        </div>

        {/* الإحصائيات */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2rem',
          marginBottom: '3rem',
        }}>

          {/* الفريق الأخضر */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '1.5rem',
            padding: '2rem',
            backdropFilter: 'blur(10px)',
            border: winner === 'green' ? '4px solid white' : '2px solid rgba(255, 255, 255, 0.3)',
            transform: winner === 'green' ? 'scale(1.05)' : 'scale(1)',
            transition: 'all 0.3s',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              marginBottom: '1rem',
            }}>
              <Users size={28} color="white" />
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: 900,
                color: 'white',
                margin: 0,
              }}>
                {greenTeamName}
              </h3>
            </div>

            <div style={{
              fontSize: '4rem',
              fontWeight: 900,
              color: 'white',
              textShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
            }}>
              {greenScore}
            </div>

            <div style={{
              fontSize: '1rem',
              color: 'rgba(255, 255, 255, 0.8)',
              marginTop: '0.5rem',
            }}>
              حرف
            </div>
          </div>

          {/* الفريق الأحمر */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '1.5rem',
            padding: '2rem',
            backdropFilter: 'blur(10px)',
            border: winner === 'red' ? '4px solid white' : '2px solid rgba(255, 255, 255, 0.3)',
            transform: winner === 'red' ? 'scale(1.05)' : 'scale(1)',
            transition: 'all 0.3s',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              marginBottom: '1rem',
            }}>
              <Users size={28} color="white" />
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: 900,
                color: 'white',
                margin: 0,
              }}>
                {redTeamName}
              </h3>
            </div>

            <div style={{
              fontSize: '4rem',
              fontWeight: 900,
              color: 'white',
              textShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
            }}>
              {redScore}
            </div>

            <div style={{
              fontSize: '1rem',
              color: 'rgba(255, 255, 255, 0.8)',
              marginTop: '0.5rem',
            }}>
              حرف
            </div>
          </div>
        </div>

        {/* الأزرار */}
        <div style={{
          display: 'flex',
          gap: '1.5rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          {onNewGame && (
            <button
              onClick={onNewGame}
              style={{
                padding: '1.25rem 3rem',
                background: 'white',
                color: winner === 'green' ? '#10b981' : winner === 'red' ? '#ef4444' : '#a855f7',
                border: 'none',
                borderRadius: '1rem',
                fontSize: '1.25rem',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 15px 40px rgba(0, 0, 0, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)';
              }}
            >
              🎮 جولة جديدة
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: '1.25rem 3rem',
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '2px solid white',
                borderRadius: '1rem',
                fontSize: '1.25rem',
                fontWeight: 900,
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              إغلاق
            </button>
          )}
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleUp {
          from {
            transform: scale(0.5);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }

        @keyframes slideInFromTop {
          from {
            transform: translateY(-50px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

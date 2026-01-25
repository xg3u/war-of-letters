// src/components/MatchVictoryOverlay.tsx
// 🏆 Match Victory Screen - Tournament Winner Announcement

import React from 'react';
import { Trophy, Zap, Users } from 'lucide-react';
import type { Team } from '../core/types';

interface MatchVictoryOverlayProps {
  matchWinner: Team | null;
  greenTeamName: string;
  redTeamName: string;
  matchScore: { green: number; red: number };
  roundsWon?: { green: number; red: number }; // Optional - not currently used
  totalRounds: number;
  onPlayAgain?: () => void;
  onClose?: () => void;
}

export const MatchVictoryOverlay: React.FC<MatchVictoryOverlayProps> = ({
  matchWinner,
  greenTeamName,
  redTeamName,
  matchScore,
  totalRounds,
  onPlayAgain,
  onClose,
}) => {
  const isGreenWinner = matchWinner === 'green';
  const winnerTeamName = isGreenWinner ? greenTeamName : redTeamName;
  const winnerColor = isGreenWinner
    ? 'linear-gradient(135deg, #10b981, #14b8a6)'
    : 'linear-gradient(135deg, #ef4444, #dc2626)';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.98)',
      backdropFilter: 'blur(30px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      animation: 'fadeIn 0.6s ease-in-out',
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
        {[...Array(80)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: `${5 + Math.random() * 10}px`,
              height: `${5 + Math.random() * 10}px`,
              background: ['#10b981', '#ef4444', '#a855f7', '#fbbf24', '#06b6d4'][i % 5],
              top: `-${Math.random() * 150}px`,
              left: `${Math.random() * 100}%`,
              animation: `fall ${3 + Math.random() * 4}s linear infinite`,
              animationDelay: `${Math.random() * 2.5}s`,
              borderRadius: '50%',
              opacity: 0.8,
            }}
          />
        ))}
      </div>

      {/* Celebration Sound Effect (optional - just for reference) */}
      <style>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        @keyframes bounce {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.1) translateY(-20px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes slideInFromTop {
          from {
            opacity: 0;
            transform: translateY(-50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes scaleUp {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>

      {/* Main Victory Card */}
      <div style={{
        maxWidth: '800px',
        width: '90%',
        background: winnerColor,
        border: '8px solid white',
        borderRadius: '3rem',
        padding: '5rem 3rem',
        textAlign: 'center',
        boxShadow: '0 50px 120px rgba(0, 0, 0, 0.8)',
        animation: 'scaleUp 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Trophy Icon with Pulse */}
        <div style={{
          fontSize: '10rem',
          marginBottom: '2rem',
          animation: 'bounce 1.5s infinite',
          textShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
        }}>
          🏆
        </div>

        {/* Congratulations Text */}
        <h1 style={{
          fontSize: 'clamp(2.5rem, 7vw, 5rem)',
          fontWeight: 900,
          color: 'white',
          margin: '0 0 1rem 0',
          textShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
          animation: 'slideInFromTop 1s ease-out',
          letterSpacing: '-1px',
        }}>
          مبروك! 🎉
        </h1>

        {/* Winner Team Name - Large and Prominent */}
        <div style={{
          fontSize: 'clamp(1.8rem, 5vw, 3.5rem)',
          fontWeight: 900,
          color: 'white',
          margin: '1.5rem 0 2rem 0',
          textShadow: '0 6px 25px rgba(0, 0, 0, 0.5)',
        }}>
          فريق <span style={{ fontStyle: 'italic' }}>{winnerTeamName}</span>
        </div>

        {/* Match Result Summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '2rem',
          marginBottom: '3rem',
          padding: '2rem',
          background: 'rgba(255, 255, 255, 0.15)',
          borderRadius: '2rem',
          backdropFilter: 'blur(20px)',
          border: '2px solid rgba(255, 255, 255, 0.2)',
        }}>
          {/* Green Team Stats */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.25)',
            borderRadius: '1.5rem',
            padding: '1.5rem',
            border: isGreenWinner ? '3px solid white' : '2px solid rgba(255, 255, 255, 0.3)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1rem',
              justifyContent: 'center',
            }}>
              <Users size={24} color="white" />
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white' }}>
                {greenTeamName}
              </span>
            </div>
            <div style={{
              fontSize: '3rem',
              fontWeight: 900,
              color: 'white',
              marginBottom: '0.5rem',
            }}>
              {matchScore.green}
            </div>
            <div style={{
              fontSize: '0.9rem',
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: 600,
            }}>
              جولات فائزة
            </div>
          </div>

          {/* Red Team Stats */}
          <div style={{
            background: 'rgba(239, 68, 68, 0.25)',
            borderRadius: '1.5rem',
            padding: '1.5rem',
            border: !isGreenWinner && matchWinner ? '3px solid white' : '2px solid rgba(255, 255, 255, 0.3)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1rem',
              justifyContent: 'center',
            }}>
              <Users size={24} color="white" />
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white' }}>
                {redTeamName}
              </span>
            </div>
            <div style={{
              fontSize: '3rem',
              fontWeight: 900,
              color: 'white',
              marginBottom: '0.5rem',
            }}>
              {matchScore.red}
            </div>
            <div style={{
              fontSize: '0.9rem',
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: 600,
            }}>
              جولات فائزة
            </div>
          </div>
        </div>

        {/* Match Statistics */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '2rem',
          padding: '2rem',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '1.5rem',
          marginBottom: '3rem',
          flexWrap: 'wrap',
        }}>
          <div style={{ textAlign: 'center' }}>
            <Zap size={32} color="white" style={{ marginBottom: '0.5rem' }} />
            <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.9rem', fontWeight: 600 }}>
              الجولات المتبقية
            </div>
            <div style={{ color: 'white', fontSize: '1.5rem', fontWeight: 900 }}>
              {totalRounds - (matchScore.green + matchScore.red)}
            </div>
          </div>

          <div style={{ fontSize: '2rem', color: 'rgba(255, 255, 255, 0.5)' }}>•</div>

          <div style={{ textAlign: 'center' }}>
            <Trophy size={32} color="white" style={{ marginBottom: '0.5rem' }} />
            <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.9rem', fontWeight: 600 }}>
              أفضل من
            </div>
            <div style={{ color: 'white', fontSize: '1.5rem', fontWeight: 900 }}>
              {totalRounds}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '1.5rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          {onPlayAgain && (
            <button
              onClick={onPlayAgain}
              style={{
                padding: '1.5rem 3.5rem',
                background: 'white',
                color: isGreenWinner ? '#10b981' : '#ef4444',
                border: 'none',
                borderRadius: '1.5rem',
                fontSize: 'clamp(1rem, 2vw, 1.5rem)',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 15px 40px rgba(0, 0, 0, 0.4)',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px) scale(1.05)';
                e.currentTarget.style.boxShadow = '0 25px 50px rgba(0, 0, 0, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 15px 40px rgba(0, 0, 0, 0.4)';
              }}
            >
              العب مجدداً 🎮
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: '1.5rem 3.5rem',
                background: 'rgba(255, 255, 255, 0.15)',
                color: 'white',
                border: '3px solid white',
                borderRadius: '1.5rem',
                fontSize: 'clamp(1rem, 2vw, 1.5rem)',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 15px 40px rgba(0, 0, 0, 0.4)',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                backdropFilter: 'blur(10px)',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px) scale(1.05)';
                e.currentTarget.style.boxShadow = '0 25px 50px rgba(0, 0, 0, 0.5)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 15px 40px rgba(0, 0, 0, 0.4)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              }}
            >
              إغلاق ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

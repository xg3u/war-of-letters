// src/components/MatchWinnerOverlay.tsx
// شاشة إعلان الفائز بالمباراة

import React from 'react';
import { Trophy, Star, Sparkles } from 'lucide-react';

interface MatchWinnerOverlayProps {
  winner: 'green' | 'red';
  winnerName: string;
  greenScore: number;
  redScore: number;
  greenTeamName: string;
  redTeamName: string;
  onNewSettings: () => void;  // الذهاب لشاشة الإعدادات
  onRestartMatch: () => void; // إعادة نفس المباراة
  onGoHome: () => void;       // العودة للصفحة الرئيسية
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
  const winnerColor = winner === 'green' ? '#10b981' : '#ef4444';
  const winnerGradient = winner === 'green'
    ? 'linear-gradient(135deg, #10b981, #14b8a6, #059669)'
    : 'linear-gradient(135deg, #ef4444, #dc2626, #b91c1c)';

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
        pointerEvents: 'none', // السماح بالنقر على الأزرار
      }}>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: '4px',
              height: '4px',
              background: winnerColor,
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
          marginBottom: '2rem',
          animation: 'trophyBounce 1s ease-in-out infinite',
        }}>
          <div style={{
            width: '150px',
            height: '150px',
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
            <Trophy size={80} color="white" strokeWidth={1.5} />
          </div>
        </div>

        {/* العنوان */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '1rem',
        }}>
          <Star size={32} color="#fbbf24" fill="#fbbf24" />
          <h1 style={{
            fontSize: '3rem',
            fontWeight: 900,
            background: winnerGradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
            textShadow: `0 0 30px ${winnerColor}50`,
          }}>
            بطل المباراة!
          </h1>
          <Star size={32} color="#fbbf24" fill="#fbbf24" />
        </div>

        {/* اسم الفائز */}
        <div style={{
          fontSize: '2.5rem',
          fontWeight: 900,
          color: 'white',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
        }}>
          <Sparkles size={36} color={winnerColor} />
          <span style={{ color: winnerColor }}>{winnerName}</span>
          <Sparkles size={36} color={winnerColor} />
        </div>

        {/* النتيجة النهائية */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '2rem',
          padding: '2rem',
          marginBottom: '2rem',
          border: `3px solid ${winnerColor}50`,
        }}>
          <div style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '1rem',
            fontWeight: 700,
            marginBottom: '1rem',
          }}>
            النتيجة النهائية
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
                fontSize: '0.9rem',
                color: '#10b981',
                fontWeight: 700,
                marginBottom: '0.5rem',
              }}>
                {greenTeamName}
              </div>
              <div style={{
                fontSize: '4rem',
                fontWeight: 900,
                color: '#10b981',
                textShadow: winner === 'green' ? '0 0 20px rgba(16, 185, 129, 0.5)' : 'none',
              }}>
                {greenScore}
              </div>
            </div>

            {/* الفاصل */}
            <div style={{
              fontSize: '3rem',
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
                fontSize: '0.9rem',
                color: '#ef4444',
                fontWeight: 700,
                marginBottom: '0.5rem',
              }}>
                {redTeamName}
              </div>
              <div style={{
                fontSize: '4rem',
                fontWeight: 900,
                color: '#ef4444',
                textShadow: winner === 'red' ? '0 0 20px rgba(239, 68, 68, 0.5)' : 'none',
              }}>
                {redScore}
              </div>
            </div>
          </div>
        </div>

        {/* الأزرار */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          {/* زر مباراة جديدة - للذهاب لشاشة الإعدادات */}
          <button
            onClick={onNewSettings}
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
            مباراة جديدة 🎮
          </button>

          {/* زر إعادة المباراة - نفس الإعدادات */}
          <button
            onClick={onRestartMatch}
            style={{
              padding: '1rem 2rem',
              background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
              border: 'none',
              borderRadius: '1rem',
              color: 'white',
              fontSize: '1.1rem',
              fontWeight: 900,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 30px rgba(168, 85, 247, 0.4)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
            }}
          >
            إعادة المباراة 🔄
          </button>

          {/* زر إغلاق - العودة للصفحة الرئيسية */}
          <button
            onClick={onGoHome}
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
            إغلاق 🏠
          </button>
        </div>
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

export default MatchWinnerOverlay;

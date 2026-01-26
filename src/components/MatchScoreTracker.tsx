// src/components/MatchScoreTracker.tsx
// عداد نتيجة المباراة - نظام Best of X

import React from 'react';

interface MatchScoreTrackerProps {
  greenScore: number;
  redScore: number;
  greenTeamName: string;
  redTeamName: string;
  totalRounds: number | 'infinite';
  currentRound: number;
}

export const MatchScoreTracker: React.FC<MatchScoreTrackerProps> = ({
  greenScore,
  redScore,
  greenTeamName,
  redTeamName,
  totalRounds,
  currentRound,
}) => {
  const isInfinite = totalRounds === 'infinite' || totalRounds === Infinity;
  const rounds = isInfinite ? 5 : totalRounds; // Default display for infinite
  const winsNeeded = isInfinite ? Infinity : Math.ceil(rounds / 2);

  // Check if match is won
  const matchWinner = greenScore >= winsNeeded ? 'green' : redScore >= winsNeeded ? 'red' : null;

  return (
    <div style={{
      position: 'fixed',
      top: '1rem',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.5rem',
    }}>
      {/* العنوان */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(10px)',
        padding: '0.35rem 1rem',
        borderRadius: '1rem',
        border: '1px solid rgba(168, 85, 247, 0.3)',
      }}>
        <span style={{
          color: 'rgba(255, 255, 255, 0.8)',
          fontSize: '0.75rem',
          fontWeight: 700,
        }}>
          {isInfinite ? '🎮 جولات مفتوحة' : `🏆 Best of ${rounds}`}
        </span>
      </div>

      {/* عداد النتيجة الرئيسي */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.9))',
        backdropFilter: 'blur(20px)',
        padding: '0.75rem 1.5rem',
        borderRadius: '1.5rem',
        border: '2px solid rgba(168, 85, 247, 0.4)',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
      }}>
        {/* الفريق الأخضر */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <span style={{
            color: '#10b981',
            fontSize: '0.85rem',
            fontWeight: 700,
            maxWidth: '80px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {greenTeamName}
          </span>

          {/* نقاط الفريق الأخضر */}
          <div style={{
            display: 'flex',
            gap: '0.35rem',
          }}>
            {Array.from({ length: isInfinite ? Math.max(greenScore, 3) : winsNeeded }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: i < greenScore
                    ? 'linear-gradient(135deg, #10b981, #14b8a6)'
                    : 'rgba(16, 185, 129, 0.2)',
                  border: i < greenScore
                    ? '2px solid #10b981'
                    : '2px solid rgba(16, 185, 129, 0.3)',
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
          gap: '0.5rem',
          padding: '0 0.5rem',
        }}>
          <div style={{
            fontSize: '1.75rem',
            fontWeight: 900,
            color: '#10b981',
            textShadow: '0 0 10px rgba(16, 185, 129, 0.5)',
          }}>
            {greenScore}
          </div>
          <div style={{
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '1.25rem',
            fontWeight: 900,
          }}>
            :
          </div>
          <div style={{
            fontSize: '1.75rem',
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
          gap: '0.5rem',
        }}>
          <div style={{
            display: 'flex',
            gap: '0.35rem',
          }}>
            {Array.from({ length: isInfinite ? Math.max(redScore, 3) : winsNeeded }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: i < redScore
                    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                    : 'rgba(239, 68, 68, 0.2)',
                  border: i < redScore
                    ? '2px solid #ef4444'
                    : '2px solid rgba(239, 68, 68, 0.3)',
                  boxShadow: i < redScore
                    ? '0 0 10px rgba(239, 68, 68, 0.5)'
                    : 'none',
                  transition: 'all 0.3s ease',
                  animation: i === redScore - 1 ? 'scorePopIn 0.5s ease-out' : 'none',
                }}
              />
            ))}
          </div>

          <span style={{
            color: '#ef4444',
            fontSize: '0.85rem',
            fontWeight: 700,
            maxWidth: '80px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {redTeamName}
          </span>
        </div>
      </div>

      {/* رقم الجولة الحالية */}
      {!matchWinner && (
        <div style={{
          background: 'rgba(168, 85, 247, 0.2)',
          backdropFilter: 'blur(10px)',
          padding: '0.25rem 0.75rem',
          borderRadius: '0.75rem',
          border: '1px solid rgba(168, 85, 247, 0.4)',
        }}>
          <span style={{
            color: '#c4b5fd',
            fontSize: '0.7rem',
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
          padding: '0.5rem 1rem',
          borderRadius: '1rem',
          border: `2px solid ${matchWinner === 'green' ? '#10b981' : '#ef4444'}`,
          animation: 'matchWinPulse 1s ease-in-out infinite',
        }}>
          <span style={{
            color: 'white',
            fontSize: '0.85rem',
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

// src/components/SharedUIComponents.tsx
// 🎨 Unified UI Library for Host & Player Screens
// Ensures perfect visual mirroring across all screens

import React from 'react';
import { Users } from 'lucide-react';
import type { CardType } from './ActionCardPanel';
import { StreakVisualizer } from './StreakVisualizer';

interface TeamPanelProps {
  teamName: string;
  score: number;
  cards: CardType[];
  teamColor: 'green' | 'red';
  streak: number;
  streakEnabled: boolean;
}

interface ScoreboardHeaderProps {
  currentRound: number;
  totalRounds: number;
  matchScore: { green: number; red: number };
}

// Card Icons
const CARD_ICONS: Record<CardType, string> = {
  freeze: '🧊',
  bomb: '💣',
  battle: '⚔️',
  shield: '🛡️',
  demonShuffle: '👹',
  speedUp: '⚡',
  luck: '🍀',
};

/**
 * 🎨 Unified Team Panel Component
 * Shared across HostScreen and PlayersScreen
 * Ensures consistent styling and layout
 */
export const SharedTeamPanel: React.FC<TeamPanelProps> = ({
  teamName,
  score,
  cards,
  teamColor,
  streak,
  streakEnabled,
}) => {
  const isGreen = teamColor === 'green';
  const colorValue = isGreen ? '#10b981' : '#ef4444';
  const gradientColor = isGreen
    ? 'linear-gradient(135deg, #10b981, #14b8a6)'
    : 'linear-gradient(135deg, #ef4444, #dc2626)';

  return (
    <div style={{
      width: '280px',
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(20px)',
      border: `2px solid rgba(${isGreen ? '16, 185, 129' : '239, 68, 68'}, 0.3)`,
      borderRadius: '1.5rem',
      padding: '2rem 1.5rem',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    }}>
      {/* Team Icon */}
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        background: gradientColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 4px 12px ${isGreen ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
        margin: '0 auto',
      }}>
        <Users size={28} color="white" />
      </div>

      {/* Team Name */}
      <h3 style={{
        fontSize: '1.25rem',
        fontWeight: 900,
        color: 'white',
        textAlign: 'center',
        margin: 0,
        marginBottom: '1rem',
      }}>
        {teamName}
      </h3>

      {/* Score */}
      <div style={{
        textAlign: 'center',
        marginBottom: '1rem',
      }}>
        <div style={{
          fontSize: '0.875rem',
          color: 'rgba(255, 255, 255, 0.7)',
          marginBottom: '0.5rem',
        }}>
          النقاط
        </div>
        <div style={{
          fontSize: '4rem',
          fontWeight: 900,
          color: colorValue,
          textShadow: `0 4px 12px ${isGreen ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
          lineHeight: 1,
        }}>
          {score}
        </div>
      </div>

      {/* Cards Inventory */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '1rem',
        padding: '1rem',
        minHeight: '80px',
      }}>
        <div style={{
          fontSize: '0.75rem',
          color: 'rgba(255, 255, 255, 0.6)',
          marginBottom: '0.75rem',
          textAlign: 'center',
        }}>
          البطاقات الممتلكة
        </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          justifyContent: 'center',
        }}>
          {cards.length > 0 ? (
            cards.map((card, idx) => (
              <div
                key={idx}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: isGreen
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(20, 184, 166, 0.3))'
                    : 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(220, 38, 38, 0.3))',
                  border: isGreen
                    ? '2px solid rgba(16, 185, 129, 0.5)'
                    : '2px solid rgba(239, 68, 68, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  transition: 'all 0.3s ease',
                }}
              >
                {CARD_ICONS[card]}
              </div>
            ))
          ) : (
            <div style={{
              color: 'rgba(255, 255, 255, 0.4)',
              fontSize: '0.875rem',
              textAlign: 'center',
              width: '100%',
            }}>
              لا توجد بطاقات
            </div>
          )}
        </div>
      </div>

      {/* 🔥 Fire/Sparkle Streak Visualizer */}
      <StreakVisualizer
        streak={streak}
        team={teamColor}
        enabled={streakEnabled}
      />
    </div>
  );
};

/**
 * 🎨 Unified Scoreboard Header
 * Title + Match Score + Round Tracker
 */
interface ScoreboardHeaderProps {
  currentRound: number;
  totalRounds: number;
  matchScore: { green: number; red: number };
}

export const SharedScoreboardHeader: React.FC<ScoreboardHeaderProps> = ({
  currentRound,
  totalRounds,
  matchScore,
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1.5rem',
    }}>
      {/* Title */}
      <h1 style={{
        fontSize: '2.5rem',
        fontWeight: 900,
        margin: 0,
        background: 'linear-gradient(135deg, #fbbf24 0%, #10b981 33%, #3b82f6 66%, #ef4444 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textShadow: '0 0 30px rgba(255, 255, 255, 0.5)',
      }}>
        حرب الحروف
      </h1>

      {/* Match Score (Tournament Level) */}
      {matchScore && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
          padding: '1rem 2rem',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '1rem',
          border: '2px solid rgba(251, 191, 36, 0.3)',
        }}>
          <div style={{
            textAlign: 'center',
            flex: 1,
          }}>
            <div style={{
              color: '#10b981',
              fontSize: '2rem',
              fontWeight: 900,
            }}>
              {matchScore.green}
            </div>
            <div style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.75rem',
              marginTop: '0.25rem',
            }}>
              أفضل من
            </div>
          </div>

          <div style={{
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '1.5rem',
          }}>
            vs
          </div>

          <div style={{
            textAlign: 'center',
            flex: 1,
          }}>
            <div style={{
              color: '#ef4444',
              fontSize: '2rem',
              fontWeight: 900,
            }}>
              {matchScore.red}
            </div>
            <div style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.75rem',
              marginTop: '0.25rem',
            }}>
              أفضل من
            </div>
          </div>
        </div>
      )}

      {/* Round Information */}
      <div style={{
        fontSize: '0.875rem',
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
      }}>
        الجولة {currentRound} من {totalRounds}
      </div>
    </div>
  );
};

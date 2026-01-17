// src/components/PlayersScreen.tsx
// شاشة اللاعبين - عرض فقط (Synchronized with HostScreen design)

import React from 'react';
import { Users } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { syncManager } from '../utils/SyncManager';
import { HexGrid } from './HexGrid';
import { CardAnimation } from './CardAnimation';
import type { CardType } from './ActionCardPanel';
import type { GameSettingsData } from './GameSettings';
import type { HexCell as HexCellType } from '../core/types';

// Card Icons Mapping (matching HostScreen)
const CARD_ICONS: Record<CardType, string> = {
  freeze: '🧊',
  bomb: '💣',
  battle: '⚔️',
  shield: '🛡️',
  demonShuffle: '👹',
  speedUp: '⚡',
  luck: '🍀',
};

interface PlayersScreenProps {
  settings: GameSettingsData;
  currentQuestion: string | null;
  selectedCell: HexCellType | null;
}

export const PlayersScreen: React.FC<PlayersScreenProps> = ({
  settings,
  currentQuestion,
  selectedCell,
}) => {
  const { cells, syncFromExternal, winner, winMessage, scores, teamCards } = useGameStore();
  const [cardAnimation, setCardAnimation] = React.useState<{ type: CardType | 'cardFound', message?: string } | null>(null);
  const [zoom, setZoom] = React.useState(1);

  // المزامنة فقط
  React.useEffect(() => {
    const unsubscribe = syncManager.subscribe((data) => {
      console.log('PlayersScreen received:', data.type);

      if (data.type === 'GRID_INITIALIZED') {
        console.log('Syncing grid:', data.cells?.length, 'cells');
        if (data.cells) {
          syncFromExternal(data.cells);
        }
        if (data.settings) {
          // تحديث الإعدادات أيضاً
          localStorage.setItem('current-game-settings', JSON.stringify(data.settings));
        }
      } else if (data.type === 'CELL_CLAIMED') {
        syncFromExternal(data.cells);
      } else if (data.type === 'CARD_USED') {
        setCardAnimation({
          type: data.cardType,
          message: data.message,
        });
      } else if (data.type === 'ZOOM_CHANGED' && typeof data.zoom === 'number') {
        setZoom(data.zoom);
      }
    });
    return unsubscribe;
  }, [syncFromExternal]);

  // Debug: عرض حالة الشبكة
  React.useEffect(() => {
    console.log('PlayersScreen cells:', cells.length);
  }, [cells]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 25%, #6366f1 50%, #4f46e5 75%, #3730a3 100%)',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '2rem',
    }}>

      {/* Main Layout: Left Panel | Center Area | Right Panel */}
      <div style={{
        display: 'flex',
        gap: '2rem',
        alignItems: 'flex-start',
        justifyContent: 'center',
        flex: 1,
      }}>

        {/* Left Panel - Green Team */}
        <div style={{
          width: '280px',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          border: '2px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '1.5rem',
          padding: '2rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        }}>
          {/* Team Icon */}
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981, #14b8a6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
            margin: '0 auto',
          }}>
            <Users size={28} color="white" />
          </div>

          {/* Team Name */}
          <div style={{
            textAlign: 'center',
            fontSize: '1.125rem',
            fontWeight: 700,
            color: '#10b981',
          }}>
            {settings.teamNames.green}
          </div>

          {/* Score */}
          <div style={{
            fontSize: '4rem',
            fontWeight: 900,
            color: '#10b981',
            textShadow: '0 4px 12px rgba(16, 185, 129, 0.5)',
            lineHeight: 1,
            textAlign: 'center',
          }}>
            {scores.green}
          </div>

          {/* Card Inventory */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '1rem',
            padding: '1rem',
            minHeight: '80px',
          }}>
            <div style={{
              fontSize: '0.875rem',
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '0.75rem',
              textAlign: 'center',
            }}>
              البطاقات الممتلكة
            </div>

            {teamCards.green.length > 0 ? (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                justifyContent: 'center',
              }}>
                {teamCards.green.map((card, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(20, 184, 166, 0.3))',
                      border: '2px solid rgba(16, 185, 129, 0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                    }}
                  >
                    {CARD_ICONS[card]}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '0.875rem',
                textAlign: 'center',
                padding: '1rem 0',
              }}>
                لا توجد بطاقات
              </div>
            )}
          </div>
        </div>

        {/* Center Area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2rem',
        }}>
          {/* Title */}
          <h1 style={{
            fontSize: '3rem',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #f97316, #ec4899, #a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
            textAlign: 'center',
          }}>
            حرب الحروف
          </h1>

          {/* Grid Area */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '500px',
          }}>
            {cells.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '1.5rem',
                fontWeight: 700,
                background: 'rgba(0, 0, 0, 0.3)',
                backdropFilter: 'blur(10px)',
                padding: '3rem',
                borderRadius: '1.5rem',
                border: '2px solid rgba(168, 85, 247, 0.3)',
              }}>
                ⏳ في انتظار بدء اللعبة من المقدم...
              </div>
            ) : (
              <HexGrid
                cells={cells}
                zoom={zoom}
                scale={1}
              />
            )}
          </div>
        </div>

        {/* Right Panel - Red Team */}
        <div style={{
          width: '280px',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          border: '2px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '1.5rem',
          padding: '2rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        }}>
          {/* Team Icon */}
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
            margin: '0 auto',
          }}>
            <Users size={28} color="white" />
          </div>

          {/* Team Name */}
          <div style={{
            textAlign: 'center',
            fontSize: '1.125rem',
            fontWeight: 700,
            color: '#ef4444',
          }}>
            {settings.teamNames.red}
          </div>

          {/* Score */}
          <div style={{
            fontSize: '4rem',
            fontWeight: 900,
            color: '#ef4444',
            textShadow: '0 4px 12px rgba(239, 68, 68, 0.5)',
            lineHeight: 1,
            textAlign: 'center',
          }}>
            {scores.red}
          </div>

          {/* Card Inventory */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '1rem',
            padding: '1rem',
            minHeight: '80px',
          }}>
            <div style={{
              fontSize: '0.875rem',
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '0.75rem',
              textAlign: 'center',
            }}>
              البطاقات الممتلكة
            </div>

            {teamCards.red.length > 0 ? (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                justifyContent: 'center',
              }}>
                {teamCards.red.map((card, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(220, 38, 38, 0.3))',
                      border: '2px solid rgba(239, 68, 68, 0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                    }}
                  >
                    {CARD_ICONS[card]}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '0.875rem',
                textAlign: 'center',
                padding: '1rem 0',
              }}>
                لا توجد بطاقات
              </div>
            )}
          </div>
        </div>
      </div>

      {/* نافذة السؤال (اختيارية) */}
      {settings.showQuestionsToTeams && currentQuestion && selectedCell && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: '600px',
          width: '90%',
          background: 'linear-gradient(135deg, #1a0b2e, #2d1154)',
          border: '3px solid rgba(168, 85, 247, 0.5)',
          borderRadius: '1.5rem',
          padding: '2rem',
          zIndex: 100,
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '1rem',
          }}>
            <div style={{
              display: 'inline-block',
              padding: '1rem 1.5rem',
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              borderRadius: '1rem',
              fontSize: '2.5rem',
              fontWeight: 900,
              color: 'white',
            }}>
              {selectedCell.letter}
            </div>
          </div>

          <div style={{
            color: 'white',
            fontSize: '1.25rem',
            fontWeight: 700,
            textAlign: 'center',
          }}>
            {currentQuestion}
          </div>

          <div style={{
            marginTop: '1rem',
            textAlign: 'center',
            color: '#a855f7',
            fontSize: '0.875rem',
          }}>
            ⏳ جاري الإجابة...
          </div>
        </div>
      )}

      {/* أنيميشن البطاقة */}
      {cardAnimation && (
        <CardAnimation
          type={cardAnimation.type}
          message={cardAnimation.message}
          onComplete={() => setCardAnimation(null)}
        />
      )}

      {/* نافذة الفوز */}
      {winner && winMessage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(15px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
        }}>
          <div style={{
            maxWidth: '800px',
            width: '90%',
            background: winner === 'green' 
              ? 'linear-gradient(135deg, #10b981, #14b8a6)'
              : 'linear-gradient(135deg, #ef4444, #dc2626)',
            border: '6px solid white',
            borderRadius: '2rem',
            padding: '4rem',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '8rem',
              marginBottom: '2rem',
            }}>
              🏆
            </div>

            <h2 style={{
              fontSize: '4rem',
              fontWeight: 900,
              color: 'white',
              margin: 0,
              textShadow: '0 4px 10px rgba(0, 0, 0, 0.5)',
            }}>
              {winMessage}
            </h2>
          </div>
        </div>
      )}
    </div>
  );
};
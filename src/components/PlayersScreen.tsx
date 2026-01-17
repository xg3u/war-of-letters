// src/components/PlayersScreen.tsx
// شاشة اللاعبين - عرض فقط

import React from 'react';
import { Users } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { syncManager } from '../utils/SyncManager';
import { HexGrid } from './HexGrid';
import { CardAnimation } from './CardAnimation';
import type { CardType } from './ActionCardPanel';
import type { GameSettingsData } from './GameSettings';
import type { HexCell as HexCellType } from '../core/types';

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
  const { cells, syncFromExternal, winner, winMessage } = useGameStore();
  const [cardAnimation, setCardAnimation] = React.useState<{ type: CardType | 'cardFound', message?: string } | null>(null);

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
      background: 'linear-gradient(135deg, #1a0b2e 0%, #2d1154 50%, #4c1d95 100%)',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    }}>
      
      {/* Header */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(10px)',
        padding: '1rem 1.5rem',
        borderRadius: '1rem',
        border: '2px solid rgba(168, 85, 247, 0.3)',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 900,
          color: 'white',
          margin: 0,
        }}>
          👥 شاشة اللاعبين
        </h1>
        <p style={{
          fontSize: '1rem',
          color: '#a855f7',
          margin: '0.5rem 0 0 0',
        }}>
          {settings.gameName}
        </p>
      </div>

      {/* المحتوى */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        flex: 1,
      }}>
        {/* الشبكة */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}>
          {cells.length === 0 ? (
            <div style={{
              textAlign: 'center',
              color: '#a855f7',
              fontSize: '1.5rem',
              fontWeight: 700,
            }}>
              ⏳ في انتظار بدء اللعبة من المقدم...
            </div>
          ) : (
            <HexGrid 
              cells={cells}
              zoom={1}
              scale={1}
            />
          )}
        </div>

        {/* لوحة المعلومات */}
        <div style={{
          width: '300px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          {/* الفريق الأخضر */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(10px)',
            padding: '1.5rem',
            borderRadius: '1rem',
            border: '2px solid rgba(16, 185, 129, 0.3)',
          }}>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: 900,
              color: '#10b981',
              margin: '0 0 1rem 0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <Users size={20} />
              {settings.teamNames.green}
            </h3>
            <div style={{
              fontSize: '3rem',
              fontWeight: 900,
              color: 'white',
              textAlign: 'center',
            }}>
              0
            </div>
          </div>

          {/* الفريق الأحمر */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(10px)',
            padding: '1.5rem',
            borderRadius: '1rem',
            border: '2px solid rgba(239, 68, 68, 0.3)',
          }}>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: 900,
              color: '#ef4444',
              margin: '0 0 1rem 0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <Users size={20} />
              {settings.teamNames.red}
            </h3>
            <div style={{
              fontSize: '3rem',
              fontWeight: 900,
              color: 'white',
              textAlign: 'center',
            }}>
              0
            </div>
          </div>

          {/* الجولة */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(10px)',
            padding: '1.5rem',
            borderRadius: '1rem',
            border: '2px solid rgba(168, 85, 247, 0.3)',
          }}>
            <div style={{
              color: '#a855f7',
              fontSize: '0.875rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
            }}>
              الجولة الحالية
            </div>
            <div style={{
              fontSize: '2rem',
              fontWeight: 900,
              color: 'white',
            }}>
              1 / {settings.rounds === 'infinite' ? '∞' : settings.rounds}
            </div>
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
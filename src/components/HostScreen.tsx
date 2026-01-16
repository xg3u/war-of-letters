// src/components/HostScreen.tsx
// شاشة المقدم الكاملة

import React, { useState } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Shuffle, 
  Palette, 
  CheckCircle2,
  RefreshCw,
  Users,
  Tv,
  Sparkles
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { syncManager } from '../utils/SyncManager';
import { HexGrid } from './HexGrid';
import { ActionCardPanel, type CardType } from './ActionCardPanel';
import { CardAnimation } from './CardAnimation';
import type { GameSettingsData } from './GameSettings';
import type { HexCell as HexCellType } from '../core/types';

interface HostScreenProps {
  settings: GameSettingsData;
  onBack: () => void;
}

export const HostScreen: React.FC<HostScreenProps> = ({ settings, onBack }) => {
  const { cells, claimCell, syncFromExternal, initializeGrid, winner, winMessage } = useGameStore();
  const [selectedCell, setSelectedCell] = useState<HexCellType | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [showQuestion, setShowQuestion] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [cardAnimation, setCardAnimation] = useState<{ type: CardType | 'cardFound', message?: string } | null>(null);
  const [showCardPanel, setShowCardPanel] = useState(false);
  const [teamCards, setTeamCards] = useState<{
    green: CardType[];
    red: CardType[];
  }>({
    green: ['freeze', 'bomb', 'shield'] as CardType[],
    red: ['battle', 'speedUp', 'luck'] as CardType[],
  });

  // تهيئة الشبكة عند التحميل
  React.useEffect(() => {
    initializeGrid();
  }, [initializeGrid]);

  // المزامنة
  React.useEffect(() => {
    const unsubscribe = syncManager.subscribe((data) => {
      if (data.type === 'CELL_CLAIMED') {
        syncFromExternal(data.cells);
      }
    });
    return unsubscribe;
  }, [syncFromExternal]);

  const handleOpenPlayersScreen = () => {
    const playersUrl = `${window.location.origin}${window.location.pathname}?screen=players`;
    window.open(playersUrl, '_blank');
  };

  const handleCellSelect = (cell: HexCellType) => {
    if (cell.status === 'unanswered') {
      setSelectedCell(cell);
      
      if (cell.hasCard) {
        setCardAnimation({
          type: 'cardFound',
          message: `الحرف "${cell.letter}" يحمل بطاقة! 🎁`,
        });
        
        setTimeout(() => {
          setCurrentQuestion(`سؤال تجريبي للحرف "${cell.letter}"؟`);
          setShowQuestion(true);
        }, 3500);
      } else {
        setCurrentQuestion(`سؤال تجريبي للحرف "${cell.letter}"؟`);
        setShowQuestion(true);
      }
    }
  };

  const handleTeamWin = (team: 'green' | 'red') => {
    if (selectedCell) {
      claimCell(selectedCell.id, team);
      setShowQuestion(false);
      setSelectedCell(null);
      setCurrentQuestion(null);
    }
  };

  const handleChangeQuestion = () => {
    setCurrentQuestion(`سؤال جديد للحرف "${selectedCell?.letter}"؟`);
  };

  const handleCardUse = (cardType: CardType, targetCellId: string) => {
    const messages: Record<CardType, string> = {
      freeze: 'تم تجميد الخلية! ❄️',
      bomb: 'انفجار! 💣',
      battle: 'معركة بين الفريقين! ⚔️',
      shield: 'تم حماية الخلية! 🛡️',
      demonShuffle: 'خلط عشوائي للحروف! 👹',
      speedUp: 'تسريع الوقت! ⚡',
      luck: 'حظ سعيد! 🍀',
    };

    setCardAnimation({
      type: cardType,
      message: messages[cardType],
    });

    syncManager.broadcast({
      type: 'CARD_USED',
      cardType,
      message: messages[cardType],
      targetCellId,
    });
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));

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
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        {/* الصف الأول */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(10px)',
          padding: '1rem 1.5rem',
          borderRadius: '1rem',
          border: '2px solid rgba(168, 85, 247, 0.3)',
        }}>
          <button
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '2px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '0.75rem',
              color: '#ef4444',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ← رجوع
          </button>

          <div style={{ textAlign: 'center' }}>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 900,
              color: 'white',
              margin: 0,
            }}>
              🎙️ شاشة المقدم
            </h1>
            <p style={{
              fontSize: '0.875rem',
              color: '#a855f7',
              margin: '0.25rem 0 0 0',
            }}>
              {settings.gameName}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {/* زر شاشة اللاعبين */}
            <button
              onClick={handleOpenPlayersScreen}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #10b981, #14b8a6)',
                border: 'none',
                borderRadius: '0.75rem',
                color: 'white',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}
            >
              <Tv size={20} />
              شاشة اللاعبين
            </button>

            {/* زر البطاقات */}
            {settings.enableCards && (
              <button
                onClick={() => setShowCardPanel(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                  border: 'none',
                  borderRadius: '0.75rem',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)',
                }}
              >
                <Sparkles size={20} />
                البطاقات
              </button>
            )}
          </div>
        </div>

        {/* أدوات التحكم */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.5rem',
          background: 'rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(10px)',
          padding: '1rem',
          borderRadius: '1rem',
          border: '2px solid rgba(168, 85, 247, 0.2)',
        }}>
          <button onClick={handleZoomOut} style={{
            padding: '0.75rem',
            background: 'rgba(59, 130, 246, 0.2)',
            border: '2px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '0.75rem',
            color: '#60a5fa',
            cursor: 'pointer',
          }} title="تصغير">
            <ZoomOut size={20} />
          </button>
          
          <button onClick={handleZoomIn} style={{
            padding: '0.75rem',
            background: 'rgba(59, 130, 246, 0.2)',
            border: '2px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '0.75rem',
            color: '#60a5fa',
            cursor: 'pointer',
          }} title="تكبير">
            <ZoomIn size={20} />
          </button>

          <button style={{
            padding: '0.75rem',
            background: 'rgba(236, 72, 153, 0.2)',
            border: '2px solid rgba(236, 72, 153, 0.3)',
            borderRadius: '0.75rem',
            color: '#ec4899',
            cursor: 'pointer',
          }} title="خلط الحروف">
            <Shuffle size={20} />
          </button>

          <button style={{
            padding: '0.75rem',
            background: 'rgba(168, 85, 247, 0.2)',
            border: '2px solid rgba(168, 85, 247, 0.3)',
            borderRadius: '0.75rem',
            color: '#a855f7',
            cursor: 'pointer',
          }} title="عكس الألوان">
            <Palette size={20} />
          </button>
        </div>
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
          <HexGrid 
            cells={cells}
            onCellClick={handleCellSelect}
            selectedCellId={selectedCell?.id}
            zoom={zoom}
            scale={1}
          />
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

      {/* نافذة السؤال */}
      {showQuestion && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '2rem',
        }}>
          <div style={{
            maxWidth: '800px',
            width: '100%',
            background: 'linear-gradient(135deg, #1a0b2e, #2d1154)',
            border: '3px solid rgba(168, 85, 247, 0.5)',
            borderRadius: '2rem',
            padding: '3rem',
          }}>
            <div style={{
              textAlign: 'center',
              marginBottom: '2rem',
            }}>
              <div style={{
                display: 'inline-block',
                padding: '1.5rem 2.5rem',
                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                borderRadius: '1.5rem',
                fontSize: '4rem',
                fontWeight: 900,
                color: 'white',
              }}>
                {selectedCell?.letter}
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '2px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '1.5rem',
              padding: '2rem',
              marginBottom: '2rem',
            }}>
              <div style={{
                color: 'white',
                fontSize: '1.5rem',
                fontWeight: 700,
              }}>
                {currentQuestion}
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1rem',
            }}>
              <button
                onClick={() => handleTeamWin('green')}
                style={{
                  padding: '1.5rem',
                  background: 'linear-gradient(135deg, #10b981, #14b8a6)',
                  border: 'none',
                  borderRadius: '1rem',
                  color: 'white',
                  fontSize: '1.125rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                }}
              >
                <CheckCircle2 size={24} />
                {settings.teamNames.green}
              </button>

              <button
                onClick={() => handleTeamWin('red')}
                style={{
                  padding: '1.5rem',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  border: 'none',
                  borderRadius: '1rem',
                  color: 'white',
                  fontSize: '1.125rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                }}
              >
                <CheckCircle2 size={24} />
                {settings.teamNames.red}
              </button>
            </div>

            <button
              onClick={handleChangeQuestion}
              style={{
                width: '100%',
                padding: '1.25rem',
                background: 'rgba(168, 85, 247, 0.2)',
                border: '2px solid rgba(168, 85, 247, 0.5)',
                borderRadius: '1rem',
                color: '#a855f7',
                fontSize: '1rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
              }}
            >
              <RefreshCw size={20} />
              تغيير السؤال
            </button>
          </div>
        </div>
      )}

      {/* لوحة البطاقات */}
      {showCardPanel && settings.enableCards && (
        <ActionCardPanel
          onCardUse={handleCardUse}
          enabledCards={settings.cardTypes}
          selectedCell={selectedCell?.id || null}
          teamCards={teamCards}
          onClose={() => setShowCardPanel(false)}
        />
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
          animation: 'fadeIn 0.5s ease',
        }}>
          <div style={{
            maxWidth: '600px',
            width: '90%',
            background: winner === 'green' 
              ? 'linear-gradient(135deg, #10b981, #14b8a6)'
              : 'linear-gradient(135deg, #ef4444, #dc2626)',
            border: '4px solid white',
            borderRadius: '2rem',
            padding: '3rem',
            textAlign: 'center',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
          }}>
            <div style={{
              fontSize: '5rem',
              marginBottom: '1rem',
              animation: 'bounce 1s ease infinite',
            }}>
              🏆
            </div>

            <h2 style={{
              fontSize: '3rem',
              fontWeight: 900,
              color: 'white',
              margin: '0 0 1rem 0',
              textShadow: '0 4px 10px rgba(0, 0, 0, 0.5)',
            }}>
              {winMessage}
            </h2>

            <button
              onClick={() => {
                const { resetGame, initializeGrid } = useGameStore.getState();
                resetGame();
                initializeGrid();
              }}
              style={{
                marginTop: '2rem',
                padding: '1.25rem 2.5rem',
                background: 'white',
                border: 'none',
                borderRadius: '1rem',
                color: winner === 'green' ? '#10b981' : '#ef4444',
                fontSize: '1.25rem',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
              }}
            >
              🔄 جولة جديدة
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
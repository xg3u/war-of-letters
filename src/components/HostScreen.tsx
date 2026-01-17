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
import { getSmartQuestion } from '../utils/questionEngine';
import { HexGrid } from './HexGrid';
import { ActionCardPanel, type CardType } from './ActionCardPanel';
import { CardAnimation } from './CardAnimation';
import { CardRoulette } from './CardRoulette';
import { ResultsOverlay } from './ResultsOverlay';
import type { GameSettingsData } from './GameSettings';
import type { HexCell as HexCellType } from '../core/types';
import { getWinStats } from '../utils/winChecker';

interface HostScreenProps {
  settings: GameSettingsData;
  onBack: () => void;
}

export const HostScreen: React.FC<HostScreenProps> = ({ settings, onBack }) => {
  const { cells, claimCell, syncFromExternal, initializeGrid, winner, winMessage, currentRound, scores, resetGame } = useGameStore();
  const [selectedCell, setSelectedCell] = useState<HexCellType | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [showQuestion, setShowQuestion] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [cardAnimation, setCardAnimation] = useState<{ type: CardType | 'cardFound', message?: string } | null>(null);
  const [showCardPanel, setShowCardPanel] = useState(false);
  const [showRoulette, setShowRoulette] = useState(false);
  const [teamCards] = useState<{
    green: CardType[];
    red: CardType[];
  }>({
    green: ['freeze', 'bomb', 'shield'] as CardType[],
    red: ['battle', 'speedUp', 'luck'] as CardType[],
  });

  // تهيئة الشبكة عند التحميل
  React.useEffect(() => {
    initializeGrid(settings);
  }, [initializeGrid, settings]);

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

  const handleCellSelect = async (cell: HexCellType) => {
    if (cell.status === 'unanswered') {
      setSelectedCell(cell);
      
      if (cell.hasCard) {
        // عرض الروليت
        setShowRoulette(true);
      } else {
        // جلب سؤال ذكي من Supabase
        const question = await getSmartQuestion(
          cell.letter, 
          settings.selectedCategories
        );
        
        if (question) {
          setCurrentQuestion(question.question_text);
          setShowQuestion(true);
        } else {
          // لا يوجد أسئلة
          setCurrentQuestion(`⚠️ لا توجد أسئلة متاحة للحرف "${cell.letter}" في التصنيفات المختارة!`);
          setShowQuestion(true);
        }
      }
    }
  };

  const handleRouletteComplete = async (card: CardType) => {
    setShowRoulette(false);
    
    // إضافة البطاقة للفريق الفائز
    setCardAnimation({
      type: 'cardFound',
      message: `مبروك! حصلت على بطاقة ${card}! 🎁`,
    });
    
    setTimeout(async () => {
      // جلب سؤال ذكي
      const question = await getSmartQuestion(
        selectedCell?.letter || '', 
        settings.selectedCategories
      );
      
      if (question) {
        setCurrentQuestion(question.question_text);
      } else {
        setCurrentQuestion(`سؤال تجريبي للحرف "${selectedCell?.letter}"؟`);
      }
      setShowQuestion(true);
    }, 3500);
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

  // عكس الألوان - تبديل الفرق
  const handleToggleColors = () => {
    const updatedCells = cells.map(cell => {
      if (cell.status === 'green') {
        return { ...cell, status: 'red' as const };
      } else if (cell.status === 'red') {
        return { ...cell, status: 'green' as const };
      }
      return cell;
    });

    syncManager.broadcast({
      type: 'GRID_INITIALIZED',
      cells: updatedCells,
      settings,
    });

    syncFromExternal(updatedCells);
  };

  // اختيار حرف عشوائي
  const handleRandomLetter = () => {
    const unansweredCells = cells.filter(c => c.status === 'unanswered');
    if (unansweredCells.length > 0) {
      const randomCell = unansweredCells[Math.floor(Math.random() * unansweredCells.length)];
      handleCellSelect(randomCell);
    }
  };

  // إعادة تعيين الجولة
  const handleResetRound = () => {
    if (window.confirm('هل تريد إعادة تعيين الجولة الحالية؟')) {
      resetGame();
      initializeGrid(settings);
    }
  };

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
          flexDirection: 'column',
          gap: '1rem',
          background: 'rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(10px)',
          padding: '1rem',
          borderRadius: '1rem',
          border: '2px solid rgba(168, 85, 247, 0.2)',
        }}>
          {/* الصف الأول - أزرار التحكم */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '0.5rem',
          }}>
            <button onClick={handleZoomOut} style={{
              padding: '0.75rem',
              background: 'rgba(59, 130, 246, 0.2)',
              border: '2px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '0.75rem',
              color: '#60a5fa',
              cursor: 'pointer',
              transition: 'all 0.2s',
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
              transition: 'all 0.2s',
            }} title="تكبير">
              <ZoomIn size={20} />
            </button>

            <button onClick={handleRandomLetter} style={{
              padding: '0.75rem',
              background: 'rgba(236, 72, 153, 0.2)',
              border: '2px solid rgba(236, 72, 153, 0.3)',
              borderRadius: '0.75rem',
              color: '#ec4899',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }} title="حرف عشوائي">
              <Shuffle size={20} />
            </button>

            <button onClick={handleToggleColors} style={{
              padding: '0.75rem',
              background: 'rgba(168, 85, 247, 0.2)',
              border: '2px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '0.75rem',
              color: '#a855f7',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }} title="عكس الألوان">
              <Palette size={20} />
            </button>

            <button onClick={handleResetRound} style={{
              padding: '0.75rem',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '2px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '0.75rem',
              color: '#ef4444',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }} title="إعادة الجولة">
              <RefreshCw size={20} />
            </button>
          </div>

          {/* الصف الثاني - شريط الزووم */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0 1rem',
          }}>
            <span style={{
              color: '#a855f7',
              fontSize: '0.875rem',
              fontWeight: 700,
              minWidth: '60px',
            }}>
              التكبير:
            </span>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              style={{
                flex: 1,
                height: '6px',
                borderRadius: '3px',
                background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.3), rgba(168, 85, 247, 0.6))',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
            <span style={{
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: 700,
              minWidth: '50px',
              textAlign: 'center',
            }}>
              {Math.round(zoom * 100)}%
            </span>
          </div>
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
              {scores.green}
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#10b981',
              marginTop: '0.5rem',
            }}>
              نقاط الفوز
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
              {scores.red}
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#ef4444',
              marginTop: '0.5rem',
            }}>
              نقاط الفوز
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
              {currentRound} / {settings.rounds === 'infinite' ? '∞' : settings.rounds}
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

      {/* روليت البطاقات */}
      {showRoulette && (
        <CardRoulette
          onComplete={handleRouletteComplete}
        />
      )}

      {/* نافذة النتائج */}
      {winner && winMessage && (
        <ResultsOverlay
          winner={winner}
          winType={(winMessage.includes('ربط الجدار') ? 'wall-to-wall' :
                   winMessage.includes('5 خلايا') ? 'five-connected' :
                   'most-letters') as 'wall-to-wall' | 'five-connected' | 'most-letters'}
          winMessage={winMessage}
          greenScore={getWinStats(cells).greenCount}
          redScore={getWinStats(cells).redCount}
          greenTeamName={settings.teamNames.green}
          redTeamName={settings.teamNames.red}
          onClose={() => {
            const { resetGame } = useGameStore.getState();
            resetGame();
          }}
          onNewGame={() => {
            const { resetGame, initializeGrid, nextRound, currentRound, settings: storeSettings } = useGameStore.getState();
            const maxRounds = storeSettings.rounds === 'infinite' ? Infinity : storeSettings.rounds;

            if (currentRound < maxRounds) {
              // جولة جديدة
              nextRound();
              resetGame();
              initializeGrid();
            } else {
              // انتهت اللعبة
              resetGame();
              initializeGrid();
            }
          }}
        />
      )}
    </div>
  );
};
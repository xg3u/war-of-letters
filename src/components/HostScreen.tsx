// src/components/HostScreen.tsx
// شاشة المقدم المُعاد تصميمها - تطابق الهوية البصرية النهائية

import React, { useState } from 'react';
import {
  Shuffle,
  Palette,
  CheckCircle2,
  RefreshCw,
  Users,
  Tv,
  Sparkles,
  Maximize,
  PartyPopper,
  Pause,
  Dices
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

// أيقونات البطاقات
const CARD_ICONS: Record<CardType, string> = {
  freeze: '🧊',
  bomb: '💣',
  battle: '⚔️',
  shield: '🛡️',
  demonShuffle: '👹',
  speedUp: '⚡',
  luck: '🍀',
};

export const HostScreen: React.FC<HostScreenProps> = ({ settings }) => {
  const {
    cells,
    claimCell,
    syncFromExternal,
    initializeGrid,
    winner,
    winMessage,
    scores,
    resetGame,
    teamCards,
    addCardToTeam,
    isLocked,
    setLocked
  } = useGameStore();

  const [selectedCell, setSelectedCell] = useState<HexCellType | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [showQuestion, setShowQuestion] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [cardAnimation, setCardAnimation] = useState<{ type: CardType | 'cardFound', message?: string } | null>(null);
  const [showCardPanel, setShowCardPanel] = useState(false);
  const [showRoulette, setShowRoulette] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pendingCard, setPendingCard] = useState<CardType | null>(null); // Card waiting to be awarded to winning team

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
    // 🔒 ACTION LOCK: Prevent cell selection during active processes
    if (isLocked) {
      console.warn('⚠️ Action blocked: Game is locked during roulette/question');
      return;
    }

    if (cell.status === 'unanswered') {
      setSelectedCell(cell);

      // 🔒 LOCK the game when starting roulette or question
      setLocked(true);

      // إذا كانت الخلية تحتوي على بطاقة مخفية أو حرف ذهبي، عرض الروليت
      if (cell.hasCard || cell.isGolden) {
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

    // Store pending card (to be awarded to team that answers correctly)
    setPendingCard(card);

    // Show card found animation
    setCardAnimation({
      type: 'cardFound',
      message: `ظهرت بطاقة ${CARD_ICONS[card]}! أجب على السؤال لتحصل عليها 🎁`,
    });

    setTimeout(async () => {
      setCardAnimation(null);

      // Fetch smart question from Supabase
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
      // Claim the cell for the winning team
      claimCell(selectedCell.id, team);

      // Award pending card to the winning team (if any)
      if (pendingCard) {
        addCardToTeam(team, pendingCard);

        // Show card awarded animation
        setCardAnimation({
          type: pendingCard,
          message: `مبروك! فاز الفريق ${team === 'green' ? 'الأخضر' : 'الأحمر'} بالبطاقة ${CARD_ICONS[pendingCard]}! 🎉`,
        });

        // Clear pending card
        setPendingCard(null);

        // Clear animation after delay
        setTimeout(() => {
          setCardAnimation(null);
        }, 3000);
      }

      // Reset question UI
      setShowQuestion(false);
      setSelectedCell(null);
      setCurrentQuestion(null);

      // 🔓 UNLOCK the game after answer is processed
      setLocked(false);
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

  // عكس الألوان - تبديل الفرق
  const handleToggleColors = () => {
    // Swap wall/perimeter win directions (horizontal ↔ vertical)
    // Do NOT swap cell ownership
    const updatedSettings = {
      ...settings,
      teamColors: {
        green: settings.teamColors.red,
        red: settings.teamColors.green,
      },
    };

    // Update local storage
    localStorage.setItem('current-game-settings', JSON.stringify(updatedSettings));

    // Broadcast settings update
    syncManager.broadcast({
      type: 'SETTINGS_UPDATED',
      settings: updatedSettings,
    });

    // Reinitialize grid with new settings (preserves current cell states)
    initializeGrid(updatedSettings);
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

  // Fullscreen
  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Confetti
  const handleConfetti = () => {
    // يمكن إضافة مكتبة confetti لاحقاً
    console.log('🎉 Confetti!');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 25%, #6366f1 50%, #4f46e5 75%, #3730a3 100%)',
      padding: '1.5rem',
      display: 'flex',
      gap: '1.5rem',
      position: 'relative',
    }}>

      {/* لوحة الفريق الأيمن (الأخضر) */}
      <div style={{
        width: '280px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        {/* بطاقة الفريق */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          border: '2px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '1.5rem',
          padding: '2rem 1.5rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        }}>
          {/* اسم الفريق */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            marginBottom: '1.5rem',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981, #14b8a6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
            }}>
              <Users size={28} color="white" />
            </div>
          </div>

          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 900,
            color: 'white',
            textAlign: 'center',
            marginBottom: '1rem',
          }}>
            {settings.teamNames.green}
          </h3>

          {/* النقاط */}
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
              color: '#10b981',
              textShadow: '0 4px 12px rgba(16, 185, 129, 0.5)',
              lineHeight: 1,
            }}>
              {scores.green}
            </div>
          </div>

          {/* البطاقات المملوكة */}
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
              {teamCards.green.length > 0 ? (
                teamCards.green.map((card, idx) => (
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
        </div>
      </div>

      {/* المنطقة الوسطى */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}>
        {/* العنوان */}
        <div style={{
          textAlign: 'center',
        }}>
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
        </div>

        {/* الشبكة */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '500px',
        }}>
          {/* 🔒 Overlay when locked */}
          {isLocked && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(2px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              pointerEvents: 'all',
            }}>
              <div style={{
                background: 'rgba(168, 85, 247, 0.2)',
                border: '2px solid rgba(168, 85, 247, 0.5)',
                borderRadius: '1rem',
                padding: '1rem 2rem',
                color: '#e9d5ff',
                fontSize: '1.25rem',
                fontWeight: 700,
              }}>
                🔒 جاري المعالجة...
              </div>
            </div>
          )}
          <HexGrid
            cells={cells}
            onCellClick={handleCellSelect}
            selectedCellId={selectedCell?.id}
            zoom={zoom}
            scale={1}
          />
        </div>

        {/* شريط التحكم الطافي */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.75rem',
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(20px)',
          padding: '1rem 1.5rem',
          borderRadius: '2rem',
          border: '2px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          alignSelf: 'center',
        }}>
          {/* Zoom Slider */}
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={zoom}
            onChange={(e) => {
              const newZoom = parseFloat(e.target.value);
              setZoom(newZoom);
              // Broadcast zoom change to player screens
              syncManager.broadcast({ type: 'ZOOM_CHANGED', zoom: newZoom });
            }}
            style={{
              width: '120px',
              height: '6px',
              borderRadius: '3px',
              background: 'linear-gradient(90deg, #a855f7, #ec4899)',
              outline: 'none',
              cursor: 'pointer',
            }}
          />

          {/* الأزرار - 🔒 معطلة أثناء القفل */}
          <ControlButton onClick={handleResetRound} color="#ef4444" icon={<RefreshCw size={20} />} title="إعادة الجولة" disabled={isLocked} />
          <ControlButton onClick={handleFullscreen} color="#3b82f6" icon={<Maximize size={20} />} title="ملء الشاشة" disabled={false} />
          <ControlButton onClick={handleConfetti} color="#fbbf24" icon={<PartyPopper size={20} />} title="احتفال" disabled={false} />
          <ControlButton onClick={() => setIsPaused(!isPaused)} color="#8b5cf6" icon={<Pause size={20} />} title="إيقاف مؤقت" disabled={isLocked} />
          <ControlButton onClick={handleRandomLetter} color="#ec4899" icon={<Dices size={20} />} title="حرف عشوائي" disabled={isLocked} />
          <ControlButton onClick={handleToggleColors} color="#a855f7" icon={<Palette size={20} />} title="عكس الألوان" disabled={isLocked} />
          <ControlButton onClick={handleRandomLetter} color="#10b981" icon={<Shuffle size={20} />} title="خلط" disabled={isLocked} />
          <ControlButton onClick={handleOpenPlayersScreen} color="#14b8a6" icon={<Tv size={20} />} title="شاشة اللاعبين" disabled={false} />
          <ControlButton onClick={() => setShowCardPanel(true)} color="#f97316" icon={<Sparkles size={20} />} title="البطاقات" disabled={isLocked} />
        </div>
      </div>

      {/* لوحة الفريق الأيسر (الأحمر) */}
      <div style={{
        width: '280px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        {/* بطاقة الفريق */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          border: '2px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '1.5rem',
          padding: '2rem 1.5rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        }}>
          {/* اسم الفريق */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            marginBottom: '1.5rem',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
            }}>
              <Users size={28} color="white" />
            </div>
          </div>

          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 900,
            color: 'white',
            textAlign: 'center',
            marginBottom: '1rem',
          }}>
            {settings.teamNames.red}
          </h3>

          {/* النقاط */}
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
              color: '#ef4444',
              textShadow: '0 4px 12px rgba(239, 68, 68, 0.5)',
              lineHeight: 1,
            }}>
              {scores.red}
            </div>
          </div>

          {/* البطاقات المملوكة */}
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
              {teamCards.red.length > 0 ? (
                teamCards.red.map((card, idx) => (
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

              {/* Card Prize Indicator */}
              {pendingCard && (
                <div style={{
                  marginTop: '1.5rem',
                  padding: '1rem 2rem',
                  background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(249, 115, 22, 0.2))',
                  border: '2px solid rgba(251, 191, 36, 0.5)',
                  borderRadius: '1rem',
                  display: 'inline-block',
                }}>
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    color: '#fbbf24',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}>
                    <span style={{ fontSize: '2rem' }}>{CARD_ICONS[pendingCard]}</span>
                    <span>الفريق الفائز يحصل على هذه البطاقة!</span>
                  </div>
                </div>
              )}
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

// مكون زر التحكم
const ControlButton: React.FC<{
  onClick: () => void;
  color: string;
  icon: React.ReactNode;
  title: string;
  disabled?: boolean; // 🔒 Support disabled state
}> = ({ onClick, color, icon, title, disabled = false }) => (
  <button
    onClick={disabled ? undefined : onClick}
    title={disabled ? '🔒 معطل أثناء المعالجة' : title}
    disabled={disabled}
    style={{
      width: '48px',
      height: '48px',
      borderRadius: '12px',
      background: disabled ? 'rgba(100, 100, 100, 0.3)' : `${color}33`,
      border: disabled ? '2px solid rgba(100, 100, 100, 0.5)' : `2px solid ${color}66`,
      color: disabled ? 'rgba(200, 200, 200, 0.5)' : color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'all 0.2s',
    }}
    onMouseEnter={(e) => {
      if (!disabled) {
        e.currentTarget.style.background = `${color}66`;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }
    }}
    onMouseLeave={(e) => {
      if (!disabled) {
        e.currentTarget.style.background = `${color}33`;
        e.currentTarget.style.transform = 'translateY(0)';
      }
    }}
  >
    {icon}
  </button>
);

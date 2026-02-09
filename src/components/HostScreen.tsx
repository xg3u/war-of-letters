// src/components/HostScreen.tsx
// شاشة المقدم المُعاد تصميمها - تطابق الهوية البصرية النهائية

import React, { useState } from 'react';
import {
  Palette,
  CheckCircle2,
  RefreshCw,
  Users,
  Tv,
  Sparkles,
  Maximize,
  Pause,
  Dices,
  Play
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { syncManager } from '../utils/SyncManager';
import { getSmartQuestion } from '../utils/questionEngine';
import { HexGrid } from './HexGrid';
import { ActionCardPanel } from './ActionCardPanel';
import { CardAnimation } from './CardAnimation';
import { CardRoulette } from './CardRoulette';
import { ResultsOverlay } from './ResultsOverlay';
import { StreakVisualizer } from './StreakVisualizer';
import { MatchScoreTracker } from './MatchScoreTracker';
import { MatchWinnerOverlay } from './MatchWinnerOverlay';
import type { GameSettingsData } from './GameSettings';
import type { HexCell as HexCellType, CardType } from '../core/types';
import { getWinStats } from '../utils/winChecker';

interface HostScreenProps {
  settings: GameSettingsData;
  onBack: () => void;
}

// أيقونات البطاقات الأربعة
const CARD_ICONS: Record<CardType, string> = {
  freeze: '🧊',
  bomb: '💣',
  battle: '⚔️',
  shield: '🛡️',
};

export const HostScreen: React.FC<HostScreenProps> = ({ settings, onBack }) => {
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
    useCard,
    isLocked,
    setLocked,
    winStreak,
    updateStreak,
    currentRound,
    matchWinner,
    resetMatch,
    decrementCounters,
  } = useGameStore();

  const [selectedCell, setSelectedCell] = useState<HexCellType | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [showQuestion, setShowQuestion] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [cardAnimation, setCardAnimation] = useState<{ type: CardType | 'cardFound', message?: string } | null>(null);
  const [showCardPanel, setShowCardPanel] = useState(false);
  const [showRoulette, setShowRoulette] = useState(false);
  const [rouletteTriggerType, setRouletteTriggerType] = useState<'card' | 'golden'>('card');
  const [isPaused, setIsPaused] = useState(false);
  const [colorsSwapped, setColorsSwapped] = useState(false); // حالة عكس الألوان
  const [pendingCard, setPendingCard] = useState<CardType | null>(null); // Card waiting to be awarded to winning team
  const [showRandomLetterAnnouncement, setShowRandomLetterAnnouncement] = useState(false);
  const [isRandomLetterMode, setIsRandomLetterMode] = useState(false); // Track if we're in random letter round start mode
  const [hasTriggeredRandomLetter, setHasTriggeredRandomLetter] = useState(false); // Prevent re-triggering
  const [roundStarted, setRoundStarted] = useState(false); // Control when round actually begins
  const [isStreakRewardMode, setIsStreakRewardMode] = useState(false); // Track if roulette is from streak reward
  const [streakRewardTeam, setStreakRewardTeam] = useState<'green' | 'red' | null>(null); // Team that earned streak reward
  const [excludedQuestionIds, setExcludedQuestionIds] = useState<string[]>([]); // الأسئلة المستبعدة عند تغيير السؤال

  // تهيئة الشبكة عند التحميل
  React.useEffect(() => {
    initializeGrid(settings);
    // Reset random letter trigger for new round
    setHasTriggeredRandomLetter(false);
  }, [initializeGrid, settings]);

  // ميزة الحرف العشوائي عند بداية الجولة - تنتظر ضغط زر "ابدأ الجولة"
  React.useEffect(() => {
    // Only trigger if: round started, cells exist, enableRandomLetter is on, and we haven't triggered yet
    if (roundStarted && cells.length > 0 && settings.enableRandomLetter && !hasTriggeredRandomLetter && !isLocked) {
      setHasTriggeredRandomLetter(true);
      setIsRandomLetterMode(true);

      // Lock the game during the random letter process
      setLocked(true);

      // Show announcement on both screens
      const announcementMessage = '🎲 حرف عشوائي! من يجيب عليه سيحصل على بطاقة!';
      setShowRandomLetterAnnouncement(true);

      // Broadcast announcement to players screen
      syncManager.broadcast({
        type: 'RANDOM_LETTER_ANNOUNCEMENT',
        message: announcementMessage,
      });

      // After showing announcement, start roulette
      setTimeout(() => {
        setShowRandomLetterAnnouncement(false);
        setRouletteTriggerType('card');
        setShowRoulette(true);

        // Broadcast roulette start to players
        syncManager.broadcast({
          type: 'ROULETTE_START',
          triggerType: 'card',
        });
      }, 2500);
    }
  }, [roundStarted, cells.length, settings.enableRandomLetter, hasTriggeredRandomLetter, isLocked, setLocked]);

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
    // 🎮 لا يمكن اختيار خلية قبل بدء الجولة
    if (!roundStarted) {
      console.warn('⚠️ Action blocked: Round not started yet');
      return;
    }

    // ⏸️ لا يمكن اختيار خلية أثناء الإيقاف المؤقت
    if (isPaused) {
      console.warn('⚠️ Action blocked: Game is paused');
      return;
    }

    // 🔒 ACTION LOCK: Prevent cell selection during active processes
    if (isLocked) {
      console.warn('⚠️ Action blocked: Game is locked during roulette/question');
      return;
    }

    if (cell.status === 'unanswered') {
      setSelectedCell(cell);
      setExcludedQuestionIds([]); // تصفير الأسئلة المستبعدة عند اختيار خلية جديدة

      // 🔒 LOCK the game when starting roulette or question
      setLocked(true);

      // إذا كانت الخلية تحتوي على بطاقة مخفية أو حرف ذهبي، عرض الروليت
      if (cell.hasCard || cell.isGolden) {
        const triggerType = cell.isGolden ? 'golden' : 'card';
        setRouletteTriggerType(triggerType);
        setShowRoulette(true);

        // بث حدث بدء الروليت لشاشة اللاعبين
        syncManager.broadcast({
          type: 'ROULETTE_START',
          triggerType,
        });
      } else {
        // جلب سؤال ذكي من Supabase
        const question = await getSmartQuestion(
          cell.letter,
          settings.selectedCategories
        );

        if (question) {
          setCurrentQuestion(question.question_text);
          setCurrentAnswer(question.correct_answer);
          setCurrentQuestionId(question.id);

          setShowQuestion(true);
        } else {
          // لا يوجد أسئلة
          setCurrentQuestion(`⚠️ لا توجد أسئلة متاحة للحرف "${cell.letter}" في التصنيفات المختارة!`);
          setShowQuestion(true);
          setCurrentAnswer('إجابة تجريبية');
          setCurrentQuestionId(null);
        }
      }
    }
  };

  const handleRouletteComplete = async (card: CardType) => {
    setShowRoulette(false);

    // بث حدث انتهاء الروليت للاعبين
    syncManager.broadcast({
      type: 'ROULETTE_END',
      card,
    });

    // 🔥 إذا كان الروليت من مكافأة السلسلة - منح البطاقة مباشرة للفريق
    if (isStreakRewardMode && streakRewardTeam) {
      addCardToTeam(streakRewardTeam, card);

      const teamName = settings.teamNames[streakRewardTeam];
      const rewardMessage = `🎉 مبروك ${teamName}! حصلت على بطاقة ${CARD_ICONS[card]} كمكافأة للسلسلة! 🔥`;

      setCardAnimation({
        type: card,
        message: rewardMessage,
      });

      syncManager.broadcast({
        type: 'STREAK_REWARD_CARD',
        team: streakRewardTeam,
        cardType: card,
        message: rewardMessage,
      });

      // إعادة تعيين وضع السلسلة
      setIsStreakRewardMode(false);
      setStreakRewardTeam(null);

      setTimeout(() => {
        setCardAnimation(null);
        setLocked(false);
      }, 3500);

      return; // لا حاجة لسؤال
    }

    // Store pending card (to be awarded to team that answers correctly)
    setPendingCard(card);

    // If in random letter mode, select a random non-golden cell
    let targetCell = selectedCell;
    if (isRandomLetterMode) {
      const availableCells = cells.filter(c => c.status === 'unanswered' && !c.isGolden);
      if (availableCells.length > 0) {
        targetCell = availableCells[Math.floor(Math.random() * availableCells.length)];
        setSelectedCell(targetCell);
      }
      setIsRandomLetterMode(false);
    }

    // Show card found animation
    const cardFoundMessage = `ظهرت بطاقة ${CARD_ICONS[card]}! أجب على السؤال لتحصل عليها 🎁`;
    setCardAnimation({
      type: 'cardFound',
      message: cardFoundMessage,
    });

    // بث رسالة ظهور البطاقة للاعبين
    syncManager.broadcast({
      type: 'CARD_FOUND',
      cardType: 'cardFound',
      message: cardFoundMessage,
    });

    setTimeout(async () => {
      setCardAnimation(null);

      // Fetch smart question from Supabase
      const question = await getSmartQuestion(
        targetCell?.letter || '',
        settings.selectedCategories
      );

      if (question) {
        setCurrentQuestion(question.question_text);
        setCurrentAnswer(question.correct_answer);
        setCurrentQuestionId(question.id);
      } else {
        setCurrentQuestion(`سؤال تجريبي للحرف "${targetCell?.letter}"؟`);
        setCurrentAnswer('إجابة تجريبية');
        setCurrentQuestionId(null);
      }
      setShowQuestion(true);
    }, 3500);
  };

  const handleTeamWin = (team: 'green' | 'red') => {
    if (selectedCell) {
      // Claim the cell for the winning team
      claimCell(selectedCell.id, team);

      // تحديث عدادات التجميد والدرع بعد كل سؤال
      decrementCounters();

      // Award pending card to the winning team (if any)
      if (pendingCard) {
        addCardToTeam(team, pendingCard);

        // Show card awarded animation
        const cardWonMessage = `مبروك! فاز الفريق ${team === 'green' ? 'الأخضر' : 'الأحمر'} بالبطاقة ${CARD_ICONS[pendingCard]}! 🎉`;
        setCardAnimation({
          type: pendingCard,
          message: cardWonMessage,
        });

        // بث رسالة فوز البطاقة للاعبين
        syncManager.broadcast({
          type: 'CARD_WON',
          cardType: pendingCard,
          message: cardWonMessage,
        });

        // Clear pending card
        setPendingCard(null);

        // Clear animation after delay
        setTimeout(() => {
          setCardAnimation(null);
        }, 3000);
      }

      // 🔥 تحديث سلسلة الإجابات (إذا مفعّل)
      if (settings.enableStreakReward) {
        const streakResult = updateStreak(team);

        // إذا وصل الفريق لـ 3 إجابات متتالية
        if (streakResult.streakReached && streakResult.team) {
          // إظهار إعلان سلسلة الإجابات
          const streakMessage = `🔥 ${settings.teamNames[streakResult.team]} أكمل 3 إجابات متتالية! 🎁`;

          // بث إعلان السلسلة
          syncManager.broadcast({
            type: 'STREAK_REWARD_ANNOUNCEMENT',
            team: streakResult.team,
            message: streakMessage,
          });

          // تعيين وضع مكافأة السلسلة
          setIsStreakRewardMode(true);
          setStreakRewardTeam(streakResult.team);

          // بعد تأخير قصير، إظهار الروليت
          setTimeout(() => {
            setRouletteTriggerType('card');
            setShowRoulette(true);

            syncManager.broadcast({
              type: 'ROULETTE_START',
              triggerType: 'card',
            });
          }, 2000);
        }
      }

      // Reset question UI
      setShowQuestion(false);
      setSelectedCell(null);
      setCurrentQuestion(null);
      setCurrentQuestionId(null);

      // 🔓 UNLOCK the game after answer is processed (only if no streak reward)
      if (!settings.enableStreakReward || winStreak[team] < 2) {
        setLocked(false);
      }
    }
  };

  const handleChangeQuestion = async () => {
    if (!selectedCell?.letter) return;

    // إضافة السؤال الحالي لقائمة المستبعدة
    const updatedExcluded = currentQuestionId
      ? [...excludedQuestionIds, currentQuestionId]
      : excludedQuestionIds;
    setExcludedQuestionIds(updatedExcluded);

    // جلب سؤال جديد مع استبعاد كل الأسئلة السابقة
    const newQuestion = await getSmartQuestion(
      selectedCell.letter,
      settings.selectedCategories,
      updatedExcluded
    );

    if (newQuestion) {
      setCurrentQuestion(newQuestion.question_text);
      setCurrentAnswer(newQuestion.correct_answer);
      setCurrentQuestionId(newQuestion.id);

      // بث السؤال الجديد للاعبين
      syncManager.broadcast({
        type: 'QUESTION_CHANGED',
        letter: selectedCell.letter,
        question: newQuestion.question_text,
      });
    } else {
      // لا توجد أسئلة أخرى
      setCurrentQuestion(`⚠️ لا توجد أسئلة إضافية للحرف "${selectedCell.letter}"`);
      setCurrentQuestionId(null);
    }
  };

  const handleCardUse = async (cardType: CardType, targetCellId: string, team: 'green' | 'red') => {
    const messages: Record<CardType, string> = {
      freeze: 'تم تجميد الخلية لدورتين! ❄️',
      bomb: 'انفجار! تم تدمير الحرف 💣',
      battle: 'معركة! من يجيب يمتلك الحرف ⚔️',
      shield: 'تم حماية الحرف لـ 5 أسئلة! 🛡️',
    };

    // استخدام البطاقة من المتجر
    const result = useCard(team, cardType, targetCellId);

    // عرض الأنيميشن
    setCardAnimation({
      type: cardType,
      message: messages[cardType],
    });

    // بث رسالة استخدام البطاقة
    syncManager.broadcast({
      type: 'CARD_ANIMATION',
      cardType,
      message: messages[cardType],
      targetCellId,
      team,
    });

    // إغلاق لوحة البطاقات
    setShowCardPanel(false);

    // إذا كانت بطاقة معركة، نحتاج لطرح سؤال فوراً
    if (result.triggerBattle && result.battleCellId) {
      // حفظ الحرف قبل تغيير الحالة (من الخلية الأصلية)
      const originalCell = cells.find(c => c.id === result.battleCellId);
      const battleLetter = originalCell?.letter || '';

      // انتظار انتهاء الأنيميشن ثم طرح السؤال
      setTimeout(async () => {
        setCardAnimation(null);

        // الحصول على أحدث حالة للخلايا من المتجر
        const latestCells = useGameStore.getState().cells;
        const targetCell = latestCells.find(c => c.id === result.battleCellId);

        if (targetCell && battleLetter) {
          setSelectedCell({ ...targetCell, letter: battleLetter });
          setLocked(true);

          // جلب سؤال جديد للمعركة
          const question = await getSmartQuestion(
            battleLetter,
            settings.selectedCategories
          );

          if (question) {
            setCurrentQuestion(question.question_text);
            setCurrentAnswer(question.correct_answer);
            setCurrentQuestionId(question.id);
          } else {
            setCurrentQuestion(`سؤال معركة للحرف "${battleLetter}"؟`);
            setCurrentAnswer('إجابة تجريبية');
            setCurrentQuestionId(null);
          }
          setShowQuestion(true);

          // بث السؤال للاعبين
          syncManager.broadcast({
            type: 'BATTLE_QUESTION',
            letter: battleLetter,
            question: question?.question_text || `سؤال معركة للحرف "${battleLetter}"؟`,
          });
        }
      }, 2500);
    }
  };

  // عكس الألوان - تبديل الفرق واتجاهات الفوز
  const handleToggleColors = () => {
    // عكس حالة الألوان
    const newColorsSwapped = !colorsSwapped;
    setColorsSwapped(newColorsSwapped);

    // Swap wall/perimeter win directions (horizontal ↔ vertical)
    const updatedSettings = {
      ...settings,
      teamColors: {
        green: settings.teamColors.red,
        red: settings.teamColors.green,
      },
    };

    // Update local storage
    localStorage.setItem('current-game-settings', JSON.stringify(updatedSettings));

    // Broadcast settings update + colors swapped state
    syncManager.broadcast({
      type: 'SETTINGS_UPDATED',
      settings: updatedSettings,
      colorsSwapped: newColorsSwapped,
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

  // بدء الجولة - يفعّل كل ميزات الجولة
  const handleStartRound = () => {
    setRoundStarted(true);

    // بث إشارة بدء الجولة للاعبين
    syncManager.broadcast({
      type: 'ROUND_STARTED',
    });
  };

  // إعادة تعيين الجولة
  const handleResetRound = () => {
    if (window.confirm('هل تريد إعادة تعيين الجولة الحالية؟')) {
      resetGame();
      initializeGrid(settings);
      // إعادة تعيين حالة بدء الجولة
      setRoundStarted(false);
      setHasTriggeredRandomLetter(false);
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

        {/* الشبكة */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '500px',
          position: 'relative',
        }}>
          {/* 🎮 زر بدء الجولة - يظهر قبل بدء الجولة */}
          {!roundStarted && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 20,
              gap: '2rem',
            }}>
              <div style={{
                textAlign: 'center',
                color: 'white',
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎮</div>
                <h2 style={{
                  fontSize: '2rem',
                  fontWeight: 900,
                  margin: 0,
                  marginBottom: '0.5rem',
                }}>
                  جاهز للبدء؟
                </h2>
                <p style={{
                  fontSize: '1.125rem',
                  color: 'rgba(255, 255, 255, 0.7)',
                  margin: 0,
                }}>
                  افتح شاشة اللاعبين أولاً ثم اضغط على زر البدء
                </p>
              </div>

              <button
                onClick={handleStartRound}
                style={{
                  padding: '1.5rem 4rem',
                  fontSize: '1.75rem',
                  fontWeight: 900,
                  color: 'white',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  borderRadius: '1.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  boxShadow: '0 8px 32px rgba(16, 185, 129, 0.4), 0 0 60px rgba(16, 185, 129, 0.2)',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(16, 185, 129, 0.5), 0 0 80px rgba(16, 185, 129, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(16, 185, 129, 0.4), 0 0 60px rgba(16, 185, 129, 0.2)';
                }}
              >
                <Play size={32} fill="white" />
                ابدأ الجولة
              </button>

              {/* زر فتح شاشة اللاعبين */}
              <button
                onClick={handleOpenPlayersScreen}
                style={{
                  padding: '1rem 2rem',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#14b8a6',
                  background: 'rgba(20, 184, 166, 0.15)',
                  border: '2px solid rgba(20, 184, 166, 0.5)',
                  borderRadius: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(20, 184, 166, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(20, 184, 166, 0.15)';
                }}
              >
                <Tv size={20} />
                فتح شاشة اللاعبين
              </button>
            </div>
          )}

          {/* 🔒 Overlay when locked */}
          {isLocked && roundStarted && !isPaused && (
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

          {/* ⏸️ Overlay when paused */}
          {isPaused && roundStarted && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 15,
              pointerEvents: 'all',
              gap: '1.5rem',
            }}>
              <div style={{ fontSize: '5rem' }}>⏸️</div>
              <div style={{
                background: 'rgba(139, 92, 246, 0.3)',
                border: '3px solid rgba(139, 92, 246, 0.6)',
                borderRadius: '1.5rem',
                padding: '1.5rem 3rem',
                color: 'white',
                fontSize: '2rem',
                fontWeight: 900,
                textAlign: 'center',
              }}>
                اللعبة متوقفة مؤقتاً
              </div>
              <button
                onClick={() => {
                  setIsPaused(false);
                  // إرسال البث لشاشة اللاعبين
                  syncManager.broadcast({
                    type: 'GAME_PAUSED',
                    isPaused: false,
                  });
                }}
                style={{
                  padding: '1rem 2.5rem',
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  color: 'white',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  borderRadius: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
                }}
              >
                <Play size={24} fill="white" />
                استمرار
              </button>
            </div>
          )}
          <HexGrid
            cells={cells}
            onCellClick={handleCellSelect}
            selectedCellId={selectedCell?.id}
            zoom={zoom}
            scale={1}
            colorsSwapped={colorsSwapped}
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
          <ControlButton onClick={() => {
            const newPausedState = !isPaused;
            setIsPaused(newPausedState);
            // بث حالة الإيقاف المؤقت لشاشة اللاعبين
            syncManager.broadcast({
              type: 'GAME_PAUSED',
              isPaused: newPausedState,
            });
          }} color={isPaused ? "#10b981" : "#8b5cf6"} icon={isPaused ? <Play size={20} /> : <Pause size={20} />} title={isPaused ? "استمرار" : "إيقاف مؤقت"} disabled={isLocked} />
          <ControlButton onClick={handleRandomLetter} color="#ec4899" icon={<Dices size={20} />} title="حرف عشوائي" disabled={isLocked} />
          <ControlButton onClick={handleToggleColors} color="#a855f7" icon={<Palette size={20} />} title="عكس الألوان" disabled={isLocked} />
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
          {/* 3. ✅ صندوق الإجابة (تم نقله ليصبح تحت السؤال) */}
            {currentAnswer && (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '2px dashed rgba(16, 185, 129, 0.4)', borderRadius: '1.25rem', padding: '1.5rem', marginBottom: '2rem', textAlign: 'center' }}>
                <div style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                   الإجابة الصحيحة ✓
                </div>
                <div style={{ color: '#10b981', fontSize: '1.5rem', fontWeight: 900 }}>
                  {currentAnswer}
                </div>
              </div>
            )}
               
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
          cells={cells}
          teamCards={teamCards}
          teamNames={settings.teamNames}
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

      {/* إعلان الحرف العشوائي */}
      {showRandomLetterAnnouncement && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.95), rgba(236, 72, 153, 0.95))',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
        }}>
          <div style={{
            fontSize: '8rem',
            marginBottom: '2rem',
            animation: 'bounce 0.6s ease-in-out infinite',
          }}>
            🎲
          </div>
          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: 900,
            color: 'white',
            textShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            textAlign: 'center',
            margin: 0,
          }}>
            حرف عشوائي!
          </h1>
          <p style={{
            fontSize: '1.75rem',
            color: 'rgba(255, 255, 255, 0.9)',
            marginTop: '1.5rem',
            textAlign: 'center',
          }}>
            من يجيب عليه سيحصل على بطاقة! 🎁
          </p>
          <style>{`
            @keyframes bounce {
              0%, 100% { transform: translateY(0) rotate(-5deg); }
              50% { transform: translateY(-20px) rotate(5deg); }
            }
          `}</style>
        </div>
      )}

      {/* عداد نتيجة المباراة */}
      <MatchScoreTracker
        greenScore={scores.green}
        redScore={scores.red}
        greenTeamName={settings.teamNames.green}
        redTeamName={settings.teamNames.red}
        totalRounds={settings.rounds}
        currentRound={currentRound}
      />

      {/* عداد سلسلة الإجابات */}
      {roundStarted && (
        <StreakVisualizer
          greenStreak={winStreak.green}
          redStreak={winStreak.red}
          greenTeamName={settings.teamNames.green}
          redTeamName={settings.teamNames.red}
          enabled={settings.enableStreakReward}
        />
      )}

      {/* روليت البطاقات */}
      {showRoulette && (
        <CardRoulette
          onComplete={handleRouletteComplete}
          triggerType={rouletteTriggerType}
        />
      )}

      {/* نافذة النتائج - تظهر فقط إذا لم يكن هناك فائز بالمباراة */}
      {winner && winMessage && !matchWinner && (
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

            // إعادة تفعيل الحرف العشوائي للجولة الجديدة
            setHasTriggeredRandomLetter(false);
            // بدء الجولة تلقائياً
            setRoundStarted(true);

            // بث إشارة بدء الجولة للاعبين
            syncManager.broadcast({
              type: 'ROUND_STARTED',
            });
          }}
        />
      )}

      {/* شاشة الفوز بالمباراة */}
      {matchWinner && (
        <MatchWinnerOverlay
          winner={matchWinner}
          winnerName={settings.teamNames[matchWinner]}
          greenScore={scores.green}
          redScore={scores.red}
          greenTeamName={settings.teamNames.green}
          redTeamName={settings.teamNames.red}
          onNewSettings={() => {
            // الذهاب لشاشة الإعدادات
            resetMatch();
            syncManager.broadcast({
              type: 'MATCH_RESET',
            });
            // استخدام onBack للذهاب لشاشة الإعدادات
            onBack();
          }}
          onRestartMatch={() => {
            // إعادة نفس المباراة بنفس الإعدادات
            resetMatch();
            initializeGrid(settings);
            setHasTriggeredRandomLetter(false);
            setRoundStarted(false);

            // بث إعادة تعيين المباراة
            syncManager.broadcast({
              type: 'MATCH_RESET',
            });
          }}
          onGoHome={() => {
            // العودة للصفحة الرئيسية (Landing Page)
            resetMatch();
            syncManager.broadcast({
              type: 'MATCH_RESET',
            });
            // مسح الإعدادات والذهاب للصفحة الرئيسية
            localStorage.removeItem('current-game-settings');
            window.location.href = window.location.origin + window.location.pathname;
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

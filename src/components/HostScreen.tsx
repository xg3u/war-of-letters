// src/components/HostScreen.tsx
// شاشة المقدم المُعاد تصميمها - تطابق الهوية البصرية النهائية

import React, { useState, useRef, useCallback } from 'react';
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
  Play,
  Zap,
  HelpCircle,
  Undo2,
  Redo2,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { syncManager } from '../utils/SyncManager';
import { getSmartQuestion } from '../utils/questionEngine';
import {
  BuzzerChannel,
  INITIAL_BUZZER_STATE,
  applyAttempt,
  applyActiveExpiry,
  applyOpponentExpiry,
} from '../utils/BuzzerEngine';
import type { BuzzerAttempt, BuzzerState } from '../utils/BuzzerEngine';
import { prefetchAllGameLetters } from '../utils/questionCache';
import { useScreenSize } from '../hooks/useScreenSize';
import { playBellSound, playCardSound } from '../utils/sounds';
import { HexGrid } from './HexGrid';
import { ActionCardPanel } from './ActionCardPanel';
import { CardAnimation } from './CardAnimation';
import { CardTeaserOverlay } from './CardTeaserOverlay';
import { CardRoulette } from './CardRoulette';
import { ResultsOverlay } from './ResultsOverlay';
import { StreakVisualizer } from './StreakVisualizer';
import { MatchScoreTracker } from './MatchScoreTracker';
import { MatchWinnerOverlay } from './MatchWinnerOverlay';
import { QRCodeModal } from './QRCodeModal';
import { BuzzerQRCodeModal } from './BuzzerQRCodeModal';
import { HostOnboarding } from './HostOnboarding';
import type { GameSettingsData } from './GameSettings';
import type { HexCell as HexCellType, CardType } from '../core/types';
import { getWinStats, checkWinCondition, getWinMessage } from '../utils/winChecker';
import { useTheme } from '../context/ThemeContext';
import { CharacterAvatar, DEFAULT_AVATAR } from './CharacterAvatar';
import type { AvatarConfig } from './CharacterAvatar';

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
    clearCards,
    decrementCounters,
    saveSnapshot,
    undoLastAction,
    redoLastAction,
    history,
    future,
    forceRoundWin,
  } = useGameStore();

  const [selectedCell, setSelectedCell] = useState<HexCellType | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [showQuestion, setShowQuestion] = useState(false);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false); // Loading state for question fetch
  const [zoom, setZoom] = useState(1);
  const [cardAnimation, setCardAnimation] = useState<{ type: CardType | 'cardFound', message?: string } | null>(null);
  const [showCardPanel, setShowCardPanel] = useState(false);
  const [showRoulette, setShowRoulette] = useState(false);
  const [showCardTeaser, setShowCardTeaser] = useState(false); // شاشة التشويق قبل كشف البطاقة
  const [rouletteTriggerType, setRouletteTriggerType] = useState<'card' | 'golden'>('card');
  const [isPaused, setIsPaused] = useState(false);
  const [colorsSwapped, setColorsSwapped] = useState(false); // حالة عكس الألوان
  const [pendingWin, setPendingWin] = useState<{
    detectedTeam: 'green' | 'red';
    winType: 'wall-to-wall' | 'five-connected' | 'most-letters';
    message: string;
  } | null>(null);

  const [buzzerPress, setBuzzerPress] = useState<{
    type: 'answer' | 'card';
    playerName: string;
    team: 'green' | 'red';
    timestamp: number;
    phase?: 'phase1' | 'phase2' | 'phase3';
    avatar?: AvatarConfig;
  } | null>(null); // حالة ضغط الزر
  const [buzzerActiveUntil, setBuzzerActiveUntil] = useState<number | null>(null); // وقت انتهاء فرصة الإجابة
  const [buzzerCountdown, setBuzzerCountdown] = useState(0); // العداد التنازلي (ثوانٍ)
  const [registeredPlayers, setRegisteredPlayers] = useState<{
    name: string;
    team: 'green' | 'red';
    timestamp: number;
    avatar?: AvatarConfig;
  }[]>([]); // اللاعبون المسجلون في Answer Buzzers
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);
  const kickPlayer = (name: string) => {
    setRegisteredPlayers(prev => prev.filter(p => p.name !== name));
    setHoveredPlayer(null);
    syncManager.broadcast({ type: 'player-kicked', name });
  };
  const [pendingCard, setPendingCard] = useState<CardType | null>(null); // Card waiting to be awarded to winning team
  const [showRandomLetterAnnouncement, setShowRandomLetterAnnouncement] = useState(false);
  const [isRandomLetterMode, setIsRandomLetterMode] = useState(false); // Track if we're in random letter round start mode
  const [hasTriggeredRandomLetter, setHasTriggeredRandomLetter] = useState(false); // Prevent re-triggering
  const [roundStarted, setRoundStarted] = useState(false); // Control when round actually begins
  const [isStreakRewardMode, setIsStreakRewardMode] = useState(false); // Track if roulette is from streak reward
  const [streakRewardTeam, setStreakRewardTeam] = useState<'green' | 'red' | null>(null); // Team that earned streak reward
  const [showStreakAnnouncement, setShowStreakAnnouncement] = useState(false); // إعلان السلسلة — يتحكم فيه المقدم
  const [showQuestionOnPlayers, setShowQuestionOnPlayers] = useState(false); // إظهار السؤال في شاشة اللاعبين
  const [excludedQuestionIds, setExcludedQuestionIds] = useState<string[]>([]); // الأسئلة المستبعدة عند تغيير السؤال
  const [showQRCode, setShowQRCode] = useState(false); // إظهار QR Code
  const [showBuzzerQRCode, setShowBuzzerQRCode] = useState(false); // إظهار QR Code للأزرار
  // جلسة جديدة تماماً في كل مرة يبدأ فيها المقدم لعبة
  // initSession يُستدعى هنا مباشرة ليضمن أن SyncManager يعرف الـ session قبل أي useEffect
  const [sessionId] = useState(() => {
    const SAFE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // بدون 0,1,I,O لتجنب الالتباس
    const code = Array.from({ length: 5 }, () => SAFE[Math.floor(Math.random() * SAFE.length)]).join('');
    syncManager.initSession(code); // يُعِدّ Realtime فوراً ويضع SyncManager كمقدم
    return code;
  });

  // ── نظام الجرس: HostScreen هو المُحكّم الوحيد ─────────────────
  const hostBuzzerStateRef  = useRef<BuzzerState>(INITIAL_BUZZER_STATE);
  const hostPendingRef      = useRef<BuzzerAttempt[]>([]);
  const hostTimerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buzzerChRef         = useRef<BuzzerChannel | null>(null);

  // ── عداد الخمول: خروج تلقائي بعد ساعة من عدم الحركة ──────────────────────
  const INACTIVITY_MS = 60 * 60 * 1000; // 60 دقيقة
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // حارس: يمنع إرسال SESSION_ENDED أكثر من مرة (يحمي من React Strict Mode وتغيّر الـ deps)
  const sessionEndedRef = useRef(false);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      syncManager.broadcast({ type: 'SESSION_ENDED' });
      localStorage.removeItem('game-session-id');
      onBack();
    }, INACTIVITY_MS);
  }, [onBack]); // eslint-disable-line react-hooks/exhaustive-deps
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('host-onboarding-done');
  });

  const { isMobile, isTablet, isDesktop } = useScreenSize();
  const { theme } = useTheme();

  // ── مراقبة النشاط + تنظيف الجلسة عند الخروج ──────────────────────────────
  React.useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const;
    events.forEach(e => window.addEventListener(e, resetInactivityTimer, { passive: true }));
    resetInactivityTimer(); // بدء العداد فور تحميل الصفحة

    return () => {
      events.forEach(e => window.removeEventListener(e, resetInactivityTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      // إرسال SESSION_ENDED مرة واحدة فقط — يحمي من React Strict Mode وتكرار الـ cleanup
      if (!sessionEndedRef.current) {
        sessionEndedRef.current = true;
        syncManager.broadcast({ type: 'SESSION_ENDED' });
        localStorage.removeItem('game-session-id');
        // إعادة ضبط الحارس بعد لحظة لتسمح بجلسة جديدة لاحقاً
        setTimeout(() => { sessionEndedRef.current = false; }, 500);
      }
    };
  }, [resetInactivityTimer]);

  // ── BuzzerChannel: HostScreen كمُحكّم وحيد للجرس ────────────────
  React.useEffect(() => {
    if (!sessionId) return;
    const ch = new BuzzerChannel(sessionId);
    buzzerChRef.current = ch;

    const offAttempt = ch.onAttempt((attempt) => {
      hostPendingRef.current.push(attempt);
      if (!hostTimerRef.current) {
        hostTimerRef.current = setTimeout(() => {
          hostTimerRef.current = null;
          const pending = [...hostPendingRef.current]
            .sort((a, b) => a.clientTimestamp - b.clientTimestamp);
          hostPendingRef.current = [];
          const now = Date.now();
          for (const att of pending) {
            const newState = applyAttempt(hostBuzzerStateRef.current, att, now);
            if (!newState) continue;
            hostBuzzerStateRef.current = newState;
            // إعلان الفائز لجميع شاشات اللاعبين
            ch.sendWinner({
              type: 'BUZZER_WINNER',
              team: att.team,
              playerName: att.playerName,
              pressType: att.pressType,
              clientTimestamp: att.clientTimestamp,
              newState,
              avatar: att.avatar,
            });
            // تحديث شاشة المقدم مباشرة
            setBuzzerPress({
              type: att.pressType,
              playerName: att.playerName,
              team: att.team,
              timestamp: att.clientTimestamp,
              avatar: att.avatar,
            });
            if (newState.activeUntil) setBuzzerActiveUntil(newState.activeUntil);
            // إعلام شاشة اللاعبين (PlayersScreen)
            syncManager.broadcast({
              type: 'buzzer-press',
              buzzerPress: {
                type: att.pressType,
                playerName: att.playerName,
                team: att.team,
                timestamp: att.clientTimestamp,
                activeUntil: newState.activeUntil,
                phase: newState.phase,
              },
            });
            if (att.pressType === 'answer') playBellSound(); else playCardSound();
            break;
          }
        }, 400); // نافذة 400ms لتجميع الضغطات المتزامنة
      }
    });

    return () => {
      offAttempt();
      ch.close();
      buzzerChRef.current = null;
      if (hostTimerRef.current) { clearTimeout(hostTimerRef.current); hostTimerRef.current = null; }
    };
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── تقدّم حالة الجرس بالوقت (للتحقق canTeamPress) ──────────────
  React.useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      const s = hostBuzzerStateRef.current;
      if (s.activeUntil && now >= s.activeUntil) {
        hostBuzzerStateRef.current = applyActiveExpiry(s, now);
      } else if (
        (s.phase === 'phase2' || s.phase === 'phase3_opp') &&
        !s.activeTeam && s.opponentUntil && now >= s.opponentUntil
      ) {
        hostBuzzerStateRef.current = applyOpponentExpiry(s, now);
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  // تهيئة الشبكة عند التحميل
  React.useEffect(() => {
    initializeGrid(settings);
    // Reset random letter trigger for new round
    setHasTriggeredRandomLetter(false);
  }, [initializeGrid, settings]);

  // Pre-fetch: تحميل الأسئلة مسبقاً عند تهيئة الشبكة
  React.useEffect(() => {
    if (cells.length > 0) {
      console.log('🚀 Pre-fetching questions for all letters...');
      prefetchAllGameLetters(cells).then(() => {
        console.log('✅ Questions pre-fetched successfully!');
      });
    }
  }, [cells.length]);

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
      } else if (data.type === 'player-registered') {
        // إضافة أو تحديث لاعب (يُحدَّث الفريق والأفاتار إذا تغيّرا)
        setRegisteredPlayers(prev => {
          const idx = prev.findIndex(p => p.name === data.player.name);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = data.player;
            return updated;
          }
          return [...prev, data.player];
        });
      } else if (data.type === 'player-left') {
        // لاعب غادر — احذفه من القائمة
        setRegisteredPlayers(prev => prev.filter(p => p.name !== data.name));
      } else if (data.type === 'REQUEST_FULL_STATE') {
        // جهاز بعيد يطلب الحالة الكاملة - نرسلها مباشرة
        console.log('📡 Remote device requested full state - sending...');
        const state = useGameStore.getState();
        if (state.cells.length > 0) {
          syncManager.saveFullState({
            cells: state.cells,
            settings: state.settings,
            scores: state.scores,
            currentRound: state.currentRound,
            teamCards: state.teamCards,
            winStreak: state.winStreak,
            winner: state.winner,
            winMessage: state.winMessage,
            matchWinner: state.matchWinner,
            isLocked: state.isLocked,
            colorsSwapped,
            isPaused,
            roundStarted,
          });
        }
      }
    });
    return unsubscribe;
  }, [syncFromExternal, colorsSwapped, isPaused, roundStarted]);

  // حفظ حالة اللعبة الكاملة في localStorage لمزامنة شاشة اللاعبين
  React.useEffect(() => {
    if (cells.length === 0) return; // لا نحفظ قبل تهيئة الشبكة
    syncManager.saveFullState({
      cells,
      settings,
      scores,
      currentRound,
      teamCards,
      winStreak,
      winner,
      winMessage,
      matchWinner,
      isLocked,
      colorsSwapped,
      isPaused,
      roundStarted,
    });
  }, [cells, scores, currentRound, teamCards, winStreak, winner, winMessage, matchWinner, isLocked, colorsSwapped, isPaused, roundStarted, settings]);

  // عداد الجرس التنازلي + إغلاق تلقائي بعد انتهاء الـ 5 ثوانٍ
  React.useEffect(() => {
    if (!buzzerActiveUntil) return;
    setBuzzerCountdown(Math.max(0, Math.ceil((buzzerActiveUntil - Date.now()) / 1000)));
    const interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((buzzerActiveUntil - Date.now()) / 1000));
      setBuzzerCountdown(left);
      if (left === 0) {
        setBuzzerPress(null);
        setBuzzerActiveUntil(null);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [buzzerActiveUntil]);

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

      // 📡 إعلام شاشة اللاعبين بالخلية المختارة (تظليل أصفر)
      syncManager.broadcast({
        type: 'CELL_SELECTED',
        cellId: cell.id,
        letter: cell.letter,
        hasCard: !!cell.hasCard,
        isGolden: !!cell.isGolden,
      });

      // إذا كانت الخلية تحتوي على بطاقة مخفية أو حرف ذهبي، عرض شاشة التشويق أولاً
      if (cell.hasCard || cell.isGolden) {
        setShowCardTeaser(true);

        // بث حدث شاشة التشويق لشاشة اللاعبين
        syncManager.broadcast({
          type: 'CARD_TEASER',
          letter: cell.letter,
          isGolden: !!cell.isGolden,
        });
      } else {
        // جلب سؤال ذكي من Supabase
        setIsLoadingQuestion(true);
        const question = await getSmartQuestion(
          cell.letter,
          settings.selectedCategories
        );
        setIsLoadingQuestion(false);

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

  // يُستدعى عندما يضغط المقدم "اكشف البطاقة" في شاشة التشويق
  const handleRevealCard = () => {
    setShowCardTeaser(false);
    const triggerType = selectedCell?.isGolden ? 'golden' : 'card';
    setRouletteTriggerType(triggerType);
    setShowRoulette(true);

    syncManager.broadcast({
      type: 'ROULETTE_START',
      triggerType,
    });
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

    // إذا كنا في وضع الحرف العشوائي: حرّك اللون الأصفر على الشبكة ثم أظهر السؤال
    if (isRandomLetterMode) {
      setIsRandomLetterMode(false);
      const availableCells = cells.filter(c => c.status === 'unanswered' && !c.isGolden);

      if (availableCells.length > 0) {
        const foundTarget = availableCells[Math.floor(Math.random() * availableCells.length)];
        const afterMs = animateCellSelection(availableCells, foundTarget);

        setTimeout(async () => {
          const cardFoundMessage = `ظهرت بطاقة ${CARD_ICONS[card]}! أجب على السؤال لتحصل عليها 🎁`;
          setCardAnimation({ type: 'cardFound', message: cardFoundMessage });
          syncManager.broadcast({ type: 'CARD_FOUND', cardType: 'cardFound', message: cardFoundMessage });

          setTimeout(async () => {
            setCardAnimation(null);
            const question = await getSmartQuestion(foundTarget.letter, settings.selectedCategories);
            if (question) {
              setCurrentQuestion(question.question_text);
              setCurrentAnswer(question.correct_answer);
              setCurrentQuestionId(question.id);
            } else {
              setCurrentQuestion(`سؤال تجريبي للحرف "${foundTarget.letter}"؟`);
              setCurrentAnswer('إجابة تجريبية');
              setCurrentQuestionId(null);
            }
            setShowQuestion(true);
          }, 3500);
        }, afterMs);
      }
      return; // تم التعامل مع حالة الحرف العشوائي
    }

    // الحالة العادية: كشف بطاقة خلف حرف محدد
    const targetCell = selectedCell;
    const cardFoundMessage = `ظهرت بطاقة ${CARD_ICONS[card]}! أجب على السؤال لتحصل عليها 🎁`;
    setCardAnimation({
      type: 'cardFound',
      message: cardFoundMessage,
    });

    syncManager.broadcast({
      type: 'CARD_FOUND',
      cardType: 'cardFound',
      message: cardFoundMessage,
    });

    setTimeout(async () => {
      setCardAnimation(null);

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
      // حفظ لقطة قبل التغيير للسماح بالتراجع
      saveSnapshot();
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
          // بث إعلان السلسلة لشاشة اللاعبين
          syncManager.broadcast({
            type: 'STREAK_REWARD_ANNOUNCEMENT',
            team: streakResult.team,
            teamName: settings.teamNames[streakResult.team],
            message: `🔥 ${settings.teamNames[streakResult.team]} أكمل 3 إجابات متتالية! 🎁`,
          });

          // تعيين وضع مكافأة السلسلة وإظهار إعلان المقدم (بدلاً من auto-timer)
          setIsStreakRewardMode(true);
          setStreakRewardTeam(streakResult.team);
          setShowStreakAnnouncement(true);
          // الروليت لن يبدأ إلا بعد ضغط المقدم على زر "ابدأ الروليت"
        }
      }

      // Reset question UI
      setShowQuestion(false);
      setSelectedCell(null);
      syncManager.broadcast({ type: 'CELL_SELECTED', cellId: null, letter: null, hasCard: false, isGolden: false });
      setCurrentQuestion(null);
      setCurrentQuestionId(null);
      // إخفاء السؤال من شاشة اللاعبين إن كان مُظهَراً
      if (showQuestionOnPlayers) {
        setShowQuestionOnPlayers(false);
        syncManager.broadcast({ type: 'HIDE_QUESTION_FROM_PLAYERS' });
      }

      // فحص حالة الفوز — المقدم يؤكد يدوياً
      const latestCells = useGameStore.getState().cells;
      const storeSettings = useGameStore.getState().settings;
      const winCheck = checkWinCondition(latestCells, storeSettings.winCondition, storeSettings.teamColors);

      if (winCheck.winner) {
        const teamName = storeSettings.teamNames[winCheck.winner as 'green' | 'red'];
        const message = winCheck.message || getWinMessage(winCheck.winner, winCheck.winType!, teamName);
        setPendingWin({
          detectedTeam: winCheck.winner as 'green' | 'red',
          winType: (winCheck.winType || 'most-letters') as 'wall-to-wall' | 'five-connected' | 'most-letters',
          message,
        });
        // اللعبة تبقى مقفلة حتى يؤكد المقدم
        return;
      }

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
    setIsLoadingQuestion(true);
    const newQuestion = await getSmartQuestion(
      selectedCell.letter,
      settings.selectedCategories,
      updatedExcluded
    );
    setIsLoadingQuestion(false);

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

    // فحص الفوز بعد القنبلة
    if (cardType === 'bomb') {
      const latestCells = useGameStore.getState().cells;
      const storeSettings = useGameStore.getState().settings;
      const winCheck = checkWinCondition(latestCells, storeSettings.winCondition, storeSettings.teamColors);
      if (winCheck.winner) {
        const teamName = storeSettings.teamNames[winCheck.winner as 'green' | 'red'];
        const message = winCheck.message || getWinMessage(winCheck.winner, winCheck.winType!, teamName);
        setPendingWin({
          detectedTeam: winCheck.winner as 'green' | 'red',
          winType: (winCheck.winType || 'most-letters') as 'wall-to-wall' | 'five-connected' | 'most-letters',
          message,
        });
      }
    }

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

          // جلب سؤال جديد للمعركة - استبعاد السؤال الحالي
          const question = await getSmartQuestion(
            battleLetter,
            settings.selectedCategories,
            currentQuestionId || undefined  // استبعاد السؤال الحالي
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

  // ── مساعد: يحرّك اللون الأصفر بين خلايا الشبكة ثم يثبت على الخلية المستهدفة ──
  // يعيد المدة الكلية بالميلي ثانية (مرحلة سريعة + بطيئة + هامش)
  const animateCellSelection = (pool: HexCellType[], target: HexCellType): number => {
    const timings: number[] = [];
    let t = 0;
    // مرحلة سريعة: 15 خطوة كل 80ms
    for (let i = 0; i < 15; i++) { timings.push(t); t += 80; }
    // مرحلة بطيئة: تباطؤ تدريجي
    for (const gap of [150, 200, 260, 340, 450]) { t += gap; timings.push(t); }

    timings.forEach((delay, idx) => {
      const isLast = idx === timings.length - 1;
      setTimeout(() => {
        const cell = isLast ? target : pool[Math.floor(Math.random() * pool.length)];
        setSelectedCell(cell);
        syncManager.broadcast({
          type: 'CELL_SELECTED',
          cellId: cell.id,
          letter: cell.letter,
          hasCard: isLast ? !!cell.hasCard : false,
          isGolden: isLast ? !!cell.isGolden : false,
        });
      }, delay);
    });

    return t + 650; // هامش ما بعد الوقوف
  };

  // اختيار حرف عشوائي - بالأنيميشن على الشبكة
  const handleRandomLetter = () => {
    if (isLocked || !roundStarted) return;
    const unansweredCells = cells.filter(c => c.status === 'unanswered');
    if (unansweredCells.length === 0) return;

    const targetCell = unansweredCells[Math.floor(Math.random() * unansweredCells.length)];
    setLocked(true);
    playBellSound();

    const afterMs = animateCellSelection(unansweredCells, targetCell);

    setTimeout(() => {
      if (targetCell.hasCard || targetCell.isGolden) {
        setShowCardTeaser(true);
        syncManager.broadcast({
          type: 'CARD_TEASER',
          letter: targetCell.letter,
          isGolden: !!targetCell.isGolden,
        });
      } else {
        (async () => {
          setIsLoadingQuestion(true);
          const question = await getSmartQuestion(targetCell.letter, settings.selectedCategories);
          setIsLoadingQuestion(false);
          if (question) {
            setCurrentQuestion(question.question_text);
            setCurrentAnswer(question.correct_answer);
            setCurrentQuestionId(question.id);
            setShowQuestion(true);
          } else {
            setCurrentQuestion(`⚠️ لا توجد أسئلة متاحة للحرف "${targetCell.letter}" في التصنيفات المختارة!`);
            setShowQuestion(true);
            setCurrentAnswer('إجابة تجريبية');
            setCurrentQuestionId(null);
          }
        })();
      }
    }, afterMs);
  };

  // إعادة تعيين الأزرار
  const handleResetBuzzers = () => {
    setBuzzerPress(null);
    setBuzzerActiveUntil(null);
    setBuzzerCountdown(0);
    hostBuzzerStateRef.current = INITIAL_BUZZER_STATE;
    hostPendingRef.current = [];
    if (hostTimerRef.current) { clearTimeout(hostTimerRef.current); hostTimerRef.current = null; }
    syncManager.broadcast({ type: 'reset-buzzers' });
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
      console.log('🔄 Resetting round...');
      resetGame();
      initializeGrid(settings);
      console.log('🗑️ Calling clearCards...');
      clearCards(); // حذف جميع البطاقات من الفريقين
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
      background: theme.bgGradient,
      padding: isMobile ? '0.75rem' : isTablet ? '1rem' : '1.5rem',
      // paddingTop يعوّض ارتفاع MatchScoreTracker (عنوان + لوحة + معلومات الجولة)
      paddingTop: isMobile ? '115px' : isTablet ? '118px' : '1.5rem',
      display: 'flex',
      flexDirection: isDesktop ? 'row' : 'column',
      gap: isMobile ? '0.75rem' : '1.25rem',
      position: 'relative',
      overflowX: 'hidden',
    }}>


      {/* لوحتي الفريقين - صف أفقي على الموبايل/التابلت */}
      {!isDesktop && (
        <div style={{
          display: 'flex',
          gap: isMobile ? '0.5rem' : '1rem',
          width: '100%',
        }}>
          {/* بطاقة الفريق الأخضر - مضغوطة */}
          <div style={{
            flex: 1,
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '2px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '1rem',
            padding: isMobile ? '0.75rem' : '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '0.5rem' : '0.75rem',
          }}>
            <div style={{
              width: isMobile ? '36px' : '42px',
              height: isMobile ? '36px' : '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10b981, #14b8a6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Users size={isMobile ? 18 : 22} color="white" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: isMobile ? '0.75rem' : '0.875rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {settings.teamNames.green}
              </div>
              <div style={{ fontSize: isMobile ? '1.75rem' : '2.25rem', fontWeight: 900, color: '#10b981', lineHeight: 1 }}>
                {scores.green}
              </div>
            </div>
            {teamCards.green.length > 0 && (
              <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
                {teamCards.green.map((card, idx) => (
                  <span key={idx} style={{ fontSize: isMobile ? '1rem' : '1.25rem' }}>{CARD_ICONS[card]}</span>
                ))}
              </div>
            )}
          </div>

          {/* بطاقة الفريق الأحمر - مضغوطة */}
          <div style={{
            flex: 1,
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '2px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '1rem',
            padding: isMobile ? '0.75rem' : '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '0.5rem' : '0.75rem',
          }}>
            <div style={{
              width: isMobile ? '36px' : '42px',
              height: isMobile ? '36px' : '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Users size={isMobile ? 18 : 22} color="white" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: isMobile ? '0.75rem' : '0.875rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {settings.teamNames.red}
              </div>
              <div style={{ fontSize: isMobile ? '1.75rem' : '2.25rem', fontWeight: 900, color: '#ef4444', lineHeight: 1 }}>
                {scores.red}
              </div>
            </div>
            {teamCards.red.length > 0 && (
              <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
                {teamCards.red.map((card, idx) => (
                  <span key={idx} style={{ fontSize: isMobile ? '1rem' : '1.25rem' }}>{CARD_ICONS[card]}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* لوحة الفريق الأيمن (الأخضر) - Desktop فقط */}
      {isDesktop && (
      <div style={{
        width: '280px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        {/* بطاقة الفريق */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '2px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '1.5rem',
          padding: '2rem 1.5rem',
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
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
              boxShadow: '0 3px 10px rgba(16, 185, 129, 0.3)',
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
              textShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
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

          {/* اللاعبون المسجلون في Answer Buzzers */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '1rem',
            padding: '1rem',
            marginTop: '1rem',
          }}>
            <div style={{
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.6)',
              marginBottom: '0.75rem',
              textAlign: 'center',
            }}>
              📱 Answer Buzzers ({registeredPlayers.filter(p => p.team === 'green').length})
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}>
              {registeredPlayers.filter(p => p.team === 'green').length > 0 ? (
                registeredPlayers.filter(p => p.team === 'green').map((player, idx) => {
                  const hKey = `green-${idx}`;
                  const isSelected = hoveredPlayer === hKey;
                  return (
                    <div key={idx} style={{ position: 'relative' }}>
                      {/* overlay للإغلاق عند الضغط خارج البطاقة */}
                      {isSelected && (
                        <div style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                          onClick={() => setHoveredPlayer(null)} />
                      )}
                      <div onClick={() => setHoveredPlayer(isSelected ? null : hKey)}
                        style={{
                          background: isSelected ? 'rgba(16,185,129,0.28)' : 'rgba(16,185,129,0.15)',
                          border: `1.5px solid rgba(16,185,129,${isSelected ? '0.7' : '0.35'})`,
                          borderRadius: '0.75rem', padding: '0.4rem',
                          display: 'flex', justifyContent: 'center', cursor: 'pointer',
                          transition: 'all 0.15s',
                          boxShadow: isSelected ? '0 0 14px rgba(16,185,129,0.35)' : 'none',
                        }}>
                        <CharacterAvatar avatar={player.avatar ?? DEFAULT_AVATAR} size={44} />
                      </div>
                      {isSelected && (
                        <div style={{
                          position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
                          zIndex: 999, background: 'rgba(10,5,25,0.97)',
                          border: '1.5px solid rgba(16,185,129,0.55)',
                          borderRadius: '1rem', padding: '0.7rem 0.8rem 0.5rem',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 20px rgba(16,185,129,0.25)',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem',
                          minWidth: '96px', whiteSpace: 'nowrap',
                        }}>
                          <CharacterAvatar avatar={player.avatar ?? DEFAULT_AVATAR} size={60} />
                          <div style={{ color: '#10b981', fontWeight: 800, fontSize: '0.75rem', textAlign: 'center' }}>{player.name}</div>
                          <button onClick={(e) => { e.stopPropagation(); kickPlayer(player.name); }} style={{
                            marginTop: '0.2rem', padding: '0.25rem 0.6rem', borderRadius: '0.5rem',
                            background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.45)',
                            color: '#ef4444', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer',
                          }}>طرد ✕</button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={{
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontSize: '0.875rem',
                  textAlign: 'center',
                  fontStyle: 'italic',
                }}>
                  لا يوجد لاعبون
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* المنطقة الوسطى */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '0.6rem' : '1.25rem',
        minWidth: 0,
        overflow: 'hidden',
      }}>


        {/* الشبكة */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: isMobile ? '260px' : isTablet ? '380px' : '500px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* 🎮 زر بدء الجولة - يظهر قبل بدء الجولة */}
          {!roundStarted && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(5px)',
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
                <div style={{ fontSize: isMobile ? '2.5rem' : '4rem', marginBottom: isMobile ? '0.5rem' : '1rem' }}>🎮</div>
                <h2 style={{
                  fontSize: isMobile ? '1.25rem' : '2rem',
                  fontWeight: 900,
                  margin: 0,
                  marginBottom: '0.5rem',
                }}>
                  جاهز للبدء؟
                </h2>
                <p style={{
                  fontSize: isMobile ? '0.875rem' : '1.125rem',
                  color: 'rgba(255, 255, 255, 0.7)',
                  margin: 0,
                }}>
                  افتح شاشة اللاعبين أولاً ثم اضغط على زر البدء
                </p>
              </div>

              <button
                onClick={handleStartRound}
                style={{
                  padding: isMobile ? '1rem 2.5rem' : '1.5rem 4rem',
                  fontSize: isMobile ? '1.25rem' : '1.75rem',
                  fontWeight: 900,
                  color: 'white',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  borderRadius: '1.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  boxShadow: '0 6px 24px rgba(16, 185, 129, 0.35)',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(16, 185, 129, 0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 6px 24px rgba(16, 185, 129, 0.35)';
                }}
              >
                <Play size={32} fill="white" />
                ابدأ الجولة
              </button>

              {/* زر فتح شاشة اللاعبين */}
              <button
                onClick={() => setShowQRCode(true)}
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
              background: 'rgba(0, 0, 0, 0.25)',
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
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(5px)',
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

        {/* شريط التحكم */}
        <div style={{
          overflowX: isMobile ? 'auto' : 'visible',
          overflowY: 'visible',
          WebkitOverflowScrolling: 'touch' as any,
          borderRadius: '2rem',
          alignSelf: 'center',
          maxWidth: '100%',
        }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isMobile ? '0.5rem' : isTablet ? '0.75rem' : '1.25rem',
          flexWrap: isMobile ? 'nowrap' : 'wrap',
          background: 'rgba(0, 0, 0, 0.35)',
          backdropFilter: 'blur(10px)',
          padding: isMobile ? '0.6rem 1rem' : '0.75rem 1.25rem',
          borderRadius: '2rem',
          border: '2px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
          minWidth: isMobile ? 'max-content' : 'auto',
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
          <ControlButton onClick={handleResetRound} color="#ef4444" icon={<RefreshCw size={isMobile ? 16 : 20} />} title="إعادة الجولة" disabled={isLocked} isMobile={isMobile} />
          {/* زرا التراجع والإعادة */}
          <ControlButton onClick={() => undoLastAction()} color="#f59e0b" icon={<Undo2 size={isMobile ? 16 : 20} />} title="تراجع" disabled={isLocked || history.length === 0} isMobile={isMobile} />
          <ControlButton onClick={() => redoLastAction()} color="#06b6d4" icon={<Redo2 size={isMobile ? 16 : 20} />} title="إعادة" disabled={isLocked || future.length === 0} isMobile={isMobile} />
          <ControlButton onClick={handleFullscreen} color="#3b82f6" icon={<Maximize size={isMobile ? 16 : 20} />} title="ملء الشاشة" disabled={false} isMobile={isMobile} />
          <ControlButton onClick={() => {
            const newPausedState = !isPaused;
            setIsPaused(newPausedState);
            // بث حالة الإيقاف المؤقت لشاشة اللاعبين
            syncManager.broadcast({
              type: 'GAME_PAUSED',
              isPaused: newPausedState,
            });
          }} color={isPaused ? "#10b981" : "#8b5cf6"} icon={isPaused ? <Play size={isMobile ? 16 : 20} /> : <Pause size={isMobile ? 16 : 20} />} title={isPaused ? "استمرار" : "إيقاف مؤقت"} disabled={isLocked} isMobile={isMobile} />
          <ControlButton onClick={handleRandomLetter} color="#ec4899" icon={<Dices size={isMobile ? 16 : 20} />} title="حرف عشوائي" disabled={isLocked} isMobile={isMobile} />
          <ControlButton onClick={handleToggleColors} color="#a855f7" icon={<Palette size={isMobile ? 16 : 20} />} title="عكس الألوان" disabled={isLocked} isMobile={isMobile} />
          <ControlButton onClick={() => setShowQRCode(true)} color="#14b8a6" icon={<Tv size={isMobile ? 16 : 20} />} title="شاشة اللاعبين" disabled={false} isMobile={isMobile} />
          <ControlButton onClick={() => setShowBuzzerQRCode(true)} color="#f59e0b" icon={<Zap size={isMobile ? 16 : 20} />} title="Answer Buzzers" disabled={false} isMobile={isMobile} />
          <ControlButton onClick={() => setShowCardPanel(true)} color="#f97316" icon={<Sparkles size={isMobile ? 16 : 20} />} title="البطاقات" disabled={isLocked} isMobile={isMobile} />
          <ControlButton onClick={() => setShowOnboarding(true)} color="#6366f1" icon={<HelpCircle size={isMobile ? 16 : 20} />} title="الدليل" disabled={false} isMobile={isMobile} />
        </div>
        </div>
      </div>

      {/* لوحة الفريق الأيسر (الأحمر) - Desktop فقط */}
      {isDesktop && (
      <div style={{
        width: '280px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        {/* بطاقة الفريق */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '2px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '1.5rem',
          padding: '2rem 1.5rem',
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
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
              boxShadow: '0 3px 10px rgba(239, 68, 68, 0.3)',
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
              textShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
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

          {/* اللاعبون المسجلون في Answer Buzzers */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '1rem',
            padding: '1rem',
            marginTop: '1rem',
          }}>
            <div style={{
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.6)',
              marginBottom: '0.75rem',
              textAlign: 'center',
            }}>
              📱 Answer Buzzers ({registeredPlayers.filter(p => p.team === 'red').length})
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}>
              {registeredPlayers.filter(p => p.team === 'red').length > 0 ? (
                registeredPlayers.filter(p => p.team === 'red').map((player, idx) => {
                  const hKey = `red-${idx}`;
                  const isSelected = hoveredPlayer === hKey;
                  return (
                    <div key={idx} style={{ position: 'relative' }}>
                      {/* overlay للإغلاق عند الضغط خارج البطاقة */}
                      {isSelected && (
                        <div style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                          onClick={() => setHoveredPlayer(null)} />
                      )}
                      <div onClick={() => setHoveredPlayer(isSelected ? null : hKey)}
                        style={{
                          background: isSelected ? 'rgba(239,68,68,0.28)' : 'rgba(239,68,68,0.15)',
                          border: `1.5px solid rgba(239,68,68,${isSelected ? '0.7' : '0.35'})`,
                          borderRadius: '0.75rem', padding: '0.4rem',
                          display: 'flex', justifyContent: 'center', cursor: 'pointer',
                          transition: 'all 0.15s',
                          boxShadow: isSelected ? '0 0 14px rgba(239,68,68,0.35)' : 'none',
                        }}>
                        <CharacterAvatar avatar={player.avatar ?? DEFAULT_AVATAR} size={44} />
                      </div>
                      {isSelected && (
                        <div style={{
                          position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
                          zIndex: 999, background: 'rgba(10,5,25,0.97)',
                          border: '1.5px solid rgba(239,68,68,0.55)',
                          borderRadius: '1rem', padding: '0.7rem 0.8rem 0.5rem',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 20px rgba(239,68,68,0.25)',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem',
                          minWidth: '96px', whiteSpace: 'nowrap',
                        }}>
                          <CharacterAvatar avatar={player.avatar ?? DEFAULT_AVATAR} size={60} />
                          <div style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.75rem', textAlign: 'center' }}>{player.name}</div>
                          <button onClick={(e) => { e.stopPropagation(); kickPlayer(player.name); }} style={{
                            marginTop: '0.2rem', padding: '0.25rem 0.6rem', borderRadius: '0.5rem',
                            background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.45)',
                            color: '#ef4444', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer',
                          }}>طرد ✕</button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={{
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontSize: '0.875rem',
                  textAlign: 'center',
                  fontStyle: 'italic',
                }}>
                  لا يوجد لاعبون
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* نافذة السؤال */}
      {showQuestion && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: isMobile ? '0.75rem' : '2rem',
        }}>
          <div style={{
            maxWidth: isMobile ? '100%' : isTablet ? '90%' : '800px',
            width: '100%',
            background: 'linear-gradient(135deg, #1a0b2e, #2d1154)',
            border: '3px solid rgba(168, 85, 247, 0.5)',
            borderRadius: isMobile ? '1rem' : '2rem',
            padding: isMobile ? '1.5rem' : isTablet ? '2rem' : '3rem',
          }}>
            <div style={{
              textAlign: 'center',
              marginBottom: isMobile ? '1rem' : '2rem',
            }}>
              <div style={{
                display: 'inline-block',
                padding: isMobile ? '1rem 1.5rem' : '1.5rem 2.5rem',
                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                borderRadius: '1.5rem',
                fontSize: isMobile ? '2.5rem' : isTablet ? '3rem' : '4rem',
                fontWeight: 900,
                color: 'white',
              }}>
                {selectedCell?.letter}
              </div>

              {/* Card Prize Indicator */}
              {pendingCard && (
                <div style={{
                  marginTop: isMobile ? '1rem' : '1.5rem',
                  padding: isMobile ? '0.75rem 1rem' : '1rem 2rem',
                  background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(249, 115, 22, 0.2))',
                  border: '2px solid rgba(251, 191, 36, 0.5)',
                  borderRadius: '1rem',
                  display: 'inline-block',
                }}>
                  <div style={{
                    fontSize: isMobile ? '0.875rem' : '1.25rem',
                    fontWeight: 900,
                    color: '#fbbf24',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexWrap: isMobile ? 'wrap' : 'nowrap',
                    justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: isMobile ? '1.25rem' : '2rem' }}>{CARD_ICONS[pendingCard]}</span>
                    <span>الفريق الفائز يحصل على هذه البطاقة!</span>
                  </div>
                </div>
              )}
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '2px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '1.5rem',
              padding: isMobile ? '1rem' : '2rem',
              marginBottom: isMobile ? '1rem' : '2rem',
            }}>
              <div style={{
                color: 'white',
                fontSize: isMobile ? '1.1rem' : '1.5rem',
                fontWeight: 700,
              }}>
                {currentQuestion}
              </div>
              
            </div>
          {/* 3. ✅ صندوق الإجابة (تم نقله ليصبح تحت السؤال) */}
            {currentAnswer && (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '2px dashed rgba(16, 185, 129, 0.4)', borderRadius: '1.25rem', padding: isMobile ? '1rem' : '1.5rem', marginBottom: isMobile ? '1rem' : '2rem', textAlign: 'center' }}>
                <div style={{ color: '#10b981', fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                   الإجابة الصحيحة ✓
                </div>
                <div style={{ color: '#10b981', fontSize: isMobile ? '1.1rem' : '1.5rem', fontWeight: 900 }}>
                  {currentAnswer}
                </div>
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: isMobile ? '0.5rem' : '1rem',
              marginBottom: isMobile ? '0.5rem' : '1rem',
            }}>
              <button
                onClick={() => handleTeamWin('green')}
                style={{
                  padding: isMobile ? '1rem' : '1.5rem',
                  background: 'linear-gradient(135deg, #10b981, #14b8a6)',
                  border: 'none',
                  borderRadius: '1rem',
                  color: 'white',
                  fontSize: isMobile ? '0.875rem' : '1.125rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <CheckCircle2 size={isMobile ? 18 : 24} />
                {settings.teamNames.green}
              </button>

              <button
                onClick={() => handleTeamWin('red')}
                style={{
                  padding: isMobile ? '1rem' : '1.5rem',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  border: 'none',
                  borderRadius: '1rem',
                  color: 'white',
                  fontSize: isMobile ? '0.875rem' : '1.125rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <CheckCircle2 size={isMobile ? 18 : 24} />
                {settings.teamNames.red}
              </button>
            </div>

            {/* صف تغيير السؤال + إظهار السؤال للاعبين */}
            <div style={{ display: 'flex', gap: isMobile ? '0.4rem' : '0.6rem' }}>
              <button
                onClick={handleChangeQuestion}
                style={{
                  flex: 1,
                  padding: isMobile ? '0.875rem' : '1.25rem',
                  background: 'rgba(168, 85, 247, 0.2)',
                  border: '2px solid rgba(168, 85, 247, 0.5)',
                  borderRadius: '1rem',
                  color: '#a855f7',
                  fontSize: isMobile ? '0.8rem' : '0.95rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                }}
              >
                <RefreshCw size={isMobile ? 15 : 18} />
                تغيير السؤال
              </button>

              {/* زر إظهار/إخفاء السؤال في شاشة اللاعبين */}
              <button
                onClick={() => {
                  const next = !showQuestionOnPlayers;
                  setShowQuestionOnPlayers(next);
                  if (next) {
                    syncManager.broadcast({
                      type: 'SHOW_QUESTION_TO_PLAYERS',
                      question: currentQuestion,
                      letter: selectedCell?.letter ?? '',
                    });
                  } else {
                    syncManager.broadcast({ type: 'HIDE_QUESTION_FROM_PLAYERS' });
                  }
                }}
                style={{
                  flex: 1,
                  padding: isMobile ? '0.875rem' : '1.25rem',
                  background: showQuestionOnPlayers
                    ? 'rgba(16, 185, 129, 0.25)'
                    : 'rgba(20, 184, 166, 0.12)',
                  border: `2px solid ${showQuestionOnPlayers ? 'rgba(16,185,129,0.7)' : 'rgba(20,184,166,0.35)'}`,
                  borderRadius: '1rem',
                  color: showQuestionOnPlayers ? '#10b981' : '#14b8a6',
                  fontSize: isMobile ? '0.8rem' : '0.95rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s',
                }}
              >
                {showQuestionOnPlayers ? '👁️ مخفي السؤال' : '📺 أظهر للاعبين'}
              </button>
            </div>
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

      {/* ─── إعلان السلسلة: 3 إجابات متتالية ─── */}
      {showStreakAnnouncement && streakRewardTeam && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(5,0,15,0.97) 0%, rgba(20,5,45,0.97) 100%)',
          backdropFilter: 'blur(24px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 4500,
          direction: 'rtl',
        }}>
          {/* جسيمات */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {[...Array(24)].map((_, i) => (
              <div key={i} style={{
                position: 'absolute',
                width: `${3 + (i % 5)}px`,
                height: `${3 + (i % 5)}px`,
                borderRadius: '50%',
                background: ['#fbbf24','#f97316','#ef4444','#ffffff'][i % 4],
                opacity: 0.55,
                left: `${(i * 43) % 100}%`,
                top: `${(i * 61) % 100}%`,
                animation: `saFloat ${2 + (i % 3) * 0.7}s ease-in-out infinite`,
                animationDelay: `${(i * 0.15) % 2}s`,
              }} />
            ))}
          </div>

          <div style={{
            position: 'relative',
            maxWidth: isMobile ? '92vw' : '560px',
            width: '100%',
            background: 'linear-gradient(145deg, rgba(26,11,46,0.99), rgba(8,0,20,0.99))',
            border: '2px solid rgba(251,191,36,0.55)',
            borderRadius: isMobile ? '1.5rem' : '2rem',
            padding: isMobile ? '2rem 1.5rem' : '3rem 2.5rem',
            textAlign: 'center',
            boxShadow: '0 0 80px rgba(251,191,36,0.35), 0 40px 100px rgba(0,0,0,0.7)',
            animation: 'saSlideIn 0.5s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            {/* شريط علوي ذهبي */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
              background: 'linear-gradient(90deg,#fbbf24,#f97316,#fbbf24)',
              borderRadius: '2rem 2rem 0 0',
            }} />

            {/* أيقونة النار */}
            <div style={{
              fontSize: isMobile ? '3.5rem' : '5rem',
              marginBottom: isMobile ? '0.5rem' : '0.75rem',
              animation: 'saFirePulse 0.8s ease-in-out infinite alternate',
              filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.8))',
            }}>
              🔥
            </div>

            {/* النص الرئيسي */}
            <div style={{
              fontSize: isMobile ? '1.1rem' : '1.4rem',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.65)',
              marginBottom: '0.5rem',
            }}>
              3 إجابات متتالية!
            </div>

            <div style={{
              fontSize: isMobile ? '1.6rem' : '2.2rem',
              fontWeight: 900,
              color: streakRewardTeam === 'green' ? '#10b981' : '#ef4444',
              textShadow: streakRewardTeam === 'green'
                ? '0 0 24px rgba(16,185,129,0.6)'
                : '0 0 24px rgba(239,68,68,0.6)',
              marginBottom: isMobile ? '0.75rem' : '1rem',
              lineHeight: 1.2,
            }}>
              {settings.teamNames[streakRewardTeam]}
            </div>

            <div style={{
              fontSize: isMobile ? '0.95rem' : '1.15rem',
              fontWeight: 700,
              color: '#fbbf24',
              marginBottom: isMobile ? '1.5rem' : '2rem',
            }}>
              🎁 يستحق بطاقة مكافأة!
            </div>

            {/* تعليمات */}
            <div style={{
              padding: isMobile ? '0.65rem 1rem' : '0.85rem 1.5rem',
              background: 'rgba(251,191,36,0.1)',
              border: '1.5px solid rgba(251,191,36,0.3)',
              borderRadius: '0.9rem',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              color: 'rgba(255,255,255,0.65)',
              marginBottom: isMobile ? '1.25rem' : '1.75rem',
            }}>
              اضغط "ابدأ الروليت" عندما تكون جاهزاً لبدء دوران البطاقة
            </div>

            {/* زر ابدأ الروليت */}
            <button
              onClick={() => {
                setShowStreakAnnouncement(false);
                setRouletteTriggerType('card');
                setShowRoulette(true);
                syncManager.broadcast({ type: 'ROULETTE_START', triggerType: 'card' });
              }}
              style={{
                width: '100%',
                padding: isMobile ? '0.9rem' : '1.1rem',
                background: 'linear-gradient(135deg,#fbbf24,#f97316)',
                border: 'none',
                borderRadius: '1rem',
                color: '#1a0800',
                fontSize: isMobile ? '1rem' : '1.15rem',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 8px 28px rgba(251,191,36,0.45)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              🎰 ابدأ الروليت
            </button>
          </div>

          <style>{`
            @keyframes saSlideIn    { from { opacity:0; transform:translateY(40px) scale(0.9); } to { opacity:1; transform:translateY(0) scale(1); } }
            @keyframes saFirePulse  { from { transform:scale(1); } to { transform:scale(1.15); } }
            @keyframes saFloat      { 0%,100% { opacity:0; transform:scale(0) translateY(0); } 50% { opacity:0.6; transform:scale(1) translateY(-20px); } }
          `}</style>
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
            fontSize: isMobile ? '4rem' : isTablet ? '6rem' : '8rem',
            marginBottom: isMobile ? '1rem' : '2rem',
            animation: 'bounce 0.6s ease-in-out infinite',
          }}>
            🎲
          </div>
          <h1 style={{
            fontSize: isMobile ? '1.75rem' : isTablet ? '2.5rem' : '3.5rem',
            fontWeight: 900,
            color: 'white',
            textShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            textAlign: 'center',
            margin: 0,
            padding: isMobile ? '0 1rem' : 0,
          }}>
            حرف عشوائي!
          </h1>
          <p style={{
            fontSize: isMobile ? '1rem' : isTablet ? '1.25rem' : '1.75rem',
            color: 'rgba(255, 255, 255, 0.9)',
            marginTop: isMobile ? '0.75rem' : '1.5rem',
            textAlign: 'center',
            padding: isMobile ? '0 1rem' : 0,
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
        gameName={settings.gameName}
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

      {/* شاشة التشويق قبل كشف البطاقة */}
      {showCardTeaser && selectedCell && (
        <CardTeaserOverlay
          letter={selectedCell.letter}
          isGolden={!!selectedCell.isGolden}
          isHost={true}
          onReveal={handleRevealCard}
        />
      )}

      {/* روليت البطاقات */}
      {showRoulette && (
        <CardRoulette
          onComplete={handleRouletteComplete}
          triggerType={rouletteTriggerType}
        />
      )}

      {/* نافذة تأكيد الفوز اليدوي من المقدم */}
      {pendingWin && (() => {
        const isGreen   = pendingWin.detectedTeam === 'green';
        const otherTeam = isGreen ? 'red' : 'green';
        const teamColor = isGreen ? '#10b981' : '#ef4444';
        const teamGlow  = isGreen ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)';
        const teamGrad  = isGreen
          ? 'linear-gradient(135deg,#10b981,#14b8a6,#059669)'
          : 'linear-gradient(135deg,#ef4444,#dc2626,#b91c1c)';
        const otherColor = isGreen ? '#ef4444' : '#10b981';
        return (
          <div style={{
            position: 'fixed', inset: 0,
            background: 'linear-gradient(180deg,rgba(5,0,15,0.96) 0%,rgba(15,5,35,0.96) 100%)',
            backdropFilter: 'blur(22px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 6000, direction: 'rtl', padding: '1rem',
            animation: 'pwFadeIn 0.35s ease-out',
          }}>

            {/* جسيمات خلفية */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
              {[...Array(18)].map((_, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  width: `${2 + (i % 4)}px`, height: `${2 + (i % 4)}px`,
                  borderRadius: '50%',
                  background: i % 3 === 0 ? '#fbbf24' : i % 3 === 1 ? teamColor : 'rgba(255,255,255,0.4)',
                  opacity: 0.35,
                  left: `${(i * 43) % 100}%`, top: `${(i * 67) % 100}%`,
                  animation: `pwFloat ${2.2 + (i % 3) * 0.7}s ease-in-out infinite`,
                  animationDelay: `${(i * 0.15) % 2}s`,
                }} />
              ))}
            </div>

            {/* البطاقة الرئيسية */}
            <div style={{
              position: 'relative', maxWidth: '460px', width: '100%',
              background: 'linear-gradient(145deg,rgba(26,11,46,0.98),rgba(8,0,20,0.98))',
              border: `2px solid ${teamColor}50`,
              borderRadius: '2rem',
              padding: '2.25rem 1.75rem',
              boxShadow: `0 0 60px ${teamGlow}, 0 30px 80px rgba(0,0,0,0.65)`,
              textAlign: 'center',
              animation: 'pwSlideUp 0.45s cubic-bezier(0.34,1.56,0.64,1)',
              overflow: 'hidden',
            }}>

              {/* شريط لوني علوي */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                height: '4px', background: teamGrad,
                borderRadius: '2rem 2rem 0 0',
              }} />

              {/* أيقونة التنبيه */}
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '90px', height: '90px', margin: '0 auto',
                  background: 'rgba(251,191,36,0.1)',
                  border: '2px solid rgba(251,191,36,0.3)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 35px rgba(251,191,36,0.18)',
                  animation: 'pwPulse 1.8s ease-in-out infinite',
                }}>
                  <span style={{ fontSize: '2.6rem', lineHeight: 1 }}>⚠️</span>
                </div>
                {/* شارة اسم الفريق */}
                <div style={{
                  position: 'absolute', bottom: -8, left: '50%',
                  transform: 'translateX(-50%)',
                  background: teamGrad, borderRadius: '1rem',
                  padding: '0.22rem 0.85rem',
                  fontSize: '0.7rem', fontWeight: 800, color: 'white',
                  whiteSpace: 'nowrap',
                  boxShadow: `0 4px 12px ${teamGlow}`,
                }}>
                  {settings.teamNames[pendingWin.detectedTeam]}
                </div>
              </div>

              {/* العنوان */}
              <div style={{
                fontSize: '1.45rem', fontWeight: 900, color: 'white',
                marginTop: '0.4rem', marginBottom: '0.5rem', lineHeight: 1.3,
              }}>
                تم اكتشاف حالة فوز!
              </div>

              {/* رسالة الفوز */}
              <div style={{
                fontSize: '0.82rem', color: 'rgba(255,255,255,0.42)',
                marginBottom: '1.5rem', lineHeight: 1.65, padding: '0 0.5rem',
              }}>
                {pendingWin.message}
              </div>

              {/* فاصل */}
              <div style={{
                height: '1px', marginBottom: '1.1rem',
                background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)',
              }} />

              {/* تسمية */}
              <div style={{
                fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em',
                color: 'rgba(255,255,255,0.28)', marginBottom: '0.85rem',
                textTransform: 'uppercase',
              }}>
                اختر قرار المقدم
              </div>

              {/* الأزرار */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>

                {/* تأكيد الفريق المكتشف */}
                <button
                  onClick={() => { forceRoundWin(pendingWin.detectedTeam, pendingWin.message); setPendingWin(null); setLocked(false); }}
                  style={{
                    width: '100%', padding: '0.88rem 1rem',
                    background: teamGrad, border: 'none',
                    borderRadius: '0.9rem', color: 'white',
                    fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer',
                    boxShadow: `0 6px 20px ${teamGlow}`,
                    transition: 'transform 0.18s, box-shadow 0.18s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <span>✅</span>
                  <span>تأكيد فوز {settings.teamNames[pendingWin.detectedTeam]}</span>
                </button>

                {/* منح الفوز للفريق الآخر */}
                <button
                  onClick={() => { forceRoundWin(otherTeam, `🏆 ${settings.teamNames[otherTeam]} فاز بالجولة!`); setPendingWin(null); setLocked(false); }}
                  style={{
                    width: '100%', padding: '0.88rem 1rem',
                    background: `${otherColor}16`,
                    border: `1.5px solid ${otherColor}38`,
                    borderRadius: '0.9rem', color: otherColor,
                    fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                    transition: 'transform 0.18s, background 0.18s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = `${otherColor}28`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = `${otherColor}16`; }}
                >
                  <span>🔄</span>
                  <span>منح الفوز لـ {settings.teamNames[otherTeam]}</span>
                </button>

                {/* إلغاء */}
                <button
                  onClick={() => { setPendingWin(null); setLocked(false); }}
                  style={{
                    width: '100%', padding: '0.75rem 1rem',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1.5px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.9rem', color: 'rgba(255,255,255,0.4)',
                    fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer',
                    transition: 'background 0.18s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                >
                  <span>❌</span>
                  <span>إلغاء — لا يوجد فوز</span>
                </button>
              </div>
            </div>

            <style>{`
              @keyframes pwFadeIn  { from{opacity:0}                                        to{opacity:1} }
              @keyframes pwSlideUp { from{opacity:0;transform:translateY(40px) scale(0.92)} to{opacity:1;transform:translateY(0) scale(1)} }
              @keyframes pwPulse   { 0%,100%{transform:scale(1);box-shadow:0 0 35px rgba(251,191,36,0.18)}
                                     50%{transform:scale(1.07);box-shadow:0 0 55px rgba(251,191,36,0.42)} }
              @keyframes pwFloat   { 0%,100%{opacity:0;transform:scale(0) translateY(0)}
                                     50%{opacity:0.5;transform:scale(1) translateY(-18px)} }
            `}</style>
          </div>
        );
      })()}

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

      {/* مودال QR Code لربط الأجهزة */}
      {showQRCode && (
        <QRCodeModal
          sessionId={sessionId}
          onClose={() => setShowQRCode(false)}
        />
      )}

      {/* مودال QR Code للأزرار */}
      {showBuzzerQRCode && (
        <BuzzerQRCodeModal
          sessionId={sessionId}
          onClose={() => setShowBuzzerQRCode(false)}
        />
      )}

      {/* إشعار ضغط الزر */}
      {buzzerPress && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'buzzerFadeIn 0.3s ease-out',
          }}
        >
          <div
            style={{
              background: buzzerPress.team === 'green'
                ? 'linear-gradient(145deg, #059669, #10b981, #34d399)'
                : 'linear-gradient(145deg, #b91c1c, #ef4444, #f87171)',
              border: '4px solid rgba(255, 255, 255, 0.5)',
              borderRadius: isMobile ? '2rem' : '2.5rem',
              padding: isMobile ? '2rem 2.5rem' : '2.5rem 4rem',
              boxShadow: buzzerPress.team === 'green'
                ? '0 0 80px rgba(16, 185, 129, 0.6), 0 0 200px rgba(16, 185, 129, 0.2)'
                : '0 0 80px rgba(239, 68, 68, 0.6), 0 0 200px rgba(239, 68, 68, 0.2)',
              animation: 'buzzerBounceIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: isMobile ? '0.75rem' : '1rem',
              minWidth: isMobile ? '280px' : '380px',
            }}
          >
            {/* شارة المرحلة */}
            {buzzerPress.phase && (
              <div style={{
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                fontWeight: 900,
                color: 'rgba(255,255,255,0.9)',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '2rem',
                padding: '0.2rem 0.85rem',
                letterSpacing: '0.04em',
              }}>
                {buzzerPress.phase === 'phase1' ? 'المرحلة ١' : buzzerPress.phase === 'phase2' ? 'المرحلة ٢' : 'المرحلة ٣'}
              </div>
            )}

            {/* أفاتار اللاعب أو أيقونة احتياطية */}
            {buzzerPress.avatar ? (
              <div style={{
                width: isMobile ? '100px' : '130px',
                height: isMobile ? '100px' : '130px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.18)',
                border: '4px solid rgba(255,255,255,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 40px rgba(255,255,255,0.2)',
                animation: 'buzzerAvatarBounce 1s ease-in-out infinite',
              }}>
                <CharacterAvatar
                  avatar={buzzerPress.avatar}
                  size={isMobile ? 76 : 100}
                />
              </div>
            ) : (
              <div style={{
                fontSize: isMobile ? '3.5rem' : '5rem',
                lineHeight: 1,
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
              }}>
                {buzzerPress.type === 'answer' ? '📣' : '🎴'}
              </div>
            )}

            <h2 style={{
              fontSize: isMobile ? '2rem' : '3rem',
              fontWeight: 900,
              color: 'white',
              margin: 0,
              textAlign: 'center',
              textShadow: '0 2px 8px rgba(0,0,0,0.3)',
              letterSpacing: '-0.02em',
            }}>
              {buzzerPress.playerName}
            </h2>
            <p style={{
              fontSize: isMobile ? '1.1rem' : '1.4rem',
              color: 'rgba(255, 255, 255, 0.95)',
              margin: 0,
              fontWeight: 700,
            }}>
              {buzzerPress.type === 'answer' ? 'يريد الإجابة!' : 'يطلب بطاقة!'}
            </p>
            {/* عداد تنازلي للخمس ثوانٍ */}
            {buzzerCountdown > 0 && (
              <div style={{
                fontSize: isMobile ? '3rem' : '4rem',
                fontWeight: 900,
                color: 'white',
                textShadow: '0 0 24px rgba(255,255,255,0.6)',
                lineHeight: 1,
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '1rem',
                padding: '0.25rem 1rem',
                minWidth: '3rem',
                textAlign: 'center',
              }}>
                {buzzerCountdown}
              </div>
            )}
            <button
              onClick={handleResetBuzzers}
              style={{
                marginTop: '0.5rem',
                padding: isMobile ? '0.65rem 1.75rem' : '0.85rem 2.5rem',
                borderRadius: '1rem',
                background: 'rgba(255, 255, 255, 0.25)',
                border: '2.5px solid rgba(255, 255, 255, 0.7)',
                color: 'white',
                fontSize: isMobile ? '1rem' : '1.15rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s',
                backdropFilter: 'blur(4px)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
              }}
            >
              ✓ تم
            </button>
          </div>
        </div>
      )}

      {/* شاشة التعليم للمقدم */}
      {showOnboarding && (
        <HostOnboarding
          onComplete={() => setShowOnboarding(false)}
          onDontShowAgain={() => {
            localStorage.setItem('host-onboarding-done', 'true');
          }}
        />
      )}

      <style>{`
        @keyframes buzzerFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes buzzerBounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          60% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes buzzerAvatarBounce {
          0%,100% { transform: translateY(0) rotate(-4deg); }
          50%      { transform: translateY(-10px) rotate(4deg); }
        }
      `}</style>
    </div>
  );
};

// مكون زر التحكم
const ControlButton: React.FC<{
  onClick: () => void;
  color: string;
  icon: React.ReactNode;
  title: string;
  disabled?: boolean;
  isMobile?: boolean;
}> = ({ onClick, color, icon, title, disabled = false, isMobile = false }) => {
  const size = isMobile ? 40 : 48;
  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={disabled ? '🔒 معطل أثناء المعالجة' : title}
      disabled={disabled}
      style={{
        width: `${size}px`,
        height: `${size}px`,
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
};

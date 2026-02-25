// src/store/useGameStore.ts - التصحيح

import { create } from 'zustand';
import type { HexCell, Team, GameSettings, CardType } from '../core/types';
import { syncManager } from '../utils/SyncManager';
import { applyCardEffect, updateCardCounters } from '../utils/cardPermissions';

// لقطة حالة اللعبة لنظام التراجع/الإعادة
interface GameStateSnapshot {
  cells: HexCell[];
  scores: { green: number; red: number };
  winner: Team;
  winMessage: string | null;
  matchWinner: 'green' | 'red' | null;
  teamCards: { green: CardType[]; red: CardType[] };
  winStreak: { green: number; red: number };
}

interface GameStore {
  cells: HexCell[];
  settings: GameSettings;
  winner: Team;
  winMessage: string | null;
  matchWinner: 'green' | 'red' | null; // الفائز بالمباراة (Best of X)
  currentRound: number;
  scores: { green: number; red: number };
  teamCards: {
    green: CardType[];
    red: CardType[];
  };
  winStreak: {
    green: number;
    red: number;
  };
  isLocked: boolean; // 🔒 Action Lock: prevents interaction during roulette/question

  // سجل التراجع/الإعادة
  history: GameStateSnapshot[];
  future: GameStateSnapshot[];

  initializeGrid: (settings?: GameSettings) => void;
  claimCell: (cellId: string, team: Team) => void;
  syncFromExternal: (cells: HexCell[]) => void;
  resetGame: () => void;
  nextRound: () => void;
  addCardToTeam: (team: 'green' | 'red', card: CardType) => void;
  useCard: (team: 'green' | 'red', card: CardType, targetCellId: string | null) => { triggerBattle?: boolean; battleCellId?: string };
  setLocked: (locked: boolean) => void; // 🔒 Lock/unlock game actions
  updateStreak: (winningTeam: 'green' | 'red') => { streakReached: boolean; team: 'green' | 'red' | null };
  resetStreak: () => void;
  clearCards: () => void; // حذف جميع البطاقات من الفريقين
  resetMatch: () => void; // إعادة تعيين المباراة كاملة
  forceRoundWin: (team: 'green' | 'red', winMsg?: string) => void; // إعلان الفوز يدوياً من المقدم
  decrementCounters: () => void; // تحديث عدادات التجميد والدرع بعد كل سؤال
  saveSnapshot: () => void; // حفظ لقطة قبل كل إجراء مهم
  undoLastAction: () => boolean; // تراجع خطوة
  redoLastAction: () => boolean; // إعادة خطوة
}

export const useGameStore = create<GameStore>((set, get) => ({
  cells: [],
  winner: null,
  winMessage: null,
  matchWinner: null,
  currentRound: 1,
  scores: { green: 0, red: 0 },
  teamCards: { green: [], red: [] },
  winStreak: { green: 0, red: 0 },
  isLocked: false, // 🔒 Initially unlocked
  history: [],
  future: [],
  
  settings: {
    gameName: '',
    teamNames: { green: 'الفريق الأخضر', red: 'الفريق الأحمر' },
    winCondition: 'most-letters',
    teamColors: { green: 'horizontal', red: 'vertical' },
    rounds: 3,
    enableCards: true,
    enableRandomLetter: true,
    enableStreakReward: true,
    enableHiddenCards: true,
    hiddenCardsCount: 5,
    enableGoldenLetter: true,
    cardDistribution: 'random',
    showCardLocations: 'on-press',
    cardTypes: {
      freeze: true,
      bomb: true,
      battle: true,
      shield: true,
    },
    carryCardsToNextRound: false,
    selectedCategories: [],
    gameMode: 'normal',
    showQuestionsToTeams: true,
    timePerQuestion: 30,
  },

  initializeGrid: (newSettings?: GameSettings) => {
    const currentSettings = newSettings || get().settings;

    const newCells: HexCell[] = [];
    const alphabet = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي";

    // توزيع عشوائي بدون تكرار (25 حرف فريد)
    const shuffledAlphabet = alphabet.split('').sort(() => Math.random() - 0.5);
    const gridLayout = [[5], [5], [5], [5], [5]];

    let letterIndex = 0;

    // إنشاء الخلايا
    for (let r = 0; r < gridLayout.length; r++) {
      const cellsInRow = gridLayout[r][0];

      for (let q = 0; q < cellsInRow; q++) {
        newCells.push({
          id: `c-${r}-${q}`,
          q,
          r,
          letter: shuffledAlphabet[letterIndex % shuffledAlphabet.length],
          status: 'unanswered',
          isGolden: false,
          hasCard: false,
          // التجميد
          isFrozen: false,
          frozenBy: null,
          freezeCounter: 0,
          // الحماية
          isShielded: false,
          shieldCounter: 0,
          categoryId: 'general',
        });
        letterIndex++;
      }
    }
    
    // إضافة الكروت المخفية (حسب الإعدادات)
    if (currentSettings.enableHiddenCards && currentSettings.hiddenCardsCount > 0) {
      const availableIndices = [...Array(25).keys()];
      const cardCount = Math.min(currentSettings.hiddenCardsCount, 25);
      
      for (let i = 0; i < cardCount; i++) {
        const randomIndex = Math.floor(Math.random() * availableIndices.length);
        const cellIndex = availableIndices.splice(randomIndex, 1)[0];
        newCells[cellIndex].hasCard = true;
      }
    }
    
    // إضافة الحرف الذهبي (حسب الإعدادات)
    if (currentSettings.enableGoldenLetter) {
      const randomIndex = Math.floor(Math.random() * 25);
      newCells[randomIndex].isGolden = true;
    }
    
    set({
      cells: newCells,
      winner: null,
      winMessage: null,
      settings: currentSettings,
      history: [],
      future: [],
    });
    
    // بث الشبكة
    syncManager.broadcast({ 
      type: 'GRID_INITIALIZED', 
      cells: newCells,
      settings: currentSettings,
    });
  },

  claimCell: (cellId: string, team: Team) => {
    const { cells } = get();
    const updated = cells.map((c) =>
      c.id === cellId ? { ...c, status: team as 'green' | 'red' } : c
    );
    
    set({ cells: updated });

    // بث التحديث
    syncManager.broadcast({ type: 'CELL_CLAIMED', cellId, team, cells: updated });
  },

  // استقبال التحديثات
  syncFromExternal: (cells: HexCell[]) => {
    set({ cells });
  },

  // إعادة تعيين اللعبة (جولة جديدة)
  resetGame: () => {
    set({ cells: [], winner: null, winMessage: null, winStreak: { green: 0, red: 0 }, history: [], future: [] });
  },

  // الجولة التالية
  nextRound: () => {
    const { currentRound, settings, teamCards } = get();
    const maxRounds = settings.rounds === 'infinite' ? Infinity : settings.rounds;

    if (currentRound < maxRounds) {
      // إذا كان ترحيل البطاقات مطفأ → نمسح بطاقات الفريقين
      const newTeamCards = settings.carryCardsToNextRound
        ? teamCards
        : { green: [], red: [] };

      set({
        currentRound: currentRound + 1,
        cells: [],
        winner: null,
        winMessage: null,
        teamCards: newTeamCards,
        history: [],
        future: [],
      });

      // بث مسح البطاقات لشاشة اللاعبين إن لزم
      if (!settings.carryCardsToNextRound) {
        syncManager.broadcast({
          type: 'CARDS_CLEARED',
          teamCards: newTeamCards,
        });
      }
    }
  },

  // إضافة بطاقة لفريق
  addCardToTeam: (team: 'green' | 'red', card: CardType) => {
    const { teamCards } = get();
    const newTeamCards = {
      ...teamCards,
      [team]: [...teamCards[team], card],
    };
    set({ teamCards: newTeamCards });

    // بث التحديث
    syncManager.broadcast({
      type: 'CARD_ADDED',
      team,
      card,
      teamCards: newTeamCards,
    });
  },

  // استخدام بطاقة - تُرجع معلومات المعركة إذا كانت بطاقة معركة
  useCard: (team: 'green' | 'red', card: CardType, targetCellId: string | null): { triggerBattle?: boolean; battleCellId?: string } => {
    const { cells, teamCards } = get();

    // تطبيق تأثير البطاقة
    const result = applyCardEffect(card, cells, targetCellId, team);
    const updatedCells = result.cells;

    // إزالة البطاقة الأولى من نوعها من رصيد الفريق (ليس كل البطاقات)
    const cardIndex = teamCards[team].indexOf(card);
    const newTeamCards = {
      ...teamCards,
      [team]: cardIndex >= 0
        ? [...teamCards[team].slice(0, cardIndex), ...teamCards[team].slice(cardIndex + 1)]
        : teamCards[team],
    };

    set({ cells: updatedCells, teamCards: newTeamCards });

    // بث التحديث
    syncManager.broadcast({
      type: 'CARD_USED',
      team,
      card,
      targetCellId,
      cells: updatedCells,
      teamCards: newTeamCards,
    });

    // إرجاع معلومات المعركة إذا كانت بطاقة معركة
    return {
      triggerBattle: result.triggerBattle,
      battleCellId: result.battleCellId,
    };
  },

  // 🔒 Lock/Unlock Actions
  setLocked: (locked: boolean) => {
    set({ isLocked: locked });

    // Broadcast lock state to synced screens
    syncManager.broadcast({
      type: 'LOCK_STATE_CHANGED',
      isLocked: locked,
    });
  },

  // 🔥 تحديث سلسلة الإجابات
  updateStreak: (winningTeam: 'green' | 'red') => {
    const { winStreak } = get();
    const losingTeam = winningTeam === 'green' ? 'red' : 'green';

    // زيادة سلسلة الفريق الفائز وإعادة تعيين الفريق الخاسر
    const newStreak = {
      [winningTeam]: winStreak[winningTeam] + 1,
      [losingTeam]: 0,
    } as { green: number; red: number };

    set({ winStreak: newStreak });

    // بث تحديث السلسلة
    syncManager.broadcast({
      type: 'STREAK_UPDATED',
      winStreak: newStreak,
    });

    // فحص إذا وصل لـ 3 إجابات متتالية
    if (newStreak[winningTeam] >= 3) {
      // إعادة تعيين السلسلة
      set({ winStreak: { green: 0, red: 0 } });
      syncManager.broadcast({
        type: 'STREAK_UPDATED',
        winStreak: { green: 0, red: 0 },
      });
      return { streakReached: true, team: winningTeam };
    }

    return { streakReached: false, team: null };
  },

  // إعادة تعيين السلسلة
  resetStreak: () => {
    set({ winStreak: { green: 0, red: 0 } });
    syncManager.broadcast({
      type: 'STREAK_UPDATED',
      winStreak: { green: 0, red: 0 },
    });
  },

  // حذف جميع البطاقات من الفريقين
  clearCards: () => {
    console.log('🗑️ clearCards() called - clearing all cards');
    set({ teamCards: { green: [], red: [] } });
    syncManager.broadcast({
      type: 'CARDS_CLEARED',
      teamCards: { green: [], red: [] },
    });
  },

  // إعادة تعيين المباراة كاملة
  resetMatch: () => {
    set({
      cells: [],
      winner: null,
      winMessage: null,
      matchWinner: null,
      currentRound: 1,
      scores: { green: 0, red: 0 },
      teamCards: { green: [], red: [] },
      winStreak: { green: 0, red: 0 },
      history: [],
      future: [],
    });
    syncManager.broadcast({
      type: 'MATCH_RESET',
    });
  },

  // إعلان الفوز يدوياً من المقدم
  forceRoundWin: (team: 'green' | 'red', winMsg?: string) => {
    const { scores, currentRound, settings } = get();
    const teamName = settings.teamNames[team];
    const message = winMsg || `🏆 ${teamName} فاز بالجولة!`;

    const newScores = { ...scores };
    newScores[team]++;

    let matchWinnerTeam: 'green' | 'red' | null = null;
    const totalRounds = settings.rounds;
    if (typeof totalRounds === 'number' && totalRounds !== Infinity) {
      const winsNeeded = Math.ceil(totalRounds / 2);
      if (newScores.green >= winsNeeded) matchWinnerTeam = 'green';
      else if (newScores.red >= winsNeeded) matchWinnerTeam = 'red';
    }

    set({ winner: team, winMessage: message, scores: newScores, matchWinner: matchWinnerTeam });

    syncManager.broadcast({
      type: 'GAME_WON',
      winner: team,
      winMessage: message,
      scores: newScores,
      round: currentRound,
      matchWinner: matchWinnerTeam,
    });
  },

  // تحديث عدادات التجميد والدرع بعد كل سؤال
  decrementCounters: () => {
    const { cells } = get();
    const updatedCells = updateCardCounters(cells);

    set({ cells: updatedCells });

    // بث التحديث للشاشات الأخرى
    syncManager.broadcast({
      type: 'COUNTERS_UPDATED',
      cells: updatedCells,
    });
  },

  // ─── نظام التراجع / الإعادة ───────────────────────────────────────────────

  // حفظ لقطة من الحالة الحالية قبل تنفيذ إجراء مهم
  saveSnapshot: () => {
    const { cells, scores, winner, winMessage, matchWinner, teamCards, winStreak, history } = get();
    const snapshot: GameStateSnapshot = {
      cells: cells.map(c => ({ ...c })),
      scores: { ...scores },
      winner,
      winMessage,
      matchWinner,
      teamCards: { green: [...teamCards.green], red: [...teamCards.red] },
      winStreak: { ...winStreak },
    };
    // احتفظ بأحدث 10 لقطات فقط، وأفرغ قائمة الإعادة
    set({ history: [...history.slice(-9), snapshot], future: [] });
  },

  // تراجع خطوة واحدة — يُرجع true إذا نجح
  undoLastAction: () => {
    const { history, future, cells, scores, winner, winMessage, matchWinner, teamCards, winStreak } = get();
    if (history.length === 0) return false;

    // احفظ الحالة الحالية في قائمة الإعادة
    const currentSnapshot: GameStateSnapshot = {
      cells: cells.map(c => ({ ...c })),
      scores: { ...scores },
      winner,
      winMessage,
      matchWinner,
      teamCards: { green: [...teamCards.green], red: [...teamCards.red] },
      winStreak: { ...winStreak },
    };

    const prev = history[history.length - 1];

    set({
      cells: prev.cells,
      scores: prev.scores,
      winner: prev.winner,
      winMessage: prev.winMessage,
      matchWinner: prev.matchWinner,
      teamCards: prev.teamCards,
      winStreak: prev.winStreak,
      history: history.slice(0, -1),
      future: [...future, currentSnapshot],
    });

    // بث الحالة الكاملة لشاشة اللاعبين
    syncManager.broadcast({
      type: 'FULL_STATE_SYNC',
      cells: prev.cells,
      scores: prev.scores,
      winner: prev.winner,
      winMessage: prev.winMessage,
      matchWinner: prev.matchWinner,
      teamCards: prev.teamCards,
      winStreak: prev.winStreak,
      timestamp: Date.now(),
    });

    return true;
  },

  // إعادة خطوة — يُرجع true إذا نجح
  redoLastAction: () => {
    const { history, future, cells, scores, winner, winMessage, matchWinner, teamCards, winStreak } = get();
    if (future.length === 0) return false;

    // احفظ الحالة الحالية في سجل التراجع
    const currentSnapshot: GameStateSnapshot = {
      cells: cells.map(c => ({ ...c })),
      scores: { ...scores },
      winner,
      winMessage,
      matchWinner,
      teamCards: { green: [...teamCards.green], red: [...teamCards.red] },
      winStreak: { ...winStreak },
    };

    const next = future[future.length - 1];

    set({
      cells: next.cells,
      scores: next.scores,
      winner: next.winner,
      winMessage: next.winMessage,
      matchWinner: next.matchWinner,
      teamCards: next.teamCards,
      winStreak: next.winStreak,
      history: [...history, currentSnapshot],
      future: future.slice(0, -1),
    });

    // بث الحالة الكاملة لشاشة اللاعبين
    syncManager.broadcast({
      type: 'FULL_STATE_SYNC',
      cells: next.cells,
      scores: next.scores,
      winner: next.winner,
      winMessage: next.winMessage,
      matchWinner: next.matchWinner,
      teamCards: next.teamCards,
      winStreak: next.winStreak,
      timestamp: Date.now(),
    });

    return true;
  },
}));
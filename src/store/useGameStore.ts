// src/store/useGameStore.ts - التصحيح

import { create } from 'zustand';
import type { HexCell, Team, GameSettings, CardType } from '../core/types';
import { syncManager } from '../utils/SyncManager';
import { checkWinCondition, getWinMessage } from '../utils/winChecker';

interface GameStore {
  cells: HexCell[];
  settings: GameSettings;
  winner: Team;
  winMessage: string | null;
  currentRound: number;
  scores: { green: number; red: number };
  teamCards: {
    green: CardType[];
    red: CardType[];
  };
  
  initializeGrid: (settings?: GameSettings) => void;
  claimCell: (cellId: string, team: Team) => void;
  syncFromExternal: (cells: HexCell[]) => void;
  resetGame: () => void;
  nextRound: () => void;
  addCardToTeam: (team: 'green' | 'red', card: CardType) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  cells: [],
  winner: null,
  winMessage: null,
  currentRound: 1,
  scores: { green: 0, red: 0 },
  teamCards: { green: [], red: [] },
  
  settings: {
    gameName: '',
    teamNames: { green: 'الفريق الأخضر', red: 'الفريق الأحمر' },
    winCondition: 'most-letters',
    teamColors: { green: 'both', red: 'both' },
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
      demonShuffle: true,
      speedUp: true,
      luck: true,
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
    
    const gridLayout = [[5], [5], [5], [5], [5]];
    
    // إنشاء الخلايا
    for (let r = 0; r < gridLayout.length; r++) {
      const cellsInRow = gridLayout[r][0];
      
      for (let q = 0; q < cellsInRow; q++) {
        newCells.push({
          id: `c-${r}-${q}`,
          q,
          r,
          letter: alphabet[Math.floor(Math.random() * alphabet.length)],
          status: 'unanswered',
          isGolden: false,
          hasCard: false,
          frozenBy: null,
          freezeCounter: 0,
          hasShield: false,
          categoryId: 'general',
        });
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
    });
    
    // بث الشبكة
    syncManager.broadcast({ 
      type: 'GRID_INITIALIZED', 
      cells: newCells,
      settings: currentSettings,
    });
  },

  claimCell: (cellId: string, team: Team) => {
    const { cells, settings, scores, currentRound } = get();
    const updated = cells.map((c) =>
      c.id === cellId ? { ...c, status: team as 'green' | 'red' } : c
    );
    
    set({ cells: updated });
    
    // بث التحديث
    syncManager.broadcast({ type: 'CELL_CLAIMED', cellId, team, cells: updated });
    
    // فحص الفوز
    const winCheck = checkWinCondition(updated, team, settings.winCondition, settings.teamColors);
    
    if (winCheck.winner) {
      const teamName = settings.teamNames[winCheck.winner as 'green' | 'red'];
      const message = getWinMessage(winCheck.winner, winCheck.winType!, teamName);
      
      // تحديث النقاط
      const newScores = { ...scores };
      newScores[winCheck.winner as 'green' | 'red']++;
      
      set({ 
        winner: winCheck.winner, 
        winMessage: message,
        scores: newScores,
      });
      
      // بث الفوز
      syncManager.broadcast({ 
        type: 'GAME_WON', 
        winner: winCheck.winner, 
        winMessage: message,
        scores: newScores,
        round: currentRound,
      });
    }
  },

  // استقبال التحديثات
  syncFromExternal: (cells: HexCell[]) => {
    set({ cells });
  },

  // إعادة تعيين اللعبة (جولة جديدة)
  resetGame: () => {
    set({ cells: [], winner: null, winMessage: null });
  },

  // الجولة التالية
  nextRound: () => {
    const { currentRound, settings } = get();
    const maxRounds = settings.rounds === 'infinite' ? Infinity : settings.rounds;
    
    if (currentRound < maxRounds) {
      set({ 
        currentRound: currentRound + 1,
        cells: [],
        winner: null,
        winMessage: null,
      });
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
}));
// src/store/useGameStore.ts - التصحيح

import { create } from 'zustand';
import type { HexCell, Team, GameSettings } from '../core/types';
import { syncManager } from '../utils/SyncManager';
import { checkWinCondition, getWinMessage } from '../utils/winChecker';

interface GameStore {
  cells: HexCell[];
  settings: GameSettings;
  winner: Team;
  winMessage: string | null;
  
  initializeGrid: () => void;
  claimCell: (cellId: string, team: Team) => void;
  syncFromExternal: (cells: HexCell[]) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  cells: [],
  winner: null,
  winMessage: null,
  
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

  initializeGrid: () => {
    const newCells: HexCell[] = [];
    const alphabet = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي";
    
    // الشبكة ثابتة 5×5 = 25 خلية
    const gridSize = '5x5';
    const totalCells = 25;
    const gridLayout = [
      [5], // row 0: 5 cells
      [5], // row 1: 5 cells
      [5], // row 2: 5 cells
      [5], // row 3: 5 cells
      [5], // row 4: 5 cells
    ];
    
    let cellIndex = 0;
    
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
          hasCard: Math.random() < 0.2, // 20% فرصة بطاقة
          frozenBy: null,
          freezeCounter: 0,
          hasShield: false,
          categoryId: 'general',
        });
        cellIndex++;
      }
    }
    
    set({ cells: newCells, winner: null, winMessage: null });
    
    // بث الشبكة الجديدة للشاشات الأخرى
    syncManager.broadcast({ type: 'GRID_INITIALIZED', cells: newCells });
  },

  claimCell: (cellId: string, team: Team) => {
    const { cells, settings } = get();
    const updated = cells.map((c) =>
      c.id === cellId ? { ...c, status: team as 'green' | 'red' } : c
    );
    
    set({ cells: updated });
    
    // بث التحديث لجميع الشاشات
    syncManager.broadcast({ type: 'CELL_CLAIMED', cellId, team, cells: updated });
    
    // فحص الفوز
    const winCheck = checkWinCondition(updated, team, settings.winCondition, settings.teamColors);
    
    if (winCheck.winner) {
      const teamName = settings.teamNames[winCheck.winner as 'green' | 'red'];
      const message = getWinMessage(winCheck.winner, winCheck.winType!, teamName);
      
      set({ winner: winCheck.winner, winMessage: message });
      
      // بث الفوز
      syncManager.broadcast({ 
        type: 'GAME_WON', 
        winner: winCheck.winner, 
        winMessage: message 
      });
    }
  },

  // استقبال التحديثات من شاشات أخرى
  syncFromExternal: (cells: HexCell[]) => {
    set({ cells });
  },

  // إعادة تعيين اللعبة
  resetGame: () => {
    set({ cells: [], winner: null, winMessage: null });
  },
}));
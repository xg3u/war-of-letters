// src/store/useGameStore.ts
import { create } from 'zustand';
import type { HexCell, Team, GameSettings } from '../core/types';
import { checkWin } from '../core/hexUtils';

interface GameState {
  cells: HexCell[];
  settings: GameSettings;
  winner: Team;
  initializeGrid: (size: number) => void;
  claimCell: (cellId: string, team: Team) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  cells: [],
  winner: null,
  settings: {
    teamNames: { green: 'الأخضر', red: 'الأحمر' },
    winCondition: 'wall-to-wall',
    gridSize: 5
  },

  initializeGrid: (size: number) => {
    const newCells: HexCell[] = [];
    const alphabet = "أبتثجحخدذرزسشصضطظعغفقكلمنهوي";
    for (let r = 0; r < size; r++) {
      for (let q = 0; q < size; q++) {
        newCells.push({
          id: `c-${q}-${r}`,
          q, r,
          letter: alphabet[Math.floor(Math.random() * alphabet.length)],
          status: 'unanswered',
          isGolden: false,
          hasCard: false,
          frozenBy: null,
          freezeCounter: 0,
          hasShield: false
        });
      }
    }
    set({ cells: newCells, winner: null });
  },

  claimCell: (cellId: string, team: Team) => {
    const { cells, settings } = get();
    const updated = cells.map(c => 
      c.id === cellId ? { ...c, status: team as 'green' | 'red' } : c
    );
    
    set({ cells: updated });

    if (checkWin(updated, team, settings.gridSize)) {
      set({ winner: team });
    }
  }
}));
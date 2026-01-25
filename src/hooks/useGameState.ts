/**
 * useGameState Hook - Centralized game state destructuring
 * Eliminates duplicate state management across HostScreen and PlayersScreen
 * 
 * Problem Solved:
 * - Before: 20+ properties destructured identically in 2 components (~40 lines duplicated)
 * - After: Single hook call returns all required state
 * 
 * Benefits:
 * - DRY principle: Single source of truth for state access
 * - Maintenance: Adding state only requires updating this one hook
 * - Type safety: Centralized type definitions
 * - Performance: Easier to add selective re-render optimization
 */

import { useGameStore } from '../store/useGameStore';
import type { CardType } from '../components/ActionCardPanel';
import type { HexCell } from '../core/types';

/**
 * Central game state interface
 * Includes all state properties needed by screens
 * MUST match useGameStore state exactly!
 */
export interface GameState {
  // Grid & Board State
  cells: HexCell[];
  winner: 'green' | 'red' | null;
  winningPath: HexCell[];
  winMessage: string | null;

  // Scoring State
  scores: {
    green: number;
    red: number;
  };
  correctAnswerStreak: {
    green: number;
    red: number;
  };
  currentRound: number;

  // Game Settings (from store)
  settings: any;

  // Card System
  teamCards: {
    green: CardType[];
    red: CardType[];
  };

  // Tournament State
  matchScore: {
    green: number;
    red: number;
  };
  roundsWon: {
    green: number;
    red: number;
  };
  matchWinner: 'green' | 'red' | null;

  // Animation States
  isRouletteSpinning: boolean;
  cardFlipping: { cellId: string | null; isFlipping: boolean };
  randomLetterCell: HexCell | null;
  isLocked: boolean;
}

/**
 * Hook to get all game state in one call
 * Replaces destructuring patterns like:
 * const { cells, winner, scores, ... } = useGameStore();
 * 
 * Usage in components:
 * const gameState = useGameState();
 * console.log(gameState.cells, gameState.winner, gameState.scores);
 */
export const useGameState = (): GameState => {
  // Single Zustand selector call that returns all game state
  return useGameStore((state: any) => ({
    // Grid & Board State
    cells: state.cells,
    winner: state.winner,
    winningPath: state.winningPath,
    winMessage: state.winMessage,

    // Scoring State
    scores: state.scores,
    correctAnswerStreak: state.correctAnswerStreak,
    currentRound: state.currentRound,

    // Game Settings
    settings: state.settings,

    // Card System
    teamCards: state.teamCards,

    // Tournament State
    matchScore: state.matchScore,
    roundsWon: state.roundsWon,
    matchWinner: state.matchWinner,

    // Animation & Lock States
    isRouletteSpinning: state.isRouletteSpinning,
    cardFlipping: state.cardFlipping,
    randomLetterCell: state.randomLetterCell,
    isLocked: state.isLocked,
  }));
};

/**
 * Hook to get only grid-related state (for HexGrid component)
 * Optimized selector for better performance
 * 
 * Usage:
 * const { cells, winner, winningPath } = useGridState();
 */
export const useGridState = () => {
  return useGameStore((state: any) => ({
    cells: state.cells,
    winner: state.winner,
    winningPath: state.winningPath,
  }));
};

/**
 * Hook to get only card-related state (for CardPanel component)
 * Optimized selector for better performance
 * 
 * Usage:
 * const { teamCards, selectedCard, selectedCardTeam } = useCardState();
 */
export const useCardState = () => {
  return useGameStore((state: any) => ({
    teamCards: state.teamCards,
    selectedCard: state.selectedCard,
    selectedCardTeam: state.selectedCardTeam,
    selectedTargetCellId: state.selectedTargetCellId,
  }));
};

/**
 * Hook to get only tournament-related state
 * Optimized selector for better performance
 * 
 * Usage:
 * const { matchScore, matchWinner, bestOfRounds } = useTournamentState();
 */
export const useTournamentState = () => {
  return useGameStore((state: any) => ({
    matchScore: state.matchScore,
    roundsWon: state.roundsWon,
    matchWinner: state.matchWinner,
    bestOfRounds: state.bestOfRounds,
    currentRound: state.currentRound,
  }));
};

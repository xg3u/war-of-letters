/**
 * Hooks barrel export
 * Centralized re-export of all custom hooks
 */

export { useGameState, useGridState, useCardState, useTournamentState } from './useGameState';
export type { GameState } from './useGameState';

export { useSync, useSyncMinimal } from './useSync';
export type { SyncCallbacks } from './useSync';

export { useScreenSize } from './useScreenSize';
export type { ScreenSize, ScreenInfo } from './useScreenSize';

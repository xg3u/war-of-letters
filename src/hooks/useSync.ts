/**
 * useSync Hook - Centralized broadcast subscription management
 * Handles all BroadcastChannel subscriptions in one place
 * 
 * Problem Solved:
 * - Before: PlayersScreen had 100+ lines of subscription handling
 * - After: Single hook handles all broadcasts with clean separation
 * 
 * Benefits:
 * - Testability: Broadcast logic separated from UI
 * - Reusability: Any component can use this hook
 * - Maintainability: All broadcasts handled in one file
 * - Performance: Automatic cleanup on unmount
 */

import { useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { syncManager } from '../utils/SyncManager';

/**
 * Callback types for different broadcast events
 */
export interface SyncCallbacks {
  onGridInitialized?: (data: any) => void;
  onCellClaimed?: (data: any) => void;
  onStreakUpdated?: (data: any) => void;
  onCardInventoryUpdated?: (data: any) => void;
  onCardUsed?: (data: any) => void;
  onRoundTransition?: (data: any) => void;
  onSettingsUpdated?: (data: any) => void;
  onLockStateChanged?: (data: any) => void;
  onZoomChanged?: (data: any) => void;
  onRouletteShow?: (data: any) => void;
  onRandomLetterSelected?: (data: any) => void;
  onMatchVictory?: (data: any) => void;
  onGameWon?: (data: any) => void;
  onCompleteStateSync?: (data: any) => void;
}

/**
 * Hook to subscribe to game broadcasts
 * Centralizes all BroadcastChannel listeners
 *
 * Usage in components:
 * useSync({
 *   onGridInitialized: (data) => { ... },
 *   onCardInventoryUpdated: (data) => { ... },
 * });
 *
 * Cleanup is automatic on component unmount
 */
export const useSync = (callbacks: SyncCallbacks = {}) => {
  const syncFromExternal = useGameStore((state: any) => state.syncFromExternal);
  const syncRandomLetter = useGameStore((state: any) => state.syncRandomLetter);

  // Use ref for callbacks to avoid re-subscriptions
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const handleSyncMessage = useCallback(
    (data: any) => {
      const cbs = callbacksRef.current;

      // 🔄 COMPLETE STATE SYNC
      if (data.type === 'COMPLETE_STATE_SYNC') {
        console.log('✅ Syncing complete state from Host');
        if (data.cells) syncFromExternal(data.cells);
        cbs.onCompleteStateSync?.(data);
      }
      // 🔄 GRID INITIALIZATION - CRITICAL
      else if (data.type === 'GRID_INITIALIZED') {
        console.log('✅ GRID INITIALIZED received! Cells:', data.cells?.length, 'cells');
        if (data.cells) syncFromExternal(data.cells);
        if (data.settings) {
          localStorage.setItem('current-game-settings', JSON.stringify(data.settings));
        }
        cbs.onGridInitialized?.(data);
      }
      // 🔄 CELL CLAIMED
      else if (data.type === 'CELL_CLAIMED') {
        console.log('📍 Cell claimed by', data.team, '| Streak:', data.correctAnswerStreak);
        if (data.cells) syncFromExternal(data.cells);
        cbs.onCellClaimed?.(data);
      }
      // 🔄 STREAK COUNTER
      else if (data.type === 'STREAK_COUNTER_UPDATED') {
        console.log('🔥 Streak updated for', data.team, ':', data.newStreak);
        cbs.onStreakUpdated?.(data);
      }
      // 🔄 TEAM CARDS
      else if (data.type === 'TEAM_CARDS_UPDATED') {
        console.log('🃏 Card inventory updated:', data.teamCards);
        cbs.onCardInventoryUpdated?.(data);
      }
      // 🔄 CARD USED
      else if (data.type === 'CARD_USED') {
        console.log('⚡ Card used by', data.team, ':', data.card);
        if (data.cells) syncFromExternal(data.cells);
        cbs.onCardUsed?.(data);
      }
      // 🔄 ROUND TRANSITION
      else if (data.type === 'ROUND_TRANSITION') {
        console.log('🔄 Round transition:', data.nextRound);
        console.log('   Carry-over enabled:', data.carryOverEnabled);
        console.log('   Green cards:', data.teamCards?.green?.length);
        console.log('   Red cards:', data.teamCards?.red?.length);
        cbs.onRoundTransition?.(data);
      }
      // 🔄 SETTINGS UPDATED
      else if (data.type === 'SETTINGS_UPDATED') {
        console.log('⚙️ Settings updated:', data.settings);
        if (data.settings) {
          localStorage.setItem('current-game-settings', JSON.stringify(data.settings));
        }
        cbs.onSettingsUpdated?.(data);
      }
      // 🔄 LOCK STATE CHANGED
      else if (data.type === 'LOCK_STATE_CHANGED') {
        console.log('🔐 Lock state changed for cell:', data.cellId, 'locked:', data.isLocked);
        if (data.cells) syncFromExternal(data.cells);
        cbs.onLockStateChanged?.(data);
      }
      // 🔄 ZOOM CHANGED
      else if (data.type === 'ZOOM_CHANGED' && typeof data.zoom === 'number') {
        console.log('🔍 Zoom changed to:', data.zoom);
        cbs.onZoomChanged?.(data);
      }
      // 🔄 SHOW ROULETTE
      else if (data.type === 'SHOW_ROULETTE') {
        console.log('🎰 Roulette triggered for', data.team, 'mode:', data.mode);
        cbs.onRouletteShow?.(data);
      }
      // 🔄 RANDOM LETTER
      else if (data.type === 'RANDOM_LETTER_SELECTED') {
        console.log('🎲 Random letter selected:', data.cellId);
        if (data.cellId && syncRandomLetter) {
          syncRandomLetter(data.cellId);
        }
        cbs.onRandomLetterSelected?.(data);
      }
      // 🔄 MATCH VICTORY
      else if (data.type === 'MATCH_VICTORY') {
        console.log('🏆 Match victory:', data.matchWinner);
        cbs.onMatchVictory?.(data);
      }
      // 🔄 GAME WON
      else if (data.type === 'GAME_WON') {
        console.log('🎉 Round won by', data.winner);
        cbs.onGameWon?.(data);
      }
    },
    [syncFromExternal, syncRandomLetter]
  );

  useEffect(() => {
    const unsubscribe = syncManager.subscribe(handleSyncMessage);
    return unsubscribe;
  }, [handleSyncMessage]);
};

/**
 * Minimal sync hook - only subscribes to specific events
 * Use this when you only need a few broadcast types
 * 
 * Usage:
 * useSyncMinimal('GRID_INITIALIZED', 'CELL_CLAIMED');
 */
export const useSyncMinimal = (...eventTypes: string[]) => {
  const syncFromExternal = useGameStore((state: any) => state.syncFromExternal);

  const handleSync = useCallback(
    (data: any) => {
      if (eventTypes.includes(data.type)) {
        console.log(`📡 Broadcast received: ${data.type}`);
        // Only sync cells for most broadcasts
        if (data.cells) syncFromExternal(data.cells);
      }
    },
    [syncFromExternal, eventTypes]
  );

  useEffect(() => {
    const unsubscribe = syncManager.subscribe(handleSync);
    return unsubscribe;
  }, [handleSync]);
};

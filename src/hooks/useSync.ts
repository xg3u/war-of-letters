/**
 * useSync Hook - Centralized broadcast subscription management
 * Handles all BroadcastChannel subscriptions in one place
 */

import { useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { syncManager } from '../utils/SyncManager';

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

export const useSync = (callbacks: SyncCallbacks = {}) => {
  // نأخذ الدوال من الـ store مرة واحدة بـ ref لتجنب إعادة الاشتراك
  const syncFromExternalRef = useRef(useGameStore.getState().syncFromExternal);

  // callbacks ref — يُحدَّث كل render بدون إعادة subscribe
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  // handler مستقر لا يتغير هويته أبداً → لا إعادة اشتراك
  const handleSyncMessage = useCallback((data: any) => {
    const cbs = callbacksRef.current;
    const syncFromExternal = syncFromExternalRef.current;

    if (data.type === 'COMPLETE_STATE_SYNC') {
      if (data.cells) syncFromExternal(data.cells);
      cbs.onCompleteStateSync?.(data);
    } else if (data.type === 'GRID_INITIALIZED') {
      if (data.cells) syncFromExternal(data.cells);
      if (data.settings) {
        localStorage.setItem('current-game-settings', JSON.stringify(data.settings));
      }
      cbs.onGridInitialized?.(data);
    } else if (data.type === 'CELL_CLAIMED') {
      if (data.cells) syncFromExternal(data.cells);
      cbs.onCellClaimed?.(data);
    } else if (data.type === 'STREAK_COUNTER_UPDATED') {
      cbs.onStreakUpdated?.(data);
    } else if (data.type === 'TEAM_CARDS_UPDATED') {
      cbs.onCardInventoryUpdated?.(data);
    } else if (data.type === 'CARD_USED') {
      if (data.cells) syncFromExternal(data.cells);
      cbs.onCardUsed?.(data);
    } else if (data.type === 'ROUND_TRANSITION') {
      cbs.onRoundTransition?.(data);
    } else if (data.type === 'SETTINGS_UPDATED') {
      if (data.settings) {
        localStorage.setItem('current-game-settings', JSON.stringify(data.settings));
      }
      cbs.onSettingsUpdated?.(data);
    } else if (data.type === 'LOCK_STATE_CHANGED') {
      if (data.cells) syncFromExternal(data.cells);
      cbs.onLockStateChanged?.(data);
    } else if (data.type === 'ZOOM_CHANGED' && typeof data.zoom === 'number') {
      cbs.onZoomChanged?.(data);
    } else if (data.type === 'SHOW_ROULETTE') {
      cbs.onRouletteShow?.(data);
    } else if (data.type === 'RANDOM_LETTER_SELECTED') {
      cbs.onRandomLetterSelected?.(data);
    } else if (data.type === 'MATCH_VICTORY') {
      cbs.onMatchVictory?.(data);
    } else if (data.type === 'GAME_WON') {
      cbs.onGameWon?.(data);
    }
  }, []); // [] — handler لا يعيد الاشتراك أبداً

  useEffect(() => {
    const unsubscribe = syncManager.subscribe(handleSyncMessage);
    return unsubscribe;
  }, [handleSyncMessage]);
};

/**
 * Minimal sync hook - only subscribes to specific events
 */
export const useSyncMinimal = (...eventTypes: string[]) => {
  const syncFromExternalRef = useRef(useGameStore.getState().syncFromExternal);
  // eventTypes ref لتجنب إعادة الاشتراك عند تغيير المصفوفة
  const eventTypesRef = useRef(eventTypes);
  eventTypesRef.current = eventTypes;

  const handleSync = useCallback((data: any) => {
    if (eventTypesRef.current.includes(data.type)) {
      if (data.cells) syncFromExternalRef.current(data.cells);
    }
  }, []); // [] — مستقر تماماً

  useEffect(() => {
    const unsubscribe = syncManager.subscribe(handleSync);
    return unsubscribe;
  }, [handleSync]);
};

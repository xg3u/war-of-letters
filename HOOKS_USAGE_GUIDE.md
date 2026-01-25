# 🎣 Custom Hooks Usage Guide

Quick reference for the new custom hooks created in Phase 0.

## 🎮 useGameState - Get All Game State

**Purpose:** Centralized access to all game state  
**Location:** `src/hooks/useGameState.ts`

### Basic Usage

```tsx
import { useGameState } from '../hooks';

export const MyComponent = () => {
  const gameState = useGameState();
  
  // Access state properties
  const { cells, winner, scores, teamCards } = gameState;
  
  return (
    <div>
      Score: {scores.green} vs {scores.red}
      Winner: {winner}
    </div>
  );
};
```

### All Available Properties

```tsx
const gameState = useGameState();

// Grid & Board
gameState.cells              // HexCell[]
gameState.winner             // 'green' | 'red' | null
gameState.winningPath        // HexCell[]
gameState.winMessage         // string | null

// Scoring
gameState.scores             // { green: number, red: number }
gameState.correctAnswerStreak // { green: number, red: number }
gameState.currentRound       // number

// Cards
gameState.teamCards          // { green: CardType[], red: CardType[] }
gameState.selectedCard       // string | null
gameState.selectedCardTeam   // 'green' | 'red' | null

// Tournament
gameState.matchScore         // { green: number, red: number }
gameState.matchWinner        // 'green' | 'red' | null
gameState.bestOfRounds       // number

// Animation State
gameState.isRouletteSpinning // boolean
gameState.cardFlipping       // { [key: string]: boolean }
```

---

## 🎯 Specialized Selectors - Performance Optimization

Use these when you only need specific state to avoid unnecessary re-renders.

### useGridState - Grid Only

```tsx
import { useGridState } from '../hooks';

export const GridDisplay = () => {
  const { cells, winner, winningPath } = useGridState();
  // Only re-renders when cells, winner, or winningPath change
  return <HexGrid cells={cells} winner={winner} />;
};
```

### useCardState - Card System Only

```tsx
import { useCardState } from '../hooks';

export const CardPanel = () => {
  const { teamCards, selectedCard, selectedCardTeam } = useCardState();
  // Only re-renders when card state changes
  return <CardDisplay cards={teamCards.green} />;
};
```

### useTournamentState - Tournament Only

```tsx
import { useTournamentState } from '../hooks';

export const ScoreBoard = () => {
  const { matchScore, matchWinner, bestOfRounds } = useTournamentState();
  // Only re-renders when tournament state changes
  return <TournamentInfo score={matchScore} />;
};
```

---

## 📡 useSync - Handle Broadcasts

**Purpose:** Subscribe to game broadcasts  
**Location:** `src/hooks/useSync.ts`

### Basic Usage - Callback Style

```tsx
import { useSync } from '../hooks';

export const GameComponent = () => {
  // Subscribe to specific events with callbacks
  useSync({
    onGridInitialized: (data) => {
      console.log('Grid ready!', data.cells);
    },
    onCellClaimed: (data) => {
      console.log('Cell claimed by', data.team);
    },
    onCardUsed: (data) => {
      console.log('Card effect:', data.card);
    },
  });
  
  return <div>Game content</div>;
};
```

**Automatic cleanup:** Unsubscribed when component unmounts!

### All Available Callbacks

```tsx
useSync({
  // Grid & Board Events
  onCompleteStateSync: (data) => { },
  onGridInitialized: (data) => { },
  onCellClaimed: (data) => { },
  
  // Streak & Scoring
  onStreakUpdated: (data) => { },
  
  // Card Events
  onCardInventoryUpdated: (data) => { },
  onCardUsed: (data) => { },
  
  // Game Flow
  onRoundTransition: (data) => { },
  onSettingsUpdated: (data) => { },
  onLockStateChanged: (data) => { },
  
  // UI Events
  onZoomChanged: (data) => { },
  onRouletteShow: (data) => { },
  onRandomLetterSelected: (data) => { },
  
  // Match Events
  onMatchVictory: (data) => { },
  onGameWon: (data) => { },
});
```

### Example: Monitoring Grid Initialization

```tsx
import { useSync } from '../hooks';
import { useState } from 'react';

export const GridMonitor = () => {
  const [gridReady, setGridReady] = useState(false);
  
  useSync({
    onGridInitialized: (data) => {
      console.log(`✅ Grid ready with ${data.cells.length} cells`);
      setGridReady(true);
    },
  });
  
  return (
    <div>
      {gridReady ? '🟢 Grid Ready' : '🔴 Waiting for Grid'}
    </div>
  );
};
```

---

## 📍 useSyncMinimal - Lightweight Version

**Purpose:** Subscribe to only specific broadcast types  
**Performance:** Lighter than useSync when you need few events

### Usage

```tsx
import { useSyncMinimal } from '../hooks';

export const CardCounter = () => {
  // Only subscribe to card events
  useSyncMinimal('CARD_ADDED', 'CARD_USED', 'TEAM_CARDS_UPDATED');
  
  return <div>Card count: {teamCards.green.length}</div>;
};
```

---

## 🔄 Migration Example: From Old to New

### Before (Old Way)

```tsx
import { useGameStore } from '../store/useGameStore';
import { syncManager } from '../utils/SyncManager';

export const PlayersScreen = () => {
  // ❌ Manual destructuring of 20+ properties
  const {
    cells,
    syncFromExternal,
    syncRandomLetter,
    winner,
    scores,
    // ... 15+ more properties
  } = useGameStore();
  
  // ❌ Manual subscription logic (100+ lines)
  React.useEffect(() => {
    const unsubscribe = syncManager.subscribe((data) => {
      if (data.type === 'GRID_INITIALIZED') {
        console.log('Grid ready');
        syncFromExternal(data.cells);
      } else if (data.type === 'CARD_USED') {
        console.log('Card used');
      }
      // ... 12+ more if/else branches
    });
    return unsubscribe;
  }, [syncFromExternal, syncRandomLetter]);
  
  return <div>Game UI</div>;
};
```

### After (New Way)

```tsx
import { useGameState, useSync } from '../hooks';

export const PlayersScreen = () => {
  // ✅ Single hook call
  const gameState = useGameState();
  const { cells, winner, scores } = gameState;
  
  // ✅ Clean callback-based subscriptions
  useSync({
    onGridInitialized: (data) => {
      console.log('Grid ready');
    },
    onCardUsed: (data) => {
      console.log('Card used');
    },
  });
  
  return <div>Game UI</div>;
};
```

**Improvements:**
- Code reduced from ~150 lines to ~30 lines (-80%)
- Duplicate destructuring eliminated
- Broadcast logic moved to reusable hook
- Automatic cleanup on unmount

---

## 🎨 Best Practices

### 1. Use Specialized Selectors When Possible
```tsx
// ✅ GOOD - Only re-renders when grid changes
const { cells } = useGridState();

// ❌ AVOID - Re-renders on any state change
const gameState = useGameState();
const { cells } = gameState;
```

### 2. Keep Callbacks Minimal
```tsx
// ✅ GOOD - Simple callback
useSync({
  onCellClaimed: (data) => {
    console.log('Cell claimed');
  },
});

// ❌ AVOID - Complex logic in callback
useSync({
  onCellClaimed: (data) => {
    calculateWinPath();
    updateStreaks();
    refreshUI();
    // ... complex logic
  },
});
```

### 3. Use State Updates for Complex Logic
```tsx
// ✅ GOOD - Use Zustand actions
useSync({
  onCellClaimed: (data) => {
    store.updateStreakCounter(data);  // Use Zustand action
  },
});

// ❌ AVOID - Direct state manipulation
useSync({
  onCellClaimed: (data) => {
    setState(prev => ({ ... }));  // Avoid useState
  },
});
```

### 4. Handle Cleanup Properly
```tsx
// ✅ GOOD - useSync handles cleanup automatically
export const MyComponent = () => {
  useSync({ /* ... */ });
  return <div>Content</div>;
};

// ❌ AVOID - Manual cleanup (not needed)
export const MyComponent = () => {
  useEffect(() => {
    const unsub = syncManager.subscribe(...);
    return unsub;
  }, []);
};
```

---

## 🧪 Testing Hooks

### Test useGameState

```tsx
import { useGameState } from '../hooks';
import { renderHook } from '@testing-library/react';

test('useGameState returns game state', () => {
  const { result } = renderHook(() => useGameState());
  
  expect(result.current.cells).toBeDefined();
  expect(result.current.winner).toBeNull();
  expect(result.current.scores).toEqual({ green: 0, red: 0 });
});
```

### Test useSync

```tsx
import { useSync } from '../hooks';
import { renderHook } from '@testing-library/react';

test('useSync calls callback on broadcast', () => {
  const callback = jest.fn();
  
  renderHook(() => useSync({
    onGridInitialized: callback,
  }));
  
  // Simulate broadcast
  syncManager.broadcast({ type: 'GRID_INITIALIZED', cells: [...] });
  
  expect(callback).toHaveBeenCalled();
});
```

---

## 📚 Hook Reference Table

| Hook | Purpose | Use When |
|------|---------|----------|
| `useGameState` | All game state | Need multiple state properties |
| `useGridState` | Grid only | Only showing grid |
| `useCardState` | Cards only | Managing card inventory |
| `useTournamentState` | Tournament only | Tracking match score |
| `useSync` | All broadcasts | Need to react to events |
| `useSyncMinimal` | Specific broadcasts | Only need few events |

---

## 💡 Common Patterns

### Pattern 1: Update on Event
```tsx
const [cellCount, setCellCount] = useState(0);
const { cells } = useGridState();

useSync({
  onCellClaimed: () => {
    setCellCount(prev => prev + 1);
  },
});
```

### Pattern 2: Conditional Rendering
```tsx
const { winner } = useGameState();

if (!winner) return <GameBoard />;
return <VictoryScreen winner={winner} />;
```

### Pattern 3: Effect on State Change
```tsx
const { scores } = useGameState();

useEffect(() => {
  if (scores.green > 10) {
    alert('Green is winning!');
  }
}, [scores]);
```

---

## 🚀 Performance Tips

1. **Use specialized selectors** to avoid re-renders
2. **Keep callbacks lightweight** - just update state
3. **Memoize callbacks** if passing to child components
4. **Use React.memo** on components using grid state
5. **Profile performance** with React DevTools

---

## Questions?

For issues or questions:
- Check [PHASE_0_CLEANUP_COMPLETION.md](PHASE_0_CLEANUP_COMPLETION.md) for architecture details
- Review [src/hooks/](src/hooks/) source code
- Check existing component usage in [src/components/](src/components/)

---

**Last Updated:** 2024  
**Status:** Production Ready ✅

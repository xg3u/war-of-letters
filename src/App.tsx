// App.tsx - التصحيح

import React, { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { GameSettings } from './components/GameSettings';
import type { GameSettingsData } from './components/GameSettings';  // ← هنا!
import { GameBoard } from './components/GameBoard';

type Screen = 'landing' | 'settings' | 'game';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [gameSettings, setGameSettings] = useState<GameSettingsData | null>(null);

  return (
    <div>
      {currentScreen === 'landing' && (
        <LandingPage 
          onOpenSettings={() => setCurrentScreen('settings')} 
        />
      )}

      {currentScreen === 'settings' && (
        <GameSettings
          onBack={() => setCurrentScreen('landing')}
          onStartGame={(settings) => {
            setGameSettings(settings);
            setCurrentScreen('game');
          }}
        />
      )}

      {currentScreen === 'game' && gameSettings && (
        <GameBoard settings={gameSettings} />
      )}
    </div>
  );
}

export default App;
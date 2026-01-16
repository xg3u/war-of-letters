// src/App.tsx
import React, { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { GameSettings } from './components/GameSettings';
import { HostScreen } from './components/HostScreen';
import { PlayersScreen } from './components/PlayersScreen';
import { WelcomeModal } from './components/WelcomeModal';
import { AnimatedBackground } from './components/AnimatedBackground';
import type { GameSettingsData } from './components/GameSettings';

type Screen = 'landing' | 'settings' | 'host' | 'players';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    // التحقق من query parameter لتحديد الشاشة
    const params = new URLSearchParams(window.location.search);
    return (params.get('screen') as Screen) || 'landing';
  });
  
  const [gameSettings, setGameSettings] = useState<GameSettingsData | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(() => {
    const hideModal = localStorage.getItem('hideWelcomeModal');
    return hideModal !== 'true';
  });

  const handleCloseWelcome = () => {
    setShowWelcomeModal(false);
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* الخلفية المتحركة */}
      <AnimatedBackground />

      {/* شاشة الهبوط */}
      {currentScreen === 'landing' && (
        <>
          <LandingPage onOpenSettings={() => setCurrentScreen('settings')} />
          {showWelcomeModal && <WelcomeModal onClose={handleCloseWelcome} />}
        </>
      )}

      {/* شاشة الإعدادات */}
      {currentScreen === 'settings' && (
        <GameSettings
          onBack={() => setCurrentScreen('landing')}
          onStartGame={(settings) => {
            setGameSettings(settings);
            setCurrentScreen('host'); // مباشرة لشاشة المقدم
          }}
        />
      )}

      {/* شاشة المقدم */}
      {currentScreen === 'host' && gameSettings && (
        <HostScreen 
          settings={gameSettings}
          onBack={() => setCurrentScreen('settings')}
        />
      )}

      {/* شاشة اللاعبين */}
      {currentScreen === 'players' && gameSettings && (
        <PlayersScreen
          settings={gameSettings}
          currentQuestion={null}
          selectedCell={null}
        />
      )}
    </div>
  );
}

export default App;
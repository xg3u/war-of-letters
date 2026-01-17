// src/App.tsx
import { useState } from 'react';
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
    const params = new URLSearchParams(window.location.search);
    return (params.get('screen') as Screen) || 'landing';
  });
  
  const [gameSettings, setGameSettings] = useState<GameSettingsData | null>(() => {
    // تحميل الإعدادات من localStorage
    const stored = localStorage.getItem('current-game-settings');
    return stored ? JSON.parse(stored) : null;
  });
  
  const [showWelcomeModal, setShowWelcomeModal] = useState(() => {
    const hideModal = localStorage.getItem('hideWelcomeModal');
    return hideModal !== 'true';
  });

  const handleCloseWelcome = () => {
    setShowWelcomeModal(false);
  };

  const handleStartGame = (settings: GameSettingsData) => {
    setGameSettings(settings);
    // حفظ الإعدادات في localStorage
    localStorage.setItem('current-game-settings', JSON.stringify(settings));
    setCurrentScreen('host');
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
          onStartGame={handleStartGame}
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
      {currentScreen === 'players' && (
        gameSettings ? (
          <PlayersScreen
            settings={gameSettings}
            currentQuestion={null}
            selectedCell={null}
          />
        ) : (
          <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '2rem',
            textAlign: 'center',
            padding: '2rem',
          }}>
            ⚠️ الرجاء بدء اللعبة من شاشة المقدم أولاً
          </div>
        )
      )}
    </div>
  );
}

export default App;
// src/App.tsx
import { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { GameSettings } from './components/GameSettings';
import { HostScreen } from './components/HostScreen';
import { PlayersScreen } from './components/PlayersScreen';
import { AnswerBuzzersScreen } from './components/AnswerBuzzersScreen';
import { WelcomeModal } from './components/WelcomeModal';
import { AnimatedBackground } from './components/AnimatedBackground';
import { AuthGate } from './components/AuthGate';
import { supabase } from './lib/supabase';
import type { GameSettingsData } from './components/GameSettings';

type Screen = 'landing' | 'settings' | 'host' | 'players' | 'buzzers';

function App() {
  // فحص إذا كان المستخدم يدخل عبر QR Code
  const params = new URLSearchParams(window.location.search);
  const sessionParam = params.get('session');
  const screenParam = params.get('screen');
  const isQRCodeEntry = sessionParam && (screenParam === 'players' || screenParam === 'buzzers');

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(isQRCodeEntry ? true : null); // null = loading
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    return (screenParam as Screen) || 'landing';
  });

  const [gameSettings, setGameSettings] = useState<GameSettingsData | null>(() => {
    // تحميل الإعدادات من localStorage
    const stored = localStorage.getItem('current-game-settings');
    return stored ? JSON.parse(stored) : null;
  });

  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // التحقق من حالة المصادقة عند بدء التطبيق
  useEffect(() => {
    // إذا كان دخول عبر QR Code، تجاوز المصادقة
    if (isQRCodeEntry) {
      console.log('📱 QR Code entry detected - skipping authentication');
      return;
    }

    const checkAuth = async () => {
      try {
        // فحص الجلسة الحالية
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth error:', error);
          setIsAuthenticated(false);
          return;
        }

        // التحقق من صلاحية الجلسة
        if (session?.user) {
          console.log('✅ User authenticated:', session.user.email);
          setIsAuthenticated(true);

          // حفظ معرف المستخدم
          const userId = session.user.id;
          setCurrentUserId(userId);

          // فحص إذا كان المستخدم شاهد الرسالة من قبل
          const hideModalKey = `hideWelcomeModal_${userId}`;
          const hideModal = localStorage.getItem(hideModalKey);
          setShowWelcomeModal(hideModal !== 'true');
        } else {
          console.log('❌ No active session - showing AuthGate');
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        setIsAuthenticated(false);
      }
    };

    checkAuth();

    // الاستماع لتغييرات حالة المصادقة
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        console.log('✅ Auth state changed - authenticated');
        setIsAuthenticated(true);

        // حفظ معرف المستخدم
        const userId = session.user.id;
        setCurrentUserId(userId);

        // فحص إذا كان المستخدم شاهد الرسالة من قبل
        const hideModalKey = `hideWelcomeModal_${userId}`;
        const hideModal = localStorage.getItem(hideModalKey);
        setShowWelcomeModal(hideModal !== 'true');
      } else {
        console.log('❌ Auth state changed - not authenticated');
        setIsAuthenticated(false);
        setCurrentUserId(null);
        setShowWelcomeModal(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleCloseWelcome = () => {
    setShowWelcomeModal(false);
  };

  const handleStartGame = (settings: GameSettingsData) => {
    setGameSettings(settings);
    // حفظ الإعدادات في localStorage
    localStorage.setItem('current-game-settings', JSON.stringify(settings));
    setCurrentScreen('host');
  };

  // حالة التحميل - انتظار فحص المصادقة
  if (isAuthenticated === null) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0118 0%, #1a0b2e 50%, #2d1154 100%)',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(168, 85, 247, 0.2)',
            borderTopColor: '#a855f7',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <div style={{
            color: '#e9d5ff',
            fontSize: '1.25rem',
            fontWeight: 700,
          }}>
            جاري التحميل...
          </div>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // إذا لم يكن مسجل الدخول - عرض شاشة المصادقة
  if (!isAuthenticated) {
    return <AuthGate onVerified={() => setIsAuthenticated(true)} />;
  }

  // المستخدم مسجل الدخول - عرض التطبيق
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

      {/* شاشة Answer Buzzers */}
      {currentScreen === 'buzzers' && (
        <AnswerBuzzersScreen />
      )}
    </div>
  );
}

export default App;
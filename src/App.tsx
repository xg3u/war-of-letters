// src/App.tsx
import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { AnimatedBackground } from './components/AnimatedBackground';
import { AuthGate } from './components/AuthGate';          // sync — يظهر فوراً
import { FullPageLoading } from './components/LoadingBar'; // sync — loading state
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuthContext } from './context/AuthContext';
import type { GameSettingsData } from './components/GameSettings';

// ── Lazy-loaded screens (كل شاشة = chunk منفصل) ──────────────────────────
// المستخدم يحمّل الشاشة فقط عند الحاجة إليها
const LandingPage        = lazy(() => import('./components/LandingPage').then(m => ({ default: m.LandingPage })));
const GameSettings       = lazy(() => import('./components/GameSettings').then(m => ({ default: m.GameSettings })));
const HostScreen         = lazy(() => import('./components/HostScreen').then(m => ({ default: m.HostScreen })));
const PlayersScreen      = lazy(() => import('./components/PlayersScreen').then(m => ({ default: m.PlayersScreen })));
const AnswerBuzzersScreen = lazy(() => import('./components/AnswerBuzzersScreen').then(m => ({ default: m.AnswerBuzzersScreen })));
const JoinScreen         = lazy(() => import('./components/JoinScreen').then(m => ({ default: m.JoinScreen })));
const WelcomeModal       = lazy(() => import('./components/WelcomeModal').then(m => ({ default: m.WelcomeModal })));

type Screen = 'landing' | 'auth' | 'settings' | 'host' | 'players' | 'buzzers' | 'join';


// ── AppContent (يستخدم AuthContext) ───────────────────────────────────────
function AppContent() {
  const { isAuthenticated, user, planDisplay, isLoadingSubscription, subscription } = useAuthContext();

  // تحديد الشاشة الأولية بناءً على URL params (للـ QR Code)
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    const params = new URLSearchParams(window.location.search);
    const screenParam = params.get('screen') as Screen | null;
    const validQRScreens: Screen[] = ['players', 'buzzers', 'join'];
    if (screenParam && validQRScreens.includes(screenParam)) return screenParam;
    return 'landing';
  });

  // العودة لشاشة تسجيل الدخول تلقائياً عند تسجيل الخروج
  const prevAuthRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (prevAuthRef.current === true && isAuthenticated === false) {
      setCurrentScreen('auth');
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const [gameSettings, setGameSettings] = useState<GameSettingsData | null>(() => {
    const stored = localStorage.getItem('current-game-settings');
    return stored ? JSON.parse(stored) : null;
  });

  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // إظهار Welcome Modal عند أول تسجيل دخول
  useEffect(() => {
    if (!user) return;
    const hideModalKey = `hideWelcomeModal_${user.id}`;
    const hideModal = localStorage.getItem(hideModalKey);
    setShowWelcomeModal(hideModal !== 'true');
  }, [user?.id]);

  const handleCloseWelcome = useCallback(() => setShowWelcomeModal(false), []);

  const handleStartGame = useCallback((settings: GameSettingsData) => {
    setGameSettings(settings);
    localStorage.setItem('current-game-settings', JSON.stringify(settings));
    setCurrentScreen('host');
  }, []);

  const handleBackToSettings = useCallback(() => setCurrentScreen('settings'), []);
  const handleBackToLanding  = useCallback(() => setCurrentScreen('landing'), []);

  // حماية: إذا كان المستخدم في شاشة الإعدادات وباقته مجانية → أعده للصفحة الرئيسية
  useEffect(() => {
    if (
      currentScreen === 'settings' &&
      isAuthenticated === true &&
      !isLoadingSubscription &&
      subscription !== null &&
      planDisplay === 'free'
    ) {
      setCurrentScreen('landing');
    }
  }, [currentScreen, isAuthenticated, isLoadingSubscription, subscription, planDisplay]);

  // حالة التحميل
  if (isAuthenticated === null) return <FullPageLoading />;

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />

      <Suspense fallback={<FullPageLoading />}>
        {/* شاشة الهبوط — تظهر للجميع (مسجل أو لا) */}
        {currentScreen === 'landing' && (
          <>
            <LandingPage
              onOpenSettings={() => setCurrentScreen('settings')}
              onNavigateToLogin={() => setCurrentScreen('auth')}
            />
            {showWelcomeModal && <WelcomeModal onClose={handleCloseWelcome} />}
          </>
        )}

        {/* شاشة تسجيل الدخول / إعادة تعيين كلمة المرور */}
        {currentScreen === 'auth' && (
          <AuthGate onVerified={() => setCurrentScreen('landing')} />
        )}

        {/* شاشة الإعدادات */}
        {currentScreen === 'settings' && (
          <GameSettings
            onBack={handleBackToLanding}
            onStartGame={handleStartGame}
          />
        )}

        {/* شاشة المقدم */}
        {currentScreen === 'host' && gameSettings && (
          <HostScreen
            settings={gameSettings}
            onBack={handleBackToSettings}
          />
        )}

        {/* شاشة اللاعبين */}
        {currentScreen === 'players' && (
          <PlayersScreen
            settings={gameSettings}
            currentQuestion={null}
            selectedCell={null}
          />
        )}

        {/* شاشة Answer Buzzers */}
        {currentScreen === 'buzzers' && (
          <AnswerBuzzersScreen />
        )}

        {/* شاشة اختيار الدور (QR Code entry) */}
        {currentScreen === 'join' && (
          <JoinScreen
            onSelect={(screen) => setCurrentScreen(screen)}
          />
        )}
      </Suspense>
    </div>
  );
}

// ── App Root (providers فقط) ───────────────────────────────────────────────
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

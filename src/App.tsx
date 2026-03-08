// src/App.tsx
import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { AnimatedBackground } from './components/AnimatedBackground';
import { FullPageLoading } from './components/LoadingBar'; // sync — loading state
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuthContext } from './context/AuthContext';
import { GameCoreProvider } from './core/GameCoreProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
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
const AuthGate           = lazy(() => import('./components/AuthGate').then(m => ({ default: m.AuthGate })));

// ── Lazy-loaded dashboards (never loaded for regular players) ──────────────
const AdminDashboard  = lazy(() => import('./components/AdminDashboard'));
const PartnerDashboard = lazy(() => import('./components/PartnerDashboard'));

type Screen = 'landing' | 'auth' | 'settings' | 'host' | 'players' | 'buzzers' | 'join' | 'admin' | 'partner';


// ── PlanChangeBanner — إشعار تغيير/انتهاء الباقة ───────────────────────
const SALLA_URL    = 'https://salla.sa/battle_of_letters_store';
const WHATSAPP_URL = 'https://wa.me/message/CEACUCTW6E7BB1';

function planLabel(p: string | null): string {
  if (!p || p === 'free')                                   return 'مجانية';
  if (p === 'lifetime')                                     return 'لامحدودة ♾️';
  if (p === '3_days' || p === '72_hours' || p === 'single') return '3 أيام ⏰';
  if (p === 'expired')                                      return 'منتهية';
  return p;
}

// Rank-based upgrade/downgrade detection (avoids false positives like lifetime→3_days)
const PLAN_RANK: Record<string, number> = {
  free: 0, expired: 0, single: 1, '72_hours': 1, '3_days': 1, lifetime: 2,
};
function isPlanUpgrade(next: string | null, prev: string | null): boolean {
  return (PLAN_RANK[next ?? 'free'] ?? 0) > (PLAN_RANK[prev ?? 'free'] ?? 0);
}

function PlanChangeBanner() {
  const { planChangeEvent, clearPlanChangeEvent } = useAuthContext();
  const [event, setEvent] = useState<typeof planChangeEvent>(null);

  useEffect(() => {
    if (!planChangeEvent) return;
    setEvent(planChangeEvent);
  }, [planChangeEvent]);

  const handleClose = useCallback(() => {
    setEvent(null);
    clearPlanChangeEvent();
  }, [clearPlanChangeEvent]);

  // Auto-dismiss للترقيات فقط (6 ثواني)
  useEffect(() => {
    if (!event) return;
    if (!isPlanUpgrade(event.nextPlan, event.prevPlan)) return;
    const t = setTimeout(handleClose, 6000);
    return () => clearTimeout(t);
  }, [event, handleClose]);

  if (!event) return null;

  const isUpgrade  = isPlanUpgrade(event.nextPlan, event.prevPlan);
  const isExpired  = event.nextPlan === 'expired';
  const isDowngrade = !isUpgrade && !isExpired; // free أو null

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
      fontFamily: 'Tajawal, sans-serif', direction: 'rtl',
    }}>
      <div style={{
        maxWidth: '400px', width: '100%',
        background: isUpgrade
          ? 'linear-gradient(135deg, #052e16, #064e3b)'
          : 'linear-gradient(135deg, #3b0764, #1a0533)',
        border: `2px solid ${isUpgrade ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.4)'}`,
        borderRadius: '1.5rem',
        padding: '2rem 1.5rem 1.5rem',
        position: 'relative',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
      }}>
        {/* زر إغلاق */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute', top: '0.85rem', left: '0.85rem',
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '50%', width: '34px', height: '34px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: '1rem',
          }}
        >✕</button>

        {/* أيقونة */}
        <div style={{ textAlign: 'center', fontSize: '3.5rem', marginBottom: '0.75rem', lineHeight: 1 }}>
          {isUpgrade ? '🎉' : isExpired ? '⏰' : '⚠️'}
        </div>

        {/* العنوان */}
        <h3 style={{
          textAlign: 'center', margin: '0 0 0.6rem',
          fontSize: '1.3rem', fontWeight: 900,
          color: isUpgrade ? '#6ee7b7' : '#fca5a5',
        }}>
          {isUpgrade ? 'تمت ترقية باقتك! 🌟' : isExpired ? 'انتهت صلاحية باقتك' : 'تم تغيير باقتك'}
        </h3>

        {/* الرسالة التفصيلية */}
        <p style={{
          textAlign: 'center', margin: '0 0 1.5rem',
          fontSize: '0.92rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.7,
        }}>
          {isUpgrade && (
            <>تم تغيير باقتك من <strong style={{ color: '#fff' }}>{planLabel(event.prevPlan)}</strong> إلى <strong style={{ color: '#6ee7b7' }}>{planLabel(event.nextPlan)}</strong><br />استمتع باللعب الآن! 🎮</>
          )}
          {isExpired && (
            <>انتهت صلاحية باقتك ({planLabel(event.prevPlan)})<br />جدّد الآن للاستمرار في اللعب</>
          )}
          {isDowngrade && (
            <>تم تغيير باقتك من <strong style={{ color: '#fff' }}>{planLabel(event.prevPlan)}</strong> إلى <strong style={{ color: '#fca5a5' }}>{planLabel(event.nextPlan)}</strong><br />يمكنك التجديد من المتجر</>
          )}
        </p>

        {/* أزرار */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {(isExpired || isDowngrade) && (
            <a
              href={SALLA_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleClose}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '0.9rem',
                background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                borderRadius: '0.875rem',
                color: '#fff', fontWeight: 800, fontSize: '1rem', textDecoration: 'none',
              }}
            >
              🛒 تجديد الباقة من المتجر
            </a>
          )}

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              padding: '0.75rem',
              background: 'rgba(37,211,102,0.12)',
              border: '1px solid rgba(37,211,102,0.35)',
              borderRadius: '0.875rem',
              color: '#25d366', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none',
            }}
          >
            💬 للاستفسار والمشاكل — تواصل عبر واتساب
          </a>

          <button
            onClick={handleClose}
            style={{
              padding: '0.7rem',
              background: isUpgrade ? 'linear-gradient(135deg, #059669, #10b981)' : 'rgba(255,255,255,0.06)',
              border: isUpgrade ? 'none' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '0.875rem',
              color: '#fff', fontWeight: isUpgrade ? 800 : 500,
              cursor: 'pointer', fontSize: '0.95rem',
              fontFamily: 'Tajawal, sans-serif',
            }}
          >
            {isUpgrade ? '🎮 ابدأ اللعب الآن' : 'إغلاق'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AppContent (يستخدم AuthContext) ───────────────────────────────────────
function AppContent() {
  const { isAuthenticated, user, planDisplay, isLoadingSubscription, subscription, role } = useAuthContext();

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
  // استثناء: الأدمن والشريك يدخلون دائماً بغض النظر عن الباقة
  useEffect(() => {
    if (
      currentScreen === 'settings' &&
      isAuthenticated === true &&
      !isLoadingSubscription &&
      subscription !== null &&
      planDisplay === 'free' &&
      role !== 'admin' &&
      role !== 'partner'
    ) {
      setCurrentScreen('landing');
    }
  }, [currentScreen, isAuthenticated, isLoadingSubscription, subscription, planDisplay, role]);

  // حماية: لوحة الإدارة للمدير فقط — بوابة الشريك للشركاء والمدير
  useEffect(() => {
    if (role === null) return; // لا نزال نحمّل
    if (currentScreen === 'admin' && role !== 'admin') setCurrentScreen('landing');
    if (currentScreen === 'partner' && role !== 'partner' && role !== 'admin') setCurrentScreen('landing');
  }, [currentScreen, role]);

  // حالة التحميل
  if (isAuthenticated === null) return <FullPageLoading />;

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />
      <PlanChangeBanner />

      <ErrorBoundary>
      <Suspense fallback={<FullPageLoading />}>
        {/* شاشة الهبوط — تظهر للجميع (مسجل أو لا) */}
        {currentScreen === 'landing' && (
          <>
            <LandingPage
              onOpenSettings={() => setCurrentScreen('settings')}
              onNavigateToLogin={() => setCurrentScreen('auth')}
              onOpenAdmin={() => setCurrentScreen('admin')}
              onOpenPartner={() => setCurrentScreen('partner')}
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

        {/* لوحة الإدارة — للمدير فقط */}
        {currentScreen === 'admin' && role === 'admin' && (
          <AdminDashboard onBack={handleBackToLanding} />
        )}

        {/* بوابة الشريك — للشركاء والمدير */}
        {currentScreen === 'partner' && (role === 'partner' || role === 'admin') && (
          <PartnerDashboard onBack={handleBackToLanding} />
        )}
      </Suspense>
      </ErrorBoundary>
    </div>
  );
}

// ── App Root (providers فقط) ───────────────────────────────────────────────
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GameCoreProvider>
          <AppContent />
        </GameCoreProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

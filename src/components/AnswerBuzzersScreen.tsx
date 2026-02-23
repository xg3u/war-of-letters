// src/components/AnswerBuzzersScreen.tsx
// شاشة Answer Buzzers - للإجابة وطلب البطاقات

import React, { useState, useEffect } from 'react';
import { Bell, CreditCard, Zap, HelpCircle } from 'lucide-react';
import { useScreenSize } from '../hooks/useScreenSize';
import { useTheme } from '../context/ThemeContext';
import { syncManager } from '../utils/SyncManager';
import { playBellSound, playCardSound } from '../utils/sounds';
import { BuzzerGuide } from './BuzzerGuide';

interface BuzzerPress {
  type: 'answer' | 'card';
  playerName: string;
  team: 'green' | 'red';
  timestamp: number;
}

export const AnswerBuzzersScreen: React.FC = () => {
  const { isMobile } = useScreenSize();
  const { theme } = useTheme();
  const [isRegistered, setIsRegistered] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<'green' | 'red'>('green');
  const [lastPress, setLastPress] = useState<BuzzerPress | null>(null);
  const [cooldown, setCooldown] = useState(false);
  const [globalLock, setGlobalLock] = useState(false); // قفل عام لجميع اللاعبين
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0); // الوقت المتبقي للقفل
  const [showGuide, setShowGuide] = useState(() => !localStorage.getItem('buzzer-guide-done')); // إظهار الدليل

  // الحصول على session ID من URL
  const sessionId = new URLSearchParams(window.location.search).get('session') || '';

  useEffect(() => {
    if (!sessionId) return;

    // الاستماع لإعادة تعيين الأزرار من المقدم
    const unsubscribe = syncManager.subscribe((data: any) => {
      if (data.type === 'reset-buzzers') {
        setLastPress(null);
        setCooldown(false);
        setGlobalLock(false);
        setLockTimeRemaining(0);
      } else if (data.type === 'buzzer-global-lock') {
        // قفل الأزرار لجميع اللاعبين
        setGlobalLock(true);
        setLockTimeRemaining(5);
      }
    });

    return unsubscribe;
  }, [sessionId]);

  // مؤقت العد التنازلي للقفل العام
  useEffect(() => {
    if (lockTimeRemaining > 0) {
      const timer = setTimeout(() => {
        setLockTimeRemaining(lockTimeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (lockTimeRemaining === 0 && globalLock) {
      // فتح القفل بعد انتهاء الوقت
      setGlobalLock(false);
    }
  }, [lockTimeRemaining, globalLock]);

  const handleRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim().length < 2) {
      alert('الرجاء إدخال اسم صحيح (حرفين على الأقل)');
      return;
    }

    // إرسال معلومات اللاعب لجميع الشاشات
    const playerData = {
      type: 'player-registered',
      player: {
        name: playerName,
        team: selectedTeam,
        timestamp: Date.now(),
      },
    };

    console.log('📤 Broadcasting player registration:', playerData);
    syncManager.broadcast(playerData);

    setIsRegistered(true);
  };

  const handleBuzzerPress = (type: 'answer' | 'card') => {
    if (cooldown || globalLock) return;

    const buzzerPress: BuzzerPress = {
      type,
      playerName,
      team: selectedTeam,
      timestamp: Date.now(),
    };

    console.log('⚡ BUZZER PRESSED:', playerName, 'at', buzzerPress.timestamp, 'for', type);

    // تشغيل الصوت المناسب
    if (type === 'answer') {
      playBellSound();
    } else {
      playCardSound();
    }

    // إرسال الضغطة لجميع الشاشات
    syncManager.broadcast({
      type: 'buzzer-press',
      buzzerPress,
    });

    // إرسال قفل عام لجميع اللاعبين لمدة 5 ثواني
    syncManager.broadcast({
      type: 'buzzer-global-lock',
    });

    setLastPress(buzzerPress);
    setCooldown(true);
    setGlobalLock(true);
    setLockTimeRemaining(5);

    // إلغاء الـ cooldown بعد 3 ثواني
    setTimeout(() => setCooldown(false), 3000);
  };

  // شاشة التسجيل
  if (!isRegistered) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          background: theme.bgGradient,
        }}
      >
        <div
          style={{
            maxWidth: isMobile ? '95%' : '500px',
            width: '100%',
            borderRadius: isMobile ? '1rem' : '2rem',
            background: 'linear-gradient(135deg, #1a0b2e 0%, #2d1154 100%)',
            border: '2px solid rgba(168, 85, 247, 0.3)',
            boxShadow: '0 20px 60px rgba(168, 85, 247, 0.4)',
            padding: isMobile ? '2rem' : '3rem',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              marginBottom: '2rem',
            }}
          >
            <Zap size={isMobile ? 48 : 64} color="#f59e0b" style={{ marginBottom: '1rem' }} />
            <h1
              style={{
                fontSize: isMobile ? '2rem' : '2.5rem',
                fontWeight: 900,
                background: 'linear-gradient(135deg, #f97316, #ec4899, #a855f7)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '0.5rem',
              }}
            >
              Answer Buzzers
            </h1>
            <p
              style={{
                color: '#e9d5ff',
                fontSize: isMobile ? '0.875rem' : '1rem',
              }}
            >
              سجّل بياناتك للمشاركة في الإجابة
            </p>
          </div>

          <form onSubmit={handleRegistration}>
            {/* حقل الاسم */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  color: '#e9d5ff',
                  fontSize: isMobile ? '0.875rem' : '1rem',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                }}
              >
                اسمك
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="أدخل اسمك هنا"
                style={{
                  width: '100%',
                  padding: isMobile ? '0.875rem' : '1rem',
                  borderRadius: '0.75rem',
                  background: 'rgba(168, 85, 247, 0.1)',
                  border: '2px solid rgba(168, 85, 247, 0.3)',
                  color: 'white',
                  fontSize: isMobile ? '0.875rem' : '1rem',
                  outline: 'none',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#a855f7';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(168, 85, 247, 0.3)';
                }}
              />
            </div>

            {/* اختيار الفريق */}
            <div style={{ marginBottom: '2rem' }}>
              <label
                style={{
                  display: 'block',
                  color: '#e9d5ff',
                  fontSize: isMobile ? '0.875rem' : '1rem',
                  fontWeight: 600,
                  marginBottom: '1rem',
                }}
              >
                اختر فريقك
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                }}
              >
                {/* الفريق الأخضر */}
                <button
                  type="button"
                  onClick={() => setSelectedTeam('green')}
                  style={{
                    padding: isMobile ? '1rem' : '1.25rem',
                    borderRadius: '0.75rem',
                    background:
                      selectedTeam === 'green'
                        ? 'linear-gradient(135deg, #10b981, #14b8a6)'
                        : 'rgba(16, 185, 129, 0.2)',
                    border:
                      selectedTeam === 'green'
                        ? '3px solid #10b981'
                        : '2px solid rgba(16, 185, 129, 0.3)',
                    color: 'white',
                    fontSize: isMobile ? '0.875rem' : '1rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    transform: selectedTeam === 'green' ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  الفريق الأخضر 🟢
                </button>

                {/* الفريق الأحمر */}
                <button
                  type="button"
                  onClick={() => setSelectedTeam('red')}
                  style={{
                    padding: isMobile ? '1rem' : '1.25rem',
                    borderRadius: '0.75rem',
                    background:
                      selectedTeam === 'red'
                        ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                        : 'rgba(239, 68, 68, 0.2)',
                    border:
                      selectedTeam === 'red'
                        ? '3px solid #ef4444'
                        : '2px solid rgba(239, 68, 68, 0.3)',
                    color: 'white',
                    fontSize: isMobile ? '0.875rem' : '1rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    transform: selectedTeam === 'red' ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  الفريق الأحمر 🔴
                </button>
              </div>
            </div>

            {/* زر التسجيل */}
            <button
              type="submit"
              style={{
                width: '100%',
                padding: isMobile ? '1rem' : '1.25rem',
                borderRadius: '0.75rem',
                background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                border: 'none',
                color: 'white',
                fontSize: isMobile ? '1rem' : '1.125rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              ✨ ابدأ اللعب
            </button>
          </form>
        </div>
      </div>
    );
  }

  // شاشة الأزرار
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: theme.bgGradient,
        gap: '2rem',
      }}
    >
      {/* معلومات اللاعب */}
      <div
        style={{
          textAlign: 'center',
          background: 'linear-gradient(135deg, #1a0b2e 0%, #2d1154 100%)',
          border: '2px solid rgba(168, 85, 247, 0.3)',
          borderRadius: '1rem',
          padding: '1.5rem',
          maxWidth: '500px',
          width: '100%',
        }}
      >
        <h2
          style={{
            fontSize: isMobile ? '1.5rem' : '2rem',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #f97316, #ec4899, #a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem',
          }}
        >
          {playerName}
        </h2>
        <div
          style={{
            display: 'inline-block',
            padding: '0.5rem 1.5rem',
            borderRadius: '2rem',
            background:
              selectedTeam === 'green'
                ? 'linear-gradient(135deg, #10b981, #14b8a6)'
                : 'linear-gradient(135deg, #ef4444, #dc2626)',
            fontSize: isMobile ? '0.875rem' : '1rem',
            fontWeight: 700,
            color: 'white',
          }}
        >
          {selectedTeam === 'green' ? 'الفريق الأخضر 🟢' : 'الفريق الأحمر 🔴'}
        </div>
      </div>

      {/* الأزرار */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '1.5rem',
          width: '100%',
          maxWidth: '900px',
        }}
      >
        {/* زر الإجابة */}
        <button
          onClick={() => handleBuzzerPress('answer')}
          disabled={cooldown || globalLock}
          style={{
            flex: 1,
            minHeight: isMobile ? '200px' : '300px',
            borderRadius: '2rem',
            background: (cooldown || globalLock)
              ? 'linear-gradient(135deg, #6b7280, #9ca3af)'
              : 'linear-gradient(135deg, #f59e0b, #f97316)',
            border: '4px solid',
            borderColor: (cooldown || globalLock) ? '#9ca3af' : '#fb923c',
            color: 'white',
            fontSize: isMobile ? '1.5rem' : '2rem',
            fontWeight: 900,
            cursor: (cooldown || globalLock) ? 'not-allowed' : 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            transition: 'all 0.2s',
            boxShadow: (cooldown || globalLock) ? 'none' : '0 10px 40px rgba(245, 158, 11, 0.5)',
            opacity: (cooldown || globalLock) ? 0.5 : 1,
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            if (!cooldown && !globalLock) {
              e.currentTarget.style.transform = 'scale(1.05)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <Bell size={isMobile ? 48 : 64} />
          <span>إجابة 📣</span>
          {globalLock && lockTimeRemaining > 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: '1rem',
                fontSize: isMobile ? '1rem' : '1.5rem',
                fontWeight: 700,
                color: 'white',
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
              }}
            >
              {lockTimeRemaining}s
            </div>
          )}
        </button>

        {/* زر طلب البطاقة */}
        <button
          onClick={() => handleBuzzerPress('card')}
          disabled={cooldown || globalLock}
          style={{
            flex: 1,
            minHeight: isMobile ? '200px' : '300px',
            borderRadius: '2rem',
            background: (cooldown || globalLock)
              ? 'linear-gradient(135deg, #6b7280, #9ca3af)'
              : 'linear-gradient(135deg, #a855f7, #ec4899)',
            border: '4px solid',
            borderColor: (cooldown || globalLock) ? '#9ca3af' : '#c084fc',
            color: 'white',
            fontSize: isMobile ? '1.5rem' : '2rem',
            fontWeight: 900,
            cursor: (cooldown || globalLock) ? 'not-allowed' : 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            transition: 'all 0.2s',
            boxShadow: (cooldown || globalLock) ? 'none' : '0 10px 40px rgba(168, 85, 247, 0.5)',
            opacity: (cooldown || globalLock) ? 0.5 : 1,
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            if (!cooldown && !globalLock) {
              e.currentTarget.style.transform = 'scale(1.05)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <CreditCard size={isMobile ? 48 : 64} />
          <span>طلب بطاقة 🎴</span>
          {globalLock && lockTimeRemaining > 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: '1rem',
                fontSize: isMobile ? '1rem' : '1.5rem',
                fontWeight: 700,
                color: 'white',
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
              }}
            >
              {lockTimeRemaining}s
            </div>
          )}
        </button>
      </div>

      {/* رسالة آخر ضغطة */}
      {lastPress && !globalLock && (
        <div
          style={{
            textAlign: 'center',
            background: 'rgba(16, 185, 129, 0.2)',
            border: '2px solid rgba(16, 185, 129, 0.5)',
            borderRadius: '1rem',
            padding: '1rem',
            maxWidth: '500px',
            width: '100%',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        >
          <p
            style={{
              color: '#10b981',
              fontSize: isMobile ? '0.875rem' : '1rem',
              fontWeight: 600,
              margin: 0,
            }}
          >
            ✅ تم إرسال طلبك بنجاح!
          </p>
        </div>
      )}

      {/* رسالة القفل العام */}
      {globalLock && lockTimeRemaining > 0 && (
        <div
          style={{
            textAlign: 'center',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '2px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '1rem',
            padding: '1rem',
            maxWidth: '500px',
            width: '100%',
          }}
        >
          <p
            style={{
              color: '#ef4444',
              fontSize: isMobile ? '0.875rem' : '1rem',
              fontWeight: 600,
              margin: 0,
            }}
          >
            ⏳ لاعب آخر ضغط الزر - انتظر {lockTimeRemaining} ثانية
          </p>
        </div>
      )}

      {/* ملاحظة */}
      <p
        style={{
          textAlign: 'center',
          fontSize: isMobile ? '0.75rem' : '0.875rem',
          color: 'rgba(255, 255, 255, 0.5)',
          maxWidth: '500px',
        }}
      >
        💡 اضغط على أي زر بسرعة - أول لاعب يضغط يظهر اسمه على الشاشة الرئيسية!
      </p>

      {/* زر الدليل - عائم */}
      <button
        onClick={() => setShowGuide(true)}
        style={{
          position: 'fixed',
          bottom: '1rem',
          left: '1rem',
          zIndex: 1000,
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #a855f7, #8b5cf6)',
          border: '2.5px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 6px 20px rgba(168, 85, 247, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <HelpCircle size={22} color="white" />
      </button>

      {/* دليل الأزرار */}
      {showGuide && (
        <BuzzerGuide
          onClose={() => setShowGuide(false)}
          onDontShowAgain={() => localStorage.setItem('buzzer-guide-done', '1')}
        />
      )}
    </div>
  );
};

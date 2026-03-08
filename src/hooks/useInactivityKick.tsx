// src/hooks/useInactivityKick.ts
// AFK System — يطرد المستخدم الخامل ويحرر اتصال Supabase Realtime
//
// التوقيت:
//   165 ثانية صامتة → تحذير 15 ثانية → طرد فوري (إذا كان السيرفر ممتلئاً)
//   الإجمالي: 3 دقائق (180 ثانية)
//
// الاستخدام:
//   const { showWarning, countdown, stayActive } = useInactivityKick({
//     onBeforeKick: () => syncManager.broadcast({ type: 'SESSION_ENDED' }),
//     shouldKick: async () => currentPlayerCount >= MAX_PLAYERS,
//   });
//   if (showWarning) return <InactivityWarningModal countdown={countdown} onStay={stayActive} />;

import { useEffect, useRef, useState, useCallback } from 'react';
import React from 'react';
import { supabase } from '../lib/supabase';

const TOTAL_MS  = 5 * 60 * 1000; // 5 دقائق إجمالية
const WARN_MS   = 15 * 1000;     // تحذير في آخر 15 ثانية
const WARN_SECS = WARN_MS / 1000; // 15
const THROTTLE  = 1000;           // تقييد mousemove: مرة واحدة بالثانية كحد أقصى

export interface UseInactivityKickOptions {
  /** تفعيل الـ hook — إذا false يتوقف العداد */
  enabled?: boolean;
  /** callback يُستدعى مباشرةً قبل الطرد */
  onBeforeKick?: () => void | Promise<void>;
  /**
   * دالة اختيارية: تُعيد true إذا يجب الطرد، false إذا يجب تمديد الوقت.
   * إذا لم تُوفَّر → يُطرد المستخدم دائماً عند انتهاء العداد.
   * مثال: () => lobbyCount >= MAX_PLAYERS
   */
  shouldKick?: () => boolean | Promise<boolean>;
}

export interface UseInactivityKickResult {
  showWarning: boolean;      // اعرض المودال عندما تكون true
  countdown: number;         // ثوانٍ متبقية خلال مرحلة التحذير (15 → 0)
  stayActive: () => void;    // يُستدعى عند الضغط على "أنا هنا"
  isDisconnected: boolean;   // تم الفصل — اعرض شاشة إعادة الاتصال
  reconnect: () => void;     // إعادة الاتصال بالغرفة
}

export function useInactivityKick(
  options: UseInactivityKickOptions = {},
): UseInactivityKickResult {
  const { enabled = true } = options;

  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown]     = useState(WARN_SECS);

  const mainTimerRef    = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const countdownRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMouseTime   = useRef(0);

  // استخدام refs للـ callbacks لتجنب إعادة إنشاء useCallback عند التغيير
  const onBeforeKickRef = useRef(options.onBeforeKick);
  onBeforeKickRef.current = options.onBeforeKick;

  const shouldKickRef = useRef(options.shouldKick);
  shouldKickRef.current = options.shouldKick;

  // ─── تنظيف المؤقتات ──────────────────────────────────────────────────────
  const clearTimers = useCallback(() => {
    if (mainTimerRef.current)  { clearTimeout(mainTimerRef.current);   mainTimerRef.current  = null; }
    if (countdownRef.current)  { clearInterval(countdownRef.current);  countdownRef.current  = null; }
  }, []);

  // ─── تنفيذ الطرد ─────────────────────────────────────────────────────────
  const [isDisconnected, setIsDisconnected] = useState(false);
  const kick = useCallback(async () => {
    clearTimers();
    try { await onBeforeKickRef.current?.(); } catch { /* silent */ }
    // بدل redirect → نعرض شاشة إعادة الاتصال
    setIsDisconnected(true);
  }, [clearTimers]);

  // ─── ref للـ checkAndKick لكسر الاعتمادية الدائرية ──────────────────────
  const checkAndKickRef = useRef<() => Promise<void>>(async () => { void kick(); });

  // ─── إعادة ضبط العداد ────────────────────────────────────────────────────
  const resetTimer = useCallback(() => {
    clearTimers();
    setShowWarning(false);
    setCountdown(WARN_SECS);

    // بعد (TOTAL_MS - WARN_MS) → ابدأ مرحلة التحذير
    mainTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      let secs = WARN_SECS;
      setCountdown(secs);

      countdownRef.current = setInterval(() => {
        secs -= 1;
        setCountdown(secs);
        if (secs <= 0) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          void checkAndKickRef.current(); // ← يستخدم ref لتجنب الاعتمادية الدائرية
        }
      }, 1000);
    }, TOTAL_MS - WARN_MS);
  }, [clearTimers]); // ← kick و checkAndKick عبر refs فقط

  // ─── تحقق هل نطرد أم نمدد؟ ───────────────────────────────────────────────
  const checkAndKick = useCallback(async () => {
    if (shouldKickRef.current) {
      let doKick = true;
      try { doKick = await shouldKickRef.current(); } catch { doKick = true; }
      if (!doKick) {
        // السيرفر غير ممتلئ → أعد العداد صامتاً بدون طرد
        resetTimer();
        return;
      }
    }
    await kick();
  }, [kick, resetTimer]);

  // تحديث الـ ref دائماً بأحدث نسخة
  checkAndKickRef.current = checkAndKick;

  // ─── "أنا هنا" ────────────────────────────────────────────────────────────
  const stayActive = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  // ─── إعادة الاتصال بعد الطرد ──────────────────────────────────────────────
  const reconnect = useCallback(() => {
    setIsDisconnected(false);
    resetTimer();
  }, [resetTimer]);

  // ─── ربط أحداث النشاط ────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) {
      clearTimers();
      setShowWarning(false);
      return;
    }

    const onMouseMove = () => {
      const now = Date.now();
      if (now - lastMouseTime.current < THROTTLE) return;
      lastMouseTime.current = now;
      resetTimer();
    };

    const onActivity = () => resetTimer();

    window.addEventListener('mousemove',  onMouseMove, { passive: true });
    window.addEventListener('touchstart', onActivity,  { passive: true });
    window.addEventListener('keydown',    onActivity,  { passive: true });
    window.addEventListener('click',      onActivity,  { passive: true });

    resetTimer(); // ابدأ العداد فور التفعيل

    return () => {
      window.removeEventListener('mousemove',  onMouseMove);
      window.removeEventListener('touchstart', onActivity);
      window.removeEventListener('keydown',    onActivity);
      window.removeEventListener('click',      onActivity);
      clearTimers();
    };
  }, [enabled, resetTimer, clearTimers]);

  return { showWarning, countdown, stayActive, isDisconnected, reconnect };
}

// ═══════════════════════════════════════════════════════════════════════════
// InactivityWarningModal — مودال التحذير (مشترك بين جميع الشاشات)
// ═══════════════════════════════════════════════════════════════════════════
export interface InactivityWarningModalProps {
  countdown: number;
  onStay: () => void;
}

export const InactivityWarningModal: React.FC<InactivityWarningModalProps> = ({
  countdown,
  onStay,
}) => {
  const isUrgent = countdown <= 5;
  const accentColor = isUrgent ? '#ef4444' : countdown <= 10 ? '#f97316' : '#a855f7';

  return (
    <div style={{
      position:       'fixed',
      inset:          0,
      zIndex:         99990,
      background:     'rgba(0,0,0,0.82)',
      backdropFilter: 'blur(10px)',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      direction:      'rtl',
    }}>
      <div style={{
        background:   'linear-gradient(145deg,rgba(15,6,38,0.99),rgba(30,12,60,0.99))',
        border:       `2px solid ${isUrgent ? 'rgba(239,68,68,0.6)' : 'rgba(168,85,247,0.4)'}`,
        borderRadius: '1.5rem',
        padding:      '2rem 2rem 1.5rem',
        textAlign:    'center',
        maxWidth:     '320px',
        width:        '90%',
        boxShadow:    `0 0 60px ${isUrgent ? 'rgba(239,68,68,0.3)' : 'rgba(168,85,247,0.25)'}`,
        fontFamily:   'Tajawal,sans-serif',
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>
          {isUrgent ? '🚨' : '⏰'}
        </div>

        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'white', marginBottom: '0.5rem' }}>
          لا تزال هنا؟
        </div>

        <div style={{
          fontSize:     '0.82rem',
          color:        'rgba(255,255,255,0.55)',
          marginBottom: '1.25rem',
          lineHeight:   1.5,
        }}>
          سيتم فصلك وتحرير اتصالك خلال{' '}
          <span style={{ color: accentColor, fontWeight: 900, fontSize: '1.05rem' }}>
            {countdown}
          </span>
          {' '}ثانية بسبب عدم النشاط
        </div>

        <button
          onClick={onStay}
          style={{
            width:        '100%',
            padding:      '0.8rem',
            background:   isUrgent
              ? 'linear-gradient(135deg,#ef4444,#dc2626)'
              : 'linear-gradient(135deg,#a855f7,#8b5cf6)',
            border:       'none',
            borderRadius: '0.875rem',
            color:        'white',
            fontSize:     '0.95rem',
            fontWeight:   800,
            cursor:       'pointer',
            fontFamily:   'Tajawal,sans-serif',
          }}
        >
          أنا هنا ✓
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// DisconnectedScreen — شاشة إعادة الاتصال بعد الفصل
// ═══════════════════════════════════════════════════════════════════════════
export interface DisconnectedScreenProps {
  onReconnect: () => void;
  onLeave: () => void;
}

export const DisconnectedScreen: React.FC<DisconnectedScreenProps> = ({
  onReconnect,
  onLeave,
}) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 99995,
    background: 'linear-gradient(145deg, rgba(10,6,28,0.99), rgba(25,12,55,0.99))',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    direction: 'rtl', fontFamily: 'Tajawal,sans-serif',
  }}>
    <div style={{
      textAlign: 'center', maxWidth: '340px', width: '90%', padding: '2rem',
    }}>
      <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>
        📡
      </div>

      <div style={{
        fontSize: '1.3rem', fontWeight: 900, color: 'white', marginBottom: '0.5rem',
      }}>
        تم تسجيل خروجك من الغرفة
      </div>

      <div style={{
        fontSize: '0.88rem', color: 'rgba(255,255,255,0.5)',
        marginBottom: '2rem', lineHeight: 1.6,
      }}>
        السبب: عدم التفاعل لفترة طويلة
      </div>

      <button
        onClick={onReconnect}
        style={{
          width: '100%', padding: '0.9rem',
          background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
          border: 'none', borderRadius: '0.875rem',
          color: 'white', fontSize: '1rem', fontWeight: 800,
          cursor: 'pointer', fontFamily: 'Tajawal,sans-serif',
          marginBottom: '0.75rem',
        }}
      >
        محاولة اتصال بالغرفة
      </button>

      <button
        onClick={onLeave}
        style={{
          width: '100%', padding: '0.9rem',
          background: 'transparent',
          border: '2px solid rgba(255,255,255,0.15)', borderRadius: '0.875rem',
          color: 'rgba(255,255,255,0.6)', fontSize: '0.92rem', fontWeight: 700,
          cursor: 'pointer', fontFamily: 'Tajawal,sans-serif',
        }}
      >
        خروج
      </button>
    </div>
  </div>
);

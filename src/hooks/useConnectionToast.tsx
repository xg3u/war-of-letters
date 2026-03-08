// src/hooks/useConnectionToast.tsx
// إشعارات الاتصال — يُراقب حالة SyncManager ويُصدر توست للمستخدم

import { useState, useEffect, useCallback, useRef } from 'react';
import { syncManager } from '../utils/SyncManager';

export type ToastSeverity = 'info' | 'warning' | 'error' | 'success';

export interface ConnectionToast {
  id: number;
  message: string;
  severity: ToastSeverity;
  icon: string;
  autoClose: number; // ms (0 = لا يُغلق تلقائياً)
}

let _toastId = 0;
const nextId = () => ++_toastId;

/**
 * useConnectionToast
 *
 * يُرجع:
 *  - toasts: قائمة التوستات الحالية
 *  - dismiss(id): لإغلاق توست بعينه
 *  - push(toast): لإضافة توست مخصص من الخارج
 *
 * يشترك تلقائياً بـ:
 *  - syncManager.onHealth()     → تدهور/عودة الاتصال
 *  - syncManager.onPollingMode() → وضع الازدحام العالي
 */
export function useConnectionToast() {
  const [toasts, setToasts] = useState<ConnectionToast[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
  }, []);

  const push = useCallback((
    message: string,
    severity: ToastSeverity,
    icon: string,
    autoClose = 5000,
  ) => {
    const id = nextId();
    const toast: ConnectionToast = { id, message, severity, icon, autoClose };
    setToasts(prev => [...prev.slice(-3), toast]); // أقصى 4 توستات في وقت واحد

    if (autoClose > 0) {
      const t = setTimeout(() => dismiss(id), autoClose);
      timers.current.set(id, t);
    }

    return id;
  }, [dismiss]);

  // ── الاشتراك بأحداث SyncManager ────────────────────────────────────────
  useEffect(() => {
    // مُعرّف التوست الحالي لـ "degraded" حتى نستطيع إزالته عند العودة
    let degradedId: number | null = null;

    const unsubHealth = syncManager.onHealth((health) => {
      if (health === 'degraded') {
        degradedId = push(
          'الاتصال ضعيف — يُعاد المحاولة تلقائياً',
          'warning',
          '⚠️',
          0, // لا يُغلق حتى يعود الاتصال
        );
      } else {
        // health === 'ok': أزل تحذير الاتصال الضعيف إن وُجد
        if (degradedId !== null) {
          dismiss(degradedId);
          degradedId = null;
        }
        push('الاتصال عاد ✓', 'success', '✅', 3000);
      }
    });

    const unsubPolling = syncManager.onPollingMode(() => {
      push(
        'وضع الازدحام العالي 🚦 — تحديث كل 5 ث',
        'info',
        '🚦',
        8000,
      );
    });

    return () => {
      unsubHealth();
      unsubPolling();
      // نظّف المؤقتات المتبقية
      timers.current.forEach(t => clearTimeout(t));
      timers.current.clear();
    };
  }, [push, dismiss]);

  return { toasts, dismiss, push };
}

// ─────────────────────────────────────────────────────────────────────────────
// ConnectionToastContainer — مكوّن جاهز للعرض (اختياري)
// ضعه في أي شاشة:  <ConnectionToastContainer />
// ─────────────────────────────────────────────────────────────────────────────

export function ConnectionToastContainer() {
  const { toasts, dismiss } = useConnectionToast();

  if (toasts.length === 0) return null;

  const COLORS: Record<ToastSeverity, { bg: string; border: string; text: string }> = {
    info:    { bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.4)',  text: '#93c5fd' },
    warning: { bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.35)', text: '#fbbf24' },
    error:   { bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.4)',   text: '#f87171' },
    success: { bg: 'rgba(34,197,94,0.15)',   border: 'rgba(34,197,94,0.4)',   text: '#86efac' },
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      {toasts.map(t => {
        const c = COLORS[t.severity];
        return (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            style={{
              background: c.bg,
              border: `1px solid ${c.border}`,
              color: c.text,
              padding: '0.5rem 1rem',
              borderRadius: '9999px',
              fontSize: '0.85rem',
              fontFamily: 'Tajawal, sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backdropFilter: 'blur(8px)',
              pointerEvents: 'auto',
              cursor: 'pointer',
              direction: 'rtl',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              animation: 'fadeInUp 0.25s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <span>{t.icon}</span>
            <span>{t.message}</span>
          </div>
        );
      })}

      {/* Keyframe — يُضاف مرة واحدة */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </div>
  );
}

// src/hooks/useOptimisticAction.ts
// واجهة برمجية للتحديث الفوري للواجهة مع التراجع التلقائي عند فشل الخادم
// "Optimistic UI with Rollback"

import { useState, useCallback, useRef } from 'react';

export interface OptimisticOptions<T> {
  /** يُطبَّق فوراً قبل طلب الخادم (التحديث التفاؤلي) */
  applyOptimistic: (payload: T) => void;
  /** يُعيد الحالة إلى ما كانت عليه إذا أخفق الخادم */
  revertOptimistic: () => void;
  /** الطلب الفعلي للخادم — يُرجع خطأً نصياً أو undefined للنجاح */
  serverAction: (payload: T) => Promise<string | undefined | void>;
  /** دالة اختيارية تُستدعى عند حدوث خطأ */
  onError?: (error: string) => void;
}

export interface OptimisticResult<T> {
  /** نفّذ العملية: يُحدّث الواجهة فوراً ثم يُرسل للخادم */
  execute: (payload: T) => Promise<void>;
  /** هل هناك طلب جارٍ؟ */
  isPending: boolean;
  /** رسالة الخطأ الأخير (null = لا خطأ) */
  syncError: string | null;
  /** امسح رسالة الخطأ */
  clearError: () => void;
}

/**
 * useOptimisticAction
 *
 * مثال على الاستخدام في HostScreen عند المطالبة بخلية:
 *
 * ```tsx
 * const { execute, isPending, syncError } = useOptimisticAction({
 *   applyOptimistic: ({ cellId, team }) => {
 *     claimCell(cellId, team); // تحديث فوري في Zustand
 *   },
 *   revertOptimistic: () => {
 *     syncFromExternal(snapshotRef.current); // استعادة الـ snapshot
 *   },
 *   serverAction: async ({ cellId, team }) => {
 *     const res = await supabase.rpc('submit_move', { ... });
 *     if (res.error) return res.error.message;
 *   },
 *   onError: (err) => console.error('Move rejected:', err),
 * });
 * ```
 */
export function useOptimisticAction<T>(
  options: OptimisticOptions<T>,
): OptimisticResult<T> {
  const [isPending, setIsPending] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // نُخزّن الـ options في ref حتى لا يتغير معرّف execute عند تغيير الخيارات
  const optRef = useRef(options);
  optRef.current = options;

  const execute = useCallback(async (payload: T) => {
    if (isPending) return; // منع الضغطات المتزامنة

    const { applyOptimistic, revertOptimistic, serverAction, onError } = optRef.current;

    setIsPending(true);
    setSyncError(null);

    // ① تحديث فوري للواجهة — بدون انتظار الخادم
    applyOptimistic(payload);

    try {
      // ② إرسال الطلب للخادم
      const errorMsg = await serverAction(payload);

      if (errorMsg) {
        // ③ أ — الخادم رفض الطلب → تراجع فوري
        revertOptimistic();
        setSyncError(errorMsg);
        onError?.(errorMsg);
      }
      // ③ ب — نجاح: لا شيء (الواجهة محدّثة بالفعل)
    } catch (err) {
      // خطأ شبكة أو استثناء غير متوقع → تراجع
      revertOptimistic();
      const msg = err instanceof Error ? err.message : 'خطأ في الاتصال';
      setSyncError(msg);
      onError?.(msg);
    } finally {
      setIsPending(false);
    }
  }, [isPending]);

  const clearError = useCallback(() => setSyncError(null), []);

  return { execute, isPending, syncError, clearError };
}

// ─────────────────────────────────────────────────────────────────────────────
// useSyncErrorToast — يعرض خطأ المزامنة تلقائياً كـ toast مؤقت
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react';

/**
 * إضافي — يُراقب syncError من useOptimisticAction
 * ويُعرض رسالة "خطأ في المزامنة" في الكونسول (أو يمكن ربطه بـ useConnectionToast)
 */
export function useSyncErrorToast(syncError: string | null) {
  useEffect(() => {
    if (syncError) {
      console.warn('[Optimistic Rollback]', syncError);
      // يمكن استبدال هذا بـ push() من useConnectionToast إذا أردت toast مرئي
    }
  }, [syncError]);
}

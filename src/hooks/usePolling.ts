// src/hooks/usePolling.ts
// Hook عام للاستطلاع الدوري عبر HTTP بدل WebSocket
// يُستخدم في مرحلة اللوبي وأي سياق لا يحتاج Realtime

import { useEffect, useRef } from 'react';

interface UsePollingOptions {
  /** الدالة التي تُستدعى في كل دورة — يجب أن تُعيد Promise */
  fetcher: () => Promise<void>;
  /** الفاصل الزمني بالملي ثانية (افتراضي: 5000) */
  intervalMs?: number;
  /** تفعيل/تعطيل الاستطلاع (افتراضي: true) */
  enabled?: boolean;
  /** تشغيل الاستطلاع فوراً عند التفعيل دون انتظار الفاصل الأول (افتراضي: true) */
  runImmediately?: boolean;
}

/**
 * usePolling — استطلاع دوري بديل عن WebSocket في مرحلة اللوبي
 *
 * @example
 * usePolling({
 *   fetcher: async () => {
 *     const { data } = await supabase
 *       .from('game_lobby')
 *       .select('player_name, team, avatar')
 *       .eq('session_id', sessionId);
 *     if (data) setPlayers(data);
 *   },
 *   intervalMs: 5000,
 *   enabled: !gameStarted,
 * });
 */
export function usePolling({
  fetcher,
  intervalMs = 5000,
  enabled = true,
  runImmediately = true,
}: UsePollingOptions): void {
  // نحتفظ بمرجع للـ fetcher حتى لا نحتاج إعادة تسجيل setInterval عند تغيير الدالة
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled) return;

    const run = () => {
      fetcherRef.current().catch(() => { /* silent — الأخطاء الشبكية مؤقتة */ });
    };

    if (runImmediately) run();

    const timer = setInterval(run, intervalMs);
    return () => clearInterval(timer);
  }, [enabled, intervalMs, runImmediately]);
}

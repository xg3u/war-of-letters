// src/core/GameCoreProvider.tsx
// المنسّق المركزي للطلبات — أولويات رباعية، قياس تأخير تكيّفي، إلغاء تكرار، وضع طوارئ
//
// ┌─────────────────────────────────────────────────────┐
// │  الأولوية         │  يُستخدم لـ               │
// ├─────────────────────────────────────────────────────┤
// │  CRITICAL  (1)    │  ضغط الجرس، استخدام البطاقة │
// │  HIGH      (2)    │  تزامن الحالة، تحديث النقاط │
// │  NORMAL    (3)    │  الأفاتار، التأثيرات البصرية │
// │  BACKGROUND(4)    │  الجلب المسبق، السجلات        │
// └─────────────────────────────────────────────────────┘

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// § 0 — إشارة وضع الطوارئ (للاستخدام خارج React — questionCache وغيرها)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * survivalModeSignal — إشارة بسيطة تُحدَّث من GameCoreProvider وتُقرأ من أي مكان.
 * استخدمها في questionCache.ts للتحقق قبل الجلب الخلفي:
 *   if (survivalModeSignal.active) return;
 */
export const survivalModeSignal = { active: false };

// ─────────────────────────────────────────────────────────────────────────────
// § 1 — Priority Type + Rank Map
// ─────────────────────────────────────────────────────────────────────────────

export type Priority =
  | 'CRITICAL'    // 1 — ينفَّذ فوراً، يتجاوز الطابور
  | 'HIGH'        // 2 — تزامن اللعبة
  | 'NORMAL'      // 3 — واجهة المستخدم
  | 'BACKGROUND'; // 4 — خلفي، يُلغى في وضع الطوارئ

/** الرقم المقابل لكل أولوية — الأصغر = الأعلى أولوية */
const RANK: Record<Priority, number> = {
  CRITICAL:   1,
  HIGH:       2,
  NORMAL:     3,
  BACKGROUND: 4,
};

export type GameMode = 'PERFORMANCE' | 'SURVIVAL';

// ─────────────────────────────────────────────────────────────────────────────
// § 2 — GameRequestQueue (داخلي — غير مُصدَّر)
// ─────────────────────────────────────────────────────────────────────────────

interface QueueItem<T = any> {
  priority:   Priority;
  rank:       number;
  fn:         () => Promise<T>;
  resolve:    (v: T)       => void;
  reject:     (e: unknown) => void;
  dedupeKey?: string;
}

class GameRequestQueue {
  private queue:       QueueItem[] = [];
  private running      = 0;
  private inflight     = new Map<string, Promise<any>>();
  /** العناصر ذات rank أعلى من هذا لا تُنفَّذ (Infinity = لا توقف) */
  private _maxRunRank  = Infinity;
  private readonly max: number;

  // ── Latency window ────────────────────────────────────────────────────────
  private _latencies:    number[] = [];
  private readonly _win  = 20;  // حجم نافذة القياس

  /** يُستدعى بعد كل طلب ناجح (latest ms, rolling avg ms) */
  _onLatency?: (latestMs: number, avgMs: number) => void;

  constructor(max = 3) {
    this.max = max;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  get avgLatency(): number {
    if (this._latencies.length === 0) return 0;
    return this._latencies.reduce((a, b) => a + b, 0) / this._latencies.length;
  }

  get pendingCount()  { return this.queue.length; }
  get runningCount()  { return this.running; }

  /**
   * أضف طلباً للطابور وأعِد Promise بنتيجته.
   *
   * dedupeKey: إذا كان هناك طلب بنفس الـ key قيد التشغيل → أعِد نفس الـ Promise
   *            بدلاً من إرسال طلب جديد (Anti-Spam).
   */
  enqueue<T>(
    fn:   () => Promise<T>,
    opts: { priority: Priority; dedupeKey?: string },
  ): Promise<T> {
    const { priority, dedupeKey } = opts;

    // ── إلغاء التكرار ──────────────────────────────────────────────────────
    if (dedupeKey && this.inflight.has(dedupeKey)) {
      return this.inflight.get(dedupeKey) as Promise<T>;
    }

    const rank = RANK[priority];
    const p = new Promise<T>((resolve, reject) => {
      const item: QueueItem<T> = { priority, rank, fn, resolve, reject, dedupeKey };

      // إدراج في الموضع الصحيح (FIFO داخل نفس الأولوية)
      const insertAt = this.queue.findIndex(i => i.rank > rank);
      if (insertAt === -1) this.queue.push(item);
      else                 this.queue.splice(insertAt, 0, item);

      this._tick();
    });

    if (dedupeKey) {
      this.inflight.set(dedupeKey, p);
      p.finally(() => this.inflight.delete(dedupeKey));
    }

    return p;
  }

  /**
   * ألغِ جميع العناصر المنتظرة ذات الأولوية الأدنى (rank أعلى) من `priority`.
   * يُرجع عدد العناصر التي أُلغيت.
   *
   * مثال: cancelBelow('HIGH') يُلغي NORMAL + BACKGROUND.
   */
  cancelBelow(priority: Priority): number {
    const threshold = RANK[priority];
    const toCancel  = this.queue.filter(i => i.rank > threshold);
    this.queue      = this.queue.filter(i => i.rank <= threshold);

    toCancel.forEach(i =>
      i.reject(Object.assign(new Error('cancelled:survival-mode'), { code: 'CANCELLED' }))
    );
    return toCancel.length;
  }

  /**
   * لا تُنفِّذ عناصر الأولوية الأدنى من `priority` (تبقى في الطابور).
   * null = استأنف الكل.
   *
   * مثال: setMaxRunPriority('HIGH') — يُوقف NORMAL و BACKGROUND مؤقتاً.
   */
  setMaxRunPriority(priority: Priority | null) {
    this._maxRunRank = priority ? RANK[priority] : Infinity;
    this._tick(); // ربما يوجد عناصر يمكن تشغيلها الآن
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _tick() {
    while (
      this.running < this.max      &&
      this.queue.length > 0        &&
      this.queue[0].rank <= this._maxRunRank
    ) {
      const item = this.queue.shift()!;
      this.running++;
      const t0 = performance.now();

      item.fn()
        .then(v => {
          this._record(performance.now() - t0);
          item.resolve(v);
        })
        .catch(e => item.reject(e))
        .finally(() => {
          this.running--;
          this._tick();
        });
    }
  }

  private _record(ms: number) {
    this._latencies.push(ms);
    if (this._latencies.length > this._win) this._latencies.shift();
    this._onLatency?.(ms, this.avgLatency);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// § 3 — Context Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GameRequestOptions {
  priority:   Priority;
  dedupeKey?: string;
}

interface GameCoreContextValue {
  /** وضع الأداء الحالي — 'PERFORMANCE' (طبيعي) | 'SURVIVAL' (طوارئ) */
  mode:       GameMode;
  /** متوسط زمن الاستجابة الدوار (آخر 20 طلب) */
  avgLatency: number;
  /** إحصاءات الطابور للعرض أو المراقبة */
  stats:      { pending: number; running: number };
  /**
   * أضف طلباً للطابور بالأولوية المحددة.
   * في وضع SURVIVAL: BACKGROUND يُرفض فوراً، NORMAL يُوقَّف.
   */
  enqueue:    <T>(fn: () => Promise<T>, opts: GameRequestOptions) => Promise<T>;
}

const GameCoreContext = createContext<GameCoreContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// § 4 — GameCoreProvider
// ─────────────────────────────────────────────────────────────────────────────

// ── عتبات تبديل الوضع ──────────────────────────────────────────────────────
const PERF_THRESHOLD     =  200;  // ms — أقل من هذا = PERFORMANCE
const SURVIVAL_THRESHOLD = 1000;  // ms — أعلى من هذا = SURVIVAL
const HYSTERESIS         =    5;  // قياسات متتالية مطلوبة لتغيير الوضع (منع الاهتزاز)

export function GameCoreProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [mode,       setMode]       = useState<GameMode>('PERFORMANCE');
  const [avgLatency, setAvgLatency] = useState(0);
  const [stats,      setStats]      = useState({ pending: 0, running: 0 });

  // Refs للوصول للقيم الحالية داخل callbacks بدون stale closure
  const modeRef     = useRef<GameMode>('PERFORMANCE');
  const trendWindow = useRef<('high' | 'low' | 'neutral')[]>([]);
  const queueRef    = useRef(new GameRequestQueue(3));

  // مزامنة ref ↔ state
  useEffect(() => {
    modeRef.current = mode;
    survivalModeSignal.active = mode === 'SURVIVAL';
  }, [mode]);

  // ── مراقب التأخير + تبديل الوضع ──────────────────────────────────────────
  useEffect(() => {
    const q = queueRef.current;

    q._onLatency = (_latest, avg) => {
      setAvgLatency(avg);

      // تصنيف القياس الحالي
      const trend: 'high' | 'low' | 'neutral' =
        avg > SURVIVAL_THRESHOLD ? 'high' :
        avg < PERF_THRESHOLD     ? 'low'  :
                                   'neutral';

      // نافذة الـ Hysteresis — نحتاج HYSTERESIS قياسات متتالية في نفس الاتجاه
      const w = trendWindow.current;
      w.push(trend);
      if (w.length > HYSTERESIS) w.shift();
      if (w.length < HYSTERESIS) return;

      const current = modeRef.current;

      if (w.every(t => t === 'high') && current !== 'SURVIVAL') {
        // ── الدخول لوضع الطوارئ ──────────────────────────────────────────
        setMode('SURVIVAL');
        modeRef.current   = 'SURVIVAL';
        trendWindow.current = [];

        const cancelled = q.cancelBelow('HIGH'); // ألغِ NORMAL + BACKGROUND
        q.setMaxRunPriority('HIGH');              // أوقف تشغيل NORMAL + BACKGROUND

        console.warn(
          `[GameCore] 🚨 → SURVIVAL mode (avg=${avg.toFixed(0)}ms, cancelled ${cancelled} tasks)`
        );

      } else if (w.every(t => t === 'low') && current !== 'PERFORMANCE') {
        // ── العودة لوضع الأداء ───────────────────────────────────────────
        setMode('PERFORMANCE');
        modeRef.current   = 'PERFORMANCE';
        trendWindow.current = [];

        q.setMaxRunPriority(null); // استأنف الكل

        console.log(`[GameCore] ✅ → PERFORMANCE mode (avg=${avg.toFixed(0)}ms)`);
      }
    };

    // تحديث الإحصاءات كل 500ms
    const statsTimer = setInterval(() => {
      setStats({ pending: q.pendingCount, running: q.runningCount });
    }, 500);

    return () => {
      clearInterval(statsTimer);
      q._onLatency = undefined;
    };
  }, []); // [] — ينشأ مرة واحدة فقط

  // ── بوابة الطلبات ─────────────────────────────────────────────────────────
  const enqueue = useCallback(<T,>(
    fn:   () => Promise<T>,
    opts: GameRequestOptions,
  ): Promise<T> => {
    // وضع الطوارئ: ارفض BACKGROUND فوراً (لا تُضف للطابور)
    if (modeRef.current === 'SURVIVAL' && opts.priority === 'BACKGROUND') {
      return Promise.reject(
        Object.assign(new Error('blocked:survival-mode'), { code: 'SURVIVAL_MODE' })
      );
    }
    return queueRef.current.enqueue(fn, opts);
  }, []); // [] — معرّف الدالة لا يتغير أبداً

  return (
    <GameCoreContext.Provider value={{ mode, avgLatency, stats, enqueue }}>
      {children}
    </GameCoreContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// § 5 — useGameCore (الوصول للـ context)
// ─────────────────────────────────────────────────────────────────────────────

export function useGameCore(): GameCoreContextValue {
  const ctx = useContext(GameCoreContext);
  if (!ctx) throw new Error('useGameCore must be used within <GameCoreProvider>');
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// § 6 — useGameRequest (الـ Hook الرئيسي)
// ─────────────────────────────────────────────────────────────────────────────

export interface UseGameRequestResult<T> {
  data:       T | null;
  isPending:  boolean;
  error:      string | null;
  /** نفّذ الطلب يدوياً */
  execute:    () => Promise<T | null>;
  clearError: () => void;
}

/**
 * useGameRequest — يُغلّف أي استدعاء Supabase بنظام الأولوية والإلغاء.
 *
 * ─── مثال: طلب حرج (الجرس) ───────────────────────────────────────
 * ```tsx
 * const { execute, isPending } = useGameRequest(
 *   () => buzzerChannel.attemptBuzzDB(sessionId, playerId, team),
 *   { priority: 'CRITICAL', dedupeKey: `buzz-${sessionId}` },
 * );
 * // في onPress → await execute()
 * ```
 *
 * ─── مثال: جلب خلفي (أسئلة) ─────────────────────────────────────
 * ```tsx
 * useGameRequest(
 *   () => prefetchAllGameLetters(cells),
 *   { priority: 'BACKGROUND', dedupeKey: 'prefetch', immediate: true },
 * );
 * // يُنفَّذ عند Mount تلقائياً
 * ```
 *
 * ─── مثال: تزامن (5 مكوّنات تطلب نفس البيانات) ──────────────────
 * جميعها تحصل على نفس الـ Promise بفضل dedupeKey:
 * ```tsx
 * useGameRequest(
 *   () => supabase.from('buyers').select('*').eq('id', userId).single(),
 *   { priority: 'HIGH', dedupeKey: `profile-${userId}` },
 * );
 * ```
 */
export function useGameRequest<T>(
  fn:   () => Promise<T>,
  opts: GameRequestOptions & { immediate?: boolean },
): UseGameRequestResult<T> {
  const { enqueue } = useGameCore();

  const [isPending, setIsPending] = useState(false);
  const [data,      setData]      = useState<T | null>(null);
  const [error,     setError]     = useState<string | null>(null);

  // Refs — يضمنان أن execute دائماً يرى آخر fn و opts بدون إعادة إنشاء الـ callback
  const fnRef   = useRef(fn);
  const optsRef = useRef(opts);
  useEffect(() => { fnRef.current   = fn;   });
  useEffect(() => { optsRef.current = opts; });

  const execute = useCallback(async (): Promise<T | null> => {
    setIsPending(true);
    setError(null);

    try {
      const result = await enqueue(fnRef.current, {
        priority:  optsRef.current.priority,
        dedupeKey: optsRef.current.dedupeKey,
      });
      setData(result);
      return result;

    } catch (err: unknown) {
      // إلغاء متوقع — لا نُظهر خطأً للمستخدم
      const code = (err as any)?.code;
      if (code === 'CANCELLED' || code === 'SURVIVAL_MODE') return null;

      const msg = err instanceof Error ? err.message : 'خطأ في الطلب';
      setError(msg);
      return null;

    } finally {
      setIsPending(false);
    }
  }, [enqueue]); // enqueue مستقر → execute لا يُعاد إنشاؤه

  // تنفيذ تلقائي عند Mount
  const immediateRef = useRef(opts.immediate);
  useEffect(() => {
    if (immediateRef.current) execute();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearError = useCallback(() => setError(null), []);

  return { data, isPending, error, execute, clearError };
}

// ─────────────────────────────────────────────────────────────────────────────
// § 7 — GameModeIndicator (مكوّن اختياري للمراقبة البصرية)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * أضفه في أي شاشة لعرض حالة النظام في وضع الطوارئ:
 * ```tsx
 * <GameModeIndicator />
 * ```
 */
export function GameModeIndicator() {
  const { mode, avgLatency, stats } = useGameCore();

  // لا نعرض شيئاً في وضع الأداء الطبيعي بلا طلبات معلقة
  if (mode === 'PERFORMANCE' && stats.pending === 0) return null;

  const isSurvival = mode === 'SURVIVAL';

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position:       'fixed',
        top:            '0.5rem',
        right:          '0.5rem',
        zIndex:         9998,
        background:     isSurvival ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.10)',
        border:         `1px solid ${isSurvival ? 'rgba(239,68,68,0.4)' : 'rgba(251,191,36,0.3)'}`,
        color:          isSurvival ? '#f87171' : '#fbbf24',
        padding:        '0.3rem 0.85rem',
        borderRadius:   '9999px',
        fontSize:       '0.75rem',
        fontFamily:     'Tajawal, sans-serif',
        direction:      'rtl',
        backdropFilter: 'blur(8px)',
        display:        'flex',
        alignItems:     'center',
        gap:            '0.4rem',
        boxShadow:      '0 2px 8px rgba(0,0,0,0.25)',
        pointerEvents:  'none',
        whiteSpace:     'nowrap',
      }}
    >
      {isSurvival ? (
        <>
          <span>🚨</span>
          <span>وضع الطوارئ — {avgLatency.toFixed(0)} ms</span>
        </>
      ) : stats.pending > 0 ? (
        <>
          <span>⏳</span>
          <span>{stats.pending} طلب معلق</span>
        </>
      ) : null}
    </div>
  );
}

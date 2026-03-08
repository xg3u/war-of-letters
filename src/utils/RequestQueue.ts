// src/utils/RequestQueue.ts
// مدير طلبات الشبكة — أولويات، تزامن محدود، إلغاء التكرار، Debounce
//
// الاستخدام:
//   requestQueue.enqueue(() => supabase.rpc(...), { priority: 'low', dedupeKey: 'q_ب' })
//   requestQueue.enqueue(() => submitMove(...),   { priority: 'high' })

export type QueuePriority = 'high' | 'low';

interface QueueItem<T = any> {
  fn:         () => Promise<T>;
  priority:   QueuePriority;
  resolve:    (value: T)  => void;
  reject:     (reason: unknown) => void;
  dedupeKey?: string;
}

interface EnqueueOptions {
  /** 'high' = يُنفَّذ فوراً (أمام الطابور). 'low' = ينتظر دوره. */
  priority?:    QueuePriority;
  /** نفس الـ key → نفس الـ Promise (منع الطلب المكرر في الجلسة ذاتها) */
  dedupeKey?:   string;
  /** إذا وُجد، يؤخَّر التنفيذ (ms) ويُلغى إذا جاء طلب جديد بنفس الـ key */
  debounceMs?:  number;
}

class RequestQueue {
  /** الحد الأقصى للطلبات المتزامنة */
  private readonly maxConcurrent: number;

  private running  = 0;
  private queue:    QueueItem[] = [];

  /** طلبات قيد التشغيل أو الانتظار بنفس الـ dedupeKey */
  private inflight = new Map<string, Promise<any>>();

  /** مؤقتات الـ Debounce بالـ key */
  private debounce = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * أضف طلباً للطابور وأعد Promise بنتيجته.
   *
   * @param fn         دالة غير متزامنة تُنفَّذ عند حلول دورها
   * @param options    priority / dedupeKey / debounceMs
   */
  enqueue<T>(fn: () => Promise<T>, options: EnqueueOptions = {}): Promise<T> {
    const { priority = 'low', dedupeKey, debounceMs } = options;

    // ── Deduplication: طلب بنفس الـ key قيد التشغيل → أعد نفس الـ Promise ──
    if (dedupeKey && this.inflight.has(dedupeKey)) {
      return this.inflight.get(dedupeKey) as Promise<T>;
    }

    // ── Debounce: ألغ المؤقت السابق وأعِد الجدولة ──────────────────────────
    if (dedupeKey && debounceMs) {
      const existing = this.debounce.get(dedupeKey);
      if (existing) clearTimeout(existing);

      return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.debounce.delete(dedupeKey);
          this._add(fn, priority, dedupeKey).then(resolve, reject);
        }, debounceMs);
        this.debounce.set(dedupeKey, timer);
      });
    }

    return this._add(fn, priority, dedupeKey);
  }

  /** إلغاء طلب معلّق بالـ dedupeKey (Debounce فقط — لا يلغي الجاري) */
  cancel(dedupeKey: string) {
    const timer = this.debounce.get(dedupeKey);
    if (timer) {
      clearTimeout(timer);
      this.debounce.delete(dedupeKey);
    }
  }

  /** عدد الطلبات في الانتظار (لا تشمل الجارية) */
  get pendingCount(): number { return this.queue.length; }

  /** عدد الطلبات الجارية حالياً */
  get runningCount(): number { return this.running; }

  // ── Private ───────────────────────────────────────────────────────────────

  private _add<T>(
    fn:         () => Promise<T>,
    priority:   QueuePriority,
    dedupeKey?: string,
  ): Promise<T> {
    const promise = new Promise<T>((resolve, reject) => {
      const item: QueueItem<T> = { fn, priority, resolve, reject, dedupeKey };

      // 'high' → ادفع للأمام؛ 'low' → أضف للخلف
      if (priority === 'high') {
        // أدرجه أمام أول عنصر 'low' لضمان FIFO بين الـ high
        const insertAt = this.queue.findIndex(i => i.priority === 'low');
        if (insertAt === -1) this.queue.push(item);
        else                 this.queue.splice(insertAt, 0, item);
      } else {
        this.queue.push(item);
      }

      this._tick();
    });

    if (dedupeKey) {
      this.inflight.set(dedupeKey, promise);
      promise.finally(() => this.inflight.delete(dedupeKey));
    }

    return promise;
  }

  private _tick() {
    while (this.running < this.maxConcurrent && this.queue.length > 0) {
      const item = this.queue.shift()!;
      this.running++;

      item.fn()
        .then(item.resolve)
        .catch(item.reject)
        .finally(() => {
          this.running--;
          this._tick(); // قد يكون هناك عناصر تنتظر
        });
    }
  }
}

// ── Singleton المُصدَّر للتطبيق ─────────────────────────────────────────────
// 3 طلبات متزامنة — يحمي الـ Supabase Free Tier من الإغراق
export const requestQueue = new RequestQueue(3);

// ── Helper: تمييز طلبات اللعبة عالية الأولوية ───────────────────────────────
/** يُستخدم للأوامر الحرجة: المطالبة بخلية، استخدام بطاقة، الجرس */
export const highPriority = <T>(fn: () => Promise<T>): Promise<T> =>
  requestQueue.enqueue(fn, { priority: 'high' });

/** يُستخدم للجلب الخلفي: أسئلة، إحصاءات، إلخ */
export const lowPriority = <T>(fn: () => Promise<T>, dedupeKey?: string): Promise<T> =>
  requestQueue.enqueue(fn, { priority: 'low', dedupeKey });

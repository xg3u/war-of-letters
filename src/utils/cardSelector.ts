// src/utils/cardSelector.ts
// نظام اختيار البطاقة الذكي — تنافسي ومتوازن

import type { CardType } from '../core/types';
import type { HexCell } from '../core/types';

// ─── سجل الجولة الحالية ───────────────────────────────────────────────────
let cardHistory: CardType[] = [];   // آخر N بطاقة ظهرت (للتنوع)
let roundBombCount    = 0;          // قنابل من الروليت العادي في الجولة الحالية
let roundRouletteCount = 0;         // إجمالي الروليتات في الجولة الحالية

const ALL_CARDS: CardType[] = ['freeze', 'bomb', 'battle', 'shield'];

// الحد الأقصى للقنابل من الروليت العادي في جولة واحدة
const MAX_BOMBS_PER_ROUND = 2;

/**
 * تسجيل بطاقة ظهرت — يُستدعى دائماً بعد انتهاء الروليت أو اختيار الحرف الذهبي
 * @param isGolden true → اختيار الحرف الذهبي (لا يُحسب في حد القنابل)
 */
export const recordCardDrawn = (card: CardType, isGolden = false): void => {
  cardHistory.push(card);
  if (cardHistory.length > 12) cardHistory.shift();
  if (!isGolden) {
    roundRouletteCount++;
    if (card === 'bomb') roundBombCount++;
  }
};

/** إعادة تعيين إحصاءات الجولة — يُستدعى عند بدء جولة جديدة داخل نفس المباراة */
export const resetRoundStats = (): void => {
  cardHistory      = [];
  roundBombCount   = 0;
  roundRouletteCount = 0;
};

/** إعادة تعيين كل شيء — مباراة جديدة أو العودة للإعدادات */
export const resetCardHistory = (): void => {
  cardHistory      = [];
  roundBombCount   = 0;
  roundRouletteCount = 0;
};

// ─── السياق المطلوب لاتخاذ القرار ────────────────────────────────────────
export interface CardSelectorContext {
  cells:     HexCell[];
  scores:    { green: number; red: number };
  teamCards: { green: CardType[]; red: CardType[] };
}

// ─── الخوارزمية الرئيسية ──────────────────────────────────────────────────
export const selectSmartCard = (ctx: CardSelectorContext): CardType => {
  const { cells, scores, teamCards } = ctx;

  // ── تحليل الشبكة ────────────────────────────────────────────────────────
  const activeCells = cells.filter(c => c.status !== 'destroyed');
  const total       = activeCells.length;
  const answered    = activeCells.filter(c => c.status === 'green' || c.status === 'red').length;
  const progress    = total > 0 ? answered / total : 0;

  const greenCells = activeCells.filter(c => c.status === 'green').length;
  const redCells   = activeCells.filter(c => c.status === 'red').length;
  const cellGap    = Math.abs(greenCells - redCells);

  const frozen   = activeCells.filter(c => c.isFrozen).length;
  const shielded = activeCells.filter(c => c.isShielded).length;

  // هل هذا آخر روليت في الجولة؟ (لا توجد خلايا hasCard+unanswered متبقية)
  const remainingCardCells = cells.filter(c => c.hasCard && c.status === 'unanswered').length;
  const isLastRoulette = remainingCardCells === 0;

  // ── أوزان أساسية تعكس التسلسل الهرمي لقوة البطاقات ─────────────────────
  // المعركة (أقوى) > القنبلة ≈ التجميد > الدرع (أضعف)
  const weights: Record<CardType, number> = {
    battle: 35,
    bomb:   26,
    freeze: 24,
    shield: 15,
  };

  // ── قيود صارمة (لا يمكن كسرها) ─────────────────────────────────────────

  // 1. حد القنابل: مرتين كحد أقصى للروليت العادي في الجولة الواحدة
  if (roundBombCount >= MAX_BOMBS_PER_ROUND) {
    weights.bomb = 0;
  }

  // 2. آخر روليت في الجولة: لا يجوز اختيار الدرع
  if (isLastRoulette) {
    weights.shield = 0;
  }

  // ── منع التكرار المباشر ──────────────────────────────────────────────────
  const lastCard = cardHistory[cardHistory.length - 1];
  if (lastCard) {
    weights[lastCard] = Math.max(0, weights[lastCard] * 0.4);
  }
  // منع ظهور نفس البطاقة ثلاث مرات متتالية
  const prevCard = cardHistory[cardHistory.length - 2];
  if (prevCard && prevCard === lastCard) {
    weights[lastCard] = 0;
  }

  // ── تغطية مضمونة للتنوع ──────────────────────────────────────────────────
  // بطاقة غائبة عن آخر 6 ظهورات → دفعة إضافية لضمان التنوع
  if (cardHistory.length >= 3) {
    const last6 = cardHistory.slice(-6);
    for (const card of ALL_CARDS) {
      if (!last6.includes(card) && weights[card] > 0) {
        weights[card] += 18;
      }
    }
  }

  // ── مرحلة اللعب (تدرج زمني للإثارة) ────────────────────────────────────
  if (progress < 0.25) {
    // بداية الجولة: استراتيجية دفاعية وبناء
    weights.freeze += 10;
    weights.shield += 8;
  } else if (progress > 0.70) {
    // نهاية الجولة: حسم وهجوم
    weights.battle += 22;
    if (roundBombCount < MAX_BOMBS_PER_ROUND) weights.bomb += 18;
    weights.shield  = Math.max(0, weights.shield - 12);
  } else {
    // المنتصف: توازن مع ميل هجومي خفيف
    weights.battle += 8;
    if (roundBombCount < MAX_BOMBS_PER_ROUND) weights.bomb += 5;
  }

  // ── التوازن التنافسي (فجوة الخلايا) ────────────────────────────────────
  // كلما زاد الفارق، زادت احتمالية البطاقات الهجومية لإعادة التوازن وإحداث الإثارة
  if (cellGap >= 6) {
    weights.battle += 26;
    if (roundBombCount < MAX_BOMBS_PER_ROUND) weights.bomb += 22;
  } else if (cellGap >= 4) {
    weights.battle += 15;
    if (roundBombCount < MAX_BOMBS_PER_ROUND) weights.bomb += 12;
  } else if (cellGap >= 2) {
    weights.battle += 7;
    if (roundBombCount < MAX_BOMBS_PER_ROUND) weights.bomb += 4;
  }

  // ── تشبع الشبكة (تجنب الإزدواجية) ──────────────────────────────────────
  if (frozen >= 3) {
    weights.freeze = Math.max(0, weights.freeze - 22);
  }
  if (shielded >= 4) {
    weights.shield = Math.max(0, weights.shield - 20);
  }

  // ── مخزون بطاقات الفرق ──────────────────────────────────────────────────
  const allCards    = [...teamCards.green, ...teamCards.red];
  const freezeCount = allCards.filter(c => c === 'freeze').length;
  const bombCount   = allCards.filter(c => c === 'bomb').length;
  const shieldCount = allCards.filter(c => c === 'shield').length;
  const battleCount = allCards.filter(c => c === 'battle').length;

  // عقوبة التكرار في المخزون
  if (freezeCount >= 4)      weights.freeze = Math.max(0, weights.freeze - 28);
  else if (freezeCount >= 2) weights.freeze -= 10;

  if (bombCount >= 3)      weights.bomb = Math.max(0, weights.bomb - 22);
  else if (bombCount >= 1) weights.bomb -= 7;

  if (shieldCount >= 4)      weights.shield = Math.max(0, weights.shield - 26);
  else if (shieldCount >= 2) weights.shield -= 10;

  if (battleCount >= 4)      weights.battle -= 22;
  else if (battleCount >= 2) weights.battle -= 8;

  // مكافأة الغياب (يعزز التنوع في المخزون)
  if (bombCount === 0 && roundBombCount < MAX_BOMBS_PER_ROUND) weights.bomb   += 14;
  if (shieldCount === 0 && !isLastRoulette)                   weights.shield  += 15;
  if (freezeCount === 0)                                       weights.freeze  += 10;
  if (battleCount === 0)                                       weights.battle  += 12;

  // ── فجوة نقاط الجولات (توازن المباراة) ────────────────────────────────
  const roundGap = Math.abs(scores.green - scores.red);
  if (roundGap >= 2) {
    // فريق يتقدم كثيراً في الجولات → ادفع نحو الصراع لإبقاء الإثارة
    weights.battle += 16;
    if (roundBombCount < MAX_BOMBS_PER_ROUND) weights.bomb += 10;
  }

  // ── الاختيار المرجح ──────────────────────────────────────────────────────
  for (const card of ALL_CARDS) {
    weights[card] = Math.max(0, weights[card]);
  }

  const totalWeight = ALL_CARDS.reduce((s, c) => s + weights[c], 0);
  if (totalWeight === 0) return 'battle'; // fallback آمن

  const r = Math.random() * totalWeight;
  let cum = 0;
  for (const card of ALL_CARDS) {
    cum += weights[card];
    if (r <= cum) return card;
  }
  return 'battle';
};

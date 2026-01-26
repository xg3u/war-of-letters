// src/utils/cardPermissions.ts
// صلاحيات البطاقات الأربعة

import type { HexCell, CardType } from '../core/types';

export interface CardPermission {
  id: CardType;
  name: string;
  nameAr: string;
  description: string;
  canTargetOwn: boolean;         // يمكن استخدامه على حروف فريقك؟
  canTargetOpponent: boolean;    // يمكن استخدامه على حروف الخصم؟
  canTargetUnanswered: boolean;  // يمكن استخدامه على حروف غير مجابة؟
  requiresTarget: boolean;       // يحتاج اختيار خلية؟
  effectDuration: number;        // مدة التأثير (عدد الأسئلة)
}

// =====================================================
// البطاقات الأربعة الرئيسية
// =====================================================

export const CARD_PERMISSIONS: Record<CardType, CardPermission> = {

  // 1️⃣ التجميد - تجميد حرف غير مجاب لمدة دورتين
  freeze: {
    id: 'freeze',
    name: 'Freeze',
    nameAr: '🧊 التجميد',
    description: 'تجميد حرف غير مجاب لمدة دورتين. لا يمكن لأي فريق اختياره للتنافس عليه.',
    canTargetOwn: false,
    canTargetOpponent: false,
    canTargetUnanswered: true,    // ✅ فقط الحروف غير المجابة
    requiresTarget: true,
    effectDuration: 2,            // دورتين
  },

  // 2️⃣ القنبلة - تدمير حرف الخصم وإزالته نهائياً
  bomb: {
    id: 'bomb',
    name: 'Bomb',
    nameAr: '💣 القنبلة',
    description: 'تدمير حرف يمتلكه الخصم. الحرف يختفي ولا يمكن لأي فريق الإجابة عليه.',
    canTargetOwn: false,
    canTargetOpponent: true,      // ✅ فقط حروف الخصم
    canTargetUnanswered: false,
    requiresTarget: true,
    effectDuration: 0,            // تأثير فوري ودائم
  },

  // 3️⃣ المعركة - إعادة التنافس على حرف الخصم مباشرة
  battle: {
    id: 'battle',
    name: 'Battle',
    nameAr: '⚔️ المعركة',
    description: 'إعادة حرف الخصم للتنافس مباشرة. يُطرح سؤال جديد فوراً ومن يجيب يمتلك الحرف.',
    canTargetOwn: false,
    canTargetOpponent: true,      // ✅ حروف الخصم فقط
    canTargetUnanswered: false,
    requiresTarget: true,
    effectDuration: 0,            // تأثير فوري
  },

  // 4️⃣ الدرع - حماية حرفك من أي بطاقة لمدة 5 أسئلة
  shield: {
    id: 'shield',
    name: 'Shield',
    nameAr: '🛡️ الدرع',
    description: 'حماية حرف تمتلكه لمدة 5 أسئلة. لا يمكن استخدام القنبلة أو المعركة عليه.',
    canTargetOwn: true,           // ✅ فقط حروفك
    canTargetOpponent: false,
    canTargetUnanswered: false,
    requiresTarget: true,
    effectDuration: 5,            // 5 أسئلة
  },
};

// =====================================================
// التحقق من إمكانية استخدام البطاقة على خلية معينة
// =====================================================

export const canUseCardOnCell = (
  card: CardType,
  cell: HexCell,
  userTeam: 'green' | 'red'
): { allowed: boolean; reason?: string } => {
  const permission = CARD_PERMISSIONS[card];

  if (!permission) {
    return { allowed: false, reason: '❌ بطاقة غير معروفة' };
  }

  // التحقق من حالة الخلية
  const isOwn = cell.status === userTeam;
  const isOpponent = cell.status !== 'unanswered' && cell.status !== 'destroyed' && cell.status !== userTeam;
  const isUnanswered = cell.status === 'unanswered';
  const isDestroyed = cell.status === 'destroyed';

  // لا يمكن استهداف خلية مدمرة
  if (isDestroyed) {
    return {
      allowed: false,
      reason: '💥 هذا الحرف مدمر ولا يمكن استهدافه'
    };
  }

  // لا يمكن استهداف خلية مجمدة
  if (cell.isFrozen && card !== 'shield') {
    return {
      allowed: false,
      reason: '🧊 هذا الحرف مجمد حالياً'
    };
  }

  // التحقق من الصلاحيات حسب نوع الخلية
  if (isOwn && !permission.canTargetOwn) {
    return {
      allowed: false,
      reason: '❌ لا يمكن استخدام هذه البطاقة على حروف فريقك'
    };
  }

  if (isOpponent && !permission.canTargetOpponent) {
    return {
      allowed: false,
      reason: '❌ لا يمكن استخدام هذه البطاقة على حروف الخصم'
    };
  }

  if (isUnanswered && !permission.canTargetUnanswered) {
    return {
      allowed: false,
      reason: '❌ لا يمكن استخدام هذه البطاقة على حروف غير مجابة'
    };
  }

  // التحقق من الحماية (للقنبلة والمعركة فقط)
  if (cell.isShielded && (card === 'bomb' || card === 'battle')) {
    return {
      allowed: false,
      reason: '🛡️ هذا الحرف محمي بالدرع!'
    };
  }

  return { allowed: true };
};

// =====================================================
// تطبيق تأثير البطاقة
// =====================================================

export const applyCardEffect = (
  card: CardType,
  cells: HexCell[],
  targetCellId: string | null,
  userTeam: 'green' | 'red'
): { cells: HexCell[]; triggerBattle?: boolean; battleCellId?: string } => {

  switch (card) {

    // 🧊 التجميد - تجميد لدورتين
    case 'freeze':
      return {
        cells: cells.map(c =>
          c.id === targetCellId
            ? {
                ...c,
                isFrozen: true,
                frozenBy: userTeam,
                freezeCounter: 2  // دورتين
              }
            : c
        )
      };

    // 💣 القنبلة - تدمير الحرف نهائياً
    case 'bomb':
      return {
        cells: cells.map(c =>
          c.id === targetCellId
            ? {
                ...c,
                status: 'destroyed' as const,
                isShielded: false,
                letter: '' // إزالة الحرف
              }
            : c
        )
      };

    // ⚔️ المعركة - إعادة التنافس مباشرة
    case 'battle':
      return {
        cells: cells.map(c =>
          c.id === targetCellId
            ? {
                ...c,
                status: 'unanswered' as const,
                isShielded: false
              }
            : c
        ),
        triggerBattle: true,
        battleCellId: targetCellId || undefined
      };

    // 🛡️ الدرع - حماية لمدة 5 أسئلة
    case 'shield':
      return {
        cells: cells.map(c =>
          c.id === targetCellId
            ? {
                ...c,
                isShielded: true,
                shieldCounter: 5  // 5 أسئلة
              }
            : c
        )
      };

    default:
      return { cells };
  }
};

// =====================================================
// تحديث عدادات البطاقات بعد كل سؤال
// =====================================================

export const updateCardCounters = (cells: HexCell[]): HexCell[] => {
  return cells.map(cell => {
    let updatedCell = { ...cell };

    // تحديث عداد التجميد
    if (cell.isFrozen && cell.freezeCounter > 0) {
      const newCounter = cell.freezeCounter - 1;
      if (newCounter <= 0) {
        // إزالة التجميد
        updatedCell = {
          ...updatedCell,
          isFrozen: false,
          frozenBy: null,
          freezeCounter: 0
        };
      } else {
        updatedCell.freezeCounter = newCounter;
      }
    }

    // تحديث عداد الدرع
    if (cell.isShielded && cell.shieldCounter > 0) {
      const newCounter = cell.shieldCounter - 1;
      if (newCounter <= 0) {
        // إزالة الحماية
        updatedCell = {
          ...updatedCell,
          isShielded: false,
          shieldCounter: 0
        };
      } else {
        updatedCell.shieldCounter = newCounter;
      }
    }

    return updatedCell;
  });
};

// =====================================================
// الحصول على حالة التجميد للعرض
// =====================================================

export const getFreezeState = (cell: HexCell): 'frozen' | 'melting' | 'none' => {
  if (!cell.isFrozen || !cell.freezeCounter) return 'none';
  if (cell.freezeCounter === 2) return 'frozen';      // مجمد بالكامل
  if (cell.freezeCounter === 1) return 'melting';     // ذوبان جزئي
  return 'none';
};

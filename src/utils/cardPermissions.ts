// src/utils/cardPermissions.ts
// صلاحيات البطاقات

import type { HexCell, CardType } from '../core/types';

export interface CardPermission {
  id: CardType;
  name: string;
  nameAr: string;
  description: string;
  canTargetOwn: boolean;        // يمكن استخدامه على حروف فريقك؟
  canTargetOpponent: boolean;    // يمكن استخدامه على حروف الخصم؟
  canTargetUnanswered: boolean;  // يمكن استخدامه على حروف غير مجابة؟
  requiresTarget: boolean;       // يحتاج اختيار خلية؟
  targetAll: boolean;            // يستهدف الشبكة كلها؟
}

export const CARD_PERMISSIONS: Record<CardType, CardPermission> = {
  freeze: {
    id: 'freeze',
    name: 'Freeze',
    nameAr: '🧊 التجميد',
    description: 'تجميد حرف معين لدورتين. فقط الفريق المجمد له يقدر يجاوب عليه. إذا أجاب صح يحصل عليه، وإذا فشل تبقى الحالة.',
    canTargetOwn: false,
    canTargetOpponent: false,
    canTargetUnanswered: true,    // ✅ فقط الحروف غير المجابة
    requiresTarget: true,
    targetAll: false,
  },
  
  bomb: {
    id: 'bomb',
    name: 'Bomb',
    nameAr: '💣 القنبلة',
    description: 'حذف حرف مجاب عليه من خصمك (يتم إرجاعه فارغاً على اللوحة). لا تعيد السؤال ولا تمنح الفريق الآخر نقطة.',
    canTargetOwn: false,
    canTargetOpponent: true,      // ✅ فقط حروف الخصم
    canTargetUnanswered: false,
    requiresTarget: true,
    targetAll: false,
  },
  
  battle: {
    id: 'battle',
    name: 'Battle',
    nameAr: '⚔️ المعركة',
    description: 'يتم اختيار حرف مجاب عليه من الخصم ليُعاد طرحه من جديد على اللوحة ويُعاد التنافس عليه.',
    canTargetOwn: false,
    canTargetOpponent: true,      // ✅ حروف الخصم فقط
    canTargetUnanswered: false,   // ❌ ليس للحروف غير المجابة
    requiresTarget: true,
    targetAll: false,
  },
  
  shield: {
    id: 'shield',
    name: 'Shield',
    nameAr: '🛡️ الدرع',
    description: 'حماية أحد الحروف التي تملكها من التأثيرات الأخرى (قنبلة / معركة). يستمر حتى نهاية الجولة.',
    canTargetOwn: true,           // ✅ فقط حروفك
    canTargetOpponent: false,
    canTargetUnanswered: false,
    requiresTarget: true,
    targetAll: false,
  },
  
  demonShuffle: {
    id: 'demonShuffle',
    name: 'Demon Shuffle',
    nameAr: '👹 خلط الشيطان',
    description: 'يتم اختيار 1-3 أحرف من خصمك وتُخلط عشوائيًا مع حروف غير مجابة في اللوحة. نقاط الخصم تبقى كما هي، لكن قد يخسر اتصال مهم.',
    canTargetOwn: false,
    canTargetOpponent: true,      // ✅ يستهدف حروف الخصم
    canTargetUnanswered: false,
    requiresTarget: false,        // ❌ لا يحتاج اختيار محدد (يختار عشوائياً)
    targetAll: false,             // يستهدف 1-3 أحرف فقط
  },
  
  speedUp: {
    id: 'speedUp',
    name: 'Speed Up',
    nameAr: '⚡ تسريع',
    description: 'الفريق يلعب دورتين متتاليتين. تستخدم مرة واحدة فقط.',
    canTargetOwn: true,           // ✅ يستخدمها الفريق على نفسه
    canTargetOpponent: false,
    canTargetUnanswered: false,
    requiresTarget: false,        // ❌ لا يحتاج اختيار
    targetAll: false,
  },
  
  luck: {
    id: 'luck',
    name: 'Luck',
    nameAr: '🍀 الحظ',
    description: 'تأثير عشوائي (من بين كل البطاقات أو لا شيء). ممكن يخدم أو يضر.',
    canTargetOwn: false,
    canTargetOpponent: false,
    canTargetUnanswered: false,
    requiresTarget: false,        // ❌ لا يحتاج اختيار
    targetAll: false,
  },
};

// التحقق من إمكانية استخدام البطاقة على خلية معينة
export const canUseCardOnCell = (
  card: CardType,
  cell: HexCell,
  userTeam: 'green' | 'red'
): { allowed: boolean; reason?: string } => {
  const permission = CARD_PERMISSIONS[card];
  
  // إذا البطاقة لا تحتاج target
  if (!permission.requiresTarget) {
    return { allowed: true };
  }
  
  // التحقق من الحالة
  const isOwn = cell.status === userTeam;
  const isOpponent = cell.status !== 'unanswered' && cell.status !== userTeam;
  const isUnanswered = cell.status === 'unanswered';
  
  // التحقق من الصلاحيات
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
  
  // التحقق من الحماية
  if (cell.isShielded) {
    return { 
      allowed: false, 
      reason: '🛡️ هذا الحرف محمي بالدرع!' 
    };
  }
  
  return { allowed: true };
};

// تطبيق تأثير البطاقة
export const applyCardEffect = (
  card: CardType,
  cells: HexCell[],
  targetCellId: string | null,
  userTeam: 'green' | 'red'
): HexCell[] => {
  const opponentTeam = userTeam === 'green' ? 'red' : 'green';

  switch (card) {
    case 'freeze':
      // تجميد لدورتين (freezeCounter = 2)
      return cells.map(c =>
        c.id === targetCellId
          ? { ...c, frozenBy: userTeam, freezeCounter: 2 }
          : c
      );

    case 'bomb':
      // حذف حرف الخصم وإرجاعه فارغاً
      return cells.map(c =>
        c.id === targetCellId
          ? { ...c, status: 'unanswered', isShielded: false }
          : c
      );

    case 'battle':
      // إعادة طرح حرف الخصم للمنافسة (يرجع unanswered)
      return cells.map(c =>
        c.id === targetCellId
          ? { ...c, status: 'unanswered', isShielded: false }
          : c
      );

    case 'shield':
      // حماية حتى نهاية الجولة
      return cells.map(c =>
        c.id === targetCellId
          ? { ...c, isShielded: true }
          : c
      );

    case 'demonShuffle':
      // اختيار 1-3 أحرف من الخصم وخلطها مع حروف غير مجابة
      const opponentCells = cells.filter(c => c.status === opponentTeam && !c.isShielded);
      const unansweredCells = cells.filter(c => c.status === 'unanswered');

      if (opponentCells.length === 0 || unansweredCells.length === 0) {
        return cells; // لا يوجد حروف للخلط
      }

      // اختيار عشوائي من 1-3 أحرف
      const count = Math.min(
        Math.floor(Math.random() * 3) + 1,
        opponentCells.length,
        unansweredCells.length
      );

      const selectedOpponent = opponentCells
        .sort(() => Math.random() - 0.5)
        .slice(0, count);
      const selectedUnanswered = unansweredCells
        .sort(() => Math.random() - 0.5)
        .slice(0, count);

      // خلط المواقع
      return cells.map(c => {
        const opponentIndex = selectedOpponent.findIndex(cell => cell.id === c.id);
        if (opponentIndex !== -1) {
          // نقل الحرف للموقع الجديد (unanswered)
          return { ...selectedUnanswered[opponentIndex], status: opponentTeam };
        }

        const unansweredIndex = selectedUnanswered.findIndex(cell => cell.id === c.id);
        if (unansweredIndex !== -1) {
          return { ...selectedOpponent[unansweredIndex], status: 'unanswered' };
        }

        return c;
      });

    default:
      return cells;
  }
};
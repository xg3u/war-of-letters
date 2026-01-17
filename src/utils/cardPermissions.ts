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
    description: 'يجمد حرفاً غير مجاب ويمنع الإجابة عليه لجولة واحدة',
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
    description: 'يفجر حرفاً للخصم ويحوله لحرف غير مجاب',
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
    description: 'معركة على أي حرف - الفائز يأخذ الحرف',
    canTargetOwn: false,
    canTargetOpponent: true,      // ✅ حروف الخصم
    canTargetUnanswered: true,    // ✅ حروف غير مجابة
    requiresTarget: true,
    targetAll: false,
  },
  
  shield: {
    id: 'shield',
    name: 'Shield',
    nameAr: '🛡️ الدرع',
    description: 'يحمي حرفاً من فريقك من البطاقات الأخرى',
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
    description: 'يخلط جميع الحروف غير المجابة بشكل عشوائي',
    canTargetOwn: false,
    canTargetOpponent: false,
    canTargetUnanswered: false,
    requiresTarget: false,        // ❌ لا يحتاج اختيار
    targetAll: true,              // ✅ يستهدف الكل
  },
  
  speedUp: {
    id: 'speedUp',
    name: 'Speed Up',
    nameAr: '⚡ تسريع',
    description: 'يقلل الوقت المتاح للخصم للإجابة على السؤال التالي',
    canTargetOwn: false,
    canTargetOpponent: false,
    canTargetUnanswered: false,
    requiresTarget: false,        // ❌ لا يحتاج اختيار
    targetAll: false,
  },
  
  luck: {
    id: 'luck',
    name: 'Luck',
    nameAr: '🍀 الحظ',
    description: 'يمنح فرصة ثانية في حال الإجابة الخاطئة',
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
  if (cell.hasShield) {
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
  switch (card) {
    case 'freeze':
      return cells.map(c => 
        c.id === targetCellId 
          ? { ...c, frozenBy: userTeam, freezeCounter: 1 }
          : c
      );
      
    case 'bomb':
      return cells.map(c => 
        c.id === targetCellId 
          ? { ...c, status: 'unanswered' }
          : c
      );
      
    case 'shield':
      return cells.map(c => 
        c.id === targetCellId 
          ? { ...c, hasShield: true }
          : c
      );
      
    case 'demonShuffle':
      // خلط الحروف غير المجابة
      const unansweredCells = cells.filter(c => c.status === 'unanswered');
      const letters = unansweredCells.map(c => c.letter);
      
      // خلط عشوائي
      for (let i = letters.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [letters[i], letters[j]] = [letters[j], letters[i]];
      }
      
      let letterIndex = 0;
      return cells.map(c => {
        if (c.status === 'unanswered') {
          return { ...c, letter: letters[letterIndex++] };
        }
        return c;
      });
      
    default:
      return cells;
  }
};
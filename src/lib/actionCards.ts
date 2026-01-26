// src/lib/actionCards.ts
// ملف البطاقات الأربعة الرئيسية

import type { ActionCard } from '../core/types';

// ========== البطاقات الأربعة ==========

export const actionCards: ActionCard[] = [
  // 🧊 التجميد
  {
    id: 'freeze',
    name: '🧊 التجميد',
    description: 'تجميد حرف غير مجاب لمدة دورتين. لا يمكن لأي فريق اختياره للتنافس عليه.',
    icon: '🧊',
    color: '#3b82f6',
    rarity: 'common',
  },

  // 💣 القنبلة
  {
    id: 'bomb',
    name: '💣 القنبلة',
    description: 'تدمير حرف يمتلكه الخصم. الحرف يختفي ولا يمكن لأي فريق الإجابة عليه.',
    icon: '💣',
    color: '#ef4444',
    rarity: 'rare',
  },

  // ⚔️ المعركة
  {
    id: 'battle',
    name: '⚔️ المعركة',
    description: 'إعادة حرف الخصم للتنافس مباشرة. يُطرح سؤال جديد فوراً ومن يجيب يمتلك الحرف.',
    icon: '⚔️',
    color: '#f97316',
    rarity: 'rare',
  },

  // 🛡️ الدرع
  {
    id: 'shield',
    name: '🛡️ الدرع',
    description: 'حماية حرف تمتلكه لمدة 5 أسئلة. لا يمكن استخدام القنبلة أو المعركة عليه.',
    icon: '🛡️',
    color: '#10b981',
    rarity: 'common',
  },
];

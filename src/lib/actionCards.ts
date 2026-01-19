// src/lib/actionCards.ts
// ملف بطاقات الأكشن - سهل التعديل والإضافة

import type { ActionCard } from '../core/types';

// ========== بيانات البطاقات ==========
// لإضافة بطاقة جديدة، انسخ أحد الأمثلة وغيّر البيانات

export const actionCards: ActionCard[] = [
  {
    id: 'freeze',
    name: '🧊 تجميد',
    description: 'جمّد حرفاً معيناً لدورتين. فقط الفريق المجمّد يمكنه الإجابة عليه',
    icon: '🧊',
    color: '#3b82f6', // أزرق
    rarity: 'common',
  },
  {
    id: 'bomb',
    name: '💣 قنبلة',
    description: 'احذف حرفاً مجاباً من خصمك وأعده فارغاً على اللوحة',
    icon: '💣',
    color: '#ef4444', // أحمر
    rarity: 'rare',
  },
  {
    id: 'battle',
    name: '⚔️ معركة',
    description: 'اختر حرفاً من الخصم ليُعاد طرحه ويتنافس عليه الفريقان من جديد',
    icon: '⚔️',
    color: '#f97316', // برتقالي
    rarity: 'rare',
  },
  {
    id: 'shield',
    name: '🛡 درع',
    description: 'احمِ أحد حروفك من تأثيرات البطاقات الأخرى حتى نهاية الجولة',
    icon: '🛡',
    color: '#10b981', // أخضر
    rarity: 'common',
  },
  /*
  {
    id: 'shuffle',
    name: '😈 خلط شيطاني',
    description: 'اختر 1-3 أحرف من خصمك واخلطها عشوائياً مع حروف غير مجابة',
    icon: '😈',
    color: '#8b5cf6', // بنفسجي
    rarity: 'epic',
  },*/
 /* 
  {
    id: 'luck',
    name: '🎲 حظ',
    description: 'تأثير عشوائي - قد يكون في صالحك أو ضدك! المغامرة لها ثمن',
    icon: '🎲',
    color: '#ec4899', // وردي
    rarity: 'legendary',
  },
  */
];

// ========== مثال: كيف تضيف بطاقة جديدة ==========
/*
  {
    id: 'swap',                        // معرّف فريد
    name: '🔄 تبديل',                 // الاسم مع إيموجي
    description: 'بدّل حرفين من حروفك مع حرفين من خصمك',
    icon: '🔄',                        // إيموجي
    color: '#14b8a6',                 // لون hex
    rarity: 'rare',                   // common / rare / epic / legendary
  },
*/
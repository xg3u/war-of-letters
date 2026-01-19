// src/lib/categories.ts
// ملف الكاتيجوريز - سهل التعديل والإضافة

import type { Category } from '../core/types';

// ========== بيانات الكاتيجوريز ==========
// لإضافة كاتيجوري جديد، انسخ أحد الأمثلة وغيّر البيانات

export const categories: Category[] = [
  {
    id: 'sports',
    name: 'رياضة',
    description: 'أسئلة متنوعة عن الرياضات المختلفة، الفرق، اللاعبين والبطولات العالمية',
    questionsCount: 0, // غيّر هذا الرقم لاحقاً
    rating: 4.5,
    icon: '⚽',
    color: '#10b981', // أخضر
  },
  {
    id: 'history',
    name: 'تاريخ',
    description: 'استكشف الأحداث التاريخية الكبرى، الحضارات القديمة والشخصيات التاريخية المؤثرة',
    questionsCount: 0,
    rating: 4.8,
    icon: '📜',
    color: '#f59e0b', // برتقالي
  },
  {
    id: 'science',
    name: 'علوم',
    description: 'أسئلة علمية شيقة في الفيزياء، الكيمياء، الأحياء والاكتشافات العلمية',
    questionsCount: 0,
    rating: 4.7,
    icon: '🔬',
    color: '#3b82f6', // أزرق
  },
  {
    id: 'geography',
    name: 'جغرافيا',
    description: 'اختبر معلوماتك عن الدول، العواصم، التضاريس والمعالم الجغرافية حول العالم',
    questionsCount: 0,
    rating: 4.6,
    icon: '🌍',
    color: '#8b5cf6', // بنفسجي
  },
  {
    id: 'culture',
    name: 'ثقافة عامة',
    description: 'معلومات متنوعة في الأدب، الفن، الموسيقى والثقافات المختلفة',
    questionsCount: 0,
    rating: 4.4,
    icon: '🎭',
    color: '#ec4899', // وردي
  },

  {
    id: 'islamic',
    name: 'ثقافة إسلامية',
    description: 'أسئلة دينية عن القرآن، السيرة النبوية، الفقه والتاريخ الإسلامي',
    questionsCount: 0,
    rating: 5.0,
    icon: '🕌',
    color: '#14b8a6', // تيل
  },

];

// ========== مثال: كيف تضيف كاتيجوري جديد ==========
/*
  {
    id: 'movies',              // معرّف فريد بالإنجليزي
    name: 'أفلام',            // الاسم بالعربي
    description: 'أسئلة عن الأفلام والمسلسلات والممثلين',
    questionsCount: 0,         // اتركه 0 وعدّله لاحقاً
    rating: 4.5,               // من 1 إلى 5
    icon: '🎬',               // إيموجي
    color: '#ef4444',         // لون hex
  },
*/
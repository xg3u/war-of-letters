// src/utils/arabicLetters.ts
// منطق الحروف العربية والاختيار

// الحروف العربية الـ 28 مع تكرارها الإحصائي
export const ARABIC_LETTERS = [
  { letter: 'ا', frequency: 'very-high' },
  { letter: 'ب', frequency: 'high' },
  { letter: 'ت', frequency: 'high' },
  { letter: 'ث', frequency: 'low' },
  { letter: 'ج', frequency: 'medium' },
  { letter: 'ح', frequency: 'medium' },
  { letter: 'خ', frequency: 'low' },
  { letter: 'د', frequency: 'medium' },
  { letter: 'ذ', frequency: 'low' },
  { letter: 'ر', frequency: 'high' },
  { letter: 'ز', frequency: 'low' },
  { letter: 'س', frequency: 'high' },
  { letter: 'ش', frequency: 'medium' },
  { letter: 'ص', frequency: 'medium' },
  { letter: 'ض', frequency: 'low' },
  { letter: 'ط', frequency: 'medium' },
  { letter: 'ظ', frequency: 'very-low' },
  { letter: 'ع', frequency: 'high' },
  { letter: 'غ', frequency: 'low' },
  { letter: 'ف', frequency: 'high' },
  { letter: 'ق', frequency: 'medium' },
  { letter: 'ك', frequency: 'high' },
  { letter: 'ل', frequency: 'very-high' },
  { letter: 'م', frequency: 'very-high' },
  { letter: 'ن', frequency: 'very-high' },
  { letter: 'ه', frequency: 'high' },
  { letter: 'و', frequency: 'high' },
  { letter: 'ي', frequency: 'very-high' },
] as const;

type Frequency = 'very-high' | 'high' | 'medium' | 'low' | 'very-low';

/**
 * اختيار حروف عشوائية بناءً على حجم الشبكة
 * @param gridSize - حجم الشبكة المطلوب
 * @returns مصفوفة من الحروف المختارة
 */
export function selectLettersForGrid(gridSize: '5x5' | 'balanced'): string[] {
  const count = gridSize === '5x5' ? 25 : 24;
  
  // نسخ المصفوفة وخلطها
  const shuffled = [...ARABIC_LETTERS].sort(() => Math.random() - 0.5);
  
  // استبعاد الحروف الأقل استخداماً إذا لزم الأمر
  const selected = shuffled
    .filter((item) => {
      // استبعاد الحروف النادرة جداً إذا كان العدد 24 أو أقل
      if (count <= 24 && item.frequency === 'very-low') {
        return Math.random() > 0.7; // فرصة 30% فقط
      }
      return true;
    })
    .slice(0, count)
    .map((item) => item.letter);

  // إذا كان العدد أقل من المطلوب، نضيف حروف إضافية
  while (selected.length < count) {
    const randomLetter = ARABIC_LETTERS[
      Math.floor(Math.random() * ARABIC_LETTERS.length)
    ].letter;
    if (!selected.includes(randomLetter)) {
      selected.push(randomLetter);
    }
  }

  return selected;
}

/**
 * إنشاء الشبكة السداسية بناءً على الحجم
 * @param gridSize - حجم الشبكة
 * @returns مصفوفة من الخلايا مع المواقع
 */
export function createHexGrid(gridSize: '5x5' | 'balanced') {
  const letters = selectLettersForGrid(gridSize);
  
  if (gridSize === '5x5') {
    // شبكة 5x5 = 25 خلية
    const grid = [];
    let index = 0;
    
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        grid.push({
          row,
          col,
          letter: letters[index],
          id: `cell-${row}-${col}`,
        });
        index++;
      }
    }
    
    return grid;
  } else {
    // شبكة متزنة (4-5-6-5-4) = 24 خلية
    const rowSizes = [4, 5, 6, 5, 4];
    const grid = [];
    let index = 0;
    
    for (let row = 0; row < 5; row++) {
      const rowSize = rowSizes[row];
      const offset = (6 - rowSize) / 2; // للتمركز
      
      for (let col = 0; col < rowSize; col++) {
        grid.push({
          row,
          col: col + offset,
          letter: letters[index],
          id: `cell-${row}-${col}`,
        });
        index++;
      }
    }
    
    return grid;
  }
}

/**
 * حساب موقع الخلية السداسية على الشاشة
 * @param row - رقم الصف
 * @param col - رقم العمود
 * @param size - حجم الخلية
 * @returns موقع x و y
 */
export function getHexPosition(row: number, col: number, size: number = 60) {
  const sqrt3 = Math.sqrt(3);
  
  const x = col * size * sqrt3 + (row % 2) * (size * sqrt3 / 2);
  const y = row * size * 1.5;
  
  return { x, y };
}

/**
 * رسم مسار السداسي (للـ SVG)
 * @param size - حجم الخلية
 * @returns مسار الـ SVG
 */
export function getHexPath(size: number = 60): string {
  const points = [];
  
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = size * Math.cos(angle);
    const y = size * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  
  return `M ${points.join(' L ')} Z`;
}
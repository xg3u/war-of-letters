// src/core/types.ts

// تأكد من وجود كلمة export قبل كل تعريف
export type Team = 'green' | 'red' | null;

export interface HexCell {
  id: string;
  q: number; 
  r: number; 
  letter: string;
  status: 'unanswered' | 'green' | 'red';
  isGolden: boolean;
  hasCard: boolean;
  frozenBy: Team;
  freezeCounter: number;
  hasShield: boolean;
}

export interface GameSettings {
  teamNames: { green: string; red: string };
  winCondition: 'wall-to-wall' | 'five-connected' | 'most-letters' | 'all';
  gridSize: number;
}



// src/core/types.ts - إضافة الأنواع الجديدة

// ========== أنواع الكاتيجوريز ==========

export interface Category {
  id: string;                    // معرّف فريد (مثلاً: "sports")
  name: string;                  // اسم الكاتيجوري (مثلاً: "رياضة")
  description: string;           // شرح الكاتيجوري (يظهر في الخلف)
  questionsCount: number;        // عدد الأسئلة (حطيته 0 عشان تعدّله لاحقاً)
  rating: number;                // التقييم من 5 (مثلاً: 4.5)
  icon: string;                  // إيموجي أو أيقونة
  color: string;                 // لون الكارد (hex color)
}

// ========== أنواع البطاقات (Action Cards) ==========

export interface ActionCard {
  id: string;                    // معرّف فريد (مثلاً: "freeze")
  name: string;                  // اسم البطاقة (مثلاً: "تجميد")
  description: string;           // شرح البطاقة (يظهر في الخلف)
  icon: string;                  // إيموجي أو أيقونة
  color: string;                 // لون الكارد
  rarity?: 'common' | 'rare' | 'epic' | 'legendary'; // (اختياري) ندرة البطاقة
}
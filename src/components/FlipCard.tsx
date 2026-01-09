// src/components/FlipCard.tsx
// كومبوننت الكارد القابل للانقلاب - يُستخدم للكاتيجوريز والبطاقات

import React, { useState } from 'react';

interface FlipCardProps {
  // الواجهة الأمامية
  frontContent: React.ReactNode;
  // الواجهة الخلفية
  backContent: React.ReactNode;
  // لون الكارد
  color: string;
  // (اختياري) ارتفاع الكارد
  height?: string;
}

export const FlipCard: React.FC<FlipCardProps> = ({
  frontContent,
  backContent,
  color,
  height = '200px',
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className="perspective-1000"
      style={{ height }}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div
        className={`transform-style-3d relative w-full h-full transition-transform duration-700 cursor-pointer ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.7s cubic-bezier(0.4, 0.0, 0.2, 1)',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* الواجهة الأمامية */}
        <div
          className="backface-hidden absolute inset-0 rounded-2xl p-6 flex flex-col items-center justify-center text-white font-bold shadow-xl"
          style={{
            backgroundColor: color,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            boxShadow: `0 10px 40px ${color}40`,
          }}
        >
          {frontContent}
        </div>

        {/* الواجهة الخلفية */}
        <div
          className="backface-hidden absolute inset-0 rounded-2xl p-6 flex flex-col justify-center text-white shadow-xl"
          style={{
            backgroundColor: color,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            boxShadow: `0 10px 40px ${color}40`,
          }}
        >
          {backContent}
        </div>
      </div>
    </div>
  );
};
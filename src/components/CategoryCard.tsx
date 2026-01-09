// src/components/CategoryCard.tsx
// كومبوننت كارد الكاتيجوري - بنسب ورق البلوت الحقيقية

import React, { useState } from 'react';
import type { Category } from '../core/types';

interface CategoryCardProps {
  category: Category;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className="perspective-card cursor-pointer"
      style={{
        perspective: '1000px',
        aspectRatio: '2.5 / 3.5', // نسبة ورق البلوت الحقيقية
      }}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div
        className="relative w-full h-full transition-transform duration-700 transform-style-3d"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        
        {/* الواجهة الأمامية */}
        <div
          className="absolute inset-0 rounded-2xl p-6 flex flex-col items-center justify-center text-white font-bold shadow-2xl backface-hidden border-4"
          style={{
            backgroundColor: category.color,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            boxShadow: `0 15px 50px ${category.color}60, 0 0 30px ${category.color}40`,
            borderColor: `${category.color}40`,
            background: `linear-gradient(135deg, ${category.color} 0%, ${category.color}dd 100%)`,
          }}
        >
          {/* نمط الكارد */}
          <div className="absolute top-4 right-4 text-4xl opacity-20">
            {category.icon}
          </div>
          <div className="absolute bottom-4 left-4 text-4xl opacity-20 transform rotate-180">
            {category.icon}
          </div>

          {/* المحتوى */}
          <div className="text-center z-10">
            <div className="text-7xl mb-4 drop-shadow-2xl animate-bounce-slow">
              {category.icon}
            </div>
            <h3 className="text-3xl font-black tracking-tight drop-shadow-lg">
              {category.name}
            </h3>
          </div>

          {/* تأثير اللمعان */}
          <div 
            className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-2xl opacity-50"
            style={{ mixBlendMode: 'overlay' }}
          />
        </div>

        {/* الواجهة الخلفية */}
        <div
          className="absolute inset-0 rounded-2xl p-5 flex flex-col justify-between text-white shadow-2xl backface-hidden border-4"
          style={{
            backgroundColor: category.color,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            boxShadow: `0 15px 50px ${category.color}60, 0 0 30px ${category.color}40`,
            borderColor: `${category.color}40`,
            background: `linear-gradient(135deg, ${category.color}ee 0%, ${category.color} 100%)`,
          }}
        >
          {/* العنوان */}
          <div className="text-right">
            <div className="flex items-center justify-between mb-3 border-b-2 border-white/30 pb-2">
              <span className="text-5xl">{category.icon}</span>
              <h3 className="text-2xl font-black">{category.name}</h3>
            </div>
            
            {/* الوصف */}
            <p className="text-sm leading-relaxed opacity-95 font-semibold">
              {category.description}
            </p>
          </div>

          {/* المعلومات السفلية */}
          <div className="space-y-3 bg-black/20 rounded-xl p-3 backdrop-blur-sm">
            {/* عدد الأسئلة */}
            <div className="flex items-center justify-between text-sm">
              <span className="opacity-90 font-bold">عدد الأسئلة:</span>
              <span className="font-black text-2xl bg-white/20 px-3 py-1 rounded-lg">
                {category.questionsCount}
              </span>
            </div>

            {/* التقييم */}
            <div className="flex items-center justify-between">
              <span className="text-sm opacity-90 font-bold">التقييم:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className="text-xl"
                    style={{
                      color: star <= category.rating ? '#fbbf24' : '#ffffff30',
                      filter: star <= category.rating ? 'drop-shadow(0 0 4px #fbbf24)' : 'none',
                    }}
                  >
                    ⭐
                  </span>
                ))}
                <span className="text-lg font-black mr-2 bg-white/20 px-2 py-0.5 rounded">
                  {category.rating}
                </span>
              </div>
            </div>
          </div>

          {/* تأثير اللمعان */}
          <div 
            className="absolute inset-0 bg-gradient-to-tl from-white/10 via-transparent to-transparent rounded-2xl pointer-events-none"
            style={{ mixBlendMode: 'overlay' }}
          />
        </div>
      </div>

      {/* CSS محلي */}
      <style>{`
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        .backface-hidden {
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
        }

        .transform-style-3d {
          transform-style: preserve-3d;
        }

        .perspective-card:hover .relative {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  );
};
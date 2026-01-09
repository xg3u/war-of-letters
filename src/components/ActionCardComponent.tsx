// src/components/ActionCardComponent.tsx
// كومبوننت كارد الأكشن - بنسب ورق البلوت الحقيقية

import React, { useState } from 'react';
import type { ActionCard } from '../core/types';

interface ActionCardComponentProps {
  card: ActionCard;
}

// ألوان حسب الندرة
const rarityConfig = {
  common: { 
    color: '#6b7280', 
    name: 'شائع',
    glow: '#6b728080',
  },
  rare: { 
    color: '#3b82f6', 
    name: 'نادر',
    glow: '#3b82f680',
  },
  epic: { 
    color: '#8b5cf6', 
    name: 'أسطوري',
    glow: '#8b5cf680',
  },
  legendary: { 
    color: '#f59e0b', 
    name: 'خرافي',
    glow: '#f59e0b80',
  },
};

export const ActionCardComponent: React.FC<ActionCardComponentProps> = ({ card }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const rarity = card.rarity ? rarityConfig[card.rarity] : null;

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
          className="absolute inset-0 rounded-2xl p-5 flex flex-col items-center justify-between text-white font-bold shadow-2xl backface-hidden border-4"
          style={{
            backgroundColor: card.color,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            boxShadow: `0 15px 50px ${card.color}60, 0 0 30px ${card.color}40`,
            borderColor: `${card.color}40`,
            background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}dd 100%)`,
          }}
        >
          {/* نمط الكارد */}
          <div className="absolute top-3 right-3 text-2xl opacity-15">
            {card.icon}
          </div>
          <div className="absolute bottom-3 left-3 text-2xl opacity-15 transform rotate-180">
            {card.icon}
          </div>

          {/* المحتوى الرئيسي */}
          <div className="flex-1 flex flex-col items-center justify-center z-10">
            <div className="text-6xl mb-3 drop-shadow-2xl animate-float-card">
              {card.icon}
            </div>
            <h3 className="text-xl font-black text-center leading-tight drop-shadow-lg px-2">
              {card.name}
            </h3>
          </div>

          {/* شريط الندرة */}
          {rarity && (
            <div
              className="w-full px-4 py-2 rounded-xl text-center font-black text-sm z-10"
              style={{
                backgroundColor: `${rarity.color}40`,
                border: `3px solid ${rarity.color}`,
                boxShadow: `0 0 20px ${rarity.glow}, inset 0 2px 10px rgba(255,255,255,0.2)`,
              }}
            >
              {rarity.name}
            </div>
          )}

          {/* تأثير اللمعان */}
          <div 
            className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-2xl opacity-50 pointer-events-none"
            style={{ mixBlendMode: 'overlay' }}
          />
        </div>

        {/* الواجهة الخلفية */}
        <div
          className="absolute inset-0 rounded-2xl p-4 flex flex-col justify-between text-white shadow-2xl backface-hidden border-4"
          style={{
            backgroundColor: card.color,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            boxShadow: `0 15px 50px ${card.color}60, 0 0 30px ${card.color}40`,
            borderColor: `${card.color}40`,
            background: `linear-gradient(135deg, ${card.color}ee 0%, ${card.color} 100%)`,
          }}
        >
          {/* العنوان */}
          <div className="text-right">
            <div className="flex items-center justify-between mb-2 border-b-2 border-white/30 pb-2">
              <span className="text-4xl">{card.icon}</span>
              <h3 className="text-lg font-black">{card.name}</h3>
            </div>
            
            {/* الوصف */}
            <p className="text-xs leading-relaxed opacity-95 font-semibold">
              {card.description}
            </p>
          </div>

          {/* الندرة */}
          {rarity && (
            <div
              className="px-4 py-2.5 rounded-xl text-center font-black text-sm"
              style={{
                backgroundColor: `${rarity.color}40`,
                border: `3px solid ${rarity.color}`,
                boxShadow: `0 0 20px ${rarity.glow}, inset 0 2px 10px rgba(255,255,255,0.2)`,
              }}
            >
              ✨ {rarity.name} ✨
            </div>
          )}

          {/* تأثير اللمعان */}
          <div 
            className="absolute inset-0 bg-gradient-to-tl from-white/10 via-transparent to-transparent rounded-2xl pointer-events-none"
            style={{ mixBlendMode: 'overlay' }}
          />
        </div>
      </div>

      {/* CSS محلي */}
      <style>{`
        @keyframes float-card {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-8px) scale(1.05);
          }
        }

        .animate-float-card {
          animation: float-card 2.5s ease-in-out infinite;
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
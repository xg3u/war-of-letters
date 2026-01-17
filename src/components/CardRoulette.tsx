// src/components/CardRoulette.tsx
// روليت البطاقات

import React, { useState, useEffect } from 'react';
import type { CardType } from '../core/types';

interface CardOption {
  id: CardType;
  name: string;
  icon: string;
  color: string;
  probability: number; // نسبة الظهور (0-1)
}

interface CardRouletteProps {
  onComplete: (card: CardType) => void;
}

const CARDS: CardOption[] = [
  { id: 'freeze', name: 'التجميد', icon: '🧊', color: '#60a5fa', probability: 0.15 },
  { id: 'bomb', name: 'القنبلة', icon: '💣', color: '#f87171', probability: 0.10 },
  { id: 'battle', name: 'المعركة', icon: '⚔️', color: '#fb923c', probability: 0.20 },
  { id: 'shield', name: 'الدرع', icon: '🛡️', color: '#34d399', probability: 0.15 },
  { id: 'demonShuffle', name: 'خلط الشيطان', icon: '👹', color: '#a855f7', probability: 0.05 },
  { id: 'speedUp', name: 'تسريع', icon: '⚡', color: '#facc15', probability: 0.20 },
  { id: 'luck', name: 'الحظ', icon: '🍀', color: '#f472b6', probability: 0.15 },
];

export const CardRoulette: React.FC<CardRouletteProps> = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(true);
  const [speed, setSpeed] = useState(50);
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);

  // اختيار البطاقة بناءً على الاحتمالات
  const selectCardByProbability = (): CardType => {
    const random = Math.random();
    let cumulative = 0;
    
    for (const card of CARDS) {
      cumulative += card.probability;
      if (random <= cumulative) {
        return card.id;
      }
    }
    
    return CARDS[0].id; // fallback
  };

  useEffect(() => {
    if (!isSpinning) return;

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % CARDS.length);
      
      // تقليل السرعة تدريجياً
      if (speed < 300) {
        setSpeed(prev => prev + 10);
      } else {
        // التوقف
        setIsSpinning(false);
        const winner = selectCardByProbability();
        const winnerIndex = CARDS.findIndex(c => c.id === winner);
        setCurrentIndex(winnerIndex);
        setSelectedCard(winner);
        
        // الانتهاء بعد 2 ثانية
        setTimeout(() => {
          onComplete(winner);
        }, 2000);
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [currentIndex, speed, isSpinning, onComplete]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.95)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2500,
      gap: '2rem',
    }}>
      
      {/* العنوان */}
      <h2 style={{
        fontSize: '3rem',
        fontWeight: 900,
        color: 'white',
        textShadow: '0 4px 10px rgba(0, 0, 0, 0.5)',
      }}>
        {isSpinning ? '🎰 جاري السحب...' : '🎉 مبروك!'}
      </h2>

      {/* الروليت */}
      <div style={{
        position: 'relative',
        width: '600px',
        height: '200px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '2rem',
        border: '4px solid rgba(168, 85, 247, 0.5)',
        overflow: 'hidden',
      }}>
        {/* المؤشر */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '180px',
          height: '180px',
          border: '6px solid #fbbf24',
          borderRadius: '1.5rem',
          background: 'rgba(251, 191, 36, 0.1)',
          zIndex: 10,
          boxShadow: '0 0 30px rgba(251, 191, 36, 0.5)',
        }} />

        {/* البطاقات المتحركة */}
        <div style={{
          display: 'flex',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(calc(-50% - ${currentIndex * 200}px), -50%)`,
          transition: isSpinning ? `transform ${speed}ms linear` : 'transform 0.5s ease-out',
          gap: '1rem',
        }}>
          {/* نكرر البطاقات 3 مرات عشان الحركة تكون سلسة */}
          {[...CARDS, ...CARDS, ...CARDS].map((card, idx) => {
            const isCenter = !isSpinning && idx % CARDS.length === currentIndex;
            
            return (
              <div
                key={idx}
                style={{
                  minWidth: '150px',
                  height: '150px',
                  background: `linear-gradient(135deg, ${card.color}, ${card.color}dd)`,
                  border: isCenter ? '4px solid #fbbf24' : '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '1rem',
                  transform: isCenter ? 'scale(1.1)' : 'scale(0.9)',
                  opacity: isCenter ? 1 : 0.5,
                  transition: 'all 0.3s ease',
                  boxShadow: isCenter 
                    ? `0 0 40px ${card.color}80`
                    : 'none',
                }}
              >
                <div style={{ fontSize: '4rem' }}>{card.icon}</div>
                <div style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'white',
                  textAlign: 'center',
                }}>
                  {card.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* الاحتمالات */}
      {!isSpinning && selectedCard && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '2px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '1rem',
          padding: '1.5rem',
          maxWidth: '500px',
        }}>
          <div style={{
            color: '#a855f7',
            fontSize: '0.875rem',
            fontWeight: 700,
            marginBottom: '0.75rem',
          }}>
            احتمالات البطاقات:
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.5rem',
            color: 'white',
            fontSize: '0.875rem',
          }}>
            {CARDS.map(card => (
              <div key={card.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.5rem',
                background: card.id === selectedCard 
                  ? 'rgba(251, 191, 36, 0.2)'
                  : 'rgba(255, 255, 255, 0.05)',
                borderRadius: '0.5rem',
              }}>
                <span>{card.icon} {card.name}</span>
                <span>{(card.probability * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
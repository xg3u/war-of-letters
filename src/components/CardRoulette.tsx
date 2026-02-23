// src/components/CardRoulette.tsx
// روليت البطاقات - تصميم جديد وبسيط مع دعم المزامنة

import React, { useState, useEffect, useCallback } from 'react';
import type { CardType } from '../core/types';
import { useScreenSize } from '../hooks/useScreenSize';

interface CardOption {
  id: CardType;
  name: string;
  icon: string;
  color: string;
  probability: number;
}

interface CardRouletteProps {
  onComplete: (card: CardType) => void;
  syncedCard?: CardType | null;
  isViewerMode?: boolean;
  triggerType?: 'card' | 'golden';
}

const CARDS: CardOption[] = [
  { id: 'freeze', name: 'التجميد', icon: '🧊', color: '#3b82f6', probability: 0.25 },
  { id: 'bomb', name: 'القنبلة', icon: '💣', color: '#ef4444', probability: 0.20 },
  { id: 'battle', name: 'المعركة', icon: '⚔️', color: '#f97316', probability: 0.30 },
  { id: 'shield', name: 'الدرع', icon: '🛡️', color: '#10b981', probability: 0.25 },
];

export const CardRoulette: React.FC<CardRouletteProps> = ({
  onComplete,
  syncedCard = null,
  isViewerMode = false,
  triggerType = 'card'
}) => {
  const { isMobile, isTablet } = useScreenSize();
  const isSmall = isMobile || isTablet;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(true);
  const [speed, setSpeed] = useState(60); // سريع
  const [finalCard, setFinalCard] = useState<CardType | null>(null);
  const [showResult, setShowResult] = useState(false);

  const selectCardByProbability = useCallback((): CardType => {
    if (syncedCard) return syncedCard;
    const random = Math.random();
    let cumulative = 0;
    for (const card of CARDS) {
      cumulative += card.probability;
      if (random <= cumulative) return card.id;
    }
    return CARDS[0].id;
  }, [syncedCard]);

  // دوران الروليت
  useEffect(() => {
    if (!isSpinning) return;

    // في وضع المشاهد، انتظر حتى يصل syncedCard
    if (isViewerMode && speed >= 300 && !syncedCard) {
      const timer = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % CARDS.length);
      }, 200);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % CARDS.length);

      if (speed < 300) {
        setSpeed(prev => prev + 25); // سريع
      } else {
        // توقف الدوران
        setIsSpinning(false);
        const winner = selectCardByProbability();
        const winnerIndex = CARDS.findIndex(c => c.id === winner);
        setCurrentIndex(winnerIndex);
        setFinalCard(winner);

        // إظهار النتيجة - عرضها لفترة أطول حتى يقرأها الجميع
        setTimeout(() => {
          setShowResult(true);
          setTimeout(() => onComplete(winner), 1800); // أطول من الأصل (كان 1000ms)
        }, 300);
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [currentIndex, speed, isSpinning, onComplete, selectCardByProbability, isViewerMode, syncedCard]);

  // في وضع المشاهد: عندما يصل syncedCard
  useEffect(() => {
    if (isViewerMode && syncedCard && isSpinning) {
      setIsSpinning(false);
      const winnerIndex = CARDS.findIndex(c => c.id === syncedCard);
      setCurrentIndex(winnerIndex);
      setFinalCard(syncedCard);

      setTimeout(() => {
        setShowResult(true);
        setTimeout(() => onComplete(syncedCard), 1000);
      }, 200);
    }
  }, [isViewerMode, syncedCard, isSpinning, onComplete]);

  const currentCard = CARDS[currentIndex];
  const displayCard = finalCard ? CARDS.find(c => c.id === finalCard)! : currentCard;
  const triggerIcon = triggerType === 'golden' ? '✨' : '🎁';
  const triggerText = triggerType === 'golden' ? 'الحرف الذهبي!' : 'بطاقة مخفية!';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(135deg, #1a0533 0%, #2d1b4e 50%, #1a0533 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2500,
      overflow: 'hidden',
    }}>
      {/* خلفية متحركة */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(circle at 20% 80%, rgba(168, 85, 247, 0.3) 0%, transparent 40%),
          radial-gradient(circle at 80% 20%, rgba(236, 72, 153, 0.3) 0%, transparent 40%),
          radial-gradient(circle at 50% 50%, rgba(251, 191, 36, 0.15) 0%, transparent 50%)
        `,
        animation: 'pulse 3s ease-in-out infinite',
      }} />

      {/* الكونفيتي عند النتيجة */}
      {showResult && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {[...Array(18)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: '-10px',
              width: `${Math.random() * 8 + 4}px`,
              height: `${Math.random() * 8 + 4}px`,
              background: ['#fbbf24', '#ec4899', '#8b5cf6', '#10b981', '#3b82f6', '#ef4444'][Math.floor(Math.random() * 6)],
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              animation: `fall ${Math.random() * 2 + 2}s linear forwards`,
              animationDelay: `${Math.random() * 0.5}s`,
              willChange: 'transform',
            }} />
          ))}
        </div>
      )}

      {/* العنوان */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        textAlign: 'center',
        marginBottom: isSmall ? '1.5rem' : '3rem',
      }}>
        <div style={{
          fontSize: isSmall ? '2.5rem' : '4rem',
          marginBottom: isSmall ? '0.5rem' : '1rem',
          animation: isSpinning ? 'bounce 0.6s ease-in-out infinite' : 'none',
        }}>
          {showResult ? '🎉' : triggerIcon}
        </div>
        <h2 style={{
          fontSize: isSmall ? '1.5rem' : '2.5rem',
          fontWeight: 900,
          color: '#fbbf24',
          textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          margin: 0,
        }}>
          {showResult ? 'مبروك!' : triggerText}
        </h2>
      </div>

      {/* البطاقة الرئيسية */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        perspective: '1000px',
      }}>
        <div style={{
          width: isSmall ? '150px' : '220px',
          height: isSmall ? '190px' : '280px',
          borderRadius: '1.5rem',
          background: showResult
            ? `linear-gradient(145deg, ${displayCard.color}, ${displayCard.color}dd)`
            : `linear-gradient(145deg, ${currentCard.color}80, ${currentCard.color}40)`,
          border: `4px solid ${showResult ? displayCard.color : 'rgba(255,255,255,0.3)'}`,
          boxShadow: showResult
            ? `0 0 30px ${displayCard.color}60, 0 12px 30px rgba(0,0,0,0.3)`
            : '0 8px 20px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          transition: 'all 0.3s ease',
          transform: showResult ? 'scale(1.1)' : isSpinning ? 'scale(0.95)' : 'scale(1)',
          animation: isSpinning ? 'cardSpin 0.15s ease-in-out infinite' : showResult ? 'cardReveal 0.5s ease-out' : 'none',
        }}>
          {/* الأيقونة */}
          <div style={{
            fontSize: isSmall ? '3rem' : '5rem',
            filter: 'none',
            animation: showResult ? 'iconBounce 0.6s ease-out' : 'none',
          }}>
            {showResult ? displayCard.icon : currentCard.icon}
          </div>

          {/* اسم البطاقة */}
          <div style={{
            fontSize: isSmall ? '1rem' : '1.5rem',
            fontWeight: 900,
            color: 'white',
            textShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }}>
            {showResult ? displayCard.name : currentCard.name}
          </div>
        </div>

        {/* مؤشرات الاختيار */}
        {!showResult && (
          <>
            <div style={{
              position: 'absolute',
              top: '-20px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '15px solid transparent',
              borderRight: '15px solid transparent',
              borderTop: '20px solid #fbbf24',
              animation: 'arrowPulse 0.5s ease-in-out infinite',
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-20px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '15px solid transparent',
              borderRight: '15px solid transparent',
              borderBottom: '20px solid #fbbf24',
              animation: 'arrowPulse 0.5s ease-in-out infinite',
            }} />
          </>
        )}
      </div>

      {/* شريط البطاقات الصغير */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        marginTop: isSmall ? '1.25rem' : '2.5rem',
        display: 'flex',
        gap: isSmall ? '0.4rem' : '0.75rem',
        padding: isSmall ? '0.5rem 0.75rem' : '1rem 1.5rem',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '1rem',
        backdropFilter: 'blur(6px)',
      }}>
        {CARDS.map((card, idx) => {
          const isActive = showResult
            ? card.id === finalCard
            : idx === currentIndex;
          return (
            <div key={card.id} style={{
              width: isSmall ? '36px' : '50px',
              height: isSmall ? '42px' : '60px',
              borderRadius: '0.5rem',
              background: isActive
                ? `linear-gradient(135deg, ${card.color}, ${card.color}cc)`
                : 'rgba(255,255,255,0.1)',
              border: isActive ? `2px solid ${card.color}` : '2px solid rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isSmall ? '1rem' : '1.5rem',
              transition: 'all 0.2s ease',
              transform: isActive ? 'scale(1.15)' : 'scale(1)',
              boxShadow: isActive ? `0 0 12px ${card.color}60` : 'none',
            }}>
              {card.icon}
            </div>
          );
        })}
      </div>

      {/* رسالة النتيجة */}
      {showResult && (
        <div style={{
          position: 'relative',
          zIndex: 10,
          marginTop: isSmall ? '1rem' : '2rem',
          padding: isSmall ? '0.6rem 1.25rem' : '1rem 2.5rem',
          background: `linear-gradient(135deg, ${displayCard.color}30, ${displayCard.color}10)`,
          border: `2px solid ${displayCard.color}50`,
          borderRadius: '1rem',
          animation: 'fadeUp 0.4s ease-out',
        }}>
          <div style={{
            color: 'white',
            fontSize: isSmall ? '0.95rem' : '1.25rem',
            fontWeight: 800,
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            gap: isSmall ? '0.4rem' : '0.75rem',
          }}>
            <span style={{ fontSize: isSmall ? '1.25rem' : '1.75rem' }}>{displayCard.icon}</span>
            <span>بطاقة {displayCard.name}</span>
          </div>
          {!isViewerMode && (
            <div style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '0.9rem',
              textAlign: 'center',
              marginTop: '0.5rem',
            }}>
              أجب بشكل صحيح لتفوز بها! 🎯
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes bounce {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -10px, 0); }
        }
        @keyframes cardSpin {
          0% { transform: scale(0.95); }
          50% { transform: scale(0.98); }
          100% { transform: scale(0.95); }
        }
        @keyframes cardReveal {
          0% { transform: scale(0.8); opacity: 0; }
          60% { transform: scale(1.15); }
          100% { transform: scale(1.1); opacity: 1; }
        }
        @keyframes iconBounce {
          0% { transform: scale(0); }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes arrowPulse {
          0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
          50% { opacity: 0.6; transform: translateX(-50%) scale(0.9); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translate3d(0, 15px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        @keyframes fall {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate3d(0, 100vh, 0) rotate(540deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

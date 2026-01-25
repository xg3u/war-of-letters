// src/components/CardRoulette.tsx
// روليت البطاقات - تصميم جديد وبسيط مع دعم المزامنة

import React, { useState, useEffect, useCallback } from 'react';
import type { CardType } from '../core/types';

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(true);
  const [speed, setSpeed] = useState(80);
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
        setSpeed(prev => prev + 15);
      } else {
        // توقف الدوران
        setIsSpinning(false);
        const winner = selectCardByProbability();
        const winnerIndex = CARDS.findIndex(c => c.id === winner);
        setCurrentIndex(winnerIndex);
        setFinalCard(winner);

        // إظهار النتيجة بعد تأخير قصير
        setTimeout(() => {
          setShowResult(true);
          setTimeout(() => onComplete(winner), 2000);
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
        setTimeout(() => onComplete(syncedCard), 2000);
      }, 300);
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
          {[...Array(50)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: '-10px',
              width: `${Math.random() * 10 + 5}px`,
              height: `${Math.random() * 10 + 5}px`,
              background: ['#fbbf24', '#ec4899', '#8b5cf6', '#10b981', '#3b82f6', '#ef4444'][Math.floor(Math.random() * 6)],
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              animation: `fall ${Math.random() * 2 + 2}s linear forwards`,
              animationDelay: `${Math.random() * 0.8}s`,
            }} />
          ))}
        </div>
      )}

      {/* العنوان */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        textAlign: 'center',
        marginBottom: '3rem',
      }}>
        <div style={{
          fontSize: '4rem',
          marginBottom: '1rem',
          animation: isSpinning ? 'bounce 0.6s ease-in-out infinite' : 'none',
          filter: 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.6))',
        }}>
          {showResult ? '🎉' : triggerIcon}
        </div>
        <h2 style={{
          fontSize: '2.5rem',
          fontWeight: 900,
          color: '#fbbf24',
          textShadow: '0 0 30px rgba(251, 191, 36, 0.5)',
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
          width: '220px',
          height: '280px',
          borderRadius: '1.5rem',
          background: showResult
            ? `linear-gradient(145deg, ${displayCard.color}, ${displayCard.color}dd)`
            : `linear-gradient(145deg, ${currentCard.color}80, ${currentCard.color}40)`,
          border: `4px solid ${showResult ? displayCard.color : 'rgba(255,255,255,0.3)'}`,
          boxShadow: showResult
            ? `0 0 60px ${displayCard.color}80, 0 20px 40px rgba(0,0,0,0.4), inset 0 0 30px rgba(255,255,255,0.2)`
            : '0 10px 30px rgba(0,0,0,0.3)',
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
            fontSize: '5rem',
            filter: showResult ? 'drop-shadow(0 0 20px white)' : 'none',
            animation: showResult ? 'iconBounce 0.6s ease-out' : 'none',
          }}>
            {showResult ? displayCard.icon : currentCard.icon}
          </div>

          {/* اسم البطاقة */}
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 900,
            color: 'white',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
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
              filter: 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.8))',
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
              filter: 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.8))',
              animation: 'arrowPulse 0.5s ease-in-out infinite',
            }} />
          </>
        )}
      </div>

      {/* شريط البطاقات الصغير */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        marginTop: '2.5rem',
        display: 'flex',
        gap: '0.75rem',
        padding: '1rem 1.5rem',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '1rem',
        backdropFilter: 'blur(10px)',
      }}>
        {CARDS.map((card, idx) => {
          const isActive = showResult
            ? card.id === finalCard
            : idx === currentIndex;
          return (
            <div key={card.id} style={{
              width: '50px',
              height: '60px',
              borderRadius: '0.5rem',
              background: isActive
                ? `linear-gradient(135deg, ${card.color}, ${card.color}cc)`
                : 'rgba(255,255,255,0.1)',
              border: isActive ? `2px solid ${card.color}` : '2px solid rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              transition: 'all 0.2s ease',
              transform: isActive ? 'scale(1.15)' : 'scale(1)',
              boxShadow: isActive ? `0 0 20px ${card.color}80` : 'none',
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
          marginTop: '2rem',
          padding: '1rem 2.5rem',
          background: `linear-gradient(135deg, ${displayCard.color}30, ${displayCard.color}10)`,
          border: `2px solid ${displayCard.color}50`,
          borderRadius: '1rem',
          animation: 'fadeUp 0.4s ease-out',
        }}>
          <div style={{
            color: 'white',
            fontSize: '1.25rem',
            fontWeight: 800,
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            <span style={{ fontSize: '1.75rem' }}>{displayCard.icon}</span>
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
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes cardSpin {
          0% { transform: scale(0.95) rotateY(0deg); }
          50% { transform: scale(0.98) rotateY(5deg); }
          100% { transform: scale(0.95) rotateY(0deg); }
        }
        @keyframes cardReveal {
          0% { transform: scale(0.8) rotateY(180deg); opacity: 0; }
          50% { transform: scale(1.2) rotateY(90deg); }
          100% { transform: scale(1.1) rotateY(0deg); opacity: 1; }
        }
        @keyframes iconBounce {
          0% { transform: scale(0); }
          50% { transform: scale(1.3); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        @keyframes arrowPulse {
          0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
          50% { opacity: 0.7; transform: translateX(-50%) scale(0.9); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

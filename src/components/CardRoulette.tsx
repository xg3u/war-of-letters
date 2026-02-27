// src/components/CardRoulette.tsx
// روليت البطاقات — animation loop مستقلة عن re-renders الـ parent

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  preselectedCard?: CardType | null;
}

const CARDS: CardOption[] = [
  { id: 'freeze', name: 'التجميد', icon: '🧊', color: '#3b82f6', probability: 0.25 },
  { id: 'bomb',   name: 'القنبلة', icon: '💣', color: '#ef4444', probability: 0.20 },
  { id: 'battle', name: 'المعركة', icon: '⚔️', color: '#f97316', probability: 0.30 },
  { id: 'shield', name: 'الدرع',   icon: '🛡️', color: '#10b981', probability: 0.25 },
];

// كونفيتي بمواضع ثابتة — خارج المكوّن لتجنب الحسابات في كل render
const CONFETTI = Array.from({ length: 18 }, (_, i) => ({
  left:  (i * 5.5 + 2) % 100,
  size:  4 + (i % 9),
  color: ['#fbbf24', '#ec4899', '#8b5cf6', '#10b981', '#3b82f6', '#ef4444'][i % 6],
  round: i % 2 === 0,
  dur:   2 + (i % 3) * 0.5,
  delay: (i * 0.06) % 0.5,
}));

const pickByProbability = (): CardType => {
  const r = Math.random();
  let cum = 0;
  for (const c of CARDS) { cum += c.probability; if (r <= cum) return c.id; }
  return CARDS[0].id;
};

export const CardRoulette: React.FC<CardRouletteProps> = ({
  onComplete,
  syncedCard = null,
  isViewerMode = false,
  triggerType = 'card',
  preselectedCard = null,
}) => {
  const { isMobile, isTablet } = useScreenSize();
  const isSmall = isMobile || isTablet;

  // ─── State مرئي فقط (ضروري للرسم) ───────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(0);
  const [finalCard,    setFinalCard]    = useState<CardType | null>(null);
  const [showResult,   setShowResult]   = useState(false);

  // ─── كل منطق الـ animation في refs — لا تُسبب re-renders ────────────────
  const onCompleteRef      = useRef(onComplete);
  const syncedCardRef      = useRef(syncedCard);
  const isViewerRef        = useRef(isViewerMode);
  const preselectedCardRef = useRef(preselectedCard);
  const speedRef       = useRef(60);      // ms بين الإطارات (يبدأ سريع ثم يتباطأ)
  const isSpinningRef  = useRef(true);
  const timerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolvedRef    = useRef(false);   // منع استدعاء onComplete مرتين

  // تحديث الـ refs عند تغير الـ props (بدون إعادة تشغيل الحلقة)
  useEffect(() => { onCompleteRef.current      = onComplete;      });
  useEffect(() => { syncedCardRef.current      = syncedCard;      });
  useEffect(() => { isViewerRef.current        = isViewerMode;    });
  useEffect(() => { preselectedCardRef.current = preselectedCard; });

  // ─── إيقاف الروليت على بطاقة محددة ──────────────────────────────────────
  const settle = useCallback((winner: CardType) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    isSpinningRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);

    const idx = CARDS.findIndex(c => c.id === winner);
    setCurrentIndex(idx);
    setFinalCard(winner);

    setTimeout(() => {
      setShowResult(true);
      // المشاهد يتبع المقدم — delay أقل لأن التزامن يكفي
      const delay = isViewerRef.current ? 900 : 1800;
      setTimeout(() => onCompleteRef.current(winner), delay);
    }, 300);
  }, []);

  // ─── حلقة الـ animation — تعمل مرة واحدة عند mount ─────────────────────
  const tick = useCallback(() => {
    if (!isSpinningRef.current) return;

    // في وضع المشاهد: إذا وصل syncedCard → أوقف فوراً
    if (isViewerRef.current && syncedCardRef.current) {
      settle(syncedCardRef.current);
      return;
    }

    setCurrentIndex(prev => (prev + 1) % CARDS.length);

    if (speedRef.current < 320) {
      speedRef.current += 18;
      timerRef.current = setTimeout(tick, speedRef.current);
    } else {
      // وصلنا للسرعة البطيئة
      if (isViewerRef.current) {
        // انتظر syncedCard
        if (syncedCardRef.current) {
          settle(syncedCardRef.current);
        } else {
          timerRef.current = setTimeout(tick, 180);
        }
      } else {
        // المقدم: استخدم البطاقة المحسوبة مسبقاً أو اختر عشوائياً كاحتياط
        settle(preselectedCardRef.current ?? pickByProbability());
      }
    }
  }, [settle]);

  // ─── بدء الحلقة عند mount ────────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setTimeout(tick, speedRef.current);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [tick]);

  // ─── وضع المشاهد: syncedCard يصل بعد أن تباطأت الحلقة ───────────────────
  useEffect(() => {
    if (isViewerMode && syncedCard && isSpinningRef.current && !resolvedRef.current) {
      settle(syncedCard);
    }
  }, [syncedCard, isViewerMode, settle]);

  // ─── الـ UI ───────────────────────────────────────────────────────────────
  const displayCard = finalCard
    ? CARDS.find(c => c.id === finalCard)!
    : CARDS[currentIndex];

  const triggerIcon = triggerType === 'golden' ? '✨' : '🎁';
  const triggerText = triggerType === 'golden' ? 'حرفك الذهبي! ✨' : 'بطاقة مخفية! 🎁';
  const isSpinning  = !finalCard;

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(135deg,#1a0533 0%,#2d1b4e 50%,#1a0533 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 2500, overflow: 'hidden',
    }}>

      {/* خلفية متوهجة ثابتة */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(circle at 20% 80%, rgba(168,85,247,0.3) 0%, transparent 40%),
          radial-gradient(circle at 80% 20%, rgba(236,72,153,0.3) 0%, transparent 40%),
          radial-gradient(circle at 50% 50%, rgba(251,191,36,0.15) 0%, transparent 50%)
        `,
        animation: 'rqPulse 3s ease-in-out infinite',
      }} />

      {/* كونفيتي */}
      {showResult && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {CONFETTI.map((c, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${c.left}%`, top: '-10px',
              width: `${c.size}px`, height: `${c.size}px`,
              background: c.color,
              borderRadius: c.round ? '50%' : '2px',
              animation: `rqFall ${c.dur}s linear forwards`,
              animationDelay: `${c.delay}s`,
              willChange: 'transform',
            }} />
          ))}
        </div>
      )}

      {/* العنوان */}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', marginBottom: isSmall ? '1.5rem' : '3rem' }}>
        <div style={{
          fontSize: isSmall ? '2.5rem' : '4rem',
          marginBottom: isSmall ? '0.5rem' : '1rem',
          animation: isSpinning ? 'rqBounce 0.6s ease-in-out infinite' : 'none',
        }}>
          {showResult ? '🎉' : triggerIcon}
        </div>
        <h2 style={{
          fontSize: isSmall ? '1.5rem' : '2.5rem',
          fontWeight: 900, color: '#fbbf24', margin: 0,
          textShadow: '0 2px 8px rgba(0,0,0,0.3)',
          fontFamily: "'Lalezar', sans-serif",
        }}>
          {showResult ? 'مبروووك! 🎊' : triggerText}
        </h2>
      </div>

      {/* البطاقة الرئيسية */}
      <div style={{ position: 'relative', zIndex: 10, perspective: '1000px' }}>
        <div style={{
          width:  isSmall ? '150px' : '220px',
          height: isSmall ? '190px' : '280px',
          borderRadius: '1.5rem',
          background: showResult
            ? `linear-gradient(145deg,${displayCard.color},${displayCard.color}dd)`
            : `linear-gradient(145deg,${displayCard.color}80,${displayCard.color}40)`,
          border: `4px solid ${showResult ? displayCard.color : 'rgba(255,255,255,0.3)'}`,
          boxShadow: showResult
            ? `0 0 30px ${displayCard.color}60, 0 12px 30px rgba(0,0,0,0.3)`
            : '0 8px 20px rgba(0,0,0,0.25)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '1rem',
          transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
          animation: isSpinning
            ? 'rqCardSpin 0.3s ease-in-out infinite'
            : showResult ? 'rqCardReveal 0.5s ease-out forwards' : 'none',
        }}>
          <div style={{
            fontSize: isSmall ? '3rem' : '5rem',
            animation: showResult ? 'rqIconBounce 0.6s ease-out' : 'none',
          }}>
            {displayCard.icon}
          </div>
          <div style={{ fontSize: isSmall ? '1rem' : '1.5rem', fontWeight: 900, color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
            {displayCard.name}
          </div>
        </div>

        {/* مؤشرات الاختيار */}
        {isSpinning && (
          <>
            <div style={{ position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '15px solid transparent', borderRight: '15px solid transparent', borderTop: '20px solid #fbbf24', animation: 'rqArrow 0.5s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', bottom: '-20px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '15px solid transparent', borderRight: '15px solid transparent', borderBottom: '20px solid #fbbf24', animation: 'rqArrow 0.5s ease-in-out infinite' }} />
          </>
        )}
      </div>

      {/* شريط البطاقات */}
      <div style={{
        position: 'relative', zIndex: 10,
        marginTop: isSmall ? '1.25rem' : '2.5rem',
        display: 'flex', gap: isSmall ? '0.4rem' : '0.75rem',
        padding: isSmall ? '0.5rem 0.75rem' : '1rem 1.5rem',
        background: 'rgba(0,0,0,0.3)', borderRadius: '1rem',
        backdropFilter: 'blur(6px)',
      }}>
        {CARDS.map((card, idx) => {
          const isActive = showResult ? card.id === finalCard : idx === currentIndex;
          return (
            <div key={card.id} style={{
              width:  isSmall ? '36px' : '50px',
              height: isSmall ? '42px' : '60px',
              borderRadius: '0.5rem',
              background: isActive
                ? `linear-gradient(135deg,${card.color},${card.color}cc)`
                : 'rgba(255,255,255,0.1)',
              border: `2px solid ${isActive ? card.color : 'rgba(255,255,255,0.2)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: isSmall ? '1rem' : '1.5rem',
              transition: 'all 0.15s ease',
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
          position: 'relative', zIndex: 10,
          marginTop: isSmall ? '1rem' : '2rem',
          padding: isSmall ? '0.6rem 1.25rem' : '1rem 2.5rem',
          background: `linear-gradient(135deg,${displayCard.color}30,${displayCard.color}10)`,
          border: `2px solid ${displayCard.color}50`,
          borderRadius: '1rem',
          animation: 'rqFadeUp 0.4s ease-out',
        }}>
          <div style={{ color: 'white', fontSize: isSmall ? '0.95rem' : '1.25rem', fontWeight: 800, textAlign: 'center', display: 'flex', alignItems: 'center', gap: isSmall ? '0.4rem' : '0.75rem', fontFamily: "'Lalezar', sans-serif" }}>
            <span style={{ fontSize: isSmall ? '1.25rem' : '1.75rem' }}>{displayCard.icon}</span>
            <span>اكتسبت بطاقة {displayCard.name}!</span>
          </div>
          {!isViewerMode && (
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', textAlign: 'center', marginTop: '0.5rem', fontFamily: "'Lalezar', sans-serif" }}>
              جاوب صح وتاخذها! 🎯
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes rqPulse      { 0%,100% { opacity:1; } 50% { opacity:0.7; } }
        @keyframes rqBounce     { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
        @keyframes rqCardSpin   { 0%,100% { transform:scale(0.96); } 50% { transform:scale(0.99); } }
        @keyframes rqCardReveal { 0% { transform:scale(0.8); opacity:0; } 60% { transform:scale(1.15); } 100% { transform:scale(1.1); opacity:1; } }
        @keyframes rqIconBounce { 0% { transform:scale(0); } 60% { transform:scale(1.2); } 100% { transform:scale(1); } }
        @keyframes rqArrow      { 0%,100% { opacity:1; transform:translateX(-50%) scale(1); } 50% { opacity:0.6; transform:translateX(-50%) scale(0.9); } }
        @keyframes rqFadeUp     { from { opacity:0; transform:translateY(15px); } to { opacity:1; transform:translateY(0); } }
        @keyframes rqFall       { 0% { transform:translateY(0) rotate(0deg); opacity:1; } 100% { transform:translateY(100vh) rotate(540deg); opacity:0; } }
      `}</style>
    </div>,
    document.body,
  );
};

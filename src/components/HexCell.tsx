// src/components/HexCell.tsx
// الخلية السداسية - تصميم عصري مع تأثيرات بصرية

import React, { useState, useEffect } from 'react';
import type { HexCell as HexCellType } from '../core/types';

interface HexCellProps {
  cell: HexCellType;
  onClick?: () => void;
  isDecorative?: boolean;
  isSelected?: boolean;
  scale?: number;
  showCardIndicator?: boolean;
}

// React.memo: يمنع إعادة الرندر إلا إذا تغيرت props الخلية فعلاً
// بدونه: كل broadcast يُعيد رندر 74 خلية حتى لو لم تتغير
const HexCellInner: React.FC<HexCellProps> = ({
  cell,
  onClick,
  isDecorative = false,
  isSelected = false,
  scale = 1,
  showCardIndicator = true
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showFreezeAnimation, setShowFreezeAnimation] = useState(false);

  // تشغيل أنيميشن التجميد عند تغير حالة التجميد
  useEffect(() => {
    if (cell.isFrozen) {
      setShowFreezeAnimation(true);
      const timer = setTimeout(() => setShowFreezeAnimation(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [cell.isFrozen]);

  // الألوان والتدرجات الحديثة
  const getBackground = () => {
    // مدمر
    if (cell.status === 'destroyed') {
      return 'linear-gradient(135deg, #1f1f1f 0%, #0a0a0a 100%)';
    }

    // مجمد
    if (cell.isFrozen) {
      return 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 50%, #0284c7 100%)';
    }

    // محدد
    if (isSelected) {
      return 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)';
    }

    // زينة
    if (isDecorative) {
      if (cell.status === 'red') {
        return 'linear-gradient(135deg, #f87171 0%, #ef4444 50%, #dc2626 100%)';
      }
      return 'linear-gradient(135deg, #4ade80 0%, #22c55e 50%, #16a34a 100%)';
    }

    // ذهبي
    if (cell.isGolden && cell.status === 'unanswered') {
      return 'linear-gradient(135deg, #fde047 0%, #facc15 30%, #eab308 60%, #ca8a04 100%)';
    }

    // أخضر
    if (cell.status === 'green') {
      return 'linear-gradient(135deg, #4ade80 0%, #22c55e 50%, #16a34a 100%)';
    }

    // أحمر
    if (cell.status === 'red') {
      return 'linear-gradient(135deg, #f87171 0%, #ef4444 50%, #dc2626 100%)';
    }

    // غير مجاب - تصميم زجاجي عصري
    return 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 50%, rgba(241,245,249,0.85) 100%)';
  };

  // الظل المتوهج - مبسط للأداء
  const getBoxShadow = () => {
    if (cell.status === 'destroyed') {
      return 'inset 0 0 15px rgba(0,0,0,0.7), 0 2px 6px rgba(0,0,0,0.4)';
    }

    if (cell.isFrozen) {
      return '0 0 15px rgba(56, 189, 248, 0.5), 0 4px 12px rgba(0, 0, 0, 0.2)';
    }

    if (cell.isShielded) {
      return '0 0 15px rgba(16, 185, 129, 0.4), 0 4px 12px rgba(0, 0, 0, 0.2)';
    }

    if (isSelected) {
      return '0 0 20px rgba(251, 191, 36, 0.6), 0 6px 20px rgba(0, 0, 0, 0.25)';
    }

    if (cell.isGolden && cell.status === 'unanswered') {
      return '0 0 15px rgba(250, 204, 21, 0.4), 0 4px 12px rgba(0, 0, 0, 0.15)';
    }

    if (cell.status === 'green') {
      return '0 0 10px rgba(34, 197, 94, 0.3), 0 3px 10px rgba(0, 0, 0, 0.12)';
    }

    if (cell.status === 'red') {
      return '0 0 10px rgba(239, 68, 68, 0.3), 0 3px 10px rgba(0, 0, 0, 0.12)';
    }

    if (isHovered) {
      return '0 6px 18px rgba(0, 0, 0, 0.15)';
    }

    return '0 3px 8px rgba(0, 0, 0, 0.08)';
  };

  // الحدود
  const getBorder = () => {
    if (cell.status === 'destroyed') {
      return '2px solid #333';
    }

    if (cell.isFrozen) {
      return '3px solid rgba(186, 230, 253, 0.8)';
    }

    if (cell.isShielded) {
      return '3px solid rgba(16, 185, 129, 0.8)';
    }

    if (isSelected) {
      return '3px solid rgba(255, 255, 255, 0.9)';
    }

    if (cell.status === 'green' || cell.status === 'red') {
      return '2px solid rgba(255, 255, 255, 0.4)';
    }

    return '2px solid rgba(203, 213, 225, 0.6)';
  };

  const isCollected = cell.status !== 'unanswered' && cell.status !== 'destroyed';
  const isClickable = onClick && !isCollected && !isDecorative && !cell.isFrozen && cell.status !== 'destroyed';

  const hexStyle: React.CSSProperties = {
    width: `${80 * scale}px`,
    height: `${92 * scale}px`,
    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: `${30 * scale}px`,
    fontFamily: "'Tajawal', sans-serif",
    fontWeight: 900,
    cursor: isClickable ? 'pointer' : 'not-allowed',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease, opacity 0.3s ease',
    position: 'relative',
    background: getBackground(),
    boxShadow: getBoxShadow(),
    border: getBorder(),
    color: (isCollected || isDecorative || cell.isFrozen) ? 'white' : '#1e293b',
    opacity: cell.status === 'destroyed' ? 0.5 : 1,
    transform: isSelected
      ? 'scale(1.15) translate3d(0, -5px, 0)'
      : isHovered && isClickable
        ? 'scale(1.08) translate3d(0, -3px, 0)'
        : 'scale(1) translate3d(0, 0, 0)',
    zIndex: isSelected ? 10 : isHovered ? 5 : 1,
    userSelect: 'none',
    overflow: 'hidden',
    willChange: 'transform',
  };

  return (
    <div
      style={hexStyle}
      onClick={isClickable ? onClick : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* طبقة اللمعان الزجاجي */}
      {!isDecorative && cell.status === 'unanswered' && !cell.isFrozen && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '40%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />
      )}

      {/* تأثير التجميد - طبقة الجليد */}
      {cell.isFrozen && (
        <>
          {/* طبقة الجليد المتوهجة */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 60%)',
            pointerEvents: 'none',
          }} />

          {/* خطوط الجليد */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: `
              linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%),
              linear-gradient(-45deg, transparent 40%, rgba(255,255,255,0.2) 50%, transparent 60%)
            `,
            pointerEvents: 'none',
          }} />
        </>
      )}

      {/* تأثير الدرع */}
      {cell.isShielded && (
        <div style={{
          position: 'absolute',
          inset: '-4px',
          borderRadius: '50%',
          border: '3px solid rgba(16, 185, 129, 0.6)',
          animation: 'shieldPulse 2s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* تأثير المدمر */}
      {cell.status === 'destroyed' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: `${40 * scale}px`,
          opacity: 0.6,
        }}>
          💥
        </div>
      )}

      {/* الحرف */}
      {!isDecorative && cell.status !== 'destroyed' && (
        <span style={{
          position: 'relative',
          zIndex: 2,
          textShadow: cell.isFrozen
            ? '0 1px 3px rgba(0,0,0,0.3)'
            : cell.isGolden && cell.status === 'unanswered'
              ? '0 0 8px rgba(255,255,255,0.7)'
              : (cell.status === 'green' || cell.status === 'red')
                ? '0 1px 3px rgba(0,0,0,0.3)'
                : 'none',
          color: cell.isFrozen
            ? '#fff'
            : (cell.isGolden && cell.status === 'unanswered')
              ? '#fff'
              : undefined,
        }}>
          {cell.letter}
        </span>
      )}

      {/* أيقونة البطاقة المخفية */}
      {!isDecorative && cell.hasCard && !isCollected && showCardIndicator && !cell.isFrozen && (
        <div style={{
          position: 'absolute',
          top: `${5 * scale}px`,
          right: `${8 * scale}px`,
          fontSize: `${14 * scale}px`,
          animation: 'cardBounce 2s ease-in-out infinite',
        }}>
          🎁
        </div>
      )}

      {/* شعاع الحرف الذهبي */}
      {!isDecorative && cell.isGolden && cell.status === 'unanswered' && !cell.isFrozen && (
        <>
          <div style={{
            position: 'absolute',
            top: `${3 * scale}px`,
            right: `${6 * scale}px`,
            fontSize: `${14 * scale}px`,
            animation: 'sparkle 1.5s ease-in-out infinite',
          }}>
            ✨
          </div>
          <div style={{
            position: 'absolute',
            bottom: `${8 * scale}px`,
            left: `${10 * scale}px`,
            fontSize: `${10 * scale}px`,
            animation: 'sparkle 1.5s ease-in-out infinite 0.5s',
          }}>
            ✨
          </div>
        </>
      )}

      {/* أيقونة التجميد */}
      {cell.isFrozen && (
        <div style={{
          position: 'absolute',
          top: `${3 * scale}px`,
          right: `${6 * scale}px`,
          fontSize: `${16 * scale}px`,
          animation: 'frozenIcon 2s ease-in-out infinite',
        }}>
          ❄️
        </div>
      )}

      {/* عداد التجميد */}
      {cell.isFrozen && cell.freezeCounter > 0 && (
        <div style={{
          position: 'absolute',
          bottom: `${5 * scale}px`,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.6)',
          borderRadius: '10px',
          padding: `${2 * scale}px ${6 * scale}px`,
          fontSize: `${10 * scale}px`,
          color: '#93c5fd',
          fontWeight: 700,
        }}>
          {cell.freezeCounter} 🔒
        </div>
      )}

      {/* أيقونة الدرع */}
      {cell.isShielded && (
        <div style={{
          position: 'absolute',
          top: `${3 * scale}px`,
          left: `${6 * scale}px`,
          fontSize: `${14 * scale}px`,
          animation: 'shieldGlow 2s ease-in-out infinite',
        }}>
          🛡️
        </div>
      )}

      {/* عداد الدرع */}
      {cell.isShielded && cell.shieldCounter > 0 && (
        <div style={{
          position: 'absolute',
          bottom: `${5 * scale}px`,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(16, 185, 129, 0.8)',
          borderRadius: '10px',
          padding: `${2 * scale}px ${6 * scale}px`,
          fontSize: `${10 * scale}px`,
          color: 'white',
          fontWeight: 700,
        }}>
          {cell.shieldCounter} 🛡️
        </div>
      )}

      {/* أنيميشن تساقط الثلج عند التجميد */}
      {showFreezeAnimation && (
        <div style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}>
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${10 + Math.random() * 80}%`,
                top: '-20px',
                fontSize: `${8 + Math.random() * 8}px`,
                animation: `snowfall ${1 + Math.random()}s linear forwards`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            >
              ❄️
            </div>
          ))}
        </div>
      )}

      {/* الأنيميشنات */}
      <style>{`
        @keyframes sparkle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.15); }
        }
        @keyframes cardBounce {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -3px, 0); }
        }
        @keyframes frozenIcon {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        @keyframes shieldPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.08); opacity: 0.3; }
        }
        @keyframes shieldGlow {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        @keyframes snowfall {
          0% { transform: translate3d(0, 0, 0); opacity: 1; }
          100% { transform: translate3d(0, 100px, 0) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

// دالة مقارنة مخصصة — تتجاهل تغيير onClick (دالة جديدة كل render)
// وتقارن فقط البيانات المؤثرة فعلاً على الشكل
function areCellPropsEqual(prev: HexCellProps, next: HexCellProps): boolean {
  const p = prev.cell;
  const n = next.cell;
  return (
    p.id === n.id &&
    p.status === n.status &&
    p.letter === n.letter &&
    p.isFrozen === n.isFrozen &&
    p.freezeCounter === n.freezeCounter &&
    p.isGolden === n.isGolden &&
    p.hasCard === n.hasCard &&
    p.isShielded === n.isShielded &&
    p.shieldCounter === n.shieldCounter &&
    prev.isSelected === next.isSelected &&
    prev.isDecorative === next.isDecorative &&
    prev.scale === next.scale &&
    prev.showCardIndicator === next.showCardIndicator
  );
}

export const HexCell = React.memo(HexCellInner, areCellPropsEqual);

// src/components/LoadingBar.tsx
// شريط التحميل المتحرك — بديل موحّد عن الدوائر الدوّارة

import React from 'react';

interface LoadingBarProps {
  /** ارتفاع الشريط بالـ px */
  height?: number;
  /** عرض الشريط — افتراضي 100% */
  width?: string;
  /** لون الشريط — افتراضي البنفسجي */
  color?: string;
  /** لون الخلفية الباهتة */
  trackColor?: string;
  /** نصف قطر الزوايا */
  borderRadius?: number;
  /** سرعة الأنيميشن بالثواني */
  duration?: number;
}

/**
 * شريط تحميل أفقي متحرك (indeterminate)
 * استخدام:
 *   <LoadingBar />                       ← بنفسجي افتراضي
 *   <LoadingBar color="#10b981" />       ← أخضر
 *   <LoadingBar height={6} />            ← أثخن
 */
export const LoadingBar: React.FC<LoadingBarProps> = ({
  height      = 4,
  width       = '100%',
  color       = '#a855f7',
  trackColor,
  borderRadius,
  duration    = 1.4,
}) => {
  const r = borderRadius ?? height * 2;
  const bg = trackColor ?? `${color}28`; // 16% opacity

  return (
    <div style={{ width, height: `${height}px`, background: bg, borderRadius: r, overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: '45%',
        borderRadius: r,
        background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
        animation: `lbSlide ${duration}s ease-in-out infinite`,
        willChange: 'transform',
      }} />
      <style>{`
        @keyframes lbSlide {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(320%); }
        }
      `}</style>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// شاشة تحميل كاملة (تستبدل شاشة الدائرة القديمة في App.tsx)
// ────────────────────────────────────────────────────────────────────────────
interface FullPageLoadingProps {
  message?: string;
}

export const FullPageLoading: React.FC<FullPageLoadingProps> = ({
  message = 'جاري التحميل...',
}) => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0a0118 0%, #1a0b2e 50%, #2d1154 100%)',
  }}>
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1.5rem',
      width: 'min(320px, 85vw)',
    }}>
      {/* أيقونة اللعبة */}
      <div style={{
        fontSize: '3.5rem',
        animation: 'flPulse 2s ease-in-out infinite',
        userSelect: 'none',
      }}>✨</div>

      {/* الشريط */}
      <LoadingBar width="100%" height={5} color="#a855f7" duration={1.3} />

      {/* النص */}
      <div style={{
        color: '#c4b5fd',
        fontSize: '1rem',
        fontWeight: 600,
        letterSpacing: '0.02em',
      }}>
        {message}
      </div>
    </div>

    <style>{`
      @keyframes flPulse {
        0%,100% { transform: scale(1);    opacity: 1;   }
        50%      { transform: scale(1.12); opacity: 0.75; }
      }
    `}</style>
  </div>
);

// ────────────────────────────────────────────────────────────────────────────
// مؤشر تحميل مدمج داخل الأزرار (يستبدل الدائرة في AuthGate / HostScreen)
// ────────────────────────────────────────────────────────────────────────────
interface InlineLoaderProps {
  size?: number;
  color?: string;
}

export const InlineLoader: React.FC<InlineLoaderProps> = ({
  size  = 18,
  color = 'white',
}) => (
  <div style={{
    width: `${size}px`,
    height: `${size}px`,
    position: 'relative',
    flexShrink: 0,
  }}>
    {/* دائرتان متداخلتان تتحركان بشكل أنيق */}
    <div style={{
      position: 'absolute', inset: 0,
      border: `2px solid ${color}30`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'ilSpin 0.75s linear infinite',
    }} />
    <div style={{
      position: 'absolute', inset: '3px',
      border: `2px solid ${color}15`,
      borderBottomColor: color,
      borderRadius: '50%',
      animation: 'ilSpin 1.1s linear infinite reverse',
    }} />
    <style>{`
      @keyframes ilSpin { to { transform: rotate(360deg); } }
    `}</style>
  </div>
);

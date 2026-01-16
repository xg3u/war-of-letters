// src/components/HexCell.tsx
// الخلية السداسية - مطابقة تماماً للملف الأصلي

import React from 'react';
import type { HexCell as HexCellType } from '../core/types';

interface HexCellProps {
  cell: HexCellType;
  onClick?: () => void;
  isDecorative?: boolean;
  isSelected?: boolean;
  scale?: number;
}

export const HexCell: React.FC<HexCellProps> = ({ 
  cell, 
  onClick, 
  isDecorative = false,
  isSelected = false,
  scale = 1 
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  // تحديد الخلفية
  const getBackground = () => {
    // إذا محدد (selected)
    if (isSelected) {
      return '#ffa500';
    }

    // إذا خلية زينة
    if (isDecorative) {
      if (cell.status === 'red') {
        return 'linear-gradient(135deg, #f56565 0%, #e53e3e 100%)';
      }
      return 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
    }

    // إذا مجموعة (collected)
    if (cell.status === 'green') {
      return 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
    }
    if (cell.status === 'red') {
      return 'linear-gradient(135deg, #f56565 0%, #e53e3e 100%)';
    }

    // default: بيج
    return '#ffffe0';
  };

  const isCollected = cell.status !== 'unanswered';
  const isClickable = onClick && !isCollected && !isDecorative;

  const hexStyle: React.CSSProperties = {
    width: `${80 * scale}px`,
    height: `${92 * scale}px`,
    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: `${28 * scale}px`,
    fontFamily: "'Tajawal', sans-serif",
    fontWeight: 700,
    cursor: isClickable ? 'pointer' : isDecorative ? 'default' : 'not-allowed',
    transition: 'all 0.3s ease',
    position: 'relative',
    boxShadow: isSelected 
      ? '0 0 20px rgba(255, 165, 0, 0.8)' 
      : '0 2px 4px rgba(0, 0, 0, 0.2)',
    background: getBackground(),
    color: isCollected || isDecorative ? 'white' : '#1a202c',
    opacity: isCollected ? 0.7 : 1,
    transform: isSelected 
      ? 'scale(1.15)' 
      : isCollected 
        ? 'scale(0.9)' 
        : 'scale(1)',
    zIndex: isSelected ? 10 : 1,
    userSelect: 'none',
  };

  const hoverStyle: React.CSSProperties = isClickable && isHovered ? {
    transform: 'scale(1.05)',
  } : {};

  return (
    <div
      style={{ ...hexStyle, ...hoverStyle }}
      onClick={isClickable ? onClick : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* الحرف */}
      {!isDecorative && cell.letter}

      {/* أيقونة البطاقة */}
      {!isDecorative && cell.hasCard && !isCollected && (
        <div
          style={{
            position: 'absolute',
            top: '3px',
            right: '3px',
            fontSize: `${14 * scale}px`,
          }}
        >
          🎁
        </div>
      )}
    </div>
  );
};
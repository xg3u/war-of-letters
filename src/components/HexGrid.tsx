// src/components/HexGrid.tsx
// الشبكة السداسية - مطابقة للملف الأصلي

import React from 'react';
import { HexCell } from './HexCell';
import type { HexCell as HexCellType } from '../core/types';

interface HexGridProps {
  cells: HexCellType[];
  onCellClick?: (cell: HexCellType) => void;
  selectedCellId?: string | null;
  zoom?: number;
  scale?: number;
  showCardIndicator?: boolean; // إظهار مؤشر البطاقات (للمقدم فقط)
  colorsSwapped?: boolean; // عكس ألوان الحدود (الأخضر يصير أحمر والعكس)
}

export const HexGrid: React.FC<HexGridProps> = ({
  cells,
  onCellClick,
  selectedCellId = null,
  zoom = 1,
  scale = 1,
  showCardIndicator = true, // افتراضياً يظهر للمقدم
  colorsSwapped = false // عكس الألوان
}) => {
  // خلية زينة - مع دعم عكس الألوان
  const createDecorativeCell = (id: string, isRed: boolean = false): HexCellType => {
    // إذا كانت الألوان معكوسة، نعكس الأحمر والأخضر
    const actualIsRed = colorsSwapped ? !isRed : isRed;
    return {
      id,
      q: 0,
      r: 0,
      letter: '',
      status: actualIsRed ? 'red' : 'green',
      isGolden: false,
      hasCard: false,
      isFrozen: false,
      frozenBy: null,
      freezeCounter: 0,
      isShielded: false,
      shieldCounter: 0,
      categoryId: '',
    };
  };

  // تقسيم الخلايا (5x5)
  const gameRows: HexCellType[][] = [];
  for (let r = 0; r < 5; r++) {
    gameRows.push(cells.filter(c => c.r === r));
  }

  // بناء 7x7
  const fullLayout: Array<{ row: HexCellType[], rowIndex: number }> = [];

  // Row 0
  fullLayout.push({
    row: [
      createDecorativeCell('dec-0-0', false),
      createDecorativeCell('dec-0-1', true),
      createDecorativeCell('dec-0-2', true),
      createDecorativeCell('dec-0-3', true),
      createDecorativeCell('dec-0-4', true),
      createDecorativeCell('dec-0-5', true),
      createDecorativeCell('dec-0-6', false),
    ],
    rowIndex: 0
  });

  // Rows 1-5
  gameRows.forEach((gameRow, index) => {
    fullLayout.push({
      row: [
        createDecorativeCell(`dec-${index + 1}-0`, false),
        ...gameRow,
        createDecorativeCell(`dec-${index + 1}-6`, false),
      ],
      rowIndex: index + 1
    });
  });

  // Row 6
  fullLayout.push({
    row: [
      createDecorativeCell('dec-6-0', false),
      createDecorativeCell('dec-6-1', true),
      createDecorativeCell('dec-6-2', true),
      createDecorativeCell('dec-6-3', true),
      createDecorativeCell('dec-6-4', true),
      createDecorativeCell('dec-6-5', true),
      createDecorativeCell('dec-6-6', false),
    ],
    rowIndex: 6
  });

  return (
    <div
      style={{
        padding: '15px',
        background: 'linear-gradient(145deg, rgba(15, 10, 35, 0.95) 0%, rgba(30, 20, 60, 0.9) 50%, rgba(15, 10, 35, 0.95) 100%)',
        borderRadius: '24px',
        boxShadow: `
          0 25px 60px -12px rgba(0, 0, 0, 0.5),
          0 0 40px rgba(139, 92, 246, 0.15),
          inset 0 1px 0 rgba(255, 255, 255, 0.1)
        `,
        maxWidth: '100%',
        margin: '0 auto',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transform: `scale(${zoom})`,
        transition: 'transform 0.3s ease',
        backdropFilter: 'blur(10px)',
        border: '2px solid rgba(139, 92, 246, 0.2)',
      }}
    >
      {fullLayout.map((layoutRow, idx) => (
        <div
          key={idx}
          style={{
            display: 'flex',
            gap: '2px',
            justifyContent: 'center',
            marginTop: idx === 0 ? 0 : `${-20 * scale}px`,
            marginRight: layoutRow.rowIndex % 2 === 0 ? 0 : `${42 * scale}px`,
            marginLeft: layoutRow.rowIndex % 2 === 0 ? `${42 * scale}px` : 0,
            transition: 'margin 0.3s ease',
          }}
        >
          {layoutRow.row.map((cell, colIdx) => {
            const isDecorative = (
              layoutRow.rowIndex === 0 || 
              layoutRow.rowIndex === 6 || 
              colIdx === 0 || 
              colIdx === layoutRow.row.length - 1
            );

            return (
              <HexCell
                key={cell.id}
                cell={cell}
                onClick={
                  !isDecorative && onCellClick
                    ? () => onCellClick(cell)
                    : undefined
                }
                isDecorative={isDecorative}
                isSelected={cell.id === selectedCellId}
                scale={scale}
                showCardIndicator={showCardIndicator}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};
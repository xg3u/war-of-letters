// src/components/HexGrid.tsx
// الشبكة السداسية - مطابقة للملف الأصلي

import React, { useMemo, useCallback } from 'react';
import { HexCell } from './HexCell';
import { useScreenSize } from '../hooks/useScreenSize';
import type { HexCell as HexCellType } from '../core/types';

interface HexGridProps {
  cells: HexCellType[];
  onCellClick?: (cell: HexCellType) => void;
  selectedCellId?: string | null;
  zoom?: number;
  scale?: number;
  showCardIndicator?: boolean;
  colorsSwapped?: boolean;
}

// الخلايا الزينة ثابتة (لا تتغير أبداً) — نُنشئها مرة واحدة خارج الـ component
const makeDecorativeCell = (id: string, isRed: boolean, swapped: boolean): HexCellType => {
  const actualIsRed = swapped ? !isRed : isRed;
  return {
    id,
    q: 0, r: 0, letter: '',
    status: actualIsRed ? 'red' : 'green',
    isGolden: false, hasCard: false,
    isFrozen: false, frozenBy: null, freezeCounter: 0,
    isShielded: false, shieldCounter: 0, categoryId: '',
  };
};

export const HexGrid: React.FC<HexGridProps> = ({
  cells,
  onCellClick,
  selectedCellId = null,
  zoom = 1,
  scale = 1,
  showCardIndicator = true,
  colorsSwapped = false,
}) => {
  const { isMobile, isTablet } = useScreenSize();
  const responsiveScale = scale * (isMobile ? 0.75 : isTablet ? 0.88 : 1);

  // الخلايا الزينة: تُحسب فقط عند تغيير colorsSwapped (نادر جداً)
  const decorativeCells = useMemo(() => ({
    row0: [
      makeDecorativeCell('dec-0-0', false, colorsSwapped),
      makeDecorativeCell('dec-0-1', true, colorsSwapped),
      makeDecorativeCell('dec-0-2', true, colorsSwapped),
      makeDecorativeCell('dec-0-3', true, colorsSwapped),
      makeDecorativeCell('dec-0-4', true, colorsSwapped),
      makeDecorativeCell('dec-0-5', true, colorsSwapped),
      makeDecorativeCell('dec-0-6', false, colorsSwapped),
    ],
    row6: [
      makeDecorativeCell('dec-6-0', false, colorsSwapped),
      makeDecorativeCell('dec-6-1', true, colorsSwapped),
      makeDecorativeCell('dec-6-2', true, colorsSwapped),
      makeDecorativeCell('dec-6-3', true, colorsSwapped),
      makeDecorativeCell('dec-6-4', true, colorsSwapped),
      makeDecorativeCell('dec-6-5', true, colorsSwapped),
      makeDecorativeCell('dec-6-6', false, colorsSwapped),
    ],
    sideL: Array.from({ length: 5 }, (_, i) => makeDecorativeCell(`dec-${i + 1}-0`, false, colorsSwapped)),
    sideR: Array.from({ length: 5 }, (_, i) => makeDecorativeCell(`dec-${i + 1}-6`, false, colorsSwapped)),
  }), [colorsSwapped]);

  // تقسيم الخلايا للصفوف — يُعاد حسابه فقط عند تغيير محتوى cells
  const gameRows = useMemo<HexCellType[][]>(() => {
    const rows: HexCellType[][] = [];
    for (let r = 0; r < 5; r++) {
      rows.push(cells.filter(c => c.r === r));
    }
    return rows;
  }, [cells]);

  // بناء الـ layout الكامل — يعتمد على gameRows + decorativeCells
  const fullLayout = useMemo<Array<{ row: HexCellType[], rowIndex: number }>>(() => {
    const layout: Array<{ row: HexCellType[], rowIndex: number }> = [];

    layout.push({ row: decorativeCells.row0, rowIndex: 0 });

    gameRows.forEach((gameRow, index) => {
      layout.push({
        row: [decorativeCells.sideL[index], ...gameRow, decorativeCells.sideR[index]],
        rowIndex: index + 1,
      });
    });

    layout.push({ row: decorativeCells.row6, rowIndex: 6 });
    return layout;
  }, [gameRows, decorativeCells]);

  // handler مستقر لا يتغير هويته بين الرندرات (يمنع re-render HexCell)
  const handleCellClick = useCallback((cell: HexCellType) => {
    onCellClick?.(cell);
  }, [onCellClick]);

  return (
    <div
      style={{
        padding: isMobile ? '10px' : '15px',
        background: 'linear-gradient(145deg, rgba(10, 6, 28, 0.98) 0%, rgba(25, 15, 55, 0.95) 50%, rgba(10, 6, 28, 0.98) 100%)',
        borderRadius: isMobile ? '20px' : '24px',
        boxShadow: isMobile ? `
          0 20px 50px -8px rgba(0, 0, 0, 0.7),
          0 0 60px rgba(139, 92, 246, 0.3),
          0 0 120px rgba(139, 92, 246, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.12)
        ` : `
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
        border: isMobile
          ? '2px solid rgba(139, 92, 246, 0.55)'
          : '2px solid rgba(139, 92, 246, 0.2)',
      }}
    >
      {fullLayout.map((layoutRow, idx) => (
        <div
          key={layoutRow.rowIndex}
          style={{
            display: 'flex',
            gap: '2px',
            justifyContent: 'center',
            marginTop: idx === 0 ? 0 : `${-20 * responsiveScale}px`,
            marginRight: layoutRow.rowIndex % 2 === 0 ? 0 : `${42 * responsiveScale}px`,
            marginLeft: layoutRow.rowIndex % 2 === 0 ? `${42 * responsiveScale}px` : 0,
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
                onClick={!isDecorative && onCellClick ? () => handleCellClick(cell) : undefined}
                isDecorative={isDecorative}
                isSelected={cell.id === selectedCellId}
                scale={responsiveScale}
                showCardIndicator={showCardIndicator}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};

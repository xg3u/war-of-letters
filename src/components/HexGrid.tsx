// src/components/HexGrid.tsx
// الشبكة السداسية - مطابقة للملف الأصلي

import React, { useMemo, useCallback } from 'react';
import { HexCell } from './HexCell';
import { useScreenSize } from '../hooks/useScreenSize';
import { useTheme } from '../context/ThemeContext';
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
  const { theme } = useTheme();

  // ندمج zoom مع scale مباشرة — الخلايا تتغير حجمها فعلياً بدل transform
  const responsiveScale = scale * zoom * (isMobile ? 0.75 : isTablet ? 0.88 : 1);

  // تحويل hex إلى rgba
  const rgba = useCallback((hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }, []);

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
        padding: isMobile ? '6px 4px' : '12px 8px',
        background: theme.bgGradient,
        borderRadius: isMobile ? '16px' : '24px',
        boxShadow: isMobile ? `
          0 12px 30px -6px rgba(0, 0, 0, 0.6),
          inset 0 1px 0 rgba(255, 255, 255, 0.08)
        ` : `
          0 25px 60px -12px rgba(0, 0, 0, 0.5),
          0 0 30px ${rgba(theme.accent, 0.1)},
          inset 0 1px 0 rgba(255, 255, 255, 0.06)
        `,
        margin: '0 auto',
        overflow: 'hidden',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        border: isMobile
          ? `2px solid ${rgba(theme.accent, 0.35)}`
          : `2px solid ${rgba(theme.accent, 0.15)}`,
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

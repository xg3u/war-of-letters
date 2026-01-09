// src/components/HexCell.tsx
import React from 'react';
import type { HexCell as HexCellType } from '../core/types';

interface Props {
  cell: HexCellType;
  onClick: () => void;
}

export const HexCell: React.FC<Props> = ({ cell, onClick }) => {
  const getStatusStyle = () => {
    if (cell.status === 'green') return 'bg-gradient-to-br from-green-400 to-green-600 shadow-[0_0_15px_rgba(72,187,120,0.5)]';
    if (cell.status === 'red') return 'bg-gradient-to-br from-red-400 to-red-600 shadow-[0_0_15px_rgba(245,101,101,0.5)]';
    return 'bg-[#ffffe0] hover:scale-110 hover:bg-orange-200 transition-all';
  };

  return (
    <div 
      onClick={onClick}
      className={`
        w-20 h-[92px] cursor-pointer flex items-center justify-center 
        text-2xl font-bold text-slate-800 select-none
        ${getStatusStyle()}
      `}
      style={{
        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
        margin: '2px'
      }}
    >
      {cell.letter}
    </div>
  );
};
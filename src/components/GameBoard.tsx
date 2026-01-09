// src/components/GameBoard.tsx
import React, { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { HexCell } from './HexCell';
import { Users, Dice5, Redo2, Maximize } from 'lucide-react';

export const GameBoard: React.FC = () => {
  const { cells, initializeGrid, claimCell, settings } = useGameStore();

  useEffect(() => {
    initializeGrid(5); // نبدأ بشبكة 5x5
  }, [initializeGrid]);

  // تقسيم الخلايا إلى صفوف (Grid layout logic)
  const rows = [];
  const size = 5;
  for (let r = 0; r < size; r++) {
    rows.push(cells.filter(c => c.r === r));
  }

  return (
    <div className="relative z-10 w-full max-w-[1400px] flex flex-col md:flex-row items-center justify-center gap-10 p-6">
      
      {/* لوحة الفريق الأخضر */}
      <TeamPanel team="green" color="green" icon={<Users />} />

      {/* منطقة اللعبة الرئيسية */}
      <div className="flex flex-col items-center">
        <div className="bg-black/60 backdrop-blur-md p-4 rounded-[2rem] shadow-2xl border border-white/10">
          <div className="flex flex-col items-center">
            {rows.map((rowCells, i) => (
              <div 
                key={i} 
                className="flex"
                style={{ 
                  marginTop: i === 0 ? '0' : '-22px',
                  marginLeft: i % 2 !== 0 ? '42px' : '0' 
                }}
              >
                {rowCells.map(cell => (
                  <HexCell key={cell.id} cell={cell} onClick={() => claimCell(cell.id, 'green')} />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* أدوات التحكم السفلية */}
        <div className="mt-8 flex gap-4 bg-white/10 backdrop-blur-md p-4 rounded-3xl">
           <ControlBtn icon={<Dice5 />} title="عشوائي" />
           <ControlBtn icon={<Redo2 />} title="إعادة" />
           <ControlBtn icon={<Maximize />} title="ملء الشاشة" />
        </div>
      </div>

      {/* لوحة الفريق الأحمر */}
      <TeamPanel team="red" color="red" icon={<Users />} />

    </div>
  );
};

const TeamPanel = ({ team, color, icon }: any) => (
  <div className={`
    w-72 bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-xl border-t-8
    ${color === 'green' ? 'border-green-500' : 'border-red-500'}
  `}>
    <div className="flex items-center gap-4 mb-6">
      <div className={`p-3 rounded-2xl text-white ${color === 'green' ? 'bg-green-500' : 'bg-red-500'}`}>
        {icon}
      </div>
      <input 
        placeholder="اسم الفريق"
        className="w-full bg-transparent border-b-2 border-slate-200 outline-none focus:border-purple-500 font-bold text-lg"
      />
    </div>
    <div className="text-center bg-slate-100 rounded-2xl py-4 mb-6">
      <span className="block text-slate-500 text-sm font-bold uppercase">النقاط</span>
      <span className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
        0
      </span>
    </div>
    <div className="grid grid-cols-4 gap-2 h-40 overflow-y-auto content-start">
      {/* هنا ستظهر الحروف المجمعة لاحقاً */}
    </div>
  </div>
);

const ControlBtn = ({ icon, title }: any) => (
  <button className="p-4 bg-white rounded-2xl text-purple-600 shadow-lg hover:scale-110 active:scale-95 transition-all">
    {icon}
  </button>
);
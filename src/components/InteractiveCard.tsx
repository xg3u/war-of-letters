import React, { useState } from 'react';

interface Props {
  title: string;
  description: string;
  count?: number;
  type: 'category' | 'action';
}

export const InteractiveCard: React.FC<Props> = ({ title, description, count, type }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      className="group w-full aspect-[3/4.5] [perspective:1000px] cursor-pointer"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className={`relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
        
        {/* الوجه الأمامي */}
        <div className={`absolute inset-0 [backface-visibility:hidden] rounded-[2.5rem] border-[4px] border-white/20 flex flex-col items-center justify-center p-6 shadow-xl 
          ${type === 'category' ? 'bg-gradient-to-b from-red-500 to-red-600' : 'bg-[#e6d1bc]'}`}>
          <span className={`text-2xl font-black ${type === 'category' ? 'text-white' : 'text-[#5d4037]'}`}>{title}</span>
        </div>

        {/* الوجه الخلفي (الشرح والمعلومات) */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-game-purple border-[4px] border-game-orange/50 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center">
          <p className="text-white font-bold text-lg mb-4 leading-relaxed">{description}</p>
          {count !== undefined && (
            <div className="bg-game-orange/20 text-game-orange px-4 py-2 rounded-xl text-sm font-black">
              {count} سؤال متاح
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
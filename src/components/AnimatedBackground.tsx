import React, { useMemo } from 'react';

const LETTERS = ['أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي'];

export const AnimatedBackground: React.FC = () => {
  const bgLetters = useMemo(() => {
    return Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      char: LETTERS[Math.floor(Math.random() * LETTERS.length)],
      left: Math.random() * 100 + '%',
      duration: (Math.random() * 10 + 15) + 's',
      delay: Math.random() * 10 + 's',
      color: ['#ff4444', '#ffd700', '#00bfff'][Math.floor(Math.random() * 3)]
    }));
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {bgLetters.map((l) => (
        <div
          key={l.id}
          className="absolute font-black text-5xl opacity-20 animate-fall"
          style={{
            left: l.left,
            animationDuration: l.duration,
            animationDelay: l.delay,
            color: l.color,
            textShadow: '2px 2px 0px rgba(0,0,0,0.2)'
          }}
        >
          {l.char}
        </div>
      ))}
    </div>
  );
};
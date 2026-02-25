// src/components/JoinScreen.tsx
// شاشة اختيار الدور عند الدخول عبر QR Code

import React from 'react';
import { Tv, Gamepad2 } from 'lucide-react';
import { useScreenSize } from '../hooks/useScreenSize';

interface JoinScreenProps {
  onSelect: (screen: 'players' | 'buzzers') => void;
}

export const JoinScreen: React.FC<JoinScreenProps> = ({ onSelect }) => {
  const { isMobile } = useScreenSize();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0a0118 0%, #1a0b2e 50%, #2d1154 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '1.5rem 1rem' : '2rem',
      direction: 'rtl',
      gap: isMobile ? '1.75rem' : '2.5rem',
    }}>

      {/* العنوان */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.4rem',
          flexWrap: 'wrap',
          marginBottom: isMobile ? '0.5rem' : '0.75rem',
          filter: 'drop-shadow(0 2px 12px rgba(0,0,0,0.9))',
        }}>
          {(['حرب', 'الحروف'] as const).map((word, i) => (
            <span key={i} style={{
              fontSize: isMobile ? '2rem' : '3rem',
              fontWeight: 900,
              color: i === 0 ? '#ef4444' : '#fbbf24',
              WebkitTextStroke: isMobile ? '1.5px #1a0000' : '2px #1a0000',
              textShadow: `0 0 20px ${i === 0 ? 'rgba(239,68,68,0.5)' : 'rgba(251,191,36,0.5)'}`,
            }}>{word}</span>
          ))}
        </div>

        <div style={{
          fontSize: isMobile ? '1rem' : '1.25rem',
          fontWeight: 700,
          color: 'rgba(255,255,255,0.5)',
          marginBottom: '0.4rem',
        }}>
          اختر دورك
        </div>
        <div style={{
          width: '60px',
          height: '3px',
          background: 'linear-gradient(90deg,#a855f7,#ec4899)',
          borderRadius: '2px',
          margin: '0 auto',
        }} />
      </div>

      {/* خيارات الدور */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '1rem' : '1.5rem',
        width: '100%',
        maxWidth: '680px',
      }}>

        {/* خيار: شاشة عرض */}
        <button
          onClick={() => onSelect('players')}
          style={{
            flex: 1,
            padding: isMobile ? '1.75rem 1.25rem' : '2.5rem 1.75rem',
            background: 'linear-gradient(145deg, rgba(20,184,166,0.15), rgba(6,182,212,0.08))',
            border: '2px solid rgba(20,184,166,0.5)',
            borderRadius: isMobile ? '1.25rem' : '1.75rem',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: isMobile ? '0.75rem' : '1rem',
            transition: 'all 0.25s',
            boxShadow: '0 8px 32px rgba(20,184,166,0.2)',
            position: 'relative',
            overflow: 'hidden',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 16px 48px rgba(20,184,166,0.4)';
            e.currentTarget.style.borderColor = 'rgba(20,184,166,0.9)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(20,184,166,0.2)';
            e.currentTarget.style.borderColor = 'rgba(20,184,166,0.5)';
          }}
        >
          {/* شريط علوي */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
            background: 'linear-gradient(90deg,#14b8a6,#06b6d4)',
          }} />

          <div style={{
            width: isMobile ? '60px' : '80px',
            height: isMobile ? '60px' : '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(20,184,166,0.3), rgba(6,182,212,0.2))',
            border: '2px solid rgba(20,184,166,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 24px rgba(20,184,166,0.3)',
          }}>
            <Tv size={isMobile ? 28 : 38} color="#14b8a6" />
          </div>

          <div>
            <div style={{
              fontSize: isMobile ? '1.3rem' : '1.6rem',
              fontWeight: 900,
              color: '#14b8a6',
              marginBottom: '0.3rem',
            }}>
              شاشة عرض
            </div>
            <div style={{
              fontSize: isMobile ? '0.78rem' : '0.88rem',
              color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.4,
              maxWidth: '200px',
              margin: '0 auto',
            }}>
              عرض شاشة اللعبة على جهاز أو شاشة كبيرة
            </div>
          </div>

          <div style={{
            padding: isMobile ? '0.35rem 1rem' : '0.4rem 1.25rem',
            background: 'rgba(20,184,166,0.15)',
            border: '1.5px solid rgba(20,184,166,0.4)',
            borderRadius: '2rem',
            fontSize: isMobile ? '0.72rem' : '0.8rem',
            fontWeight: 700,
            color: 'rgba(20,184,166,0.9)',
          }}>
            📺 للعرض العام
          </div>
        </button>

        {/* خيار: لاعب */}
        <button
          onClick={() => onSelect('buzzers')}
          style={{
            flex: 1,
            padding: isMobile ? '1.75rem 1.25rem' : '2.5rem 1.75rem',
            background: 'linear-gradient(145deg, rgba(168,85,247,0.15), rgba(236,72,153,0.08))',
            border: '2px solid rgba(168,85,247,0.5)',
            borderRadius: isMobile ? '1.25rem' : '1.75rem',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: isMobile ? '0.75rem' : '1rem',
            transition: 'all 0.25s',
            boxShadow: '0 8px 32px rgba(168,85,247,0.2)',
            position: 'relative',
            overflow: 'hidden',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 16px 48px rgba(168,85,247,0.4)';
            e.currentTarget.style.borderColor = 'rgba(168,85,247,0.9)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(168,85,247,0.2)';
            e.currentTarget.style.borderColor = 'rgba(168,85,247,0.5)';
          }}
        >
          {/* شريط علوي */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
            background: 'linear-gradient(90deg,#a855f7,#ec4899)',
          }} />

          <div style={{
            width: isMobile ? '60px' : '80px',
            height: isMobile ? '60px' : '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(236,72,153,0.2))',
            border: '2px solid rgba(168,85,247,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 24px rgba(168,85,247,0.3)',
          }}>
            <Gamepad2 size={isMobile ? 28 : 38} color="#a855f7" />
          </div>

          <div>
            <div style={{
              fontSize: isMobile ? '1.3rem' : '1.6rem',
              fontWeight: 900,
              color: '#a855f7',
              marginBottom: '0.3rem',
            }}>
              لاعب
            </div>
            <div style={{
              fontSize: isMobile ? '0.78rem' : '0.88rem',
              color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.4,
              maxWidth: '200px',
              margin: '0 auto',
            }}>
              شارك بالإجابة، اضغط الجرس، واطلب البطاقات
            </div>
          </div>

          <div style={{
            padding: isMobile ? '0.35rem 1rem' : '0.4rem 1.25rem',
            background: 'rgba(168,85,247,0.15)',
            border: '1.5px solid rgba(168,85,247,0.4)',
            borderRadius: '2rem',
            fontSize: isMobile ? '0.72rem' : '0.8rem',
            fontWeight: 700,
            color: 'rgba(168,85,247,0.9)',
          }}>
            🎮 للمشاركة في اللعب
          </div>
        </button>
      </div>

      {/* تلميح */}
      <div style={{
        fontSize: isMobile ? '0.72rem' : '0.8rem',
        color: 'rgba(255,255,255,0.3)',
        textAlign: 'center',
      }}>
        💡 شاشة العرض للتلفزيون أو البروجكتور · اللاعب للجوال
      </div>
    </div>
  );
};

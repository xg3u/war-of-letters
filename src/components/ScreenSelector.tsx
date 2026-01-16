// src/components/ScreenSelector.tsx
// اختيار نوع الشاشة (مقدم أو لاعبين)

import React, { useState, useEffect } from 'react';
import { Tv, Users, ArrowLeft } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { HostScreen } from './HostScreen';
import { PlayersScreen } from './PlayersScreen';
import type { GameSettingsData } from './GameSettings';
import type { HexCell } from '../core/types';

interface ScreenSelectorProps {
  settings: GameSettingsData;
  onBack: () => void;
}

export const ScreenSelector: React.FC<ScreenSelectorProps> = ({
  settings,
  onBack,
}) => {
  const [screenType, setScreenType] = useState<'select' | 'host' | 'players'>('select');
  const { initializeGrid } = useGameStore();
  const [selectedCell, setSelectedCell] = useState<HexCell | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);

  // تهيئة الشبكة عند بدء اللعبة
  useEffect(() => {
    initializeGrid();
  }, [initializeGrid]);

  // شاشة الاختيار
  if (screenType === 'select') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a0b2e 0%, #2d1154 50%, #4c1d95 100%)',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        
        {/* زر الرجوع */}
        <button
          onClick={onBack}
          style={{
            position: 'absolute',
            top: '2rem',
            left: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '1rem',
            color: 'white',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <ArrowLeft size={20} />
          رجوع
        </button>

        {/* العنوان */}
        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          fontWeight: 900,
          color: 'white',
          textAlign: 'center',
          marginBottom: '1rem',
        }}>
          اختر نوع الشاشة
        </h1>
        
        <p style={{
          fontSize: '1.125rem',
          color: '#e9d5ff',
          textAlign: 'center',
          marginBottom: '3rem',
          maxWidth: '600px',
        }}>
          {settings.gameName}
        </p>

        {/* خيارات الشاشة */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          maxWidth: '900px',
          width: '100%',
        }}>
          
          {/* شاشة المقدم */}
          <button
            onClick={() => setScreenType('host')}
            style={{
              padding: '3rem 2rem',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.2))',
              border: '3px solid rgba(59, 130, 246, 0.5)',
              borderRadius: '2rem',
              cursor: 'pointer',
              transition: 'all 0.3s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.5rem',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-10px)';
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.boxShadow = '0 20px 60px rgba(59, 130, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 40px rgba(59, 130, 246, 0.5)',
            }}>
              <Tv size={60} color="white" />
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <h2 style={{
                fontSize: '2rem',
                fontWeight: 900,
                color: 'white',
                margin: '0 0 0.5rem 0',
              }}>
                شاشة المقدم
              </h2>
              <p style={{
                fontSize: '1rem',
                color: '#bfdbfe',
                margin: 0,
                lineHeight: '1.6',
              }}>
                صلاحيات كاملة للتحكم في اللعبة
              </p>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              width: '100%',
              color: '#93c5fd',
              fontSize: '0.875rem',
            }}>
              <div>✓ التحكم في الشبكة</div>
              <div>✓ إدارة الأسئلة</div>
              <div>✓ تحديد الفائز</div>
            </div>
          </button>

          {/* شاشة اللاعبين */}
          <button
            onClick={() => setScreenType('players')}
            style={{
              padding: '3rem 2rem',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(20, 184, 166, 0.2))',
              border: '3px solid rgba(16, 185, 129, 0.5)',
              borderRadius: '2rem',
              cursor: 'pointer',
              transition: 'all 0.3s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.5rem',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-10px)';
              e.currentTarget.style.borderColor = '#10b981';
              e.currentTarget.style.boxShadow = '0 20px 60px rgba(16, 185, 129, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.5)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981, #14b8a6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 40px rgba(16, 185, 129, 0.5)',
            }}>
              <Users size={60} color="white" />
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <h2 style={{
                fontSize: '2rem',
                fontWeight: 900,
                color: 'white',
                margin: '0 0 0.5rem 0',
              }}>
                شاشة اللاعبين
              </h2>
              <p style={{
                fontSize: '1rem',
                color: '#a7f3d0',
                margin: 0,
                lineHeight: '1.6',
              }}>
                شاشة العرض للفرق والجمهور
              </p>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              width: '100%',
              color: '#6ee7b7',
              fontSize: '0.875rem',
            }}>
              <div>✓ عرض الشبكة</div>
              <div>✓ متابعة النقاط</div>
              <div>✓ مزامنة مع المقدم</div>
            </div>
          </button>
        </div>

        {/* ملاحظة */}
        <div style={{
          marginTop: '3rem',
          padding: '1.5rem',
          background: 'rgba(168, 85, 247, 0.1)',
          border: '2px solid rgba(168, 85, 247, 0.3)',
          borderRadius: '1rem',
          maxWidth: '600px',
          textAlign: 'center',
        }}>
          <p style={{
            color: '#e9d5ff',
            fontSize: '0.875rem',
            margin: 0,
            lineHeight: '1.6',
          }}>
            💡 <strong style={{ color: '#a855f7' }}>نصيحة:</strong> افتح شاشة المقدم على جهازك، وشاشة اللاعبين على شاشة عرض منفصلة
          </p>
        </div>
      </div>
    );
  }

  // شاشة المقدم
  if (screenType === 'host') {
    return <HostScreen settings={settings} />;
  }

  // شاشة اللاعبين
  if (screenType === 'players') {
    return (
      <PlayersScreen
        settings={settings}
        currentQuestion={currentQuestion}
        selectedCell={selectedCell}
      />
    );
  }
};
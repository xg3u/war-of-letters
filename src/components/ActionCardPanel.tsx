// src/components/ActionCardPanel.tsx
// لوحة البطاقات المحدثة

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { CARD_PERMISSIONS } from '../utils/cardPermissions';
import type { CardType } from '../core/types';

// تصدير CardType للاستخدام الخارجي
export type { CardType };

interface ActionCardPanelProps {
  onCardUse: (cardType: CardType, targetCellId: string) => void;
  enabledCards: {
    freeze: boolean;
    bomb: boolean;
    battle: boolean;
    shield: boolean;
    demonShuffle: boolean;
    speedUp: boolean;
    luck: boolean;
  };
  selectedCell: string | null;
  teamCards: {
    green: CardType[];
    red: CardType[];
  };
  onClose: () => void;
}

export const ActionCardPanel: React.FC<ActionCardPanelProps> = ({
  onCardUse,
  enabledCards,
  selectedCell,
  teamCards,
  onClose,
}) => {
  const [step, setStep] = useState<'team' | 'card'>('team');
  const [selectedTeam, setSelectedTeam] = useState<'green' | 'red' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTeamSelect = (team: 'green' | 'red') => {
    setSelectedTeam(team);
    setStep('card');
    setError(null);
  };

  const handleCardSelect = (card: CardType) => {
    if (!selectedTeam) return;

    // التحقق من وجود البطاقة
    if (!teamCards[selectedTeam].includes(card)) {
      setError(`❌ الفريق ${selectedTeam === 'green' ? 'الأخضر' : 'الأحمر'} ليس لديه هذه البطاقة!`);
      return;
    }

    const permission = CARD_PERMISSIONS[card];

    // إذا لا يحتاج اختيار خلية
    if (!permission.requiresTarget) {
      onCardUse(card, '');
      onClose();
    } else {
      // يحتاج اختيار خلية
      if (selectedCell) {
        onCardUse(card, selectedCell);
        onClose();
      } else {
        setError('⚠️ الرجاء اختيار خلية من الشبكة أولاً');
      }
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.9)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '2rem',
    }}>
      <div style={{
        maxWidth: '900px',
        width: '100%',
        background: 'linear-gradient(135deg, #1a0b2e, #2d1154)',
        border: '3px solid rgba(168, 85, 247, 0.5)',
        borderRadius: '2rem',
        padding: '2rem',
        position: 'relative',
      }}>
        {/* زر الإغلاق */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            left: '1rem',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '2px solid rgba(239, 68, 68, 0.5)',
            color: '#ef4444',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={24} />
        </button>

        {/* العنوان */}
        <h2 style={{
          fontSize: '2rem',
          fontWeight: 900,
          color: 'white',
          textAlign: 'center',
          marginBottom: '2rem',
        }}>
          {step === 'team' && '👥 اختر الفريق'}
          {step === 'card' && '🎴 اختر البطاقة'}
        </h2>

        {/* Step 1: اختيار الفريق */}
        {step === 'team' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '2rem',
          }}>
            <button
              onClick={() => handleTeamSelect('green')}
              style={{
                padding: '3rem 2rem',
                background: 'linear-gradient(135deg, #10b981, #14b8a6)',
                border: 'none',
                borderRadius: '1.5rem',
                color: 'white',
                fontSize: '2rem',
                fontWeight: 900,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              🟢<br/>الفريق الأخضر
              <div style={{ fontSize: '1rem', marginTop: '1rem' }}>
                {teamCards.green.length} بطاقة
              </div>
            </button>

            <button
              onClick={() => handleTeamSelect('red')}
              style={{
                padding: '3rem 2rem',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                border: 'none',
                borderRadius: '1.5rem',
                color: 'white',
                fontSize: '2rem',
                fontWeight: 900,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              🔴<br/>الفريق الأحمر
              <div style={{ fontSize: '1rem', marginTop: '1rem' }}>
                {teamCards.red.length} بطاقة
              </div>
            </button>
          </div>
        )}

        {/* Step 2: اختيار البطاقة */}
        {step === 'card' && selectedTeam && (
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}>
              {Object.values(CARD_PERMISSIONS)
                .filter(card => enabledCards[card.id] && teamCards[selectedTeam].includes(card.id))
                .map((card) => {
                  const count = teamCards[selectedTeam].filter(c => c === card.id).length;

                  return (
                    <button
                      key={card.id}
                      onClick={() => handleCardSelect(card.id)}
                      style={{
                        padding: '1.5rem 1rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '2px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '1rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: 'white',
                        position: 'relative',
                      }}
                    >
                      <div style={{ fontSize: '3rem' }}>{card.nameAr.split(' ')[0]}</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700 }}>
                        {card.nameAr.substring(2)}
                      </div>
                      <div style={{
                        position: 'absolute',
                        top: '5px',
                        right: '5px',
                        background: '#a855f7',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 900,
                      }}>
                        {count}
                      </div>
                    </button>
                  );
                })}
            </div>

            {/* رسالة خطأ */}
            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '2px solid rgba(239, 68, 68, 0.5)',
                borderRadius: '1rem',
                padding: '1rem',
                color: '#fca5a5',
                textAlign: 'center',
                fontSize: '1rem',
                fontWeight: 700,
              }}>
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

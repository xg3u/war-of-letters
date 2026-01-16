// src/components/ActionCardPanel.tsx
// لوحة البطاقات للمقدم

import React, { useState } from 'react';
import { 
  Snowflake, 
  Bomb, 
  Swords, 
  Shield, 
  Shuffle, 
  Zap, 
  Sparkles,
  X
} from 'lucide-react';

export type CardType = 'freeze' | 'bomb' | 'battle' | 'shield' | 'demonShuffle' | 'speedUp' | 'luck';

interface ActionCard {
  id: CardType;
  name: string;
  nameAr: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

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
  const [isOpen, setIsOpen] = useState(true);
  const [selectedCard, setSelectedCard] = useState<ActionCard | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<'green' | 'red' | null>(null);
  const [showError, setShowError] = useState<string | null>(null);

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  const cards: ActionCard[] = [
    {
      id: 'freeze',
      name: 'Freeze',
      nameAr: '🧊 التجميد',
      icon: <Snowflake size={32} />,
      color: '#60a5fa',
      description: 'يجمد الخلية المحددة ويمنع الفريق من استخدامها',
    },
    {
      id: 'bomb',
      name: 'Bomb',
      nameAr: '💣 القنبلة',
      icon: <Bomb size={32} />,
      color: '#f87171',
      description: 'يفجر الخلية ويزيل الحرف منها',
    },
    {
      id: 'battle',
      name: 'Battle',
      nameAr: '⚔️ المعركة',
      icon: <Swords size={32} />,
      color: '#fb923c',
      description: 'معركة بين الفريقين على الخلية',
    },
    {
      id: 'shield',
      name: 'Shield',
      nameAr: '🛡️ الدرع',
      icon: <Shield size={32} />,
      color: '#34d399',
      description: 'يحمي الخلية من البطاقات الأخرى',
    },
    {
      id: 'demonShuffle',
      name: 'Demon Shuffle',
      nameAr: '👹 خلط الشيطان',
      icon: <Shuffle size={32} />,
      color: '#a855f7',
      description: 'يخلط جميع الحروف بشكل عشوائي',
    },
    {
      id: 'speedUp',
      name: 'Speed Up',
      nameAr: '⚡ تسريع',
      icon: <Zap size={32} />,
      color: '#facc15',
      description: 'يقلل الوقت المتاح للإجابة',
    },
    {
      id: 'luck',
      name: 'Luck',
      nameAr: '🍀 الحظ',
      icon: <Sparkles size={32} />,
      color: '#f472b6',
      description: 'يمنح الفريق فرصة إضافية',
    },
  ].filter(card => enabledCards[card.id]);

  const handleCardClick = (card: ActionCard) => {
    setSelectedCard(card);
  };

  const handleConfirmUse = () => {
    if (!selectedCard) return;

    if (!selectedCell) {
      setShowError('⚠️ يجب اختيار الحرف المراد تفعيل البطاقة عليه!');
      return;
    }

    if (!selectedTeam) {
      setShowError('⚠️ يجب اختيار الفريق الذي يريد استخدام البطاقة!');
      return;
    }

    const teamHasCard = teamCards[selectedTeam].includes(selectedCard.id);
    if (!teamHasCard) {
      setShowError(`❌ الفريق ${selectedTeam === 'green' ? 'الأخضر' : 'الأحمر'} ليس لديه بطاقة "${selectedCard.nameAr}"!`);
      return;
    }

    onCardUse(selectedCard.id, selectedCell);
    setSelectedCard(null);
    setSelectedTeam(null);
    setShowError(null);
    handleClose();
  };

  return (
    <>
      {/* نافذة البطاقات */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
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
              onClick={handleClose}
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
              🎴 بطاقات الحركة
            </h2>

            {/* البطاقات */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1rem',
              marginBottom: selectedCard ? '2rem' : 0,
            }}>
              {cards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => handleCardClick(card)}
                  style={{
                    padding: '1.5rem 1rem',
                    background: selectedCard?.id === card.id 
                      ? `linear-gradient(135deg, ${card.color}, ${card.color}dd)`
                      : 'rgba(255, 255, 255, 0.05)',
                    border: selectedCard?.id === card.id
                      ? `3px solid ${card.color}`
                      : '2px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'white',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCard?.id !== card.id) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.transform = 'translateY(-5px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCard?.id !== card.id) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <div style={{ color: card.color }}>
                    {card.icon}
                  </div>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                  }}>
                    {card.nameAr}
                  </div>
                </button>
              ))}
            </div>

            {/* معلومات البطاقة المحددة */}
            {selectedCard && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '1rem',
                padding: '1.5rem',
                marginBottom: '1rem',
              }}>
                <div style={{
                  color: '#a855f7',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  marginBottom: '0.5rem',
                }}>
                  الوصف:
                </div>
                <div style={{
                  color: 'white',
                  fontSize: '1rem',
                  lineHeight: '1.6',
                }}>
                  {selectedCard.description}
                </div>
              </div>
            )}

            {/* اختيار الفريق */}
            {selectedCard && (
              <div style={{
                marginBottom: '1rem',
              }}>
                <div style={{
                  color: '#a855f7',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  marginBottom: '0.75rem',
                }}>
                  اختر الفريق:
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                }}>
                  <button
                    onClick={() => {
                      setSelectedTeam('green');
                      setShowError(null);
                    }}
                    style={{
                      padding: '1rem',
                      background: selectedTeam === 'green' 
                        ? 'linear-gradient(135deg, #48bb78, #38a169)'
                        : 'rgba(72, 187, 120, 0.2)',
                      border: selectedTeam === 'green'
                        ? '3px solid #48bb78'
                        : '2px solid rgba(72, 187, 120, 0.3)',
                      borderRadius: '0.75rem',
                      color: 'white',
                      fontSize: '1rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    🟢 الفريق الأخضر
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTeam('red');
                      setShowError(null);
                    }}
                    style={{
                      padding: '1rem',
                      background: selectedTeam === 'red'
                        ? 'linear-gradient(135deg, #f56565, #e53e3e)'
                        : 'rgba(245, 101, 101, 0.2)',
                      border: selectedTeam === 'red'
                        ? '3px solid #f56565'
                        : '2px solid rgba(245, 101, 101, 0.3)',
                      borderRadius: '0.75rem',
                      color: 'white',
                      fontSize: '1rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    🔴 الفريق الأحمر
                  </button>
                </div>
              </div>
            )}

            {/* معلومات الخلية المحددة */}
            {selectedCard && selectedCell && (
              <div style={{
                background: 'rgba(168, 85, 247, 0.1)',
                border: '2px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '0.75rem',
                padding: '0.75rem',
                marginBottom: '1rem',
                textAlign: 'center',
              }}>
                <div style={{
                  color: '#a855f7',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                }}>
                  ✅ الخلية المحددة: <strong style={{ fontSize: '1.25rem' }}>{selectedCell}</strong>
                </div>
              </div>
            )}

            {/* رسالة الخطأ */}
            {showError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '2px solid rgba(239, 68, 68, 0.5)',
                borderRadius: '0.75rem',
                padding: '1rem',
                marginBottom: '1rem',
                textAlign: 'center',
                color: '#fca5a5',
                fontSize: '1rem',
                fontWeight: 700,
              }}>
                {showError}
              </div>
            )}

            {/* زر الاستخدام */}
            {selectedCard && (
              <button
                onClick={handleConfirmUse}
                style={{
                  width: '100%',
                  padding: '1.25rem',
                  background: `linear-gradient(135deg, ${selectedCard.color}, ${selectedCard.color}dd)`,
                  border: 'none',
                  borderRadius: '1rem',
                  color: 'white',
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = `0 10px 30px ${selectedCard.color}80`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                استخدام البطاقة ✨
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};
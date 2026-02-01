// src/components/ActionCardPanel.tsx
// لوحة البطاقات - تصميم عصري وأنيق

import React, { useState, useMemo } from 'react';
import { X, ArrowRight, AlertCircle } from 'lucide-react';
import { CARD_PERMISSIONS, canUseCardOnCell } from '../utils/cardPermissions';
import type { CardType, HexCell } from '../core/types';

export type { CardType };

interface ActionCardPanelProps {
  onCardUse: (cardType: CardType, targetCellId: string, team: 'green' | 'red') => void;
  enabledCards: {
    freeze: boolean;
    bomb: boolean;
    battle: boolean;
    shield: boolean;
  };
  cells: HexCell[];
  teamCards: {
    green: CardType[];
    red: CardType[];
  };
  teamNames: {
    green: string;
    red: string;
  };
  onClose: () => void;
}

const CARD_ICONS: Record<CardType, string> = {
  freeze: '🧊',
  bomb: '💣',
  battle: '⚔️',
  shield: '🛡️',
};

const CARD_COLORS: Record<CardType, { primary: string; glow: string }> = {
  freeze: { primary: '#0ea5e9', glow: 'rgba(14, 165, 233, 0.5)' },
  bomb: { primary: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)' },
  battle: { primary: '#f97316', glow: 'rgba(249, 115, 22, 0.5)' },
  shield: { primary: '#10b981', glow: 'rgba(16, 185, 129, 0.5)' },
};

const CARD_NAMES: Record<CardType, string> = {
  freeze: 'التجميد',
  bomb: 'القنبلة',
  battle: 'المعركة',
  shield: 'الدرع',
};

export const ActionCardPanel: React.FC<ActionCardPanelProps> = ({
  onCardUse,
  enabledCards,
  cells,
  teamCards,
  teamNames,
  onClose,
}) => {
  const [step, setStep] = useState<'team' | 'card' | 'target'>('team');
  const [selectedTeam, setSelectedTeam] = useState<'green' | 'red' | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const teamUniqueCards = useMemo(() => {
    if (!selectedTeam) return [];
    const cards = teamCards[selectedTeam];
    const uniqueCards: { card: CardType; count: number }[] = [];

    cards.forEach(card => {
      const existing = uniqueCards.find(c => c.card === card);
      if (existing) {
        existing.count++;
      } else {
        uniqueCards.push({ card, count: 1 });
      }
    });

    return uniqueCards.filter(c => enabledCards[c.card]);
  }, [selectedTeam, teamCards, enabledCards]);

  const validTargetCells = useMemo(() => {
    if (!selectedCard || !selectedTeam) return [];
    return cells.filter(cell => {
      const result = canUseCardOnCell(selectedCard, cell, selectedTeam);
      return result.allowed;
    });
  }, [selectedCard, selectedTeam, cells]);

  const handleTeamSelect = (team: 'green' | 'red') => {
    if (teamCards[team].length === 0) {
      setError(`${teamNames[team]} لا يملك أي بطاقات!`);
      return;
    }
    setSelectedTeam(team);
    setStep('card');
    setError(null);
  };

  const handleCardSelect = (card: CardType) => {
    setSelectedCard(card);
    setStep('target');
    setError(null);
  };

  const handleTargetSelect = (cellId: string) => {
    if (!selectedCard || !selectedTeam) return;
    const cell = cells.find(c => c.id === cellId);
    if (!cell) return;

    const result = canUseCardOnCell(selectedCard, cell, selectedTeam);
    if (!result.allowed) {
      setError(result.reason || 'لا يمكن استخدام البطاقة على هذه الخلية');
      return;
    }

    onCardUse(selectedCard, cellId, selectedTeam);
    onClose();
  };

  const handleBack = () => {
    if (step === 'target') {
      setStep('card');
      setSelectedCard(null);
    } else if (step === 'card') {
      setStep('team');
      setSelectedTeam(null);
    }
    setError(null);
  };

  // ترتيب الخلايا في صفوف
  const gridRows = useMemo(() => {
    const rows: HexCell[][] = [];
    for (let r = 0; r < 5; r++) {
      rows.push(cells.filter(c => c.r === r).sort((a, b) => a.q - b.q));
    }
    return rows;
  }, [cells]);

  const cardColor = selectedCard ? CARD_COLORS[selectedCard] : null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(135deg, rgba(15, 10, 40, 0.98) 0%, rgba(30, 15, 60, 0.98) 100%)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '1rem',
      direction: 'rtl',
    }}>
      <div style={{
        maxWidth: step === 'target' ? '900px' : '650px',
        width: '100%',
        background: 'linear-gradient(145deg, rgba(30, 20, 60, 0.95) 0%, rgba(45, 25, 80, 0.95) 100%)',
        border: '2px solid rgba(139, 92, 246, 0.4)',
        borderRadius: '2rem',
        padding: '2rem',
        position: 'relative',
        maxHeight: '95vh',
        overflow: 'auto',
        boxShadow: '0 25px 80px rgba(0, 0, 0, 0.5), 0 0 60px rgba(139, 92, 246, 0.15)',
      }}>
        {/* زر الإغلاق */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            left: '1rem',
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '2px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <X size={22} />
        </button>

        {/* زر الرجوع */}
        {step !== 'team' && (
          <button
            onClick={handleBack}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              padding: '0.6rem 1.2rem',
              borderRadius: '12px',
              background: 'rgba(139, 92, 246, 0.15)',
              border: '2px solid rgba(139, 92, 246, 0.4)',
              color: '#a78bfa',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(139, 92, 246, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
            }}
          >
            <ArrowRight size={18} />
            رجوع
          </button>
        )}

        {/* مؤشر الخطوات */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          marginTop: '0.5rem',
        }}>
          {[
            { key: 'team', label: 'الفريق', icon: '👥' },
            { key: 'card', label: 'البطاقة', icon: '🎴' },
            { key: 'target', label: 'الهدف', icon: '🎯' },
          ].map((s, i, arr) => {
            const currentIndex = ['team', 'card', 'target'].indexOf(step);
            const isActive = step === s.key;
            const isComplete = currentIndex > i;

            return (
              <React.Fragment key={s.key}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '2rem',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.4), rgba(168, 85, 247, 0.3))'
                    : isComplete
                      ? 'rgba(16, 185, 129, 0.2)'
                      : 'rgba(255, 255, 255, 0.05)',
                  border: isActive
                    ? '2px solid rgba(168, 85, 247, 0.6)'
                    : isComplete
                      ? '2px solid rgba(16, 185, 129, 0.4)'
                      : '2px solid transparent',
                  transition: 'all 0.3s ease',
                }}>
                  <span style={{ fontSize: '1.1rem' }}>{isComplete ? '✓' : s.icon}</span>
                  <span style={{
                    color: isActive ? '#e9d5ff' : isComplete ? '#86efac' : 'rgba(255,255,255,0.5)',
                    fontSize: '0.85rem',
                    fontWeight: isActive ? 700 : 500,
                  }}>
                    {s.label}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div style={{
                    color: 'rgba(255,255,255,0.2)',
                    fontSize: '1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                  }}>
                    ←
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* العنوان */}
        <h2 style={{
          fontSize: '1.6rem',
          fontWeight: 900,
          color: 'white',
          textAlign: 'center',
          marginBottom: '1.5rem',
          textShadow: '0 2px 10px rgba(0,0,0,0.3)',
        }}>
          {step === 'team' && '👥 أي فريق يريد استخدام بطاقة؟'}
          {step === 'card' && `🎴 اختر البطاقة`}
          {step === 'target' && `🎯 اختر الحرف المستهدف`}
        </h2>

        {/* رسالة الخطأ */}
        {error && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1))',
            border: '2px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '1rem',
            padding: '1rem 1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
          }}>
            <AlertCircle size={22} color="#f87171" />
            <span style={{ color: '#fca5a5', fontWeight: 600, fontSize: '1rem' }}>
              {error}
            </span>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* الخطوة 1: اختيار الفريق */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {step === 'team' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
          }}>
            {(['green', 'red'] as const).map((team) => {
              const hasCards = teamCards[team].length > 0;
              const teamColor = team === 'green' ? '#10b981' : '#ef4444';

              return (
                <button
                  key={team}
                  onClick={() => handleTeamSelect(team)}
                  disabled={!hasCards}
                  style={{
                    padding: '2rem',
                    background: hasCards
                      ? `linear-gradient(145deg, ${teamColor}20, ${teamColor}10)`
                      : 'linear-gradient(145deg, rgba(75, 85, 99, 0.2), rgba(55, 65, 81, 0.1))',
                    border: `3px solid ${hasCards ? teamColor : 'rgba(107, 114, 128, 0.3)'}`,
                    borderRadius: '1.5rem',
                    color: 'white',
                    cursor: hasCards ? 'pointer' : 'not-allowed',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    opacity: hasCards ? 1 : 0.5,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => {
                    if (hasCards) {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = `0 15px 40px ${teamColor}40`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${teamColor}, ${teamColor}cc)`,
                    margin: '0 auto 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    boxShadow: `0 8px 25px ${teamColor}50`,
                  }}>
                    {team === 'green' ? '🟢' : '🔴'}
                  </div>

                  <div style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.75rem' }}>
                    {teamNames[team]}
                  </div>

                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1.25rem',
                    background: hasCards ? `${teamColor}30` : 'rgba(107, 114, 128, 0.2)',
                    borderRadius: '2rem',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>{hasCards ? '🎴' : '📭'}</span>
                    {hasCards ? `${teamCards[team].length} بطاقة` : 'لا توجد بطاقات'}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* الخطوة 2: اختيار البطاقة */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {step === 'card' && selectedTeam && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '1rem',
          }}>
            {teamUniqueCards.map(({ card, count }) => {
              const color = CARD_COLORS[card];
              const permission = CARD_PERMISSIONS[card];

              return (
                <button
                  key={card}
                  onClick={() => handleCardSelect(card)}
                  style={{
                    padding: '1.5rem 1rem',
                    background: `linear-gradient(145deg, ${color.primary}25, ${color.primary}10)`,
                    border: `3px solid ${color.primary}`,
                    borderRadius: '1.25rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'white',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05) translateY(-3px)';
                    e.currentTarget.style.boxShadow = `0 15px 35px ${color.glow}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1) translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* عدد البطاقات */}
                  <div style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '-10px',
                    background: `linear-gradient(135deg, ${color.primary}, ${color.primary}cc)`,
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem',
                    fontWeight: 900,
                    boxShadow: `0 4px 15px ${color.glow}`,
                    border: '2px solid rgba(255,255,255,0.3)',
                  }}>
                    {count}
                  </div>

                  <div style={{
                    fontSize: '3.5rem',
                    filter: `drop-shadow(0 4px 8px ${color.glow})`,
                  }}>
                    {CARD_ICONS[card]}
                  </div>

                  <div style={{
                    fontSize: '1.1rem',
                    fontWeight: 800,
                    color: color.primary,
                  }}>
                    {CARD_NAMES[card]}
                  </div>

                  <div style={{
                    fontSize: '0.7rem',
                    color: 'rgba(255,255,255,0.6)',
                    textAlign: 'center',
                    lineHeight: 1.4,
                    padding: '0 0.5rem',
                  }}>
                    {permission.description.length > 40
                      ? permission.description.substring(0, 40) + '...'
                      : permission.description
                    }
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* الخطوة 3: اختيار الهدف - تصميم عصري */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {step === 'target' && selectedCard && selectedTeam && cardColor && (
          <div>
            {/* معلومات البطاقة المختارة */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              marginBottom: '1.5rem',
              padding: '1rem 1.5rem',
              background: `linear-gradient(135deg, ${cardColor.primary}20, transparent)`,
              borderRadius: '1rem',
              border: `2px solid ${cardColor.primary}40`,
            }}>
              <div style={{
                fontSize: '2.5rem',
                filter: `drop-shadow(0 0 15px ${cardColor.glow})`,
              }}>
                {CARD_ICONS[selectedCard]}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  color: cardColor.primary,
                  fontWeight: 900,
                  fontSize: '1.2rem',
                }}>
                  {CARD_NAMES[selectedCard]}
                </div>
                <div style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '0.85rem',
                }}>
                  {CARD_PERMISSIONS[selectedCard].description}
                </div>
              </div>
            </div>

            {/* تعليمات */}
            <div style={{
              textAlign: 'center',
              marginBottom: '1.25rem',
              padding: '0.75rem 1.5rem',
              borderRadius: '2rem',
              background: validTargetCells.length > 0
                ? 'rgba(16, 185, 129, 0.15)'
                : 'rgba(239, 68, 68, 0.15)',
              border: validTargetCells.length > 0
                ? '2px solid rgba(16, 185, 129, 0.4)'
                : '2px solid rgba(239, 68, 68, 0.4)',
              display: 'inline-block',
            }}>
              <span style={{
                color: validTargetCells.length > 0 ? '#6ee7b7' : '#fca5a5',
                fontSize: '0.95rem',
                fontWeight: 700,
              }}>
                {validTargetCells.length > 0
                  ? `✅ ${validTargetCells.length} حرف متاح للاستهداف`
                  : '❌ لا توجد أهداف صالحة'}
              </span>
            </div>

            {/* شبكة الخلايا - تصميم جديد */}
            <div style={{
              background: 'linear-gradient(145deg, rgba(15, 10, 35, 0.8), rgba(25, 15, 50, 0.8))',
              borderRadius: '1.5rem',
              padding: '1.5rem',
              border: '2px solid rgba(139, 92, 246, 0.2)',
              boxShadow: 'inset 0 0 30px rgba(0, 0, 0, 0.3)',
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}>
                {gridRows.map((row, rowIndex) => (
                  <div
                    key={rowIndex}
                    style={{
                      display: 'flex',
                      gap: '8px',
                      marginRight: rowIndex % 2 === 0 ? '0' : '35px',
                    }}
                  >
                    {row.map((cell) => {
                      const isValid = validTargetCells.some(c => c.id === cell.id);
                      const isHovered = hoveredCell === cell.id;
                      const isDestroyed = cell.status === 'destroyed';

                      // تحديد ألوان الخلية
                      let bgGradient = 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))';
                      let borderColor = 'rgba(255,255,255,0.15)';
                      let textColor = 'rgba(255,255,255,0.6)';
                      let glowShadow = 'none';

                      if (isDestroyed) {
                        bgGradient = 'linear-gradient(145deg, rgba(30,30,30,0.8), rgba(20,20,20,0.8))';
                        borderColor = 'rgba(100,100,100,0.3)';
                        textColor = 'rgba(100,100,100,0.5)';
                      } else if (cell.isFrozen) {
                        bgGradient = 'linear-gradient(145deg, rgba(56, 189, 248, 0.3), rgba(14, 165, 233, 0.2))';
                        borderColor = '#38bdf8';
                        textColor = '#bae6fd';
                        glowShadow = '0 0 20px rgba(56, 189, 248, 0.3)';
                      } else if (cell.status === 'green') {
                        bgGradient = 'linear-gradient(145deg, rgba(16, 185, 129, 0.4), rgba(5, 150, 105, 0.3))';
                        borderColor = '#10b981';
                        textColor = 'white';
                        glowShadow = '0 0 15px rgba(16, 185, 129, 0.3)';
                      } else if (cell.status === 'red') {
                        bgGradient = 'linear-gradient(145deg, rgba(239, 68, 68, 0.4), rgba(220, 38, 38, 0.3))';
                        borderColor = '#ef4444';
                        textColor = 'white';
                        glowShadow = '0 0 15px rgba(239, 68, 68, 0.3)';
                      }

                      if (isValid) {
                        bgGradient = `linear-gradient(145deg, ${cardColor.primary}40, ${cardColor.primary}20)`;
                        borderColor = cardColor.primary;
                        textColor = 'white';
                        glowShadow = `0 0 25px ${cardColor.glow}`;
                      }

                      if (isHovered && isValid) {
                        bgGradient = `linear-gradient(145deg, ${cardColor.primary}60, ${cardColor.primary}40)`;
                        glowShadow = `0 0 40px ${cardColor.glow}, 0 0 60px ${cardColor.glow}`;
                      }

                      return (
                        <div
                          key={cell.id}
                          onClick={() => isValid && handleTargetSelect(cell.id)}
                          onMouseEnter={() => setHoveredCell(cell.id)}
                          onMouseLeave={() => setHoveredCell(null)}
                          style={{
                            width: '62px',
                            height: '70px',
                            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                            background: bgGradient,
                            border: `3px solid ${borderColor}`,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: isValid ? 'pointer' : 'not-allowed',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: isHovered && isValid ? 'scale(1.15)' : 'scale(1)',
                            boxShadow: glowShadow,
                            position: 'relative',
                            zIndex: isHovered && isValid ? 10 : 1,
                          }}
                        >
                          {/* الحرف */}
                          {!isDestroyed && (
                            <span style={{
                              fontSize: '1.4rem',
                              fontWeight: 900,
                              color: textColor,
                              textShadow: isValid ? `0 0 10px ${cardColor.glow}` : 'none',
                              fontFamily: "'Tajawal', sans-serif",
                            }}>
                              {cell.letter}
                            </span>
                          )}

                          {/* أيقونة التجميد */}
                          {cell.isFrozen && (
                            <span style={{
                              position: 'absolute',
                              top: '4px',
                              right: '8px',
                              fontSize: '0.7rem',
                            }}>
                              ❄️
                            </span>
                          )}

                          {/* أيقونة الحماية */}
                          {cell.isShielded && (
                            <span style={{
                              position: 'absolute',
                              top: '4px',
                              left: '8px',
                              fontSize: '0.6rem',
                            }}>
                              🛡️
                            </span>
                          )}

                          {/* علامة المدمر */}
                          {isDestroyed && (
                            <span style={{ fontSize: '1.5rem', opacity: 0.5 }}>💥</span>
                          )}

                          {/* حلقة الاستهداف */}
                          {isValid && (
                            <div style={{
                              position: 'absolute',
                              inset: '-6px',
                              border: `2px dashed ${cardColor.primary}`,
                              borderRadius: '12px',
                              animation: 'targetPulse 1.5s ease-in-out infinite',
                            }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* مفتاح الألوان */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '1.5rem',
                marginTop: '1.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(255,255,255,0.1)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: '#10b981',
                  }} />
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                    {teamNames.green}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: '#ef4444',
                  }} />
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                    {teamNames.red}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.3)',
                  }} />
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                    غير مجاب
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: cardColor.primary,
                    boxShadow: `0 0 8px ${cardColor.glow}`,
                  }} />
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                    متاح للاستهداف
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes targetPulse {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
};

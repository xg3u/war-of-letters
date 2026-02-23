// src/components/GameSettings.tsx
// صفحة إعدادات اللعبة - اختيار الطور مع تتوريل

import React, { useState } from 'react';
import { ArrowLeft, Target, Dice5, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useScreenSize } from '../hooks/useScreenSize';
import { useTheme } from '../context/ThemeContext';

interface GameSettingsProps {
  onBack: () => void;
  onStartGame: (settings: GameSettingsData) => void;
}

export interface GameSettingsData {
  gameName: string;
  teamNames: { green: string; red: string };

  winCondition: 'wall-to-wall' | 'five-connected' | 'most-letters' | 'all';
  teamColors: {
    green: 'horizontal' | 'vertical' | 'both';
    red: 'horizontal' | 'vertical' | 'both';
  };

  rounds: 3 | 5 | number | 'infinite';

  enableCards: boolean;
  enableRandomLetter: boolean;
  enableStreakReward: boolean;
  enableHiddenCards: boolean;
  hiddenCardsCount: number;
  enableGoldenLetter: boolean;
  cardDistribution: 'random' | 'manual';
  showCardLocations: 'always' | 'on-press' | 'hidden';
  cardTypes: {
    freeze: boolean;
    bomb: boolean;
    battle: boolean;
    shield: boolean;
  };

  carryCardsToNextRound: boolean;
  selectedCategories: string[];
  gameMode: 'normal' | 'tv-show';
  showQuestionsToTeams: boolean;
  timePerQuestion: number;
}

// ── Tutorial Overlay ──────────────────────────────────────────────────────────
const TutorialOverlay: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { isMobile } = useScreenSize();

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.92)',
      backdropFilter: 'blur(16px)',
      zIndex: 9000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        maxWidth: '680px',
        width: '100%',
        background: 'linear-gradient(135deg, #1a0b2e, #2d1154)',
        border: '2px solid rgba(168,85,247,0.5)',
        borderRadius: '2rem',
        padding: isMobile ? '1.5rem' : '2.5rem',
        boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
      }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? '1.5rem' : '2rem' }}>
          <div style={{ fontSize: isMobile ? '2.5rem' : '3.5rem', marginBottom: '0.75rem' }}>⚙️</div>
          <h2 style={{
            fontSize: isMobile ? '1.4rem' : '1.9rem',
            fontWeight: 900,
            color: 'white',
            margin: 0,
          }}>
            اختر طور اللعبة
          </h2>
          <p style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: isMobile ? '0.85rem' : '0.95rem',
            marginTop: '0.5rem',
          }}>
            كل طور يعطيك تجربة مختلفة – اختر اللي يناسبك
          </p>
        </div>

        {/* Mode Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: '1rem',
          marginBottom: isMobile ? '1.5rem' : '2rem',
        }}>
          {/* Classic */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(37,99,235,0.15))',
            border: '2px solid rgba(59,130,246,0.5)',
            borderRadius: '1.25rem',
            padding: '1.25rem',
          }}>
            <div style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>🏛️</div>
            <div style={{ color: '#93c5fd', fontWeight: 900, fontSize: '1.1rem', marginBottom: '0.4rem' }}>
              الكلاسيك
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', lineHeight: 1.6 }}>
              لعبة بسيطة وسريعة<br />
              بدون بطاقات خاصة<br />
              التركيز على الأسئلة والإجابات
            </div>
          </div>

          {/* War */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(236,72,153,0.2), rgba(168,85,247,0.15))',
            border: '2px solid rgba(236,72,153,0.5)',
            borderRadius: '1.25rem',
            padding: '1.25rem',
          }}>
            <div style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>⚔️</div>
            <div style={{ color: '#f9a8d4', fontWeight: 900, fontSize: '1.1rem', marginBottom: '0.4rem' }}>
              الحرب
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', lineHeight: 1.6 }}>
              تجربة استراتيجية كاملة<br />
              بطاقات: تجميد، قنابل، معارك، دروع<br />
              تحديات إضافية بين الجولات
            </div>
          </div>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: isMobile ? '0.9rem' : '1.1rem',
            background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
            border: 'none',
            borderRadius: '1rem',
            color: 'white',
            fontSize: '1rem',
            fontWeight: 900,
            cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(168,85,247,0.4)',
          }}
        >
          فهمت، ابدأ الإعداد 🚀
        </button>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
export const GameSettings: React.FC<GameSettingsProps> = ({ onBack, onStartGame }) => {
  const { isMobile } = useScreenSize();
  const { theme } = useTheme();

  const [showTutorial, setShowTutorial] = useState(() =>
    localStorage.getItem('settingsTutorialSeen') !== 'true'
  );

  const [selectedMode, setSelectedMode] = useState<'classic' | 'war'>('war');

  const [settings, setSettings] = useState<GameSettingsData>({
    gameName: '',
    teamNames: { green: 'الفريق الأخضر', red: 'الفريق الأحمر' },
    winCondition: 'all',
    teamColors: { green: 'horizontal', red: 'vertical' },
    rounds: 3,
    enableCards: true,
    enableRandomLetter: true,
    enableStreakReward: true,
    enableHiddenCards: true,
    hiddenCardsCount: 5,
    enableGoldenLetter: true,
    cardDistribution: 'random',
    showCardLocations: 'on-press',
    cardTypes: { freeze: true, bomb: true, battle: true, shield: true },
    carryCardsToNextRound: false,
    selectedCategories: [],
    gameMode: 'normal',
    showQuestionsToTeams: true,
    timePerQuestion: 30,
  });

  const [customRounds, setCustomRounds] = useState<number>(7);
  const [showAdvancedCards, setShowAdvancedCards] = useState(false);

  const handleCloseTutorial = () => {
    localStorage.setItem('settingsTutorialSeen', 'true');
    setShowTutorial(false);
  };

  const handleModeSelect = (mode: 'classic' | 'war') => {
    setSelectedMode(mode);
    const isWar = mode === 'war';
    setSettings(prev => ({
      ...prev,
      enableCards: isWar,
      enableRandomLetter: isWar,
      enableStreakReward: isWar,
      enableHiddenCards: isWar,
      enableGoldenLetter: isWar,
    }));
  };

  const handleStart = () => {
    if (settings.gameName.trim() === '') {
      alert('⚠️ الرجاء إدخال اسم اللعبة');
      return;
    }
    onStartGame(settings);
  };

  const toggleCardType = (cardType: keyof typeof settings.cardTypes) => {
    setSettings(prev => ({
      ...prev,
      cardTypes: { ...prev.cardTypes, [cardType]: !prev.cardTypes[cardType] },
    }));
  };

  // ── Divider ────────────────────────────────────────────────────────────────
  const Divider = () => (
    <div style={{
      height: '1px',
      background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.4), transparent)',
      margin: '1.75rem 0',
    }} />
  );

  // ── Section Label ──────────────────────────────────────────────────────────
  const SectionLabel: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.6rem',
      fontSize: '1.1rem',
      fontWeight: 900,
      color: 'white',
      marginBottom: '0.9rem',
    }}>
      {icon}
      {text}
    </div>
  );

  return (
    <>
      {showTutorial && <TutorialOverlay onClose={handleCloseTutorial} />}

      <div style={{
        minHeight: '100vh',
        background: theme.bgGradient,
        padding: isMobile ? '1rem' : '2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflowY: 'auto',
      }}>

        {/* ── Header ── */}
        <div style={{
          width: '100%',
          maxWidth: '760px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
        }}>
          <button
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: isMobile ? '0.65rem' : '0.65rem 1.25rem',
              background: 'rgba(255,255,255,0.1)',
              border: '2px solid rgba(255,255,255,0.2)',
              borderRadius: '0.85rem',
              color: 'white',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={18} />
            {!isMobile && 'رجوع'}
          </button>

          <h1 style={{
            fontSize: isMobile ? '1.4rem' : '1.9rem',
            fontWeight: 900,
            color: 'white',
            margin: 0,
          }}>
            إعداد اللعبة ⚙️
          </h1>

          {/* Help button to reopen tutorial */}
          <button
            onClick={() => setShowTutorial(true)}
            title="عرض التتوريل"
            style={{
              padding: '0.65rem',
              background: 'rgba(168,85,247,0.15)',
              border: '2px solid rgba(168,85,247,0.3)',
              borderRadius: '0.85rem',
              color: '#c4b5fd',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              minWidth: '40px',
            }}
          >
            ؟
          </button>
        </div>

        {/* ── Card Wrapper ── */}
        <div style={{
          width: '100%',
          maxWidth: '760px',
          background: 'rgba(26,11,46,0.55)',
          backdropFilter: 'blur(20px)',
          borderRadius: '1.75rem',
          border: '2px solid rgba(168,85,247,0.3)',
          padding: isMobile ? '1.25rem' : '2rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}>

          {/* ══ STEP 1: Mode Selector ══ */}
          <div style={{ marginBottom: '0.5rem' }}>
            <SectionLabel
              icon={<span style={{ fontSize: '1.25rem' }}>⚡</span>}
              text="اختر طور اللعبة"
            />

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.85rem',
            }}>
              {/* Classic */}
              <button
                onClick={() => handleModeSelect('classic')}
                style={{
                  padding: isMobile ? '1rem 0.75rem' : '1.25rem 1rem',
                  background: selectedMode === 'classic'
                    ? 'linear-gradient(135deg, rgba(59,130,246,0.35), rgba(37,99,235,0.25))'
                    : 'rgba(255,255,255,0.05)',
                  border: selectedMode === 'classic'
                    ? '3px solid #3b82f6'
                    : '2px solid rgba(255,255,255,0.15)',
                  borderRadius: '1.25rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.25s ease',
                  boxShadow: selectedMode === 'classic'
                    ? '0 0 20px rgba(59,130,246,0.3)'
                    : 'none',
                }}
              >
                <div style={{ fontSize: isMobile ? '2rem' : '2.5rem', marginBottom: '0.4rem' }}>🏛️</div>
                <div style={{
                  color: selectedMode === 'classic' ? '#93c5fd' : 'rgba(255,255,255,0.8)',
                  fontWeight: 900,
                  fontSize: isMobile ? '1rem' : '1.15rem',
                  marginBottom: '0.3rem',
                }}>
                  الكلاسيك
                </div>
                <div style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: isMobile ? '0.72rem' : '0.8rem',
                  lineHeight: 1.4,
                }}>
                  بدون بطاقات<br />تجربة بسيطة
                </div>
                {selectedMode === 'classic' && (
                  <div style={{
                    marginTop: '0.5rem',
                    fontSize: '1rem',
                    color: '#3b82f6',
                  }}>✓</div>
                )}
              </button>

              {/* War */}
              <button
                onClick={() => handleModeSelect('war')}
                style={{
                  padding: isMobile ? '1rem 0.75rem' : '1.25rem 1rem',
                  background: selectedMode === 'war'
                    ? 'linear-gradient(135deg, rgba(236,72,153,0.35), rgba(168,85,247,0.25))'
                    : 'rgba(255,255,255,0.05)',
                  border: selectedMode === 'war'
                    ? '3px solid #ec4899'
                    : '2px solid rgba(255,255,255,0.15)',
                  borderRadius: '1.25rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.25s ease',
                  boxShadow: selectedMode === 'war'
                    ? '0 0 20px rgba(236,72,153,0.3)'
                    : 'none',
                }}
              >
                <div style={{ fontSize: isMobile ? '2rem' : '2.5rem', marginBottom: '0.4rem' }}>⚔️</div>
                <div style={{
                  color: selectedMode === 'war' ? '#f9a8d4' : 'rgba(255,255,255,0.8)',
                  fontWeight: 900,
                  fontSize: isMobile ? '1rem' : '1.15rem',
                  marginBottom: '0.3rem',
                }}>
                  الحرب
                </div>
                <div style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: isMobile ? '0.72rem' : '0.8rem',
                  lineHeight: 1.4,
                }}>
                  مع نظام البطاقات<br />تجربة استراتيجية
                </div>
                {selectedMode === 'war' && (
                  <div style={{
                    marginTop: '0.5rem',
                    fontSize: '1rem',
                    color: '#ec4899',
                  }}>✓</div>
                )}
              </button>
            </div>
          </div>

          <Divider />

          {/* ══ STEP 2: Game Name ══ */}
          <div style={{ marginBottom: '0' }}>
            <SectionLabel
              icon={<Target size={20} color="#f97316" />}
              text="اسم اللعبة"
            />
            <input
              type="text"
              value={settings.gameName}
              onChange={(e) => setSettings({ ...settings, gameName: e.target.value })}
              placeholder="حرب الحروف مع..."
              style={{
                width: '100%',
                padding: '0.9rem 0.75rem',
                fontSize: '1.05rem',
                fontWeight: 700,
                background: 'rgba(255,255,255,0.08)',
                border: '2px solid rgba(168,85,247,0.3)',
                borderRadius: '1rem',
                color: 'white',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#a855f7';
                e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(168,85,247,0.3)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              }}
            />
          </div>

          <Divider />

          {/* ══ STEP 3: Team Names ══ */}
          <div style={{ marginBottom: '0' }}>
            <SectionLabel
              icon={<Users size={20} color="#ec4899" />}
              text="أسماء الفرق"
            />
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '0.85rem',
            }}>
              <div>
                <label style={{ display: 'block', color: '#10b981', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  🟢 الفريق الأخضر
                </label>
                <input
                  type="text"
                  value={settings.teamNames.green}
                  onChange={(e) => setSettings({ ...settings, teamNames: { ...settings.teamNames, green: e.target.value } })}
                  placeholder="الفريق الأخضر"
                  style={{
                    width: '100%',
                    padding: '0.85rem 0.75rem',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    background: 'rgba(16,185,129,0.1)',
                    border: '2px solid rgba(16,185,129,0.3)',
                    borderRadius: '0.85rem',
                    color: 'white',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#10b981'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)'; }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#ef4444', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  🔴 الفريق الأحمر
                </label>
                <input
                  type="text"
                  value={settings.teamNames.red}
                  onChange={(e) => setSettings({ ...settings, teamNames: { ...settings.teamNames, red: e.target.value } })}
                  placeholder="الفريق الأحمر"
                  style={{
                    width: '100%',
                    padding: '0.85rem 0.75rem',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    background: 'rgba(239,68,68,0.1)',
                    border: '2px solid rgba(239,68,68,0.3)',
                    borderRadius: '0.85rem',
                    color: 'white',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#ef4444'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
                />
              </div>
            </div>
          </div>

          <Divider />

          {/* ══ STEP 4: Rounds ══ */}
          <div style={{ marginBottom: '0' }}>
            <SectionLabel
              icon={<Dice5 size={20} color="#3b82f6" />}
              text="عدد الجولات"
            />
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
              gap: '0.75rem',
            }}>
              {[
                { value: 3 as const, label: '3 جولات', desc: 'سريع' },
                { value: 5 as const, label: '5 جولات', desc: 'متوازن' },
                { value: 'infinite' as const, label: '♾️ مفتوح', desc: 'بلا حد' },
              ].map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => setSettings({ ...settings, rounds: opt.value })}
                  style={{
                    padding: '0.85rem 0.5rem',
                    background: settings.rounds === opt.value
                      ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                      : 'rgba(255,255,255,0.07)',
                    border: settings.rounds === opt.value
                      ? '2px solid #3b82f6'
                      : '2px solid rgba(255,255,255,0.15)',
                    borderRadius: '0.85rem',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: '0.9rem' }}>{opt.label}</div>
                  <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem', marginTop: '0.2rem' }}>{opt.desc}</div>
                </button>
              ))}

              {/* Custom */}
              <div>
                <button
                  onClick={() => setSettings({ ...settings, rounds: customRounds })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: typeof settings.rounds === 'number' && settings.rounds !== 3 && settings.rounds !== 5
                      ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                      : 'rgba(255,255,255,0.07)',
                    border: typeof settings.rounds === 'number' && settings.rounds !== 3 && settings.rounds !== 5
                      ? '2px solid #3b82f6'
                      : '2px solid rgba(255,255,255,0.15)',
                    borderRadius: '0.6rem 0.6rem 0 0',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 900,
                    fontSize: '0.82rem',
                  }}
                >
                  مخصص
                </button>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={customRounds}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setCustomRounds(val);
                    setSettings({ ...settings, rounds: val });
                  }}
                  style={{
                    width: '100%',
                    padding: '0.4rem',
                    background: 'rgba(255,255,255,0.1)',
                    border: '2px solid rgba(59,130,246,0.3)',
                    borderTop: 'none',
                    borderRadius: '0 0 0.6rem 0.6rem',
                    color: 'white',
                    fontSize: '0.9rem',
                    fontWeight: 900,
                    textAlign: 'center',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Best of note */}
            {settings.rounds !== 'infinite' && (
              <div style={{
                marginTop: '0.75rem',
                padding: '0.6rem 1rem',
                background: 'rgba(168,85,247,0.1)',
                border: '1px solid rgba(168,85,247,0.25)',
                borderRadius: '0.75rem',
                color: '#c4b5fd',
                fontSize: '0.8rem',
                fontWeight: 700,
                textAlign: 'center',
              }}>
                🏆 أول من يفوز بـ {Math.ceil((settings.rounds as number) / 2)} جولات يكسب المباراة
              </div>
            )}
          </div>

          {/* ══ STEP 5: Cards – War Mode Only ══ */}
          {selectedMode === 'war' && (
            <>
              <Divider />
              <div>
                {/* Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1rem',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    fontSize: '1.1rem',
                    fontWeight: 900,
                    color: 'white',
                  }}>
                    <span style={{ fontSize: '1.25rem' }}>🎴</span>
                    نظام البطاقات
                  </div>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    background: 'rgba(236,72,153,0.2)',
                    border: '1px solid rgba(236,72,153,0.4)',
                    borderRadius: '0.5rem',
                    color: '#f9a8d4',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}>
                    ⚔️ طور الحرب
                  </span>
                </div>

                {/* Quick summary of enabled features */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.6rem',
                  marginBottom: '1rem',
                }}>
                  {[
                    { key: 'enableRandomLetter' as const, label: 'الحرف العشوائي', icon: '🎲' },
                    { key: 'enableStreakReward' as const, label: 'سلسلة الإجابات', icon: '🔥' },
                    { key: 'enableHiddenCards' as const, label: 'البطاقات المخبأة', icon: '🎁' },
                    { key: 'enableGoldenLetter' as const, label: 'الحرف الذهبي', icon: '✨' },
                  ].map((feat) => (
                    <label
                      key={feat.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.65rem 0.75rem',
                        background: settings[feat.key]
                          ? 'rgba(236,72,153,0.15)'
                          : 'rgba(255,255,255,0.05)',
                        border: `2px solid ${settings[feat.key] ? 'rgba(236,72,153,0.4)' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '0.75rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={settings[feat.key]}
                        onChange={(e) => setSettings({ ...settings, [feat.key]: e.target.checked })}
                        style={{ width: '1.1rem', height: '1.1rem', accentColor: '#ec4899', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '1rem' }}>{feat.icon}</span>
                      <span style={{ color: 'white', fontSize: isMobile ? '0.75rem' : '0.82rem', fontWeight: 700 }}>
                        {feat.label}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Advanced toggle */}
                <button
                  onClick={() => setShowAdvancedCards(p => !p)}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '0.75rem',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                  }}
                >
                  {showAdvancedCards ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {showAdvancedCards ? 'إخفاء الإعدادات المتقدمة' : 'إعدادات متقدمة'}
                </button>

                {/* Advanced Options */}
                {showAdvancedCards && (
                  <div style={{
                    marginTop: '0.85rem',
                    padding: '1rem',
                    background: 'rgba(236,72,153,0.08)',
                    border: '1px solid rgba(236,72,153,0.2)',
                    borderRadius: '1rem',
                  }}>
                    {/* Hidden cards count */}
                    {settings.enableHiddenCards && (
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ color: '#f9a8d4', fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>
                          🎁 عدد البطاقات المخبأة في الشبكة
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="15"
                          value={settings.hiddenCardsCount}
                          onChange={(e) => setSettings({ ...settings, hiddenCardsCount: parseInt(e.target.value) || 0 })}
                          style={{
                            width: '80px',
                            padding: '0.5rem',
                            background: 'rgba(255,255,255,0.1)',
                            border: '2px solid rgba(236,72,153,0.3)',
                            borderRadius: '0.6rem',
                            color: 'white',
                            fontSize: '1.1rem',
                            fontWeight: 900,
                            textAlign: 'center',
                            outline: 'none',
                          }}
                        />
                      </div>
                    )}

                    {/* Card types */}
                    <label style={{ color: '#f9a8d4', fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>
                      ✅ أنواع البطاقات المتاحة
                    </label>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '0.5rem',
                      marginBottom: '1rem',
                    }}>
                      {([
                        { key: 'freeze', label: 'تجميد', icon: '🧊' },
                        { key: 'bomb', label: 'قنبلة', icon: '💣' },
                        { key: 'battle', label: 'معركة', icon: '⚔️' },
                        { key: 'shield', label: 'درع', icon: '🛡️' },
                      ] as { key: keyof typeof settings.cardTypes; label: string; icon: string }[]).map((card) => (
                        <label
                          key={card.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.6rem',
                            background: settings.cardTypes[card.key] ? 'rgba(236,72,153,0.18)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${settings.cardTypes[card.key] ? 'rgba(236,72,153,0.4)' : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: '0.6rem',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={settings.cardTypes[card.key]}
                            onChange={() => toggleCardType(card.key)}
                            style={{ width: '1rem', height: '1rem', accentColor: '#ec4899', cursor: 'pointer' }}
                          />
                          <span>{card.icon}</span>
                          <span style={{ color: 'white', fontSize: '0.82rem', fontWeight: 700 }}>{card.label}</span>
                        </label>
                      ))}
                    </div>

                    {/* Carry cards */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '0.75rem',
                      cursor: 'pointer',
                    }}>
                      <input
                        type="checkbox"
                        checked={settings.carryCardsToNextRound}
                        onChange={(e) => setSettings({ ...settings, carryCardsToNextRound: e.target.checked })}
                        style={{ width: '1.1rem', height: '1.1rem', accentColor: '#3b82f6', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '1.1rem' }}>🔁</span>
                      <div>
                        <div style={{ color: 'white', fontWeight: 700, fontSize: '0.85rem' }}>ترحيل البطاقات</div>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>البطاقات المتبقية تنتقل للجولة التالية</div>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </>
          )}

          <Divider />

          {/* ══ Start Button ══ */}
          <button
            onClick={handleStart}
            style={{
              width: '100%',
              padding: isMobile ? '1rem' : '1.25rem',
              background: selectedMode === 'war'
                ? 'linear-gradient(135deg, #ec4899, #a855f7)'
                : 'linear-gradient(135deg, #10b981, #14b8a6)',
              border: 'none',
              borderRadius: '1.1rem',
              color: 'white',
              fontSize: isMobile ? '1.05rem' : '1.3rem',
              fontWeight: 900,
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: selectedMode === 'war'
                ? '0 8px 25px rgba(236,72,153,0.4)'
                : '0 8px 25px rgba(16,185,129,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span>{selectedMode === 'war' ? '⚔️ ابدأ طور الحرب' : '🏛️ ابدأ الكلاسيك'}</span>
          </button>
        </div>
      </div>
    </>
  );
};

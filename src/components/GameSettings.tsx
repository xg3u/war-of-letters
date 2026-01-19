// src/components/GameSettings.tsx
// صفحة إعدادات اللعبة الكاملة - النسخة المحدثة

import React, { useState } from 'react';
import { ArrowLeft, Target, Trophy, Dice5, Eye, EyeOff, Zap, Award, Users } from 'lucide-react';
import { categories } from '../lib/categories';

interface GameSettingsProps {
  onBack: () => void;
  onStartGame: (settings: GameSettingsData) => void;
}

export interface GameSettingsData {
  gameName: string;
  teamNames: { green: string; red: string };

  // آليات الفوز
  winCondition: 'wall-to-wall' | 'five-connected' | 'most-letters' | 'all';
  teamColors: {
    green: 'horizontal' | 'vertical' | 'both';
    red: 'horizontal' | 'vertical' | 'both';
  };

  // عدد الجولات
  rounds: 3 | 5 | number | 'infinite';
  
  // نظام البطاقات
  enableCards: boolean;
  enableRandomLetter: boolean; // الحرف العشوائي
  enableStreakReward: boolean; // سلسلة الإجابات
  enableHiddenCards: boolean; // البطاقات المخبأة
  hiddenCardsCount: number;
  enableGoldenLetter: boolean; // الحرف الذهبي
  cardDistribution: 'random' | 'manual';
  showCardLocations: 'always' | 'on-press' | 'hidden';
  cardTypes: {
    freeze: boolean;
    bomb: boolean;
    battle: boolean;
    shield: boolean;
    demonShuffle: boolean;
    speedUp: boolean;
    luck: boolean;
  };
  
  // مميزات خاصة
  carryCardsToNextRound: boolean;
  
  // الكاتيجوريز
  selectedCategories: string[];
  
  // إعدادات المسابقة التلفزيونية
  gameMode: 'normal' | 'tv-show';
  showQuestionsToTeams: boolean;
  
  // الوقت
  timePerQuestion: number;
}

export const GameSettings: React.FC<GameSettingsProps> = ({ onBack, onStartGame }) => {
  const [settings, setSettings] = useState<GameSettingsData>({
    gameName: '',
    teamNames: { green: 'الفريق الأخضر', red: 'الفريق الأحمر' },

    // آليات الفوز
    winCondition: 'all',
    teamColors: {
      green: 'both',
      red: 'both',
    },

    // عدد الجولات
    rounds: 3,
    
    // نظام البطاقات
    enableCards: true,
    enableRandomLetter: true,
    enableStreakReward: true,
    enableHiddenCards: true,
    hiddenCardsCount: 5,
    enableGoldenLetter: true,
    cardDistribution: 'random',
    showCardLocations: 'on-press',
    cardTypes: {
      freeze: true,
      bomb: true,
      battle: true,
      shield: true,
      demonShuffle: true,
      speedUp: true,
      luck: true,
    },
    
    // مميزات خاصة
    carryCardsToNextRound: false,
    
    // الكاتيجوريز
    selectedCategories: [],
    
    // إعدادات المسابقة التلفزيونية
    gameMode: 'normal',
    showQuestionsToTeams: true,
    
    // الوقت
    timePerQuestion: 30,
  });

  const [customRounds, setCustomRounds] = useState<number>(7);

  const handleStart = () => {
    if (settings.gameName.trim() === '') {
      alert('⚠️ الرجاء إدخال اسم اللعبة');
      return;
    }
  
    onStartGame(settings);
  };

  const toggleCategory = (categoryId: string) => {
    setSettings(prev => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(categoryId)
        ? prev.selectedCategories.filter(id => id !== categoryId)
        : [...prev.selectedCategories, categoryId]
    }));
  };

  const selectAllCategories = () => {
    setSettings(prev => ({
      ...prev,
      selectedCategories: categories.map(c => c.id)
    }));
  };

  const clearAllCategories = () => {
    setSettings(prev => ({ ...prev, selectedCategories: [] }));
  };

  const toggleCardType = (cardType: keyof typeof settings.cardTypes) => {
    setSettings(prev => ({
      ...prev,
      cardTypes: {
        ...prev.cardTypes,
        [cardType]: !prev.cardTypes[cardType]
      }
    }));
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a0b2e 0%, #2d1154 50%, #4c1d95 100%)',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      overflowY: 'auto',
    }}>
      
      {/* Header */}
      <div style={{
        width: '100%',
        maxWidth: '1200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2rem',
      }}>
        <button
          onClick={onBack}
          style={{
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
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.transform = 'translateX(5px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          <ArrowLeft size={20} />
          رجوع
        </button>

        <h1 style={{
          fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
          fontWeight: 900,
          color: 'white',
          margin: 0,
          textAlign: 'center',
        }}>
          الإعدادات ⚙️
        </h1>

        <div style={{ width: '100px' }} />
      </div>

      {/* Main Content */}
      <div style={{
        width: '100%',
        maxWidth: '1200px',
        background: 'rgba(26, 11, 46, 0.5)',
        backdropFilter: 'blur(20px)',
        borderRadius: '2rem',
        border: '2px solid rgba(168, 85, 247, 0.3)',
        padding: '2rem',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
      }}>

        {/* اسم اللعبة */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '1.25rem',
            fontWeight: 900,
            color: 'white',
            marginBottom: '1rem',
          }}>
            <Target size={24} color="#f97316" />
            اسم اللعبة
          </label>
          <input
            type="text"
            value={settings.gameName}
            onChange={(e) => setSettings({ ...settings, gameName: e.target.value })}
            placeholder="حرب الحروف مع..."
            style={{
              width: '100%',
              padding: '1rem 0.5rem',
              fontSize: '1.25rem',
              fontWeight: 700,
              background: 'rgba(255, 255, 255, 0.1)',
              border: '2px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '1rem',
              color: 'white',
              outline: 'none',
              transition: 'all 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#a855f7';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
          />
        </div>

        <div style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.5), transparent)',
          margin: '2rem 0',
        }} />

        {/* أسماء الفرق */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '1.25rem',
            fontWeight: 900,
            color: 'white',
            marginBottom: '1rem',
          }}>
            <Users size={24} color="#ec4899" />
            أسماء الفرق
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1.5rem',
          }}>
            {/* الفريق الأخضر */}
            <div>
              <label style={{
                display: 'block',
                color: '#10b981',
                fontSize: '0.875rem',
                fontWeight: 700,
                marginBottom: '0.5rem',
              }}>
                🟢 الفريق الأخضر
              </label>
              <input
                type="text"
                value={settings.teamNames.green}
                onChange={(e) => setSettings({
                  ...settings,
                  teamNames: { ...settings.teamNames, green: e.target.value }
                })}
                placeholder="الفريق الأخضر"
                style={{
                  width: '100%',
                  padding: '1rem 0.5rem',
                  fontSize: '1rem',
                  fontWeight: 700,
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '2px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '1rem',
                  color: 'white',
                  outline: 'none',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#10b981';
                  e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                  e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                }}
              />
            </div>

            {/* الفريق الأحمر */}
            <div>
              <label style={{
                display: 'block',
                color: '#ef4444',
                fontSize: '0.875rem',
                fontWeight: 700,
                marginBottom: '0.5rem',
              }}>
                🔴 الفريق الأحمر
              </label>
              <input
                type="text"
                value={settings.teamNames.red}
                onChange={(e) => setSettings({
                  ...settings,
                  teamNames: { ...settings.teamNames, red: e.target.value }
                })}
                placeholder="الفريق الأحمر"
                style={{
                  width: '100%',
                  padding: '1rem 0.5rem',
                  fontSize: '1rem',
                  fontWeight: 700,
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '2px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '1rem',
                  color: 'white',
                  outline: 'none',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#ef4444';
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                }}
              />
            </div>
          </div>
        </div>

        <div style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.5), transparent)',
          margin: '2rem 0',
        }} />

        {/* آلية الفوز */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '1.25rem',
            fontWeight: 900,
            color: 'white',
            marginBottom: '1rem',
          }}>
            <Trophy size={24} color="#fbbf24" />
            آلية الفوز
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}>
            {[
              { id: 'wall-to-wall', label: 'من الجدار للجدار', icon: '🧱' },
              { id: 'five-connected', label: 'خمس خلايا متصلة', icon: '5️⃣' },
              { id: 'most-letters', label: 'الأكثر حروفاً', icon: '📊' },
              { id: 'all', label: 'الكل (بالترتيب)', icon: '🏆' },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setSettings({ ...settings, winCondition: option.id as any })}
                style={{
                  padding: '1.25rem',
                  background: settings.winCondition === option.id
                    ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                    : 'rgba(255, 255, 255, 0.1)',
                  border: settings.winCondition === option.id
                    ? '3px solid #fbbf24'
                    : '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '1rem',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span style={{ fontSize: '2rem' }}>{option.icon}</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, textAlign: 'center' }}>
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.5), transparent)',
          margin: '2rem 0',
        }} />

        {/* عدد الجولات */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '1.25rem',
            fontWeight: 900,
            color: 'white',
            marginBottom: '1rem',
          }}>
            <Dice5 size={24} color="#3b82f6" />
            عدد الجولات
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '1rem',
          }}>
            {[
              { value: 3, label: '3 جولات' },
              { value: 5, label: '5 جولات' },
              { value: 'infinite', label: '♾️ مفتوح' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setSettings({ ...settings, rounds: option.value as any })}
                style={{
                  padding: '1rem',
                  background: settings.rounds === option.value
                    ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                    : 'rgba(255, 255, 255, 0.1)',
                  border: settings.rounds === option.value
                    ? '3px solid #3b82f6'
                    : '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '1rem',
                  color: 'white',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {option.label}
              </button>
            ))}
            {/* عدد مخصص */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}>
              <button
                onClick={() => setSettings({ ...settings, rounds: customRounds })}
                style={{
                  padding: '1rem',
                  background: typeof settings.rounds === 'number' && settings.rounds !== 3 && settings.rounds !== 5
                    ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                    : 'rgba(255, 255, 255, 0.1)',
                  border: typeof settings.rounds === 'number' && settings.rounds !== 3 && settings.rounds !== 5
                    ? '3px solid #3b82f6'
                    : '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '1rem',
                  color: 'white',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                مخصص: {customRounds}
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
                  padding: '0.5rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '2px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '0.5rem',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </div>

        <div style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.5), transparent)',
          margin: '2rem 0',
        }} />

        {/* نظام البطاقات */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '1.25rem',
            fontWeight: 900,
            color: 'white',
            marginBottom: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Zap size={24} color="#ec4899" />
              نظام البطاقات
            </div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={settings.enableCards}
                onChange={(e) => setSettings({ ...settings, enableCards: e.target.checked })}
                style={{
                  width: '1.5rem',
                  height: '1.5rem',
                  cursor: 'pointer',
                  accentColor: '#ec4899',
                }}
              />
              <span style={{ fontSize: '1rem', color: '#e9d5ff' }}>تفعيل</span>
            </label>
          </label>

          {settings.enableCards && (
            <div style={{
              background: 'rgba(236, 72, 153, 0.1)',
              border: '2px solid rgba(236, 72, 153, 0.3)',
              borderRadius: '1rem',
              padding: '1.5rem',
            }}>
              {/* عدد البطاقات المخبأة */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  color: '#ec4899',
                  fontSize: '1rem',
                  fontWeight: 700,
                  marginBottom: '0.75rem',
                }}>
                  🎯 عدد البطاقات المخبأة في الأحرف:
                </label>
                <input
                  type="number"
                  min="0"
                  max="15"
                  value={settings.hiddenCardsCount}
                  onChange={(e) => setSettings({ ...settings, hiddenCardsCount: parseInt(e.target.value) || 0 })}
                  style={{
                    width: '100px',
                    padding: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '2px solid rgba(236, 72, 153, 0.3)',
                    borderRadius: '0.75rem',
                    color: 'white',
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    textAlign: 'center',
                    outline: 'none',
                  }}
                />
              </div>

              {/* طرق الحصول على البطاقات */}
              <div style={{ 
                marginBottom: '1.5rem',
                background: 'rgba(251, 191, 36, 0.1)',
                border: '2px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '1rem',
                padding: '1.5rem',
              }}>
                <h4 style={{
                  fontSize: '1rem',
                  fontWeight: 900,
                  color: '#fbbf24',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  💎 طرق الحصول على البطاقات:
                </h4>

                {/* الحرف العشوائي في بداية الجولة */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  marginBottom: '0.75rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>🎲</span>
                    <div>
                      <div style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>
                        الحرف العشوائي
                      </div>
                      <div style={{ color: '#e9d5ff', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                        الإجابة على الحرف العشوائي في بداية الجولة
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableRandomLetter}
                    onChange={(e) => setSettings({ ...settings, enableRandomLetter: e.target.checked })}
                    style={{
                      width: '1.25rem',
                      height: '1.25rem',
                      cursor: 'pointer',
                      accentColor: '#8b5cf6',
                    }}
                  />
                </label>

                {/* سلسلة الإجابات */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  marginBottom: '0.75rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>🔥</span>
                    <div>
                      <div style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>
                        سلسلة الإجابات
                      </div>
                      <div style={{ color: '#e9d5ff', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                        مكافأة بعد 3 إجابات صحيحة متتالية
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableStreakReward}
                    onChange={(e) => setSettings({ ...settings, enableStreakReward: e.target.checked })}
                    style={{
                      width: '1.25rem',
                      height: '1.25rem',
                      cursor: 'pointer',
                      accentColor: '#f97316',
                    }}
                  />
                </label>

                {/* البطاقات المخبأة في الأحرف */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  marginBottom: '0.75rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>🎁</span>
                    <div>
                      <div style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>
                        البطاقات المخبأة
                      </div>
                      <div style={{ color: '#e9d5ff', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                        من يجيب على حرف يحتوي بطاقة يحصل عليها
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={settings.hiddenCardsCount}
                      onChange={(e) => setSettings({ ...settings, hiddenCardsCount: parseInt(e.target.value) || 0 })}
                      disabled={!settings.enableHiddenCards}
                      style={{
                        width: '50px',
                        padding: '0.25rem',
                        background: settings.enableHiddenCards ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                        border: '2px solid rgba(236, 72, 153, 0.3)',
                        borderRadius: '0.5rem',
                        color: 'white',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        outline: 'none',
                        opacity: settings.enableHiddenCards ? 1 : 0.5,
                      }}
                    />
                    <input
                      type="checkbox"
                      checked={settings.enableHiddenCards}
                      onChange={(e) => setSettings({ ...settings, enableHiddenCards: e.target.checked })}
                      style={{
                        width: '1.25rem',
                        height: '1.25rem',
                        cursor: 'pointer',
                        accentColor: '#ec4899',
                      }}
                    />
                  </div>
                </label>

                {/* الحرف الذهبي */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>✨</span>
                    <div>
                      <div style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>
                        الحرف الذهبي
                      </div>
                      <div style={{ color: '#e9d5ff', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                        يمنح بطاقة نادرة عند الإجابة عليه
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableGoldenLetter}
                    onChange={(e) => setSettings({ ...settings, enableGoldenLetter: e.target.checked })}
                    style={{
                      width: '1.25rem',
                      height: '1.25rem',
                      cursor: 'pointer',
                      accentColor: '#fbbf24',
                    }}
                  />
                </label>
              </div>

              {/* أنواع البطاقات المفعلة */}
              <div>
                <label style={{
                  display: 'block',
                  color: '#ec4899',
                  fontSize: '1rem',
                  fontWeight: 700,
                  marginBottom: '0.75rem',
                }}>
                  ✅ أنواع البطاقات المتاحة:
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '5.75rem',
                }}>
                  {[
                    { key: 'freeze', label: 'تجميد', icon: '🧊' },
                    { key: 'bomb', label: 'قنبلة', icon: '💣' },
                    { key: 'battle', label: 'معركة', icon: '⚔️' },
                    { key: 'shield', label: 'درع', icon: '🛡️' },
              
                  ].map((card) => (
                    <label
                      key={card.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem',
                        background: settings.cardTypes[card.key as keyof typeof settings.cardTypes]
                          ? 'rgba(236, 72, 153, 0.2)'
                          : 'rgba(255, 255, 255, 0.05)',
                        border: `2px solid ${settings.cardTypes[card.key as keyof typeof settings.cardTypes]
                          ? 'rgba(236, 72, 153, 0.5)'
                          : 'rgba(255, 255, 255, 0.1)'}`,
                        borderRadius: '0.75rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={settings.cardTypes[card.key as keyof typeof settings.cardTypes]}
                        onChange={() => toggleCardType(card.key as keyof typeof settings.cardTypes)}
                        style={{
                          width: '1.25rem',
                          height: '1.25rem',
                          cursor: 'pointer',
                          accentColor: '#ec4899',
                        }}
                      />
                      <span style={{ fontSize: '1.25rem' }}>{card.icon}</span>
                      <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: 700 }}>
                        {card.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.5), transparent)',
          margin: '2rem 0',
        }} />

        {/* مميزات خاصة */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '1.25rem',
            fontWeight: 900,
            color: 'white',
            marginBottom: '1rem',
          }}>
            <Award size={24} color="#a855f7" />
            مميزات خاصة
          </label>
          <div style={{
            background: 'rgba(168, 85, 247, 0.1)',
            border: '2px solid rgba(168, 85, 247, 0.3)',
            borderRadius: '1rem',
            padding: '1.5rem',
          }}>
            {/* ترحيل البطاقات */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '0.75rem',
              cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🔁</span>
                <div>
                  <div style={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>
                    ترحيل البطاقات بين الجولات
                  </div>
                  <div style={{ color: '#e9d5ff', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    البطاقات المتبقية تنتقل للجولة التالية
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.carryCardsToNextRound}
                onChange={(e) => setSettings({ ...settings, carryCardsToNextRound: e.target.checked })}
                style={{
                  width: '1.5rem',
                  height: '1.5rem',
                  cursor: 'pointer',
                  accentColor: '#3b82f6',
                }}
              />
            </label>
          </div>
        </div>

        <div style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.5), transparent)',
          margin: '2rem 0',
        }} />

      
        {/* زر البدء */}
        <button
          onClick={handleStart}
          style={{
            width: '100%',
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
            border: 'none',
            borderRadius: '1.25rem',
            color: 'white',
            fontSize: '1.5rem',
            fontWeight: 900,
            cursor: 'pointer',
            transition: 'all 0.3s',
            boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 12px 35px rgba(16, 185, 129, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.4)';
          }}
        >
          <span>ابدأ اللعبة</span>
          <span style={{ fontSize: '1.75rem' }}>✓</span>
        </button>
      </div>
    </div>
  );
};
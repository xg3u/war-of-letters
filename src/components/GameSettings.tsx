// src/components/GameSettings.tsx
// صفحة إعدادات اللعبة الكاملة

import React, { useState } from 'react';
import { ArrowLeft, Users, Grid3x3, Target, Tv, Eye, EyeOff, Zap } from 'lucide-react';
import { categories } from '../lib/categories';

interface GameSettingsProps {
  onBack: () => void;
  onStartGame: (settings: GameSettingsData) => void;
}

export interface GameSettingsData {
  gameName: string;
  gridSize: '5x5' | 'balanced'; // 5x5 أو متزنة (4-5-6-5-4)
  cardDistributionMode: 'full-access' | 'starter-card' | 'zero-start';
  gameMode: 'normal' | 'tv-show';
  selectedCategories: string[];
  showQuestionsToTeams: boolean;
  enablePowerCards: boolean;
  timePerQuestion: number;
}

export const GameSettings: React.FC<GameSettingsProps> = ({ onBack, onStartGame }) => {
  const [settings, setSettings] = useState<GameSettingsData>({
    gameName: '',
    gridSize: 'balanced',
    cardDistributionMode: 'full-access',
    gameMode: 'normal',
    selectedCategories: [],
    showQuestionsToTeams: true,
    enablePowerCards: true,
    timePerQuestion: 30,
  });

  const [currentStep, setCurrentStep] = useState(1);

  const handleStart = () => {
    if (settings.gameName.trim() === '') {
      alert('⚠️ الرجاء إدخال اسم اللعبة');
      return;
    }
    if (settings.selectedCategories.length === 0) {
      alert('⚠️ الرجاء اختيار فئة واحدة على الأقل');
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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a0b2e 0%, #2d1154 50%, #4c1d95 100%)',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
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
              padding: '1rem 1.5rem',
              fontSize: '1.125rem',
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

        {/* حجم الشبكة */}
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
            <Grid3x3 size={24} color="#10b981" />
            حجم الشبكة السداسية
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1rem',
          }}>
            {/* شبكة 5x5 */}
            <button
              onClick={() => setSettings({ ...settings, gridSize: '5x5' })}
              style={{
                padding: '2rem 1.5rem',
                background: settings.gridSize === '5x5' 
                  ? 'linear-gradient(135deg, #10b981, #14b8a6)'
                  : 'rgba(255, 255, 255, 0.1)',
                border: settings.gridSize === '5x5'
                  ? '3px solid #10b981'
                  : '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '1rem',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
              }}
              onMouseEnter={(e) => {
                if (settings.gridSize !== '5x5') {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.transform = 'translateY(-5px)';
                }
              }}
              onMouseLeave={(e) => {
                if (settings.gridSize !== '5x5') {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              <div style={{ fontSize: '2rem' }}>⬡</div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>
                  5×5
                </div>
                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                  25 خلية سداسية
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.25rem' }}>
                  (25 حرف من 28)
                </div>
              </div>
            </button>

            {/* شبكة متزنة */}
            <button
              onClick={() => setSettings({ ...settings, gridSize: 'balanced' })}
              style={{
                padding: '2rem 1.5rem',
                background: settings.gridSize === 'balanced' 
                  ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                  : 'rgba(255, 255, 255, 0.1)',
                border: settings.gridSize === 'balanced'
                  ? '3px solid #3b82f6'
                  : '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '1rem',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
              }}
              onMouseEnter={(e) => {
                if (settings.gridSize !== 'balanced') {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.transform = 'translateY(-5px)';
                }
              }}
              onMouseLeave={(e) => {
                if (settings.gridSize !== 'balanced') {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              <div style={{ fontSize: '2rem' }}>⬢</div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>
                  متزنة
                </div>
                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                  24 خلية سداسية
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.25rem' }}>
                  (4-5-6-5-4 صفوف)
                </div>
              </div>
            </button>
          </div>
        </div>

        <div style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.5), transparent)',
          margin: '2rem 0',
        }} />

        {/* طريقة توزيع الكروت */}
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
            <Zap size={24} color="#ec4899" />
            طريقة الحصول على كروت الأكشن
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}>
            {/* السيطرة الكاملة */}
            <button
              onClick={() => setSettings({ ...settings, cardDistributionMode: 'full-access' })}
              style={{
                padding: '1.5rem',
                background: settings.cardDistributionMode === 'full-access'
                  ? 'linear-gradient(135deg, #10b981, #14b8a6)'
                  : 'rgba(255, 255, 255, 0.1)',
                border: settings.cardDistributionMode === 'full-access'
                  ? '3px solid #10b981'
                  : '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '1rem',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '2.5rem' }}>🎁</span>
              <div style={{ fontSize: '1.125rem', fontWeight: 900 }}>
                السيطرة الكاملة
              </div>
              <div style={{ fontSize: '0.875rem', opacity: 0.9, lineHeight: '1.5' }}>
                جميع الفرق تملك كل الكروت من البداية
              </div>
            </button>

            {/* البداية التدريجية */}
            <button
              onClick={() => setSettings({ ...settings, cardDistributionMode: 'starter-card' })}
              style={{
                padding: '1.5rem',
                background: settings.cardDistributionMode === 'starter-card'
                  ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                  : 'rgba(255, 255, 255, 0.1)',
                border: settings.cardDistributionMode === 'starter-card'
                  ? '3px solid #f59e0b'
                  : '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '1rem',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '2.5rem' }}>🎲</span>
              <div style={{ fontSize: '1.125rem', fontWeight: 900 }}>
                البداية التدريجية
              </div>
              <div style={{ fontSize: '0.875rem', opacity: 0.9, lineHeight: '1.5' }}>
                كل فريق يبدأ بكرت عشوائي واحد فقط
              </div>
            </button>

            {/* التنافس الصفري */}
            <button
              onClick={() => setSettings({ ...settings, cardDistributionMode: 'zero-start' })}
              style={{
                padding: '1.5rem',
                background: settings.cardDistributionMode === 'zero-start'
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : 'rgba(255, 255, 255, 0.1)',
                border: settings.cardDistributionMode === 'zero-start'
                  ? '3px solid #ef4444'
                  : '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '1rem',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '2.5rem' }}>⚔️</span>
              <div style={{ fontSize: '1.125rem', fontWeight: 900 }}>
                التنافس الصفري
              </div>
              <div style={{ fontSize: '0.875rem', opacity: 0.9, lineHeight: '1.5' }}>
                بدون كروت! الاعتماد على التنافس فقط
              </div>
            </button>
          </div>

          {/* شرح طرق الحصول على الكروت */}
          {settings.cardDistributionMode !== 'full-access' && (
            <div style={{
              marginTop: '1rem',
              padding: '1.5rem',
              background: 'rgba(236, 72, 153, 0.1)',
              border: '2px solid rgba(236, 72, 153, 0.3)',
              borderRadius: '1rem',
            }}>
              <h4 style={{
                fontSize: '1rem',
                fontWeight: 900,
                color: '#ec4899',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                💎 طرق الحصول على الكروت:
              </h4>
              <ul style={{
                color: '#e9d5ff',
                fontSize: '0.875rem',
                lineHeight: '1.8',
                paddingRight: '1.5rem',
                margin: 0,
              }}>
                <li><strong style={{ color: '#fbbf24' }}>الحرف الذهبي:</strong> عند الإجابة على حرف ذهبي (يحدده الحكم)</li>
                <li><strong style={{ color: '#10b981' }}>مكافأة السلسلة:</strong> بعد 3 إجابات صحيحة متتالية</li>
              </ul>
            </div>
          )}
        </div>

        <div style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.5), transparent)',
          margin: '2rem 0',
        }} />

        {/* نمط اللعبة */}
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
            <Tv size={24} color="#3b82f6" />
            نمط اللعبة
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1rem',
          }}>
            <button
              onClick={() => setSettings({ ...settings, gameMode: 'normal' })}
              style={{
                padding: '1.5rem',
                background: settings.gameMode === 'normal'
                  ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                  : 'rgba(255, 255, 255, 0.1)',
                border: settings.gameMode === 'normal'
                  ? '2px solid #3b82f6'
                  : '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '1rem',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎮</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 900, marginBottom: '0.5rem' }}>
                عادي
              </div>
              <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                كل اللاعبين يشاهدون الأسئلة ويتفاعلون
              </div>
            </button>

            <button
              onClick={() => setSettings({ ...settings, gameMode: 'tv-show' })}
              style={{
                padding: '1.5rem',
                background: settings.gameMode === 'tv-show'
                  ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                  : 'rgba(255, 255, 255, 0.1)',
                border: settings.gameMode === 'tv-show'
                  ? '2px solid #f59e0b'
                  : '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '1rem',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📺</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 900, marginBottom: '0.5rem' }}>
                مسابقة تلفزيونية
              </div>
              <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                مقدم واحد يدير اللعبة والفرق يشاهدون فقط
              </div>
            </button>
          </div>
        </div>

        {/* إعدادات المسابقة التلفزيونية */}
        {settings.gameMode === 'tv-show' && (
          <>
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '2px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '1rem',
              padding: '1.5rem',
              marginBottom: '2rem',
            }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: 900,
                color: '#fbbf24',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <Tv size={20} />
                إعدادات المسابقة التلفزيونية
              </h3>

              {/* إظهار الأسئلة للفرق */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '0.75rem',
                marginBottom: '1rem',
                cursor: 'pointer',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}>
                  {settings.showQuestionsToTeams ? (
                    <Eye size={20} color="#10b981" />
                  ) : (
                    <EyeOff size={20} color="#ef4444" />
                  )}
                  <div>
                    <div style={{
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '1rem',
                    }}>
                      إظهار الأسئلة للفرق
                    </div>
                    <div style={{
                      color: '#e9d5ff',
                      fontSize: '0.875rem',
                      marginTop: '0.25rem',
                    }}>
                      {settings.showQuestionsToTeams 
                        ? 'الفرق يشاهدون الأسئلة على شاشاتهم'
                        : 'المقدم فقط يقرأ الأسئلة'
                      }
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showQuestionsToTeams}
                  onChange={(e) => setSettings({ ...settings, showQuestionsToTeams: e.target.checked })}
                  style={{
                    width: '3rem',
                    height: '1.5rem',
                    cursor: 'pointer',
                    accentColor: '#10b981',
                  }}
                />
              </label>

              {/* تفعيل البطاقات */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '0.75rem',
                cursor: 'pointer',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}>
                  <Zap size={20} color="#ec4899" />
                  <div>
                    <div style={{
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '1rem',
                    }}>
                      تفعيل البطاقات الإستراتيجية
                    </div>
                    <div style={{
                      color: '#e9d5ff',
                      fontSize: '0.875rem',
                      marginTop: '0.25rem',
                    }}>
                      {settings.enablePowerCards
                        ? 'المقدم فقط يستخدم البطاقات'
                        : 'اللعب بدون بطاقات إستراتيجية'
                      }
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enablePowerCards}
                  onChange={(e) => setSettings({ ...settings, enablePowerCards: e.target.checked })}
                  style={{
                    width: '3rem',
                    height: '1.5rem',
                    cursor: 'pointer',
                    accentColor: '#ec4899',
                  }}
                />
              </label>
            </div>

            <div style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.5), transparent)',
              margin: '2rem 0',
            }} />
          </>
        )}

        {/* الفئات */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '1.25rem',
              fontWeight: 900,
              color: 'white',
            }}>
              <Target size={24} color="#a855f7" />
              الفئات ({settings.selectedCategories.length}/{categories.length})
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={selectAllCategories}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'linear-gradient(135deg, #10b981, #14b8a6)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                اختر الكل
              </button>
              <button
                onClick={clearAllCategories}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(239, 68, 68, 0.8)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                إلغاء الكل
              </button>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '1rem',
          }}>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => toggleCategory(category.id)}
                style={{
                  padding: '1rem',
                  background: settings.selectedCategories.includes(category.id)
                    ? category.color
                    : 'rgba(255, 255, 255, 0.1)',
                  border: settings.selectedCategories.includes(category.id)
                    ? `3px solid ${category.color}`
                    : '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '1rem',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!settings.selectedCategories.includes(category.id)) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  }
                  e.currentTarget.style.transform = 'translateY(-5px)';
                }}
                onMouseLeave={(e) => {
                  if (!settings.selectedCategories.includes(category.id)) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {settings.selectedCategories.includes(category.id) && (
                  <div style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: 900,
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.5)',
                  }}>
                    ✓
                  </div>
                )}
                <span style={{ fontSize: '1.5rem' }}>{category.icon}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                  {category.name}
                </span>
              </button>
            ))}
          </div>
        </div>

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
// src/components/LandingPage.tsx
// الصفحة الرئيسية - تصميم سموث واحترافي

import React, { useState } from 'react';
import { CategoryCard } from './CategoryCard';
import { ActionCardComponent } from './ActionCardComponent';
import { categories } from '../lib/categories';
import { actionCards } from '../lib/actionCards';
import { Play, Moon, Sun, Sparkles } from 'lucide-react';
import { WelcomeModal } from './WelcomeModal';

const ARABIC_LETTERS = "أبتثجحخدذرزسشصضطظعغفقكلمنهويةئؤءآإ";
const VIBRANT_COLORS = ['#a855f7', '#10b981', '#f97316', '#ef4444', '#3b82f6', '#fbbf24', '#ec4899', '#14b8a6'];

interface LandingPageProps {
  onOpenSettings: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenSettings }) => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showWelcome, setShowWelcome] = useState(() => {
    // التحقق من localStorage عند التحميل
    const hideModal = localStorage.getItem('hideWelcomeModal');
    return hideModal !== 'true'; // يظهر إذا ما كان محفوظ
  });

  // توليد الحروف المتساقطة
  const fallingLetters = React.useMemo(() => 
    Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      char: ARABIC_LETTERS[Math.floor(Math.random() * ARABIC_LETTERS.length)],
      color: VIBRANT_COLORS[Math.floor(Math.random() * VIBRANT_COLORS.length)],
      left: `${Math.random() * 100}%`,
      duration: `${Math.random() * 15 + 20}s`, // أبطأ: 20-35 ثانية
      delay: `${Math.random() * 10}s`,
      size: `clamp(2rem, 3vw, 3.5rem)`, // حجم متوسط ومتناسق
    }))
  , []);

  const colors = {
    bg: isDarkMode ? '#0a0118' : '#f8f9fa',
    bgGradient: isDarkMode 
      ? 'linear-gradient(135deg, #0a0118 0%, #1a0b2e 50%, #2d1154 100%)'
      : 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%)',
    cardBg: isDarkMode ? 'rgba(26, 11, 46, 0.6)' : 'rgba(255, 255, 255, 0.9)',
    text: isDarkMode ? '#ffffff' : '#1a0b2e',
    textSecondary: isDarkMode ? '#e9d5ff' : '#7c3aed',
    border: isDarkMode ? 'rgba(168, 85, 247, 0.25)' : 'rgba(124, 58, 237, 0.2)',
    sectionBg: isDarkMode ? 'rgba(26, 11, 46, 0.4)' : 'rgba(255, 255, 255, 0.6)',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bgGradient,
      color: colors.text,
      transition: 'all 0.5s ease',
      position: 'relative',
      overflow: 'hidden',
    }}>
      
      {/* مودال الترحيب */}
      {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}
      
      {/* طبقة الحروف المتساقطة */}
      <div style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 1,
      }}>
        {fallingLetters.map((letter) => (
          <div
            key={letter.id}
            style={{
              position: 'absolute',
              left: letter.left,
              top: '-10%',
              fontSize: letter.size,
              color: letter.color,
              animation: `falling ${letter.duration} linear infinite`,
              animationDelay: letter.delay,
              textShadow: `0 0 15px ${letter.color}, 0 0 30px ${letter.color}`,
              fontWeight: 700,
              opacity: isDarkMode ? 0.4 : 0.25,
              fontFamily: 'Tajawal, sans-serif',
            }}
          >
            {letter.char}
          </div>
        ))}
      </div>
      {/* Header - هيدر احترافي */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: isDarkMode 
          ? 'linear-gradient(135deg, #1a0b2e 0%, #2d1154 100%)' 
          : 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
        borderBottom: isDarkMode 
          ? '3px solid rgba(168, 85, 247, 0.3)' 
          : '3px solid rgba(255, 255, 255, 0.3)',
        boxShadow: isDarkMode 
          ? '0 4px 20px rgba(0, 0, 0, 0.5)' 
          : '0 4px 20px rgba(249, 115, 22, 0.3)',
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          
          {/* اللوجو والاسم */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem',
          }}>
            <div style={{
              width: '3.5rem',
              height: '3.5rem',
              borderRadius: '1rem',
              background: isDarkMode 
                ? 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #a855f7 100%)'
                : 'rgba(255, 255, 255, 0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
              flexShrink: 0,
            }}>
              <Sparkles 
                size={28} 
                color={isDarkMode ? 'white' : '#f97316'} 
                strokeWidth={2.5} 
              />
            </div>
            <div>
              <h1 style={{
                fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                fontWeight: 900,
                margin: 0,
                color: isDarkMode ? 'white' : 'white',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}>
                حرب الحروف
              </h1>
              <p style={{
                fontSize: '0.875rem',
                margin: '0.25rem 0 0 0',
                color: isDarkMode ? '#e9d5ff' : 'rgba(255, 255, 255, 0.9)',
                fontWeight: 600,
              }}>
                معركة المعرفة والذكاء 🎯
              </p>
            </div>
          </div>

          {/* القائمة والزر */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            
            {/* روابط التنقل */}
            <nav style={{ 
              display: 'flex', 
              gap: '1.5rem',
              alignItems: 'center',
            }}>
              <a style={{
                color: isDarkMode ? 'white' : 'white',
                fontSize: '1rem',
                fontWeight: 700,
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDarkMode 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              >
                الرئيسية
              </a>
              <a style={{
                color: isDarkMode ? '#e9d5ff' : 'rgba(255, 255, 255, 0.9)',
                fontSize: '1rem',
                fontWeight: 700,
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDarkMode 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = isDarkMode ? '#e9d5ff' : 'rgba(255, 255, 255, 0.9)';
              }}
              >
                الأسئلة
              </a>
              <a style={{
                color: isDarkMode ? '#e9d5ff' : 'rgba(255, 255, 255, 0.9)',
                fontSize: '1rem',
                fontWeight: 700,
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDarkMode 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = isDarkMode ? '#e9d5ff' : 'rgba(255, 255, 255, 0.9)';
              }}
              >
                البطاقات
              </a>
            </nav>

            {/* زر Dark Mode */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              style={{
                width: '3rem',
                height: '3rem',
                borderRadius: '0.75rem',
                background: isDarkMode 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'rgba(255, 255, 255, 0.2)',
                border: isDarkMode 
                  ? '2px solid rgba(255, 255, 255, 0.2)'
                  : '2px solid rgba(255, 255, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.background = isDarkMode 
                  ? 'rgba(255, 255, 255, 0.15)' 
                  : 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = isDarkMode 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'rgba(255, 255, 255, 0.2)';
              }}
            >
              {isDarkMode ? (
                <Sun size={20} color="white" />
              ) : (
                <Moon size={20} color="white" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <div style={{ paddingTop: '5.5rem' }}>
        
        {/* القسم الأول - الكارد المركزي */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '85vh',
          padding: 'clamp(1rem, 3vw, 2rem)',
        }}>
          <div style={{ 
            maxWidth: '600px', 
            width: '100%', 
            position: 'relative',
          }}>
            
            {/* التوهج الخارجي */}
            <div style={{
              position: 'absolute',
              inset: '-1rem',
              borderRadius: '2.5rem',
              filter: 'blur(50px)',
              background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f97316 100%)',
              opacity: isDarkMode ? 0.25 : 0.15,
              pointerEvents: 'none',
            }} />

            {/* الكارد */}
            <div style={{
              position: 'relative',
              borderRadius: '2.5rem',
              padding: 'clamp(2rem, 5vw, 3rem)',
              border: `2px solid ${colors.border}`,
              background: colors.cardBg,
              backdropFilter: 'blur(30px)',
              boxShadow: isDarkMode 
                ? '0 0 60px rgba(168, 85, 247, 0.2), 0 20px 40px rgba(0, 0, 0, 0.3)' 
                : '0 20px 60px rgba(124, 58, 237, 0.15)',
              transition: 'all 0.3s ease',
            }}>
              
              {/* الأيقونة */}
              <div style={{ 
                position: 'relative', 
                width: 'clamp(4rem, 10vw, 5rem)', 
                height: 'clamp(4rem, 10vw, 5rem)', 
                margin: '0 auto clamp(1.5rem, 3vw, 2rem)' 
              }}>
                <div style={{
                  position: 'absolute',
                  inset: '-0.5rem',
                  borderRadius: '1.5rem',
                  filter: 'blur(20px)',
                  background: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #a855f7 100%)',
                  opacity: 0.4,
                }} />
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  borderRadius: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #a855f7 100%)',
                  boxShadow: '0 10px 30px rgba(168, 85, 247, 0.35)',
                }}>
                  <span style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}>⚔️</span>
                </div>
              </div>

              {/* العنوان */}
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2 style={{
                  fontSize: 'clamp(2rem, 6vw, 3rem)',
                  fontWeight: 900,
                  marginBottom: '0.5rem',
                  background: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #a855f7 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.02em',
                }}>
                  حرب الحروف
                </h2>
                <p style={{ 
                  color: colors.textSecondary, 
                  fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', 
                  fontWeight: 600,
                  margin: 0,
                }}>
                  جاهز للتحدي؟ 🎯
                </p>
              </div>

              {/* الخط الفاصل */}
              <div style={{
                height: '1px',
                width: '100%',
                marginBottom: '2rem',
                background: isDarkMode 
                  ? 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.4), transparent)'
                  : 'linear-gradient(90deg, transparent, rgba(124, 58, 237, 0.3), transparent)',
              }} />

              {/* زر ابدأ اللعبة */}
              <button
                onClick={onOpenSettings}
                style={{
                  width: '100%',
                  padding: 'clamp(1rem, 2.5vw, 1.25rem)',
                  borderRadius: '1.25rem',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: 'clamp(1.125rem, 3vw, 1.5rem)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #a855f7 100%)',
                  boxShadow: '0 8px 30px rgba(249, 115, 22, 0.4)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(249, 115, 22, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(249, 115, 22, 0.4)';
                }}
              >
                <Play size={28} fill="currentColor" />
                ابدأ اللعبة الآن
              </button>

              <p style={{
                textAlign: 'center',
                marginTop: '1.5rem',
                color: isDarkMode ? 'rgba(233, 213, 255, 0.5)' : 'rgba(124, 58, 237, 0.5)',
                fontWeight: 600,
                fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                margin: '1.5rem 0 0 0',
              }}>
                اضغط لإنشاء لعبة جديدة ومشاركتها مع الأصدقاء 🎮
              </p>
            </div>
          </div>
        </div>

        {/* القسم الثاني - الكاتيجوريز */}
        <section style={{ 
          display: 'flex',
          justifyContent: 'center',
          padding: 'clamp(2rem, 3vw, 3rem) clamp(1.5rem, 4vw, 3rem)',
        }}>
          <div style={{ maxWidth: '1400px', width: '100%' }}>
            
            {/* العنوان */}
            <div style={{ 
              textAlign: 'center', 
              marginBottom: 'clamp(2rem, 3vw, 2.5rem)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
            }}>
              <div style={{
                fontSize: 'clamp(3rem, 7vw, 5rem)',
                filter: 'drop-shadow(0 4px 10px rgba(249, 115, 22, 0.5))',
              }}>
                🎯
              </div>
              <h2 style={{
                fontSize: 'clamp(2rem, 6vw, 3.5rem)',
                fontWeight: 900,
                margin: 0,
                background: 'linear-gradient(135deg, #f97316, #ec4899, #a855f7)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                أنواع الأسئلة
              </h2>
              <p style={{ 
                color: colors.textSecondary, 
                fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
                fontWeight: 600,
                margin: 0,
                textAlign: 'center',
              }}>
                اضغط على أي بطاقة لرؤية التفاصيل
              </p>
            </div>

            {/* البطاقات - 4 في كل صف */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'clamp(1.5rem, 2.5vw, 3rem)',
            }}>
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          </div>
        </section>

        {/* الخط الفاصل المتوهج */}
        <div style={{ 
          maxWidth: '1400px', 
          margin: '0 auto', 
          padding: '0 clamp(1.5rem, 4vw, 3rem)',
        }}>
          <div style={{
            position: 'relative',
            height: '1px',
            background: isDarkMode 
              ? 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.6), rgba(236, 72, 153, 0.6), rgba(249, 115, 22, 0.6), transparent)'
              : 'linear-gradient(90deg, transparent, rgba(124, 58, 237, 0.4), rgba(219, 39, 119, 0.4), rgba(234, 88, 12, 0.4), transparent)',
            boxShadow: isDarkMode 
              ? '0 0 20px rgba(168, 85, 247, 0.5)'
              : '0 0 15px rgba(124, 58, 237, 0.3)',
          }}>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              padding: '0.75rem 1.5rem',
              background: isDarkMode ? '#1a0b2e' : '#f8f9fa',
              borderRadius: '2rem',
              border: `2px solid ${isDarkMode ? 'rgba(168, 85, 247, 0.5)' : 'rgba(124, 58, 237, 0.3)'}`,
              boxShadow: isDarkMode 
                ? '0 4px 20px rgba(168, 85, 247, 0.3)'
                : '0 4px 15px rgba(124, 58, 237, 0.2)',
            }}>
              <span style={{
                fontSize: '1.5rem',
                filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
              }}>
                ✨
              </span>
            </div>
          </div>
        </div>

        {/* القسم الثالث - البطاقات */}
        <section style={{ 
          display: 'flex',
          justifyContent: 'center',
          padding: 'clamp(2rem, 3vw, 3rem) clamp(1.5rem, 4vw, 3rem)',
        }}>
          <div style={{ maxWidth: '1400px', width: '100%' }}>
            
            {/* العنوان */}
            <div style={{ 
              textAlign: 'center', 
              marginBottom: 'clamp(2rem, 3vw, 2.5rem)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
            }}>
              <div style={{
                fontSize: 'clamp(3rem, 7vw, 5rem)',
                filter: 'drop-shadow(0 4px 10px rgba(236, 72, 153, 0.5))',
              }}>
                🃏
              </div>
              <h2 style={{
                fontSize: 'clamp(2rem, 6vw, 3.5rem)',
                fontWeight: 900,
                margin: 0,
                background: 'linear-gradient(135deg, #ec4899, #a855f7, #3b82f6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                البطاقات الإستراتيجية
              </h2>
              <p style={{ 
                color: colors.textSecondary, 
                fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
                fontWeight: 600,
                margin: 0,
                textAlign: 'center',
              }}>
                استخدم البطاقات بذكاء لتغيير مجرى المعركة
              </p>
            </div>

            {/* البطاقات - 4 في كل صف */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'clamp(1.5rem, 2.5vw, 3rem)',
            }}>
              {actionCards.map((card) => (
                <ActionCardComponent key={card.id} card={card} />
              ))}
            </div>
          </div>
        </section>

        {/* Media Query للشاشات الأصغر */}
        <style>{`
          @media (max-width: 1200px) {
            section > div:last-child {
              grid-template-columns: repeat(3, 1fr) !important;
            }
          }
          @media (max-width: 900px) {
            section > div:last-child {
              grid-template-columns: repeat(2, 1fr) !important;
            }
          }
          @media (max-width: 600px) {
            section > div:last-child {
              grid-template-columns: repeat(1, 1fr) !important;
            }
          }
        `}</style>

        {/* Footer */}
        <footer style={{
          marginTop: '2rem',
          padding: '2rem',
          background: isDarkMode 
            ? 'rgba(0, 0, 0, 0.3)' 
            : 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(10px)',
          borderTop: `2px solid ${colors.border}`,
          textAlign: 'center',
        }}>
          <p style={{ 
            color: colors.textSecondary, 
            fontSize: '0.875rem',
            margin: 0,
          }}>
            © 2025 حرب الحروف • جميع الحقوق محفوظة
          </p>
        </footer>
      </div>

      {/* CSS للأنيميشنز */}
      <style>{`
        @keyframes falling {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.4;
          }
          90% {
            opacity: 0.4;
          }
          100% {
            transform: translateY(110vh) rotate(360deg);
            opacity: 0;
          }
        }

        .falling-letter {
          animation: falling linear infinite;
        }
      `}</style>
    </div>
  );
};
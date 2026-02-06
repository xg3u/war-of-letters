// src/components/LandingPage.tsx
import React, { useState, useMemo } from 'react';
import { CategoryCard } from './CategoryCard';
import { ActionCardComponent } from './ActionCardComponent';
import { categories } from '../lib/categories';
import { actionCards } from '../lib/actionCards';
import {
  Play, Moon, Sun, BookOpen,
  Trophy, ShieldCheck, Zap, HelpCircle, LogOut
} from 'lucide-react';
import { WelcomeModal } from './WelcomeModal';
import { PaymentModal } from './PaymentModal';
import { supabase } from '../lib/supabase';
import HeaderImage from '../assets/ForDesign/Header.png';

// الحروف العربية للتساقط
const ARABIC_LETTERS = "أبتثجحخدذرزسشصضطظعغفقكلمنهوي";
const LETTER_COLORS = ['#a855f7', '#10b981', '#f97316', '#ef4444', '#3b82f6', '#fbbf24', '#ec4899', '#14b8a6'];

interface LandingPageProps {
  onOpenSettings: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenSettings }) => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showWelcome, setShowWelcome] = useState(() => {
    const hideModal = localStorage.getItem('hideWelcomeModal');
    return hideModal !== 'true';
  });
  const [showPayment, setShowPayment] = useState(false);

  // الحروف المتساقطة
  const fallingLetters = useMemo(() =>
    Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      char: ARABIC_LETTERS[Math.floor(Math.random() * ARABIC_LETTERS.length)],
      color: LETTER_COLORS[Math.floor(Math.random() * LETTER_COLORS.length)],
      left: `${Math.random() * 100}%`,
      duration: `${15 + Math.random() * 20}s`,
      delay: `${Math.random() * 15}s`,
      size: `${1.5 + Math.random() * 2}rem`,
      opacity: 0.15 + Math.random() * 0.2,
    }))
  , []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // تسجيل الخروج
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const colors = {
    bg: isDarkMode ? '#0a0118' : '#f8f9fa',
    bgGradient: isDarkMode 
      ? 'linear-gradient(135deg, #0a0118 0%, #1a0b2e 50%, #2d1154 100%)'
      : 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%)',
    cardBg: isDarkMode ? 'rgba(26, 11, 46, 0.7)' : 'rgba(255, 255, 255, 0.9)',
    text: isDarkMode ? '#ffffff' : '#1a0b2e',
    textSecondary: isDarkMode ? '#e9d5ff' : '#7c3aed',
    border: isDarkMode ? 'rgba(168, 85, 247, 0.25)' : 'rgba(124, 58, 237, 0.2)',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bgGradient,
      color: colors.text,
      transition: 'all 0.5s ease',
      position: 'relative',
      overflowX: 'hidden',
      direction: 'rtl',
    }}>
      
      {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}
      {showPayment && (
        <PaymentModal
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            setShowPayment(false);
            onOpenSettings();
          }}
        />
      )}

      {/* الحروف المتساقطة */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
        {fallingLetters.map((letter) => (
          <div
            key={letter.id}
            style={{
              position: 'absolute',
              left: letter.left,
              top: '-5%',
              fontSize: letter.size,
              color: letter.color,
              opacity: isDarkMode ? letter.opacity : letter.opacity * 0.5,
              fontWeight: 900,
              fontFamily: 'Tajawal, sans-serif',
              textShadow: `0 0 20px ${letter.color}60`,
              animation: `letterFall ${letter.duration} linear infinite`,
              animationDelay: letter.delay,
              filter: 'blur(0.5px)',
            }}
          >
            {letter.char}
          </div>
        ))}
      </div>

      {/* Header */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'linear-gradient(180deg, rgba(10, 1, 24, 0.95) 0%, rgba(10, 1, 24, 0.8) 70%, transparent 100%)',
        padding: '0.5rem 0',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 1rem',
          position: 'relative',
          width: '100%',
          maxWidth: '1400px',
          margin: '0 auto',
        }}>
          {/* صورة الهيدر مصغرة */}
          <img
            src={HeaderImage}
            alt="حرب الحروف"
            style={{
              width: '100%',
              maxWidth: '800px',
              maxHeight: '180px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 4px 20px rgba(168, 85, 247, 0.5))',
              animation: 'headerGlow 3s ease-in-out infinite',
            }}
          />

          {/* أزرار التنقل */}
          <nav style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(15px)',
            borderRadius: '2rem',
            padding: '0.5rem 1rem',
            marginTop: '0.5rem',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          }}>
            {['الرئيسية', 'الأسئلة', 'البطاقات', 'الدليل'].map((item, idx) => (
              <button
                key={item}
                onClick={() => scrollToSection(['hero', 'categories', 'cards', 'guide'][idx])}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.85rem',
                  transition: 'all 0.3s ease',
                  borderRadius: '1rem',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(168, 85, 247, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none';
                }}
              >
                {item}
              </button>
            ))}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                padding: '0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isDarkMode ? <Sun size={18} color="white" /> : <Moon size={18} color="white" />}
            </button>
            {/* زر تسجيل الخروج */}
            <button
              onClick={handleLogout}
              title="تسجيل الخروج"
              style={{
                background: 'rgba(239, 68, 68, 0.3)',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                borderRadius: '50%',
                padding: '0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
              }}
            >
              <LogOut size={18} color="#ef4444" />
            </button>
          </nav>
        </div>
      </header>

      <main style={{ paddingTop: '14rem' }}>
        
        {/* Hero Section */}
        <section id="hero" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ 
            maxWidth: '700px', width: '100%', padding: '3rem', borderRadius: '3rem', 
            background: colors.cardBg, backdropFilter: 'blur(20px)', border: `2px solid ${colors.border}`,
            textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
          }}>
            <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>⚔️</div>
            <h2 style={{ fontSize: '3.5rem', fontWeight: 900, background: 'linear-gradient(to left, #f97316, #ec4899, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              معركة المعرفة الكبرى
            </h2>
            <p style={{ fontSize: '1.25rem', fontWeight: 600, color: colors.textSecondary, marginBottom: '2rem' }}>
              تحدَّ أصدقاءك في أول لعبة لوحية إلكترونية تعتمد على الذكاء وبناء الجسور
            </p>
            <button 
              onClick={() => setShowPayment(true)}
              style={{ 
                width: '100%', padding: '1.5rem', borderRadius: '1.5rem', background: 'linear-gradient(135deg, #f97316, #ec4899)',
                color: 'white', fontSize: '1.5rem', fontWeight: 900, border: 'none', cursor: 'pointer',
                boxShadow: '0 10px 30px rgba(249, 115, 22, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem'
              }}
            >
              <Play fill="white" /> ابدأ التحدي الآن
            </button>
          </div>
        </section>

        {/* Categories Section */}
        <section id="categories" style={{ padding: '4rem 2rem' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '3rem', fontWeight: 900 }}>🎯 أنواع الأسئلة</h2>
              <p style={{ color: colors.textSecondary, fontSize: '1.2rem' }}>آلاف الأسئلة في كافة المجالات بانتظارك</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
              {categories.map((cat) => <CategoryCard key={cat.id} category={cat} />)}
            </div>
          </div>
        </section>




                {/* Cards Section */}
        <section id="cards" style={{ padding: '6rem 2rem' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '3rem', fontWeight: 900 }}>🃏 البطاقات الإستراتيجية</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
              {actionCards.map((card) => <ActionCardComponent key={card.id} card={card} />)}
            </div>
          </div>
        </section>


        {/* Game Guide Section - الدليل الجديد */}
        <section id="guide" style={{ padding: '6rem 2rem', background: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '1.5rem', background: 'rgba(168, 85, 247, 0.1)', marginBottom: '1rem' }}>
                <BookOpen size={40} color="#a855f7" />
              </div>
              <h2 style={{ fontSize: '3.5rem', fontWeight: 900, margin: 0 }}>دليل المحاربين</h2>
              <p style={{ fontSize: '1.2rem', color: colors.textSecondary }}>تعلم قوانين اللعبة لتصبح بطلاً</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
              {/* منطق الفوز */}
              <div style={{ padding: '2rem', borderRadius: '2rem', background: colors.cardBg, border: `1px solid ${colors.border}` }}>
                <Trophy size={32} color="#f97316" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>كيف تحقق النصر؟</h3>
                <ul style={{ paddingRight: '1.2rem', lineHeight: '1.8', fontWeight: 500 }}>
                  <li><b>الجسر الرأسي:</b> اربط مساراً متصلاً من الصف الأول إلى الصف الخامس.</li>
                  <li><b>الجسر الأفقي:</b> اربط مساراً من أقصى اليمين إلى أقصى اليسار.</li>
                  <li><b>الارتباط الصارم:</b> يجب أن تلمس الخلايا بعضها؛ لا يحسب الفوز إذا انتهى المسار في جوانب غير متقابلة.</li>
                </ul>
              </div>

              {/* بطاقات النخبة */}
              <div style={{ padding: '2rem', borderRadius: '2rem', background: colors.cardBg, border: `1px solid ${colors.border}` }}>
                <Zap size={32} color="#ec4899" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>ترسانة البطاقات</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>❄️ <b>تجميد:</b> شل حرفاً أبيض لمدة دورتين.</div>
                  <div>⚔️ <b>معركة:</b> تحدَّ الخصم لسرقة حرف يملكه بسؤال جديد.</div>
                  <div>💣 <b>قنبلة:</b> فجر ملكية الخصم وأعد الحرف للحالة البيضاء.</div>
                  <div>🛡️ <b>الدرع:</b> حماية مطلقة لحروفك لمدة 3 دورات كاملة.</div>
                </div>
              </div>

              {/* قوانين اللعبة */}
              <div style={{ padding: '2rem', borderRadius: '2rem', background: colors.cardBg, border: `1px solid ${colors.border}` }}>
                <ShieldCheck size={32} color="#10b981" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>قواعد السلوك</h3>
                <ul style={{ paddingRight: '1.2rem', lineHeight: '1.8', fontWeight: 500 }}>
                  <li><b>قاعدة الحرف:</b> يجب أن تبدأ الإجابة بنفس حرف الخلية (تجاهل الـ التعريف).</li>
                  <li><b>صلاحية البطاقات:</b> تُطلب البطاقات شفهياً من المقدم؛ وكلمته هي الفصل.</li>
                  <li><b>الحصول على الكروت:</b> تظهر خلف الحروف، الحروف الذهبية، أو عند الفوز بـ 3 دورات متتالية.</li>
                </ul>
              </div>
            </div>

            {/* نظام الفوز المصور - مفهوم بصري */}
            <div style={{ 
              marginTop: '4rem', padding: '3rem', borderRadius: '2.5rem', 
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(249, 115, 22, 0.1))',
              border: `1px dashed ${colors.border}`, textAlign: 'center'
            }}>
              <HelpCircle size={40} color={colors.textSecondary} style={{ marginBottom: '1rem' }} />
              <h4 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>تلميح تكتيكي</h4>
              <p style={{ maxWidth: '800px', margin: '0 auto', lineHeight: '1.6', fontWeight: 500 }}>
                عند استخدام بطاقة <b>المعركة</b>، اختر الحرف الذي يمثل "حجر الزاوية" في جسر خصمك لتقطعه وتكمل جسرك الخاص. المقدم هو الحكم الوحيد الذي يحدد من نطق بالطلب أولاً!
              </p>
            </div>
          </div>
        </section>

        

        <footer style={{ padding: '4rem 2rem', textAlign: 'center', borderTop: `1px solid ${colors.border}` }}>
          <p style={{ fontWeight: 700, color: colors.textSecondary }}>Meshal-ALshammari || xg3u</p>
          <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>© 2026 حرب الحروف - جميع الحقوق محفوظة</p>
        </footer>
      </main>

      {/* CSS Animations */}
      <style>{`
        @keyframes letterFall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 0;
          }
          5% {
            opacity: 1;
          }
          95% {
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes headerGlow {
          0%, 100% {
            filter: drop-shadow(0 4px 20px rgba(168, 85, 247, 0.5));
          }
          50% {
            filter: drop-shadow(0 4px 30px rgba(249, 115, 22, 0.6)) drop-shadow(0 0 40px rgba(236, 72, 153, 0.4));
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }
      `}</style>
    </div>
  );
};
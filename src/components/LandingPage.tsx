// src/components/LandingPage.tsx
import React, { useState } from 'react';
import { CategoryCard } from './CategoryCard';
import { ActionCardComponent } from './ActionCardComponent';
import { categories } from '../lib/categories';
import { actionCards } from '../lib/actionCards';
import { 
  Play, Moon, Sun, Sparkles, BookOpen, 
  Trophy, ShieldCheck, Zap, HelpCircle 
} from 'lucide-react';
import { WelcomeModal } from './WelcomeModal';
import { PaymentModal } from './PaymentModal';

const ARABIC_LETTERS = "أبتثجحخدذرزسشصضطظعغفقكلمنهويةئؤءآإ";
const VIBRANT_COLORS = ['#a855f7', '#10b981', '#f97316', '#ef4444', '#3b82f6', '#fbbf24', '#ec4899', '#14b8a6'];

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

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const fallingLetters = React.useMemo(() => 
    Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      char: ARABIC_LETTERS[Math.floor(Math.random() * ARABIC_LETTERS.length)],
      color: VIBRANT_COLORS[Math.floor(Math.random() * VIBRANT_COLORS.length)],
      left: `${Math.random() * 100}%`,
      duration: `${Math.random() * 15 + 20}s`,
      delay: `${Math.random() * 10}s`,
      size: `clamp(2rem, 3vw, 3.5rem)`,
    }))
  , []);

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

      {/* Falling Letters Layer */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
        {fallingLetters.map((letter) => (
          <div key={letter.id} style={{
            position: 'absolute',
            left: letter.left,
            top: '-10%',
            fontSize: letter.size,
            color: letter.color,
            animation: `falling ${letter.duration} linear infinite`,
            animationDelay: letter.delay,
            textShadow: `0 0 15px ${letter.color}`,
            fontWeight: 700,
            opacity: isDarkMode ? 0.3 : 0.15,
            fontFamily: 'Tajawal, sans-serif',
          }}>
            {letter.char}
          </div>
        ))}
      </div>

      {/* Header */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: isDarkMode ? 'rgba(26, 11, 46, 0.8)' : 'rgba(249, 115, 22, 0.9)',
        backdropFilter: 'blur(10px)',
        borderBottom: `2px solid ${colors.border}`,
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Sparkles size={32} color="white" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, color: 'white' }}>حرب الحروف</h1>
          </div>
          <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {['الرئيسية', 'الأسئلة', 'البطاقات', 'الدليل'].map((item, idx) => (
              <button 
                key={item}
                onClick={() => scrollToSection(['hero', 'categories', 'cards', 'guide'][idx])}
                style={{ background: 'none', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', padding: '0.5rem' }}
              >
                {item}
              </button>
            ))}
            <button onClick={() => setIsDarkMode(!isDarkMode)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer' }}>
              {isDarkMode ? <Sun size={20} color="white" /> : <Moon size={20} color="white" />}
            </button>
          </nav>
        </div>
      </header>

      <main style={{ paddingTop: '6rem' }}>
        
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

      <style>{`
        @keyframes falling {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
          10% { opacity: 0.4; }
          90% { opacity: 0.4; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
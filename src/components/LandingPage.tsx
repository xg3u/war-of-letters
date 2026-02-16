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
  const [showPayment, setShowPayment] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);

  // التحقق من حالة الاشتراك
  const checkSubscriptionAndProceed = async () => {
    setIsCheckingSubscription(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        // المستخدم غير مسجل دخول - عرض شاشة الدفع
        setShowPayment(true);
        return;
      }

      // جلب بيانات الاشتراك من جدول buyers
      const { data: buyerData, error: buyerError } = await supabase
        .from('buyers')
        .select('plan_type, subscription_status, expires_at')
        .eq('email', user.email)
        .single();

      if (buyerError || !buyerData) {
        // لا يوجد سجل للمستخدم - عرض شاشة الدفع
        setShowPayment(true);
        return;
      }

      // التحقق من صلاحية الاشتراك
      const isActive = buyerData.subscription_status === 'active';
      const isLifetime = buyerData.plan_type === 'lifetime';
      const hasValidExpiry = buyerData.expires_at ? new Date(buyerData.expires_at) > new Date() : false;

      if (isActive && (isLifetime || hasValidExpiry)) {
        // الاشتراك نشط - الدخول مباشرة للإعدادات
        console.log('✅ Active subscription found, proceeding to settings');
        onOpenSettings();
      } else {
        // الاشتراك منتهي أو غير نشط - عرض شاشة الدفع
        console.log('⚠️ No active subscription, showing payment modal');
        setShowPayment(true);
      }
    } catch (err) {
      console.error('Error checking subscription:', err);
      setShowPayment(true);
    } finally {
      setIsCheckingSubscription(false);
    }
  };

  // الحروف المتساقطة
  const fallingLetters = useMemo(() =>
    Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      char: ARABIC_LETTERS[Math.floor(Math.random() * ARABIC_LETTERS.length)],
      color: LETTER_COLORS[Math.floor(Math.random() * LETTER_COLORS.length)],
      left: `${Math.random() * 100}%`,
      duration: `${18 + Math.random() * 22}s`,
      delay: `${Math.random() * 15}s`,
      size: `${1.5 + Math.random() * 2}rem`,
      opacity: 0.12 + Math.random() * 0.15,
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
      transition: 'background 0.5s ease, color 0.3s ease',
      position: 'relative',
      overflowX: 'hidden',
      direction: 'rtl',
    }}>

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
              animation: `letterFall ${letter.duration} linear infinite`,
              animationDelay: letter.delay,
              willChange: 'transform',
            }}
          >
            {letter.char}
          </div>
        ))}
      </div>

      {/* Header - تصميم عصري واحترافي */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: isDarkMode
          ? 'linear-gradient(180deg, rgba(10, 1, 24, 0.98) 0%, rgba(10, 1, 24, 0.9) 50%, rgba(10, 1, 24, 0.7) 100%)'
          : 'linear-gradient(180deg, rgba(248, 249, 250, 0.98) 0%, rgba(248, 249, 250, 0.9) 50%, rgba(248, 249, 250, 0.7) 100%)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${isDarkMode ? 'rgba(168, 85, 247, 0.2)' : 'rgba(124, 58, 237, 0.15)'}`,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 2rem',
          maxWidth: '1400px',
          margin: '0 auto',
        }}>
          {/* الشعار واسم اللعبة */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <img
              src={HeaderImage}
              alt="حرب الحروف"
              style={{
                height: '50px',
                objectFit: 'contain',
                filter: isDarkMode ? 'drop-shadow(0 2px 8px rgba(168, 85, 247, 0.4))' : 'none',
              }}
            />
          </div>

          {/* قائمة التنقل المركزية */}
          <nav style={{
            display: 'flex',
            gap: '0.25rem',
            alignItems: 'center',
            background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
            borderRadius: '1rem',
            padding: '0.35rem',
            border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          }}>
            {[
              { label: 'الرئيسية', section: 'hero', icon: '🏠' },
              { label: 'الأسئلة', section: 'categories', icon: '❓' },
              { label: 'البطاقات', section: 'cards', icon: '🃏' },
              { label: 'الدليل', section: 'guide', icon: '📖' },
            ].map((item) => (
              <button
                key={item.section}
                onClick={() => scrollToSection(item.section)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '0.6rem 1rem',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s ease',
                  borderRadius: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDarkMode
                    ? 'rgba(168, 85, 247, 0.2)'
                    : 'rgba(124, 58, 237, 0.1)';
                  e.currentTarget.style.color = isDarkMode ? '#ffffff' : '#7c3aed';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)';
                }}
              >
                <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          {/* أزرار الإجراءات */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            {/* زر الوضع الداكن/الفاتح */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              style={{
                background: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'}`,
                borderRadius: '0.75rem',
                padding: '0.6rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDarkMode
                  ? 'rgba(255, 255, 255, 0.15)'
                  : 'rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDarkMode
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(0, 0, 0, 0.05)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title={isDarkMode ? 'الوضع الفاتح' : 'الوضع الداكن'}
            >
              {isDarkMode ? <Sun size={20} color="#fbbf24" /> : <Moon size={20} color="#7c3aed" />}
            </button>

            {/* زر تسجيل الخروج */}
            <button
              onClick={handleLogout}
              title="تسجيل الخروج"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '0.75rem',
                padding: '0.6rem 1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
                color: '#ef4444',
                fontWeight: 600,
                fontSize: '0.9rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <LogOut size={18} />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </header>

      <main style={{ paddingTop: '5rem' }}>

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
              تحدَّ أصدقاءك في أول لعبة لوحية إلكترونية تعتمد على الذكاء وبناء الجسور
            </p>
            <button
              onClick={checkSubscriptionAndProceed}
              disabled={isCheckingSubscription}
              style={{
                width: '100%', padding: '1.5rem', borderRadius: '1.5rem', background: 'linear-gradient(135deg, #f97316, #ec4899)',
                color: 'white', fontSize: '1.5rem', fontWeight: 900, border: 'none', cursor: isCheckingSubscription ? 'wait' : 'pointer',
                boxShadow: '0 10px 30px rgba(249, 115, 22, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem',
                opacity: isCheckingSubscription ? 0.7 : 1,
              }}
            >
              {isCheckingSubscription ? (
                <>⏳ جاري التحقق...</>
              ) : (
                <><Play fill="white" /> ابدأ التحدي الآن</>
              )}
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
        <section id="cards" style={{ padding: '4rem 2rem' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '3rem', fontWeight: 900 }}>🃏 البطاقات الإستراتيجية</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
              {actionCards.map((card) => <ActionCardComponent key={card.id} card={card} />)}
            </div>
          </div>
        </section>

        {/* Game Guide Section - الدليل الشامل */}
        <section id="guide" style={{ padding: '4rem 2rem', background: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            {/* العنوان */}
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <div style={{
                display: 'inline-flex',
                padding: '1rem 2rem',
                borderRadius: '1.5rem',
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                marginBottom: '1rem',
                gap: '0.75rem',
                alignItems: 'center',
              }}>
                <BookOpen size={32} color="#a855f7" />
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a855f7' }}>الدليل الشامل</span>
              </div>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0.5rem 0' }}>كل ما تحتاج معرفته عن اللعبة</h2>
              <p style={{ fontSize: '1.1rem', color: colors.textSecondary, maxWidth: '600px', margin: '0 auto' }}>
                اقرأ هذا الدليل بعناية لتفهم آليات اللعبة وتصبح محترفاً
              </p>
            </div>

            {/* القسم الأول: فكرة اللعبة وطريقة الفوز */}
            <div style={{
              background: colors.cardBg,
              borderRadius: '2rem',
              padding: '2rem',
              marginBottom: '2rem',
              border: `2px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '1rem',
                  background: 'linear-gradient(135deg, #f97316, #ea580c)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Trophy size={28} color="white" />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>فكرة اللعبة وطرق الفوز</h3>
              </div>

              <div style={{
                background: isDarkMode ? 'rgba(249, 115, 22, 0.1)' : 'rgba(249, 115, 22, 0.05)',
                borderRadius: '1rem',
                padding: '1.5rem',
                marginBottom: '1.5rem',
                border: '1px solid rgba(249, 115, 22, 0.2)',
              }}>
                <p style={{ margin: 0, lineHeight: 1.8, fontSize: '1.05rem' }}>
                  <b>حرب الحروف</b> هي لعبة استراتيجية بين فريقين (أخضر وأحمر). الهدف هو بناء <b>جسر متصل</b> من الحروف
                  يربط جانبي الملعب. كل فريق له اتجاه فوز مختلف!
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', maxWidth: '700px', margin: '0 auto' }}>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))',
                  borderRadius: '1rem',
                  padding: '1.5rem',
                  border: '2px solid rgba(16, 185, 129, 0.3)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🟢</div>
                  <h4 style={{ color: '#10b981', fontWeight: 800, marginBottom: '0.75rem', fontSize: '1.25rem' }}>الفريق الأخضر</h4>
                  <p style={{ margin: 0, fontSize: '1rem', lineHeight: 1.7 }}>
                    يفوز بربط جسر <b>عمودي</b> من الأعلى إلى الأسفل (من الصف الأول إلى الصف الخامس)
                  </p>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))',
                  borderRadius: '1rem',
                  padding: '1.5rem',
                  border: '2px solid rgba(239, 68, 68, 0.3)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔴</div>
                  <h4 style={{ color: '#ef4444', fontWeight: 800, marginBottom: '0.75rem', fontSize: '1.25rem' }}>الفريق الأحمر</h4>
                  <p style={{ margin: 0, fontSize: '1rem', lineHeight: 1.7 }}>
                    يفوز بربط جسر <b>أفقي</b> من اليمين إلى اليسار (من العمود الأول إلى العمود الخامس)
                  </p>
                </div>
              </div>
            </div>

            {/* القسم الثاني: طرق الحصول على البطاقات */}
            <div style={{
              background: colors.cardBg,
              borderRadius: '2rem',
              padding: '2rem',
              marginBottom: '2rem',
              border: `2px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '1rem',
                  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{ fontSize: '1.5rem' }}>🎁</span>
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>طرق الحصول على البطاقات</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                <div style={{
                  background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  borderRadius: '1rem',
                  padding: '1.25rem',
                  border: `1px solid ${colors.border}`,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🃏</div>
                  <h4 style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#ec4899' }}>البطاقات المخفية</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.6 }}>
                    بعض الخلايا تحتوي على بطاقات مخفية. عند الإجابة الصحيحة على سؤال الخلية، تحصل على بطاقة عشوائية!
                  </p>
                </div>

                <div style={{
                  background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  borderRadius: '1rem',
                  padding: '1.25rem',
                  border: `1px solid ${colors.border}`,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✨</div>
                  <h4 style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#fbbf24' }}>الحرف الذهبي</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.6 }}>
                    الخلايا الذهبية المتوهجة تمنحك بطاقة مباشرة عند الإجابة الصحيحة. ابحث عنها!
                  </p>
                </div>

                <div style={{
                  background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  borderRadius: '1rem',
                  padding: '1.25rem',
                  border: `1px solid ${colors.border}`,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔥</div>
                  <h4 style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#f97316' }}>سلسلة الانتصارات</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.6 }}>
                    أجب على <b>3 أسئلة صحيحة متتالية</b> واحصل على بطاقة مكافأة تلقائياً!
                  </p>
                </div>

                <div style={{
                  background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  borderRadius: '1rem',
                  padding: '1.25rem',
                  border: `1px solid ${colors.border}`,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎲</div>
                  <h4 style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#3b82f6' }}>الحرف العشوائي</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.6 }}>
                    في بداية كل جولة، يظهر حرف عشوائي. من يجيب عليه أولاً يحصل على بطاقة!
                  </p>
                </div>
              </div>
            </div>

            {/* القسم الثالث: شرح البطاقات بالتفصيل */}
            <div style={{
              background: colors.cardBg,
              borderRadius: '2rem',
              padding: '2rem',
              marginBottom: '2rem',
              border: `2px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '1rem',
                  background: 'linear-gradient(135deg, #ec4899, #db2777)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Zap size={28} color="white" />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>البطاقات الأربعة وتأثيراتها</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {/* بطاقة التجميد */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.05))',
                  borderRadius: '1.25rem',
                  padding: '1.5rem',
                  border: '2px solid rgba(59, 130, 246, 0.3)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '2.5rem' }}>🧊</span>
                    <div>
                      <h4 style={{ margin: 0, fontWeight: 800, color: '#3b82f6', fontSize: '1.25rem' }}>بطاقة التجميد</h4>
                      <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Freeze Card</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
                    <p style={{ margin: '0 0 0.75rem 0' }}><b>الهدف:</b> خلية فارغة (بيضاء) فقط</p>
                    <p style={{ margin: '0 0 0.75rem 0' }}><b>التأثير:</b> تجميد الخلية لمدة <b>دورتين</b></p>
                    <p style={{ margin: 0, color: '#60a5fa' }}>
                      <b>الفائدة:</b> الخلية المجمدة لا يمكن لأي فريق اختيارها حتى ينتهي التجميد. استخدمها لقطع طريق الخصم!
                    </p>
                  </div>
                </div>

                {/* بطاقة القنبلة */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.05))',
                  borderRadius: '1.25rem',
                  padding: '1.5rem',
                  border: '2px solid rgba(239, 68, 68, 0.3)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '2.5rem' }}>💣</span>
                    <div>
                      <h4 style={{ margin: 0, fontWeight: 800, color: '#ef4444', fontSize: '1.25rem' }}>بطاقة القنبلة</h4>
                      <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Bomb Card</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
                    <p style={{ margin: '0 0 0.75rem 0' }}><b>الهدف:</b> خلية يملكها الخصم فقط</p>
                    <p style={{ margin: '0 0 0.75rem 0' }}><b>التأثير:</b> تفجير الخلية وإعادتها <b>فارغة</b></p>
                    <p style={{ margin: 0, color: '#f87171' }}>
                      <b>الفائدة:</b> دمر تقدم الخصم! الخلية تعود بيضاء ويمكن لأي فريق المنافسة عليها من جديد.
                    </p>
                  </div>
                </div>

                {/* بطاقة المعركة */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(234, 88, 12, 0.05))',
                  borderRadius: '1.25rem',
                  padding: '1.5rem',
                  border: '2px solid rgba(249, 115, 22, 0.3)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '2.5rem' }}>⚔️</span>
                    <div>
                      <h4 style={{ margin: 0, fontWeight: 800, color: '#f97316', fontSize: '1.25rem' }}>بطاقة المعركة</h4>
                      <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Battle Card</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
                    <p style={{ margin: '0 0 0.75rem 0' }}><b>الهدف:</b> خلية يملكها الخصم</p>
                    <p style={{ margin: '0 0 0.75rem 0' }}><b>التأثير:</b> تحدي على سؤال جديد</p>
                    <p style={{ margin: 0, color: '#fb923c' }}>
                      <b>الفائدة:</b> إذا أجبت صح تسرق الخلية! إذا أخطأت تبقى للخصم. فرصة ذهبية لقلب الموازين!
                    </p>
                  </div>
                </div>

                {/* بطاقة الدرع */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.05))',
                  borderRadius: '1.25rem',
                  padding: '1.5rem',
                  border: '2px solid rgba(16, 185, 129, 0.3)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '2.5rem' }}>🛡️</span>
                    <div>
                      <h4 style={{ margin: 0, fontWeight: 800, color: '#10b981', fontSize: '1.25rem' }}>بطاقة الدرع</h4>
                      <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Shield Card</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
                    <p style={{ margin: '0 0 0.75rem 0' }}><b>الهدف:</b> خلية تملكها أنت</p>
                    <p style={{ margin: '0 0 0.75rem 0' }}><b>التأثير:</b> حماية لمدة <b>3 دورات</b></p>
                    <p style={{ margin: 0, color: '#34d399' }}>
                      <b>الفائدة:</b> الخلية المحمية لا تتأثر بالقنبلة أو المعركة! احمِ خلاياك الاستراتيجية.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* القسم الرابع: قواعد مهمة */}
            <div style={{
              background: colors.cardBg,
              borderRadius: '2rem',
              padding: '2rem',
              border: `2px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '1rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <ShieldCheck size={28} color="white" />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>قواعد مهمة يجب معرفتها</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start',
                  background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  padding: '1rem',
                  borderRadius: '1rem',
                }}>
                  <span style={{ fontSize: '1.5rem' }}>📝</span>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 700 }}>قاعدة الحرف</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.6 }}>
                      الإجابة يجب أن تبدأ بنفس حرف الخلية المختارة (يُتجاهل "ال" التعريف)
                    </p>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start',
                  background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  padding: '1rem',
                  borderRadius: '1rem',
                }}>
                  <span style={{ fontSize: '1.5rem' }}>👨‍⚖️</span>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 700 }}>المقدم هو الحكم</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.6 }}>
                      قرار المقدم نهائي في قبول الإجابات واستخدام البطاقات
                    </p>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start',
                  background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  padding: '1rem',
                  borderRadius: '1rem',
                }}>
                  <span style={{ fontSize: '1.5rem' }}>🎯</span>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 700 }}>المباراة والجولات</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.6 }}>
                      المباراة تتكون من عدة جولات. من يفوز بأغلب الجولات يفوز بالمباراة!
                    </p>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start',
                  background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  padding: '1rem',
                  borderRadius: '1rem',
                }}>
                  <span style={{ fontSize: '1.5rem' }}>📱</span>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 700 }}>شاشتين متزامنتين</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.6 }}>
                      افتح شاشة المقدم + شاشة اللاعبين على جهازين للتجربة المثالية!
                    </p>
                  </div>
                </div>
              </div>

              {/* نصيحة ختامية */}
              <div style={{
                marginTop: '1.5rem',
                padding: '1.25rem',
                borderRadius: '1rem',
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(236, 72, 153, 0.1))',
                border: '1px dashed rgba(168, 85, 247, 0.3)',
                textAlign: 'center',
              }}>
                <HelpCircle size={24} color="#a855f7" style={{ marginBottom: '0.5rem' }} />
                <p style={{ margin: 0, fontWeight: 600, lineHeight: 1.6 }}>
                  <b>نصيحة:</b> استخدم البطاقات بحكمة! لا تستخدمها عشوائياً، بل احتفظ بها للحظات الحاسمة.
                  بطاقة المعركة ممتازة لسرقة خلية استراتيجية، والدرع مثالي لحماية خلية قريبة من إكمال جسرك!
                </p>
              </div>
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
            transform: translate3d(0, -10vh, 0) rotate(0deg);
            opacity: 0;
          }
          5% { opacity: 1; }
          95% { opacity: 1; }
          100% {
            transform: translate3d(0, 110vh, 0) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes float {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -10px, 0); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
};

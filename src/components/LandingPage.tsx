// src/components/LandingPage.tsx
// الصفحة الرئيسية بعد تسجيل الدخول

import React, { useMemo } from 'react';
import { CategoryCard } from './CategoryCard';
import { ActionCardComponent } from './ActionCardComponent';
import { categories } from '../lib/categories';
import { actionCards } from '../lib/actionCards';
import { Sparkles, Play, Phone, ShoppingBag, Zap } from 'lucide-react';

const ARABIC_LETTERS = "أبتثجحخدذرزسشصضطظعغفقكلمنهويةئؤءآإ";
const VIBRANT_COLORS = ['#a855f7', '#10b981', '#f97316', '#ef4444', '#3b82f6', '#fbbf24'];

interface LandingPageProps {
  onStartGame: () => void; // دالة للانتقال لصفحة اللعبة
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartGame }) => {
  // توليد الحروف المتساقطة
  const fallingLetters = useMemo(() => 
    Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      char: ARABIC_LETTERS[Math.floor(Math.random() * ARABIC_LETTERS.length)],
      color: VIBRANT_COLORS[Math.floor(Math.random() * VIBRANT_COLORS.length)],
      left: `${Math.random() * 100}%`,
      duration: `${Math.random() * 12 + 15}s`,
      delay: `${Math.random() * 20}s`,
      size: `${Math.random() * 2.5 + 2}rem`,
    }))
  , []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#2d1154] text-white relative overflow-hidden">
      
      {/* طبقة الحروف المتساقطة */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {fallingLetters.map((letter) => (
          <div
            key={letter.id}
            className="absolute animate-fall"
            style={{
              left: letter.left,
              top: '-10%',
              fontSize: letter.size,
              color: letter.color,
              animationDuration: letter.duration,
              animationDelay: letter.delay,
              textShadow: `0 0 20px ${letter.color}, 0 0 40px ${letter.color}`,
              fontWeight: 900,
              opacity: 0.6,
              fontFamily: 'Tajawal, sans-serif',
            }}
          >
            {letter.char}
          </div>
        ))}
      </div>

      {/* المحتوى الرئيسي */}
      <div className="relative z-10">
        
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 to-transparent" />
          
          <div className="relative max-w-7xl mx-auto px-6 py-20 text-center">
            
            {/* الأيقونة المتحركة */}
            <div className="inline-block mb-8 relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-orange-500 via-pink-500 to-purple-600 rounded-3xl blur-2xl opacity-70 animate-pulse-slow" />
              <div className="relative w-28 h-28 bg-gradient-to-tr from-orange-500 via-pink-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/50 animate-float transform hover:scale-110 transition-transform duration-300">
                <Sparkles size={56} className="text-white" strokeWidth={2.5} />
                <Zap 
                  className="absolute -top-2 -right-2 text-yellow-400 animate-bounce"
                  size={24}
                  style={{ filter: 'drop-shadow(0 0 10px #fbbf24)' }}
                />
              </div>
            </div>

            {/* العنوان الرئيسي */}
            <h1 
              className="text-7xl md:text-8xl font-black mb-6 leading-tight animate-fade-in"
              style={{
                background: 'linear-gradient(135deg, #f97316 0%, #ec4899 30%, #a855f7 60%, #3b82f6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.03em',
                textShadow: '0 0 80px rgba(168, 85, 247, 0.5)',
              }}
            >
              حرب الحروف
            </h1>

            {/* النبذة */}
            <p className="text-2xl text-purple-200 mb-12 max-w-4xl mx-auto leading-relaxed font-semibold animate-fade-in-delay">
              لعبة تنافسية ملحمية! اختبر ذكاءك، استخدم البطاقات الإستراتيجية،
              <br />
              <span className="text-orange-400">واهزم خصومك في معركة الحروف النهائية! ⚔️</span>
            </p>

            {/* زر إنشاء لعبة - عصري ومميز */}
            <button
              onClick={onStartGame}
              className="group relative inline-flex items-center gap-4 px-12 py-6 text-2xl font-black text-white overflow-hidden rounded-3xl transition-all duration-500 hover:scale-105 hover:shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #a855f7 100%)',
                boxShadow: '0 20px 60px rgba(249, 115, 22, 0.4), 0 0 40px rgba(236, 72, 153, 0.3)',
              }}
            >
              {/* توهج خلفي متحرك */}
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
              
              {/* المحتوى */}
              <div className="relative flex items-center gap-4">
                <Play 
                  size={32} 
                  className="group-hover:translate-x-[-6px] transition-transform duration-300" 
                  fill="currentColor"
                />
                <span>ابدأ اللعبة الآن</span>
                <div className="w-3 h-3 bg-green-400 rounded-full animate-ping absolute -right-2 -top-2" />
              </div>
            </button>

            {/* معلومة إضافية */}
            <p className="mt-8 text-purple-400 text-sm font-semibold flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              متصل الآن - جاهز للعب!
            </p>
          </div>
        </div>

        {/* الخط الفاصل المتوهج */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div 
            className="h-px relative"
            style={{
              background: 'linear-gradient(90deg, transparent, #a855f7, #ec4899, #f97316, transparent)',
              boxShadow: '0 0 20px rgba(168, 85, 247, 0.5)',
            }}
          >
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-6 py-2 bg-[#1a0b2e] rounded-full border-2 border-purple-500/50">
              <Sparkles size={20} className="text-purple-400" />
            </div>
          </div>
        </div>

        {/* Categories Section */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-black mb-4 inline-block" style={{
              background: 'linear-gradient(135deg, #f97316, #ec4899, #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              🎯 أنواع الأسئلة
            </h2>
            <p className="text-purple-300 text-lg font-semibold">اضغط على أي بطاقة لرؤية التفاصيل والإحصائيات</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </section>

        {/* الخط الفاصل المتوهج */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div 
            className="h-px relative"
            style={{
              background: 'linear-gradient(90deg, transparent, #ec4899, #a855f7, #3b82f6, transparent)',
              boxShadow: '0 0 20px rgba(236, 72, 153, 0.5)',
            }}
          >
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-6 py-2 bg-[#1a0b2e] rounded-full border-2 border-pink-500/50">
              <Zap size={20} className="text-pink-400" />
            </div>
          </div>
        </div>

        {/* Action Cards Section */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-black mb-4 inline-block" style={{
              background: 'linear-gradient(135deg, #ec4899, #a855f7, #3b82f6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              🃏 البطاقات الإستراتيجية
            </h2>
            <p className="text-purple-300 text-lg font-semibold">استخدم البطاقات بذكاء لتغيير مجرى المعركة!</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-8">
            {actionCards.map((card) => (
              <ActionCardComponent key={card.id} card={card} />
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="relative mt-24 bg-black/30 backdrop-blur-lg border-t-2 border-purple-500/30">
          <div className="max-w-7xl mx-auto px-6 py-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              
              {/* اللوجو والنص */}
              <div className="text-center md:text-right">
                <h3 className="text-2xl font-black mb-2" style={{
                  background: 'linear-gradient(135deg, #f97316, #ec4899)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  حرب الحروف
                </h3>
                <p className="text-purple-400 text-sm">اللعبة العربية الأولى للتحدي والمنافسة</p>
              </div>

              {/* الروابط */}
              <div className="flex items-center gap-8">
                <a
                  href="#"
                  className="group flex items-center gap-3 px-6 py-3 bg-purple-600/20 hover:bg-purple-600/40 rounded-xl border-2 border-purple-500/30 hover:border-purple-500/60 transition-all duration-300 hover:scale-105"
                >
                  <ShoppingBag size={22} className="text-purple-300 group-hover:text-white transition-colors" />
                  <span className="font-bold text-purple-300 group-hover:text-white transition-colors">المتجر</span>
                </a>
                <a
                  href="#"
                  className="group flex items-center gap-3 px-6 py-3 bg-pink-600/20 hover:bg-pink-600/40 rounded-xl border-2 border-pink-500/30 hover:border-pink-500/60 transition-all duration-300 hover:scale-105"
                >
                  <Phone size={22} className="text-pink-300 group-hover:text-white transition-colors" />
                  <span className="font-bold text-pink-300 group-hover:text-white transition-colors">تواصل معنا</span>
                </a>
              </div>
            </div>

            {/* حقوق النشر */}
            <div className="mt-8 pt-6 border-t border-purple-500/20 text-center">
              <p className="text-purple-400 text-sm">
                © 2025 حرب الحروف. جميع الحقوق محفوظة. | صُنع بـ <span className="text-red-500">❤️</span> في السعودية
              </p>
            </div>
          </div>
        </footer>
      </div>

      {/* CSS للأنيميشنز */}
      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(110vh) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-15px);
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.7;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-delay {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fall {
          animation: fall linear infinite;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }

        .animate-fade-in-delay {
          animation: fade-in-delay 1s ease-out 0.3s both;
        }
      `}</style>
    </div>
  );
};
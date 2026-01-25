// src/components/AuthGate.tsx
import React, { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, ShieldCheck, ArrowRight, Lock, Sparkles, Moon, Sun } from 'lucide-react';

const ARABIC_LETTERS = "";

const VIBRANT_COLORS = [
  '#a855f7', '#10b981', '#f97316', '#ef4444', '#3b82f6', '#fbbf24',
];

export const AuthGate: React.FC<{ onVerified: () => void }> = ({ onVerified }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);

  const fallingLetters = useMemo(() => 
    Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      char: ARABIC_LETTERS[Math.floor(Math.random() * ARABIC_LETTERS.length)],
      color: VIBRANT_COLORS[Math.floor(Math.random() * VIBRANT_COLORS.length)],
      left: `${Math.random() * 100}%`,
      duration: `${Math.random() * 10 + 12}s`,
      delay: `${Math.random() * 15}s`,
      size: `${Math.random() * 2 + 2.5}rem`,
    }))
  , []);

  const handleSendOTP = async () => {
    if (!email) {
      setError('الرجاء إدخال البريد الإلكتروني');
      return;
    }
    
    setLoading(true);
    setError('');
    
    // إرسال OTP كود بدل Magic Link
    const { error: authError } = await supabase.auth.signInWithOtp({ 
      email,
      options: {
        shouldCreateUser: false,
        // هذا يجبر Supabase على إرسال OTP كود
        data: {
          type: 'email'
        }
      }
    });
    
    if (!authError) {
      setStep('otp');
    } else {
      setError('البريد الإلكتروني غير مسجل');
    }
    
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError('الرجاء إدخال رمز التحقق كاملاً');
      return;
    }

    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email' // هذا مهم لتحديد نوع OTP
    });

    if (!authError) {
      onVerified();
    } else {
      setError('رمز التحقق غير صحيح');
    }

    setLoading(false);
  };

  // Google OAuth تسجيل دخول عبر
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    });

    if (authError) {
      setError('فشل تسجيل الدخول عبر Google');
      setLoading(false);
    }
    // سيتم إعادة التوجيه تلقائياً بعد النجاح
  };

  // التدرجات المنفصلة لكل وضع
  const titleGradient = isDarkMode
    ? 'linear-gradient(135deg, #f97316 0%, #ec4899 30%, #a855f7 60%, #3b82f6 100%)'
    : 'linear-gradient(135deg, #ea580c 0%, #db2777 30%, #9333ea 60%, #2563eb 100%)';

  return (
    <>
      <style>{`
        @keyframes letterFall {
          0% {
            transform: translateY(0) rotate(0deg);
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

        @keyframes gradientShift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes gentlePulse {
          0%, 100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.35;
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .auth-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          transition: background-color 0.5s ease;
        }

        .auth-content {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 520px;
          padding: 0 1.5rem;
        }

        .game-title {
          background: ${titleGradient};
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
        }
      `}</style>

      <div 
        className="auth-container" 
        style={{ 
          background: isDarkMode 
            ? 'linear-gradient(135deg, #0a0118 0%, #1a0b2e 50%, #2d1154 100%)'
            : 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #e9d5ff 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradientShift 15s ease infinite'
        }}
      >
        
        {/* زر Dark/Light Mode */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          style={{
            position: 'fixed',
            top: '1.5rem',
            right: '1.5rem',
            zIndex: 50,
            width: '3rem',
            height: '3rem',
            borderRadius: '50%',
            background: isDarkMode 
              ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))'
              : 'linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(236, 72, 153, 0.15))',
            backdropFilter: 'blur(10px)',
            border: `2px solid ${isDarkMode ? 'rgba(168, 85, 247, 0.3)' : 'rgba(124, 58, 237, 0.25)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: isDarkMode 
              ? '0 4px 20px rgba(168, 85, 247, 0.25)' 
              : '0 4px 20px rgba(124, 58, 237, 0.15)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1) rotate(10deg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
          }}
        >
          {isDarkMode ? (
            <Sun size={18} color="#fbbf24" />
          ) : (
            <Moon size={18} color="#7c3aed" />
          )}
        </button>

        {/* طبقة الحروف المتساقطة */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          {fallingLetters.map((letter) => (
            <div
              key={letter.id}
              style={{
                position: 'absolute',
                left: letter.left,
                top: '-10%',
                fontSize: letter.size,
                color: letter.color,
                animation: `letterFall ${letter.duration} linear infinite`,
                animationDelay: letter.delay,
                textShadow: `0 0 20px ${letter.color}, 0 0 40px ${letter.color}`,
                fontWeight: 900,
                opacity: isDarkMode ? 0.6 : 0.3,
                fontFamily: 'Tajawal, sans-serif'
              }}
            >
              {letter.char}
            </div>
          ))}
        </div>

        {/* المحتوى */}
        <div className="auth-content">
          
          {/* اسم اللعبة فوق الكارد */}
          <div 
            style={{
              textAlign: 'center',
              marginBottom: '2rem',
              animation: 'float 3s ease-in-out infinite'
            }}
          >
            <h1 
              className="game-title"
              style={{
                fontSize: '4rem',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                marginBottom: '0.5rem',
                filter: isDarkMode 
                  ? 'drop-shadow(0 0 30px rgba(168, 85, 247, 0.4))'
                  : 'drop-shadow(0 0 20px rgba(124, 58, 237, 0.2))',
              }}
            >
              حرب الحروف
            </h1>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}>
              <div 
                style={{
                  width: '2.5rem',
                  height: '2px',
                  background: isDarkMode
                    ? 'linear-gradient(90deg, transparent, #a855f7, transparent)'
                    : 'linear-gradient(90deg, transparent, #9333ea, transparent)'
                }}
              />
              <Sparkles 
                size={16} 
                style={{ 
                  color: isDarkMode ? '#fbbf24' : '#f59e0b',
                  filter: 'drop-shadow(0 0 8px currentColor)'
                }}
              />
              <div 
                style={{
                  width: '2.5rem',
                  height: '2px',
                  background: isDarkMode
                    ? 'linear-gradient(90deg, transparent, #a855f7, transparent)'
                    : 'linear-gradient(90deg, transparent, #9333ea, transparent)'
                }}
              />
            </div>
          </div>

          {/* التوهج الخارجي */}
          <div 
            style={{
              position: 'absolute',
              left: '1.5rem',
              right: '1.5rem',
              top: '8rem',
              bottom: 0,
              borderRadius: '2rem',
              filter: 'blur(50px)',
              background: isDarkMode
                ? 'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f97316 100%)'
                : 'linear-gradient(135deg, #9333ea 0%, #db2777 50%, #ea580c 100%)',
              animation: 'gentlePulse 4s ease-in-out infinite',
              opacity: isDarkMode ? 0.25 : 0.15
            }}
          />

          {/* الكارد الرئيسي */}
          <div 
            style={{
              position: 'relative',
              borderRadius: '2rem',
              padding: '2.5rem',
              border: isDarkMode
                ? '2px solid rgba(168, 85, 247, 0.25)'
                : '2px solid rgba(124, 58, 237, 0.2)',
              background: isDarkMode
                ? 'rgba(26, 11, 46, 0.6)'
                : 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: isDarkMode 
                ? '0 0 60px rgba(168, 85, 247, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.1)' 
                : '0 10px 40px rgba(124, 58, 237, 0.15)',
              transition: 'all 0.5s ease'
            }}
          >
            
            {/* الأيقونة */}
            <div style={{ position: 'relative', width: '4.5rem', height: '4.5rem', margin: '0 auto 1.5rem' }}>
              <div 
                style={{
                  position: 'absolute',
                  inset: '-0.5rem',
                  borderRadius: '1.25rem',
                  filter: 'blur(20px)',
                  background: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #a855f7 100%)',
                  animation: 'gentlePulse 3s ease-in-out infinite',
                  opacity: 0.4
                }}
              />
              <div 
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  borderRadius: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #a855f7 100%)',
                  boxShadow: '0 8px 25px rgba(168, 85, 247, 0.35)'
                }}
              >
                <ShieldCheck size={36} color="white" strokeWidth={2.5} />
                <Sparkles 
                  style={{
                    position: 'absolute',
                    top: '-0.5rem',
                    right: '-0.5rem',
                    color: '#fde047',
                    filter: 'drop-shadow(0 0 6px currentColor)'
                  }}
                  size={16}
                />
              </div>
            </div>

            {/* العنوان الفرعي */}
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <p style={{ 
                color: isDarkMode ? '#e9d5ff' : '#7c3aed', 
                fontSize: '2rem', 
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}>
                <Lock size={16} />
                التحقق من الأيميل
              </p>
            </div>

            {/* الخط الفاصل */}
            <div 
              style={{
                height: '1px',
                width: '100%',
                marginBottom: '1.5rem',
                background: isDarkMode 
                  ? 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.4), transparent)'
                  : 'linear-gradient(90deg, transparent, rgba(124, 58, 237, 0.25), transparent)'
              }}
            />

            {/* رسالة الخطأ */}
            {error && (
              <div 
                style={{
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  borderRadius: '0.875rem',
                  textAlign: 'center',
                  color: '#ef4444',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1.5px solid rgba(239, 68, 68, 0.25)'
                }}
              >
                {error}
              </div>
            )}

            {step === 'email' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* حقل البريد الإلكتروني - عريض */}
                <div style={{ position: 'relative', width: '100%' }}>
                  <Mail 
                    style={{
                      position: 'absolute',
                      right: '25rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: isDarkMode ? '#c084fc' : '#9333ea',
                      zIndex: 2
                    }}
                    size={20}
                  />
                  <input
                    type="email"
                    placeholder= "أدخل بريدك الإلكتروني           "
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendOTP()}
                    style={{
                      width: '85%',
                      padding: '0.75rem 1rem 0.75rem 3rem',
                      borderRadius: '1rem',
                      color: isDarkMode ? '#ffffff' : '#1a0b2e',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      textAlign: 'right',
                      outline: 'none',
                      transition: 'all 0.3s',
                      background: isDarkMode 
                        ? 'rgba(168, 85, 247, 0.08)' 
                        : 'rgba(255, 255, 255, 0.6)',
                      border: isDarkMode
                        ? '2px solid rgba(168, 85, 247, 0.2)'
                        : '2px solid rgba(124, 58, 237, 0.2)',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#f97316';
                      e.target.style.background = isDarkMode 
                        ? 'rgba(168, 85, 247, 0.12)' 
                        : 'rgba(255, 255, 255, 0.9)';
                      e.target.style.boxShadow = '0 0 0 4px rgba(249, 115, 22, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = isDarkMode 
                        ? 'rgba(168, 85, 247, 0.2)' 
                        : 'rgba(124, 58, 237, 0.2)';
                      e.target.style.background = isDarkMode 
                        ? 'rgba(168, 85, 247, 0.08)' 
                        : 'rgba(255, 255, 255, 0.6)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* زر الإرسال */}
                <button
                  onClick={handleSendOTP}
                  disabled={loading || !email}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '1rem',
                    color: 'white',
                    fontWeight: 900,
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.3s',
                    cursor: loading || !email ? 'not-allowed' : 'pointer',
                    opacity: loading || !email ? 0.5 : 1,
                    border: 'none',
                    background: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #a855f7 100%)',
                    boxShadow: '0 4px 20px rgba(249, 115, 22, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && email) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 30px rgba(249, 115, 22, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(249, 115, 22, 0.3)';
                  }}
                >
                  {loading ? (
                    <>
                      <div style={{
                        width: '1.25rem',
                        height: '1.25rem',
                        border: '2.5px solid rgba(255, 255, 255, 0.3)',
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                      }} />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      إرسال رمز التحقق
                      <ArrowRight size={22} />
                    </>
                  )}
                </button>

                {/* خط فاصل "أو" */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  margin: '0.5rem 0',
                }}>
                  <div style={{
                    flex: 1,
                    height: '1px',
                    background: isDarkMode
                      ? 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.3), transparent)'
                      : 'linear-gradient(90deg, transparent, rgba(124, 58, 237, 0.2), transparent)'
                  }} />
                  <span style={{
                    color: isDarkMode ? 'rgba(233, 213, 255, 0.5)' : 'rgba(124, 58, 237, 0.5)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}>أو</span>
                  <div style={{
                    flex: 1,
                    height: '1px',
                    background: isDarkMode
                      ? 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.3), transparent)'
                      : 'linear-gradient(90deg, transparent, rgba(124, 58, 237, 0.2), transparent)'
                  }} />
                </div>

                {/* زر Google OAuth */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '1rem',
                    color: isDarkMode ? 'white' : '#1a0b2e',
                    fontWeight: 900,
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    transition: 'all 0.3s',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1,
                    border: `2px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(124, 58, 237, 0.2)'}`,
                    background: isDarkMode
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'white',
                    boxShadow: isDarkMode
                      ? '0 4px 20px rgba(255, 255, 255, 0.1)'
                      : '0 4px 20px rgba(124, 58, 237, 0.15)'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = isDarkMode
                        ? '0 6px 30px rgba(255, 255, 255, 0.15)'
                        : '0 6px 30px rgba(124, 58, 237, 0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = isDarkMode
                      ? '0 4px 20px rgba(255, 255, 255, 0.1)'
                      : '0 4px 20px rgba(124, 58, 237, 0.15)';
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  تسجيل الدخول عبر Google
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* رسالة تأكيد الإرسال */}
                <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                  <p style={{ 
                    color: isDarkMode ? '#e9d5ff' : '#7c3aed', 
                    fontWeight: 600, 
                    marginBottom: '0.25rem', 
                    fontSize: '0.875rem' 
                  }}>
                    تم إرسال الرمز إلى
                  </p>
                  <p style={{ 
                    color: '#f97316', 
                    fontWeight: 900, 
                    fontSize: '1.125rem',
                    filter: 'drop-shadow(0 0 10px rgba(249, 115, 22, 0.3))'
                  }}>
                    {email}
                  </p>
                </div>

                {/* حقل OTP - عريض */}
                <div style={{ position: 'relative', width: '85%' }}>
                  <Lock 
                    style={{
                      position: 'absolute',
                      right: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: isDarkMode ? '#c084fc' : '#9333ea',
                      zIndex: 2
                    }}
                    size={20}
                  />
                  <input
                    type="text"
                    placeholder="● ● ● ● ● ●"
                    value={otp}
                    maxLength={6}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    onKeyPress={(e) => e.key === 'Enter' && handleVerifyOTP()}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 3rem',
                      borderRadius: '1rem',
                      color: isDarkMode ? '#ffffff' : '#1a0b2e',
                      fontSize: '1.5rem',
                      fontWeight: 900,
                      textAlign: 'center',
                      outline: 'none',
                      transition: 'all 0.3s',
                      background: isDarkMode 
                        ? 'rgba(168, 85, 247, 0.08)' 
                        : 'rgba(255, 255, 255, 0.6)',
                      border: isDarkMode
                        ? '2px solid rgba(168, 85, 247, 0.2)'
                        : '2px solid rgba(124, 58, 237, 0.2)',
                      letterSpacing: '0.4em'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#a855f7';
                      e.target.style.background = isDarkMode 
                        ? 'rgba(168, 85, 247, 0.12)' 
                        : 'rgba(255, 255, 255, 0.9)';
                      e.target.style.boxShadow = '0 0 0 4px rgba(168, 85, 247, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = isDarkMode 
                        ? 'rgba(168, 85, 247, 0.2)' 
                        : 'rgba(124, 58, 237, 0.2)';
                      e.target.style.background = isDarkMode 
                        ? 'rgba(168, 85, 247, 0.08)' 
                        : 'rgba(255, 255, 255, 0.6)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* زر التحقق */}
                <button
                  onClick={handleVerifyOTP}
                  disabled={loading || otp.length !== 6}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '1rem',
                    color: 'white',
                    fontWeight: 900,
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.3s',
                    cursor: loading || otp.length !== 6 ? 'not-allowed' : 'pointer',
                    opacity: loading || otp.length !== 6 ? 0.5 : 1,
                    border: 'none',
                    background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #a855f7 100%)',
                    boxShadow: '0 4px 20px rgba(168, 85, 247, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && otp.length === 6) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 30px rgba(168, 85, 247, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(168, 85, 247, 0.3)';
                  }}
                >
                  {loading ? (
                    <>
                      <div style={{
                        width: '1.25rem',
                        height: '1.25rem',
                        border: '2.5px solid rgba(255, 255, 255, 0.3)',
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                      }} />
                      جاري التحقق...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={22} />
                      تأكيد ودخول اللعبة
                    </>
                  )}
                </button>

                {/* زر العودة */}
                <button
                  onClick={() => {
                    setStep('email');
                    setOtp('');
                    setError('');
                  }}
                  style={{
                    width: '100%',
                    color: isDarkMode ? '#e9d5ff' : '#7c3aed',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    transition: 'all 0.3s',
                    padding: '0.5rem',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#f97316';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = isDarkMode ? '#e9d5ff' : '#7c3aed';
                  }}
                >
                  ← تغيير البريد الإلكتروني
                </button>
              </div>
            )}

            {/* النص السفلي */}
            <p style={{
              textAlign: 'center',
              marginTop: '1.25rem',
              color: isDarkMode ? 'rgba(233, 213, 255, 0.4)' : 'rgba(124, 58, 237, 0.4)',
              fontWeight: 600,
              fontSize: '0.75rem'
            }}>
             Meshal alshammari || XG3U
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
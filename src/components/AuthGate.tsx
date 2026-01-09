// src/components/AuthGate.tsx
import React, { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, ShieldCheck, ArrowRight, Lock, Sparkles, Moon, Sun } from 'lucide-react';

const ARABIC_LETTERS = "أبتثجحخدذرزسشصضطظعغفقكلمنهويةئؤءآإ";

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
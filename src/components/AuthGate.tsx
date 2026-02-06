// src/components/AuthGate.tsx
import React, { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, ShieldCheck, ArrowRight, Sparkles, Moon, Sun, UserPlus, LogIn, User } from 'lucide-react';

const ARABIC_LETTERS = "أبتثجحخدذرزسشصضطظعغفقكلمنهوي";

const VIBRANT_COLORS = [
  '#a855f7', '#10b981', '#f97316', '#ef4444', '#3b82f6', '#fbbf24',
];

// التحقق من صحة الإيميل
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

export const AuthGate: React.FC<{ onVerified: () => void }> = ({ onVerified }) => {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [otp, setOtp] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState<'form' | 'otp'>('form');
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

  // تسجيل الدخول - إرسال OTP
  const handleLogin = async () => {
    if (!email) {
      setError('الرجاء إدخال البريد الإلكتروني');
      return;
    }

    if (!isValidEmail(email)) {
      setError('الرجاء إدخال بريد إلكتروني صحيح');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // التحقق أولاً من وجود الإيميل في جدول buyers
      const { data: existingUser } = await supabase
        .from('buyers')
        .select('email')
        .eq('email', email)
        .single();

      if (!existingUser) {
        setError('هذا البريد غير مسجل. الرجاء إنشاء حساب جديد أولاً');
        setLoading(false);
        return;
      }

      // الإيميل موجود، إرسال OTP
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false, // لا تنشئ حساب جديد
        }
      });

      if (!authError) {
        setStep('otp');
      } else {
        if (authError.message.includes('rate limit')) {
          setError('تم إرسال عدة رسائل. الرجاء الانتظار قليلاً ثم المحاولة مرة أخرى');
        } else if (authError.message.includes('invalid') || authError.message.includes('Invalid')) {
          setError('البريد الإلكتروني غير صالح. الرجاء التحقق منه');
        } else {
          setError('حدث خطأ في إرسال رمز التحقق. الرجاء المحاولة مرة أخرى');
          console.error('Login error:', authError.message);
        }
      }
    } catch (err) {
      setError('حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى');
      console.error('Unexpected error:', err);
    }

    setLoading(false);
  };

  // إنشاء حساب جديد - إرسال OTP
  const handleRegister = async () => {
    if (!firstName.trim()) {
      setError('الرجاء إدخال الاسم الأول');
      return;
    }

    if (!email) {
      setError('الرجاء إدخال البريد الإلكتروني');
      return;
    }

    if (!isValidEmail(email)) {
      setError('الرجاء إدخال بريد إلكتروني صحيح (مثال: name@example.com)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // الخطوة 1: التحقق من عدم وجود الإيميل في جدول buyers
      const { data: existingUser } = await supabase
        .from('buyers')
        .select('email')
        .eq('email', email)
        .single();

      if (existingUser) {
        setError('هذا البريد الإلكتروني مسجل مسبقاً. الرجاء تسجيل الدخول بدلاً من إنشاء حساب جديد');
        setLoading(false);
        return;
      }

      // الخطوة 2: إرسال OTP للتسجيل
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true, // إنشاء حساب جديد
          data: {
            first_name: firstName.trim(),
          }
        }
      });

      if (!authError) {
        setStep('otp');
      } else {
        if (authError.message.includes('rate limit')) {
          setError('تم إرسال عدة رسائل. الرجاء الانتظار قليلاً ثم المحاولة مرة أخرى');
        } else if (authError.message.includes('invalid') || authError.message.includes('Invalid')) {
          setError('البريد الإلكتروني غير صالح. الرجاء التحقق منه');
        } else {
          setError('حدث خطأ في إنشاء الحساب. الرجاء المحاولة مرة أخرى');
          console.error('Register error:', authError.message);
        }
      }
    } catch (err) {
      setError('حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى');
      console.error('Unexpected error:', err);
    }

    setLoading(false);
  };

  // التحقق من رمز OTP
  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError('الرجاء إدخال رمز التحقق كاملاً (6 أرقام)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email'
      });

      if (!authError && data.user) {
        // إذا كان التسجيل جديد، أضف المستخدم في جدول buyers
        if (mode === 'register') {
          // التحقق أولاً إذا المستخدم موجود في buyers
          const { data: existingBuyer } = await supabase
            .from('buyers')
            .select('id')
            .eq('email', email)
            .single();

          if (!existingBuyer) {
            const { error: insertError } = await supabase
              .from('buyers')
              .insert({
                id: data.user.id,
                email: email,
                plan_type: 'free', // الخطة الافتراضية
              });

            if (insertError) {
              console.error('Error adding user to buyers:', insertError);
              // نستمر حتى لو فشل الإدخال - المستخدم مسجل في auth
            } else {
              console.log('✅ User added to buyers table');
            }
          }
        }

        onVerified();
      } else {
        setError('رمز التحقق غير صحيح أو منتهي الصلاحية');
      }
    } catch (err) {
      setError('حدث خطأ غير متوقع');
      console.error('Verify OTP error:', err);
    }

    setLoading(false);
  };

  // إعادة إرسال رمز التحقق
  const handleResendOTP = async () => {
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: mode === 'register',
        data: mode === 'register' ? { first_name: firstName.trim() } : undefined
      }
    });

    if (!authError) {
      setError('');
      alert('تم إرسال رمز جديد إلى بريدك الإلكتروني');
    } else {
      setError('حدث خطأ في إعادة الإرسال');
    }

    setLoading(false);
  };

  const titleGradient = isDarkMode
    ? 'linear-gradient(135deg, #f97316 0%, #ec4899 30%, #a855f7 60%, #3b82f6 100%)'
    : 'linear-gradient(135deg, #ea580c 0%, #db2777 30%, #9333ea 60%, #2563eb 100%)';

  return (
    <>
      <style>{`
        @keyframes letterFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes gentlePulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.35; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .auth-container {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          width: 100vw; height: 100vh;
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
          <div style={{ textAlign: 'center', marginBottom: '2rem', animation: 'float 3s ease-in-out infinite' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '2.5rem',
                height: '2px',
                background: isDarkMode
                  ? 'linear-gradient(90deg, transparent, #a855f7, transparent)'
                  : 'linear-gradient(90deg, transparent, #9333ea, transparent)'
              }} />
              <Sparkles size={16} style={{ color: isDarkMode ? '#fbbf24' : '#f59e0b', filter: 'drop-shadow(0 0 8px currentColor)' }} />
              <div style={{
                width: '2.5rem',
                height: '2px',
                background: isDarkMode
                  ? 'linear-gradient(90deg, transparent, #a855f7, transparent)'
                  : 'linear-gradient(90deg, transparent, #9333ea, transparent)'
              }} />
            </div>
          </div>

          {/* التوهج الخارجي */}
          <div
            style={{
              position: 'absolute',
              left: '1.5rem', right: '1.5rem', top: '8rem', bottom: 0,
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
              border: isDarkMode ? '2px solid rgba(168, 85, 247, 0.25)' : '2px solid rgba(124, 58, 237, 0.2)',
              background: isDarkMode ? 'rgba(26, 11, 46, 0.6)' : 'rgba(255, 255, 255, 0.85)',
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
                {step === 'otp' ? (
                  <ShieldCheck size={36} color="white" strokeWidth={2.5} />
                ) : mode === 'login' ? (
                  <LogIn size={36} color="white" strokeWidth={2.5} />
                ) : (
                  <UserPlus size={36} color="white" strokeWidth={2.5} />
                )}
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

            {/* العنوان */}
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <p style={{
                color: isDarkMode ? '#e9d5ff' : '#7c3aed',
                fontSize: '1.75rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}>
                {step === 'otp' ? (
                  <>
                    <ShieldCheck size={20} />
                    تأكيد البريد الإلكتروني
                  </>
                ) : mode === 'login' ? (
                  <>
                    <LogIn size={20} />
                    تسجيل الدخول
                  </>
                ) : (
                  <>
                    <UserPlus size={20} />
                    إنشاء حساب جديد
                  </>
                )}
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

            {step === 'form' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* حقل الاسم الأول - فقط في إنشاء الحساب */}
                {mode === 'register' && (
                  <div style={{ position: 'relative', width: '100%' }}>
                    <User
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
                      placeholder="الاسم الأول"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
                      style={{
                        width: '100%',
                        padding: '0.875rem 1rem 0.875rem 1rem',
                        paddingRight: '3rem',
                        borderRadius: '1rem',
                        color: isDarkMode ? '#ffffff' : '#1a0b2e',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        textAlign: 'right',
                        outline: 'none',
                        transition: 'all 0.3s',
                        background: isDarkMode ? 'rgba(168, 85, 247, 0.08)' : 'rgba(255, 255, 255, 0.6)',
                        border: isDarkMode ? '2px solid rgba(168, 85, 247, 0.2)' : '2px solid rgba(124, 58, 237, 0.2)',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#10b981';
                        e.target.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = isDarkMode ? 'rgba(168, 85, 247, 0.2)' : 'rgba(124, 58, 237, 0.2)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                )}

                {/* حقل البريد الإلكتروني */}
                <div style={{ position: 'relative', width: '100%' }}>
                  <Mail
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
                    type="email"
                    placeholder="البريد الإلكتروني (مثال: name@gmail.com)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleRegister())}
                    style={{
                      width: '100%',
                      padding: '0.875rem 1rem 0.875rem 1rem',
                      paddingRight: '3rem',
                      borderRadius: '1rem',
                      color: isDarkMode ? '#ffffff' : '#1a0b2e',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      textAlign: 'right',
                      outline: 'none',
                      transition: 'all 0.3s',
                      background: isDarkMode ? 'rgba(168, 85, 247, 0.08)' : 'rgba(255, 255, 255, 0.6)',
                      border: isDarkMode ? '2px solid rgba(168, 85, 247, 0.2)' : '2px solid rgba(124, 58, 237, 0.2)',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#f97316';
                      e.target.style.boxShadow = '0 0 0 4px rgba(249, 115, 22, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = isDarkMode ? 'rgba(168, 85, 247, 0.2)' : 'rgba(124, 58, 237, 0.2)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* زر إرسال رمز التحقق */}
                <button
                  onClick={mode === 'login' ? handleLogin : handleRegister}
                  disabled={loading || !email || (mode === 'register' && !firstName.trim())}
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    borderRadius: '1rem',
                    color: 'white',
                    fontWeight: 900,
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.3s',
                    cursor: loading || !email || (mode === 'register' && !firstName.trim()) ? 'not-allowed' : 'pointer',
                    opacity: loading || !email || (mode === 'register' && !firstName.trim()) ? 0.5 : 1,
                    border: 'none',
                    background: mode === 'login'
                      ? 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #a855f7 100%)'
                      : 'linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #06b6d4 100%)',
                    boxShadow: mode === 'login'
                      ? '0 4px 20px rgba(249, 115, 22, 0.3)'
                      : '0 4px 20px rgba(16, 185, 129, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && email && (mode === 'login' || firstName.trim())) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
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

                {/* خط فاصل */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.5rem 0' }}>
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

                {/* زر التبديل بين تسجيل الدخول وإنشاء حساب */}
                <button
                  onClick={() => {
                    setMode(mode === 'login' ? 'register' : 'login');
                    setError('');
                    setFirstName('');
                  }}
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    borderRadius: '1rem',
                    color: isDarkMode ? '#e9d5ff' : '#7c3aed',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.3s',
                    cursor: 'pointer',
                    border: `2px solid ${isDarkMode ? 'rgba(168, 85, 247, 0.3)' : 'rgba(124, 58, 237, 0.2)'}`,
                    background: isDarkMode ? 'rgba(168, 85, 247, 0.1)' : 'rgba(124, 58, 237, 0.05)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDarkMode ? 'rgba(168, 85, 247, 0.2)' : 'rgba(124, 58, 237, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isDarkMode ? 'rgba(168, 85, 247, 0.1)' : 'rgba(124, 58, 237, 0.05)';
                  }}
                >
                  {mode === 'login' ? (
                    <>
                      <UserPlus size={20} />
                      ليس لديك حساب؟ أنشئ حساباً جديداً
                    </>
                  ) : (
                    <>
                      <LogIn size={20} />
                      لديك حساب؟ سجل دخولك
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* شاشة إدخال رمز التحقق */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* رسالة تأكيد الإرسال */}
                <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                  <p style={{
                    color: isDarkMode ? '#e9d5ff' : '#7c3aed',
                    fontWeight: 600,
                    marginBottom: '0.25rem',
                    fontSize: '0.875rem'
                  }}>
                    تم إرسال رمز التحقق إلى
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

                {/* حقل OTP */}
                <div style={{ position: 'relative', width: '100%' }}>
                  <ShieldCheck
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
                      padding: '1rem',
                      paddingRight: '3rem',
                      borderRadius: '1rem',
                      color: isDarkMode ? '#ffffff' : '#1a0b2e',
                      fontSize: '1.75rem',
                      fontWeight: 900,
                      textAlign: 'center',
                      outline: 'none',
                      transition: 'all 0.3s',
                      background: isDarkMode ? 'rgba(168, 85, 247, 0.08)' : 'rgba(255, 255, 255, 0.6)',
                      border: isDarkMode ? '2px solid rgba(168, 85, 247, 0.2)' : '2px solid rgba(124, 58, 237, 0.2)',
                      letterSpacing: '0.5em',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#a855f7';
                      e.target.style.boxShadow = '0 0 0 4px rgba(168, 85, 247, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = isDarkMode ? 'rgba(168, 85, 247, 0.2)' : 'rgba(124, 58, 237, 0.2)';
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
                    padding: '0.875rem',
                    borderRadius: '1rem',
                    color: 'white',
                    fontWeight: 900,
                    fontSize: '1rem',
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
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
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
                      تأكيد والدخول
                    </>
                  )}
                </button>

                {/* زر إعادة الإرسال */}
                <button
                  onClick={handleResendOTP}
                  disabled={loading}
                  style={{
                    width: '100%',
                    color: isDarkMode ? '#e9d5ff' : '#7c3aed',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    transition: 'all 0.3s',
                    padding: '0.5rem',
                    background: 'transparent',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#f97316';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = isDarkMode ? '#e9d5ff' : '#7c3aed';
                  }}
                >
                  لم يصلك الرمز؟ إعادة الإرسال
                </button>

                {/* زر العودة */}
                <button
                  onClick={() => {
                    setStep('form');
                    setOtp('');
                    setError('');
                  }}
                  style={{
                    width: '100%',
                    color: isDarkMode ? 'rgba(233, 213, 255, 0.6)' : 'rgba(124, 58, 237, 0.6)',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    transition: 'all 0.3s',
                    padding: '0.5rem',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = isDarkMode ? '#e9d5ff' : '#7c3aed';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = isDarkMode ? 'rgba(233, 213, 255, 0.6)' : 'rgba(124, 58, 237, 0.6)';
                  }}
                >
                  ← العودة لتغيير البيانات
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

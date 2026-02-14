// src/components/AuthGate.tsx
import React, { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, ArrowRight, Sparkles, Moon, Sun, UserPlus, LogIn, User, Eye, EyeOff } from 'lucide-react';

const ARABIC_LETTERS = "أبتثجحخدذرزسشصضطظعغفقكلمنهوي";

const VIBRANT_COLORS = [
  '#a855f7', '#10b981', '#f97316', '#ef4444', '#3b82f6', '#fbbf24',
];

// التحقق من صحة الإيميل
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

// التحقق من قوة الرمز (8 أحرف على الأقل)
const isValidPassword = (password: string): boolean => {
  return password.length >= 8;
};

export const AuthGate: React.FC<{ onVerified: () => void }> = ({ onVerified }) => {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);

  const fallingLetters = useMemo(() =>
    Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      char: ARABIC_LETTERS[Math.floor(Math.random() * ARABIC_LETTERS.length)],
      color: VIBRANT_COLORS[Math.floor(Math.random() * VIBRANT_COLORS.length)],
      left: `${Math.random() * 100}%`,
      duration: `${Math.random() * 10 + 14}s`,
      delay: `${Math.random() * 15}s`,
      size: `${Math.random() * 2 + 2.5}rem`,
    }))
  , []);

  // تسجيل الدخول بالإيميل والرمز
  const handleLogin = async () => {
    if (!email) {
      setError('الرجاء إدخال البريد الإلكتروني');
      return;
    }

    if (!isValidEmail(email)) {
      setError('الرجاء إدخال بريد إلكتروني صحيح');
      return;
    }

    if (!password) {
      setError('الرجاء إدخال الرمز السري');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!authError && data.user) {
        onVerified();
      } else {
        if (authError?.message.includes('Invalid login credentials')) {
          setError('البريد الإلكتروني أو الرمز السري غير صحيح');
        } else if (authError?.message.includes('Email not confirmed')) {
          setError('لم يتم تأكيد البريد الإلكتروني بعد');
        } else {
          setError('حدث خطأ في تسجيل الدخول. الرجاء المحاولة مرة أخرى');
          console.error('Login error:', authError?.message);
        }
      }
    } catch (err) {
      setError('حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى');
      console.error('Unexpected error:', err);
    }

    setLoading(false);
  };

  // إنشاء حساب جديد
  const handleRegister = async () => {
    if (!firstName.trim()) {
      setError('الرجاء إدخال الاسم');
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

    if (!isValidPassword(password)) {
      setError('الرمز السري يجب أن يكون 8 أحرف وأرقام على الأقل');
      return;
    }

    if (password !== confirmPassword) {
      setError('الرمز السري غير متطابق');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // التحقق من عدم وجود الإيميل في جدول buyers
      const { data: existingUser } = await supabase
        .from('buyers')
        .select('email')
        .eq('email', email)
        .single();

      if (existingUser) {
        setError('هذا البريد الإلكتروني مسجل مسبقاً. الرجاء تسجيل الدخول');
        setLoading(false);
        return;
      }

      // إنشاء الحساب
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
          }
        }
      });

      if (!authError && data.user) {
        // إضافة المستخدم في جدول buyers
        const { error: insertError } = await supabase
          .from('buyers')
          .insert({
            id: data.user.id,
            email: email,
            plan_type: 'free',
          });

        if (insertError) {
          console.error('Error adding user to buyers:', insertError);
        } else {
          console.log('User added to buyers table');
        }

        onVerified();
      } else {
        if (authError?.message.includes('already registered')) {
          setError('هذا البريد مسجل مسبقاً. الرجاء تسجيل الدخول');
        } else {
          setError('حدث خطأ في إنشاء الحساب. الرجاء المحاولة مرة أخرى');
          console.error('Register error:', authError?.message);
        }
      }
    } catch (err) {
      setError('حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى');
      console.error('Unexpected error:', err);
    }

    setLoading(false);
  };

  const titleGradient = isDarkMode
    ? 'linear-gradient(135deg, #f97316 0%, #ec4899 30%, #a855f7 60%, #3b82f6 100%)'
    : 'linear-gradient(135deg, #ea580c 0%, #db2777 30%, #9333ea 60%, #2563eb 100%)';

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.875rem 1rem',
    paddingRight: '3rem',
    borderRadius: '1rem',
    color: isDarkMode ? '#ffffff' : '#1a0b2e',
    fontSize: '0.95rem',
    fontWeight: 600,
    textAlign: 'right',
    outline: 'none',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
    background: isDarkMode ? 'rgba(168, 85, 247, 0.08)' : 'rgba(255, 255, 255, 0.6)',
    border: isDarkMode ? '2px solid rgba(168, 85, 247, 0.2)' : '2px solid rgba(124, 58, 237, 0.2)',
    boxSizing: 'border-box' as const,
  };

  const iconStyle: React.CSSProperties = {
    position: 'absolute',
    right: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: isDarkMode ? '#c084fc' : '#9333ea',
    zIndex: 2,
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>, color: string) => {
    e.target.style.borderColor = color;
    e.target.style.boxShadow = `0 0 0 3px ${color}15`;
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = isDarkMode ? 'rgba(168, 85, 247, 0.2)' : 'rgba(124, 58, 237, 0.2)';
    e.target.style.boxShadow = 'none';
  };

  const isLoginDisabled = loading || !email || !password;
  const isRegisterDisabled = loading || !email || !firstName.trim() || !password || !confirmPassword;

  return (
    <>
      <style>{`
        @keyframes letterFall {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.5; }
          90% { opacity: 0.5; }
          100% { transform: translate3d(0, 110vh, 0) rotate(360deg); opacity: 0; }
        }
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes gentlePulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.3; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -8px, 0); }
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
            backdropFilter: 'blur(8px)',
            border: `2px solid ${isDarkMode ? 'rgba(168, 85, 247, 0.3)' : 'rgba(124, 58, 237, 0.25)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.3s ease',
            boxShadow: isDarkMode
              ? '0 3px 12px rgba(168, 85, 247, 0.2)'
              : '0 3px 12px rgba(124, 58, 237, 0.1)'
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
                fontWeight: 900,
                opacity: isDarkMode ? 0.4 : 0.2,
                fontFamily: 'Tajawal, sans-serif',
                willChange: 'transform',
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
              <Sparkles size={16} style={{ color: isDarkMode ? '#fbbf24' : '#f59e0b' }} />
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
              filter: 'blur(40px)',
              background: isDarkMode
                ? 'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f97316 100%)'
                : 'linear-gradient(135deg, #9333ea 0%, #db2777 50%, #ea580c 100%)',
              animation: 'gentlePulse 4s ease-in-out infinite',
              opacity: isDarkMode ? 0.2 : 0.1
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
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: isDarkMode
                ? '0 8px 32px rgba(0, 0, 0, 0.3)'
                : '0 8px 32px rgba(124, 58, 237, 0.1)',
              transition: 'background 0.5s ease, border-color 0.5s ease'
            }}
          >

            {/* الأيقونة */}
            <div style={{ position: 'relative', width: '4.5rem', height: '4.5rem', margin: '0 auto 1.5rem' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: '-0.5rem',
                  borderRadius: '1.25rem',
                  filter: 'blur(15px)',
                  background: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #a855f7 100%)',
                  animation: 'gentlePulse 3s ease-in-out infinite',
                  opacity: 0.35
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
                  boxShadow: '0 6px 20px rgba(168, 85, 247, 0.3)'
                }}
              >
                {mode === 'login' ? (
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
                {mode === 'login' ? (
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

            {mode === 'login' ? (
              /* ===== شاشة تسجيل الدخول ===== */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* حقل البريد الإلكتروني */}
                <div style={{ position: 'relative', width: '100%' }}>
                  <Mail style={iconStyle} size={20} />
                  <input
                    type="email"
                    placeholder="البريد الإلكتروني"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                    style={inputStyle}
                    onFocus={(e) => handleFocus(e, '#f97316')}
                    onBlur={handleBlur}
                  />
                </div>

                {/* حقل الرمز السري */}
                <div style={{ position: 'relative', width: '100%' }}>
                  <Lock style={iconStyle} size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="الرمز السري"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                    style={{ ...inputStyle, paddingLeft: '3rem' }}
                    onFocus={(e) => handleFocus(e, '#a855f7')}
                    onBlur={handleBlur}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: isDarkMode ? '#c084fc' : '#9333ea',
                      padding: '0.25rem',
                      zIndex: 2,
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* زر تسجيل الدخول */}
                <button
                  onClick={handleLogin}
                  disabled={isLoginDisabled}
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
                    transition: 'transform 0.2s ease, opacity 0.2s ease',
                    cursor: isLoginDisabled ? 'not-allowed' : 'pointer',
                    opacity: isLoginDisabled ? 0.5 : 1,
                    border: 'none',
                    background: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #a855f7 100%)',
                    boxShadow: '0 4px 16px rgba(249, 115, 22, 0.25)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoginDisabled) e.currentTarget.style.transform = 'translateY(-2px)';
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
                      جاري الدخول...
                    </>
                  ) : (
                    <>
                      تسجيل الدخول
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

                {/* زر إنشاء حساب جديد */}
                <button
                  onClick={() => {
                    setMode('register');
                    setError('');
                    setPassword('');
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
                    transition: 'background 0.2s ease',
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
                  <UserPlus size={20} />
                  ليس لديك حساب؟ أنشئ حساباً جديداً
                </button>
              </div>
            ) : (
              /* ===== شاشة إنشاء حساب ===== */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* حقل الاسم */}
                <div style={{ position: 'relative', width: '100%' }}>
                  <User style={iconStyle} size={20} />
                  <input
                    type="text"
                    placeholder="الاسم"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => handleFocus(e, '#10b981')}
                    onBlur={handleBlur}
                  />
                </div>

                {/* حقل البريد الإلكتروني */}
                <div style={{ position: 'relative', width: '100%' }}>
                  <Mail style={iconStyle} size={20} />
                  <input
                    type="email"
                    placeholder="البريد الإلكتروني"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => handleFocus(e, '#f97316')}
                    onBlur={handleBlur}
                  />
                </div>

                {/* حقل الرمز السري */}
                <div style={{ position: 'relative', width: '100%' }}>
                  <Lock style={iconStyle} size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="الرمز السري (8 أحرف على الأقل)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ ...inputStyle, paddingLeft: '3rem' }}
                    onFocus={(e) => handleFocus(e, '#a855f7')}
                    onBlur={handleBlur}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: isDarkMode ? '#c084fc' : '#9333ea',
                      padding: '0.25rem',
                      zIndex: 2,
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* مؤشر قوة الرمز */}
                {password.length > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: password.length >= 8 ? '#10b981' : '#ef4444',
                  }}>
                    <div style={{
                      flex: 1,
                      height: '4px',
                      borderRadius: '2px',
                      background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${Math.min((password.length / 8) * 100, 100)}%`,
                        height: '100%',
                        borderRadius: '2px',
                        background: password.length >= 8
                          ? 'linear-gradient(90deg, #10b981, #14b8a6)'
                          : 'linear-gradient(90deg, #ef4444, #f97316)',
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                    <span>{password.length >= 8 ? 'قوي' : `${password.length}/8`}</span>
                  </div>
                )}

                {/* حقل تأكيد الرمز السري */}
                <div style={{ position: 'relative', width: '100%' }}>
                  <Lock style={iconStyle} size={20} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="تأكيد الرمز السري"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
                    style={{
                      ...inputStyle,
                      paddingLeft: '3rem',
                      borderColor: confirmPassword.length > 0
                        ? (password === confirmPassword ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)')
                        : inputStyle.border ? undefined : undefined,
                    }}
                    onFocus={(e) => handleFocus(e, '#a855f7')}
                    onBlur={handleBlur}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: isDarkMode ? '#c084fc' : '#9333ea',
                      padding: '0.25rem',
                      zIndex: 2,
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* مؤشر تطابق الرمز */}
                {confirmPassword.length > 0 && (
                  <div style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: password === confirmPassword ? '#10b981' : '#ef4444',
                    textAlign: 'center',
                  }}>
                    {password === confirmPassword ? 'الرمز متطابق ✓' : 'الرمز غير متطابق ✗'}
                  </div>
                )}

                {/* زر إنشاء الحساب */}
                <button
                  onClick={handleRegister}
                  disabled={isRegisterDisabled}
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
                    transition: 'transform 0.2s ease, opacity 0.2s ease',
                    cursor: isRegisterDisabled ? 'not-allowed' : 'pointer',
                    opacity: isRegisterDisabled ? 0.5 : 1,
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #06b6d4 100%)',
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.25)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isRegisterDisabled) e.currentTarget.style.transform = 'translateY(-2px)';
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
                      جاري إنشاء الحساب...
                    </>
                  ) : (
                    <>
                      إنشاء الحساب
                      <ArrowRight size={22} />
                    </>
                  )}
                </button>

                {/* خط فاصل */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.25rem 0' }}>
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

                {/* زر العودة لتسجيل الدخول */}
                <button
                  onClick={() => {
                    setMode('login');
                    setError('');
                    setPassword('');
                    setConfirmPassword('');
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
                    transition: 'background 0.2s ease',
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
                  <LogIn size={20} />
                  لديك حساب؟ سجل دخولك
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

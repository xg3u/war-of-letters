// src/components/AuthGate.tsx
import React, { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, ArrowRight, Sparkles, Moon, Sun, UserPlus, LogIn, User, Eye, EyeOff } from 'lucide-react';
import { useScreenSize } from '../hooks/useScreenSize';

const ARABIC_LETTERS = "أبتثجحخدذرزسشصضطظعغفقكلمنهوي";

const VIBRANT_COLORS = [
  '#a855f7', '#10b981', '#f97316', '#ef4444', '#3b82f6', '#fbbf24',
];

// التحقق من صحة الإيميل
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

// التحقق من قوة الرمز (8 أحرف على الأقل، حرف كبير، أرقام، إنجليزي فقط)
const isValidPassword = (password: string): boolean => {
  if (password.length < 8) return false;

  // يجب أن يحتوي على حرف كبير
  const hasUpperCase = /[A-Z]/.test(password);

  // يجب أن يحتوي على رقم
  const hasNumber = /[0-9]/.test(password);

  // يجب أن يكون إنجليزي فقط (حروف إنجليزية وأرقام ورموز فقط، بدون عربي)
  const isEnglishOnly = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/.test(password);

  return hasUpperCase && hasNumber && isEnglishOnly;
};

// رسالة توضيحية لمتطلبات الرمز
const getPasswordRequirementsMessage = (password: string): string => {
  if (password.length === 0) return '';

  const issues: string[] = [];

  if (password.length < 8) issues.push('8 أحرف على الأقل');
  if (!/[A-Z]/.test(password)) issues.push('حرف كبير (A-Z)');
  if (!/[0-9]/.test(password)) issues.push('رقم');
  if (!/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/.test(password)) issues.push('إنجليزي فقط');

  if (issues.length === 0) return '✓ قوي';
  return `ينقص: ${issues.join(' • ')}`;
};

export const AuthGate: React.FC<{ onVerified: () => void }> = ({ onVerified }) => {
  const { isMobile } = useScreenSize();
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
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (!authError && data.user) {
        onVerified();
      } else {
        setError('خطأ في البريد الإلكتروني أو الرمز السري');
      }
    } catch {
      setError('حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى');
    }

    setLoading(false);
  };

  // إنشاء حساب جديد
  const handleRegister = async () => {
    if (!firstName.trim()) {
      setError('الرجاء إدخال الاسم');
      return;
    }
    if (!isValidEmail(email)) {
      setError('الرجاء إدخال بريد إلكتروني صحيح (مثال: name@example.com)');
      return;
    }
    if (!isValidPassword(password)) {
      setError('الرمز السري يجب أن يحتوي على: 8 أحرف • حرف كبير (A-Z) • رقم • إنجليزي فقط');
      return;
    }
    if (password !== confirmPassword) {
      setError('الرمز السري غير متطابق');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { first_name: firstName.trim() } },
      });

      if (!authError && data.user) {
        await supabase.from('buyers').insert({ id: data.user.id, email, plan_type: 'free' });
        if (data.session) {
          // دخول مباشر — تأكيد البريد معطّل
          onVerified();
        } else {
          // تأكيد البريد مفعّل في Supabase — سجّل الدخول يدوياً
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (!signInError && signInData.user) {
            onVerified();
          } else {
            setError('تم إنشاء الحساب. سجّل دخولك بنفس البريد والرمز.');
            setMode('login');
            setPassword('');
          }
        }
      } else {
        const msg = authError?.message ?? '';
        if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('User already registered')) {
          setError('هذا البريد مسجل مسبقاً. الرجاء تسجيل الدخول');
        } else if (msg.includes('rate limit') || msg.includes('Rate limit')) {
          setError('جرّب بريداً إلكترونياً آخر أو انتظر ساعة. (تجاوز حد Supabase المجاني)');
        } else {
          setError(`خطأ: ${msg || 'خطأ غير معروف'}`);
          console.error('Supabase signUp error:', authError);
        }
      }
    } catch {
      setError('حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى');
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
        /* الخلفية الثابتة — لا تتحرك مع الـ scroll */
        .auth-bg {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
        }
        /* المحتوى القابل للتمرير — تدفق طبيعي لا fixed */
        .auth-container {
          position: relative;
          z-index: 1;
          min-height: 100vh;
          min-height: 100dvh;
          width: 100%;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          overflow-x: hidden;
          padding: 1.25rem 0 calc(2rem + env(safe-area-inset-bottom));
          box-sizing: border-box;
        }
        .auth-content {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 520px;
          padding: 0 1.25rem;
          margin: auto;
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

      {/* ── طبقة الخلفية الثابتة (لا تتأثر بالـ scroll) ── */}
      <div
        className="auth-bg"
        style={{
          background: isDarkMode
            ? 'linear-gradient(135deg, #0a0118 0%, #1a0b2e 50%, #2d1154 100%)'
            : 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #e9d5ff 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradientShift 15s ease infinite'
        }}
      >
        {/* طبقة الحروف المتساقطة */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
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
      </div>

      {/* زر Dark/Light Mode — ثابت فوق كل شيء */}
      <button
        onClick={() => setIsDarkMode(!isDarkMode)}
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 50,
          width: '2.75rem',
          height: '2.75rem',
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
      >
        {isDarkMode ? (
          <Sun size={16} color="#fbbf24" />
        ) : (
          <Moon size={16} color="#7c3aed" />
        )}
      </button>

      {/* ── المحتوى القابل للتمرير ── */}
      <div className="auth-container">
        {/* المحتوى */}
        <div className="auth-content">

          {/* اسم اللعبة فوق الكارد */}
          <div style={{ textAlign: 'center', marginBottom: isMobile ? '1rem' : '2rem', animation: 'float 3s ease-in-out infinite' }}>
            <h1
              className="game-title"
              style={{
                fontSize: isMobile ? '2rem' : '4rem',
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
              padding: isMobile ? '1.5rem' : '2.5rem',
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
                  <><LogIn size={20} />تسجيل الدخول</>
                ) : (
                  <><UserPlus size={20} />إنشاء حساب جديد</>
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
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
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
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
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
                      padding: '0.5rem',
                      minWidth: '44px',
                      minHeight: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
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
                      padding: '0.5rem',
                      minWidth: '44px',
                      minHeight: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
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
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: isValidPassword(password) ? '#10b981' : '#ef4444',
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
                          background: isValidPassword(password)
                            ? 'linear-gradient(90deg, #10b981, #14b8a6)'
                            : 'linear-gradient(90deg, #ef4444, #f97316)',
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                      <span>{getPasswordRequirementsMessage(password)}</span>
                    </div>
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
                    onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
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
                      padding: '0.5rem',
                      minWidth: '44px',
                      minHeight: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
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

                {/* زر العودة لتسجيل الدخول — شاشة التسجيل */}
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


            {/* النص السفلي + الأيقونات الاجتماعية */}
            <div style={{ textAlign: 'center', marginTop: '0.9rem' }}>
              <p style={{
                color: isDarkMode ? 'rgba(233, 213, 255, 0.3)' : 'rgba(124, 58, 237, 0.3)',
                fontWeight: 700,
                fontSize: '0.68rem',
                letterSpacing: '0.04em',
                marginBottom: '0.6rem',
                textTransform: 'uppercase',
              }}>
                Meshal Alshammari &nbsp;·&nbsp; XG3U
              </p>

              {/* أيقونات السوشيال */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.55rem' }}>
                {/* X */}
                <a
                  href="https://x.com/xg3u3?s=21"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="@xg3u3 on X"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '34px', height: '34px', borderRadius: '10px',
                    background: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                    border: isDarkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.1)',
                    textDecoration: 'none',
                    transition: 'transform 0.15s ease, background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.1)';
                    e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 1200 1227" fill="none">
                    <path d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z"
                      fill={isDarkMode ? 'rgba(233,213,255,0.7)' : 'rgba(15,20,25,0.7)'}/>
                  </svg>
                </a>

                {/* Instagram */}
                <a
                  href="https://www.instagram.com/xg3u?igsh"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="@xg3u on Instagram"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '34px', height: '34px', borderRadius: '10px',
                    background: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                    border: isDarkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.1)',
                    textDecoration: 'none',
                    transition: 'transform 0.15s ease, background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.1)';
                    e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <defs>
                      <radialGradient id="ig-auth-inline" cx="30%" cy="107%" r="150%">
                        <stop offset="0%" stopColor="#fdf497"/>
                        <stop offset="45%" stopColor="#fd5949"/>
                        <stop offset="60%" stopColor="#d6249f"/>
                        <stop offset="90%" stopColor="#285AEB"/>
                      </radialGradient>
                    </defs>
                    <rect x="2" y="2" width="20" height="20" rx="5.5" fill="url(#ig-auth-inline)"/>
                    <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none"/>
                    <circle cx="17.5" cy="6.5" r="1.1" fill="white"/>
                  </svg>
                </a>

                {/* WhatsApp */}
                <a
                  href="https://wa.me/message/CEACUCTW6E7BB1"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="تواصل عبر واتساب"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '34px', height: '34px', borderRadius: '10px',
                    background: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                    border: isDarkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.1)',
                    textDecoration: 'none',
                    transition: 'transform 0.15s ease, background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.1)';
                    e.currentTarget.style.background = isDarkMode ? 'rgba(37,211,102,0.18)' : 'rgba(37,211,102,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#25d366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </a>

                {/* Salla Store */}
                <a
                  href="https://salla.sa/battle_of_letters_store/"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="متجر سلة"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '34px', height: '34px', borderRadius: '10px',
                    background: 'rgba(255,107,53,0.12)',
                    border: '1px solid rgba(255,107,53,0.3)',
                    textDecoration: 'none',
                    transition: 'transform 0.15s ease, background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.1)';
                    e.currentTarget.style.background = 'rgba(255,107,53,0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.background = 'rgba(255,107,53,0.12)';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="#ff6b35" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="3" y1="6" x2="21" y2="6" stroke="#ff6b35" strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M16 10a4 4 0 01-8 0" stroke="#ff6b35" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

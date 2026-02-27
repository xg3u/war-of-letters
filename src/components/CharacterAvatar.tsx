// src/components/CharacterAvatar.tsx
// تميمة حرب الحروف — شخصية كونسول ألعاب كيوت

import React, { useId } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// ─── الأنواع ───────────────────────────────────────────────────
export type AccessoryType = 'none' | 'headphones' | 'glasses' | 'bow' | 'horns' | 'halo';
export type ExpressionType = 'happy' | 'wink' | 'surprised' | 'smug';

export interface AvatarConfig {
  gender:      'male' | 'female';
  skinTone:    number;         // 0-4 → لون شاشة الكونسول
  jacketColor: number;         // 0-5 → لون جسم الكونسول
  expression:  ExpressionType; // → تعبير الوجه
  accessory:   AccessoryType;  // → إكسسوار واحد فقط
}

export const DEFAULT_AVATAR: AvatarConfig = {
  gender: 'male', skinTone: 0,
  jacketColor: 0, expression: 'happy', accessory: 'none',
};

// ── ألوان شاشة الكونسول (فارقة وواضحة) ──
export const SKIN_TONES: string[] = [
  '#7fffd4', '#6ec8ff', '#ffe87e', '#ff90ce', '#b87fff',
];
export const SKIN_SHADOWS: string[] = [
  '#3ac8a0', '#3898e0', '#d8a828', '#e0489a', '#7840d8',
];
export const SKIN_TONE_NAMES: string[] = [
  'نعناعي','سماوي','ذهبي','وردي','بنفسجي',
];

// ── ألوان جسم الكونسول ──
export const JACKET_COLORS: string[] = [
  '#1e1e1e', '#28b0a0', '#787878', '#e06880', '#3060d0', '#d04020',
];
export const JACKET_COLOR_NAMES: string[] = [
  'أسود','فيروزي','رمادي','وردي','أزرق','أحمر',
];

// ─── مساعدو الألوان ───────────────────────────────────────────
function dk(hex: string, a = 50): string {
  const c = hex.replace('#', '');
  if (c.length !== 6) return hex;
  return `rgb(${Math.max(0,parseInt(c.slice(0,2),16)-a)},${Math.max(0,parseInt(c.slice(2,4),16)-a)},${Math.max(0,parseInt(c.slice(4,6),16)-a)})`;
}
function lt(hex: string, a = 55): string {
  const c = hex.replace('#', '');
  if (c.length !== 6) return hex;
  return `rgb(${Math.min(255,parseInt(c.slice(0,2),16)+a)},${Math.min(255,parseInt(c.slice(2,4),16)+a)},${Math.min(255,parseInt(c.slice(4,6),16)+a)})`;
}

const FT: React.CSSProperties = { transition: 'fill 0.35s ease' };

// ════════════════════════════════════════════════════════════════
export interface CharacterAvatarProps { avatar: AvatarConfig; size?: number; }

export const CharacterAvatar: React.FC<CharacterAvatarProps> = ({ avatar, size = 80 }) => {
  const raw = useId();
  const uid = raw.replace(/[^a-zA-Z0-9]/g, '');

  const { gender, skinTone, jacketColor,
          expression = 'happy', accessory = 'none' } = avatar;

  // Derive accessory booleans (single-select)
  const hasHeadphones = accessory === 'headphones';
  const hasGlasses    = accessory === 'glasses';
  const hasBow        = accessory === 'bow';
  const hasHorns      = accessory === 'horns';
  const hasHalo       = accessory === 'halo';

  // Expression-based face variables
  const exp = expression as string;
  const N   = <T extends Record<string, number>>(m: T, d: number) => (m[exp] ?? d) as number;
  const S   = <T extends Record<string, string>>(m: T, d: string) => (m[exp] ?? d) as string;
  const mEyeRy  = N({ happy: 5.5, wink: 5.5, surprised: 7, smug: 4.8 }, 5.5);
  const mEyeCy  = N({ happy: 28.5, wink: 28.5, surprised: 27, smug: 28.5 }, 28.5);
  const fEyeR   = N({ happy: 6.5, wink: 6.5, surprised: 7.5, smug: 5.5 }, 6.5);
  const fEyeCy  = N({ happy: 28, wink: 28, surprised: 27, smug: 28 }, 28);
  const cheekOp = N({ happy: gender === 'female' ? 0.58 : 0.45, wink: 0.55, surprised: 0.62, smug: 0.3 },
                    gender === 'female' ? 0.58 : 0.45);
  const mouthM  = S({
    happy:     'M 32,40 Q 36,43.5 40,41 Q 44,43.5 48,40',
    wink:      'M 32,40 Q 36,44 40,42 Q 44,44 48,40',
    surprised: '',
    smug:      'M 34,41.5 Q 38,41 43,39.5 Q 46,38.5 47.5,38',
  }, 'M 32,40 Q 36,43.5 40,41 Q 44,43.5 48,40');
  const mouthF  = S({
    happy:     'M 32,40 Q 40,47 48,40',
    wink:      'M 32,40 Q 40,48 48,40',
    surprised: '',
    smug:      'M 34,41 Q 38,40 43,39 Q 46,38 48,37.5',
  }, 'M 32,40 Q 40,47 48,40');

  const jc   = JACKET_COLORS[jacketColor % 6];
  const jDk  = dk(jc, 60);
  const jMd  = dk(jc, 30);
  const jLt  = lt(jc, 55);
  const scrBg = SKIN_TONES[skinTone % 5];

  // gradient IDs
  const bId  = `b${uid}`;   // body
  const sId  = `s${uid}`;   // screen

  return (
    <svg
      width={size} height={size}
      viewBox="0 0 80 80"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        {/* جسم الكونسول */}
        <linearGradient id={bId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={jLt}/>
          <stop offset="55%"  stopColor={jc}/>
          <stop offset="100%" stopColor={jDk}/>
        </linearGradient>

        {/* شاشة الكونسول */}
        <radialGradient id={sId} cx="35%" cy="22%" r="72%">
          <stop offset="0%"   stopColor="white"/>
          <stop offset="60%"  stopColor={scrBg}/>
          <stop offset="100%" stopColor={dk(scrBg, 20)}/>
        </radialGradient>

      </defs>

      {/* ══════════════════════════════════════════ */}
      {/* أذنا السماعة (اختياري)                    */}
      {/* ══════════════════════════════════════════ */}
      <AnimatePresence>
        {hasHeadphones && (
          <motion.g key="ears"
            initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }} style={{ transformOrigin: '40px 37px' }}>
            <circle cx="4"  cy="37" r="5.5" fill={jDk}/>
            <circle cx="4"  cy="37" r="4"   fill={jMd}/>
            <circle cx="3"  cy="35.5" r="1.4" fill="rgba(255,255,255,0.35)"/>
            <circle cx="76" cy="37" r="5.5" fill={jDk}/>
            <circle cx="76" cy="37" r="4"   fill={jMd}/>
            <circle cx="75" cy="35.5" r="1.4" fill="rgba(255,255,255,0.35)"/>
          </motion.g>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════ */}
      {/* قرون الشيطان (خلف الكونسول)               */}
      {/* ══════════════════════════════════════════ */}
      <AnimatePresence>
        {hasHorns && (
          <motion.g key="horns"
            initial={{ opacity: 0, scaleY: 0 }} animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0 }} style={{ transformOrigin: '40px 14px' }}>
            {/* قرن أيسر — منحنى كيوبيك سلس */}
            <path d="M 18,15 C 10,5 13,0 21,4 C 22,9 23,13 22,16 Z" fill="#dc2626" stroke="#991b1b" strokeWidth="1"/>
            <path d="M 18,15 C 10,5 13,0 21,4" fill="none" stroke="rgba(255,180,180,0.7)" strokeWidth="1.1" strokeLinecap="round"/>
            <ellipse cx="14.5" cy="7" rx="2.5" ry="1.4" fill="rgba(255,220,220,0.55)" transform="rotate(-30 14.5 7)"/>
            {/* قرن أيمن — منحنى كيوبيك سلس */}
            <path d="M 62,15 C 70,5 67,0 59,4 C 58,9 57,13 58,16 Z" fill="#dc2626" stroke="#991b1b" strokeWidth="1"/>
            <path d="M 62,15 C 70,5 67,0 59,4" fill="none" stroke="rgba(255,180,180,0.7)" strokeWidth="1.1" strokeLinecap="round"/>
            <ellipse cx="65.5" cy="7" rx="2.5" ry="1.4" fill="rgba(255,220,220,0.55)" transform="rotate(30 65.5 7)"/>
          </motion.g>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════ */}
      {/* ظل الكونسول                               */}
      {/* ══════════════════════════════════════════ */}
      <rect x="9" y="16" width="64" height="63" rx="11"
        fill="rgba(0,0,0,0.30)"/>

      {/* ══════════════════════════════════════════ */}
      {/* جسم الكونسول                              */}
      {/* ══════════════════════════════════════════ */}
      <rect x="7" y="13" width="64" height="63" rx="11"
        fill={`url(#${bId})`} style={FT}/>
      {/* إضاءة الحافة العلوية */}
      <rect x="8" y="14" width="62" height="20" rx="11"
        fill="rgba(255,255,255,0.25)"/>
      {/* ظل الحافة السفلية */}
      <rect x="7" y="58" width="64" height="18" rx="11"
        fill="rgba(0,0,0,0.15)"/>
      {/* خط المحيط */}
      <rect x="7" y="13" width="64" height="63" rx="11"
        fill="none" stroke={jDk} strokeWidth="1.5" style={FT}/>
      {/* تعريف الزوايا السفلية */}
      <path d="M 18,76 Q 40,78 62,76 L 62,75 Q 40,77 18,75 Z"
        fill="rgba(0,0,0,0.18)"/>

      {/* ══════════════════════════════════════════ */}
      {/* إطار الشاشة (bezel)                       */}
      {/* ══════════════════════════════════════════ */}
      <rect x="10" y="16" width="58" height="38" rx="8"
        fill={dk(jc, 75)} opacity="0.9" style={FT}/>
      <rect x="10" y="16" width="58" height="38" rx="8"
        fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="1"/>

      {/* ══════════════════════════════════════════ */}
      {/* الشاشة                                    */}
      {/* ══════════════════════════════════════════ */}
      <rect x="13" y="18.5" width="52" height="33" rx="6"
        fill={`url(#${sId})`} style={FT}/>
      {/* ظل داخل الشاشة (أعلى) */}
      <rect x="13" y="18.5" width="52" height="9" rx="6"
        fill="rgba(0,0,0,0.06)"/>
      {/* انعكاس ضوء الشاشة */}
      <path d="M 15.5,20 Q 28,18.5 44,20.5 L 42,26 Q 26,24 15.5,25 Z"
        fill="rgba(255,255,255,0.58)" style={FT}/>
      {/* حافة الشاشة الداخلية */}
      <rect x="13" y="18.5" width="52" height="33" rx="6"
        fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="0.8"/>

      {/* ══════════════════════════════════════════ */}
      {/* الوجه — خدود                              */}
      {/* ══════════════════════════════════════════ */}
      <ellipse cx="19" cy="33" rx="7" ry="5" fill="#ff6699" opacity={cheekOp} style={FT}/>
      <ellipse cx="59" cy="33" rx="7" ry="5" fill="#ff6699" opacity={cheekOp} style={FT}/>

      {/* ══════════════════════════════════════════ */}
      {/* الوجه — حواجب                             */}
      {/* ══════════════════════════════════════════ */}
      {expression === 'surprised' && (
        <>
          <path d="M 22.5,20 Q 28.5,17 34.5,20" fill="none" stroke="#1a1212" strokeWidth="2" strokeLinecap="round" opacity="0.65"/>
          <path d="M 45.5,20 Q 51.5,17 57.5,20" fill="none" stroke="#1a1212" strokeWidth="2" strokeLinecap="round" opacity="0.65"/>
        </>
      )}
      {expression === 'smug' && (
        <>
          <path d="M 22.5,21.5 Q 28.5,20 34.5,21.5" fill="none" stroke="#1a1212" strokeWidth="2" strokeLinecap="round" opacity="0.62"/>
          <path d="M 45.5,19.5 Q 51.5,18.5 57.5,21" fill="none" stroke="#1a1212" strokeWidth="2.2" strokeLinecap="round" opacity="0.72"/>
        </>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* الوجه — عيون                              */}
      {/* ══════════════════════════════════════════ */}
      {gender === 'female' ? (
        <>
          {/* عين يسار — دائماً عادية */}
          <circle cx="28.5" cy={fEyeCy} r={fEyeR} fill="#1a1212"/>
          <circle cx="28.5" cy={fEyeCy} r={fEyeR * 0.78} fill="#3a4898"/>
          <circle cx="28.5" cy={fEyeCy} r={fEyeR * 0.48} fill="#0c0808"/>
          <ellipse cx="26.5" cy={fEyeCy - 2.2} rx="2" ry="2.6" fill="white" opacity="0.92"/>
          <circle cx="31" cy={fEyeCy + 2.5} r="0.9" fill="white" opacity="0.62"/>

          {/* عين يمين — مغمورة عند الغمزة وإلا عادية */}
          {expression === 'wink' ? (
            <path d={`M 46,${fEyeCy} Q 51.5,${fEyeCy - 4.5} 57,${fEyeCy}`}
              fill="none" stroke="#1a1212" strokeWidth="3.5" strokeLinecap="round"/>
          ) : (
            <>
              <circle cx="51.5" cy={fEyeCy} r={fEyeR} fill="#1a1212"/>
              <circle cx="51.5" cy={fEyeCy} r={fEyeR * 0.78} fill="#3a4898"/>
              <circle cx="51.5" cy={fEyeCy} r={fEyeR * 0.48} fill="#0c0808"/>
              <ellipse cx="49.5" cy={fEyeCy - 2.2} rx="2" ry="2.6" fill="white" opacity="0.92"/>
              <circle cx="54" cy={fEyeCy + 2.5} r="0.9" fill="white" opacity="0.62"/>
            </>
          )}

          {/* رموش يسار */}
          <line x1="22.5" y1="22.5" x2="20.5" y2="19"   stroke="#1a1212" strokeWidth="2.2" strokeLinecap="round"/>
          <line x1="25.5" y1="21.5" x2="24.5" y2="18"   stroke="#1a1212" strokeWidth="2.2" strokeLinecap="round"/>
          <line x1="28.5" y1="21.5" x2="28.5" y2="18"   stroke="#1a1212" strokeWidth="2.2" strokeLinecap="round"/>
          <line x1="31.5" y1="21.8" x2="32.5" y2="18.5" stroke="#1a1212" strokeWidth="2.2" strokeLinecap="round"/>
          <line x1="34.5" y1="22.5" x2="36"   y2="19.5" stroke="#1a1212" strokeWidth="2.2" strokeLinecap="round"/>
          {/* رموش يمين — فقط إذا لم يكن غمز */}
          {expression !== 'wink' && (
            <>
              <line x1="45.5" y1="22.5" x2="44"   y2="19.5" stroke="#1a1212" strokeWidth="2.2" strokeLinecap="round"/>
              <line x1="48.5" y1="21.8" x2="47.5" y2="18.5" stroke="#1a1212" strokeWidth="2.2" strokeLinecap="round"/>
              <line x1="51.5" y1="21.5" x2="51.5" y2="18"   stroke="#1a1212" strokeWidth="2.2" strokeLinecap="round"/>
              <line x1="54.5" y1="21.5" x2="55.5" y2="18"   stroke="#1a1212" strokeWidth="2.2" strokeLinecap="round"/>
              <line x1="57.5" y1="22.5" x2="59.5" y2="19"   stroke="#1a1212" strokeWidth="2.2" strokeLinecap="round"/>
            </>
          )}
        </>
      ) : (
        <>
          {/* عيون الذكر — ry حسب التعبير، يمين مغمورة عند الغمز */}
          <ellipse cx="28.5" cy={mEyeCy} rx="6" ry={mEyeRy} fill="#1a1212"/>
          <ellipse cx="26.5" cy={mEyeCy - 2.3} rx="2" ry="2.5" fill="white" opacity="0.9"/>
          <circle  cx="31"   cy={mEyeCy + 2} r="1" fill="white" opacity="0.6"/>
          {expression === 'wink' ? (
            <path d={`M 47,${mEyeCy} Q 51.5,${mEyeCy - 4.5} 56,${mEyeCy}`}
              fill="none" stroke="#1a1212" strokeWidth="3.5" strokeLinecap="round"/>
          ) : (
            <>
              <ellipse cx="51.5" cy={mEyeCy} rx="6" ry={mEyeRy} fill="#1a1212"/>
              <ellipse cx="49.5" cy={mEyeCy - 2.3} rx="2" ry="2.5" fill="white" opacity="0.9"/>
              <circle  cx="54"   cy={mEyeCy + 2} r="1" fill="white" opacity="0.6"/>
            </>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* الوجه — فم                                */}
      {/* ══════════════════════════════════════════ */}
      {expression === 'surprised' ? (
        <ellipse cx="40" cy="42" rx="3.8" ry="5.2" fill="rgba(20,5,5,0.6)"/>
      ) : (
        <path
          d={gender === 'female' ? mouthF : mouthM}
          fill="none" stroke="#555"
          strokeWidth={gender === 'female' ? 2.5 : 2.3}
          strokeLinecap="round" strokeLinejoin="round"
        />
      )}

      {/* ══════════════════════════════════════════ */}
      {/* منطقة الأزرار                             */}
      {/* ══════════════════════════════════════════ */}

      {/* D-pad (يسار) */}
      <rect x="12" y="61" width="13" height="5"  rx="2.5" fill={jMd} style={FT}/>
      <rect x="17" y="56" width="4.5" height="13" rx="2.5" fill={jMd} style={FT}/>
      {/* تفصيل D-pad */}
      <rect x="12" y="61" width="13" height="2"  rx="2" fill="rgba(255,255,255,0.22)"/>
      <rect x="17" y="56" width="4.5" height="2" rx="2" fill="rgba(255,255,255,0.22)"/>

      {/* Start / Select (وسط) */}
      <rect x="33" y="63" width="6.5" height="3" rx="1.5" fill={jDk} opacity="0.75" style={FT}/>
      <rect x="41" y="63" width="6.5" height="3" rx="1.5" fill={jDk} opacity="0.75" style={FT}/>

      {/* زر B (يمين-أسفل) — لون مشتق من لون الجاكيت */}
      <circle cx="57" cy="67" r="5.5" fill={dk(jDk, 25)}/>
      <circle cx="57" cy="67" r="4.5" fill={jDk}/>
      <circle cx="55.8" cy="65.5" r="1.6" fill="rgba(255,255,255,0.45)"/>
      <text x="57" y="68.8" textAnchor="middle" fontSize="5" fontWeight="bold"
        fill="white" fontFamily="Arial" style={{ userSelect: 'none', pointerEvents: 'none' }}>B</text>

      {/* زر A (يمين-أعلى) — لون مشتق من لون الجاكيت */}
      <circle cx="66" cy="61" r="5.5" fill={dk(jLt, 20)}/>
      <circle cx="66" cy="61" r="4.5" fill={jLt}/>
      <circle cx="64.8" cy="59.5" r="1.6" fill="rgba(255,255,255,0.45)"/>
      <text x="66" y="62.8" textAnchor="middle" fontSize="5" fontWeight="bold"
        fill="rgba(0,0,0,0.7)" fontFamily="Arial" style={{ userSelect: 'none', pointerEvents: 'none' }}>A</text>

      {/* LED الحالة */}
      <circle cx="65" cy="74.5" r="2.2" fill="#50ff80" opacity="0.88"/>
      <circle cx="65" cy="74.5" r="1.1" fill="#c0ffd0"/>

      {/* ══════════════════════════════════════════ */}
      {/* نظارة شمسية (اختياري)                     */}
      {/* ══════════════════════════════════════════ */}
      <AnimatePresence>
        {hasGlasses && (
          <motion.g key="glasses"
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}>
            {/* إطار أيسر — مركزه على cx=28.5 */}
            <rect x="21.5" y="23.5" width="14" height="10" rx="2.5" fill="#0f172a" stroke="#334155" strokeWidth="1.2"/>
            {/* إطار أيمن — مركزه على cx=51.5 */}
            <rect x="44.5" y="23.5" width="14" height="10" rx="2.5" fill="#0f172a" stroke="#334155" strokeWidth="1.2"/>
            {/* جسر بين الإطارين */}
            <rect x="35.5" y="26.5" width="9" height="2.5" rx="1.2" fill="#475569"/>
            {/* ذراع أيسر */}
            <rect x="11.5" y="26.5" width="10" height="2.5" rx="1.2" fill="#1e293b" stroke="#334155" strokeWidth="0.6"/>
            {/* ذراع أيمن */}
            <rect x="58.5" y="26.5" width="9" height="2.5" rx="1.2" fill="#1e293b" stroke="#334155" strokeWidth="0.6"/>
            {/* بريق أيسر */}
            <rect x="23.5" y="25" width="7" height="3.5" rx="1.5" fill="rgba(255,255,255,0.28)"/>
            <rect x="23.5" y="25" width="2.5" height="3.5" rx="1" fill="rgba(255,255,255,0.52)"/>
            {/* بريق أيمن */}
            <rect x="46.5" y="25" width="7" height="3.5" rx="1.5" fill="rgba(255,255,255,0.28)"/>
            <rect x="46.5" y="25" width="2.5" height="3.5" rx="1" fill="rgba(255,255,255,0.52)"/>
          </motion.g>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════ */}
      {/* ربطة قوسية (اختياري)                      */}
      {/* ══════════════════════════════════════════ */}
      <AnimatePresence>
        {hasBow && (
          <motion.g key="bow"
            initial={{ opacity: 0, scale: 0.3, rotate: -15 }} animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.3, rotate: 15 }} style={{ transformOrigin: '62px 16px' }}>
            {/* جناح أيسر — بزاوية أعلى يمين الكونسول */}
            <path d="M 62,16 Q 51,7 49,13 Q 53,19 62,17 Z" fill="#f472b6" stroke="#be185d" strokeWidth="0.9"/>
            <ellipse cx="53" cy="10" rx="3" ry="1.7" fill="rgba(255,255,255,0.38)" transform="rotate(-22 53 10)"/>
            {/* جناح أيمن */}
            <path d="M 62,16 Q 73,7 73,13 Q 68,19 62,17 Z" fill="#f472b6" stroke="#be185d" strokeWidth="0.9"/>
            <ellipse cx="70" cy="10" rx="3" ry="1.7" fill="rgba(255,255,255,0.38)" transform="rotate(22 70 10)"/>
            {/* عقدة */}
            <circle cx="62" cy="16.5" r="4.2" fill="#ec4899" stroke="#be185d" strokeWidth="0.9"/>
            <circle cx="62" cy="16.5" r="2.4" fill="#fce7f3"/>
            <circle cx="61.2" cy="15.5" r="1" fill="rgba(255,255,255,0.75)"/>
          </motion.g>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════ */}
      {/* هالة ذهبية (اختياري)                      */}
      {/* ══════════════════════════════════════════ */}
      <AnimatePresence>
        {hasHalo && (
          <motion.g key="halo"
            animate={{ y: [0, -2.5, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}>
            {/* توهج خارجي */}
            <ellipse cx="40" cy="5" rx="18" ry="5.5" fill="none" stroke="rgba(251,191,36,0.3)" strokeWidth="7"/>
            {/* الهالة الرئيسية */}
            <ellipse cx="40" cy="5" rx="18" ry="5.5" fill="none" stroke="#f59e0b" strokeWidth="4.5"/>
            {/* حافة داخلية مضيئة */}
            <ellipse cx="40" cy="5" rx="18" ry="5.5" fill="none" stroke="#fde68a" strokeWidth="1.5" opacity="0.7"/>
            {/* بريق */}
            <ellipse cx="30" cy="3.8" rx="4.5" ry="2" fill="rgba(255,255,200,0.65)" opacity="0.8"/>
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
};

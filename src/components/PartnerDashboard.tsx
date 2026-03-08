// src/components/PartnerDashboard.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../context/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────
type PartnerTab = 'overview' | 'inventory' | 'customers' | 'orders';

interface CodeRow {
  id: string;
  code: string;
  plan_type: string;
  batch_id: string;
  is_used: boolean;
  created_at: string;
  used_by_user_id: string | null;
}

interface CustomerRow {
  id: string;
  email: string;
  plan_type: string | null;
  created_at: string | null;
}

interface OrderRow {
  id: string;
  item_name: string;
  quantity: number;
  prefix?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  created_at: string;
}

interface PartnerProfile {
  user_id: string;
  full_name: string;
  whatsapp_number: string;
  gender: string;
  age: number;
  store_link?: string;
}

// ── Design tokens — WCAG AA tested on #13132c background ─────────────────
const C = {
  page:         '#0b0b1e',
  sidebar:      '#0e0e23',
  card:         '#13132c',
  cardAlt:      '#171730',
  border:       'rgba(255,255,255,0.10)',
  borderHov:    'rgba(255,255,255,0.16)',
  txtPrimary:   '#e8ecf7',
  txtSecondary: '#a8b4cc',
  txtMuted:     '#7a8ba8',
  purple:       '#6d28d9',
  purpleLt:     '#b49fea',
  green:        '#059669',
  greenLt:      '#4ade80',
  gold:         '#b45309',
  goldLt:       '#fbbf24',
  red:          '#b91c1c',
  redLt:        '#f87171',
  blue:         '#1d4ed8',
  blueLt:       '#7ab8f7',
  teal:         '#0e7490',
  tealLt:       '#5eead4',
};

// ── Helpers ────────────────────────────────────────────────────────────────
function planLabel(p: string | null): { label: string; color: string } {
  if (!p || p === 'free') return { label: 'مجاني', color: C.txtMuted };
  if (p === 'lifetime')   return { label: '♾️ ذهبية', color: C.goldLt };
  if (p === 'unlimited')  return { label: '♾️ بلا حدود', color: C.goldLt };
  if (p === '3_days' || p === '72_hours' || p === 'single') return { label: '⏰ 3 أيام', color: C.purpleLt };
  return { label: p, color: C.txtSecondary };
}

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ── Sub-components ─────────────────────────────────────────────────────────
function SideItem({ icon, label, active, onClick, badge }: {
  icon: string; label: string; active: boolean; onClick: () => void; badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between',
        width: '100%', padding: '0.65rem 0.9rem', borderRadius: '0.6rem',
        background: active ? `${C.teal}22` : 'transparent',
        border: active ? `1px solid ${C.teal}55` : '1px solid transparent',
        color: active ? C.tealLt : C.txtSecondary,
        fontWeight: active ? 700 : 400, fontSize: '0.875rem', cursor: 'pointer',
        transition: 'all 0.15s', textAlign: 'right', fontFamily: 'Tajawal, sans-serif',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{ fontSize: '1rem' }}>{icon}</span>
        <span>{label}</span>
      </div>
      {badge !== undefined && badge > 0 && (
        <span style={{
          background: C.teal, color: '#fff', borderRadius: '99px',
          padding: '0.1rem 0.45rem', fontSize: '0.68rem', fontWeight: 700,
        }}>{badge}</span>
      )}
    </button>
  );
}

function StatCard({ icon, label, value, sub, color }: {
  icon: string; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderTop: `2px solid ${color}55`,
      borderRadius: '0.9rem', padding: '1.1rem 1.3rem', flex: 1, minWidth: '130px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.55rem' }}>
        <span style={{ fontSize: '1.15rem' }}>{icon}</span>
        <span style={{ fontSize: '0.82rem', color: C.txtSecondary, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color, lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.78rem', color: C.txtMuted, marginTop: '0.3rem', fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────
const inputSt: React.CSSProperties = {
  padding: '0.6rem 0.9rem', background: '#1a1a3a',
  border: `1px solid rgba(255,255,255,0.18)`, borderRadius: '0.6rem', color: C.txtPrimary,
  fontSize: '0.875rem', outline: 'none', fontFamily: 'Tajawal, sans-serif', width: '100%',
  boxSizing: 'border-box',
};
const selectSt: React.CSSProperties = {
  ...inputSt, cursor: 'pointer', appearance: 'none' as const,
};
const btnPrimary: React.CSSProperties = {
  padding: '0.6rem 1.2rem', borderRadius: '0.6rem', border: 'none',
  cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem',
  fontFamily: 'Tajawal, sans-serif', background: C.teal, color: '#fff',
};
const btnGhost: React.CSSProperties = {
  ...btnPrimary, background: 'rgba(255,255,255,0.08)',
  border: `1px solid rgba(255,255,255,0.2)`, color: C.txtSecondary,
};
const tableTh: React.CSSProperties = {
  padding: '0.7rem 0.9rem', textAlign: 'right', fontSize: '0.8rem',
  color: C.txtMuted, fontWeight: 700, borderBottom: `1px solid rgba(255,255,255,0.08)`,
};
const tableTd: React.CSSProperties = {
  padding: '0.75rem 0.9rem', fontSize: '0.875rem',
  borderBottom: `1px solid rgba(255,255,255,0.05)`, color: C.txtPrimary,
};

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      padding: '0.18rem 0.55rem', borderRadius: '0.35rem', fontSize: '0.75rem',
      fontWeight: 700, background: `${color}1a`, color, border: `1px solid ${color}33`,
    }}>{label}</span>
  );
}

// WA_LINK — تغيير رقم الواتساب هنا
const WA_LINK = 'https://wa.me/966500000000?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D8%8C%20%D8%A3%D9%86%D8%A7%20%D8%B4%D8%B1%D9%8A%D9%83%20%D9%81%D9%8A%20%D9%85%D9%86%D8%B5%D8%A9%20%D8%AD%D8%B1%D8%A8%20%D8%A7%D9%84%D8%AD%D8%B1%D9%88%D9%81%20%D9%88%D8%A3%D8%AD%D8%AA%D8%A7%D8%AC%20%D9%85%D8%B3%D8%A7%D8%B9%D8%AF%D8%A9';

// ══════════════════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════════════════
const PartnerDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useAuthContext();
  const [activeTab, setActiveTab] = useState<PartnerTab>('overview');

  // ── Mobile Responsive ─────────────────────────────────────────────────
  const [isMobile, setIsMobile]       = useState(() => window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Onboarding Modal ──────────────────────────────────────────────────
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);
  const [profileForm, setProfileForm]       = useState({ full_name: '', whatsapp_number: '', gender: '', age: '', store_link: '' });
  const [profileSaving, setProfileSaving]   = useState(false);
  const [profileError, setProfileError]     = useState('');

  // ── Inventory State ────────────────────────────────────────────────────
  const [codes, setCodes]               = useState<CodeRow[]>([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [codeSearch, setCodeSearch]     = useState('');
  const [codeFilter, setCodeFilter]     = useState<'all' | 'used' | 'available'>('all');

  // ── Customers State ────────────────────────────────────────────────────
  const [customers, setCustomers]             = useState<CustomerRow[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);

  // ── Orders State ───────────────────────────────────────────────────────
  const [orders, setOrders]               = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderForm, setOrderForm]         = useState({ item_name: '', quantity: 10, notes: '', prefix: 'WOL' });
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderMsg, setOrderMsg]           = useState('');

  // ── Smart cache ────────────────────────────────────────────
  const tabLoadedAt = useRef<Record<string, number>>({});
  const CACHE_TTL   = 90_000;
  const isFresh     = (tab: string) => { const t = tabLoadedAt.current[tab]; return !!t && Date.now() - t < CACHE_TTL; };
  const markLoaded  = (tab: string) => { tabLoadedAt.current[tab] = Date.now(); };

  // ── Loaders ────────────────────────────────────────────────────────────
  const loadCodes = useCallback(async () => {
    if (!user) return;
    setCodesLoading(true);
    let q = supabase
      .from('activation_codes')
      .select('id, code, plan_type, batch_id, is_used, created_at, used_by_user_id')
      .eq('owner_partner_id', user.id)
      .order('created_at', { ascending: false });
    if (codeFilter === 'used')      q = q.eq('is_used', true);
    if (codeFilter === 'available') q = q.eq('is_used', false);
    const { data } = await q;
    let result = (data ?? []) as CodeRow[];
    if (codeSearch) result = result.filter(c => c.code.toLowerCase().includes(codeSearch.toLowerCase()));
    setCodes(result);
    markLoaded('inventory'); setCodesLoading(false);
  }, [user, codeFilter, codeSearch]);

  const loadCustomers = useCallback(async () => {
    if (!user) return;
    setCustomersLoading(true);
    const { data } = await supabase
      .from('buyers')
      .select('id, email, plan_type, created_at')
      .eq('referred_by_partner_id', user.id)
      .order('created_at', { ascending: false });
    setCustomers((data ?? []) as CustomerRow[]);
    markLoaded('customers'); setCustomersLoading(false);
  }, [user]);

  const loadOrders = useCallback(async () => {
    if (!user) return;
    setOrdersLoading(true);
    const { data } = await supabase
      .from('partner_orders')
      .select('id, item_name, quantity, prefix, status, notes, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setOrders((data ?? []) as OrderRow[]);
    markLoaded('orders'); setOrdersLoading(false);
  }, [user]);

  const checkProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('partner_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!data) setShowOnboarding(true);
    setProfileChecked(true);
  }, [user]);

  // ── Onboarding Save ────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    setProfileError('');
    if (!profileForm.full_name.trim())       { setProfileError('الاسم الكامل مطلوب'); return; }
    if (!profileForm.whatsapp_number.trim()) { setProfileError('رقم واتساب مطلوب'); return; }
    if (!profileForm.gender)                 { setProfileError('الجنس مطلوب'); return; }
    if (!profileForm.age || Number(profileForm.age) < 16) { setProfileError('العمر يجب أن يكون 16 أو أكثر'); return; }
    if (!user) return;

    setProfileSaving(true);
    const { error } = await supabase.from('partner_profiles').upsert({
      user_id:         user.id,
      full_name:       profileForm.full_name.trim(),
      whatsapp_number: profileForm.whatsapp_number.trim(),
      gender:          profileForm.gender,
      age:             Number(profileForm.age),
      store_link:      profileForm.store_link.trim() || null,
    }, { onConflict: 'user_id' });

    if (error) {
      const isSetup = error.message?.includes('schema cache') || error.message?.includes('does not exist') || error.message?.includes('relation') || error.code === '42P01';
      setProfileError(isSetup
        ? 'جدول بيانات الشركاء غير موجود — يرجى تشغيل ملف 010_fix_categories_rls.sql في Supabase SQL Editor'
        : `فشل الحفظ: ${error.message}`);
    } else {
      setShowOnboarding(false);
    }
    setProfileSaving(false);
  };

  // ── Submit Order ───────────────────────────────────────────────────────
  const handleSubmitOrder = async () => {
    if (!user || !orderForm.item_name || orderForm.quantity < 1) return;
    setOrderSubmitting(true);
    const { error } = await supabase.from('partner_orders').insert({
      user_id:   user.id,
      item_name: orderForm.item_name,
      quantity:  orderForm.quantity,
      prefix:    orderForm.prefix.trim() || 'WOL',
      notes:     orderForm.notes.trim() || null,
      status:    'pending',
    });
    if (error) {
      console.error('[PartnerOrders] insert error:', error);
      setOrderMsg(error.message?.includes('prefix') || error.message?.includes('column')
        ? '❌ يرجى تشغيل migration 019 في قاعدة البيانات'
        : `❌ فشل إرسال الطلب: ${error.message}`);
    } else {
      setOrderMsg('✅ تم إرسال الطلب بنجاح — سيتم مراجعته قريباً');
      setOrderForm({ item_name: '', quantity: 10, notes: '', prefix: 'WOL' });
      loadOrders();
    }
    setOrderSubmitting(false);
    setTimeout(() => setOrderMsg(''), 5000);
  };

  // ── Effects ────────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  useEffect(() => {
    checkProfile();
    Promise.all([loadCodes(), loadCustomers()]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === 'inventory' && !isFresh('inventory')) loadCodes();
    if (activeTab === 'customers' && !isFresh('customers')) loadCustomers();
    if (activeTab === 'orders'   && !isFresh('orders'))    loadOrders();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === 'inventory') loadCodes();
  }, [codeFilter, codeSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Computed Stats ─────────────────────────────────────────────────────
  const totalCodes     = codes.length;
  const usedCodes      = codes.filter(c => c.is_used).length;
  const availableCodes = totalCodes - usedCodes;
  const convRate       = totalCodes ? Math.round((usedCodes / totalCodes) * 100) : 0;
  const unlimitedCodes = codes.filter(c => c.plan_type === 'unlimited' || c.plan_type === 'lifetime').length;
  const daysCodes      = codes.filter(c => c.plan_type === '3_days' || c.plan_type === '72_hours' || c.plan_type === 'single').length;
  const pendingOrders  = orders.filter(o => o.status === 'pending').length;

  // ── Navigate (mobile: closes sidebar) ─────────────────────────────────
  const navigate = (tab: PartnerTab) => { setActiveTab(tab); if (isMobile) setSidebarOpen(false); };

  // ════════════════════════════════════════════════════════════════════════
  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: C.page, color: C.txtPrimary,
      fontFamily: 'Tajawal, sans-serif', direction: 'rtl',
    }}>

      {/* ── Onboarding Modal (blocking — cannot be dismissed) ────────────── */}
      {profileChecked && showOnboarding && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
        }}>
          <div style={{
            background: C.card, border: `1px solid ${C.teal}44`,
            borderRadius: '1.1rem', padding: '2rem', width: '100%', maxWidth: '440px',
            maxHeight: '90vh', overflowY: 'auto', position: 'relative',
          }}>
            {/* زر الإغلاق — يعود للصفحة الرئيسية */}
            <button
              onClick={() => { setShowOnboarding(false); onBack(); }}
              title="إغلاق والعودة"
              style={{
                position: 'absolute', top: '1rem', left: '1rem',
                background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`,
                borderRadius: '50%', width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: C.txtMuted, fontSize: '0.95rem', lineHeight: 1,
                flexShrink: 0,
              }}
            >✕</button>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🤝</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: C.txtPrimary }}>مرحباً بك كشريك!</div>
              <div style={{ fontSize: '0.85rem', color: C.txtMuted, marginTop: '0.4rem' }}>
                يرجى تعبئة بياناتك لاستكمال إعداد حسابك
              </div>
            </div>

            {[
              { label: 'الاسم الكامل *', key: 'full_name', type: 'text', placeholder: 'محمد علي...' },
              { label: 'رقم واتساب *', key: 'whatsapp_number', type: 'tel', placeholder: '05XXXXXXXX' },
              { label: 'رابط المتجر / القناة (اختياري)', key: 'store_link', type: 'url', placeholder: 'https://...' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key} style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.8rem', color: C.txtSecondary, marginBottom: '0.3rem', fontWeight: 600 }}>{label}</div>
                <input
                  style={inputSt}
                  type={type}
                  placeholder={placeholder}
                  value={profileForm[key as keyof typeof profileForm]}
                  onChange={e => setProfileForm(f => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: C.txtSecondary, marginBottom: '0.3rem', fontWeight: 600 }}>الجنس *</div>
                <select
                  style={selectSt}
                  value={profileForm.gender}
                  onChange={e => setProfileForm(f => ({ ...f, gender: e.target.value }))}
                >
                  <option value="">اختر...</option>
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: C.txtSecondary, marginBottom: '0.3rem', fontWeight: 600 }}>العمر *</div>
                <input
                  style={inputSt}
                  type="number"
                  min={16}
                  max={100}
                  placeholder="25"
                  value={profileForm.age}
                  onChange={e => setProfileForm(f => ({ ...f, age: e.target.value }))}
                />
              </div>
            </div>

            {profileError && (
              <div style={{
                padding: '0.6rem 0.9rem', background: 'rgba(185,28,28,0.12)',
                border: `1px solid rgba(185,28,28,0.25)`, borderRadius: '0.5rem',
                color: C.redLt, fontSize: '0.82rem', marginBottom: '1rem',
              }}>{profileError}</div>
            )}

            <button
              onClick={handleSaveProfile}
              disabled={profileSaving}
              style={{
                ...btnPrimary, width: '100%', padding: '0.75rem',
                opacity: profileSaving ? 0.7 : 1, cursor: profileSaving ? 'not-allowed' : 'pointer',
              }}
            >
              {profileSaving ? '⏳ جارٍ الحفظ...' : '✓ حفظ وبدء الاستخدام'}
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile overlay backdrop ──────────────────────────────────────── */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div style={{
        width: '210px', flexShrink: 0, background: C.sidebar,
        borderLeft: `1px solid ${C.border}`, padding: '1.25rem 0.75rem',
        display: 'flex', flexDirection: 'column', gap: '0.2rem',
        ...(isMobile ? {
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 50,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s ease',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.5)',
        } : {}),
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          padding: '0.25rem 0.25rem 1.1rem',
          borderBottom: `1px solid ${C.border}`, marginBottom: '0.75rem',
        }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '0.45rem',
            background: `linear-gradient(135deg,${C.teal},${C.tealLt})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem',
          }}>🤝</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.82rem', color: C.txtPrimary }}>حرب الحروف</div>
            <div style={{ fontSize: '0.62rem', color: C.tealLt }}>بوابة الشريك</div>
          </div>
        </div>

        <SideItem icon="📊" label="نظرة عامة"    active={activeTab === 'overview'}   onClick={() => navigate('overview')} />
        <SideItem icon="🎟️" label="مخزون الأكواد" active={activeTab === 'inventory'} onClick={() => navigate('inventory')} badge={availableCodes} />
        <SideItem icon="👥" label="عملائي"         active={activeTab === 'customers'} onClick={() => navigate('customers')} badge={customers.length} />
        <SideItem icon="📦" label="طلباتي"         active={activeTab === 'orders'}    onClick={() => navigate('orders')}    badge={pendingOrders || undefined} />

        <div style={{ flex: 1 }} />

        {/* WhatsApp contact button */}
        <a
          href={WA_LINK}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.6rem 0.9rem', borderRadius: '0.6rem',
            background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.25)',
            color: '#25d366', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600,
            marginBottom: '0.5rem',
          }}
        >
          <span>📱</span>
          <span>تواصل عبر واتساب</span>
        </a>

        {/* Partner badge */}
        <div style={{
          padding: '0.7rem', background: `${C.teal}0d`,
          borderRadius: '0.6rem', border: `1px solid ${C.teal}33`,
          marginBottom: '0.6rem',
        }}>
          <div style={{ fontSize: '0.62rem', color: C.txtMuted, marginBottom: '0.2rem' }}>حسابك</div>
          <div style={{
            fontSize: '0.72rem', color: C.tealLt, fontWeight: 600,
            direction: 'ltr', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{user?.email}</div>
          <div style={{ marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.greenLt }} />
            <span style={{ fontSize: '0.62rem', color: C.txtMuted }}>شريك نشط</span>
          </div>
        </div>

        <button
          onClick={onBack}
          style={{ ...btnGhost, width: '100%', color: C.redLt, borderColor: `${C.red}33` }}
        >← خروج</button>
      </div>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        padding: isMobile ? '1rem 1rem 5.5rem' : '2rem',
        overflowY: 'auto', maxHeight: '100vh',
      }}>

        {/* Mobile top bar — shows title + sidebar opener (profile/logout) */}
        {isMobile && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: `1px solid ${C.border}`,
          }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: C.txtPrimary }}>بوابة الشريك</div>
              <div style={{ fontSize: '0.7rem', color: C.tealLt, marginTop: '0.1rem' }}>🤝 حرب الحروف</div>
            </div>
            <button
              onClick={() => setSidebarOpen(v => !v)}
              style={{
                background: 'rgba(255,255,255,0.07)', border: `1px solid ${C.border}`,
                borderRadius: '0.5rem', color: C.txtPrimary, fontSize: '1.15rem',
                padding: '0.4rem 0.7rem', cursor: 'pointer', lineHeight: 1,
              }}
              aria-label="إعدادات الحساب"
              title="معلومات الحساب"
            >☰</button>
          </div>
        )}

        {/* ═══════════ OVERVIEW ═══════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: C.txtPrimary, marginBottom: '0.2rem' }}>نظرة عامة</div>
            <div style={{ fontSize: '0.85rem', color: C.txtMuted, marginBottom: '1.75rem' }}>ملخص أداء حسابك كشريك موزع</div>

            {/* Row 1 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
              gap: '0.875rem', marginBottom: '0.875rem',
            }}>
              <StatCard icon="🎟️" label="إجمالي الأكواد"    value={totalCodes}       sub="في مخزونك"        color={C.blueLt}  />
              <StatCard icon="✅"  label="مستخدمة"           value={usedCodes}         color={C.greenLt}  />
              <StatCard icon="⏳"  label="متاحة"             value={availableCodes}   color={C.goldLt}   />
              <StatCard icon="👥"  label="عملاؤك"            value={customers.length} sub="مشتركون عبرك"    color={C.purpleLt} />
            </div>

            {/* Row 2 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 1fr 1fr' : 'repeat(3, 1fr)',
              gap: '0.875rem', marginBottom: '1.5rem',
            }}>
              <StatCard icon="📈" label="نسبة التحويل"    value={`${convRate}%`}   color={C.tealLt}  />
              <StatCard icon="♾️" label="بلا حدود"        value={unlimitedCodes}   color={C.goldLt}  />
              <StatCard icon="⏰" label="3 أيام"          value={daysCodes}        color={C.purpleLt} />
            </div>

            {/* Conversion bar */}
            <div style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: '0.9rem', padding: '1.25rem', marginBottom: '1.5rem',
            }}>
              <div style={{ fontWeight: 700, marginBottom: '0.75rem', color: C.txtPrimary }}>نسبة استخدام الأكواد</div>
              <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                <div style={{
                  height: '100%', width: `${convRate}%`,
                  background: `linear-gradient(90deg,${C.teal},${C.tealLt})`,
                  borderRadius: '99px', transition: 'width 0.5s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: C.txtMuted }}>
                <span>{usedCodes} مستخدم</span>
                <span style={{ color: C.tealLt, fontWeight: 700 }}>{convRate}%</span>
                <span>{totalCodes} إجمالي</span>
              </div>
            </div>

            {/* Recent codes preview */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '0.9rem', padding: '1.25rem' }}>
              <div style={{ fontWeight: 700, marginBottom: '1rem' }}>آخر الأكواد المضافة</div>
              {codes.length === 0 ? (
                <div style={{ textAlign: 'center', color: C.txtMuted, padding: '1.5rem' }}>لا توجد أكواد بعد</div>
              ) : codes.slice(0, 5).map(c => {
                const pl = planLabel(c.plan_type);
                return (
                  <div key={c.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.55rem 0', borderBottom: `1px solid rgba(255,255,255,0.04)`,
                  }}>
                    <span style={{ fontSize: '0.72rem', color: C.txtMuted, direction: 'ltr' }}>{fmt(c.created_at)}</span>
                    <Badge label={c.is_used ? '✓ مستخدم' : '● متاح'} color={c.is_used ? C.txtMuted : C.greenLt} />
                    <Badge label={pl.label} color={pl.color} />
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: C.goldLt, fontSize: '0.88rem', direction: 'ltr' }}>{c.code}</span>
                  </div>
                );
              })}
              {codes.length > 5 && (
                <button
                  onClick={() => setActiveTab('inventory')}
                  style={{ background: 'transparent', border: 'none', color: C.tealLt, cursor: 'pointer', marginTop: '0.6rem', fontSize: '0.82rem', fontFamily: 'Tajawal, sans-serif' }}
                >
                  عرض جميع الأكواد ({totalCodes}) ←
                </button>
              )}
            </div>
          </div>
        )}

        {/* ═══════════ INVENTORY ══════════════════════════════════════════ */}
        {activeTab === 'inventory' && (
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: C.txtPrimary, marginBottom: '0.2rem' }}>مخزون الأكواد</div>
            <div style={{ fontSize: '0.85rem', color: C.txtMuted, marginBottom: '1.75rem' }}>جميع أكواد التفعيل المخصصة لحسابك</div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <StatCard icon="🎟️" label="الإجمالي" value={totalCodes}     color={C.blueLt}  />
              <StatCard icon="✅"  label="مستخدمة"  value={usedCodes}      color={C.greenLt} />
              <StatCard icon="⏳"  label="متاحة"    value={availableCodes} color={C.goldLt}  />
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                style={{ ...inputSt, width: 'auto', flex: '1 1 180px', maxWidth: '220px' }}
                placeholder="🔍 ابحث بالكود..."
                value={codeSearch}
                onChange={e => setCodeSearch(e.target.value)}
              />
              <select style={{ ...selectSt, width: 'auto' }} value={codeFilter} onChange={e => setCodeFilter(e.target.value as typeof codeFilter)}>
                <option value="all">جميع الأكواد</option>
                <option value="available">● المتاحة فقط</option>
                <option value="used">✓ المستخدمة فقط</option>
              </select>
              <button style={{ ...btnGhost, flexShrink: 0 }} onClick={loadCodes}>↻ تحديث</button>
              {availableCodes > 0 && (
                <button
                  style={{ ...btnGhost, color: C.goldLt, borderColor: `${C.gold}44`, flexShrink: 0 }}
                  onClick={() => {
                    const available = codes.filter(c => !c.is_used).map(c => c.code).join('\n');
                    navigator.clipboard.writeText(available);
                  }}
                >
                  📋 نسخ المتاحة ({availableCodes})
                </button>
              )}
            </div>

            {/* Table */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '0.9rem', overflow: 'hidden' }}>
              {codesLoading ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: C.txtMuted }}>جارٍ التحميل...</div>
              ) : codes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: C.txtMuted }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.6rem' }}>🎟️</div>
                  <div>لا توجد أكواد تطابق البحث</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? '420px' : undefined }}>
                    <thead>
                      <tr style={{ background: C.cardAlt }}>
                        <th style={tableTh}>الكود</th>
                        <th style={tableTh}>نوع الباقة</th>
                        <th style={tableTh}>الحالة</th>
                        {!isMobile && <th style={tableTh}>رقم الدُفعة</th>}
                        {!isMobile && <th style={tableTh}>تاريخ الإنشاء</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {codes.map(c => {
                        const pl = planLabel(c.plan_type);
                        return (
                          <tr key={c.id}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <td style={{ ...tableTd, fontFamily: 'monospace', fontWeight: 700, color: c.is_used ? C.txtMuted : C.goldLt, direction: 'ltr', fontSize: '0.92rem' }}>
                              {c.code}
                            </td>
                            <td style={tableTd}><Badge label={pl.label} color={pl.color} /></td>
                            <td style={tableTd}><Badge label={c.is_used ? '✓ مستخدم' : '● متاح'} color={c.is_used ? C.txtMuted : C.greenLt} /></td>
                            {!isMobile && <td style={{ ...tableTd, fontSize: '0.72rem', color: C.txtMuted, direction: 'ltr', fontFamily: 'monospace' }}>
                              {c.batch_id.replace('batch_', '#')}
                            </td>}
                            {!isMobile && <td style={{ ...tableTd, direction: 'ltr', fontSize: '0.75rem', color: C.txtMuted }}>{fmt(c.created_at)}</td>}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════ CUSTOMERS ══════════════════════════════════════════ */}
        {activeTab === 'customers' && (
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: C.txtPrimary, marginBottom: '0.2rem' }}>عملائي</div>
            <div style={{ fontSize: '0.85rem', color: C.txtMuted, marginBottom: '1.75rem' }}>المشتركون الذين انضموا عبر أكوادك</div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <StatCard icon="👥" label="إجمالي العملاء"  value={customers.length}                                                                              color={C.purpleLt} />
              <StatCard icon="♾️" label="ذهبية"           value={customers.filter(c => c.plan_type === 'lifetime' || c.plan_type === 'unlimited').length}       color={C.goldLt}   />
              <StatCard icon="⏰" label="مؤقتة"           value={customers.filter(c => c.plan_type === '72_hours' || c.plan_type === 'single' || c.plan_type === '3_days').length} color={C.purpleLt} />
              <StatCard icon="🆓" label="مجاني"           value={customers.filter(c => !c.plan_type || c.plan_type === 'free').length}                         color={C.txtSecondary} />
            </div>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '0.9rem', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontWeight: 700 }}>قائمة العملاء ({customers.length})</div>
                <button style={btnGhost} onClick={loadCustomers}>↻ تحديث</button>
              </div>

              {customersLoading ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: C.txtMuted }}>جارٍ التحميل...</div>
              ) : customers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: C.txtMuted }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.6rem' }}>👥</div>
                  <div>لم ينضم أي عميل بعد عبر أكوادك</div>
                  <div style={{ fontSize: '0.78rem', marginTop: '0.4rem', color: C.txtMuted }}>شارك أكوادك مع العملاء لبدء البيع</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? '300px' : undefined }}>
                    <thead>
                      <tr style={{ background: C.cardAlt }}>
                        <th style={tableTh}>البريد الإلكتروني</th>
                        <th style={tableTh}>الباقة الحالية</th>
                        {!isMobile && <th style={tableTh}>تاريخ الانضمام</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map(c => {
                        const pl = planLabel(c.plan_type);
                        return (
                          <tr key={c.id}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <td style={{ ...tableTd, direction: 'ltr', fontFamily: 'monospace', fontSize: '0.85rem', maxWidth: isMobile ? '140px' : undefined, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</td>
                            <td style={tableTd}><Badge label={pl.label} color={pl.color} /></td>
                            {!isMobile && <td style={{ ...tableTd, direction: 'ltr', fontSize: '0.75rem', color: C.txtMuted }}>{fmt(c.created_at)}</td>}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════ ORDERS ═════════════════════════════════════════════ */}
        {activeTab === 'orders' && (
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: C.txtPrimary, marginBottom: '0.2rem' }}>طلباتي</div>
            <div style={{ fontSize: '0.85rem', color: C.txtMuted, marginBottom: '1.75rem' }}>طلب أكواد تفعيل إضافية من الإدارة</div>

            {/* Order form */}
            <div style={{
              background: C.card, border: `1px solid ${C.teal}33`,
              borderTop: `2px solid ${C.teal}`,
              borderRadius: '0.9rem', padding: '1.25rem', marginBottom: '1.25rem',
            }}>
              <div style={{ fontWeight: 700, color: C.tealLt, marginBottom: '1rem', fontSize: '0.95rem' }}>📦 طلب أكواد جديدة</div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
                gap: '0.75rem', marginBottom: '1rem',
              }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: C.txtSecondary, marginBottom: '0.35rem', fontWeight: 600 }}>نوع الأكواد *</div>
                  <select
                    style={selectSt}
                    value={orderForm.item_name}
                    onChange={e => setOrderForm(f => ({ ...f, item_name: e.target.value }))}
                  >
                    <option value="">اختر نوع الأكواد...</option>
                    <option value="أكواد 3 أيام">⏰ أكواد 3 أيام</option>
                    <option value="أكواد بلا حدود">♾️ أكواد بلا حدود</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: C.txtSecondary, marginBottom: '0.35rem', fontWeight: 600 }}>الكمية *</div>
                  <input
                    style={inputSt}
                    type="number"
                    min={1}
                    max={500}
                    value={orderForm.quantity}
                    onChange={e => setOrderForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: C.txtSecondary, marginBottom: '0.35rem', fontWeight: 600 }}>البادئة (Prefix)</div>
                  <input
                    style={inputSt}
                    placeholder="WOL"
                    maxLength={10}
                    value={orderForm.prefix}
                    onChange={e => setOrderForm(f => ({ ...f, prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: C.txtSecondary, marginBottom: '0.35rem', fontWeight: 600 }}>ملاحظات (اختياري)</div>
                  <input
                    style={inputSt}
                    placeholder="أي تعليمات إضافية..."
                    value={orderForm.notes}
                    onChange={e => setOrderForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  style={{
                    ...btnPrimary,
                    opacity: (orderSubmitting || !orderForm.item_name) ? 0.6 : 1,
                    cursor: (orderSubmitting || !orderForm.item_name) ? 'not-allowed' : 'pointer',
                  }}
                  onClick={handleSubmitOrder}
                  disabled={orderSubmitting || !orderForm.item_name}
                >
                  {orderSubmitting ? '⏳ جارٍ الإرسال...' : '📤 إرسال الطلب'}
                </button>
                {orderMsg && (
                  <span style={{
                    fontSize: '0.85rem', fontWeight: 600,
                    color: orderMsg.startsWith('✅') ? C.greenLt : C.redLt,
                  }}>{orderMsg}</span>
                )}
              </div>
            </div>

            {/* Orders history */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '0.9rem', overflow: 'hidden' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.9rem 1rem', borderBottom: `1px solid ${C.border}`,
              }}>
                <div style={{ fontWeight: 700 }}>سجل الطلبات ({orders.length})</div>
                <button style={btnGhost} onClick={loadOrders}>↻ تحديث</button>
              </div>
              {ordersLoading ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: C.txtMuted }}>جارٍ التحميل...</div>
              ) : orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: C.txtMuted }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.6rem' }}>📦</div>
                  <div>لم ترسل أي طلب بعد</div>
                  <div style={{ fontSize: '0.78rem', marginTop: '0.4rem' }}>استخدم النموذج أعلاه لطلب أكواد جديدة</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? '340px' : undefined }}>
                    <thead>
                      <tr style={{ background: C.cardAlt }}>
                        <th style={tableTh}>نوع الطلب</th>
                        <th style={tableTh}>البادئة</th>
                        <th style={tableTh}>الكمية</th>
                        <th style={tableTh}>الحالة</th>
                        {!isMobile && <th style={tableTh}>ملاحظات</th>}
                        <th style={tableTh}>التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(o => {
                        const statusInfo = o.status === 'approved'
                          ? { label: '✓ مقبول',       color: C.greenLt }
                          : o.status === 'rejected'
                          ? { label: '✕ مرفوض',       color: C.redLt   }
                          : { label: '⏳ قيد المراجعة', color: C.goldLt  };
                        return (
                          <tr key={o.id}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <td style={{ ...tableTd, fontWeight: 600 }}>{o.item_name}</td>
                            <td style={{ ...tableTd, fontFamily: 'monospace', fontSize: '0.8rem', color: C.tealLt }}>{o.prefix || 'WOL'}</td>
                            <td style={tableTd}><Badge label={`${o.quantity} كود`} color={C.blueLt} /></td>
                            <td style={tableTd}><Badge label={statusInfo.label} color={statusInfo.color} /></td>
                            {!isMobile && <td style={{ ...tableTd, fontSize: '0.8rem', color: C.txtMuted }}>{o.notes || '—'}</td>}
                            <td style={{ ...tableTd, direction: 'ltr', fontSize: '0.75rem', color: C.txtMuted }}>{fmt(o.created_at)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── Mobile Bottom Navigation Bar ────────────────────────────────── */}
      {isMobile && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
          background: C.sidebar,
          borderTop: `1px solid ${C.border}`,
          display: 'flex',
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.45)',
        }}>
          {([
            { tab: 'overview',   icon: '📊', label: 'نظرة عامة' },
            { tab: 'inventory',  icon: '🎟️', label: 'مخزون',    badge: availableCodes > 0 ? availableCodes : undefined },
            { tab: 'customers',  icon: '👥', label: 'عملائي',   badge: customers.length > 0 ? customers.length : undefined },
            { tab: 'orders',     icon: '📦', label: 'طلباتي',   badge: pendingOrders > 0 ? pendingOrders : undefined },
          ] as { tab: PartnerTab; icon: string; label: string; badge?: number }[]).map(({ tab, icon, label, badge }) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => navigate(tab)}
                style={{
                  flex: 1, padding: '0.55rem 0 0.45rem', border: 'none',
                  background: isActive ? `${C.teal}18` : 'transparent',
                  color: isActive ? C.tealLt : C.txtMuted,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
                  cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
                  borderTop: isActive ? `2px solid ${C.tealLt}` : '2px solid transparent',
                  transition: 'all 0.15s', position: 'relative',
                }}
              >
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{icon}</span>
                <span style={{ fontSize: '0.6rem', fontWeight: isActive ? 700 : 400 }}>{label}</span>
                {badge !== undefined && (
                  <span style={{
                    position: 'absolute', top: '0.25rem', right: 'calc(50% - 1.1rem)',
                    background: C.teal, color: '#fff', borderRadius: '99px',
                    padding: '0 0.32rem', fontSize: '0.58rem', fontWeight: 700, minWidth: '14px',
                    textAlign: 'center',
                  }}>{badge > 99 ? '99+' : badge}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default PartnerDashboard;

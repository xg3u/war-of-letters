// src/components/AdminDashboard.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../context/AuthContext';
import { adminCache, useDebounce } from '../utils/adminCache';

// ═══════════════════════════════════════════════════════════
// Design Tokens — calm, game-consistent palette
// ═══════════════════════════════════════════════════════════
const C = {
  // Backgrounds
  page:      '#0b0b1e',
  sidebar:   '#0e0e23',
  card:      '#13132c',
  cardAlt:   '#171730',
  input:     'rgba(255,255,255,0.04)',
  overlay:   'rgba(0,0,0,0.65)',

  // Borders
  border:    'rgba(255,255,255,0.08)',
  borderSub: 'rgba(255,255,255,0.04)',
  borderPurple: 'rgba(109,40,217,0.3)',

  // Text  — tested for WCAG AA on #13132c background
  txtPrimary:   '#e8ecf7',   // ~13:1 — headings, values
  txtSecondary: '#a8b4cc',   // ~5.5:1 — labels, sidebar items
  txtMuted:     '#7a8ba8',   // ~3.5:1 — sub-text, table headers
  txtAccent:    '#b49fea',   // ~5:1   — accent labels

  // Accent colors
  purple:   '#6d28d9',
  purpleLt: '#b49fea',       // brighter for better readability
  green:    '#059669',
  greenLt:  '#4ade80',       // brighter green
  gold:     '#b45309',
  goldLt:   '#fbbf24',       // brighter gold
  red:      '#b91c1c',
  redLt:    '#f87171',
  blue:     '#1d4ed8',
  blueLt:   '#7ab8f7',       // softer blue
  gray:     '#374151',
  grayLt:   '#94a3b8',       // brighter gray for badges
};

const ARABIC_LETTERS = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════
type AdminTab = 'overview' | 'users' | 'questions' | 'categories' | 'partners' | 'codes' | 'orders' | 'analytics';

// ── Analytics types ──────────────────────────────────────────────────────────
interface ActiveSession { id: string; session_code: string; host_email: string; game_mode: string; play_mode?: string; rounds_setting: number; peak_players: number; started_at: string; duration_min: number; }
interface DailyStat { d: string; sessions: number; players: number; avg_dur: number; }
interface DailyReg { d: string; cnt: number; }
interface HourlyStat { h: number; cnt: number; }
interface TopHost { email: string; cnt: number; total_players: number; }
interface AnalyticsSummary { total_sessions: number; total_active: number; avg_duration_min: number; avg_players: number; total_users: number; active_hosts: number; }
interface ModeDistribution { normal: number; tv_show: number; }
interface WinModeStat { mode: string; cnt: number; }
interface AnalyticsData {
  active_sessions: ActiveSession[];
  daily_sessions: DailyStat[];
  daily_registrations: DailyReg[];
  plan_distribution: { free: number; temp: number; lifetime: number };
  hourly_distribution: HourlyStat[];
  top_hosts: TopHost[];
  summary: AnalyticsSummary;
  mode_distribution?: ModeDistribution;
  win_mode_distribution?: WinModeStat[];
}

interface BuyerRow { id: string; email: string; plan_type: string | null; subscription_status: string | null; expires_at: string | null; role: string; created_at?: string; }
interface QuestionRow { id: string; question_text: string; correct_answer: string; letter_assigned: string; category_id: string; }
interface CategoryRow { id: string; name_ar: string; _count?: number; }
interface PartnerRow { id: string; email: string; plan_type: string | null; total_codes: number; used_codes: number; customers: number; }
interface CodeRow { id: string; code: string; plan_type: string; owner_partner_id: string; batch_id: string; is_used: boolean; created_at: string; partner_email?: string; }
interface PartnerOrderRow { id: string; user_id: string; item_name: string; quantity: number; prefix?: string; status: 'pending' | 'approved' | 'rejected'; notes?: string; created_at: string; partner_email?: string; }
interface PartnerProfileRow { user_id: string; full_name: string; whatsapp_number: string; gender: string; age: number; store_link?: string; created_at?: string; }
interface ImportQuestion { question_text: string; correct_answer: string; letter_assigned: string; category_id: string | number; }

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════
function planLabel(p: string | null) {
  if (!p || p === 'free')                                              return { label: 'مجاني',        color: '#94a3b8' };
  if (p === '3_days' || p === '72_hours' || p === 'single')           return { label: '⏰ 3 أيام',    color: C.blueLt  };
  if (p === 'lifetime')                                                return { label: '♾️ ذهبية',    color: C.goldLt  };
  return { label: p, color: '#94a3b8' };
}

// ═══════════════════════════════════════════════════════════
// Micro-components
// ═══════════════════════════════════════════════════════════
const Badge = ({ label, color }: { label: string; color: string }) => (
  <span style={{
    padding: '0.25rem 0.7rem', borderRadius: '0.4rem',
    fontSize: '0.82rem', fontWeight: 700,
    background: `${color}30`, color, border: `1px solid ${color}80`,
    letterSpacing: '0.01em', whiteSpace: 'nowrap',
  }}>
    {label}
  </span>
);

// ── Info Tooltip — ⓘ button with popup explanation ───────────
const InfoTip = ({ text }: { text: string }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block', marginRight: '0.35rem' }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '18px', height: '18px', borderRadius: '50%',
        background: open ? 'rgba(109,40,217,0.25)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${open ? 'rgba(109,40,217,0.5)' : 'rgba(255,255,255,0.1)'}`,
        color: open ? C.purpleLt : C.txtMuted, fontSize: '0.6rem', fontWeight: 800,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 0, lineHeight: 1, transition: 'all 0.2s',
      }}>ⓘ</button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
          marginTop: '6px', padding: '0.65rem 0.85rem', borderRadius: '0.6rem',
          background: '#1a1a3e', border: `1px solid ${C.borderPurple}`,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          fontSize: '0.72rem', color: C.txtSecondary, lineHeight: 1.6,
          width: 'max-content', maxWidth: '260px', zIndex: 100, textAlign: 'right',
          whiteSpace: 'pre-line',
        }}>{text}</div>
      )}
    </div>
  );
};

// ── Chart Header — title + info tip ─────────────────────────
const ChartHeader = ({ title, info, style }: { title: string; info: string; style: React.CSSProperties }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', ...style }}>
    <span>{title}</span>
    <InfoTip text={info} />
  </div>
);

const StatCard = ({ icon, label, value, sub, color }: { icon: string; label: string; value: string | number; sub?: string; color: string }) => (
  <div style={{
    background: C.card,
    border: `1px solid ${C.border}`,
    borderTop: `2px solid ${color}55`,   // subtle colored top accent
    borderRadius: '0.875rem', padding: '1.25rem 1.375rem', flex: 1, minWidth: '150px',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.7rem' }}>
      <span style={{ fontSize: '1.15rem' }}>{icon}</span>
      <span style={{ fontSize: '0.82rem', color: C.txtSecondary, fontWeight: 600, letterSpacing: '0.01em' }}>{label}</span>
    </div>
    <div style={{ fontSize: '2.2rem', fontWeight: 800, color, lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</div>
    {sub && <div style={{ fontSize: '0.78rem', color: C.txtMuted, marginTop: '0.4rem', fontWeight: 500 }}>{sub}</div>}
  </div>
);

const SideItem = ({ icon, label, active, onClick, badge }: { icon: string; label: string; active: boolean; onClick: () => void; badge?: number }) => (
  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem',
    width: '100%', padding: '0.65rem 0.875rem', borderRadius: '0.6rem',
    background: active ? 'rgba(109,40,217,0.14)' : 'transparent',
    border: `1px solid ${active ? 'rgba(109,40,217,0.28)' : 'transparent'}`,
    color: active ? C.purpleLt : C.txtSecondary,
    fontWeight: active ? 700 : 500, fontSize: '0.875rem', cursor: 'pointer',
    transition: 'all 0.15s', textAlign: 'right', fontFamily: 'Tajawal, sans-serif',
  }}
    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
      <span style={{ fontSize: '1rem', opacity: active ? 1 : 0.7 }}>{icon}</span>
      <span>{label}</span>
    </div>
    {badge !== undefined && badge > 0 && (
      <span style={{ background: C.purple, color: '#fff', borderRadius: '99px', padding: '0.05rem 0.45rem', fontSize: '0.65rem', fontWeight: 700 }}>{badge}</span>
    )}
  </button>
);

// Shared input/select styles
const inputSt: React.CSSProperties = { padding: '0.65rem 0.875rem', background: '#1a1a3a', border: `1px solid rgba(255,255,255,0.18)`, borderRadius: '0.625rem', color: C.txtPrimary, fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'Tajawal, sans-serif' };
const selectSt: React.CSSProperties = { padding: '0.6rem 0.875rem', background: '#1a1a3a', border: `1px solid rgba(255,255,255,0.18)`, borderRadius: '0.625rem', color: C.txtPrimary, fontSize: '0.85rem', outline: 'none', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif' };
const btnPrimary: React.CSSProperties = { padding: '0.65rem 1.25rem', borderRadius: '0.625rem', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem', fontFamily: 'Tajawal, sans-serif', background: C.purple, color: '#fff', letterSpacing: '0.01em' };
const btnGhost: React.CSSProperties = { padding: '0.6rem 1rem', borderRadius: '0.625rem', border: `1px solid rgba(255,255,255,0.14)`, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', fontFamily: 'Tajawal, sans-serif', background: 'rgba(255,255,255,0.04)', color: C.txtSecondary };
const tableTh: React.CSSProperties = { padding: '0.7rem 1rem', textAlign: 'right', fontSize: '0.78rem', color: C.txtMuted, fontWeight: 700, borderBottom: `1px solid rgba(255,255,255,0.08)`, letterSpacing: '0.02em' };
const tableTd: React.CSSProperties = { padding: '0.75rem 1rem', fontSize: '0.875rem', borderBottom: `1px solid rgba(255,255,255,0.05)`, color: C.txtPrimary, verticalAlign: 'middle' };

// ── localStorage key for instant overview on next load ─────
const OVERVIEW_SNAP_KEY = 'wol_admin_overview_v2';

// ── Skeleton shimmer component ──────────────────────────────
// Injects keyframe once, renders shimmer placeholder blocks
let _shimmerInjected = false;
const Skeleton = ({ w = '100%', h = '1.1rem', br = '0.4rem', mb = '0' }: { w?: string; h?: string; br?: string; mb?: string }) => {
  if (!_shimmerInjected) {
    _shimmerInjected = true;
    const s = document.createElement('style');
    s.textContent = '@keyframes wol-sh{0%{background-position:200% 0}100%{background-position:-200% 0}}';
    document.head.appendChild(s);
  }
  return (
    <div style={{
      width: w, height: h, borderRadius: br, marginBottom: mb, flexShrink: 0,
      background: 'linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%)',
      backgroundSize: '200% 100%',
      animation: 'wol-sh 1.4s ease-in-out infinite',
    }} />
  );
};

// ── StatCard Skeleton variant ───────────────────────────────
const StatCardSkeleton = () => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '0.875rem', padding: '1.25rem', flex: 1, minWidth: '150px' }}>
    <Skeleton w="55%" h="0.75rem" br="0.3rem" mb="0.85rem" />
    <Skeleton w="40%" h="2rem"   br="0.4rem" mb="0.35rem" />
    <Skeleton w="65%" h="0.65rem" br="0.3rem" />
  </div>
);

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════
const AdminDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useAuthContext();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // ── Mobile Responsive ─────────────────────────────────────
  const [isMobile, setIsMobile]       = useState(() => window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  // ── Overview ─────────────────────────────────────────────
  const [stats, setStats] = useState({ totalQ: 0, totalCats: 0, totalUsers: 0, lifetimeU: 0, tempU: 0, freeU: 0, totalPartners: 0, totalCodes: 0, usedCodes: 0 });
  const [letterDist, setLetterDist] = useState<Record<string, number>>({});
  const [categoryDist, setCategoryDist] = useState<{ name: string; count: number; color: string }[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [letterCatBreakdown, setLetterCatBreakdown] = useState<{ name: string; count: number; color: string }[]>([]);
  const [letterBreakdownLoading, setLetterBreakdownLoading] = useState(false);

  // ── Users ─────────────────────────────────────────────────
  const [users, setUsers] = useState<BuyerRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const dUserSearch = useDebounce(userSearch, 500); // debounced 500ms — server-side search
  const [userFilter, setUserFilter] = useState<'all' | 'free' | 'lifetime' | '3_days'>('all');
  const [userPage, setUserPage] = useState(0);
  const [userTotal, setUserTotal] = useState(0);
  const U_PER_PAGE = 20;
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkPlan, setBulkPlan] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMsg, setBulkMsg] = useState('');
  const [pendingPlanChanges, setPendingPlanChanges] = useState<Record<string, string>>({});
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);

  // ── Questions ─────────────────────────────────────────────
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [qLoading, setQLoading] = useState(false);
  const [qSearch, setQSearch] = useState('');
  const dQSearch = useDebounce(qSearch, 350); // debounced
  const [qCatFilter, setQCatFilter] = useState('all');
  const [qLetterFilter, setQLetterFilter] = useState('all');
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [editingQ, setEditingQ] = useState<QuestionRow | null>(null);
  const [showAddQ, setShowAddQ] = useState(false);
  const [qForm, setQForm] = useState({ question_text: '', correct_answer: '', letter_assigned: 'ا', category_id: '' });
  const [qSaving, setQSaving] = useState(false);
  const [qPage, setQPage] = useState(0);
  const [qTotal, setQTotal] = useState(0);
  const Q_PER_PAGE = 20;

  // ── Import ────────────────────────────────────────────────
  const [showImport, setShowImport] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2>(1);
  const [importData, setImportData] = useState<ImportQuestion[]>([]);
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState('');
  const importFileRef = useRef<HTMLInputElement>(null);

  // ── Categories ────────────────────────────────────────────
  const [catsWithCount, setCatsWithCount] = useState<(CategoryRow & { _count: number })[]>([]);
  const [catsLoading, setCatsLoading] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [catSaving, setCatSaving] = useState(false);

  // ── Partners ──────────────────────────────────────────────
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [promoteEmail, setPromoteEmail] = useState('');
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [promoteMsg, setPromoteMsg] = useState('');

  // ── Codes ─────────────────────────────────────────────────
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [partnerList, setPartnerList] = useState<{ id: string; email: string }[]>([]);
  const [codeForm, setCodeForm] = useState({ partner_id: '', prefix: 'WOL', quantity: 10, plan_type: '3_days' as '3_days' | 'unlimited' });
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState('');
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  // ── Orders ────────────────────────────────────────────────
  const [partnerOrders, setPartnerOrders]   = useState<PartnerOrderRow[]>([]);
  const [ordersLoading, setOrdersLoading]   = useState(false);
  const [approvingOrder, setApprovingOrder] = useState<string | null>(null);
  const [ordersFilter, setOrdersFilter]     = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  // ── Partner Profile Modal ─────────────────────────────────
  const [partnerProfileModal, setPartnerProfileModal] = useState<{ partner: PartnerRow; profile: PartnerProfileRow | null } | null>(null);
  const [profileLoading, setProfileLoading]           = useState(false);

  // ── Analytics ───────────────────────────────────────────────
  const [analyticsData, setAnalyticsData]     = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsDays, setAnalyticsDays]       = useState(30);
  const [closingSession, setClosingSession]     = useState<string | null>(null);

  // ── Delete User ───────────────────────────────────────────
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deleteToast, setDeleteToast]       = useState('');

  const handleDeleteUser = async (u: BuyerRow) => {
    const confirmed = window.confirm(
      `⚠️ حذف نهائي\n\nهل أنت متأكد من حذف حساب:\n${u.email}\n\nلا يمكن التراجع عن هذا الإجراء.`
    );
    if (!confirmed) return;

    setDeletingUserId(u.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await supabase.functions.invoke('delete-user', {
        body: { userId: u.id },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (res.error) throw new Error(res.error.message);

      // أزل من القائمة فوراً
      setUsers(prev => prev.filter(x => x.id !== u.id));
      setDeleteToast(`✓ تم حذف ${u.email}`);
      setTimeout(() => setDeleteToast(''), 4000);
    } catch (err: any) {
      alert(`فشل الحذف: ${err.message ?? 'خطأ غير معروف'}`);
    } finally {
      setDeletingUserId(null);
    }
  };

  // ── Smart cache: tab → last-loaded timestamp ───────────────
  // Prevents re-fetching data that's already fresh (< 90 seconds old)
  const tabLoadedAt = useRef<Record<string, number>>({});
  const CACHE_TTL   = 90_000; // 90 seconds
  const isFresh     = (tab: string) => { const t = tabLoadedAt.current[tab]; return !!t && Date.now() - t < CACHE_TTL; };
  const markLoaded  = (tab: string) => { tabLoadedAt.current[tab] = Date.now(); };

  // ═══════════════════════════════════════════════════════════
  // Data Loaders
  // ═══════════════════════════════════════════════════════════
  const loadOverview = useCallback(async () => {
    // ① Show previous snapshot instantly (stale-while-revalidate)
    const snap = adminCache.peek<{ s: typeof stats; ld: Record<string, number>; cd: typeof categoryDist }>('overview');
    if (snap) { setStats(snap.s); setLetterDist(snap.ld); setCategoryDist(snap.cd); }

    // ② If already loading (dedup guard) or fresh, skip
    if (adminCache.isPending('overview')) return;
    if (adminCache.isFresh('overview') && snap) { return; }

    setOverviewLoading(true);

    // ② Single RPC — all aggregation done in Postgres (1 round-trip vs 6 queries)
    const { data, error } = await supabase.rpc('get_admin_overview');

    if (!error && data) {
      const catPalette = ['#6d28d9','#059669','#b45309','#1d4ed8','#b91c1c','#0e7490'];
      const s = {
        totalQ:        data.total_questions   ?? 0,
        totalCats:     data.total_categories  ?? 0,
        totalUsers:    data.total_users        ?? 0,
        lifetimeU:     data.lifetime_users     ?? 0,
        tempU:         data.temp_users         ?? 0,
        freeU:         data.free_users         ?? 0,
        totalPartners: data.total_partners     ?? 0,
        totalCodes:    data.total_codes        ?? 0,
        usedCodes:     data.used_codes         ?? 0,
      };
      const ld: Record<string, number> = data.letter_dist ?? {};
      const cd = (data.cat_dist ?? []).map((c: { id: string; name: string; count: number }, i: number) => ({
        name: c.name, count: c.count, color: catPalette[i % catPalette.length],
      }));
      setStats(s); setLetterDist(ld); setCategoryDist(cd);
      // Persist via adminCache (memory + localStorage, auto-managed)
      adminCache.write('overview', { s, ld, cd });
    } else if (error) {
      // RPC not yet created — graceful fallback to parallel queries
      console.warn('get_admin_overview RPC not found, falling back to direct queries:', error.message);
      const [{ count: qCount }, { count: cCount }, buyersRes, codesRes, letterRes, catDistRes] = await Promise.all([
        supabase.from('questions').select('id', { count: 'exact', head: true }),
        supabase.from('categories').select('id', { count: 'exact', head: true }),
        supabase.from('buyers').select('plan_type, role'),
        supabase.from('activation_codes').select('is_used'),
        supabase.from('questions').select('letter_assigned'),
        supabase.from('questions').select('category_id, categories(name_ar)'),
      ]);
      const buyers = buyersRes.data ?? [];
      const dist: Record<string, number> = {};
      (letterRes.data ?? []).forEach((q: { letter_assigned: string }) => { dist[q.letter_assigned] = (dist[q.letter_assigned] ?? 0) + 1; });
      const catCounts: Record<string, { name: string; count: number }> = {};
      const catPalette = ['#6d28d9','#059669','#b45309','#1d4ed8','#b91c1c','#0e7490'];
      (catDistRes.data as any[] ?? []).forEach((q: { category_id: string; categories: { name_ar: string } | { name_ar: string }[] | null }) => {
        const cid = q.category_id;
        const cat = q.categories;
        const name = (Array.isArray(cat) ? cat[0]?.name_ar : cat?.name_ar) ?? cid;
        if (!catCounts[cid]) catCounts[cid] = { name, count: 0 };
        catCounts[cid].count++;
      });
      const catDist = Object.values(catCounts).sort((a, b) => b.count - a.count).map((c, i) => ({ ...c, color: catPalette[i % catPalette.length] }));
      setStats({
        totalQ: qCount ?? 0, totalCats: cCount ?? 0, totalUsers: buyers.length,
        lifetimeU: buyers.filter(b => b.plan_type === 'lifetime').length,
        tempU: buyers.filter(b => b.plan_type === '72_hours' || b.plan_type === 'single').length,
        freeU: buyers.filter(b => !b.plan_type || b.plan_type === 'free').length,
        totalPartners: buyers.filter(b => b.role === 'partner').length,
        totalCodes: (codesRes.data ?? []).length,
        usedCodes: (codesRes.data ?? []).filter((c: { is_used: boolean }) => c.is_used).length,
      });
      setLetterDist(dist); setCategoryDist(catDist);
      adminCache.write('overview', {
        s: { totalQ: qCount??0, totalCats: cCount??0, totalUsers: buyers.length,
             lifetimeU: buyers.filter(b=>b.plan_type==='lifetime').length,
             tempU: buyers.filter(b=>b.plan_type==='72_hours'||b.plan_type==='single').length,
             freeU: buyers.filter(b=>!b.plan_type||b.plan_type==='free').length,
             totalPartners: buyers.filter(b=>b.role==='partner').length,
             totalCodes: (codesRes.data??[]).length,
             usedCodes: (codesRes.data??[]).filter((c:{is_used:boolean})=>c.is_used).length },
        ld: dist, cd: catDist,
      });
    }

    markLoaded('overview'); setOverviewLoading(false);
  }, []);

  const loadLetterBreakdown = useCallback(async (letter: string) => {
    setLetterBreakdownLoading(true);
    const { data } = await supabase
      .from('questions')
      .select('category_id, categories(name_ar)')
      .eq('letter_assigned', letter);
    const counts: Record<string, { name: string; count: number }> = {};
    (data as any[] ?? []).forEach((q: any) => {
      const cid = q.category_id ?? 'other';
      const name = (Array.isArray(q.categories) ? q.categories[0]?.name_ar : q.categories?.name_ar) ?? cid;
      if (!counts[cid]) counts[cid] = { name, count: 0 };
      counts[cid].count++;
    });
    const palette = ['#6d28d9','#059669','#b45309','#1d4ed8','#b91c1c','#0e7490'];
    setLetterCatBreakdown(
      Object.values(counts)
        .sort((a, b) => b.count - a.count)
        .map((c, i) => ({ ...c, color: palette[i % palette.length] }))
    );
    setLetterBreakdownLoading(false);
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    const from = userPage * U_PER_PAGE;
    const to   = from + U_PER_PAGE - 1;
    let q = supabase
      .from('buyers')
      .select('id, email, plan_type, subscription_status, expires_at, role, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
    if (dUserSearch)            q = q.ilike('email', `%${dUserSearch}%`);
    if (userFilter === 'free')      q = q.or('plan_type.is.null,plan_type.eq.free');
    else if (userFilter === '3_days') q = q.or('plan_type.eq.72_hours,plan_type.eq.single,plan_type.eq.3_days');
    else if (userFilter !== 'all')  q = q.eq('plan_type', userFilter);
    const { data, count } = await q;
    setUsers((data ?? []) as BuyerRow[]);
    setUserTotal(count ?? 0);
    markLoaded('users');
    setUsersLoading(false);
  }, [dUserSearch, userFilter, userPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadQuestions = useCallback(async () => {
    // Show stale page instantly while fetching fresh
    const staleKey = `q_${qCatFilter}_${qLetterFilter}_${dQSearch}_${qPage}`;
    const stale = adminCache.peek<{ rows: QuestionRow[]; total: number }>(staleKey);
    if (stale) { setQuestions(stale.rows); setQTotal(stale.total); }

    setQLoading(true);
    let q = supabase.from('questions').select('id, question_text, correct_answer, letter_assigned, category_id', { count: 'exact' }).order('id', { ascending: false });
    if (qCatFilter !== 'all') q = q.eq('category_id', qCatFilter);
    if (qLetterFilter !== 'all') q = q.eq('letter_assigned', qLetterFilter);
    if (dQSearch) q = q.or(`question_text.ilike.%${dQSearch}%,correct_answer.ilike.%${dQSearch}%`);
    const { data, count } = await q.range(qPage * Q_PER_PAGE, (qPage + 1) * Q_PER_PAGE - 1);
    const rows = (data ?? []) as QuestionRow[];
    setQuestions(rows); setQTotal(count ?? 0);
    adminCache.write(staleKey, { rows, total: count ?? 0 });
    markLoaded('questions'); setQLoading(false);
  }, [qCatFilter, qLetterFilter, dQSearch, qPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCategories = useCallback(async () => {
    const { data } = await supabase.from('categories').select('id, name_ar');
    setCategories((data ?? []) as CategoryRow[]);
    if (qForm.category_id === '' && data && data.length > 0) setQForm(f => ({ ...f, category_id: data[0].id }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCatsWithCount = useCallback(async () => {
    setCatsLoading(true);
    // Batch: 2 queries instead of N+1 (one per category)
    const [{ data: cats }, { data: qCats }] = await Promise.all([
      supabase.from('categories').select('id, name_ar'),
      supabase.from('questions').select('category_id'),
    ]);
    const cntMap: Record<string, number> = {};
    (qCats ?? []).forEach((q: { category_id: string }) => {
      cntMap[q.category_id] = (cntMap[q.category_id] ?? 0) + 1;
    });
    const withCount = (cats ?? [])
      .map(c => ({ ...c, _count: cntMap[c.id] ?? 0 }))
      .sort((a, b) => b._count - a._count);
    setCatsWithCount(withCount as (CategoryRow & { _count: number })[]);
    markLoaded('categories'); setCatsLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPartners = useCallback(async () => {
    setPartnersLoading(true);
    // Single RPC — JOIN aggregation done in Postgres (1 round-trip)
    const { data, error } = await supabase.rpc('get_partner_rows');
    if (!error && Array.isArray(data) && data.length >= 0) {
      setPartners(data as PartnerRow[]);
      setPartnerList((data as PartnerRow[]).map(p => ({ id: p.id, email: p.email })));
    } else {
      // Graceful fallback if RPC not yet created
      console.warn('get_partner_rows RPC not found, falling back:', error?.message);
      const [{ data: pts }, { data: allCodes }, { data: allCusts }] = await Promise.all([
        supabase.from('buyers').select('id, email, plan_type').eq('role', 'partner'),
        supabase.from('activation_codes').select('owner_partner_id, is_used'),
        supabase.from('buyers').select('referred_by_partner_id').not('referred_by_partner_id', 'is', null),
      ]);
      if (pts) {
        const totalMap: Record<string, number> = {};
        const usedMap: Record<string, number>  = {};
        const custMap: Record<string, number>  = {};
        (allCodes ?? []).forEach((c: { owner_partner_id: string; is_used: boolean }) => {
          totalMap[c.owner_partner_id] = (totalMap[c.owner_partner_id] ?? 0) + 1;
          if (c.is_used) usedMap[c.owner_partner_id] = (usedMap[c.owner_partner_id] ?? 0) + 1;
        });
        (allCusts ?? []).forEach((b: { referred_by_partner_id: string }) => {
          custMap[b.referred_by_partner_id] = (custMap[b.referred_by_partner_id] ?? 0) + 1;
        });
        const rows = pts.map(p => ({ ...p, total_codes: totalMap[p.id]??0, used_codes: usedMap[p.id]??0, customers: custMap[p.id]??0 }));
        setPartners(rows as PartnerRow[]);
        setPartnerList(pts.map(p => ({ id: p.id, email: p.email })));
      }
    }
    markLoaded('partners'); setPartnersLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCodes = useCallback(async () => {
    setCodesLoading(true);
    const { data } = await supabase.from('activation_codes').select('id, code, plan_type, owner_partner_id, batch_id, is_used, created_at').order('created_at', { ascending: false }).limit(300);
    const enriched = (data ?? []).map((c: CodeRow) => ({ ...c, partner_email: partnerList.find(p => p.id === c.owner_partner_id)?.email ?? c.owner_partner_id?.slice(0, 8) }));
    setCodes(enriched); markLoaded('codes'); setCodesLoading(false);
  }, [partnerList]);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    const { data, error } = await supabase
      .from('partner_orders')
      .select('id, user_id, item_name, quantity, prefix, status, notes, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) console.error('[AdminOrders] fetch error:', error.message);
    const enriched = (data ?? []).map((o: PartnerOrderRow) => ({
      ...o,
      partner_email: partnerList.find(p => p.id === o.user_id)?.email ?? o.user_id?.slice(0, 8),
    }));
    setPartnerOrders(enriched); markLoaded('orders'); setOrdersLoading(false);
  }, [partnerList]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOrderAction = useCallback(async (orderId: string, action: 'approved' | 'rejected') => {
    setApprovingOrder(orderId);
    await supabase.from('partner_orders').update({ status: action }).eq('id', orderId);
    setPartnerOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: action } : o));
    setApprovingOrder(null);
  }, []);

  // ── Analytics loader ──────────────────────────────────────────────────────
  const loadAnalytics = useCallback(async (days?: number) => {
    const d = days ?? analyticsDays;
    setAnalyticsLoading(true);
    const { data, error } = await supabase.rpc('get_admin_analytics', { p_days: d });
    if (!error && data) {
      setAnalyticsData(data as unknown as AnalyticsData);
      adminCache.write('analytics', data);
    } else if (error) {
      console.warn('[Analytics] RPC failed:', error.message);
      // Fallback: show cached if available
      const cached = adminCache.peek<AnalyticsData>('analytics');
      if (cached) setAnalyticsData(cached);
    }
    markLoaded('analytics');
    setAnalyticsLoading(false);
  }, [analyticsDays]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleForceCloseSession = useCallback(async (sessionCode: string) => {
    const confirmed = window.confirm(`⚠️ إغلاق الجلسة ${sessionCode} إجبارياً؟\n\nسيتم طرد جميع اللاعبين والمقدم.`);
    if (!confirmed) return;

    setClosingSession(sessionCode);
    // 1. Update DB
    await supabase.rpc('admin_force_close_session', { p_session_code: sessionCode });

    // 2. Broadcast to game channel
    const ch = supabase.channel(`game-${sessionCode}`);
    ch.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        ch.send({
          type: 'broadcast', event: 'game-update',
          payload: {
            type: 'ADMIN_FORCE_CLOSE',
            message: 'تم إغلاق الجلسة بواسطة الإدارة. تواصل مع فريق الدعم إن كانت هناك أي إشكالية.',
          },
        }).then(() => {
          setTimeout(() => supabase.removeChannel(ch), 2000);
        });
      }
    });

    // 3. Refresh analytics
    setTimeout(() => { loadAnalytics(); setClosingSession(null); }, 2500);
  }, [loadAnalytics]);

  const handleViewPartnerDetails = useCallback(async (p: PartnerRow) => {
    setPartnerProfileModal({ partner: p, profile: null });
    setProfileLoading(true);
    const { data } = await supabase.from('partner_profiles').select('*').eq('user_id', p.id).maybeSingle();
    setPartnerProfileModal({ partner: p, profile: data as PartnerProfileRow | null });
    setProfileLoading(false);
  }, []);

  // ── Mount: background pre-warm (tab effect handles overview) ────────────
  useEffect(() => {
    // Pre-warm partners silently after 800ms — used by Codes + Orders
    setTimeout(() => { if (!isFresh('partners')) loadPartners(); }, 800);

    // Page Visibility: refresh stale data when user returns to this tab
    const onVisible = () => {
      if (document.hidden) return;
      if (!adminCache.isFresh('overview', 120_000)) loadOverview();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tab effects: skip if data is still fresh ─────────────────────────
  useEffect(() => {
    if (activeTab === 'overview'   && !isFresh('overview'))   loadOverview();
    if (activeTab === 'users'      && !isFresh('users'))      loadUsers();
    if (activeTab === 'questions') { loadCategories(); if (!isFresh('questions')) loadQuestions(); }
    if (activeTab === 'categories' && !isFresh('categories')) loadCatsWithCount();
    if (activeTab === 'partners'   && !isFresh('partners'))   loadPartners();
    if (activeTab === 'codes') {
      if (partnerList.length === 0) loadPartners();
      else if (!isFresh('codes'))   loadCodes();
    }
    if (activeTab === 'orders') {
      if (partnerList.length === 0) loadPartners();
      else if (!isFresh('orders'))  loadOrders();
    }
    if (activeTab === 'analytics' && !isFresh('analytics')) loadAnalytics();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search: fires ONLY after 350ms pause — no per-keystroke queries
  useEffect(() => { if (activeTab === 'questions') { setQPage(0); loadQuestions(); } }, [dQSearch, qCatFilter, qLetterFilter]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (activeTab === 'questions') loadQuestions(); }, [qPage]); // eslint-disable-line react-hooks/exhaustive-deps
  // Search/filter changed → reset to page 0; if already on page 0 load directly
  useEffect(() => {
    if (activeTab !== 'users') return;
    if (userPage !== 0) setUserPage(0); // page-change effect below will call loadUsers
    else loadUsers();
  }, [dUserSearch, userFilter]); // eslint-disable-line react-hooks/exhaustive-deps
  // Page changed (next/prev or reset from filter above)
  useEffect(() => { if (activeTab === 'users') loadUsers(); }, [userPage]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (activeTab === 'codes' && partnerList.length > 0) loadCodes(); }, [partnerList]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load orders when partnerList is ready (for email enrichment)
  useEffect(() => { if (activeTab === 'orders' && partnerList.length > 0) loadOrders(); }, [partnerList]); // eslint-disable-line react-hooks/exhaustive-deps
  // Analytics: reload when time filter changes
  useEffect(() => { if (activeTab === 'analytics') loadAnalytics(analyticsDays); }, [analyticsDays]); // eslint-disable-line react-hooks/exhaustive-deps

  // ═══════════════════════════════════════════════════════════
  // Actions
  // ═══════════════════════════════════════════════════════════
  const handlePromote = async () => {
    if (!promoteEmail.trim()) return;
    setPromoteLoading(true); setPromoteMsg('');
    const { data, error } = await supabase.rpc('promote_to_partner', { target_email: promoteEmail.trim() });
    setPromoteMsg((!error && data?.success) ? `✅ تمت ترقية ${data.email} إلى شريك` : `❌ ${data?.error || error?.message}`);
    if (!error && data?.success) { setPromoteEmail(''); loadPartners(); }
    setPromoteLoading(false);
  };

  // Cryptographically random — no ambiguous chars (0, O, I, 1, l)
  const generateCode = (prefix: string, segLen = 8): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const buf = new Uint8Array(segLen);
    crypto.getRandomValues(buf);
    return `${prefix}-${Array.from(buf, b => chars[b % chars.length]).join('')}`;
  };

  const handleGenerateCodes = async () => {
    if (!codeForm.partner_id)                              { setGenMsg('❌ اختر شريكاً أولاً'); return; }
    if (!codeForm.prefix.trim())                           { setGenMsg('❌ أدخل البادئة'); return; }
    if (codeForm.quantity < 1 || codeForm.quantity > 500) { setGenMsg('❌ الكمية بين 1 و 500'); return; }

    setGenerating(true); setGeneratedCodes([]);
    const needed  = codeForm.quantity;
    const prefix  = codeForm.prefix.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const batchId = `batch_${Date.now()}`;

    // ── Step 1: generate candidates (20% extra buffer for collisions) ──
    setGenMsg('🔄 جارٍ توليد الأكواد...');
    let candidates = Array.from({ length: needed + Math.ceil(needed * 0.2) + 10 }, () => generateCode(prefix));
    candidates = [...new Set(candidates)]; // local dedup

    // ── Step 2: collision check against DB ────────────────────
    setGenMsg('🔍 جارٍ التحقق من التفرد في قاعدة البيانات...');
    const { data: existing } = await supabase
      .from('activation_codes').select('code')
      .in('code', candidates.slice(0, 600)); // Supabase IN limit safety
    const existingSet = new Set((existing ?? []).map(c => c.code));
    let unique = candidates.filter(c => !existingSet.has(c));

    // ── Step 3: fill if still short (rare edge case) ──────────
    let retries = 0;
    while (unique.length < needed && retries < 5) {
      retries++;
      const extra = Array.from({ length: 20 }, () => generateCode(prefix));
      const { data: extraEx } = await supabase.from('activation_codes').select('code').in('code', extra);
      const extraSet = new Set((extraEx ?? []).map(c => c.code));
      unique.push(...extra.filter(c => !extraSet.has(c) && !unique.includes(c)));
    }
    const finalCodes = unique.slice(0, needed);

    // ── Step 4: upsert — ignoreDuplicates as final safety net ─
    setGenMsg('💾 جارٍ الحفظ...');
    const { error } = await supabase.from('activation_codes').upsert(
      finalCodes.map(code => ({ code, plan_type: codeForm.plan_type, owner_partner_id: codeForm.partner_id, batch_id: batchId })),
      { onConflict: 'code', ignoreDuplicates: true }
    );

    if (error) {
      setGenMsg(`❌ خطأ في الحفظ: ${error.message}`);
    } else {
      setGeneratedCodes(finalCodes);
      setGenMsg(`✅ تم إنشاء ${finalCodes.length} كود بنجاح — نسبة التفرد 100%`);
      tabLoadedAt.current['codes'] = 0; // invalidate cache
      loadCodes();
    }
    setGenerating(false);
  };

  const handleSaveQuestion = async () => {
    if (!qForm.question_text.trim() || !qForm.correct_answer.trim() || !qForm.category_id) return;
    setQSaving(true);
    if (editingQ) {
      await supabase.from('questions').update(qForm).eq('id', editingQ.id);
    } else {
      const { data: maxRow } = await supabase.from('questions').select('id').order('id', { ascending: false }).limit(1);
      const nextId = (Number((maxRow as { id?: number }[] | null)?.[0]?.id) || 0) + 1;
      await supabase.from('questions').insert({ ...qForm, id: nextId });
    }
    setQSaving(false); setShowAddQ(false); setEditingQ(null);
    setQForm({ question_text: '', correct_answer: '', letter_assigned: 'ا', category_id: categories[0]?.id ?? '' });
    loadQuestions();
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    await supabase.from('questions').delete().eq('id', id); loadQuestions();
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setCatSaving(true);
    const { error } = await supabase.from('categories').insert({ name_ar: newCatName.trim() });
    if (!error) {
      setNewCatName(''); setShowAddCat(false);
      loadCatsWithCount(); loadCategories(); // refresh both
    }
    setCatSaving(false);
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`حذف تصنيف "${name}" سيؤثر على الأسئلة المرتبطة به.\nهل أنت متأكد؟`)) return;
    await supabase.from('categories').delete().eq('id', id);
    loadCatsWithCount(); loadCategories();
  };

  // بناء حقول التحديث الصحيحة بناءً على نوع الباقة
  const buildPlanUpdate = (plan: string) => {
    const expires = plan === '3_days'
      ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      : null;
    return {
      plan_type:           plan,
      subscription_status: plan === 'free' ? null : 'active',
      expires_at:          expires,
    };
  };

  const handleUpdateUserPlan = async (userId: string, newPlan: string) => {
    setSavingPlanId(userId);
    await supabase.from('buyers').update(buildPlanUpdate(newPlan)).eq('id', userId);
    setSavingPlanId(null);
    loadUsers();
  };

  const handleBulkPlanUpdate = async () => {
    if (!bulkPlan || selectedUsers.size === 0) return;
    setBulkLoading(true); setBulkMsg('');
    const ids = [...selectedUsers];
    const { error } = await supabase.from('buyers').update(buildPlanUpdate(bulkPlan)).in('id', ids);
    setBulkLoading(false);
    if (error) {
      setBulkMsg(`❌ ${error.message}`);
    } else {
      setBulkMsg(`✅ تم تحديث ${ids.length} مستخدم بنجاح`);
      setSelectedUsers(new Set()); setBulkPlan('');
      adminCache.bust('overview'); // invalidate overview stats
      loadUsers();
      setTimeout(() => setBulkMsg(''), 4000);
    }
  };

  // ── Import ────────────────────────────────────────────────
  const handleImportFile = (file: File) => {
    setImportError(''); setImportSuccess('');
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const text = e.target?.result as string;
        let parsed: ImportQuestion[] = [];
        if (file.name.endsWith('.json')) {
          const raw = JSON.parse(text);
          parsed = Array.isArray(raw) ? raw : (raw.questions ?? raw.data ?? []);
        } else if (file.name.endsWith('.csv')) {
          const lines = text.split('\n').filter(Boolean);
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
          parsed = lines.slice(1).map(line => {
            const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
            return Object.fromEntries(headers.map((h, i) => [h, vals[i]])) as unknown as ImportQuestion;
          });
        }
        const valid = parsed.filter(q => q.question_text && q.correct_answer && q.letter_assigned);
        if (valid.length === 0) { setImportError('لم يُعثر على أسئلة صالحة في الملف'); return; }
        setImportData(valid); setImportStep(2);
      } catch { setImportError('تعذّر قراءة الملف — تحقق من الصيغة'); }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    setImporting(true); setImportError('');
    // questions.id is INTEGER with no sequence default — generate ids client-side
    const { data: maxRow } = await supabase.from('questions').select('id').order('id', { ascending: false }).limit(1);
    const startId = (Number((maxRow as { id?: number }[] | null)?.[0]?.id) || 0) + 1;
    const rows = importData.map((q, i) => ({ id: startId + i, question_text: q.question_text, correct_answer: q.correct_answer, letter_assigned: q.letter_assigned, category_id: q.category_id ? String(q.category_id) : (categories[0]?.id ?? '') }));
    const { error } = await supabase.from('questions').insert(rows);
    if (error) { setImportError(`خطأ: ${error.message}`); } else {
      setImportSuccess(`✅ تم استيراد ${rows.length} سؤال بنجاح`);
      loadQuestions(); setTimeout(() => { setShowImport(false); setImportStep(1); setImportData([]); setImportSuccess(''); }, 2500);
    }
    setImporting(false);
  };

  const exportCodesToCSV = (partnerId?: string) => {
    const filtered = partnerId ? codes.filter(c => c.owner_partner_id === partnerId) : codes;
    const csv = ['code,plan_type,is_used,partner,batch,created_at', ...filtered.map(c => `${c.code},${c.plan_type},${c.is_used},${c.partner_email},${c.batch_id},${c.created_at}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `codes_${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url);
  };


  // ═══════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════
  const maxCat = Math.max(...categoryDist.map(c => c.count), 1);

  // Helper: navigate on mobile closes sidebar
  const navigate = (tab: AdminTab) => { setActiveTab(tab); if (isMobile) setSidebarOpen(false); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.page, color: C.txtPrimary, fontFamily: 'Tajawal, sans-serif', direction: 'rtl' }}>

      {/* ── Delete success toast ─────────────────────────────── */}
      {deleteToast && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
          background: C.green, color: '#fff', padding: '0.6rem 1.5rem',
          borderRadius: '99px', fontFamily: 'Tajawal,sans-serif', fontWeight: 600,
          fontSize: '0.9rem', zIndex: 99999, boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          whiteSpace: 'nowrap',
        }}>{deleteToast}</div>
      )}

      {/* ── Mobile overlay backdrop ───────────────────────────── */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <div style={{
        width: '200px', flexShrink: 0, background: C.sidebar,
        borderLeft: `1px solid ${C.border}`, padding: '1.25rem 0.75rem',
        display: 'flex', flexDirection: 'column', gap: '0.2rem',
        // Mobile: fixed drawer that slides in from the right
        ...(isMobile ? {
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 50,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s ease',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.5)',
        } : {}),
      }}>
        {/* Logo */}
        <div style={{ padding: '0.25rem 0.5rem 1.25rem', borderBottom: `1px solid ${C.border}`, marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '0.45rem', background: 'linear-gradient(135deg,#4c1d95,#2e1065)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>⚔️</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: C.txtPrimary }}>حرب الحروف</div>
              <div style={{ fontSize: '0.62rem', color: C.txtMuted }}>لوحة الإدارة</div>
            </div>
          </div>
        </div>

        <SideItem icon="📊" label="لوحة التحكم" active={activeTab === 'overview'} onClick={() => navigate('overview')} />
        <SideItem icon="👥" label="المستخدمون" active={activeTab === 'users'} onClick={() => navigate('users')} />
        <SideItem icon="❓" label="الأسئلة" active={activeTab === 'questions'} onClick={() => navigate('questions')} />
        <SideItem icon="📁" label="التصنيفات" active={activeTab === 'categories'} onClick={() => navigate('categories')} />
        <SideItem icon="🤝" label="الشركاء" active={activeTab === 'partners'} onClick={() => navigate('partners')} />
        <SideItem icon="🎟️" label="الأكواد" active={activeTab === 'codes'} onClick={() => navigate('codes')} />
        <SideItem icon="📦" label="الطلبات" active={activeTab === 'orders'} onClick={() => navigate('orders')} badge={partnerOrders.filter(o => o.status === 'pending').length || undefined} />
        <SideItem icon="📈" label="التحليلات" active={activeTab === 'analytics'} onClick={() => navigate('analytics')} />

        <div style={{ flex: 1 }} />
        <button onClick={onBack} style={{ ...btnGhost, width: '100%', marginTop: '0.75rem', color: C.redLt, borderColor: 'rgba(185,28,28,0.25)', fontSize: '0.82rem' }}>← خروج</button>
        <div style={{ fontSize: '0.65rem', color: C.txtMuted, textAlign: 'center', marginTop: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
      </div>

      {/* ── Main ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: isMobile ? '0.75rem' : '1.75rem 2rem', overflowY: 'auto', maxHeight: '100vh', overflowX: 'hidden' }}>

        {/* Mobile top bar with hamburger */}
        {isMobile && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: `1px solid ${C.border}`,
          }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: C.txtPrimary }}>لوحة الإدارة</div>
            <button
              onClick={() => setSidebarOpen(v => !v)}
              style={{
                background: 'rgba(255,255,255,0.07)', border: `1px solid ${C.border}`,
                borderRadius: '0.5rem', color: C.txtPrimary, fontSize: '1.25rem',
                padding: '0.35rem 0.6rem', cursor: 'pointer', lineHeight: 1,
              }}
              aria-label="القائمة"
            >☰</button>
          </div>
        )}

        {/* ══════ OVERVIEW ══════ */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.2rem' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: C.txtPrimary, margin: 0 }}>لوحة التحكم</h1>
              {/* Subtle refresh indicator — only when refreshing cached data */}
              {overviewLoading && stats.totalQ > 0 && (
                <span style={{ fontSize: '0.7rem', color: C.txtMuted, padding: '0.2rem 0.55rem', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', border: `1px solid ${C.border}` }}>
                  ↻ تحديث...
                </span>
              )}
            </div>
            <p style={{ color: C.txtSecondary, fontSize: '0.85rem', margin: '0 0 1.5rem' }}>نظرة عامة على المنصة والمشتركين</p>

            {/* Show skeletons only on TRUE first load (no snapshot data yet) */}
            {overviewLoading && stats.totalQ === 0 ? (
              <>
                <div style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                  <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
                </div>
                <div style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                  <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 2, minWidth: '280px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '0.875rem', padding: '1.5rem' }}>
                    <Skeleton w="35%" h="0.85rem" mb="1.25rem" />
                    {[80,60,90,45,70].map((w,i) => <div key={i} style={{ marginBottom: '0.75rem' }}><Skeleton w={`${w}%`} h="1.5rem" /></div>)}
                  </div>
                  <div style={{ flex: 1, minWidth: '220px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '0.875rem', padding: '1.5rem' }}>
                    <Skeleton w="45%" h="0.85rem" mb="1rem" />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {Array.from({length:14}).map((_,i) => <Skeleton key={i} w="2.2rem" h="2.2rem" br="0.4rem" />)}
                    </div>
                  </div>
                </div>
              </>
            ) : (<>
              <div style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                <StatCard icon="❓" label="إجمالي الأسئلة"       value={stats.totalQ}        sub={`${stats.totalCats} تصنيف`}  color={C.purpleLt} />
                <StatCard icon="♾️" label="المشتركون الذهبيون"  value={stats.lifetimeU}      color={C.goldLt}   />
                <StatCard icon="⏰" label="المشتركون المؤقتون"  value={stats.tempU}          color={C.purpleLt} />
                <StatCard icon="👥" label="إجمالي المستخدمين"   value={stats.totalUsers}     sub={`${stats.freeU} مجاني`}      color={C.txtSecondary} />
              </div>
              <div style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
                <StatCard icon="🤝" label="الشركاء"             value={stats.totalPartners}  color={C.greenLt}  />
                <StatCard icon="🎟️" label="إجمالي الأكواد"     value={stats.totalCodes}     sub={`${stats.usedCodes} مستخدم`} color={C.blueLt}   />
                <StatCard icon="📈" label="نسبة استخدام الأكواد" value={stats.totalCodes ? `${Math.round((stats.usedCodes/stats.totalCodes)*100)}%` : '—'} color={C.txtSecondary} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.25rem' }}>
                {/* Bar chart */}
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '0.875rem', padding: '1.25rem' }}>
                  <div style={{ fontWeight: 600, color: C.txtPrimary, marginBottom: '0.2rem', fontSize: '0.95rem' }}>الأسئلة حسب التصنيف</div>
                  <div style={{ fontSize: '0.75rem', color: C.txtSecondary, marginBottom: '1.1rem' }}>التوزيع عبر التصنيفات</div>
                  {categoryDist.map(c => (
                    <div key={c.name} style={{ marginBottom: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: C.txtSecondary, marginBottom: '0.25rem' }}>
                        <span style={{ color: C.txtPrimary }}>{c.count}</span><span>{c.name}</span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px' }}>
                        <div style={{ height: '100%', width: `${(c.count/maxCat)*100}%`, background: c.color, borderRadius: '99px', transition: 'width 0.6s ease', opacity: 0.85 }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Letter grid */}
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '0.875rem', padding: '1.25rem' }}>
                  <div style={{ fontWeight: 600, color: C.txtPrimary, marginBottom: '0.2rem', fontSize: '0.95rem' }}>توزيع الحروف</div>
                  <div style={{ fontSize: '0.75rem', color: C.txtSecondary, marginBottom: '1rem' }}>الأسئلة لكل حرف عربي</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.35rem' }}>
                    {ARABIC_LETTERS.split('').map(letter => {
                      const cnt = letterDist[letter] ?? 0;
                      const bg = cnt >= 10 ? 'rgba(5,150,105,0.18)' : cnt >= 5 ? 'rgba(180,83,9,0.18)' : 'rgba(185,28,28,0.12)';
                      const col = cnt >= 10 ? '#34d399' : cnt >= 5 ? '#fbbf24' : '#f87171';
                      const isSelected = selectedLetter === letter;
                      return (
                        <div
                          key={letter}
                          title={`${letter}: ${cnt} سؤال — انقر للتفاصيل`}
                          onClick={() => {
                            if (isSelected) { setSelectedLetter(null); return; }
                            setSelectedLetter(letter);
                            loadLetterBreakdown(letter);
                          }}
                          style={{
                            background: isSelected ? `${col}35` : bg,
                            border: `1px solid ${isSelected ? col : col + '25'}`,
                            borderRadius: '0.4rem', padding: '0.35rem 0', textAlign: 'center',
                            cursor: 'pointer', transition: 'all 0.15s',
                            boxShadow: isSelected ? `0 0 0 2px ${col}60` : 'none',
                          }}
                        >
                          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: col }}>{letter}</div>
                          <div style={{ fontSize: '0.58rem', color: C.txtMuted }}>{cnt}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: '0.875rem', marginTop: '0.75rem', justifyContent: 'center', fontSize: '0.68rem', color: C.txtSecondary }}>
                    <span><span style={{ color: '#34d399' }}>●</span> جيد (10+)</span>
                    <span><span style={{ color: '#fbbf24' }}>●</span> متوسط (5-9)</span>
                    <span><span style={{ color: '#f87171' }}>●</span> أقل من 5</span>
                  </div>
                </div>
              </div>

              {/* ── Letter breakdown panel ── */}
              {selectedLetter && (
                <div style={{
                  marginTop: '1.25rem',
                  background: C.card, border: `1px solid ${C.borderPurple}`,
                  borderRadius: '0.875rem', padding: '1.25rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '1.6rem', fontWeight: 900, color: C.purpleLt }}>{selectedLetter}</span>
                        <div>
                          <div style={{ fontWeight: 700, color: C.txtPrimary, fontSize: '0.95rem' }}>
                            توزيع التصنيفات — حرف {selectedLetter}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: C.txtSecondary }}>
                            {letterDist[selectedLetter] ?? 0} سؤال إجمالي
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedLetter(null)}
                      style={{
                        background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`,
                        borderRadius: '0.4rem', color: C.txtMuted, fontSize: '0.85rem',
                        padding: '0.3rem 0.65rem', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
                      }}
                    >✕ إغلاق</button>
                  </div>

                  {letterBreakdownLoading ? (
                    <div style={{ textAlign: 'center', color: C.txtMuted, padding: '1.5rem', fontSize: '0.85rem' }}>
                      ⏳ جارٍ التحميل...
                    </div>
                  ) : letterCatBreakdown.length === 0 ? (
                    <div style={{ textAlign: 'center', color: C.txtMuted, padding: '1.5rem', fontSize: '0.85rem' }}>
                      لا توجد أسئلة لهذا الحرف
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '0.6rem 1.5rem' }}>
                      {letterCatBreakdown.map(c => {
                        const maxBrk = Math.max(...letterCatBreakdown.map(x => x.count), 1);
                        return (
                          <div key={c.name} style={{ marginBottom: '0.4rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                              <span style={{ color: C.txtPrimary, fontWeight: 600 }}>{c.name}</span>
                              <span style={{ color: c.color, fontWeight: 700 }}>{c.count}</span>
                            </div>
                            <div style={{ height: '7px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px' }}>
                              <div style={{ height: '100%', width: `${(c.count / maxBrk) * 100}%`, background: c.color, borderRadius: '99px', transition: 'width 0.5s ease' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>)}
          </div>
        )}

        {/* ══════ USERS ══════ */}
        {activeTab === 'users' && (
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: C.txtPrimary, margin: '0 0 0.2rem' }}>المستخدمون</h1>
            <p style={{ color: C.txtSecondary, fontSize: '0.85rem', margin: '0 0 1.5rem' }}>إدارة المشتركين وخطط الاشتراك</p>

            <div style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <StatCard icon="👥" label="إجمالي النتائج" value={userTotal} sub={userTotal > 0 ? `صفحة ${userPage + 1} من ${Math.ceil(userTotal / U_PER_PAGE)}` : undefined} color={C.purpleLt} />
              <StatCard icon="📄" label="في هذه الصفحة"  value={users.length} sub={`${U_PER_PAGE} مستخدم بالصفحة`} color={C.txtSecondary} />
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input style={{ ...inputSt, maxWidth: '280px' }} placeholder="🔍 ابحث بالبريد الإلكتروني..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
              <select style={selectSt} value={userFilter} onChange={e => setUserFilter(e.target.value as typeof userFilter)}>
                <option value="all">جميع الباقات</option>
                <option value="lifetime">♾️ الذهبية (لامحدودة)</option>
                <option value="3_days">⏰ 3 أيام</option>
                <option value="free">🔓 مجاني</option>
              </select>
              <button style={{ ...btnGhost, marginRight: 'auto', fontSize: '0.8rem' }} onClick={() => { setUserPage(0); loadUsers(); }}>↻ تحديث</button>
            </div>

            {/* ── Floating Bulk Action Bar ── */}
            {selectedUsers.size > 0 && (
              <div style={{
                position: 'sticky', bottom: '1.25rem', zIndex: 50,
                background: 'linear-gradient(135deg, #1e1250, #2d1a6e)',
                border: `1px solid rgba(109,40,217,0.6)`,
                borderRadius: '1rem', padding: '0.875rem 1.25rem',
                display: 'flex', alignItems: 'center', gap: '0.875rem', flexWrap: 'wrap',
                boxShadow: '0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(109,40,217,0.25)',
                marginBottom: '0.75rem',
              }}>
                {/* Count badge */}
                <div style={{
                  background: C.purple, color: '#fff',
                  borderRadius: '0.5rem', padding: '0.3rem 0.75rem',
                  fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.01em',
                  display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0,
                }}>
                  <span>✓</span>
                  <span>{selectedUsers.size} مستخدم محدد</span>
                </div>

                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1rem' }}>|</span>

                {/* Plan selector */}
                <select
                  style={{ ...selectSt, minWidth: '160px', background: 'rgba(255,255,255,0.08)', border: `1px solid rgba(109,40,217,0.5)` }}
                  value={bulkPlan}
                  onChange={e => setBulkPlan(e.target.value)}
                >
                  <option value="">اختر الباقة الجديدة...</option>
                  <option value="3_days">⏰ 3 أيام</option>
                  <option value="lifetime">♾️ ذهبية (لامحدودة)</option>
                  <option value="free">🔓 مجاني</option>
                </select>

                {/* Apply button */}
                <button
                  style={{
                    ...btnPrimary, minWidth: '110px',
                    opacity: (!bulkPlan || bulkLoading) ? 0.5 : 1,
                    cursor: (!bulkPlan || bulkLoading) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                  }}
                  disabled={!bulkPlan || bulkLoading}
                  onClick={handleBulkPlanUpdate}
                >
                  {bulkLoading ? '⏳ جارٍ...' : '⚡ تطبيق على الكل'}
                </button>

                {/* Cancel */}
                <button
                  style={{ ...btnGhost, fontSize: '0.85rem' }}
                  onClick={() => { setSelectedUsers(new Set()); setBulkPlan(''); setBulkMsg(''); }}
                >
                  إلغاء التحديد
                </button>

                {/* Success/error message */}
                {bulkMsg && (
                  <span style={{
                    marginRight: 'auto', fontSize: '0.85rem', fontWeight: 600,
                    color: bulkMsg.startsWith('✅') ? C.greenLt : C.redLt,
                  }}>
                    {bulkMsg}
                  </span>
                )}
              </div>
            )}

            {/* Table */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '0.875rem', overflow: 'hidden' }}>
              {usersLoading ? (
                <div style={{ padding: '1.5rem' }}>
                  {[...Array(8)].map((_, i) => (
                    <div key={i} style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                      <Skeleton w="18px" h="18px" br="4px" />
                      <Skeleton w="42%" h="0.85rem" />
                      <Skeleton w="12%" h="1.5rem" br="0.4rem" />
                      <Skeleton w="10%" h="1.5rem" br="0.4rem" />
                      <Skeleton w="8%"  h="0.75rem" />
                      <Skeleton w="10%" h="0.75rem" />
                      <Skeleton w="14%" h="2rem" br="0.4rem" />
                    </div>
                  ))}
                </div>
              ) : users.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: C.txtMuted, fontSize: '0.9rem' }}>
                  {dUserSearch ? `لا توجد نتائج للبحث عن "${dUserSearch}"` : 'لا يوجد مستخدمون'}
                </div>
              ) : (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? '520px' : undefined }}>
                  <thead style={{ background: C.cardAlt }}>
                    <tr>
                      <th style={{ ...tableTh, width: '32px' }}>
                        <input type="checkbox"
                          checked={users.length > 0 && selectedUsers.size === users.length}
                          onChange={e => setSelectedUsers(e.target.checked ? new Set(users.map(u => u.id)) : new Set())}
                        />
                      </th>
                      <th style={tableTh}>البريد الإلكتروني</th>
                      <th style={tableTh}>الباقة</th>
                      {!isMobile && <th style={tableTh}>الدور</th>}
                      {!isMobile && <th style={tableTh}>الحالة</th>}
                      {!isMobile && <th style={tableTh}>الانضمام</th>}
                      <th style={tableTh}>تعديل</th>
                      <th style={tableTh}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => {
                      const pl = planLabel(u.plan_type ?? null);
                      const roleColor = u.role === 'admin' ? C.redLt : u.role === 'partner' ? C.greenLt : C.grayLt;
                      const roleLabel = u.role === 'admin' ? 'مدير' : u.role === 'partner' ? 'شريك' : 'مستخدم';
                      return (
                        <tr key={u.id} style={{ background: selectedUsers.has(u.id) ? 'rgba(109,40,217,0.06)' : undefined }}
                          onMouseEnter={e => { if (!selectedUsers.has(u.id)) (e.currentTarget as HTMLElement).style.background = C.cardAlt; }}
                          onMouseLeave={e => { if (!selectedUsers.has(u.id)) (e.currentTarget as HTMLElement).style.background = ''; }}>
                          <td style={tableTd}><input type="checkbox" checked={selectedUsers.has(u.id)} onChange={e => { const s = new Set(selectedUsers); e.target.checked ? s.add(u.id) : s.delete(u.id); setSelectedUsers(s); }} /></td>
                          <td style={{ ...tableTd, direction: 'ltr', fontFamily: 'monospace', fontSize: '0.83rem', color: C.txtPrimary, letterSpacing: '0.01em', maxWidth: isMobile ? '120px' : undefined, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</td>
                          <td style={tableTd}><Badge label={pl.label} color={pl.color} /></td>
                          {!isMobile && <td style={tableTd}><Badge label={roleLabel} color={roleColor} /></td>}
                          {!isMobile && <td style={tableTd}><span style={{ fontSize: '0.72rem', color: u.subscription_status === 'active' ? C.greenLt : C.txtMuted }}>{u.subscription_status === 'active' ? '● نشط' : '○ —'}</span></td>}
                          {!isMobile && <td style={{ ...tableTd, direction: 'ltr', fontSize: '0.75rem', color: C.txtMuted }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('ar') : '—'}</td>}
                          <td style={tableTd}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <select
                                style={{
                                  ...selectSt, fontSize: '0.78rem', padding: '0.3rem 0.6rem', background: '#1e1e40',
                                  border: `1px solid ${pendingPlanChanges[u.id] ? 'rgba(251,191,36,0.7)' : 'rgba(255,255,255,0.2)'}`,
                                  color: C.txtPrimary,
                                  transition: 'border-color 0.2s',
                                }}
                                value={pendingPlanChanges[u.id] ?? (u.plan_type ?? 'free')}
                                onChange={e => {
                                  const newPlan = e.target.value;
                                  if (newPlan === (u.plan_type ?? 'free')) {
                                    setPendingPlanChanges(prev => { const n = { ...prev }; delete n[u.id]; return n; });
                                  } else {
                                    setPendingPlanChanges(prev => ({ ...prev, [u.id]: newPlan }));
                                  }
                                }}
                              >
                                <option value="free"     style={{ background: '#1e1e40', color: '#e8ecf7' }}>🔓 مجاني</option>
                                <option value="3_days"   style={{ background: '#1e1e40', color: '#7ab8f7' }}>⏰ 3 أيام</option>
                                <option value="lifetime" style={{ background: '#1e1e40', color: '#fbbf24' }}>♾️ ذهبية (لامحدودة)</option>
                              </select>
                              {pendingPlanChanges[u.id] && (
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                  <button
                                    title="تأكيد التغيير"
                                    disabled={savingPlanId === u.id}
                                    onClick={async () => {
                                      const plan = pendingPlanChanges[u.id];
                                      setPendingPlanChanges(prev => { const n = { ...prev }; delete n[u.id]; return n; });
                                      await handleUpdateUserPlan(u.id, plan);
                                    }}
                                    style={{
                                      flex: 1, padding: '0.2rem 0',
                                      background: 'rgba(16,185,129,0.15)',
                                      border: '1px solid rgba(16,185,129,0.45)',
                                      borderRadius: '0.4rem', cursor: savingPlanId === u.id ? 'wait' : 'pointer',
                                      color: '#10b981', fontSize: '0.9rem', fontWeight: 800,
                                    }}
                                  >
                                    {savingPlanId === u.id ? '…' : '✓'}
                                  </button>
                                  <button
                                    title="إلغاء"
                                    onClick={() => setPendingPlanChanges(prev => { const n = { ...prev }; delete n[u.id]; return n; })}
                                    style={{
                                      padding: '0.2rem 0.45rem',
                                      background: 'rgba(239,68,68,0.1)',
                                      border: '1px solid rgba(239,68,68,0.35)',
                                      borderRadius: '0.4rem', cursor: 'pointer',
                                      color: '#ef4444', fontSize: '0.9rem', fontWeight: 800,
                                    }}
                                  >
                                    ✗
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={tableTd}>
                            <button
                              disabled={deletingUserId === u.id}
                              onClick={() => handleDeleteUser(u)}
                              title="حذف الحساب نهائياً"
                              style={{
                                background: 'rgba(185,28,28,0.12)', border: '1px solid rgba(185,28,28,0.3)',
                                borderRadius: '0.4rem', color: C.redLt, fontSize: '0.82rem',
                                padding: '0.3rem 0.55rem', cursor: 'pointer',
                                opacity: deletingUserId === u.id ? 0.5 : 1,
                              }}
                            >{deletingUserId === u.id ? '...' : '🗑️'}</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              )}
            </div>

            {/* ── Pagination Controls ── */}
            {userTotal > U_PER_PAGE && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginTop: '0.875rem', flexWrap: 'wrap', gap: '0.625rem',
              }}>
                {/* Page info */}
                <span style={{ fontSize: '0.82rem', color: C.txtMuted }}>
                  عرض {userPage * U_PER_PAGE + 1}–{Math.min((userPage + 1) * U_PER_PAGE, userTotal)} من أصل {userTotal} مستخدم
                </span>

                {/* Page numbers + prev/next */}
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <button
                    style={{ ...btnGhost, padding: '0.45rem 0.875rem', fontSize: '0.82rem', opacity: userPage === 0 ? 0.35 : 1, cursor: userPage === 0 ? 'not-allowed' : 'pointer' }}
                    disabled={userPage === 0}
                    onClick={() => setUserPage(p => p - 1)}
                  >
                    → السابق
                  </button>

                  {/* Page number buttons — show up to 5 around current */}
                  {(() => {
                    const totalPages = Math.ceil(userTotal / U_PER_PAGE);
                    const pages: number[] = [];
                    const start = Math.max(0, Math.min(userPage - 2, totalPages - 5));
                    const end   = Math.min(totalPages - 1, start + 4);
                    for (let i = start; i <= end; i++) pages.push(i);
                    return pages.map(p => (
                      <button
                        key={p}
                        onClick={() => setUserPage(p)}
                        style={{
                          width: '34px', height: '34px', borderRadius: '0.5rem', border: 'none',
                          cursor: 'pointer', fontSize: '0.82rem', fontWeight: p === userPage ? 700 : 500,
                          fontFamily: 'Tajawal, sans-serif',
                          background: p === userPage ? C.purple : 'rgba(255,255,255,0.05)',
                          color: p === userPage ? '#fff' : C.txtSecondary,
                          transition: 'all 0.15s',
                        }}
                      >
                        {p + 1}
                      </button>
                    ));
                  })()}

                  <button
                    style={{ ...btnGhost, padding: '0.45rem 0.875rem', fontSize: '0.82rem', opacity: (userPage + 1) * U_PER_PAGE >= userTotal ? 0.35 : 1, cursor: (userPage + 1) * U_PER_PAGE >= userTotal ? 'not-allowed' : 'pointer' }}
                    disabled={(userPage + 1) * U_PER_PAGE >= userTotal}
                    onClick={() => setUserPage(p => p + 1)}
                  >
                    التالي ←
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════ QUESTIONS ══════ */}
        {activeTab === 'questions' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: C.txtPrimary, margin: 0, marginBottom: '0.2rem' }}>الأسئلة</h1>
                <p style={{ color: C.txtSecondary, fontSize: '0.85rem', margin: 0 }}>بنك أسئلة المسابقات — {qTotal} سؤال إجمالاً</p>
              </div>
              <div style={{ display: 'flex', gap: '0.625rem' }}>
                <button style={{ ...btnGhost, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: `rgba(29,78,216,0.35)`, color: C.blueLt }}
                  onClick={() => { setShowImport(true); setImportStep(1); setImportData([]); setImportError(''); setImportSuccess(''); }}>
                  📥 استيراد الأسئلة
                </button>
                <button style={{ ...btnPrimary, fontSize: '0.85rem' }}
                  onClick={() => { setShowAddQ(true); setEditingQ(null); setQForm({ question_text: '', correct_answer: '', letter_assigned: 'ا', category_id: categories[0]?.id ?? '' }); }}>
                  + إضافة سؤال
                </button>
              </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <input style={{ ...inputSt, maxWidth: '260px' }} placeholder="🔍 ابحث في الأسئلة..." value={qSearch} onChange={e => { setQSearch(e.target.value); }} />
              <select style={selectSt} value={qCatFilter} onChange={e => setQCatFilter(e.target.value)}>
                <option value="all">جميع التصنيفات</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
              </select>
              <select style={selectSt} value={qLetterFilter} onChange={e => setQLetterFilter(e.target.value)}>
                <option value="all">جميع الحروف</option>
                {ARABIC_LETTERS.split('').map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            {/* Add/Edit form */}
            {(showAddQ || editingQ) && (
              <div style={{ background: C.cardAlt, border: `1px solid ${C.borderPurple}`, borderRadius: '0.875rem', padding: '1.25rem', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 600, color: C.purpleLt, marginBottom: '0.875rem', fontSize: '0.9rem' }}>{editingQ ? '✏️ تعديل السؤال' : '+ إضافة سؤال جديد'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '0.625rem' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: C.txtMuted, marginBottom: '0.3rem' }}>التصنيف</div>
                    <select style={{ ...selectSt, width: '100%' }} value={qForm.category_id} onChange={e => setQForm(f => ({ ...f, category_id: e.target.value }))}>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: C.txtMuted, marginBottom: '0.3rem' }}>الحرف</div>
                    <select style={{ ...selectSt, width: '100%' }} value={qForm.letter_assigned} onChange={e => setQForm(f => ({ ...f, letter_assigned: e.target.value }))}>
                      {ARABIC_LETTERS.split('').map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: '0.625rem' }}>
                  <div style={{ fontSize: '0.72rem', color: C.txtMuted, marginBottom: '0.3rem' }}>نص السؤال</div>
                  <textarea style={{ ...inputSt, height: '72px', resize: 'vertical' } as React.CSSProperties} value={qForm.question_text} onChange={e => setQForm(f => ({ ...f, question_text: e.target.value }))} placeholder="أدخل نص السؤال..." />
                </div>
                <div style={{ marginBottom: '0.875rem' }}>
                  <div style={{ fontSize: '0.72rem', color: C.txtMuted, marginBottom: '0.3rem' }}>الإجابة الصحيحة</div>
                  <input style={inputSt} value={qForm.correct_answer} onChange={e => setQForm(f => ({ ...f, correct_answer: e.target.value }))} placeholder="الإجابة..." />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button style={btnPrimary} onClick={handleSaveQuestion} disabled={qSaving}>{qSaving ? 'جارٍ الحفظ...' : editingQ ? 'حفظ التعديلات' : 'إضافة'}</button>
                  <button style={btnGhost} onClick={() => { setShowAddQ(false); setEditingQ(null); }}>إلغاء</button>
                </div>
              </div>
            )}

            {/* Table */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '0.875rem', overflow: 'hidden' }}>
              {qLoading ? <div style={{ textAlign: 'center', padding: '2.5rem', color: C.txtMuted }}>جارٍ التحميل...</div> : (<>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? '500px' : undefined }}>
                  <thead style={{ background: C.cardAlt }}>
                    <tr>
                      <th style={tableTh}>نص السؤال</th>
                      <th style={tableTh}>الإجابة</th>
                      <th style={tableTh}>الحرف</th>
                      <th style={tableTh}>التصنيف</th>
                      <th style={tableTh}>إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map(q => (
                      <tr key={q.id}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.cardAlt}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                        <td style={{ ...tableTd, maxWidth: '360px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.question_text}</td>
                        <td style={{ ...tableTd, color: C.greenLt, fontWeight: 600 }}>{q.correct_answer}</td>
                        <td style={tableTd}>
                          <div style={{ width: '26px', height: '26px', borderRadius: '0.35rem', background: 'rgba(109,40,217,0.15)', border: `1px solid rgba(109,40,217,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: C.purpleLt, fontSize: '0.9rem' }}>{q.letter_assigned}</div>
                        </td>
                        <td style={tableTd}><Badge label={categories.find(c => c.id === q.category_id)?.name_ar ?? '—'} color={C.purpleLt} /></td>
                        <td style={tableTd}>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button style={{ ...btnGhost, padding: '0.3rem 0.6rem', fontSize: '0.78rem' }} onClick={() => { setEditingQ(q); setQForm({ question_text: q.question_text, correct_answer: q.correct_answer, letter_assigned: q.letter_assigned, category_id: q.category_id }); setShowAddQ(false); }}>✏️</button>
                            <button style={{ ...btnGhost, padding: '0.3rem 0.6rem', fontSize: '0.78rem', color: C.redLt, borderColor: 'rgba(185,28,28,0.25)' }} onClick={() => handleDeleteQuestion(q.id)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                {/* Pagination */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1rem', borderTop: `1px solid ${C.borderSub}` }}>
                  <button style={{ ...btnGhost, fontSize: '0.8rem', opacity: qPage === 0 ? 0.4 : 1 }} disabled={qPage === 0} onClick={() => setQPage(p => p - 1)}>← السابق</button>
                  <span style={{ fontSize: '0.8rem', color: C.txtSecondary }}>صفحة {qPage + 1} • {qTotal} سؤال</span>
                  <button style={{ ...btnGhost, fontSize: '0.8rem', opacity: questions.length < Q_PER_PAGE ? 0.4 : 1 }} disabled={questions.length < Q_PER_PAGE} onClick={() => setQPage(p => p + 1)}>التالي →</button>
                </div>
              </>)}
            </div>
          </div>
        )}

        {/* ══════ CATEGORIES ══════ */}
        {activeTab === 'categories' && (
          <div>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: C.txtPrimary, margin: 0, marginBottom: '0.2rem' }}>التصنيفات</h1>
                <p style={{ color: C.txtSecondary, fontSize: '0.85rem', margin: 0 }}>تصنيفات أسئلة المسابقات وتوزيعها</p>
              </div>
              <button
                style={{ ...btnPrimary, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                onClick={() => { setShowAddCat(v => !v); setNewCatName(''); }}
              >
                {showAddCat ? '✕ إلغاء' : '+ إضافة تصنيف'}
              </button>
            </div>

            {/* Inline add form */}
            {showAddCat && (
              <div style={{
                background: C.cardAlt, border: `1px solid ${C.borderPurple}`,
                borderRadius: '0.875rem', padding: '1.1rem', marginBottom: '1.25rem',
                display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap',
              }}>
                <input
                  style={{ ...inputSt, flex: 1, minWidth: '180px' }}
                  placeholder="اسم التصنيف بالعربية..."
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                  autoFocus
                />
                <button
                  style={{ ...btnPrimary, opacity: catSaving || !newCatName.trim() ? 0.6 : 1 }}
                  onClick={handleAddCategory}
                  disabled={catSaving || !newCatName.trim()}
                >
                  {catSaving ? '⏳ جارٍ...' : '✓ إضافة'}
                </button>
              </div>
            )}

            {catsLoading ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: C.txtMuted }}>جارٍ التحميل...</div>
            ) : catsWithCount.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '4rem', color: C.txtMuted,
                background: C.card, border: `1px solid ${C.border}`, borderRadius: '0.875rem',
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.6rem' }}>📁</div>
                <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>لا توجد تصنيفات بعد</div>
                <div style={{ fontSize: '0.8rem' }}>أضف تصنيفاً أعلاه لتنظيم أسئلتك</div>
              </div>
            ) : (<>
              {/* Summary stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)',
                gap: '0.875rem', marginBottom: '1.25rem',
              }}>
                {[
                  { v: catsWithCount.length,                                                               l: 'إجمالي التصنيفات', c: C.purpleLt },
                  { v: catsWithCount.reduce((s, c) => s + c._count, 0),                                   l: 'إجمالي الأسئلة',   c: C.greenLt  },
                  { v: Math.round(catsWithCount.reduce((s, c) => s + c._count, 0) / catsWithCount.length), l: 'المعدل لكل تصنيف', c: C.goldLt   },
                  { v: catsWithCount.reduce((mx, c) => c._count > mx ? c._count : mx, 0),                 l: 'أكبر تصنيف',      c: C.blueLt   },
                ].map(s => (
                  <div key={s.l} style={{
                    background: C.card, border: `1px solid ${C.border}`,
                    borderRadius: '0.875rem', padding: '1rem', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.c, lineHeight: 1 }}>{s.v}</div>
                    <div style={{ fontSize: '0.72rem', color: C.txtSecondary, marginTop: '0.35rem' }}>{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Category cards grid */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '150px' : '210px'}, 1fr))`, gap: '1rem' }}>
                {catsWithCount.map((c, i) => {
                  const colors = [C.purple, C.goldLt, C.greenLt, C.blueLt, C.redLt, '#8b5cf6', '#5eead4'];
                  const col = colors[i % colors.length];
                  const total = catsWithCount.reduce((s, x) => s + x._count, 0);
                  return (
                    <div key={c.id} style={{
                      background: C.card, border: `1px solid ${C.border}`,
                      borderRadius: '0.875rem', padding: '1.1rem',
                      position: 'relative', overflow: 'hidden',
                    }}>
                      {/* Delete button */}
                      <button
                        onClick={() => handleDeleteCategory(c.id, c.name_ar)}
                        title="حذف التصنيف"
                        style={{
                          position: 'absolute', top: '0.6rem', left: '0.6rem',
                          background: 'transparent', border: 'none',
                          color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '0.8rem',
                          padding: '0.2rem 0.4rem', borderRadius: '0.3rem', lineHeight: 1,
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.redLt; (e.currentTarget as HTMLElement).style.background = 'rgba(185,28,28,0.12)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.2)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >🗑️</button>

                      {/* Color badge */}
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '0.5rem',
                        background: `${col}20`, border: `1px solid ${col}35`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '0.75rem',
                      }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '0.25rem', background: col, opacity: 0.9 }} />
                      </div>

                      <div style={{ fontWeight: 700, color: C.txtPrimary, marginBottom: '0.625rem', fontSize: '0.95rem' }}>{c.name_ar}</div>

                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.65rem', fontWeight: 800, color: col, lineHeight: 1 }}>{c._count}</span>
                        <span style={{ fontSize: '0.68rem', color: C.txtMuted }}>الأسئلة</span>
                        <span style={{ fontSize: '0.7rem', color: C.txtMuted }}>{total ? `${Math.round((c._count / total) * 100)}%` : '—'}</span>
                      </div>
                      <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px' }}>
                        <div style={{
                          height: '100%', borderRadius: '99px', background: col, opacity: 0.8,
                          width: `${total ? Math.min((c._count / total) * 100, 100) : 0}%`,
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>)}
          </div>
        )}

        {/* ══════ PARTNERS ══════ */}
        {activeTab === 'partners' && (
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: C.txtPrimary, margin: '0 0 0.2rem' }}>الشركاء</h1>
            <p style={{ color: C.txtSecondary, fontSize: '0.85rem', margin: '0 0 1.5rem' }}>إدارة شبكة الموزعين والشركاء التجاريين</p>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '0.875rem', padding: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 600, color: C.greenLt, marginBottom: '0.875rem', fontSize: '0.9rem' }}>🤝 ترقية مستخدم إلى شريك</div>
              <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                <input style={{ ...inputSt, flex: 1, minWidth: '220px' }} placeholder="البريد الإلكتروني للمستخدم..." value={promoteEmail} onChange={e => setPromoteEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handlePromote()} />
                <button style={{ ...btnPrimary, background: C.green }} onClick={handlePromote} disabled={promoteLoading}>{promoteLoading ? 'جارٍ...' : '+ ترقية'}</button>
              </div>
              {promoteMsg && <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.875rem', background: promoteMsg.startsWith('✅') ? 'rgba(5,150,105,0.1)' : 'rgba(185,28,28,0.1)', borderRadius: '0.5rem', color: promoteMsg.startsWith('✅') ? C.greenLt : C.redLt, fontSize: '0.85rem' }}>{promoteMsg}</div>}
            </div>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '0.875rem', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: `1px solid ${C.borderSub}`, fontWeight: 600, fontSize: '0.9rem' }}>قائمة الشركاء ({partners.length})</div>
              {partnersLoading ? <div style={{ textAlign: 'center', padding: '2.5rem', color: C.txtMuted }}>جارٍ التحميل...</div> :
                partners.length === 0 ? <div style={{ textAlign: 'center', padding: '3rem', color: C.txtMuted }}>لا يوجد شركاء حتى الآن</div> : (
                  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? '520px' : undefined }}>
                    <thead style={{ background: C.cardAlt }}><tr>
                      <th style={tableTh}>البريد</th>
                      <th style={tableTh}>إجمالي الأكواد</th>
                      <th style={tableTh}>المستخدمة</th>
                      <th style={tableTh}>العملاء</th>
                      <th style={tableTh}>التحويل</th>
                      <th style={tableTh}>تفاصيل</th>
                    </tr></thead>
                    <tbody>
                      {partners.map(p => (
                        <tr key={p.id}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.cardAlt}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                          <td style={{ ...tableTd, direction: 'ltr', fontFamily: 'monospace', fontSize: '0.8rem', color: C.txtSecondary }}>{p.email}</td>
                          <td style={tableTd}><Badge label={String(p.total_codes)} color={C.blueLt} /></td>
                          <td style={tableTd}><Badge label={String(p.used_codes)} color={C.greenLt} /></td>
                          <td style={tableTd}><Badge label={String(p.customers)} color={C.goldLt} /></td>
                          <td style={tableTd}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ flex: 1, height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px' }}>
                                <div style={{ height: '100%', width: `${p.total_codes ? Math.min((p.used_codes/p.total_codes)*100,100) : 0}%`, background: C.greenLt, borderRadius: '99px', opacity: 0.75 }} />
                              </div>
                              <span style={{ fontSize: '0.72rem', color: C.greenLt, minWidth: '32px' }}>{p.total_codes ? `${Math.round((p.used_codes/p.total_codes)*100)}%` : '—'}</span>
                            </div>
                          </td>
                          <td style={tableTd}>
                            <button style={{ ...btnGhost, padding: '0.3rem 0.7rem', fontSize: '0.75rem', color: C.blueLt, borderColor: `rgba(29,78,216,0.25)` }}
                              onClick={() => handleViewPartnerDetails(p)}>
                              📄 تفاصيل
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* ══════ CODES ══════ */}
        {activeTab === 'codes' && (
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: C.txtPrimary, margin: '0 0 0.2rem' }}>مصنع الأكواد</h1>
            <p style={{ color: C.txtSecondary, fontSize: '0.85rem', margin: '0 0 1.5rem' }}>توليد وإدارة أكواد التفعيل</p>

            <div style={{ background: C.card, border: `1px solid rgba(180,83,9,0.2)`, borderRadius: '0.875rem', padding: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 600, color: C.goldLt, marginBottom: '1rem', fontSize: '0.9rem' }}>⚡ توليد دُفعة جديدة</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '0.875rem', marginBottom: '1rem' }}>
                {[
                  { label: 'الشريك', content: <select style={{ ...selectSt, width: '100%' }} value={codeForm.partner_id} onChange={e => setCodeForm(f => ({ ...f, partner_id: e.target.value }))}><option value="">اختر شريكاً...</option>{partnerList.map(p => <option key={p.id} value={p.id}>{p.email}</option>)}</select> },
                  { label: 'البادئة (Prefix)', content: <input style={inputSt} maxLength={10} value={codeForm.prefix} onChange={e => setCodeForm(f => ({ ...f, prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'') }))} /> },
                  { label: 'الكمية (1-500)', content: <input style={inputSt} type="number" min={1} max={500} value={codeForm.quantity} onChange={e => setCodeForm(f => ({ ...f, quantity: Number(e.target.value) }))} /> },
                  { label: 'نوع الباقة', content: <select style={{ ...selectSt, width: '100%' }} value={codeForm.plan_type} onChange={e => setCodeForm(f => ({ ...f, plan_type: e.target.value as '3_days'|'unlimited' }))}><option value="3_days">⏰ 3 أيام</option><option value="unlimited">♾️ بلا حدود</option></select> },
                ].map(({ label, content }) => (
                  <div key={label}>
                    <div style={{ fontSize: '0.72rem', color: C.txtMuted, marginBottom: '0.3rem' }}>{label}</div>
                    {content}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flexWrap: 'wrap' }}>
                <button style={{ ...btnPrimary, background: C.gold, padding: '0.7rem 1.5rem' }} onClick={handleGenerateCodes} disabled={generating}>{generating ? '⏳ جارٍ الإنشاء...' : `⚡ إنشاء ${codeForm.quantity} كود`}</button>
                {codes.length > 0 && <button style={{ ...btnGhost, fontSize: '0.82rem' }} onClick={() => exportCodesToCSV()}>📥 تصدير CSV</button>}
                {genMsg && <span style={{ fontSize: '0.85rem', color: genMsg.startsWith('✅') ? C.greenLt : C.redLt }}>{genMsg}</span>}
              </div>
              {generatedCodes.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: C.txtMuted, marginBottom: '0.4rem' }}>الأكواد المُنشأة — انسخها للشريك:</div>
                  <textarea readOnly value={generatedCodes.join('\n')} rows={Math.min(generatedCodes.length, 8)} style={{ ...inputSt, direction: 'ltr', fontFamily: 'monospace', fontSize: '0.82rem', resize: 'vertical' } as React.CSSProperties} />
                  <button style={{ ...btnGhost, marginTop: '0.4rem', fontSize: '0.78rem' }} onClick={() => navigator.clipboard.writeText(generatedCodes.join('\n'))}>📋 نسخ الكل</button>
                </div>
              )}
            </div>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '0.875rem', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: `1px solid ${C.borderSub}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button style={{ ...btnGhost, fontSize: '0.78rem' }} onClick={loadCodes}>↻ تحديث</button>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>جميع الأكواد ({codes.length})</div>
              </div>
              {codesLoading ? <div style={{ textAlign: 'center', padding: '2.5rem', color: C.txtMuted }}>جارٍ التحميل...</div> : (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? '480px' : undefined }}>
                  <thead style={{ background: C.cardAlt }}><tr>
                    <th style={tableTh}>الكود</th>
                    <th style={tableTh}>الباقة</th>
                    <th style={tableTh}>الشريك</th>
                    <th style={tableTh}>الحالة</th>
                    <th style={tableTh}>التاريخ</th>
                  </tr></thead>
                  <tbody>
                    {codes.map(c => (
                      <tr key={c.id}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.cardAlt}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                        <td style={{ ...tableTd, fontFamily: 'monospace', fontWeight: 700, color: c.is_used ? C.txtMuted : C.goldLt, direction: 'ltr' }}>{c.code}</td>
                        <td style={tableTd}><Badge label={c.plan_type === 'unlimited' ? '♾️ بلا حدود' : '⏰ 3 أيام'} color={c.plan_type === 'unlimited' ? C.goldLt : C.purpleLt} /></td>
                        <td style={{ ...tableTd, fontSize: '0.75rem', color: C.txtSecondary, direction: 'ltr', fontFamily: 'monospace' }}>{c.partner_email}</td>
                        <td style={tableTd}><Badge label={c.is_used ? '✓ مستخدم' : '● متاح'} color={c.is_used ? C.grayLt : C.greenLt} /></td>
                        <td style={{ ...tableTd, direction: 'ltr', fontSize: '0.72rem', color: C.txtMuted }}>{new Date(c.created_at).toLocaleDateString('ar')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════ ORDERS ══════ */}
        {activeTab === 'orders' && (
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: C.txtPrimary, margin: '0 0 0.2rem' }}>طلبات الأكواد</h1>
            <p style={{ color: C.txtSecondary, fontSize: '0.85rem', margin: '0 0 1.5rem' }}>مراجعة وإدارة طلبات الشركاء</p>

            {/* Filters + Refresh */}
            <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '1.1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {(['pending','approved','rejected','all'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setOrdersFilter(f)}
                  style={{
                    padding: '0.45rem 0.9rem', borderRadius: '0.5rem', border: 'none',
                    cursor: 'pointer', fontWeight: ordersFilter === f ? 700 : 500, fontSize: '0.82rem',
                    fontFamily: 'Tajawal, sans-serif',
                    background: ordersFilter === f
                      ? (f === 'pending' ? C.gold : f === 'approved' ? C.green : f === 'rejected' ? C.red : C.purple)
                      : 'rgba(255,255,255,0.05)',
                    color: ordersFilter === f ? '#fff' : C.txtSecondary,
                  }}
                >
                  {f === 'pending' ? '⏳ قيد المراجعة' : f === 'approved' ? '✓ مقبولة' : f === 'rejected' ? '✕ مرفوضة' : 'الكل'}
                  {f !== 'all' && <span style={{ marginRight: '0.35rem', fontSize: '0.7rem', opacity: 0.8 }}>
                    ({partnerOrders.filter(o => o.status === f).length})
                  </span>}
                </button>
              ))}
              <button style={{ ...btnGhost, marginRight: 'auto', fontSize: '0.8rem' }} onClick={loadOrders}>↻ تحديث</button>
            </div>

            {/* Orders table */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '0.875rem', overflow: 'hidden' }}>
              {ordersLoading ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: C.txtMuted }}>جارٍ التحميل...</div>
              ) : (() => {
                const filtered = ordersFilter === 'all' ? partnerOrders : partnerOrders.filter(o => o.status === ordersFilter);
                if (filtered.length === 0) return (
                  <div style={{ textAlign: 'center', padding: '3rem', color: C.txtMuted }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📦</div>
                    <div>لا توجد طلبات في هذا القسم</div>
                  </div>
                );
                return (
                  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? '480px' : undefined }}>
                      <thead style={{ background: C.cardAlt }}>
                        <tr>
                          <th style={tableTh}>الشريك</th>
                          <th style={tableTh}>نوع الطلب</th>
                          <th style={tableTh}>البادئة</th>
                          <th style={tableTh}>الكمية</th>
                          {!isMobile && <th style={tableTh}>ملاحظات</th>}
                          <th style={tableTh}>الحالة</th>
                          <th style={tableTh}>التاريخ</th>
                          {ordersFilter === 'pending' && <th style={tableTh}>إجراء</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map(o => {
                          const statusInfo = o.status === 'approved'
                            ? { label: '✓ مقبول', color: C.greenLt }
                            : o.status === 'rejected'
                            ? { label: '✕ مرفوض', color: C.redLt }
                            : { label: '⏳ قيد المراجعة', color: C.goldLt };
                          return (
                            <tr key={o.id}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.cardAlt}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                              <td style={{ ...tableTd, direction: 'ltr', fontFamily: 'monospace', fontSize: '0.78rem', color: C.txtSecondary, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.partner_email}</td>
                              <td style={{ ...tableTd, fontWeight: 600 }}>{o.item_name}</td>
                              <td style={{ ...tableTd, fontFamily: 'monospace', fontSize: '0.8rem', color: C.purpleLt }}>{o.prefix || 'WOL'}</td>
                              <td style={tableTd}><Badge label={`${o.quantity} كود`} color={C.blueLt} /></td>
                              {!isMobile && <td style={{ ...tableTd, fontSize: '0.8rem', color: C.txtMuted }}>{o.notes || '—'}</td>}
                              <td style={tableTd}><Badge label={statusInfo.label} color={statusInfo.color} /></td>
                              <td style={{ ...tableTd, direction: 'ltr', fontSize: '0.72rem', color: C.txtMuted }}>{new Date(o.created_at).toLocaleDateString('ar')}</td>
                              {ordersFilter === 'pending' && (
                                <td style={tableTd}>
                                  {o.status === 'pending' ? (
                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                      <button
                                        disabled={approvingOrder === o.id}
                                        onClick={() => handleOrderAction(o.id, 'approved')}
                                        style={{ padding: '0.3rem 0.65rem', borderRadius: '0.4rem', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'Tajawal, sans-serif', background: `rgba(5,150,105,0.15)`, color: C.greenLt, opacity: approvingOrder === o.id ? 0.5 : 1 }}
                                      >{approvingOrder === o.id ? '...' : '✓ قبول'}</button>
                                      <button
                                        disabled={approvingOrder === o.id}
                                        onClick={() => handleOrderAction(o.id, 'rejected')}
                                        style={{ padding: '0.3rem 0.65rem', borderRadius: '0.4rem', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'Tajawal, sans-serif', background: `rgba(185,28,28,0.15)`, color: C.redLt, opacity: approvingOrder === o.id ? 0.5 : 1 }}
                                      >{approvingOrder === o.id ? '...' : '✕ رفض'}</button>
                                    </div>
                                  ) : <span style={{ fontSize: '0.75rem', color: C.txtMuted }}>—</span>}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ══════ ANALYTICS ══════ */}
        {activeTab === 'analytics' && (() => {
          const ad = analyticsData;
          const s = ad?.summary;
          const MODE_LABELS: Record<string, string> = {
            'wall-to-wall': 'جدار لجدار', 'most-letters': 'أكثر حروف',
            'five-connected': '5 متصلة', 'any-condition': 'أي شرط', 'all': 'الكل',
          };
          // تحويل ساعات UTC إلى التوقيت المحلي
          const utcOffsetHours = -(new Date().getTimezoneOffset() / 60); // e.g. +3 for Mecca
          const toLocalHour = (utcH: number) => ((utcH + utcOffsetHours) % 24 + 24) % 24;
          const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => `${i}:00`);
          const chartPad = isMobile ? '0.85rem' : '1.25rem';
          const chartH3 = { fontSize: isMobile ? '0.82rem' : '0.9rem', fontWeight: 700 as const, color: C.txtPrimary, margin: '0 0 0.6rem' };
          const chartCard = { background: C.card, border: `1px solid ${C.border}`, borderRadius: '0.875rem', padding: chartPad };

          // ── SVG Line Chart component ──────────────────────────────
          const LineChart = ({ data, color, height = 120 }: { data: { label: string; value: number }[]; color: string; height?: number }) => {
            if (!data.length) return <div style={{ color: C.txtMuted, fontSize: '0.8rem', padding: '2rem', textAlign: 'center' }}>لا توجد بيانات</div>;
            const max = Math.max(...data.map(d => d.value), 1);
            const w = 100; // viewBox width percentage
            const h = height;
            const pad = 4;
            const pts = data.map((d, i) => ({
              x: pad + (i / Math.max(data.length - 1, 1)) * (w - pad * 2),
              y: pad + (1 - d.value / max) * (h - pad * 2),
            }));
            const line = pts.map(p => `${p.x},${p.y}`).join(' ');
            const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;
            return (
              <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: `${h}px`, display: 'block' }}>
                <defs>
                  <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <polygon points={area} fill={`url(#grad-${color.replace('#', '')})`} />
                <polyline points={line} fill="none" stroke={color} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
                {pts.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="1.2" fill={color} opacity={i === pts.length - 1 ? 1 : 0.6} />
                ))}
              </svg>
            );
          };

          // ── Donut chart ──────────────────────────────────────────
          const DonutChart = ({ segments }: { segments: { value: number; color: string; label: string }[] }) => {
            const total = segments.reduce((s, x) => s + x.value, 0) || 1;
            const size = isMobile ? 90 : 120;
            const r = isMobile ? 32 : 42;
            const stroke = isMobile ? 10 : 14;
            const circ = 2 * Math.PI * r;
            let offset = 0;
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                  {segments.map((seg, i) => {
                    const pct = seg.value / total;
                    const dashLen = pct * circ;
                    const el = (
                      <circle key={i} cx={size / 2} cy={size / 2} r={r}
                        fill="none" stroke={seg.color} strokeWidth={stroke}
                        strokeDasharray={`${dashLen} ${circ - dashLen}`}
                        strokeDashoffset={-offset} strokeLinecap="round"
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                      />
                    );
                    offset += dashLen;
                    return el;
                  })}
                  <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
                    fill={C.txtPrimary} fontSize={isMobile ? '13' : '16'} fontWeight="700" fontFamily="Tajawal,sans-serif">
                    {total}
                  </text>
                </svg>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {segments.map((seg, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: seg.color }} />
                      <span style={{ color: C.txtSecondary }}>{seg.label}</span>
                      <span style={{ color: C.txtPrimary, fontWeight: 700 }}>{seg.value}</span>
                      <span style={{ color: C.txtMuted, fontSize: '0.72rem' }}>({Math.round(seg.value / total * 100)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          };

          return (
            <div>
              {/* Header + time filter */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: isMobile ? '1rem' : '1.5rem' }}>
                <h1 style={{ fontSize: isMobile ? '1.2rem' : '1.6rem', fontWeight: 700, color: C.txtPrimary, margin: 0 }}>التحليلات</h1>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {[7, 30, 90, 365].map(d => (
                    <button key={d} onClick={() => setAnalyticsDays(d)} style={{
                      padding: isMobile ? '0.3rem 0.5rem' : '0.35rem 0.75rem', borderRadius: '0.5rem', border: `1px solid ${analyticsDays === d ? C.purple : C.border}`,
                      background: analyticsDays === d ? `${C.purple}25` : 'transparent',
                      color: analyticsDays === d ? C.purpleLt : C.txtMuted,
                      fontSize: isMobile ? '0.7rem' : '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Tajawal,sans-serif',
                    }}>
                      {d === 365 ? 'سنة' : `${d} يوم`}
                    </button>
                  ))}
                  <button onClick={() => loadAnalytics()} style={{
                    padding: isMobile ? '0.3rem 0.45rem' : '0.35rem 0.6rem', borderRadius: '0.5rem', border: `1px solid ${C.border}`,
                    background: 'transparent', color: C.txtMuted, fontSize: isMobile ? '0.7rem' : '0.78rem', cursor: 'pointer',
                    fontFamily: 'Tajawal,sans-serif', opacity: analyticsLoading ? 0.5 : 1,
                  }}>↻</button>
                </div>
              </div>

              {/* Loading skeleton */}
              {analyticsLoading && !ad && (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '0.875rem', height: '90px', animation: 'pulse 1.5s ease infinite' }} />
                  ))}
                </div>
              )}

              {ad && s && (
                <>
                  {/* ── Summary Cards ─────────────────────────────────────── */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '0.8rem', marginBottom: '1.5rem' }}>
                    <StatCard icon="🟢" label="جلسات نشطة الآن" value={s.total_active} color={C.greenLt} />
                    <StatCard icon="🎮" label={`جلسات (${analyticsDays} يوم)`} value={s.total_sessions} color={C.purpleLt} />
                    <StatCard icon="⏱️" label="متوسط المدة" value={`${s.avg_duration_min} د`} color={C.blueLt} />
                    <StatCard icon="👥" label="متوسط اللاعبين" value={s.avg_players} sub={`${s.active_hosts} مضيف نشط`} color={C.goldLt} />
                  </div>

                  {/* ── Active Sessions Table ────────────────────────────── */}
                  {ad.active_sessions.length > 0 && (
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '0.875rem', padding: isMobile ? '0.85rem' : '1.25rem', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.greenLt, animation: 'pulse 2s ease infinite' }} />
                        <h2 style={{ fontSize: isMobile ? '0.9rem' : '1rem', fontWeight: 700, color: C.txtPrimary, margin: 0 }}>الجلسات النشطة ({ad.active_sessions.length})</h2>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {ad.active_sessions.map(sess => {
                          const PLAY_MODE_LABEL: Record<string, { label: string; color: string; icon: string }> = {
                            'tv-show': { label: 'حروف مع عزيز', color: C.blueLt, icon: '🏛️' },
                            'normal':  { label: 'حرب الحروف', color: '#f9a8d4', icon: '⚔️' },
                          };
                          const pm = PLAY_MODE_LABEL[sess.play_mode || 'normal'] || PLAY_MODE_LABEL['normal'];
                          const durMin = Math.round(sess.duration_min);
                          const durH = Math.floor(durMin / 60);
                          const durM = durMin % 60;
                          const durText = durH > 0 ? `${durH} س ${durM} د` : `${durM} د`;
                          return (
                            <div key={sess.id} style={{
                              background: C.cardAlt, border: `1px solid ${C.borderSub}`,
                              borderRadius: '0.75rem', padding: isMobile ? '0.75rem' : '1rem',
                            }}>
                              {/* الصف الأول: الكود + الطور + زر الإغلاق */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  <span style={{ color: C.purpleLt, fontWeight: 800, fontFamily: 'monospace', fontSize: isMobile ? '0.95rem' : '1.1rem', letterSpacing: '0.12em' }}>{sess.session_code}</span>
                                  <span style={{
                                    padding: '0.15rem 0.45rem', borderRadius: '0.35rem', fontSize: isMobile ? '0.65rem' : '0.72rem', fontWeight: 700,
                                    background: `${pm.color}20`, color: pm.color, border: `1px solid ${pm.color}50`,
                                  }}>{pm.icon} {pm.label}</span>
                                </div>
                                <button
                                  onClick={() => handleForceCloseSession(sess.session_code)}
                                  disabled={closingSession === sess.session_code}
                                  style={{
                                    padding: '0.3rem 0.6rem', borderRadius: '0.4rem',
                                    border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700,
                                    fontFamily: 'Tajawal,sans-serif',
                                    background: 'rgba(185,28,28,0.15)', color: C.redLt,
                                    opacity: closingSession === sess.session_code ? 0.5 : 1,
                                  }}
                                >{closingSession === sess.session_code ? 'جاري...' : '🔒 إغلاق'}</button>
                              </div>
                              {/* الصف الثاني: التفاصيل */}
                              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, auto)', gap: isMobile ? '0.3rem 0.6rem' : '0 1rem', fontSize: isMobile ? '0.72rem' : '0.78rem' }}>
                                <div>
                                  <span style={{ color: C.txtMuted }}>المضيف: </span>
                                  <span style={{ color: C.txtSecondary, direction: 'ltr', unicodeBidi: 'embed', fontSize: isMobile ? '0.68rem' : undefined }}>{sess.host_email || '—'}</span>
                                </div>
                                <div>
                                  <span style={{ color: C.txtMuted }}>الفوز: </span>
                                  <span style={{ color: C.txtSecondary }}>{MODE_LABELS[sess.game_mode] || sess.game_mode}</span>
                                </div>
                                <div>
                                  <span style={{ color: C.txtMuted }}>جولات: </span>
                                  <span style={{ color: C.txtPrimary, fontWeight: 700 }}>{sess.rounds_setting}</span>
                                </div>
                                <div>
                                  <span style={{ color: C.txtMuted }}>لاعبين: </span>
                                  <span style={{ color: C.greenLt, fontWeight: 700 }}>{sess.peak_players}</span>
                                </div>
                                <div>
                                  <span style={{ color: C.txtMuted }}>منذ: </span>
                                  <span style={{ color: durMin > 60 ? C.goldLt : C.txtPrimary, fontWeight: 700 }}>{durText}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── Charts Grid ──────────────────────────────────────── */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>

                    {/* Sessions per day — Bar + Line combo */}
                    <div style={chartCard}>
                      <ChartHeader title="الجلسات اليومية" info="عدد جلسات اللعب يومياً. الأعمدة تمثل عدد الجلسات، واللون الأغمق يدل على اليوم الأنشط." style={chartH3} />
                      {(() => {
                        const data = ad.daily_sessions.map(d => ({ label: d.d, value: d.sessions }));
                        if (!data.length) return <div style={{ color: C.txtMuted, fontSize: '0.8rem', padding: '2rem', textAlign: 'center' }}>لا توجد بيانات</div>;
                        const maxVal = Math.max(...data.map(d => d.value), 1);
                        const totalS = data.reduce((s, d) => s + d.value, 0);
                        const show = isMobile ? Math.min(data.length, 14) : Math.min(data.length, 21);
                        const slice = data.slice(-show);
                        return (
                          <>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: isMobile ? '2px' : '3px', height: isMobile ? '80px' : '100px', marginBottom: '0.4rem' }}>
                              {slice.map((d, i) => {
                                const pct = (d.value / maxVal) * 100;
                                const isMax = d.value === maxVal && d.value > 0;
                                return (
                                  <div key={i} title={`${d.label}: ${d.value} جلسة`} style={{
                                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%',
                                  }}>
                                    {d.value > 0 && (
                                      <span style={{ fontSize: '0.5rem', color: isMax ? C.purpleLt : C.txtMuted, fontWeight: isMax ? 800 : 400, marginBottom: '2px' }}>{d.value}</span>
                                    )}
                                    <div style={{
                                      width: '100%', borderRadius: '3px 3px 0 0',
                                      height: d.value === 0 ? '2px' : `${Math.max(pct, 8)}%`,
                                      background: d.value === 0
                                        ? 'rgba(255,255,255,0.04)'
                                        : isMax
                                          ? `linear-gradient(to top, ${C.purple}, ${C.purpleLt})`
                                          : `rgba(168,85,247,${0.2 + (d.value / maxVal) * 0.6})`,
                                      transition: 'height 0.4s ease',
                                    }} />
                                  </div>
                                );
                              })}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: C.txtMuted }}>
                              <span>{slice[0]?.label?.slice(5)}</span>
                              <span>{slice[slice.length - 1]?.label?.slice(5)}</span>
                            </div>
                            <div style={{ marginTop: '0.4rem', fontSize: '0.72rem', color: C.txtSecondary, textAlign: 'center' }}>
                              إجمالي: <span style={{ color: C.purpleLt, fontWeight: 700 }}>{totalS}</span> جلسة
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Registrations per day */}
                    <div style={chartCard}>
                      <ChartHeader title="التسجيلات اليومية" info="عدد المستخدمين الجدد الذين أنشأوا حساباً يومياً. يعكس نمو قاعدة المستخدمين ومدى فعالية التسويق." style={chartH3} />
                      <LineChart
                        data={ad.daily_registrations.map(d => ({ label: d.d, value: d.cnt }))}
                        color={C.greenLt}
                      />
                      {ad.daily_registrations.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.7rem', color: C.txtMuted }}>
                          <span>{ad.daily_registrations[0]?.d?.slice(5)}</span>
                          <span>{ad.daily_registrations[ad.daily_registrations.length - 1]?.d?.slice(5)}</span>
                        </div>
                      )}
                    </div>

                    {/* Hourly distribution — Radial Clock Chart */}
                    <div style={chartCard}>
                      <ChartHeader title="ساعات الذروة" info="يوضح توزيع جلسات اللعب على مدار 24 ساعة بتوقيتك المحلي. كلما كان القطاع أطول، زادت الجلسات في تلك الساعة. الساعة المميزة باللون البنفسجي هي ذروة الاستخدام." style={chartH3} />
                      {(() => {
                        // تحويل ساعات UTC إلى التوقيت المحلي
                        const localHours = Array.from({ length: 24 }, (_, i) => {
                          const found = ad.hourly_distribution.find(h => toLocalHour(h.h) === i);
                          return { h: i, cnt: found?.cnt ?? 0 };
                        });
                        // fallback: إذا لم نجد تطابق (بسبب عدم وجود بيانات لبعض الساعات) — اجمعها يدوياً
                        const hourMap = new Map<number, number>();
                        ad.hourly_distribution.forEach(item => {
                          const lh = toLocalHour(item.h);
                          hourMap.set(lh, (hourMap.get(lh) ?? 0) + item.cnt);
                        });
                        const hours = Array.from({ length: 24 }, (_, i) => ({
                          h: i, cnt: hourMap.get(i) ?? 0,
                        }));
                        const maxH = Math.max(...hours.map(h => h.cnt), 1);
                        const totalSessions = hours.reduce((s, h) => s + h.cnt, 0);
                        const peakHour = hours.reduce((best, h) => h.cnt > best.cnt ? h : best, hours[0]);

                        // Radial clock dimensions
                        const size = isMobile ? 200 : 260;
                        const cx = size / 2;
                        const cy = size / 2;
                        const innerR = size * 0.18;
                        const outerR = size * 0.42;
                        const labelR = size * 0.47;

                        return (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                                {/* Background circle */}
                                <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                                <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

                                {/* Hour segments */}
                                {hours.map(item => {
                                  const angle = (item.h / 24) * 360 - 90; // Start from top (12 o'clock)
                                  const nextAngle = ((item.h + 1) / 24) * 360 - 90;
                                  const barR = innerR + (outerR - innerR) * (item.cnt / maxH);
                                  const isPeak = item.h === peakHour.h && item.cnt > 0;

                                  // Arc path
                                  const toRad = (deg: number) => (deg * Math.PI) / 180;
                                  const gap = 0.8; // gap degrees between segments
                                  const a1 = toRad(angle + gap);
                                  const a2 = toRad(nextAngle - gap);
                                  const r1 = innerR + 1;
                                  const r2 = item.cnt === 0 ? innerR + 3 : barR;

                                  const x1i = cx + r1 * Math.cos(a1);
                                  const y1i = cy + r1 * Math.sin(a1);
                                  const x2i = cx + r1 * Math.cos(a2);
                                  const y2i = cy + r1 * Math.sin(a2);
                                  const x1o = cx + r2 * Math.cos(a1);
                                  const y1o = cy + r2 * Math.sin(a1);
                                  const x2o = cx + r2 * Math.cos(a2);
                                  const y2o = cy + r2 * Math.sin(a2);

                                  const path = [
                                    `M ${x1i} ${y1i}`,
                                    `L ${x1o} ${y1o}`,
                                    `A ${r2} ${r2} 0 0 1 ${x2o} ${y2o}`,
                                    `L ${x2i} ${y2i}`,
                                    `A ${r1} ${r1} 0 0 0 ${x1i} ${y1i}`,
                                    'Z',
                                  ].join(' ');

                                  const opacity = item.cnt === 0 ? 0.06 : 0.25 + (item.cnt / maxH) * 0.75;

                                  return (
                                    <g key={item.h}>
                                      {isPeak && (
                                        <defs>
                                          <linearGradient id={`peak-grad-${item.h}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor={C.purple} />
                                            <stop offset="100%" stopColor={C.purpleLt} />
                                          </linearGradient>
                                        </defs>
                                      )}
                                      <path
                                        d={path}
                                        fill={isPeak ? `url(#peak-grad-${item.h})` : item.cnt === 0 ? 'rgba(255,255,255,0.04)' : `rgba(168,85,247,${opacity})`}
                                        stroke={isPeak ? C.purpleLt : 'none'}
                                        strokeWidth={isPeak ? 1.5 : 0}
                                      >
                                        <title>{`${HOUR_LABELS[item.h]}: ${item.cnt} جلسة`}</title>
                                      </path>
                                      {/* Count label for segments with data */}
                                      {item.cnt > 0 && (item.cnt === peakHour.cnt || item.cnt >= maxH * 0.5) && (() => {
                                        const midA = toRad((angle + nextAngle) / 2);
                                        const lx = cx + (r2 + 10) * Math.cos(midA);
                                        const ly = cy + (r2 + 10) * Math.sin(midA);
                                        return (
                                          <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                                            fill={isPeak ? C.purpleLt : C.txtMuted}
                                            fontSize={isPeak ? '0.65rem' : '0.55rem'}
                                            fontWeight={isPeak ? 800 : 400}
                                          >{item.cnt}</text>
                                        );
                                      })()}
                                    </g>
                                  );
                                })}

                                {/* Hour labels (12, 3, 6, 9) — like a clock */}
                                {[0, 6, 12, 18].map(h => {
                                  const angle = (h / 24) * 360 - 90;
                                  const rad = (angle * Math.PI) / 180;
                                  const lx = cx + labelR * Math.cos(rad);
                                  const ly = cy + labelR * Math.sin(rad);
                                  return (
                                    <text key={h} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                                      fill={C.txtMuted} fontSize="0.6rem" fontWeight={600}
                                    >{h === 0 ? '00' : h}:00</text>
                                  );
                                })}

                                {/* Center text */}
                                <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="middle"
                                  fill={C.txtPrimary} fontSize={isMobile ? '0.7rem' : '0.8rem'} fontWeight={800}
                                >{totalSessions}</text>
                                <text x={cx} y={cy + 10} textAnchor="middle" dominantBaseline="middle"
                                  fill={C.txtMuted} fontSize="0.55rem"
                                >جلسة</text>
                              </svg>
                            </div>
                            {totalSessions > 0 && (
                              <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: C.txtSecondary, textAlign: 'center' }}>
                                🕐 ذروة اللعب: <span style={{ color: C.purpleLt, fontWeight: 700 }}>{HOUR_LABELS[peakHour.h]}</span> ({peakHour.cnt} جلسة)
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    {/* Plan distribution */}
                    <div style={chartCard}>
                      <ChartHeader title="توزيع الباقات" info="توزيع المستخدمين حسب نوع الاشتراك:\n• مجاني: لم يشترك بعد\n• مؤقت (3 أيام): اشتراك تجريبي\n• لامحدود: اشتراك دائم (ذهبي)" style={chartH3} />
                      <DonutChart segments={[
                        { value: ad.plan_distribution.free, color: C.grayLt, label: 'مجاني' },
                        { value: ad.plan_distribution.temp, color: C.blueLt, label: 'مؤقت (3 أيام)' },
                        { value: ad.plan_distribution.lifetime, color: C.goldLt, label: 'لامحدود' },
                      ]} />
                    </div>
                  </div>

                  {/* ── توزيع أوضاع اللعب (بطاقة واحدة بعرض كامل) ──────── */}
                  <div style={{ ...chartCard, marginBottom: '1.5rem' }}>
                    <ChartHeader title="توزيع أوضاع اللعب" info="يوضح عدد مرات اختيار كل طور:\n• حروف مع عزيز 🏛️: الطور الكلاسيكي (بدون بطاقات)\n• حرب الحروف ⚔️: طور المنافسة (بطاقات + تأثيرات)" style={chartH3} />
                    {(() => {
                      const md = ad.mode_distribution;
                      if (!md) return <div style={{ color: C.txtMuted, fontSize: '0.82rem', textAlign: 'center', padding: '1rem' }}>شغّل migration 015 لتفعيل التتبع</div>;
                      const total = md.normal + md.tv_show;
                      if (total === 0) return <div style={{ color: C.txtMuted, fontSize: '0.82rem', textAlign: 'center', padding: '1rem' }}>لا توجد بيانات</div>;
                      const normalPct = Math.round((md.normal / total) * 100);
                      const tvPct = 100 - normalPct;
                      return (
                        <div style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? '1rem' : '2rem', flexDirection: isMobile ? 'column' : 'row' }}>
                          <DonutChart segments={[
                            { value: md.normal, color: '#7c3aed', label: 'حرب الحروف' },
                            { value: md.tv_show, color: C.goldLt, label: 'حروف مع عزيز' },
                          ]} />
                          {/* Visual comparison bars */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {[
                              { label: '🏛️ حروف مع عزيز', value: md.tv_show, pct: tvPct, color: C.goldLt },
                              { label: '⚔️ حرب الحروف', value: md.normal, pct: normalPct, color: '#7c3aed' },
                            ].map((m, i) => (
                              <div key={i}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.78rem' }}>
                                  <span style={{ color: C.txtSecondary }}>{m.label}</span>
                                  <span style={{ color: m.color, fontWeight: 800 }}>{m.value} <span style={{ color: C.txtMuted, fontWeight: 400 }}>({m.pct}%)</span></span>
                                </div>
                                <div style={{ height: '10px', borderRadius: '5px', background: C.borderSub, overflow: 'hidden' }}>
                                  <div style={{
                                    height: '100%', borderRadius: '5px',
                                    background: `linear-gradient(90deg, ${m.color}90, ${m.color})`,
                                    width: `${m.pct}%`, transition: 'width 0.6s ease',
                                  }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* ── Top Hosts + Players Trend ────────────────────────── */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>

                    {/* Top hosts */}
                    <div style={chartCard}>
                      <ChartHeader title="أكثر المضيفين نشاطاً" info="ترتيب المضيفين حسب عدد جلسات اللعب التي بدأوها. يساعد في معرفة المستخدمين الأكثر تفاعلاً مع المنصة." style={chartH3} />
                      {ad.top_hosts.length === 0 ? (
                        <div style={{ color: C.txtMuted, fontSize: '0.82rem', padding: '1rem', textAlign: 'center' }}>لا توجد بيانات</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {ad.top_hosts.slice(0, 8).map((host, i) => {
                            const maxCnt = ad.top_hosts[0]?.cnt || 1;
                            return (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{ fontSize: '0.75rem', color: i < 3 ? C.goldLt : C.txtMuted, fontWeight: 800, minWidth: '1.2rem' }}>
                                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '0.78rem', color: C.txtSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{host.email}</div>
                                  <div style={{ height: '4px', borderRadius: '2px', background: C.borderSub, marginTop: '0.2rem' }}>
                                    <div style={{ height: '100%', borderRadius: '2px', background: `linear-gradient(90deg, ${C.purple}, ${C.purpleLt})`, width: `${(host.cnt / maxCnt) * 100}%`, transition: 'width 0.5s ease' }} />
                                  </div>
                                </div>
                                <span style={{ fontSize: '0.75rem', color: C.txtPrimary, fontWeight: 700, whiteSpace: 'nowrap' }}>{host.cnt} جلسة</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Players per session — avg players/session per day */}
                    <div style={chartCard}>
                      <ChartHeader title="متوسط اللاعبين لكل جلسة" info="متوسط عدد اللاعبين الذين انضموا لكل جلسة في اليوم الواحد.\nمثال: إذا لعبت 3 جلسات وانضم 6 لاعبين → المتوسط = 2 لاعب/جلسة.\nيعكس مستوى التفاعل والمشاركة الفعلية." style={chartH3} />
                      {(() => {
                        const data = ad.daily_sessions.map(d => ({
                          label: d.d,
                          players: d.players,
                          sessions: d.sessions,
                          avg: d.sessions > 0 ? Math.round((d.players / d.sessions) * 10) / 10 : 0,
                        }));
                        if (!data.length) return <div style={{ color: C.txtMuted, fontSize: '0.8rem', padding: '2rem', textAlign: 'center' }}>لا توجد بيانات</div>;
                        const totalPlayers = data.reduce((s, d) => s + d.players, 0);
                        const totalSessions = data.reduce((s, d) => s + d.sessions, 0);
                        const overallAvg = totalSessions > 0 ? Math.round((totalPlayers / totalSessions) * 10) / 10 : 0;
                        const maxAvg = Math.max(...data.map(d => d.avg), 1);
                        const show = isMobile ? Math.min(data.length, 14) : Math.min(data.length, 21);
                        const slice = data.slice(-show);
                        return (
                          <>
                            {/* Big stat */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                              <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: isMobile ? '48px' : '56px', height: isMobile ? '48px' : '56px',
                                borderRadius: '50%', background: `${C.gold}15`, border: `2px solid ${C.goldLt}30`,
                              }}>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight: 800, color: C.goldLt, lineHeight: 1 }}>{overallAvg}</div>
                                  <div style={{ fontSize: '0.45rem', color: C.txtMuted }}>لاعب/جلسة</div>
                                </div>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: C.txtMuted, lineHeight: 1.5 }}>
                                <span style={{ color: C.txtSecondary }}>{totalPlayers}</span> لاعب في <span style={{ color: C.txtSecondary }}>{totalSessions}</span> جلسة
                              </div>
                            </div>
                            {/* Bar chart */}
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: isMobile ? '2px' : '3px', height: isMobile ? '65px' : '80px', marginBottom: '0.4rem' }}>
                              {slice.map((d, i) => {
                                const pct = (d.avg / maxAvg) * 100;
                                const isMax = d.avg === maxAvg && d.avg > 0;
                                return (
                                  <div key={i} title={`${d.label}: ${d.avg} لاعب/جلسة (${d.players} لاعب ÷ ${d.sessions} جلسة)`} style={{
                                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%',
                                  }}>
                                    {d.avg > 0 && (
                                      <span style={{ fontSize: '0.48rem', color: isMax ? C.goldLt : C.txtMuted, fontWeight: isMax ? 800 : 400, marginBottom: '2px' }}>{d.avg}</span>
                                    )}
                                    <div style={{
                                      width: '100%', borderRadius: '3px 3px 0 0',
                                      height: d.avg === 0 ? '2px' : `${Math.max(pct, 8)}%`,
                                      background: d.avg === 0
                                        ? 'rgba(255,255,255,0.04)'
                                        : isMax
                                          ? `linear-gradient(to top, ${C.gold}, ${C.goldLt})`
                                          : `rgba(251,191,36,${0.15 + (d.avg / maxAvg) * 0.65})`,
                                      transition: 'height 0.4s ease',
                                    }} />
                                  </div>
                                );
                              })}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: C.txtMuted }}>
                              <span>{slice[0]?.label?.slice(5)}</span>
                              <span>{slice[slice.length - 1]?.label?.slice(5)}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* ── Average Duration — enhanced ───────────────────────── */}
                  <div style={{ ...chartCard, marginBottom: '1.5rem' }}>
                    <ChartHeader title="متوسط مدة الجلسة" info="متوسط عدد الدقائق التي يقضيها المضيف في كل جلسة لعب. يساعد في فهم مدة التفاعل: جلسة 5-15 دقيقة = لعبة سريعة، أكثر من 30 دقيقة = جلسة طويلة." style={chartH3} />
                    {(() => {
                      const data = ad.daily_sessions.map(d => ({ label: d.d, value: d.avg_dur }));
                      const avgAll = data.length > 0 ? Math.round(data.reduce((s, d) => s + d.value, 0) / data.length) : 0;
                      return (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                            <div style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              width: isMobile ? '56px' : '68px', height: isMobile ? '56px' : '68px',
                              borderRadius: '50%', background: `${C.blue}20`, border: `2px solid ${C.blueLt}40`,
                            }}>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: 800, color: C.blueLt, lineHeight: 1 }}>{avgAll}</div>
                                <div style={{ fontSize: '0.5rem', color: C.txtMuted }}>دقيقة</div>
                              </div>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: C.txtMuted, lineHeight: 1.6 }}>
                              المتوسط العام لمدة الجلسات<br />
                              <span style={{ color: avgAll > 30 ? C.goldLt : avgAll > 10 ? C.greenLt : C.txtSecondary, fontWeight: 600 }}>
                                {avgAll > 30 ? 'جلسات طويلة ومشوّقة 🔥' : avgAll > 10 ? 'جلسات معتدلة 👍' : 'جلسات سريعة ⚡'}
                              </span>
                            </div>
                          </div>
                          <LineChart data={data} color={C.blueLt} height={70} />
                          {data.length > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', fontSize: '0.62rem', color: C.txtMuted }}>
                              <span>{data[0]?.label?.slice(5)}</span>
                              <span>{data[data.length - 1]?.label?.slice(5)}</span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </>
              )}

              {/* no data state */}
              {!analyticsLoading && !ad && (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: C.txtMuted }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: C.txtSecondary }}>لا توجد بيانات تحليلية</div>
                  <div style={{ fontSize: '0.85rem' }}>تأكد من تطبيق migration 014 في قاعدة البيانات</div>
                </div>
              )}
            </div>
          );
        })()}

      </div>

      {/* ══════ Partner Profile Modal ══════ */}
      {partnerProfileModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: C.overlay, backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
          onClick={() => setPartnerProfileModal(null)}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '1rem', padding: '1.75rem', width: '100%', maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: C.txtPrimary }}>ملف الشريك</div>
                <div style={{ fontSize: '0.78rem', color: C.txtSecondary, marginTop: '0.2rem', direction: 'ltr' }}>{partnerProfileModal.partner.email}</div>
              </div>
              <button onClick={() => setPartnerProfileModal(null)} style={{ ...btnGhost, padding: '0.35rem 0.7rem', fontSize: '0.9rem' }}>✕</button>
            </div>

            {profileLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: C.txtMuted }}>جارٍ التحميل...</div>
            ) : !partnerProfileModal.profile ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: C.txtMuted }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
                <div>لم يكمل هذا الشريك استبيان البيانات بعد</div>
              </div>
            ) : (
              <div>
                {[
                  { label: 'الاسم الكامل',  value: partnerProfileModal.profile.full_name },
                  { label: 'رقم واتساب',    value: partnerProfileModal.profile.whatsapp_number, dir: 'ltr' },
                  { label: 'الجنس',         value: partnerProfileModal.profile.gender === 'male' ? 'ذكر' : 'أنثى' },
                  { label: 'العمر',          value: String(partnerProfileModal.profile.age) },
                  { label: 'رابط المتجر',   value: partnerProfileModal.profile.store_link || '—', dir: 'ltr' },
                  { label: 'تاريخ التسجيل', value: partnerProfileModal.profile.created_at ? new Date(partnerProfileModal.profile.created_at).toLocaleDateString('ar-SA') : '—' },
                ].map(({ label, value, dir }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                    <span style={{ fontSize: '0.8rem', color: C.txtMuted }}>{label}</span>
                    <span style={{ fontSize: '0.875rem', color: C.txtPrimary, direction: dir as 'ltr' | undefined, fontFamily: dir ? 'monospace' : undefined }}>{value}</span>
                  </div>
                ))}
                {/* WhatsApp link */}
                {partnerProfileModal.profile.whatsapp_number && (
                  <a
                    href={`https://wa.me/${partnerProfileModal.profile.whatsapp_number.replace(/\D/g, '')}?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D8%8C%20%D9%86%D8%AD%D9%86%20%D8%A7%D9%84%D8%A5%D8%AF%D8%A7%D8%B1%D8%A9`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem', padding: '0.6rem', borderRadius: '0.6rem', background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.25)', color: '#25d366', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem', fontFamily: 'Tajawal, sans-serif' }}
                  >
                    📱 تواصل عبر واتساب
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════ Import Modal ══════ */}
      {showImport && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: C.overlay, backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
          onClick={() => { setShowImport(false); setImportStep(1); setImportData([]); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '1rem', padding: '1.75rem', width: '100%', maxWidth: '540px', maxHeight: '85vh', overflow: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: C.txtPrimary }}>استيراد الأسئلة</div>
                <div style={{ fontSize: '0.78rem', color: C.txtSecondary, marginTop: '0.2rem' }}>استيراد أسئلة المسابقات من ملفات CSV أو JSON</div>
              </div>
              <button onClick={() => { setShowImport(false); setImportStep(1); setImportData([]); }} style={{ ...btnGhost, padding: '0.35rem 0.7rem', fontSize: '0.9rem' }}>✕</button>
            </div>

            {/* Steps indicator */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem' }}>
              {[{ n: 1, l: 'رفع الملف' }, { n: 2, l: 'معاينة وتأكيد' }].map(({ n, l }) => (
                <div key={n} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0, background: importStep >= n ? C.purple : 'rgba(255,255,255,0.06)', color: importStep >= n ? '#fff' : C.txtMuted, border: `1px solid ${importStep >= n ? C.purple : C.border}` }}>{n}</div>
                  <div style={{ fontSize: '0.78rem', color: importStep >= n ? C.purpleLt : C.txtMuted }}>{l}</div>
                  {n < 2 && <div style={{ flex: 1, height: '1px', background: importStep > n ? C.purple : C.border, opacity: 0.5, margin: '0 0.25rem' }} />}
                </div>
              ))}
            </div>

            {importStep === 1 ? (
              <>
                {/* Drop zone */}
                <div
                  style={{ border: `2px dashed ${C.borderPurple}`, borderRadius: '0.75rem', padding: '2.5rem 1.5rem', textAlign: 'center', cursor: 'pointer', background: 'rgba(109,40,217,0.04)', transition: 'border-color 0.2s' }}
                  onClick={() => importFileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = C.purpleLt; }}
                  onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderPurple; }}
                  onDrop={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = C.borderPurple; const f = e.dataTransfer.files[0]; if (f) handleImportFile(f); }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.7 }}>📤</div>
                  <div style={{ fontWeight: 600, color: C.purpleLt, marginBottom: '0.3rem' }}>اسحب وأفلت ملفك هنا</div>
                  <div style={{ fontSize: '0.8rem', color: C.txtSecondary, marginBottom: '1.25rem' }}>أو انقر للاستعراض من جهازك</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                    {[{ ext: 'JSON', desc: 'مصفوفة JSON', color: C.goldLt }, { ext: 'CSV', desc: 'فصول بفواصل', color: C.greenLt }].map(f => (
                      <div key={f.ext} style={{ padding: '0.5rem 1rem', background: `${f.color}12`, border: `1px solid ${f.color}25`, borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '1.1rem' }}>📄</span>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.8rem', color: f.color }}>{f.ext}</div>
                          <div style={{ fontSize: '0.65rem', color: C.txtMuted }}>{f.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <input ref={importFileRef} type="file" accept=".json,.csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImportFile(f); }} />

                {importError && <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.875rem', background: 'rgba(185,28,28,0.1)', border: `1px solid rgba(185,28,28,0.2)`, borderRadius: '0.5rem', color: C.redLt, fontSize: '0.82rem' }}>{importError}</div>}

                {/* Format example */}
                <div style={{ marginTop: '1.25rem', padding: '1rem', background: C.cardAlt, borderRadius: '0.625rem', border: `1px solid ${C.borderSub}` }}>
                  <div style={{ fontSize: '0.75rem', color: C.txtSecondary, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>⚠️ مثال على الصيغة المطلوبة</div>
                  <div style={{ fontSize: '0.7rem', color: C.txtMuted, marginBottom: '0.4rem' }}>الحقول المطلوبة: <span style={{ color: C.purpleLt }}>question_text</span>، <span style={{ color: C.purpleLt }}>correct_answer</span>، <span style={{ color: C.purpleLt }}>letter_assigned</span>. الحقل <span style={{ color: C.purpleLt }}>category_id</span> اختياري.</div>
                  <pre style={{ fontSize: '0.72rem', color: C.txtSecondary, direction: 'ltr', margin: 0, lineHeight: 1.6, overflow: 'auto' }}>{`[
  {
    "question_text": "ما هي عاصمة المملكة؟",
    "correct_answer": "الرياض",
    "letter_assigned": "م",
    "category_id": 1
  }
]`}</pre>
                </div>
              </>
            ) : (
              <>
                {/* Preview */}
                <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(5,150,105,0.08)', border: `1px solid rgba(5,150,105,0.2)`, borderRadius: '0.5rem', color: C.greenLt, fontSize: '0.85rem', fontWeight: 600 }}>
                  ✅ تم قراءة {importData.length} سؤال بنجاح — تحقق من البيانات قبل الاستيراد
                </div>
                <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: '0.625rem', overflow: 'hidden', marginBottom: '1rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead style={{ background: C.card }}><tr>
                      <th style={tableTh}>#</th><th style={tableTh}>نص السؤال</th><th style={tableTh}>الإجابة</th><th style={tableTh}>الحرف</th>
                    </tr></thead>
                    <tbody>
                      {importData.slice(0, 8).map((q, i) => (
                        <tr key={i}>
                          <td style={{ ...tableTd, color: C.txtMuted, width: '28px' }}>{i + 1}</td>
                          <td style={{ ...tableTd, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.question_text}</td>
                          <td style={{ ...tableTd, color: C.greenLt }}>{q.correct_answer}</td>
                          <td style={{ ...tableTd, fontWeight: 700, color: C.purpleLt }}>{q.letter_assigned}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importData.length > 8 && <div style={{ padding: '0.5rem 1rem', fontSize: '0.72rem', color: C.txtMuted, textAlign: 'center', borderTop: `1px solid ${C.borderSub}` }}>+ {importData.length - 8} سؤال آخر</div>}
                </div>
                {importError && <div style={{ marginBottom: '0.75rem', padding: '0.6rem 0.875rem', background: 'rgba(185,28,28,0.1)', border: `1px solid rgba(185,28,28,0.2)`, borderRadius: '0.5rem', color: C.redLt, fontSize: '0.82rem' }}>{importError}</div>}
                {importSuccess && <div style={{ marginBottom: '0.75rem', padding: '0.6rem 0.875rem', background: 'rgba(5,150,105,0.1)', border: `1px solid rgba(5,150,105,0.2)`, borderRadius: '0.5rem', color: C.greenLt, fontSize: '0.85rem', fontWeight: 600 }}>{importSuccess}</div>}
                <div style={{ display: 'flex', gap: '0.625rem' }}>
                  <button style={{ ...btnGhost, flex: 1 }} onClick={() => { setImportStep(1); setImportData([]); }}>← رجوع</button>
                  <button style={{ ...btnPrimary, flex: 2 }} onClick={handleConfirmImport} disabled={importing || !!importSuccess}>
                    {importing ? 'جارٍ الاستيراد...' : `تأكيد استيراد ${importData.length} سؤال`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

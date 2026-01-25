# 📋 خطة التنفيذ الشاملة - نظام البطاقات المتقدم (v2.0)

## ✅ التحديثات المطلوبة

### 1️⃣ تحديث `src/store/useGameStore.ts`

#### إضافة حقول جديدة للـ State:
```typescript
interface GameStore {
  // ... الحقول الموجودة

  // 🔥 NEW: عداد السلسلة للإجابات الصحيحة
  correctAnswerStreak: { green: number; red: number };

  // 🎁 NEW: الحرف العشوائي المحدد في بداية الجولة
  randomLetterCell: HexCell | null;

  // NEW: دالة لاختيار الحرف العشوائي
  selectRandomLetter: () => void;

  // NEW: دالة لتحديث عداد السلسلة
  updateStreak: (team: 'green' | 'red', isCorrect: boolean) => void;
}
```

#### تحديث `claimCell`:
```typescript
claimCell: (cellId: string, team: Team) => {
  const { cells, settings, scores, currentRound, correctAnswerStreak } = get();
  const updated = cells.map((c) =>
    c.id === cellId ? { ...c, status: team as 'green' | 'red' } : c
  );

  set({ cells: updated });

  // 🔥 تحديث عداد السلسلة
  const newStreak = { ...correctAnswerStreak };
  const opponentTeam = team === 'green' ? 'red' : 'green';

  // زيادة عداد الفريق الفائز
  newStreak[team as 'green' | 'red']++;
  // إعادة تعيين عداد الخصم
  newStreak[opponentTeam] = 0;

  set({ correctAnswerStreak: newStreak });

  // 🎁 فحص: هل هذا هو الحرف العشوائي؟
  const { randomLetterCell } = get();
  let shouldShowRoulette = false;
  let rouletteReason: 'random' | 'streak' | 'golden' | 'hidden' | null = null;

  if (randomLetterCell && cellId === randomLetterCell.id) {
    shouldShowRoulette = true;
    rouletteReason = 'random';
  }

  // 🔥 فحص: هل وصل الفريق لـ 3 إجابات متتالية؟
  if (newStreak[team as 'green' | 'red'] === 3) {
    shouldShowRoulette = true;
    rouletteReason = 'streak';
    // إعادة تعيين العداد
    newStreak[team as 'green' | 'red'] = 0;
    set({ correctAnswerStreak: newStreak });
  }

  // ✨ فحص: هل هو حرف ذهبي؟
  const cell = cells.find(c => c.id === cellId);
  if (cell?.isGolden) {
    shouldShowRoulette = true;
    rouletteReason = 'golden';
  }

  // 🃏 فحص: هل يحتوي على بطاقة مخفية؟
  if (cell?.hasCard) {
    shouldShowRoulette = true;
    rouletteReason = 'hidden';
  }

  // 🎰 بث حدث الروليت إذا لزم الأمر
  if (shouldShowRoulette) {
    syncManager.broadcast({
      type: 'SHOW_ROULETTE',
      team,
      reason: rouletteReason,
      cellId,
    });
  }

  // ... باقي منطق الفوز
},
```

#### تحديث `selectRandomLetter`:
```typescript
selectRandomLetter: () => {
  const { cells, settings } = get();

  if (!settings.enableRandomLetter) {
    set({ randomLetterCell: null });
    return;
  }

  // اختيار حرف عشوائي من الخلايا غير المجابة
  // شرط: ليس ذهبي وليس فيه بطاقة مخفية
  const eligibleCells = cells.filter(
    c => c.status === 'unanswered' && !c.isGolden && !c.hasCard
  );

  if (eligibleCells.length === 0) {
    set({ randomLetterCell: null });
    return;
  }

  const randomIndex = Math.floor(Math.random() * eligibleCells.length);
  const selectedCell = eligibleCells[randomIndex];

  set({ randomLetterCell: selectedCell });

  // بث الحدث
  syncManager.broadcast({
    type: 'RANDOM_LETTER_SELECTED',
    cellId: selectedCell.id,
  });
},
```

#### تحديث `initializeGrid`:
```typescript
initializeGrid: (newSettings?: GameSettings) => {
  // ... كود التوليد الموجود

  set({
    cells: newCells,
    winner: null,
    winMessage: null,
    winningPath: [],
    settings: currentSettings,
    correctAnswerStreak: { green: 0, red: 0 }, // 🔥 إعادة تعيين السلسلة
    randomLetterCell: null, // سيتم اختياره لاحقاً
  });

  // ... بث الشبكة

  // 🎁 اختيار الحرف العشوائي بعد التهيئة
  const { selectRandomLetter } = get();
  selectRandomLetter();
},
```

#### تحديث `nextRound`:
```typescript
nextRound: () => {
  const { currentRound, settings, teamCards, carryCardsToNextRound } = get();
  const maxRounds = settings.rounds === 'infinite' ? Infinity : settings.rounds;

  if (currentRound < maxRounds) {
    set({
      currentRound: currentRound + 1,
      cells: [],
      winner: null,
      winMessage: null,
      winningPath: [],
      correctAnswerStreak: { green: 0, red: 0 }, // 🔥 إعادة تعيين
      randomLetterCell: null,
      // ✅ ترحيل البطاقات إذا كان مفعل
      teamCards: settings.carryCardsToNextRound ? teamCards : { green: [], red: [] },
    });

    // إعادة تهيئة الشبكة
    get().initializeGrid(settings);
  }
},
```

---

### 2️⃣ تحديث `src/components/CardRoulette.tsx`

#### تحديث نظام الأوزان الذكي:
```typescript
interface RouletteMode {
  mode: 'random' | 'streak' | 'golden' | 'hidden';
  team: 'green' | 'red';
}

// 🎰 نظام الأوزان الذكي (Adaptive Odds)
const getCardWeights = (mode: RouletteMode['mode']): CardOption[] => {
  switch (mode) {
    case 'golden':
      // ✨ الحرف الذهبي: أولوية للبطاقات الهجومية
      return [
        { id: 'battle', name: 'المعركة', icon: '⚔️', color: '#fb923c', probability: 0.35 },
        { id: 'bomb', name: 'القنبلة', icon: '💣', color: '#f87171', probability: 0.30 },
        { id: 'freeze', name: 'التجميد', icon: '❄️', color: '#60a5fa', probability: 0.25 },
        { id: 'shield', name: 'الدرع', icon: '🛡️', color: '#34d399', probability: 0.10 },
      ];

    case 'streak':
      // 🔥 سلسلة الإجابات: توازن بين الهجوم والدفاع
      return [
        { id: 'battle', name: 'المعركة', icon: '⚔️', color: '#fb923c', probability: 0.25 },
        { id: 'freeze', name: 'التجميد', icon: '❄️', color: '#60a5fa', probability: 0.25 },
        { id: 'shield', name: 'الدرع', icon: '🛡️', color: '#34d399', probability: 0.25 },
        { id: 'bomb', name: 'القنبلة', icon: '💣', color: '#f87171', probability: 0.25 },
      ];

    case 'random':
    case 'hidden':
    default:
      // 🎁 الحرف العشوائي / البطاقات المخفية: احتمالات متساوية
      return [
        { id: 'freeze', name: 'التجميد', icon: '❄️', color: '#60a5fa', probability: 0.25 },
        { id: 'bomb', name: 'القنبلة', icon: '💣', color: '#f87171', probability: 0.25 },
        { id: 'battle', name: 'المعركة', icon: '⚔️', color: '#fb923c', probability: 0.25 },
        { id: 'shield', name: 'الدرع', icon: '🛡️', color: '#34d399', probability: 0.25 },
      ];
  }
};
```

#### تحديث التصميم (Neon Glassmorphism):
```typescript
<div style={{
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'linear-gradient(135deg, rgba(10, 1, 24, 0.98) 0%, rgba(29, 11, 46, 0.98) 50%, rgba(45, 17, 84, 0.98) 100%)',
  backdropFilter: 'blur(20px) saturate(180%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2500,
  gap: '2rem',
  animation: 'fadeIn 0.5s ease-out',
}}>

  {/* Neon Border Effect */}
  <div style={{
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, #a855f7, #ec4899, #f97316, #fbbf24)',
    opacity: 0.1,
    pointerEvents: 'none',
  }} />

  {/* العنوان مع توهج نيون */}
  <h2 style={{
    fontSize: '3.5rem',
    fontWeight: 900,
    background: 'linear-gradient(135deg, #fbbf24, #f97316, #ec4899, #a855f7)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 40px rgba(251, 191, 36, 0.8), 0 0 80px rgba(249, 115, 22, 0.5)',
    animation: 'glow 2s ease-in-out infinite',
  }}>
    {isSpinning ? '🎰 جاري السحب...' : '🎉 مبروك!'}
  </h2>

  {/* ... باقي الكود */}
}
```

---

### 3️⃣ تحديث `src/components/HostScreen.tsx`

#### إضافة مزامنة الروليت:
```typescript
// في useEffect للمزامنة
React.useEffect(() => {
  const unsubscribe = syncManager.subscribe((data) => {
    if (data.type === 'SHOW_ROULETTE') {
      setShowRoulette(true);
      setRouletteMode({ mode: data.reason, team: data.team });
    }
    // ... باقي الأحداث
  });
  return unsubscribe;
}, []);

// تحديث handleRouletteComplete
const handleRouletteComplete = (card: CardType) => {
  setShowRoulette(false);

  // إضافة البطاقة للفريق الفائز
  const winningTeam = // ... تحديد الفريق من الـ state
  addCardToTeam(winningTeam, card);

  // ... باقي المنطق
};
```

---

### 4️⃣ تحديث `src/components/PlayersScreen.tsx`

#### إضافة الروليت في شاشة اللاعبين:
```typescript
import { CardRoulette } from './CardRoulette';

// ... في JSX
{showRoulette && (
  <CardRoulette
    onComplete={(card) => {
      setShowRoulette(false);
      // الروليت يظهر فقط للعرض في شاشة اللاعبين
      // لا يُنفذ أي منطق هنا
    }}
    mode={rouletteMode}
  />
)}
```

---

### 5️⃣ تحديث `src/components/GameSettings.tsx`

#### إزالة خيارات آلية الفوز المتعددة:
```typescript
// ❌ إزالة هذا القسم بالكامل:
// winCondition: 'wall-to-wall' | 'five-connected' | 'most-letters' | 'all'

// ✅ استبداله بـ:
// winCondition: 'wall-to-wall' (ثابت)

// في الإعدادات الافتراضية:
const [settings, setSettings] = useState<GameSettingsData>({
  // ... باقي الإعدادات
  winCondition: 'wall-to-wall', // ✅ ثابت وغير قابل للتغيير
  // ... باقي الإعدادات
});
```

#### تحديث واجهة "طرق الحصول على البطاقات":
```tsx
<div style={{ /* قسم جديد */ }}>
  <h3>🎁 طرق الحصول على البطاقات</h3>

  <label>
    <input
      type="checkbox"
      checked={settings.enableRandomLetter}
      onChange={(e) => setSettings(prev => ({
        ...prev,
        enableRandomLetter: e.target.checked
      }))}
    />
    <span>🎲 الحرف العشوائي (بداية كل جولة)</span>
    <p>يتم اختيار حرف عشوائي؛ من يجيب عليه يحصل على بطاقة فوراً</p>
  </label>

  <label>
    <input
      type="checkbox"
      checked={settings.enableStreakReward}
      onChange={(e) => setSettings(prev => ({
        ...prev,
        enableStreakReward: e.target.checked
      }))}
    />
    <span>🔥 سلسلة الإجابات (3 متتالية)</span>
    <p>عند تحقيق 3 إجابات صحيحة متتالية، يظهر الروليت للحصول على بطاقة</p>
  </label>

  <label>
    <input
      type="checkbox"
      checked={settings.enableHiddenCards}
      onChange={(e) => setSettings(prev => ({
        ...prev,
        enableHiddenCards: e.target.checked
      }))}
    />
    <span>🃏 البطاقات المخفية خلف الحروف</span>
    {settings.enableHiddenCards && (
      <input
        type="number"
        min="1"
        max="10"
        value={settings.hiddenCardsCount}
        onChange={(e) => setSettings(prev => ({
          ...prev,
          hiddenCardsCount: parseInt(e.target.value)
        }))}
      />
    )}
  </label>

  <label>
    <input
      type="checkbox"
      checked={settings.enableGoldenLetter}
      onChange={(e) => setSettings(prev => ({
        ...prev,
        enableGoldenLetter: e.target.checked
      }))}
    />
    <span>✨ الحرف الذهبي (أولوية للبطاقات الهجومية)</span>
  </label>
</div>

<div style={{ /* قسم ترحيل البطاقات */ }}>
  <h3>📦 ترحيل البطاقات بين الجولات</h3>

  <label>
    <input
      type="checkbox"
      checked={settings.carryCardsToNextRound}
      onChange={(e) => setSettings(prev => ({
        ...prev,
        carryCardsToNextRound: e.target.checked
      }))}
    />
    <span>✅ الاحتفاظ بالبطاقات عند الانتقال للجولة التالية</span>
    <p>إذا تم التفعيل، يحتفظ كل فريق بمخزونه من البطاقات عند بدء جولة جديدة</p>
  </label>
</div>
```

---

### 6️⃣ تحديث `src/utils/SyncManager.ts`

#### إضافة أحداث جديدة:
```typescript
type SyncEventType =
  | 'GRID_INITIALIZED'
  | 'CELL_CLAIMED'
  | 'SHOW_ROULETTE' // 🎰 NEW
  | 'RANDOM_LETTER_SELECTED' // 🎁 NEW
  | 'CARD_AWARDED' // 🃏 NEW
  | 'STREAK_UPDATED' // 🔥 NEW
  // ... باقي الأحداث
```

---

## 🎯 ملخص التغييرات الرئيسية

1. ✅ **آلية الفوز الموحدة:** Polar Connection فقط
2. ✅ **4 مسارات للحصول على البطاقات:**
   - 🎲 الحرف العشوائي (بداية الجولة)
   - 🔥 سلسلة 3 إجابات متتالية
   - 🃏 البطاقات المخفية
   - ✨ الحرف الذهبي (أوزان هجومية)
3. ✅ **نظام الأوزان الذكي** للروليت حسب السياق
4. ✅ **مزامنة الروليت** بين شاشة المقدم واللاعبين
5. ✅ **ترحيل البطاقات** بين الجولات (اختياري)
6. ✅ **تحديث تصميم الروليت** بنمط Neon Glassmorphism

---

## 📝 ملاحظات التنفيذ

- **الأولوية:** البدء بتحديث `useGameStore.ts` أولاً
- **الاختبار:** التأكد من عمل عداد السلسلة بشكل صحيح
- **المزامنة:** ضمان ظهور الروليت في نفس الوقت للجميع
- **الأمان:** إخفاء نسب الأوزان تماماً عن المستخدمين

---

تم إنشاء هذا الملف في: 2026-01-19
النسخة: v2.0

// src/components/PlayersScreen.tsx
// شاشة اللاعبين - عرض فقط (Synchronized with HostScreen design)

import React from 'react';
import { Users, Zap, HelpCircle } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { syncManager } from '../utils/SyncManager';
import { useScreenSize } from '../hooks/useScreenSize';
import { playBellSound, playCardSound } from '../utils/sounds';
import { HexGrid } from './HexGrid';
import { CardAnimation } from './CardAnimation';
import { CardRoulette } from './CardRoulette';
import { CardTeaserOverlay } from './CardTeaserOverlay';
import { StreakVisualizer } from './StreakVisualizer';
import { MatchScoreTracker } from './MatchScoreTracker';
import { MatchWinnerOverlay } from './MatchWinnerOverlay';
import { ResultsOverlay } from './ResultsOverlay';
import { BuzzerQRCodeModal } from './BuzzerQRCodeModal';
import { PlayerGuide } from './PlayerGuide';
import { getWinStats } from '../utils/winChecker';
import { useTheme } from '../context/ThemeContext';
import type { GameSettingsData } from './GameSettings';
import type { HexCell as HexCellType, CardType } from '../core/types';

// أيقونات البطاقات الأربعة
const CARD_ICONS: Record<CardType, string> = {
  freeze: '🧊',
  bomb: '💣',
  battle: '⚔️',
  shield: '🛡️',
};


interface PlayersScreenProps {
  settings: GameSettingsData | null;
  currentQuestion: string | null;
  selectedCell: HexCellType | null;
}

export const PlayersScreen: React.FC<PlayersScreenProps> = ({
  settings: initialSettings,
  currentQuestion,
  selectedCell,
}) => {
  // الإعدادات قد تأتي من المقدم عبر FULL_STATE_SYNC إذا لم تكن متاحة مباشرة
  const [localSettings, setLocalSettings] = React.useState<GameSettingsData | null>(() => {
    if (initialSettings) return initialSettings;
    // محاولة استرجاع من localStorage
    const stored = localStorage.getItem('current-game-settings');
    return stored ? JSON.parse(stored) : null;
  });
  const [isSyncing, setIsSyncing] = React.useState(!localSettings);
  const { cells, syncFromExternal, scores, teamCards, winStreak, currentRound } = useGameStore();
  const [cardAnimation, setCardAnimation] = React.useState<{ type: CardType | 'cardFound', message?: string } | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [showRoulette, setShowRoulette] = React.useState(false);
  const [rouletteTriggerType, setRouletteTriggerType] = React.useState<'card' | 'golden'>('card');
  const [syncedCard, setSyncedCard] = React.useState<CardType | null>(null);
  const [showRandomLetterAnnouncement, setShowRandomLetterAnnouncement] = React.useState(false);
  const [localStreak, setLocalStreak] = React.useState(winStreak);
  const [localScores, setLocalScores] = React.useState(scores);
  const [localCurrentRound, setLocalCurrentRound] = React.useState(currentRound);
  const [localMatchWinner, setLocalMatchWinner] = React.useState<'green' | 'red' | null>(null);
  const [localTeamCards, setLocalTeamCards] = React.useState(teamCards);
  const [colorsSwapped, setColorsSwapped] = React.useState(false); // حالة عكس الألوان
  const [selectedCellInfo, setSelectedCellInfo] = React.useState<{
    id: string;
    letter: string;
    hasCard: boolean;
    isGolden: boolean;
  } | null>(null); // الخلية المختارة من المقدم
  const [buzzerPress, setBuzzerPress] = React.useState<{
    type: 'answer' | 'card';
    playerName: string;
    team: 'green' | 'red';
    timestamp: number;
  } | null>(null); // حالة ضغط الزر
  const [registeredPlayers, setRegisteredPlayers] = React.useState<{
    name: string;
    team: 'green' | 'red';
    timestamp: number;
  }[]>([]); // اللاعبون المسجلون في Answer Buzzers

  const { isMobile, isTablet, isDesktop } = useScreenSize();
  const { theme } = useTheme();
  const [localWinner, setLocalWinner] = React.useState<'green' | 'red' | null>(null); // فائز الجولة
  const [localWinMessage, setLocalWinMessage] = React.useState<string | null>(null); // رسالة الفوز
  const [isPaused, setIsPaused] = React.useState(false); // حالة الإيقاف المؤقت
  const [showCardTeaser, setShowCardTeaser] = React.useState<{ letter: string; isGolden: boolean } | null>(null); // شاشة التشويق
  const [showBuzzerQRCode, setShowBuzzerQRCode] = React.useState(false); // إظهار QR Code للأزرار
  const [sessionEnded, setSessionEnded] = React.useState(false); // انتهت الجلسة
  const [forcedQuestion, setForcedQuestion] = React.useState<{ question: string; letter: string } | null>(null); // سؤال أظهره المقدم
  const [streakAnnouncement, setStreakAnnouncement] = React.useState<{ team: 'green' | 'red'; teamName: string } | null>(null); // إعلان السلسلة
  const [showGuide, setShowGuide] = React.useState(() => !localStorage.getItem('players-guide-done')); // إظهار دليل اللاعبين
  // session ID من URL أو localStorage — لا يحتاج إدخال يدوي
  const [sessionId] = React.useState(() => {
    const urlSession = new URLSearchParams(window.location.search).get('session');
    if (urlSession) {
      localStorage.setItem('game-session-id', urlSession);
      return urlSession;
    }
    return localStorage.getItem('game-session-id') || '';
  });

  // المزامنة فقط
  React.useEffect(() => {
    const unsubscribe = syncManager.subscribe((data) => {
      console.log('PlayersScreen received:', data.type);

      if (data.type === 'FULL_STATE_SYNC') {
        // استقبال حالة اللعبة الكاملة (عند الانضمام في منتصف اللعبة)
        console.log('📦 Full state sync received:', data.cells?.length, 'cells');
        if (data.cells) syncFromExternal(data.cells);
        if (data.settings) {
          localStorage.setItem('current-game-settings', JSON.stringify(data.settings));
          setLocalSettings(data.settings);
          setIsSyncing(false);
        }
        if (data.scores) setLocalScores(data.scores);
        if (data.currentRound) setLocalCurrentRound(data.currentRound);
        if (data.teamCards) setLocalTeamCards(data.teamCards);
        if (data.winStreak) setLocalStreak(data.winStreak);
        if (data.winner) setLocalWinner(data.winner); else setLocalWinner(null);
        if (data.winMessage) setLocalWinMessage(data.winMessage); else setLocalWinMessage(null);
        if (data.matchWinner) setLocalMatchWinner(data.matchWinner); else setLocalMatchWinner(null);
        if (data.colorsSwapped !== undefined) setColorsSwapped(data.colorsSwapped);
        if (data.isPaused !== undefined) setIsPaused(data.isPaused);
      } else if (data.type === 'GRID_INITIALIZED') {
        console.log('Syncing grid:', data.cells?.length, 'cells');
        if (data.cells) {
          syncFromExternal(data.cells);
        }
        if (data.settings) {
          // تحديث الإعدادات أيضاً
          localStorage.setItem('current-game-settings', JSON.stringify(data.settings));
        }
      } else if (data.type === 'CELL_SELECTED') {
        // تحديث الخلية المختارة (تظليل أصفر + إعلان)
        if (data.cellId && data.letter) {
          setSelectedCellInfo({
            id: data.cellId,
            letter: data.letter,
            hasCard: !!data.hasCard,
            isGolden: !!data.isGolden,
          });
        } else {
          setSelectedCellInfo(null);
        }
      } else if (data.type === 'CELL_CLAIMED') {
        syncFromExternal(data.cells);
        setSelectedCellInfo(null); // إزالة التظليل بعد المطالبة
      } else if (data.type === 'CARD_USED') {
        // تحديث الخلايا بعد استخدام البطاقة (التجميد، القنبلة، الدرع، المعركة)
        if (data.cells) {
          syncFromExternal(data.cells);
        }
        // تحديث البطاقات الممتلكة بعد استخدام بطاقة
        if (data.teamCards) {
          setLocalTeamCards(data.teamCards);
        }
      } else if (data.type === 'CARD_ANIMATION') {
        // أنيميشن البطاقة المنفصل
        setCardAnimation({
          type: data.cardType,
          message: data.message,
        });
      } else if (data.type === 'CARD_ADDED') {
        // تحديث البطاقات عند إضافة بطاقة جديدة
        if (data.teamCards) {
          setLocalTeamCards(data.teamCards);
        }
      } else if (data.type === 'CARDS_CLEARED') {
        // حذف جميع البطاقات من الفريقين
        console.log('🗑️ CARDS_CLEARED received in PlayersScreen:', data.teamCards);
        if (data.teamCards) {
          setLocalTeamCards(data.teamCards);
        }
      } else if (data.type === 'SESSION_ENDED') {
        setSessionEnded(true);
      } else if (data.type === 'ZOOM_CHANGED' && typeof data.zoom === 'number') {
        setZoom(data.zoom);
      } else if (data.type === 'CARD_TEASER') {
        // شاشة التشويق قبل كشف البطاقة
        setShowCardTeaser({ letter: data.letter, isGolden: !!data.isGolden });
      } else if (data.type === 'ROULETTE_START') {
        // بدء الروليت في شاشة اللاعبين
        setShowCardTeaser(null); // إخفاء شاشة التشويق
        setRouletteTriggerType(data.triggerType || 'card');
        setSyncedCard(null);
        setShowRoulette(true);
      } else if (data.type === 'ROULETTE_END') {
        // انتهاء الروليت - تحديث البطاقة المختارة
        setSyncedCard(data.card);
      } else if (data.type === 'CARD_FOUND') {
        // رسالة ظهور البطاقة (قبل السؤال)
        setCardAnimation({
          type: data.cardType,
          message: data.message,
        });
      } else if (data.type === 'CARD_WON') {
        // رسالة فوز الفريق بالبطاقة (بعد الإجابة)
        setCardAnimation({
          type: data.cardType,
          message: data.message,
        });
      } else if (data.type === 'RANDOM_LETTER_ANNOUNCEMENT') {
        // إعلان الحرف العشوائي
        setShowRandomLetterAnnouncement(true);
        // إخفاء الإعلان بعد 4 ثوانٍ
        setTimeout(() => {
          setShowRandomLetterAnnouncement(false);
        }, 4000);
      } else if (data.type === 'STREAK_UPDATED') {
        // تحديث سلسلة الإجابات
        setLocalStreak(data.winStreak);
      } else if (data.type === 'GAME_WON') {
        // تحديث النتيجة عند فوز فريق
        if (data.scores) {
          setLocalScores(data.scores);
        }
        if (data.round) {
          setLocalCurrentRound(data.round);
        }
        // تحديث فائز الجولة ورسالة الفوز
        if (data.winner) {
          setLocalWinner(data.winner);
        }
        if (data.winMessage) {
          setLocalWinMessage(data.winMessage);
        }
        // فحص الفوز بالمباراة
        if (data.matchWinner) {
          setLocalMatchWinner(data.matchWinner);
        }
      } else if (data.type === 'MATCH_RESET') {
        // إعادة تعيين المباراة
        setLocalScores({ green: 0, red: 0 });
        setLocalCurrentRound(1);
        setLocalMatchWinner(null);
        setLocalStreak({ green: 0, red: 0 });
        setLocalTeamCards({ green: [], red: [] });
        setLocalWinner(null);
        setLocalWinMessage(null);
      } else if (data.type === 'ROUND_STARTED') {
        // بدء جولة جديدة - إعادة تعيين الفائز
        setLocalWinner(null);
        setLocalWinMessage(null);
        setSelectedCellInfo(null);
      } else if (data.type === 'COUNTERS_UPDATED') {
        // تحديث عدادات التجميد والدرع
        if (data.cells) {
          syncFromExternal(data.cells);
        }
      } else if (data.type === 'SETTINGS_UPDATED') {
        // تحديث الإعدادات وحالة عكس الألوان
        if (data.colorsSwapped !== undefined) {
          setColorsSwapped(data.colorsSwapped);
        }
      } else if (data.type === 'GAME_PAUSED') {
        // تحديث حالة الإيقاف المؤقت
        setIsPaused(data.isPaused);
      } else if (data.type === 'buzzer-press') {
        // تشغيل الصوت المناسب
        if (data.buzzerPress.type === 'answer') {
          playBellSound();
        } else {
          playCardSound();
        }
        // عرض إشعار الزر المضغوط - فقط أول من ضغط (timestamp أقل)
        setBuzzerPress(prev => {
          // إذا لم يكن هناك ضغطة سابقة، قبول الضغطة الجديدة
          if (!prev) {
            console.log('✅ First buzzer press accepted:', data.buzzerPress.playerName, data.buzzerPress.timestamp);
            return data.buzzerPress;
          }

          // إذا كانت الضغطة الجديدة أقدم (timestamp أقل)، قبولها
          if (data.buzzerPress.timestamp < prev.timestamp) {
            console.log('⚡ Earlier buzzer press found! Replacing:', data.buzzerPress.playerName, 'was faster than', prev.playerName);
            return data.buzzerPress;
          }

          // رفض الضغطة المتأخرة
          console.log('❌ Later buzzer press rejected:', data.buzzerPress.playerName, 'was slower than', prev.playerName);
          return prev;
        });
      } else if (data.type === 'SHOW_QUESTION_TO_PLAYERS') {
        // المقدم اختار إظهار السؤال للاعبين
        if (data.question) {
          setForcedQuestion({ question: data.question, letter: data.letter ?? '' });
        }
      } else if (data.type === 'HIDE_QUESTION_FROM_PLAYERS') {
        setForcedQuestion(null);
      } else if (data.type === 'STREAK_REWARD_ANNOUNCEMENT') {
        // إعلان 3 إجابات متتالية
        if (data.team) {
          setStreakAnnouncement({ team: data.team, teamName: data.teamName ?? data.team });
          // إخفاء تلقائي بعد 4 ثوانٍ
          setTimeout(() => setStreakAnnouncement(null), 4000);
        }
      } else if (data.type === 'reset-buzzers') {
        // إعادة تعيين الأزرار
        setBuzzerPress(null);
      } else if (data.type === 'player-registered') {
        // إضافة لاعب جديد إلى القائمة
        setRegisteredPlayers(prev => {
          // تحقق من عدم التكرار بناءً على الاسم والفريق
          const exists = prev.some(p => p.name === data.player.name && p.team === data.player.team);
          if (exists) return prev;
          return [...prev, data.player];
        });
      }
    });
    return unsubscribe;
  }, [syncFromExternal]);

  // Debug: عرض حالة الشبكة
  React.useEffect(() => {
    console.log('PlayersScreen cells:', cells.length);
  }, [cells]);

  // إذا لم تتوفر الإعدادات بعد - انتظار المزامنة مع المقدم
  if (isSyncing || !localSettings) {
    return (
      <div style={{
        minHeight: '100vh',
        background: theme.bgGradient,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2rem',
      }}>
        {/* Spinner */}
        <div style={{
          width: isMobile ? '60px' : '76px',
          height: isMobile ? '60px' : '76px',
          border: `5px solid ${theme.cardBorder}`,
          borderTopColor: theme.accent,
          borderRadius: '50%',
          animation: 'spin 0.9s linear infinite',
        }} />

        <div style={{ textAlign: 'center', padding: '0 1.5rem' }}>
          <div style={{
            color: theme.textPrimary,
            fontSize: isMobile ? '1.3rem' : '1.6rem',
            fontWeight: 800,
            marginBottom: '0.6rem',
          }}>
            🎮 جاري الاتصال بشاشة المقدم...
          </div>
          <div style={{
            color: theme.textSecondary,
            fontSize: isMobile ? '0.9rem' : '1rem',
          }}>
            انتظر حتى يبدأ المقدم الجلسة
          </div>
        </div>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  // الإعدادات متاحة - عرض الشاشة الكاملة
  const settings = localSettings;

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.bgGradient,
      padding: isMobile ? '0.75rem' : '1rem',
      // paddingTop يعوّض ارتفاع MatchScoreTracker (عنوان + لوحة + معلومات الجولة)
      paddingTop: isMobile ? '115px' : isTablet ? '118px' : '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: isMobile || isTablet ? 'flex-start' : 'center',
      gap: isMobile ? '0.6rem' : '1rem',
      position: 'relative',
      overflowX: 'hidden',
    }}>


      {/* زر الدليل - عائم يسار */}
      <button
        onClick={() => setShowGuide(true)}
        style={{
          position: 'fixed',
          bottom: isMobile ? '1rem' : '1.5rem',
          left: isMobile ? '1rem' : '1.5rem',
          zIndex: 1000,
          width: isMobile ? '48px' : '56px',
          height: isMobile ? '48px' : '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #a855f7, #8b5cf6)',
          border: '3px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 8px 24px rgba(168, 85, 247, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 12px 32px rgba(168, 85, 247, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(168, 85, 247, 0.4)';
        }}
        title="دليل اللاعبين"
      >
        <HelpCircle size={isMobile ? 24 : 28} color="white" />
      </button>

      {/* زر Answer Buzzers - عائم */}
      <button
        onClick={() => setShowBuzzerQRCode(true)}
        style={{
          position: 'fixed',
          bottom: isMobile ? '1rem' : '1.5rem',
          right: isMobile ? '1rem' : '1.5rem',
          zIndex: 1000,
          width: isMobile ? '48px' : '56px',
          height: isMobile ? '48px' : '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #f59e0b, #f97316)',
          border: '3px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 12px 32px rgba(245, 158, 11, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(245, 158, 11, 0.4)';
        }}
        title="Answer Buzzers - افتح شاشة الأزرار"
      >
        <Zap size={isMobile ? 24 : 28} color="white" />
      </button>

      {/* لوحتي الفريقين - صف أفقي على الموبايل/التابلت */}
      {!isDesktop && (
        <div style={{
          display: 'flex',
          gap: isMobile ? '0.5rem' : '0.75rem',
          width: '100%',
          maxWidth: '1400px',
        }}>
          {/* بطاقة الفريق الأخضر - مطابقة لشاشة المقدم */}
          <div style={{
            flex: 1,
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '2px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '1rem',
            padding: isMobile ? '0.75rem' : '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '0.5rem' : '0.75rem',
          }}>
            <div style={{
              width: isMobile ? '36px' : '42px',
              height: isMobile ? '36px' : '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10b981, #14b8a6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Users size={isMobile ? 18 : 22} color="white" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: isMobile ? '0.75rem' : '0.875rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {settings.teamNames.green}
              </div>
              <div style={{ fontSize: isMobile ? '1.75rem' : '2.25rem', fontWeight: 900, color: '#10b981', lineHeight: 1 }}>
                {localScores.green}
              </div>
            </div>
            {localTeamCards.green.length > 0 && (
              <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {localTeamCards.green.map((card, idx) => (
                  <span key={idx} style={{ fontSize: isMobile ? '1rem' : '1.25rem' }}>{CARD_ICONS[card]}</span>
                ))}
              </div>
            )}
          </div>

          {/* بطاقة الفريق الأحمر - مطابقة لشاشة المقدم */}
          <div style={{
            flex: 1,
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '2px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '1rem',
            padding: isMobile ? '0.75rem' : '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '0.5rem' : '0.75rem',
          }}>
            <div style={{
              width: isMobile ? '36px' : '42px',
              height: isMobile ? '36px' : '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Users size={isMobile ? 18 : 22} color="white" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: isMobile ? '0.75rem' : '0.875rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {settings.teamNames.red}
              </div>
              <div style={{ fontSize: isMobile ? '1.75rem' : '2.25rem', fontWeight: 900, color: '#ef4444', lineHeight: 1 }}>
                {localScores.red}
              </div>
            </div>
            {localTeamCards.red.length > 0 && (
              <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {localTeamCards.red.map((card, idx) => (
                  <span key={idx} style={{ fontSize: isMobile ? '1rem' : '1.25rem' }}>{CARD_ICONS[card]}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Layout - Desktop فقط */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '1400px',
      }}>

        {/* Left Panel - Green Team - Desktop فقط */}
        {isDesktop && (
        <div style={{
          width: '200px',
          minWidth: '200px',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '2px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '1.5rem',
          padding: '1.5rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
        }}>
          {/* Team Icon */}
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981, #14b8a6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
            margin: '0 auto',
          }}>
            <Users size={28} color="white" />
          </div>

          {/* Team Name */}
          <div style={{
            textAlign: 'center',
            fontSize: '1.125rem',
            fontWeight: 700,
            color: '#10b981',
          }}>
            {settings.teamNames.green}
          </div>

          {/* Score */}
          <div style={{
            fontSize: '4rem',
            fontWeight: 900,
            color: '#10b981',
            textShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
            lineHeight: 1,
            textAlign: 'center',
          }}>
            {scores.green}
          </div>

          {/* Card Inventory */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '1rem',
            padding: '1rem',
            minHeight: '80px',
          }}>
            <div style={{
              fontSize: '0.875rem',
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '0.75rem',
              textAlign: 'center',
            }}>
              البطاقات الممتلكة
            </div>

            {localTeamCards.green.length > 0 ? (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                justifyContent: 'center',
              }}>
                {localTeamCards.green.map((card, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(20, 184, 166, 0.3))',
                      border: '2px solid rgba(16, 185, 129, 0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                    }}
                  >
                    {CARD_ICONS[card]}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '0.875rem',
                textAlign: 'center',
                padding: '1rem 0',
              }}>
                لا توجد بطاقات
              </div>
            )}
          </div>

          {/* اللاعبون المسجلون في Answer Buzzers */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '1rem',
            padding: '1rem',
          }}>
            <div style={{
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.6)',
              marginBottom: '0.75rem',
              textAlign: 'center',
            }}>
              📱 Answer Buzzers ({registeredPlayers.filter(p => p.team === 'green').length})
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}>
              {registeredPlayers.filter(p => p.team === 'green').length > 0 ? (
                registeredPlayers.filter(p => p.team === 'green').map((player, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '0.5rem',
                      padding: '0.5rem',
                      color: '#10b981',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textAlign: 'center',
                    }}
                  >
                    {player.name}
                  </div>
                ))
              ) : (
                <div style={{
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontSize: '0.75rem',
                  textAlign: 'center',
                  fontStyle: 'italic',
                }}>
                  لا يوجد لاعبون
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Center Area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
        }}>

          {/* Grid Area */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            width: '100%',
            overflow: 'hidden',
            minHeight: isMobile ? '260px' : isTablet ? '380px' : '500px',
          }}>
            <HexGrid
              cells={cells}
              zoom={zoom}
              scale={1}
              showCardIndicator={false}
              colorsSwapped={colorsSwapped}
              selectedCellId={selectedCellInfo?.id ?? null}
            />
          </div>
        </div>

        {/* Right Panel - Red Team - Desktop فقط */}
        {isDesktop && (
        <div style={{
          width: '200px',
          minWidth: '200px',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '2px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '1.5rem',
          padding: '1.5rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
        }}>
          {/* Team Icon */}
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
            margin: '0 auto',
          }}>
            <Users size={28} color="white" />
          </div>

          {/* Team Name */}
          <div style={{
            textAlign: 'center',
            fontSize: '1.125rem',
            fontWeight: 700,
            color: '#ef4444',
          }}>
            {settings.teamNames.red}
          </div>

          {/* Score */}
          <div style={{
            fontSize: '4rem',
            fontWeight: 900,
            color: '#ef4444',
            textShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
            lineHeight: 1,
            textAlign: 'center',
          }}>
            {scores.red}
          </div>

          {/* Card Inventory */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '1rem',
            padding: '1rem',
            minHeight: '80px',
          }}>
            <div style={{
              fontSize: '0.875rem',
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '0.75rem',
              textAlign: 'center',
            }}>
              البطاقات الممتلكة
            </div>

            {localTeamCards.red.length > 0 ? (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                justifyContent: 'center',
              }}>
                {localTeamCards.red.map((card, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(220, 38, 38, 0.3))',
                      border: '2px solid rgba(239, 68, 68, 0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                    }}
                  >
                    {CARD_ICONS[card]}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '0.875rem',
                textAlign: 'center',
                padding: '1rem 0',
              }}>
                لا توجد بطاقات
              </div>
            )}
          </div>

          {/* اللاعبون المسجلون في Answer Buzzers */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '1rem',
            padding: '1rem',
          }}>
            <div style={{
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.6)',
              marginBottom: '0.75rem',
              textAlign: 'center',
            }}>
              📱 Answer Buzzers ({registeredPlayers.filter(p => p.team === 'red').length})
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}>
              {registeredPlayers.filter(p => p.team === 'red').length > 0 ? (
                registeredPlayers.filter(p => p.team === 'red').map((player, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '0.5rem',
                      padding: '0.5rem',
                      color: '#ef4444',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textAlign: 'center',
                    }}
                  >
                    {player.name}
                  </div>
                ))
              ) : (
                <div style={{
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontSize: '0.75rem',
                  textAlign: 'center',
                  fontStyle: 'italic',
                }}>
                  لا يوجد لاعبون
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>

      {/* عداد نتيجة المباراة */}
      <MatchScoreTracker
        greenScore={localScores.green}
        redScore={localScores.red}
        greenTeamName={settings.teamNames.green}
        redTeamName={settings.teamNames.red}
        totalRounds={settings.rounds}
        gameName={settings.gameName}
        currentRound={localCurrentRound}
      />

      {/* عداد سلسلة الإجابات */}
      <StreakVisualizer
        greenStreak={localStreak.green}
        redStreak={localStreak.red}
        greenTeamName={settings.teamNames.green}
        redTeamName={settings.teamNames.red}
        enabled={settings.enableStreakReward ?? false}
      />

      {/* نافذة السؤال (اختيارية) */}
      {settings.showQuestionsToTeams && currentQuestion && selectedCell && (
        <div style={{
          position: 'fixed',
          bottom: isMobile ? '1rem' : '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: isMobile ? '95%' : '600px',
          width: '90%',
          background: 'linear-gradient(135deg, #1a0b2e, #2d1154)',
          border: '3px solid rgba(168, 85, 247, 0.5)',
          borderRadius: '1.5rem',
          padding: isMobile ? '1.25rem' : '2rem',
          zIndex: 100,
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: isMobile ? '0.75rem' : '1rem',
          }}>
            <div style={{
              display: 'inline-block',
              padding: isMobile ? '0.75rem 1.25rem' : '1rem 1.5rem',
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              borderRadius: '1rem',
              fontSize: isMobile ? '1.75rem' : '2.5rem',
              fontWeight: 900,
              color: 'white',
            }}>
              {selectedCell.letter}
            </div>
          </div>

          <div style={{
            color: 'white',
            fontSize: isMobile ? '1rem' : '1.25rem',
            fontWeight: 700,
            textAlign: 'center',
          }}>
            {currentQuestion}
          </div>

          <div style={{
            marginTop: isMobile ? '0.75rem' : '1rem',
            textAlign: 'center',
            color: '#a855f7',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
          }}>
            ⏳ جاري الإجابة...
          </div>
        </div>
      )}

      {/* أنيميشن البطاقة */}
      {cardAnimation && (
        <CardAnimation
          type={cardAnimation.type}
          message={cardAnimation.message}
          onComplete={() => setCardAnimation(null)}
        />
      )}

      {/* 🟡 بانر الخلية المختارة من المقدم */}
      {selectedCellInfo && !showRoulette && !showRandomLetterAnnouncement && (
        <div style={{
          position: 'fixed',
          top: isMobile ? '118px' : isTablet ? '122px' : '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1500,
          animation: 'cellSelectedIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          pointerEvents: 'none',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '0.6rem' : '0.85rem',
            padding: isMobile ? '0.6rem 1.2rem' : '0.75rem 1.75rem',
            background: selectedCellInfo.isGolden
              ? 'linear-gradient(135deg, rgba(251,191,36,0.95), rgba(245,158,11,0.95))'
              : selectedCellInfo.hasCard
              ? 'linear-gradient(135deg, rgba(236,72,153,0.95), rgba(168,85,247,0.95))'
              : 'linear-gradient(135deg, rgba(30,10,60,0.95), rgba(50,20,90,0.92))',
            border: selectedCellInfo.isGolden
              ? '3px solid #fde68a'
              : selectedCellInfo.hasCard
              ? '3px solid #f9a8d4'
              : '3px solid rgba(251,191,36,0.7)',
            borderRadius: '2rem',
            boxShadow: selectedCellInfo.isGolden
              ? '0 0 30px rgba(251,191,36,0.5), 0 8px 25px rgba(0,0,0,0.4)'
              : selectedCellInfo.hasCard
              ? '0 0 30px rgba(236,72,153,0.5), 0 8px 25px rgba(0,0,0,0.4)'
              : '0 0 30px rgba(251,191,36,0.35), 0 8px 25px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(10px)',
          }}>
            {/* الحرف */}
            <div style={{
              width: isMobile ? '44px' : '54px',
              height: isMobile ? '44px' : '54px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.25)',
              border: '3px solid rgba(255,255,255,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isMobile ? '1.4rem' : '1.75rem',
              fontWeight: 900,
              color: 'white',
              flexShrink: 0,
              animation: 'letterPulse 1.2s ease-in-out infinite',
            }}>
              {selectedCellInfo.letter}
            </div>

            {/* النص */}
            <div>
              <div style={{
                fontSize: isMobile ? '0.85rem' : '1rem',
                fontWeight: 900,
                color: 'white',
                textShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }}>
                {selectedCellInfo.isGolden
                  ? '✨ حرف ذهبي! من يجيب يحصل على بطاقة نادرة'
                  : selectedCellInfo.hasCard
                  ? '🎴 هذا الحرف يخفي بطاقة! من يجيب يفوز بها'
                  : '🔤 الحرف المطلوب للإجابة'}
              </div>
              {(selectedCellInfo.hasCard || selectedCellInfo.isGolden) && (
                <div style={{
                  fontSize: isMobile ? '0.72rem' : '0.8rem',
                  color: 'rgba(255,255,255,0.85)',
                  marginTop: '0.2rem',
                  fontWeight: 700,
                }}>
                  🎯 أجب بشكل صحيح لتحصل على البطاقة!
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* إعلان الحرف العشوائي */}
      {showRandomLetterAnnouncement && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.95), rgba(236, 72, 153, 0.95))',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
        }}>
          <div style={{
            fontSize: isMobile ? '5rem' : '8rem',
            marginBottom: isMobile ? '1rem' : '2rem',
            animation: 'bounce 0.6s ease-in-out infinite',
          }}>
            🎲
          </div>
          <h1 style={{
            fontSize: isMobile ? '2rem' : '3.5rem',
            fontWeight: 900,
            color: 'white',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.25)',
            textAlign: 'center',
            margin: 0,
          }}>
            حرف عشوائي!
          </h1>
          <p style={{
            fontSize: isMobile ? '1.1rem' : '1.75rem',
            color: 'rgba(255, 255, 255, 0.9)',
            marginTop: isMobile ? '1rem' : '1.5rem',
            textAlign: 'center',
          }}>
            من يجيب عليه سيحصل على بطاقة! 🎁
          </p>
          <style>{`
            @keyframes bounce {
              0%, 100% { transform: translateY(0) rotate(-5deg); }
              50% { transform: translateY(-20px) rotate(5deg); }
            }
          `}</style>
        </div>
      )}

      {/* ── سؤال أظهره المقدم اختيارياً ── */}
      {forcedQuestion && (
        <div style={{
          position: 'fixed',
          bottom: isMobile ? '1rem' : '1.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          width: isMobile ? '93vw' : isTablet ? '75vw' : '560px',
          background: 'linear-gradient(145deg, rgba(26,11,46,0.97), rgba(8,0,20,0.97))',
          border: '2px solid rgba(168,85,247,0.55)',
          borderRadius: isMobile ? '1rem' : '1.4rem',
          padding: isMobile ? '1rem 1.1rem' : '1.5rem 1.75rem',
          zIndex: 300,
          direction: 'rtl',
          boxShadow: '0 8px 40px rgba(168,85,247,0.35), 0 20px 60px rgba(0,0,0,0.6)',
          animation: 'fqSlideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          {/* شريط علوي بنفسجي */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
            background: 'linear-gradient(90deg,#a855f7,#ec4899,#a855f7)',
            borderRadius: '1.4rem 1.4rem 0 0',
          }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            {/* الحرف */}
            {forcedQuestion.letter && (
              <div style={{
                flexShrink: 0,
                width: isMobile ? '40px' : '52px',
                height: isMobile ? '40px' : '52px',
                background: 'linear-gradient(135deg,#a855f7,#ec4899)',
                borderRadius: '0.7rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '1.25rem' : '1.6rem',
                fontWeight: 900,
                color: 'white',
                boxShadow: '0 4px 16px rgba(168,85,247,0.4)',
              }}>
                {forcedQuestion.letter}
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* بادج "السؤال" */}
              <div style={{
                display: 'inline-block',
                padding: '0.18rem 0.6rem',
                background: 'rgba(168,85,247,0.2)',
                border: '1px solid rgba(168,85,247,0.4)',
                borderRadius: '0.5rem',
                fontSize: isMobile ? '0.65rem' : '0.72rem',
                fontWeight: 700,
                color: '#c084fc',
                marginBottom: '0.35rem',
              }}>
                📺 السؤال
              </div>

              {/* نص السؤال */}
              <div style={{
                color: 'white',
                fontSize: isMobile ? '0.95rem' : '1.1rem',
                fontWeight: 700,
                lineHeight: 1.45,
              }}>
                {forcedQuestion.question}
              </div>

              <div style={{
                marginTop: '0.5rem',
                fontSize: isMobile ? '0.72rem' : '0.8rem',
                color: 'rgba(168,85,247,0.7)',
                fontWeight: 600,
              }}>
                ⏳ جاري الإجابة…
              </div>
            </div>
          </div>

          <style>{`
            @keyframes fqSlideUp { from { opacity:0; transform:translateX(-50%) translateY(20px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
          `}</style>
        </div>
      )}

      {/* ── إعلان 3 إجابات متتالية ── */}
      {streakAnnouncement && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 4000,
          pointerEvents: 'none',
          direction: 'rtl',
        }}>
          {/* طبقة ضوئية ملونة */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: streakAnnouncement.team === 'green'
              ? 'radial-gradient(ellipse at center, rgba(16,185,129,0.22) 0%, transparent 70%)'
              : 'radial-gradient(ellipse at center, rgba(239,68,68,0.22) 0%, transparent 70%)',
            animation: 'strPulse 0.6s ease-in-out infinite alternate',
          }} />

          {/* البطاقة المركزية */}
          <div style={{
            position: 'relative',
            maxWidth: isMobile ? '85vw' : '460px',
            width: '100%',
            background: 'linear-gradient(145deg, rgba(26,11,46,0.97), rgba(8,0,20,0.97))',
            border: `2.5px solid ${streakAnnouncement.team === 'green' ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)'}`,
            borderRadius: isMobile ? '1.4rem' : '1.8rem',
            padding: isMobile ? '1.75rem 1.5rem' : '2.5rem 2rem',
            textAlign: 'center',
            boxShadow: streakAnnouncement.team === 'green'
              ? '0 0 60px rgba(16,185,129,0.4), 0 30px 80px rgba(0,0,0,0.7)'
              : '0 0 60px rgba(239,68,68,0.4), 0 30px 80px rgba(0,0,0,0.7)',
            animation: 'strSlideIn 0.45s cubic-bezier(0.34,1.56,0.64,1)',
            overflow: 'hidden',
          }}>
            {/* شريط علوي */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
              background: streakAnnouncement.team === 'green'
                ? 'linear-gradient(90deg,#10b981,#14b8a6,#10b981)'
                : 'linear-gradient(90deg,#ef4444,#f97316,#ef4444)',
              borderRadius: '1.8rem 1.8rem 0 0',
            }} />

            {/* أيقونة النار */}
            <div style={{
              fontSize: isMobile ? '3rem' : '4.5rem',
              marginBottom: isMobile ? '0.5rem' : '0.75rem',
              animation: 'strFire 0.5s ease-in-out infinite alternate',
              filter: 'drop-shadow(0 0 16px rgba(251,191,36,0.9))',
              lineHeight: 1,
            }}>
              🔥
            </div>

            {/* "3 إجابات متتالية" */}
            <div style={{
              fontSize: isMobile ? '0.85rem' : '1rem',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.55)',
              letterSpacing: '0.04em',
              marginBottom: '0.3rem',
            }}>
              3 إجابات متتالية!
            </div>

            {/* اسم الفريق */}
            <div style={{
              fontSize: isMobile ? '1.6rem' : '2.2rem',
              fontWeight: 900,
              color: streakAnnouncement.team === 'green' ? '#10b981' : '#ef4444',
              textShadow: streakAnnouncement.team === 'green'
                ? '0 0 28px rgba(16,185,129,0.7)'
                : '0 0 28px rgba(239,68,68,0.7)',
              marginBottom: isMobile ? '0.5rem' : '0.75rem',
              lineHeight: 1.2,
            }}>
              {streakAnnouncement.teamName}
            </div>

            {/* رسالة المكافأة */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: isMobile ? '0.4rem 0.9rem' : '0.5rem 1.25rem',
              background: 'rgba(251,191,36,0.15)',
              border: '1.5px solid rgba(251,191,36,0.4)',
              borderRadius: '0.75rem',
              fontSize: isMobile ? '0.82rem' : '0.95rem',
              fontWeight: 700,
              color: '#fbbf24',
            }}>
              🎁 يستحق بطاقة مكافأة!
            </div>

            {/* شريط تقدم الوقت */}
            <div style={{
              position: 'absolute',
              bottom: 0, left: 0,
              height: '3px',
              width: '100%',
              background: `${streakAnnouncement.team === 'green' ? '#10b981' : '#ef4444'}55`,
              borderRadius: '0 0 1.8rem 1.8rem',
            }}>
              <div style={{
                height: '100%',
                width: '100%',
                background: streakAnnouncement.team === 'green' ? '#10b981' : '#ef4444',
                borderRadius: 'inherit',
                animation: 'strTimer 4s linear forwards',
                transformOrigin: 'right',
              }} />
            </div>
          </div>

          <style>{`
            @keyframes strSlideIn { from { opacity:0; transform:translateY(-30px) scale(0.88); } to { opacity:1; transform:translateY(0) scale(1); } }
            @keyframes strFire    { from { transform:scale(1) rotate(-4deg); } to { transform:scale(1.18) rotate(4deg); } }
            @keyframes strPulse   { from { opacity:0.6; } to { opacity:1; } }
            @keyframes strTimer   { from { transform:scaleX(1); } to { transform:scaleX(0); } }
          `}</style>
        </div>
      )}

      {/* ── شاشة انتهاء الجلسة ── */}
      {sessionEnded && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'linear-gradient(135deg, #0a0014 0%, #1a0533 50%, #0a0014 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          gap: '1.5rem',
          direction: 'rtl',
        }}>
          {/* توهج خلفي */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 45%, rgba(168,85,247,0.15) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />

          {/* أيقونة */}
          <div style={{ fontSize: isMobile ? '4rem' : '6rem', animation: 'sessFade 2s ease-in-out infinite' }}>
            🎮
          </div>

          {/* النصوص */}
          <div style={{ textAlign: 'center', zIndex: 1, padding: '0 1.5rem' }}>
            <h1 style={{
              fontSize: isMobile ? '1.8rem' : '2.6rem',
              fontWeight: 900,
              color: 'white',
              margin: '0 0 0.75rem 0',
              textShadow: '0 0 30px rgba(168,85,247,0.7)',
            }}>
              انتهت الجلسة
            </h1>
            <p style={{
              fontSize: isMobile ? '1rem' : '1.25rem',
              color: 'rgba(255,255,255,0.65)',
              margin: 0,
              fontWeight: 600,
              lineHeight: 1.6,
            }}>
              أغلق المقدم اللعبة أو انتهت صلاحية الجلسة
            </p>
          </div>

          {/* زر إغلاق النافذة */}
          <button
            onClick={() => window.close()}
            style={{
              zIndex: 1,
              padding: isMobile ? '0.85rem 2rem' : '1rem 3rem',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              border: '2px solid rgba(255,255,255,0.25)',
              borderRadius: '2rem',
              color: 'white',
              fontSize: isMobile ? '1rem' : '1.2rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 0 30px rgba(168,85,247,0.5)',
            }}
          >
            إغلاق الصفحة
          </button>

          <style>{`
            @keyframes sessFade {
              0%, 100% { opacity: 0.6; transform: scale(1); }
              50% { opacity: 1; transform: scale(1.08); }
            }
          `}</style>
        </div>
      )}

      {/* شاشة التشويق - للمشاهدين */}
      {showCardTeaser && (
        <CardTeaserOverlay
          letter={showCardTeaser.letter}
          isGolden={showCardTeaser.isGolden}
          isHost={false}
        />
      )}

      {/* روليت البطاقات - متزامن مع شاشة المقدم */}
      {showRoulette && (
        <CardRoulette
          onComplete={() => setShowRoulette(false)}
          syncedCard={syncedCard}
          isViewerMode={true}
          triggerType={rouletteTriggerType}
        />
      )}

      {/* نافذة الفوز بالجولة - تظهر فقط إذا لم يكن هناك فائز بالمباراة */}
      {localWinner && localWinMessage && !localMatchWinner && (
        <ResultsOverlay
          winner={localWinner}
          winType={(localWinMessage.includes('ربط') ? 'wall-to-wall' :
                   localWinMessage.includes('5 خلايا') ? 'five-connected' :
                   'most-letters') as 'wall-to-wall' | 'five-connected' | 'most-letters'}
          winMessage={localWinMessage}
          greenScore={getWinStats(cells).greenCount}
          redScore={getWinStats(cells).redCount}
          greenTeamName={settings.teamNames.green}
          redTeamName={settings.teamNames.red}
        />
      )}

      {/* شاشة الفوز بالمباراة */}
      {localMatchWinner && (
        <MatchWinnerOverlay
          winner={localMatchWinner}
          winnerName={settings.teamNames[localMatchWinner]}
          greenScore={localScores.green}
          redScore={localScores.red}
          greenTeamName={settings.teamNames.green}
          redTeamName={settings.teamNames.red}
          onNewSettings={() => {
            // سيتم التحكم من شاشة المقدم - إغلاق النافذة فقط
            setLocalMatchWinner(null);
          }}
          onRestartMatch={() => {
            // سيتم التحكم من شاشة المقدم - إغلاق النافذة فقط
            setLocalMatchWinner(null);
          }}
          onGoHome={() => {
            // سيتم التحكم من شاشة المقدم - إغلاق النافذة فقط
            setLocalMatchWinner(null);
          }}
        />
      )}

      {/* شاشة الإيقاف المؤقت - مطابقة لتصميم شاشة المقدم */}
      {isPaused && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
        }}>
          {/* أيقونة الإيقاف الزرقاء */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            boxShadow: '0 6px 20px rgba(59, 130, 246, 0.3)',
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ width: '8px', height: '32px', background: 'white', borderRadius: '4px' }} />
              <div style={{ width: '8px', height: '32px', background: 'white', borderRadius: '4px' }} />
            </div>
          </div>

          {/* صندوق النص */}
          <div style={{
            background: 'rgba(139, 92, 246, 0.3)',
            border: '2px solid rgba(139, 92, 246, 0.5)',
            borderRadius: '1rem',
            padding: isMobile ? '1rem 1.5rem' : '1.5rem 3rem',
            marginBottom: '1.5rem',
          }}>
            <h2 style={{
              fontSize: isMobile ? '1.25rem' : '1.75rem',
              fontWeight: 700,
              color: 'white',
              margin: 0,
              textAlign: 'center',
            }}>
              اللعبة متوقفة مؤقتاً
            </h2>
          </div>

          {/* رسالة الانتظار */}
          <p style={{
            fontSize: isMobile ? '0.9rem' : '1.1rem',
            color: 'rgba(255, 255, 255, 0.7)',
            margin: 0,
          }}>
            في انتظار استئناف اللعبة من المقدم...
          </p>
        </div>
      )}

      {/* إشعار ضغط الزر */}
      {buzzerPress && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'buzzerFadeIn 0.3s ease-out',
          }}
        >
          <div style={{ position: 'relative' }}>
            <div
              style={{
                background: buzzerPress.team === 'green'
                  ? 'linear-gradient(145deg, #059669, #10b981, #34d399)'
                  : 'linear-gradient(145deg, #b91c1c, #ef4444, #f87171)',
                border: '4px solid rgba(255, 255, 255, 0.5)',
                borderRadius: isMobile ? '2rem' : '2.5rem',
                padding: isMobile ? '2rem 2.5rem' : '2.5rem 4rem',
                boxShadow: buzzerPress.team === 'green'
                  ? '0 0 80px rgba(16, 185, 129, 0.6), 0 0 200px rgba(16, 185, 129, 0.2)'
                  : '0 0 80px rgba(239, 68, 68, 0.6), 0 0 200px rgba(239, 68, 68, 0.2)',
                animation: 'buzzerBounceIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: isMobile ? '0.75rem' : '1rem',
                minWidth: isMobile ? '280px' : '380px',
              }}
            >
              <div style={{
                fontSize: isMobile ? '3.5rem' : '5rem',
                lineHeight: 1,
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
              }}>
                {buzzerPress.type === 'answer' ? '📣' : '🎴'}
              </div>
              <h2 style={{
                fontSize: isMobile ? '2rem' : '3rem',
                fontWeight: 900,
                color: 'white',
                margin: 0,
                textAlign: 'center',
                textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                letterSpacing: '-0.02em',
              }}>
                {buzzerPress.playerName}
              </h2>
              <p style={{
                fontSize: isMobile ? '1.1rem' : '1.4rem',
                color: 'rgba(255, 255, 255, 0.95)',
                margin: 0,
                fontWeight: 700,
              }}>
                {buzzerPress.type === 'answer' ? 'يريد الإجابة!' : 'يطلب بطاقة!'}
              </p>
            </div>

            {/* زر إخفاء الإشعار من شاشة اللاعبين */}
            <button
              onClick={() => setBuzzerPress(null)}
              style={{
                position: 'absolute',
                top: '-12px',
                left: '-12px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.7)',
                border: '2px solid rgba(255,255,255,0.4)',
                color: 'white',
                fontSize: '1rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
              }}
              title="إخفاء"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* مودال QR Code للأزرار */}
      {showBuzzerQRCode && (
        <BuzzerQRCodeModal
          sessionId={sessionId}
          onClose={() => setShowBuzzerQRCode(false)}
        />
      )}

      {/* دليل اللاعبين */}
      {showGuide && (
        <PlayerGuide
          onClose={() => setShowGuide(false)}
          onDontShowAgain={() => localStorage.setItem('players-guide-done', '1')}
        />
      )}

      <style>{`
        @keyframes buzzerFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes buzzerBounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          60% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes cellSelectedIn {
          0% { opacity: 0; transform: translateX(-50%) translateY(-12px) scale(0.9); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes letterPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,255,255,0.4); }
          50% { transform: scale(1.08); box-shadow: 0 0 0 6px rgba(255,255,255,0); }
        }
      `}</style>
    </div>
  );
};
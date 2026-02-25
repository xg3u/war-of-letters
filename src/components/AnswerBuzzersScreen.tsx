// src/components/AnswerBuzzersScreen.tsx
// شاشة Answer Buzzers — نظام جرس صارم بالفريق مع Real-time عبر Supabase

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CreditCard, HelpCircle } from 'lucide-react';
import {
  CharacterAvatar,
  DEFAULT_AVATAR,
  SKIN_TONES,
  SKIN_TONE_NAMES,
  JACKET_COLORS,
  JACKET_COLOR_NAMES,
} from './CharacterAvatar';
import type { AvatarConfig } from './CharacterAvatar';
import { useScreenSize } from '../hooks/useScreenSize';
import { useTheme } from '../context/ThemeContext';
import { syncManager } from '../utils/SyncManager';
import { BuzzerGuide } from './BuzzerGuide';
import { HexGrid } from './HexGrid';
import { useGameStore } from '../store/useGameStore';
import { CardAnimation } from './CardAnimation';
import { CardRoulette } from './CardRoulette';
import { CardTeaserOverlay } from './CardTeaserOverlay';
import { ResultsOverlay } from './ResultsOverlay';
import { MatchWinnerOverlay } from './MatchWinnerOverlay';
import {
  BuzzerChannel,
  INITIAL_BUZZER_STATE,
  applyActiveExpiry,
  applyOpponentExpiry,
  canTeamPress,
  getActiveSecondsLeft,
  getOpponentSecondsLeft,
} from '../utils/BuzzerEngine';
import type { BuzzerAttempt, BuzzerState } from '../utils/BuzzerEngine';
import type { CardType } from '../core/types';
import type { GameSettingsData } from './GameSettings';

interface SelectedCellInfo {
  cellId: string;
  letter: string;
  hasCard: boolean;
  isGolden: boolean;
}

// ─── WaitingPlayerCard — خارج الـ component لتجنب re-mount كل render ───────
interface WaitingPlayerCardProps {
  p: { name: string; team: 'green' | 'red'; avatar: AvatarConfig };
  isMe: boolean;
}
const WaitingPlayerCard: React.FC<WaitingPlayerCardProps> = ({ p, isMe }) => {
  const c = p.team === 'green' ? '#10b981' : '#ef4444';
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.72, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.7 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem',
        padding: '0.6rem 0.4rem 0.5rem', borderRadius: '1rem',
        background: isMe ? `${c}22` : 'rgba(255,255,255,0.04)',
        border: `1.5px solid ${isMe ? c : `${c}40`}`,
        boxShadow: isMe ? `0 0 18px ${c}30` : 'none',
        position: 'relative',
      }}
    >
      {isMe && (
        <div style={{
          position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)',
          background: c, color: 'white', fontSize: '0.52rem', fontWeight: 900,
          padding: '1px 6px', borderRadius: '2rem', whiteSpace: 'nowrap',
        }}>أنت</div>
      )}
      <div style={{
        width: '52px', height: '52px', borderRadius: '50%',
        background: `${c}18`, border: `2px solid ${c}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <CharacterAvatar avatar={p.avatar} size={44} />
      </div>
      <div style={{
        fontSize: '0.72rem', fontWeight: 800, color: 'white',
        textAlign: 'center', maxWidth: '72px',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{p.name}</div>
    </motion.div>
  );
};

// (لا يوجد timer محلي للتزامن — HostScreen هو المحكّم الوحيد)

export const AnswerBuzzersScreen: React.FC = () => {
  useScreenSize();
  const { theme } = useTheme();
  const { cells, syncFromExternal } = useGameStore();

  // ── بيانات اللاعب ──
  const [isRegistered, setIsRegistered] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<'green' | 'red'>('green');
  const playerNameRef = useRef(playerName);
  const selectedTeamRef = useRef(selectedTeam);
  playerNameRef.current = playerName;
  selectedTeamRef.current = selectedTeam;

  // ── أفاتار الشخصية ──
  const [avatar, setAvatar] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const avatarRef = useRef<AvatarConfig>(avatar);
  avatarRef.current = avatar;

  // ── غرفة الانتظار ──
  const [isWaitingRoom, setIsWaitingRoom] = useState(false);
  const isWaitingRoomRef = useRef(false);
  const isRegisteredRef  = useRef(false);
  const [waitingPlayers, setWaitingPlayers] = useState<Array<{
    name: string;
    team: 'green' | 'red';
    avatar: AvatarConfig;
  }>>([]);
  const [showLobbyEdit, setShowLobbyEdit] = useState(false);

  // ── نظام الجرس الجديد ──
  const [buzzerState, setBuzzerState] = useState<BuzzerState>(INITIAL_BUZZER_STATE);
  const buzzerStateRef = useRef(buzzerState);
  buzzerStateRef.current = buzzerState;
  const [buzzerChannel, setBuzzerChannel] = useState<BuzzerChannel | null>(null);
  const [isSending, setIsSending] = useState(false); // Optimistic: ضغطنا وننتظر تأكيد

  // ── Tick لتحديث العدادات ──
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 100);
    return () => clearInterval(id);
  }, []);

  // ── شاشة وشبكة ──
  const [showGuide, setShowGuide] = useState(() => !localStorage.getItem('buzzer-guide-done'));
  const [activeCell, setActiveCell] = useState<SelectedCellInfo | null>(null);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [colorsSwapped, setColorsSwapped] = useState(false);
  const [gridScale, setGridScale] = useState(0.62);

  // ── حالة اللعبة المتزامنة ──
  const [localSettings, setLocalSettings] = useState<GameSettingsData | null>(() => {
    const stored = localStorage.getItem('current-game-settings');
    return stored ? JSON.parse(stored) : null;
  });
  const [localScores, setLocalScores] = useState({ green: 0, red: 0 });
  const [localTeamCards, setLocalTeamCards] = useState<{ green: CardType[]; red: CardType[] }>({ green: [], red: [] });
  const [localWinner, setLocalWinner] = useState<'green' | 'red' | null>(null);
  const [localWinMessage, setLocalWinMessage] = useState<string | null>(null);
  const [localMatchWinner, setLocalMatchWinner] = useState<'green' | 'red' | null>(null);
  const [cardAnimation, setCardAnimation] = useState<{ type: CardType | 'cardFound'; message?: string } | null>(null);
  const [showRoulette, setShowRoulette] = useState(false);
  const [rouletteTriggerType, setRouletteTriggerType] = useState<'card' | 'golden'>('card');
  const [syncedCard, setSyncedCard] = useState<CardType | null>(null);
  const [showCardTeaser, setShowCardTeaser] = useState<{ letter: string; isGolden: boolean } | null>(null);
  const [showRandomLetterAnn, setShowRandomLetterAnn] = useState(false);
  const [streakAnnouncement, setStreakAnnouncement] = useState<{ team: 'green' | 'red'; teamName: string } | null>(null);
  const [forcedQuestion, setForcedQuestion] = useState<{ question: string; letter: string } | null>(null);

  const sessionId = new URLSearchParams(window.location.search).get('session') || '';

  // ═══════════════════════════════════════════════════════════════
  // broadcast "player-left" عند إغلاق الصفحة أو مغادرة اللاعب
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    return () => {
      if (isRegisteredRef.current && playerNameRef.current) {
        syncManager.broadcast({ type: 'player-left', name: playerNameRef.current });
      }
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // إنشاء BuzzerChannel بعد التسجيل
  // الحكم على الفائز يتم حصرياً في HostScreen — هنا نستقبل فقط BUZZER_WINNER
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!sessionId || !isRegistered) return;

    const channel = new BuzzerChannel(sessionId);
    setBuzzerChannel(channel);

    // استقبال الفائز المعلَن من HostScreen
    const offWinner = channel.onWinner((winner) => {
      setBuzzerState(winner.newState);
      setIsSending(false);
    });

    return () => {
      offWinner();
      channel.close();
    };
  }, [sessionId, isRegistered]);

  // ═══════════════════════════════════════════════════════════════
  // الانتقالات التلقائية للـ State Machine (تعمل عبر Tick)
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const now = Date.now();
    const state = buzzerStateRef.current;

    // انتهاء وقت الإجابة → تحويل الفريق لمحظور
    if (state.activeUntil && now >= state.activeUntil) {
      const newState = applyActiveExpiry(state, now);
      setBuzzerState(newState);
      setIsSending(false);
      return;
    }

    // انتهاء نافذة الخصم (P2 أو phase3_opp) بدون ضغط
    if (
      (state.phase === 'phase2' || state.phase === 'phase3_opp') &&
      !state.activeTeam && state.opponentUntil && now >= state.opponentUntil
    ) {
      const newState = applyOpponentExpiry(state, now);
      setBuzzerState(newState);
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // استقبال تحديثات اللعبة العامة (syncManager)
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = syncManager.subscribe((data: any) => {
      if (data.type === 'reset-buzzers') {
        setBuzzerState(INITIAL_BUZZER_STATE);
        setIsSending(false);
      } else if (data.type === 'CELL_SELECTED') {
        if (data.cellId) {
          setSelectedCellId(data.cellId);
          setActiveCell({ cellId: data.cellId, letter: data.letter ?? '', hasCard: !!data.hasCard, isGolden: !!data.isGolden });
        } else {
          setSelectedCellId(null);
          setActiveCell(null);
        }
      } else if (data.type === 'FULL_STATE_SYNC') {
        if (data.cells) syncFromExternal(data.cells);
        if (data.colorsSwapped !== undefined) setColorsSwapped(data.colorsSwapped);
        if (data.settings) { localStorage.setItem('current-game-settings', JSON.stringify(data.settings)); setLocalSettings(data.settings); }
        if (data.scores) setLocalScores(data.scores);
        if (data.teamCards) setLocalTeamCards(data.teamCards);
        if (data.winner) setLocalWinner(data.winner); else setLocalWinner(null);
        if (data.winMessage) setLocalWinMessage(data.winMessage); else setLocalWinMessage(null);
        if (data.matchWinner) setLocalMatchWinner(data.matchWinner); else setLocalMatchWinner(null);
        // انضمام في منتصف اللعبة → تخطي غرفة الانتظار (فقط إذا بدأت الجولة فعلاً)
        if (data.roundStarted === true && isWaitingRoomRef.current) {
          setIsWaitingRoom(false);
          isWaitingRoomRef.current = false;
        }
      } else if (data.type === 'GRID_INITIALIZED') {
        if (data.cells) syncFromExternal(data.cells);
        setSelectedCellId(null); setActiveCell(null);
        // اللعبة بدأت → تخطي غرفة الانتظار
        if (isWaitingRoomRef.current) {
          setIsWaitingRoom(false);
          isWaitingRoomRef.current = false;
        }
      } else if (data.type === 'CELL_CLAIMED') {
        if (data.cells) syncFromExternal(data.cells);
        setSelectedCellId(null); setActiveCell(null);
      } else if (data.type === 'COUNTERS_UPDATED' || data.type === 'CARD_USED') {
        if (data.cells) syncFromExternal(data.cells);
      } else if (data.type === 'player-registered') {
        // لاعب جديد انضم — أضفه لغرفة الانتظار
        if (data.player) {
          setWaitingPlayers(prev => {
            const exists = prev.some(p => p.name === data.player.name && p.team === data.player.team);
            if (exists) return prev;
            return [...prev, {
              name: data.player.name,
              team: data.player.team,
              avatar: data.player.avatar || DEFAULT_AVATAR,
            }];
          });
          // إذا كنا في غرفة الانتظار → رد بمعلوماتنا حتى يرانا القادم الجديد
          if (isRegisteredRef.current && isWaitingRoomRef.current) {
            const myName = playerNameRef.current;
            const myTeam = selectedTeamRef.current;
            const myAv   = avatarRef.current;
            if (myName && myName !== data.player.name) {
              setTimeout(() => {
                syncManager.broadcast({
                  type: 'player-registered',
                  player: { name: myName, team: myTeam, timestamp: Date.now(), avatar: myAv },
                });
              }, 200 + Math.random() * 150);
            }
          }
        }
      } else if (data.type === 'ROUND_STARTED') {
        setIsWaitingRoom(false);
        isWaitingRoomRef.current = false;
        setSelectedCellId(null); setActiveCell(null);
      } else if (data.type === 'SETTINGS_UPDATED') {
        if (data.colorsSwapped !== undefined) setColorsSwapped(data.colorsSwapped);
      } else if (data.type === 'CARD_ANIMATION' || data.type === 'CARD_FOUND' || data.type === 'CARD_WON') {
        setCardAnimation({ type: data.cardType, message: data.message });
      } else if (data.type === 'CARD_TEASER') {
        setShowCardTeaser({ letter: data.letter, isGolden: !!data.isGolden });
      } else if (data.type === 'ROULETTE_START') {
        setShowCardTeaser(null); setRouletteTriggerType(data.triggerType || 'card'); setSyncedCard(null); setShowRoulette(true);
      } else if (data.type === 'ROULETTE_END') {
        setSyncedCard(data.card);
      } else if (data.type === 'CARD_ADDED' || data.type === 'CARDS_CLEARED') {
        if (data.teamCards) setLocalTeamCards(data.teamCards);
      } else if (data.type === 'GAME_WON') {
        if (data.scores) setLocalScores(data.scores);
        if (data.winner) setLocalWinner(data.winner);
        if (data.winMessage) setLocalWinMessage(data.winMessage);
        if (data.matchWinner) setLocalMatchWinner(data.matchWinner);
      } else if (data.type === 'MATCH_RESET') {
        setLocalScores({ green: 0, red: 0 });
        setLocalMatchWinner(null);
        setLocalTeamCards({ green: [], red: [] });
        setLocalWinner(null); setLocalWinMessage(null);
      } else if (data.type === 'STREAK_UPDATED') {
        // (no-op for this screen)
      } else if (data.type === 'RANDOM_LETTER_ANNOUNCEMENT') {
        setShowRandomLetterAnn(true);
        setTimeout(() => setShowRandomLetterAnn(false), 4000);
      } else if (data.type === 'SHOW_QUESTION_TO_PLAYERS') {
        if (data.question) setForcedQuestion({ question: data.question, letter: data.letter ?? '' });
      } else if (data.type === 'HIDE_QUESTION_FROM_PLAYERS') {
        setForcedQuestion(null);
      } else if (data.type === 'STREAK_REWARD_ANNOUNCEMENT') {
        if (data.team) {
          setStreakAnnouncement({ team: data.team, teamName: data.teamName ?? data.team });
          setTimeout(() => setStreakAnnouncement(null), 4000);
        }
      } else if (data.type === 'REQUEST_PLAYER_LIST') {
        // لاعب جديد يطلب قائمة الحاضرين → رد بمعلوماتي إذا كنت في غرفة الانتظار
        if (isRegisteredRef.current && isWaitingRoomRef.current && playerNameRef.current) {
          setTimeout(() => {
            syncManager.broadcast({
              type: 'player-registered',
              player: {
                name: playerNameRef.current,
                team: selectedTeamRef.current,
                timestamp: Date.now(),
                avatar: avatarRef.current,
              },
            });
          }, Math.random() * 200);
        }
      } else if (data.type === 'player-kicked') {
        // المقدم طرد هذا اللاعب → أعِد التسجيل
        if (data.name === playerNameRef.current) {
          setIsRegistered(false);
          isRegisteredRef.current = false;
          setIsWaitingRoom(false);
          isWaitingRoomRef.current = false;
          setPlayerName('');
          setWaitingPlayers([]);
        }
      }
    });

    return unsubscribe;
  }, [sessionId]);

  // ═══════════════════════════════════════════════════════════════
  // ضغط الجرس
  // ═══════════════════════════════════════════════════════════════
  const handleBuzzerPress = (pressType: 'answer' | 'card') => {
    const now = Date.now();
    const state = buzzerStateRef.current;
    const team = selectedTeamRef.current;
    const name = playerNameRef.current;

    if (!canTeamPress(state, team, now)) return;
    if (!buzzerChannel) return;

    const attempt: BuzzerAttempt = {
      type: 'BUZZER_ATTEMPT',
      team,
      playerName: name,
      pressType,
      clientTimestamp: now,
      avatar: avatarRef.current,
    };

    // Optimistic: أظهر "جاري الإرسال" فوراً
    setIsSending(true);
    // timeout احتياطي: إذا لم يصل رد الشبكة خلال 3 ثوانٍ نفتح الزر مجدداً
    setTimeout(() => setIsSending(false), 3000);

    // إرسال لجميع الأجهزة (self: true → سنستقبله أيضاً عبر onAttempt)
    buzzerChannel.sendAttempt(attempt);
  };

  const handleRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim().length < 2) { alert('الرجاء إدخال اسم صحيح (حرفين على الأقل)'); return; }
    const av = avatarRef.current;
    // بث تسجيل اللاعب مع بيانات الأفاتار
    syncManager.broadcast({
      type: 'player-registered',
      player: { name: playerName.trim(), team: selectedTeam, timestamp: Date.now(), avatar: av },
    });
    // إضافة اللاعب لقائمة الانتظار محلياً (لن نستقبل بثّنا الخاص)
    setWaitingPlayers([{ name: playerName.trim(), team: selectedTeam, avatar: av }]);
    setIsRegistered(true);
    isRegisteredRef.current = true;
    setIsWaitingRoom(true);
    isWaitingRoomRef.current = true;
    // طلب حالة اللعبة (لكشف الانضمام المتأخر) + طلب قائمة اللاعبين
    syncManager.broadcast({ type: 'REQUEST_FULL_STATE' });
    setTimeout(() => {
      syncManager.broadcast({ type: 'REQUEST_PLAYER_LIST' });
    }, 400);
  };

  // ─── حسابات الحالة ────────────────────────────────────────────
  const now = Date.now();
  const myTeam = selectedTeam;
  const opponentTeam = myTeam === 'green' ? 'red' : 'green';

  const iAmActive = buzzerState.activeTeam === myTeam;
  const opponentActive = buzzerState.activeTeam === opponentTeam;
  const iAmFirstTeam = buzzerState.firstTeam === myTeam;

  const activeSecsLeft = getActiveSecondsLeft(buzzerState, now);
  const opponentSecsLeft = getOpponentSecondsLeft(buzzerState, now);

  const canPress = canTeamPress(buzzerState, myTeam, now) && !isSending;

  const teamColor = myTeam === 'green' ? '#10b981' : '#ef4444';
  const teamGrad = myTeam === 'green'
    ? 'linear-gradient(135deg,#10b981,#14b8a6)'
    : 'linear-gradient(135deg,#ef4444,#dc2626)';

  const opponentColor = opponentTeam === 'green' ? '#10b981' : '#ef4444';

  // ─── حالة الأزرار ─────────────────────────────────────────────
  // أزرار محظورة: أحدٌ نشط أو في انتظار التأكيد
  const buttonsDisabled = !canPress;

  // ─── رسالة الحالة ─────────────────────────────────────────────
  const phaseLabel = buzzerState.phase === 'phase1' ? 'م١'
    : buzzerState.phase === 'phase2' ? 'م٢'
    : (buzzerState.phase === 'phase3_open' || buzzerState.phase === 'phase3_opp') ? 'م٣'
    : '';

  const getStatusMessage = (): { text: string; color: string; bg: string; icon: string } => {
    // أحد يجيب حالياً
    if (iAmActive) {
      return {
        text: `[${phaseLabel}] أجب الآن! ${activeSecsLeft}s`,
        color: teamColor,
        bg: myTeam === 'green' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
        icon: '⚡',
      };
    }
    if (opponentActive) {
      return {
        text: `[${phaseLabel}] ${buzzerState.activatedBy} يجيب... ${activeSecsLeft}s`,
        color: opponentColor,
        bg: opponentTeam === 'green' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
        icon: '🔕',
      };
    }

    // المرحلة 2: انتظار ضغطة الخصم
    if (buzzerState.phase === 'phase2') {
      if (iAmFirstTeam) {
        return {
          text: `🚫 فريقك محظور ${opponentSecsLeft}s — الخصم يمتلك الفرصة`,
          color: '#f87171',
          bg: 'rgba(239,68,68,0.12)',
          icon: '🚫',
        };
      }
      return {
        text: `م٢ 🎯 فرصتك! اضغط خلال ${opponentSecsLeft}s`,
        color: '#22c55e',
        bg: 'rgba(34,197,94,0.15)',
        icon: '🎯',
      };
    }

    // المرحلة 3 — مفتوحة للكل
    if (buzzerState.phase === 'phase3_open') {
      return {
        text: 'م٣ 🔔 كل فريق محاولة أخيرة — أول من يضغط!',
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.15)',
        icon: '🔔',
      };
    }

    // المرحلة 3 — نافذة الخصم
    if (buzzerState.phase === 'phase3_opp') {
      if (iAmFirstTeam) {
        return {
          text: `م٣ — انتهت محاولتك، الخصم لديه ${opponentSecsLeft}s`,
          color: '#94a3b8',
          bg: 'rgba(148,163,184,0.1)',
          icon: '✓',
        };
      }
      return {
        text: `م٣ 🎯 فرصتك الأخيرة! اضغط خلال ${opponentSecsLeft}s`,
        color: '#22c55e',
        bg: 'rgba(34,197,94,0.15)',
        icon: '🎯',
      };
    }

    if (isSending) {
      return { text: 'جاري الإرسال...', color: '#a855f7', bg: 'rgba(168,85,247,0.1)', icon: '📡' };
    }
    return { text: 'استعد — اضغط الجرس!', color: 'rgba(255,255,255,0.4)', bg: 'transparent', icon: '🔔' };
  };

  const status = getStatusMessage();

  // ═══════════════════════════════════════════════════════════════
  // شاشة التسجيل + تعديل الشخصية
  // ═══════════════════════════════════════════════════════════════
  if (!isRegistered) {
    const teamColor = selectedTeam === 'green' ? '#10b981' : '#ef4444';
    const setSex = (g: 'male' | 'female') => setAvatar(a => ({ ...a, gender: g }));
    const cycleOption = (key: 'skinTone' | 'jacketColor', max: number, dir: 1 | -1) =>
      setAvatar(a => ({ ...a, [key]: ((a[key] as number) + dir + max) % max }));
    type ArrKey = 'jacketColor' | 'skinTone';
    const arrowOpts: { label: string; key: ArrKey; colors: string[]; names: string[]; count: number }[] = [
      { label: 'لون الكونسول', key: 'jacketColor', colors: JACKET_COLORS, names: JACKET_COLOR_NAMES, count: 6 },
      { label: 'لون الشاشة',   key: 'skinTone',    colors: SKIN_TONES,    names: SKIN_TONE_NAMES,   count: 5 },
    ];
    const EXPRESSIONS = [
      { exp: 'happy' as const,     emoji: '😊', label: 'مبتسم'   },
      { exp: 'wink' as const,      emoji: '😉', label: 'يغمز'    },
      { exp: 'surprised' as const, emoji: '😮', label: 'متفاجئ'  },
      { exp: 'smug' as const,      emoji: '😏', label: 'خايس'    },
    ];
    const expIdx = Math.max(0, EXPRESSIONS.findIndex(e => e.exp === avatar.expression));
    const cycleExp = (dir: 1 | -1) => {
      const next = (expIdx + dir + EXPRESSIONS.length) % EXPRESSIONS.length;
      setAvatar(a => ({ ...a, expression: EXPRESSIONS[next].exp }));
    };
    const ACCESSORIES = [
      { acc: 'none' as const,       emoji: '✨', label: 'لا شيء',  color: '#94a3b8' },
      { acc: 'headphones' as const, emoji: '🎧', label: 'سماعات', color: '#a78bfa' },
      { acc: 'glasses' as const,    emoji: '🕶️', label: 'نظارة',  color: '#60a5fa' },
      { acc: 'bow' as const,        emoji: '🎀', label: 'ربطة',   color: '#f472b6' },
      { acc: 'horns' as const,      emoji: '😈', label: 'قرون',   color: '#ef4444' },
      { acc: 'halo' as const,       emoji: '😇', label: 'هالة',   color: '#fbbf24' },
    ];
    const accIdx = Math.max(0, ACCESSORIES.findIndex(a => a.acc === avatar.accessory));
    const cycleAcc = (dir: 1 | -1) => {
      const next = (accIdx + dir + ACCESSORIES.length) % ACCESSORIES.length;
      setAvatar(a => ({ ...a, accessory: ACCESSORIES[next].acc }));
    };
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '1rem 1rem 2rem', background: theme.bgGradient, direction: 'rtl', overflowY: 'auto',
      }}>
        <div style={{
          maxWidth: '400px', width: '100%', marginTop: '0.5rem',
          borderRadius: '2rem',
          background: 'linear-gradient(145deg, rgba(15,6,38,0.99), rgba(28,11,56,0.99))',
          border: `2px solid ${teamColor}40`,
          boxShadow: `0 0 50px ${teamColor}20, 0 20px 60px rgba(0,0,0,0.6)`,
          padding: '1.5rem',
          overflow: 'hidden',
        }}>

          {/* شريط علوي متدرج */}
          <div style={{ height: '4px', background: `linear-gradient(90deg, ${teamColor}, #a855f7, #ec4899, ${teamColor})`, borderRadius: '2rem', marginBottom: '1.25rem' }} />

          {/* عنوان */}
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'rgba(255,255,255,0.95)', letterSpacing: '0.02em' }}>تخصيص شخصيتك</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.2rem' }}>صمّم مظهرك وانضم للمباراة</div>
          </div>

          {/* معاينة الشخصية العائمة */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* حلقة دوارة */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
                style={{ position: 'absolute', width: '150px', height: '150px', borderRadius: '50%', border: `1.5px dashed ${teamColor}35`, pointerEvents: 'none' }}
              />
              {/* توهج نابض */}
              <motion.div
                animate={{ boxShadow: [`0 0 20px ${teamColor}25`, `0 0 50px ${teamColor}60`, `0 0 20px ${teamColor}25`] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                style={{ width: '132px', height: '132px', borderRadius: '50%', background: `radial-gradient(circle at 35% 35%, ${teamColor}28, transparent 68%)`, border: `2.5px solid ${teamColor}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {/* عوم */}
                <motion.div animate={{ y: [-4, 4, -4] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}>
                  <motion.div
                    key={`${avatar.gender}-${avatar.skinTone}-${avatar.jacketColor}-${avatar.expression}-${avatar.accessory}`}
                    initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                  >
                    <CharacterAvatar avatar={avatar} size={100} />
                  </motion.div>
                </motion.div>
              </motion.div>
            </div>
          </div>

          {/* نوع الكونسول */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', fontWeight: 700, marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '20px', height: '2px', background: `linear-gradient(90deg, ${teamColor}80, transparent)`, borderRadius: '1px' }} />
              نوع الكونسول
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {([
                { g: 'male' as const,   label: '👦 ذكر',  ac: '#3b82f6', acL: '#93c5fd' },
                { g: 'female' as const, label: '👧 أنثى', ac: '#ec4899', acL: '#f9a8d4' },
              ]).map(({ g, label, ac, acL }) => (
                <motion.button key={g} type="button" onClick={() => setSex(g)} whileTap={{ scale: 0.92 }}
                  style={{
                    padding: '0.6rem', borderRadius: '0.85rem', cursor: 'pointer',
                    background: avatar.gender === g ? `linear-gradient(135deg,${ac}30,${ac}15)` : 'rgba(255,255,255,0.04)',
                    border: avatar.gender === g ? `2px solid ${ac}90` : '2px solid rgba(255,255,255,0.08)',
                    color: avatar.gender === g ? acL : 'rgba(255,255,255,0.35)',
                    fontWeight: 800, fontSize: '0.88rem', transition: 'all 0.2s',
                    boxShadow: avatar.gender === g ? `0 0 16px ${ac}35` : 'none',
                  }}>
                  {label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* ─── محددات السهم ─── */}
          {arrowOpts.map(({ label, key, colors, names, count }) => {
            const idx = avatar[key];
            const c = colors[idx];
            return (
              <div key={key} style={{ marginBottom: '0.9rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', fontWeight: 700, marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '20px', height: '2px', background: `linear-gradient(90deg, ${teamColor}80, transparent)`, borderRadius: '1px' }} />
                  {label}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {/* زر سابق */}
                  <motion.button type="button" onClick={() => cycleOption(key, count, -1)}
                    whileTap={{ scale: 0.7, x: -3 }} whileHover={{ scale: 1.12 }}
                    style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.22)', background: 'linear-gradient(145deg,rgba(255,255,255,0.14),rgba(255,255,255,0.04))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18)' }}>
                    <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
                      <polygon points="8,0.5 1,5 8,9.5" fill="white" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.5))"/>
                    </svg>
                  </motion.button>

                  {/* العرض المركزي */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', minHeight: '64px', justifyContent: 'center' }}>
                    <AnimatePresence mode="wait">
                      <motion.div key={idx}
                        initial={{ opacity: 0, scale: 0.72, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.72, y: -8 }}
                        transition={{ duration: 0.16, ease: 'easeOut' }}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                        <div style={{
                          width: '42px', height: '42px', borderRadius: '10px',
                          background: c,
                          boxShadow: `0 0 18px ${c}AA, 0 3px 10px rgba(0,0,0,0.45)`,
                          border: '2.5px solid rgba(255,255,255,0.4)',
                          transform: 'rotate(3deg)',
                        }} />
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{names[idx]}</div>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* زر تالي */}
                  <motion.button type="button" onClick={() => cycleOption(key, count, 1)}
                    whileTap={{ scale: 0.7, x: 3 }} whileHover={{ scale: 1.12 }}
                    style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.22)', background: 'linear-gradient(145deg,rgba(255,255,255,0.14),rgba(255,255,255,0.04))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18)' }}>
                    <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
                      <polygon points="2,0.5 9,5 2,9.5" fill="white" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.5))"/>
                    </svg>
                  </motion.button>
                </div>

                {/* نقاط المؤشر */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginTop: '0.4rem' }}>
                  {Array.from({ length: count }).map((_, i) => (
                    <div key={i} onClick={() => setAvatar(a => ({ ...a, [key]: i }))}
                      style={{
                        width: i === idx ? '18px' : '6px', height: '6px',
                        borderRadius: '3px', cursor: 'pointer',
                        background: i === idx ? c : 'rgba(255,255,255,0.22)',
                        boxShadow: i === idx ? `0 0 6px ${c}` : 'none',
                        transition: 'all 0.25s ease',
                      }} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* تعبير الوجه — سهام */}
          <div style={{ marginBottom: '0.9rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', fontWeight: 700, marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '20px', height: '2px', background: `linear-gradient(90deg, ${teamColor}80, transparent)`, borderRadius: '1px' }} />
              تعبير الوجه
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <motion.button type="button" onClick={() => cycleExp(-1)} whileTap={{ scale: 0.7, x: -3 }} whileHover={{ scale: 1.12 }}
                style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.22)', background: 'linear-gradient(145deg,rgba(255,255,255,0.14),rgba(255,255,255,0.04))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18)' }}>
                <svg width="12" height="12" viewBox="0 0 10 10" fill="none"><polygon points="8,0.5 1,5 8,9.5" fill="white" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.5))"/></svg>
              </motion.button>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', minHeight: '64px', justifyContent: 'center' }}>
                <AnimatePresence mode="wait">
                  <motion.div key={expIdx} initial={{ opacity: 0, scale: 0.72, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.72, y: -8 }} transition={{ duration: 0.16, ease: 'easeOut' }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                    <div style={{ fontSize: '2rem', lineHeight: 1 }}>{EXPRESSIONS[expIdx].emoji}</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{EXPRESSIONS[expIdx].label}</div>
                  </motion.div>
                </AnimatePresence>
              </div>
              <motion.button type="button" onClick={() => cycleExp(1)} whileTap={{ scale: 0.7, x: 3 }} whileHover={{ scale: 1.12 }}
                style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.22)', background: 'linear-gradient(145deg,rgba(255,255,255,0.14),rgba(255,255,255,0.04))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18)' }}>
                <svg width="12" height="12" viewBox="0 0 10 10" fill="none"><polygon points="2,0.5 9,5 2,9.5" fill="white" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.5))"/></svg>
              </motion.button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginTop: '0.4rem' }}>
              {EXPRESSIONS.map((_, i) => (
                <div key={i} onClick={() => setAvatar(a => ({ ...a, expression: EXPRESSIONS[i].exp }))}
                  style={{ width: i === expIdx ? '18px' : '6px', height: '6px', borderRadius: '3px', cursor: 'pointer', background: i === expIdx ? teamColor : 'rgba(255,255,255,0.22)', boxShadow: i === expIdx ? `0 0 6px ${teamColor}` : 'none', transition: 'all 0.25s ease' }} />
              ))}
            </div>
          </div>

          {/* إكسسوار — سهام */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', fontWeight: 700, marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '20px', height: '2px', background: `linear-gradient(90deg, ${teamColor}80, transparent)`, borderRadius: '1px' }} />
              إكسسوار
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <motion.button type="button" onClick={() => cycleAcc(-1)} whileTap={{ scale: 0.7, x: -3 }} whileHover={{ scale: 1.12 }}
                style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.22)', background: 'linear-gradient(145deg,rgba(255,255,255,0.14),rgba(255,255,255,0.04))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18)' }}>
                <svg width="12" height="12" viewBox="0 0 10 10" fill="none"><polygon points="8,0.5 1,5 8,9.5" fill="white" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.5))"/></svg>
              </motion.button>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', minHeight: '64px', justifyContent: 'center' }}>
                <AnimatePresence mode="wait">
                  <motion.div key={accIdx} initial={{ opacity: 0, scale: 0.72, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.72, y: -8 }} transition={{ duration: 0.16, ease: 'easeOut' }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                    <div style={{ fontSize: '2rem', lineHeight: 1 }}>{ACCESSORIES[accIdx].emoji}</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{ACCESSORIES[accIdx].label}</div>
                  </motion.div>
                </AnimatePresence>
              </div>
              <motion.button type="button" onClick={() => cycleAcc(1)} whileTap={{ scale: 0.7, x: 3 }} whileHover={{ scale: 1.12 }}
                style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.22)', background: 'linear-gradient(145deg,rgba(255,255,255,0.14),rgba(255,255,255,0.04))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18)' }}>
                <svg width="12" height="12" viewBox="0 0 10 10" fill="none"><polygon points="2,0.5 9,5 2,9.5" fill="white" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.5))"/></svg>
              </motion.button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginTop: '0.4rem' }}>
              {ACCESSORIES.map((_, i) => (
                <div key={i} onClick={() => setAvatar(a => ({ ...a, accessory: ACCESSORIES[i].acc }))}
                  style={{ width: i === accIdx ? '18px' : '6px', height: '6px', borderRadius: '3px', cursor: 'pointer', background: i === accIdx ? teamColor : 'rgba(255,255,255,0.22)', boxShadow: i === accIdx ? `0 0 6px ${teamColor}` : 'none', transition: 'all 0.25s ease' }} />
              ))}
            </div>
          </div>

          {/* فاصل */}
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)', margin: '0.85rem 0' }} />

          {/* نموذج التسجيل */}
          <form onSubmit={handleRegistration}>
            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.4rem' }}>اسمك</label>
              <input
                type="text" value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder="أدخل اسمك..." maxLength={20}
                style={{
                  width: '100%', padding: '0.78rem 1rem', borderRadius: '0.85rem',
                  background: 'rgba(255,255,255,0.06)', border: `2px solid ${teamColor}30`,
                  color: 'white', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = teamColor; e.target.style.boxShadow = `0 0 15px ${teamColor}22`; }}
                onBlur={e => { e.target.style.borderColor = `${teamColor}30`; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div style={{ marginBottom: '1.1rem' }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.45rem' }}>فريقك</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {[
                  { id: 'green' as const, label: '🟢 الأخضر', grad: 'linear-gradient(135deg,#10b981,#059669)', border: '#10b981', glow: 'rgba(16,185,129,0.35)' },
                  { id: 'red'   as const, label: '🔴 الأحمر', grad: 'linear-gradient(135deg,#ef4444,#dc2626)', border: '#ef4444', glow: 'rgba(239,68,68,0.35)'   },
                ].map(t => (
                  <motion.button key={t.id} type="button" onClick={() => setSelectedTeam(t.id)}
                    whileTap={{ scale: 0.93 }}
                    style={{
                      padding: '0.75rem', borderRadius: '0.85rem',
                      background: selectedTeam === t.id ? t.grad : 'rgba(255,255,255,0.04)',
                      border: selectedTeam === t.id ? `2.5px solid ${t.border}` : '2px solid rgba(255,255,255,0.08)',
                      color: 'white', fontSize: '0.88rem', fontWeight: 800, cursor: 'pointer',
                      boxShadow: selectedTeam === t.id ? `0 4px 20px ${t.glow}` : 'none',
                      transition: 'all 0.2s',
                    }}>
                    {t.label}
                  </motion.button>
                ))}
              </div>
            </div>

            <motion.button type="submit" whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.015 }}
              style={{ width: '100%', padding: '1rem', borderRadius: '1rem', background: 'linear-gradient(135deg,#f59e0b,#f97316,#ef4444)', border: 'none', color: 'white', fontSize: '1.05rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 6px 28px rgba(245,158,11,0.45)', letterSpacing: '0.03em' }}>
              ✨ ادخل الآن
            </motion.button>
          </form>
        </div>

        <style>{`@keyframes regPulse{0%,100%{transform:scale(1);}50%{transform:scale(1.05);}}`}</style>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // غرفة الانتظار (Lobby) — تصميم عصري
  // ═══════════════════════════════════════════════════════════════
  if (isWaitingRoom) {
    const greenPlayers = waitingPlayers.filter(p => p.team === 'green');
    const redPlayers   = waitingPlayers.filter(p => p.team === 'red');
    const tc  = selectedTeam === 'green' ? '#10b981' : '#ef4444';
    const tc2 = selectedTeam === 'green' ? '#14b8a6' : '#dc2626';
    const oppTeam: 'green' | 'red' = selectedTeam === 'green' ? 'red' : 'green';
    const oppLabel = oppTeam === 'green' ? 'الأخضر' : 'الأحمر';
    const myLabel  = selectedTeam === 'green' ? '🟢 أخضر' : '🔴 أحمر';

    const handleSwitchTeam = () => {
      const newTeam: 'green' | 'red' = selectedTeam === 'green' ? 'red' : 'green';
      setSelectedTeam(newTeam);
      selectedTeamRef.current = newTeam;
      setWaitingPlayers(prev => [
        ...prev.filter(p => p.name !== playerName),
        { name: playerName, team: newTeam, avatar },
      ]);
      syncManager.broadcast({
        type: 'player-registered',
        player: { name: playerName, team: newTeam, timestamp: Date.now(), avatar },
      });
    };

    const handleSaveLobbyAvatar = () => {
      avatarRef.current = avatar;
      setWaitingPlayers(prev => [
        ...prev.filter(p => p.name !== playerName),
        { name: playerName, team: selectedTeam, avatar },
      ]);
      syncManager.broadcast({
        type: 'player-registered',
        player: { name: playerName, team: selectedTeam, timestamp: Date.now(), avatar },
      });
      setShowLobbyEdit(false);
    };

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        background: theme.bgGradient, direction: 'rtl', overflowX: 'hidden',
        fontFamily: "'Tajawal', sans-serif",
      }}>

        {/* ─── هيدر ─── */}
        <div style={{
          background: 'linear-gradient(135deg,rgba(26,11,46,0.98),rgba(45,17,84,0.98))',
          borderBottom: '1.5px solid rgba(168,85,247,0.2)',
          padding: '1rem 1.25rem 0.9rem',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
        }}>
          <div style={{
            width: '50px', height: '3px', borderRadius: '2rem',
            background: `linear-gradient(90deg, ${tc}, #a855f7, ${tc})`,
            marginBottom: '0.4rem',
          }} />
          <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'white', letterSpacing: '0.05em' }}>
            حرب الحروف
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>غرفة الانتظار</span>
            <div style={{
              background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.35)',
              borderRadius: '2rem', padding: '1px 8px',
              fontSize: '0.62rem', color: '#c4b5fd', fontWeight: 700,
            }}>{waitingPlayers.length} لاعب</div>
          </div>
        </div>

        {/* ─── بطاقتي ─── */}
        <div style={{ padding: '1rem 1rem 0', display: 'flex', justifyContent: 'center' }}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              width: '100%', maxWidth: '360px',
              background: `linear-gradient(145deg, ${tc}18, rgba(15,6,38,0.92))`,
              border: `2px solid ${tc}50`,
              borderRadius: '1.4rem',
              padding: '1rem 1.1rem',
              boxShadow: `0 0 28px ${tc}22, 0 8px 28px rgba(0,0,0,0.5)`,
              display: 'flex', alignItems: 'center', gap: '0.9rem',
              position: 'relative',
            }}
          >
            <div style={{
              position: 'absolute', top: '-9px', right: '1rem',
              background: `linear-gradient(135deg, ${tc}, ${tc2})`,
              color: 'white', fontSize: '0.58rem', fontWeight: 900,
              padding: '2px 9px', borderRadius: '2rem',
            }}>أنت</div>

            {/* الأفاتار */}
            <div style={{
              width: '66px', height: '66px', borderRadius: '50%', flexShrink: 0,
              background: `radial-gradient(circle, ${tc}22, transparent 70%)`,
              border: `2.5px solid ${tc}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CharacterAvatar avatar={avatar} size={54} />
            </div>

            {/* المعلومات */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '1rem', fontWeight: 900, color: 'white',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{playerName}</div>
              <div style={{
                display: 'inline-block', marginTop: '0.28rem',
                background: `${tc}22`, border: `1px solid ${tc}50`,
                color: tc, fontSize: '0.68rem', fontWeight: 800,
                padding: '2px 9px', borderRadius: '2rem',
              }}>{myLabel}</div>
            </div>

            {/* نبضة الاتصال */}
            <div style={{
              width: '9px', height: '9px', borderRadius: '50%', flexShrink: 0,
              background: '#10b981', boxShadow: '0 0 8px #10b981',
              animation: 'lobbyPulse 2s ease-in-out infinite',
            }} />
          </motion.div>
        </div>

        {/* ─── الفريقان ─── */}
        <div style={{ padding: '0.85rem 1rem 0', display: 'flex', gap: '0.55rem' }}>

          {/* الفريق الأخضر */}
          {(['green', 'red'] as const).map(team => {
            const players = team === 'green' ? greenPlayers : redPlayers;
            const col  = team === 'green' ? '#10b981' : '#ef4444';
            const lbl  = team === 'green' ? 'الفريق الأخضر' : 'الفريق الأحمر';
            return (
              <div key={team} style={{ flex: 1, minWidth: 0 }}>
                {/* رأس العمود */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.45rem',
                }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%', background: col,
                    boxShadow: `0 0 5px ${col}`, flexShrink: 0,
                  }} />
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: col, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lbl}</div>
                  <div style={{
                    background: `${col}20`, border: `1px solid ${col}35`,
                    borderRadius: '2rem', padding: '0 5px',
                    fontSize: '0.58rem', color: col, fontWeight: 700,
                  }}>{players.length}</div>
                </div>

                {/* قائمة اللاعبين */}
                <div style={{
                  background: `${col}07`, border: `1.5px solid ${col}22`,
                  borderRadius: '0.9rem', padding: '0.4rem',
                  minHeight: '64px', display: 'flex', flexDirection: 'column', gap: '0.3rem',
                }}>
                  <AnimatePresence>
                    {players.map(p => (
                      <WaitingPlayerCard
                        key={`${team}-${p.name}`}
                        p={p}
                        isMe={p.name === playerName && p.team === selectedTeam}
                      />
                    ))}
                  </AnimatePresence>
                  {players.length === 0 && (
                    <div style={{
                      fontSize: '0.6rem', color: 'rgba(255,255,255,0.18)', textAlign: 'center',
                      padding: '0.8rem 0', fontStyle: 'italic',
                    }}>لا أحد بعد...</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── مؤشر الانتظار ─── */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '0.45rem', padding: '0.9rem 0 0.25rem',
        }}>
          <div style={{ display: 'flex', gap: '0.38rem', alignItems: 'center' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: '7px', height: '7px', borderRadius: '50%', background: '#a855f7',
                animation: 'lobbyDot 1.4s ease-in-out infinite',
                animationDelay: `${i * 0.22}s`, opacity: 0.7,
              }} />
            ))}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.28)', fontWeight: 600 }}>
            في انتظار المقدم للبدء...
          </div>
        </div>

        {/* ─── فضاء للأزرار الثابتة ─── */}
        <div style={{ flex: 1, minHeight: '1rem' }} />
        <div style={{ height: '78px' }} />

        {/* ─── أزرار الإجراءات (ثابتة في الأسفل) ─── */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: 'linear-gradient(0deg,rgba(8,0,20,1) 0%,rgba(8,0,20,0.9) 100%)',
          borderTop: '1.5px solid rgba(255,255,255,0.07)',
          padding: '0.65rem 0.85rem 0.75rem',
          display: 'flex', gap: '0.55rem',
        }}>
          {/* تعديل الشخصية */}
          <button
            onClick={() => setShowLobbyEdit(true)}
            style={{
              flex: 1, padding: '0.72rem 0.5rem', borderRadius: '0.9rem',
              background: 'rgba(168,85,247,0.14)',
              border: '1.5px solid rgba(168,85,247,0.38)',
              color: '#c4b5fd', fontSize: '0.8rem', fontWeight: 800,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
              transition: 'background 0.2s',
            }}
          >
            ✏️ تعديل الشخصية
          </button>

          {/* تغيير الفريق */}
          <button
            onClick={handleSwitchTeam}
            style={{
              flex: 1, padding: '0.72rem 0.5rem', borderRadius: '0.9rem',
              background: oppTeam === 'green' ? 'rgba(16,185,129,0.14)' : 'rgba(239,68,68,0.14)',
              border: `1.5px solid ${oppTeam === 'green' ? 'rgba(16,185,129,0.38)' : 'rgba(239,68,68,0.38)'}`,
              color: oppTeam === 'green' ? '#4ade80' : '#f87171',
              fontSize: '0.8rem', fontWeight: 800,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
              transition: 'background 0.2s',
            }}
          >
            🔄 انتقل لـ{oppLabel}
          </button>
        </div>

        {/* ─── أوفرلاي تعديل الشخصية ─── */}
        <AnimatePresence>
          {showLobbyEdit && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed', inset: 0, zIndex: 200,
                background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(5px)',
                display: 'flex', alignItems: 'flex-end',
              }}
              onClick={e => { if (e.target === e.currentTarget) setShowLobbyEdit(false); }}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{
                  width: '100%', maxHeight: '82vh', overflowY: 'auto',
                  background: 'linear-gradient(145deg,rgba(15,6,38,0.99),rgba(28,11,56,0.99))',
                  border: `2px solid ${tc}38`,
                  borderTopLeftRadius: '1.5rem', borderTopRightRadius: '1.5rem',
                  padding: '1rem 1.25rem 1.75rem',
                  direction: 'rtl',
                }}
              >
                {/* مقبض */}
                <div style={{
                  width: '38px', height: '4px', borderRadius: '2rem',
                  background: 'rgba(255,255,255,0.18)', margin: '0 auto 0.9rem',
                }} />

                <div style={{
                  fontSize: '0.92rem', fontWeight: 900, color: 'white',
                  textAlign: 'center', marginBottom: '0.9rem',
                }}>تعديل الشخصية</div>

                {/* معاينة */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                  <motion.div
                    key={`${avatar.gender}-${avatar.skinTone}-${avatar.jacketColor}-${avatar.expression}-${avatar.accessory}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{
                      width: '86px', height: '86px', borderRadius: '50%',
                      background: `radial-gradient(circle, ${tc}20, transparent 70%)`,
                      border: `2.5px solid ${tc}45`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <CharacterAvatar avatar={avatar} size={68} />
                  </motion.div>
                </div>

                {/* الجنس */}
                <div style={{ marginBottom: '0.85rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.42)', fontWeight: 700, marginBottom: '0.38rem' }}>الجنس</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
                    {(['male', 'female'] as const).map(g => (
                      <button key={g} type="button" onClick={() => setAvatar(a => ({ ...a, gender: g }))} style={{
                        padding: '0.5rem', borderRadius: '0.7rem',
                        background: avatar.gender === g
                          ? (g === 'male' ? 'rgba(59,130,246,0.25)' : 'rgba(236,72,153,0.25)')
                          : 'rgba(255,255,255,0.05)',
                        border: avatar.gender === g
                          ? `2px solid ${g === 'male' ? '#3b82f6' : '#ec4899'}`
                          : '2px solid rgba(255,255,255,0.1)',
                        color: avatar.gender === g
                          ? (g === 'male' ? '#93c5fd' : '#f9a8d4')
                          : 'rgba(255,255,255,0.42)',
                        fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.2s',
                      }}>{g === 'male' ? '👦 ذكر' : '👧 أنثى'}</button>
                    ))}
                  </div>
                </div>

                {/* لون الشاشة */}
                <div style={{ marginBottom: '0.85rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.42)', fontWeight: 700, marginBottom: '0.38rem' }}>لون الشاشة</div>
                  <div style={{ display: 'flex', gap: '0.45rem' }}>
                    {SKIN_TONES.map((tone, i) => (
                      <button key={i} type="button" onClick={() => setAvatar(a => ({ ...a, skinTone: i }))} style={{
                        width: '34px', height: '34px', borderRadius: '50%', background: tone, flexShrink: 0,
                        border: avatar.skinTone === i ? '3px solid white' : '3px solid transparent',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }} />
                    ))}
                  </div>
                </div>

                {/* لون الكونسول */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.42)', fontWeight: 700, marginBottom: '0.38rem' }}>لون الكونسول</div>
                  <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                    {JACKET_COLORS.map((jc, i) => (
                      <button key={i} type="button" onClick={() => setAvatar(a => ({ ...a, jacketColor: i }))} style={{
                        width: '34px', height: '34px', borderRadius: '50%', background: jc, flexShrink: 0,
                        border: avatar.jacketColor === i ? '3px solid white' : '3px solid transparent',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }} />
                    ))}
                  </div>
                </div>

                {/* تعبير الوجه */}
                <div style={{ marginBottom: '0.85rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.42)', fontWeight: 700, marginBottom: '0.38rem' }}>تعبير الوجه</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.38rem' }}>
                    {([
                      { exp: 'happy' as const,     emoji: '😊', label: 'مبتسم'  },
                      { exp: 'wink' as const,      emoji: '😉', label: 'يغمز'   },
                      { exp: 'surprised' as const, emoji: '😮', label: 'متفاجئ' },
                      { exp: 'smug' as const,      emoji: '😏', label: 'خايس'   },
                    ]).map(({ exp, emoji, label }) => {
                      const isActive = avatar.expression === exp;
                      return (
                        <button key={exp} type="button"
                          onClick={() => setAvatar(a => ({ ...a, expression: exp }))}
                          style={{
                            padding: '0.42rem 0.1rem', borderRadius: '0.65rem', cursor: 'pointer',
                            background: isActive ? `${tc}28` : 'rgba(255,255,255,0.04)',
                            border: isActive ? `2px solid ${tc}80` : '2px solid rgba(255,255,255,0.08)',
                            color: isActive ? tc : 'rgba(255,255,255,0.35)',
                            fontWeight: 800, fontSize: '0.68rem', transition: 'all 0.2s',
                            boxShadow: isActive ? `0 0 8px ${tc}35` : 'none',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem',
                          }}>
                          <span style={{ fontSize: '1rem', lineHeight: 1 }}>{emoji}</span>
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* إكسسوار */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.42)', fontWeight: 700, marginBottom: '0.38rem' }}>إكسسوار</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                    {([
                      { acc: 'none' as const,       emoji: '✨', label: 'لا شيء',  color: '#94a3b8' },
                      { acc: 'headphones' as const, emoji: '🎧', label: 'سماعات', color: '#a78bfa' },
                      { acc: 'glasses' as const,    emoji: '🕶️', label: 'نظارة',  color: '#60a5fa' },
                      { acc: 'bow' as const,        emoji: '🎀', label: 'ربطة',   color: '#f472b6' },
                      { acc: 'horns' as const,      emoji: '😈', label: 'قرون',   color: '#ef4444' },
                      { acc: 'halo' as const,       emoji: '😇', label: 'هالة',   color: '#fbbf24' },
                    ]).map(({ acc, emoji, label, color }) => {
                      const isActive = avatar.accessory === acc;
                      return (
                        <button key={acc} type="button"
                          onClick={() => setAvatar(a => ({ ...a, accessory: isActive && acc !== 'none' ? 'none' : acc }))}
                          style={{
                            padding: '0.45rem 0.3rem', borderRadius: '0.7rem', cursor: 'pointer',
                            background: isActive ? `linear-gradient(135deg, ${color}28, ${color}12)` : 'rgba(255,255,255,0.04)',
                            border: isActive ? `2px solid ${color}70` : '2px solid rgba(255,255,255,0.08)',
                            color: isActive ? color : 'rgba(255,255,255,0.35)',
                            fontWeight: 800, fontSize: '0.72rem', transition: 'all 0.2s',
                            boxShadow: isActive ? `0 0 10px ${color}35` : 'none',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.12rem',
                          }}>
                          <span style={{ fontSize: '1rem', lineHeight: 1 }}>{emoji}</span>
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* أزرار الحفظ */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setShowLobbyEdit(false)}
                    style={{
                      flex: 1, padding: '0.72rem', borderRadius: '0.85rem',
                      background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                    }}
                  >إلغاء</button>
                  <button
                    onClick={handleSaveLobbyAvatar}
                    style={{
                      flex: 2, padding: '0.72rem', borderRadius: '0.85rem',
                      background: `linear-gradient(135deg, ${tc}, ${tc2})`,
                      border: 'none', color: 'white', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer',
                    }}
                  >✓ حفظ التغييرات</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <style>{`
          @keyframes lobbyDot   { 0%,100%{transform:scale(1);opacity:0.4;} 50%{transform:scale(1.5);opacity:1;} }
          @keyframes lobbyPulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
        `}</style>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // شاشة الجرس الرئيسية
  // ═══════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: theme.bgGradient, overflowX: 'hidden' }}>

      {/* ─── شريط الهيدر ─── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'linear-gradient(135deg,#1a0b2e,#2d1154)', borderBottom: '2px solid rgba(168,85,247,0.25)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
        {/* صف 1: اسم + نتيجة + فريق */}
        <div style={{ padding: '0.5rem 0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div style={{ fontWeight: 900, fontSize: '0.92rem', background: 'linear-gradient(135deg,#f97316,#ec4899,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px', flexShrink: 1 }}>
            {playerName}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2rem', padding: '0.22rem 0.75rem', flexShrink: 0 }}>
            <span style={{ color: '#10b981', fontWeight: 900, fontSize: '1rem' }}>{localScores.green}</span>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem', fontWeight: 600 }}>–</span>
            <span style={{ color: '#ef4444', fontWeight: 900, fontSize: '1rem' }}>{localScores.red}</span>
          </div>
          <div style={{ padding: '0.28rem 0.75rem', borderRadius: '2rem', background: teamGrad, fontSize: '0.78rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
            {myTeam === 'green' ? '🟢 أخضر' : '🔴 أحمر'}
          </div>
        </div>

        {/* صف 2: الخلية المختارة أو حالة الانتظار */}
        {activeCell ? (
          <div style={{ padding: '0.3rem 0.85rem 0.45rem', display: 'flex', alignItems: 'center', gap: '0.55rem', borderTop: '1px solid rgba(168,85,247,0.18)', background: activeCell.isGolden ? 'rgba(251,191,36,0.08)' : 'rgba(168,85,247,0.08)' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '0.6rem', background: activeCell.isGolden ? 'linear-gradient(135deg,#f59e0b,#fbbf24)' : 'linear-gradient(135deg,#a855f7,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.05rem', fontWeight: 900, color: 'white', flexShrink: 0 }}>
              {activeCell.letter}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>الخلية الحالية</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: activeCell.isGolden ? '#fbbf24' : '#c4b5fd' }}>
                {activeCell.isGolden ? '✨ ذهبية!' : '🎯 استعد للإجابة!'}
                {activeCell.hasCard && <span style={{ color: '#f9a8d4' }}> · 🎴 بطاقة!</span>}
              </div>
            </div>
            <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: activeCell.isGolden ? '#fbbf24' : '#a855f7', animation: 'bzFire 0.55s ease-in-out infinite alternate', flexShrink: 0 }} />
          </div>
        ) : (
          <div style={{ padding: '0.25rem 0.85rem 0.35rem', borderTop: '1px solid rgba(168,85,247,0.12)', fontSize: '0.68rem', color: 'rgba(255,255,255,0.28)', fontWeight: 600, textAlign: 'center' }}>
            ⏳ بانتظار اختيار خلية من المقدم...
          </div>
        )}
      </div>

      {/* ─── بانر حالة الجرس ─── */}
      <div style={{
        margin: '0.5rem 0.75rem 0',
        padding: '0.55rem 1rem',
        borderRadius: '1rem',
        background: status.bg || 'rgba(255,255,255,0.04)',
        border: `1.5px solid ${status.color}33`,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        transition: 'all 0.3s',
        minHeight: '42px',
      }}>
        <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{status.icon}</span>
        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: status.color, flex: 1 }}>{status.text}</span>

        {/* عداد تنازلي كبير عند الإجابة */}
        {(iAmActive || opponentActive) && activeSecsLeft > 0 && (
          <div style={{
            minWidth: '44px', height: '44px',
            borderRadius: '50%',
            background: iAmActive
              ? (myTeam === 'green' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)')
              : 'rgba(255,255,255,0.1)',
            border: `3px solid ${iAmActive ? teamColor : opponentColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.3rem', fontWeight: 900, color: iAmActive ? teamColor : opponentColor,
            animation: activeSecsLeft <= 2 ? 'bzPulse 0.5s ease-in-out infinite' : 'none',
            flexShrink: 0,
          }}>
            {activeSecsLeft}
          </div>
        )}

        {/* عداد نافذة الخصم (P2 / phase3_opp) */}
        {(buzzerState.phase === 'phase2' || buzzerState.phase === 'phase3_opp') && !buzzerState.activeTeam && opponentSecsLeft > 0 && (
          <div style={{
            minWidth: '44px', height: '44px', borderRadius: '50%',
            background: iAmFirstTeam ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
            border: `3px solid ${iAmFirstTeam ? '#f87171' : '#22c55e'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', fontWeight: 900, color: iAmFirstTeam ? '#f87171' : '#22c55e',
            flexShrink: 0,
          }}>
            {opponentSecsLeft}
          </div>
        )}

      </div>

      {/* ─── منطقة الشبكة ─── */}
      <div style={{ flex: 1, width: '100%', padding: '0.5rem 0.5rem 90px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {cells.length > 0 ? (
          <>
            <div style={{ width: '100%', borderRadius: '1.25rem', overflow: 'hidden', border: `2px solid ${activeCell ? (activeCell.isGolden ? 'rgba(251,191,36,0.5)' : 'rgba(168,85,247,0.45)') : 'rgba(139,92,246,0.2)'}`, boxShadow: activeCell ? `0 0 24px ${activeCell.isGolden ? 'rgba(251,191,36,0.2)' : 'rgba(168,85,247,0.2)'}` : '0 4px 20px rgba(0,0,0,0.4)', background: 'linear-gradient(145deg,rgba(15,10,35,0.98),rgba(30,20,60,0.95))' }}>
              <HexGrid cells={cells} selectedCellId={selectedCellId} showCardIndicator={false} colorsSwapped={colorsSwapped} scale={gridScale} />
            </div>

            <div style={{ width: '100%', padding: '0.5rem 0.75rem 0.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <button onClick={() => setGridScale(s => Math.max(0.42, +(s - 0.06).toFixed(2)))} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', color: 'white', fontSize: '1.1rem', fontWeight: 900, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <input type="range" min={0.42} max={0.95} step={0.03} value={gridScale} onChange={e => setGridScale(+e.target.value)} style={{ flex: 1, height: '6px', accentColor: '#a855f7', cursor: 'pointer' }} />
              <button onClick={() => setGridScale(s => Math.min(0.95, +(s + 0.06).toFixed(2)))} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', color: 'white', fontSize: '1.1rem', fontWeight: 900, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600, minWidth: '32px', textAlign: 'center' }}>{Math.round(gridScale * 100)}%</span>
            </div>
          </>
        ) : (
          <div style={{ width: '100%', border: '1.5px dashed rgba(255,255,255,0.1)', borderRadius: '1.25rem', padding: '3rem 1rem', textAlign: 'center', color: 'rgba(255,255,255,0.22)', fontSize: '0.9rem', fontWeight: 600 }}>
            ⏳ في انتظار بدء اللعبة...
          </div>
        )}
      </div>

      {/* ─── شريط الأزرار الثابت ─── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
        background: 'linear-gradient(0deg,rgba(8,0,20,1) 0%,rgba(8,0,20,0.92) 100%)',
        borderTop: `2px solid ${buttonsDisabled ? 'rgba(239,68,68,0.3)' : canPress ? 'rgba(168,85,247,0.4)' : 'rgba(239,68,68,0.3)'}`,
        padding: '0.55rem 0.75rem',
        display: 'flex', gap: '0.6rem', alignItems: 'stretch',
        transition: 'border-top-color 0.3s',
      }}>

        {/* ── زر الإجابة ── */}
        <button
          onClick={() => handleBuzzerPress('answer')}
          disabled={buttonsDisabled}
          style={{
            flex: 1, minHeight: '68px', borderRadius: '1.1rem',
            background: buttonsDisabled
              ? 'rgba(100,100,120,0.35)'
              : isSending
                ? 'rgba(245,158,11,0.4)'
                : 'linear-gradient(135deg,#f59e0b,#f97316)',
            border: `2.5px solid ${buttonsDisabled ? 'rgba(150,150,170,0.25)' : isSending ? 'rgba(245,158,11,0.6)' : '#fb923c'}`,
            color: buttonsDisabled ? 'rgba(255,255,255,0.3)' : 'white',
            fontSize: '0.82rem', fontWeight: 900,
            cursor: buttonsDisabled ? 'not-allowed' : 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem',
            boxShadow: buttonsDisabled ? 'none' : isSending ? '0 0 20px rgba(245,158,11,0.3)' : '0 0 24px rgba(245,158,11,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
            transition: 'all 0.18s', position: 'relative', overflow: 'hidden',
            animation: canPress && !buttonsDisabled ? 'bzGlow 2s ease-in-out infinite' : 'none',
          }}
          onTouchStart={e => { if (!buttonsDisabled) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
          onTouchEnd={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        >
          {!buttonsDisabled && !isSending && (
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(255,255,255,0.12),transparent)', borderRadius: '1.1rem', pointerEvents: 'none' }} />
          )}
          <Bell size={26} strokeWidth={buttonsDisabled ? 1.5 : 2.5} />
          <span>
            {isSending ? '📡 إرسال...'
              : (buzzerState.phase === 'phase2' && !iAmFirstTeam) ? 'م٢ — اضغط الآن! 🎯'
              : buzzerState.phase === 'phase3_open' ? 'م٣ — اضغط الآن! 🔔'
              : (buzzerState.phase === 'phase3_opp' && !iAmFirstTeam) ? 'م٣ — فرصتك الأخيرة! 🎯'
              : 'إجابة 📣'}
          </span>
        </button>

        {/* ── زر طلب البطاقة ── */}
        <button
          onClick={() => handleBuzzerPress('card')}
          disabled={buttonsDisabled}
          style={{
            flex: 1, minHeight: '68px', borderRadius: '1.1rem',
            background: buttonsDisabled
              ? 'rgba(100,100,120,0.35)'
              : isSending
                ? 'rgba(168,85,247,0.3)'
                : 'linear-gradient(135deg,#a855f7,#ec4899)',
            border: `2.5px solid ${buttonsDisabled ? 'rgba(150,150,170,0.25)' : isSending ? 'rgba(168,85,247,0.5)' : '#c084fc'}`,
            color: buttonsDisabled ? 'rgba(255,255,255,0.3)' : 'white',
            fontSize: '0.82rem', fontWeight: 900,
            cursor: buttonsDisabled ? 'not-allowed' : 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem',
            boxShadow: buttonsDisabled ? 'none' : isSending ? '0 0 20px rgba(168,85,247,0.3)' : '0 0 24px rgba(168,85,247,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
            transition: 'all 0.18s', position: 'relative', overflow: 'hidden',
            animation: canPress && !buttonsDisabled ? 'bzGlow 2s ease-in-out infinite 0.5s' : 'none',
          }}
          onTouchStart={e => { if (!buttonsDisabled) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
          onTouchEnd={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        >
          {!buttonsDisabled && !isSending && (
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(255,255,255,0.12),transparent)', borderRadius: '1.1rem', pointerEvents: 'none' }} />
          )}
          <CreditCard size={26} strokeWidth={buttonsDisabled ? 1.5 : 2.5} />
          <span>
            {isSending ? '📡 إرسال...'
              : (buzzerState.phase === 'phase2' && !iAmFirstTeam) ? 'م٢ — بطاقة الآن! 🎯'
              : buzzerState.phase === 'phase3_open' ? 'م٣ — بطاقة! 🎴'
              : (buzzerState.phase === 'phase3_opp' && !iAmFirstTeam) ? 'م٣ — بطاقة أخيرة! 🎴'
              : 'طلب بطاقة 🎴'}
          </span>
        </button>

        {/* ── زر الدليل ── */}
        <button onClick={() => setShowGuide(true)}
          style={{ width: '52px', borderRadius: '1.1rem', background: 'rgba(168,85,247,0.12)', border: '2px solid rgba(168,85,247,0.3)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <HelpCircle size={22} />
        </button>
      </div>

      {/* ─── بانر "أنا فزت بالجرس" ─── */}
      {iAmActive && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 4500,
          background: myTeam === 'green'
            ? 'linear-gradient(145deg,#059669,#10b981,#34d399)'
            : 'linear-gradient(145deg,#b91c1c,#ef4444,#f87171)',
          borderRadius: '2rem',
          padding: '1.5rem 2rem',
          textAlign: 'center',
          boxShadow: myTeam === 'green'
            ? '0 0 80px rgba(16,185,129,0.7), 0 20px 60px rgba(0,0,0,0.5)'
            : '0 0 80px rgba(239,68,68,0.7), 0 20px 60px rgba(0,0,0,0.5)',
          animation: 'bzBounceIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          pointerEvents: 'none',
          border: '3px solid rgba(255,255,255,0.4)',
          minWidth: '200px',
        }}>
          {/* الأفاتار */}
          <div style={{
            width: '90px', height: '90px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            border: '3px solid rgba(255,255,255,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 0.6rem',
            animation: 'bzPulse 1.5s ease-in-out infinite',
          }}>
            <CharacterAvatar avatar={avatar} size={70} />
          </div>

          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'white', marginBottom: '0.2rem' }}>
            {playerName}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)', fontWeight: 700, marginBottom: '0.65rem' }}>
            {buzzerState.pressType === 'answer' ? '📣 أجب الآن!' : '🎴 طلبت بطاقة!'}
          </div>

          {/* عداد تنازلي */}
          <div style={{
            width: '60px', height: '60px', borderRadius: '50%',
            background: 'rgba(0,0,0,0.2)', border: '4px solid rgba(255,255,255,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.8rem', fontWeight: 900, color: 'white',
            margin: '0 auto',
            animation: activeSecsLeft <= 2 ? 'bzPulse 0.4s ease-in-out infinite' : 'none',
          }}>
            {activeSecsLeft}
          </div>
        </div>
      )}

      {/* ─── بانر "الخصم يجيب" ─── */}
      {opponentActive && (
        <div style={{
          position: 'fixed', bottom: '88px', left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 300,
          background: opponentTeam === 'green'
            ? 'rgba(16,185,129,0.95)'
            : 'rgba(239,68,68,0.95)',
          borderRadius: '2rem',
          padding: '0.55rem 1.5rem',
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          animation: 'bzSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <span style={{ fontSize: '1rem' }}>{buzzerState.pressType === 'answer' ? '📣' : '🎴'}</span>
          <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: 800 }}>
            {buzzerState.activatedBy}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>
            — {activeSecsLeft}s
          </span>
        </div>
      )}

      {/* ─── دليل الأزرار ─── */}
      {showGuide && (
        <BuzzerGuide
          onClose={() => setShowGuide(false)}
          onDontShowAgain={() => localStorage.setItem('buzzer-guide-done', '1')}
        />
      )}

      {/* ═══ طبقة الأوفرلي ═══ */}
      {showCardTeaser && <CardTeaserOverlay letter={showCardTeaser.letter} isGolden={showCardTeaser.isGolden} isHost={false} />}
      {showRoulette && <CardRoulette onComplete={() => setShowRoulette(false)} syncedCard={syncedCard} isViewerMode={true} triggerType={rouletteTriggerType} />}
      {cardAnimation && <CardAnimation type={cardAnimation.type} message={cardAnimation.message} onComplete={() => setCardAnimation(null)} />}

      {localWinner && localWinMessage && !localMatchWinner && localSettings && (
        <ResultsOverlay winner={localWinner}
          winType={(localWinMessage.includes('ربط') ? 'wall-to-wall' : localWinMessage.includes('5 خلايا') ? 'five-connected' : 'most-letters') as any}
          winMessage={localWinMessage} greenScore={localScores.green} redScore={localScores.red}
          greenTeamName={localSettings.teamNames.green} redTeamName={localSettings.teamNames.red} />
      )}

      {localMatchWinner && localSettings && (
        <MatchWinnerOverlay winner={localMatchWinner}
          winnerName={localMatchWinner === 'green' ? localSettings.teamNames.green : localSettings.teamNames.red}
          greenScore={localScores.green} redScore={localScores.red}
          greenTeamName={localSettings.teamNames.green} redTeamName={localSettings.teamNames.red}
          onNewSettings={() => { setLocalMatchWinner(null); setLocalWinner(null); }}
          onRestartMatch={() => { setLocalMatchWinner(null); setLocalWinner(null); }}
          onGoHome={() => { setLocalMatchWinner(null); setLocalWinner(null); }} />
      )}

      {showRandomLetterAnn && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 4800, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', borderRadius: '1.5rem', padding: '2rem 2.5rem', textAlign: 'center', boxShadow: '0 0 60px rgba(245,158,11,0.5)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎲</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'white' }}>حرف عشوائي!</div>
          </div>
        </div>
      )}

      {streakAnnouncement && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 4000, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: streakAnnouncement.team === 'green' ? 'linear-gradient(135deg,rgba(16,185,129,0.95),rgba(5,150,105,0.95))' : 'linear-gradient(135deg,rgba(239,68,68,0.95),rgba(220,38,38,0.95))', borderRadius: '1.5rem', padding: '1.5rem 2rem', textAlign: 'center', boxShadow: '0 0 60px rgba(0,0,0,0.5)', animation: 'bzBounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1)', maxWidth: '80vw' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>🔥</div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', fontWeight: 700, marginBottom: '0.25rem' }}>3 إجابات متتالية!</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'white' }}>{streakAnnouncement.teamName}</div>
            <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(255,255,255,0.2)', borderRadius: '1rem', padding: '0.2rem 0.75rem', color: 'white', display: 'inline-block' }}>🎁 يستحق بطاقة مكافأة!</div>
          </div>
        </div>
      )}

      {forcedQuestion && (
        <div style={{ position: 'fixed', bottom: '92px', left: '0.75rem', right: '0.75rem', zIndex: 300, background: 'linear-gradient(135deg,rgba(99,102,241,0.97),rgba(168,85,247,0.97))', border: '2px solid rgba(168,85,247,0.7)', borderRadius: '1.1rem', padding: '0.75rem 1rem', boxShadow: '0 0 30px rgba(168,85,247,0.4)', animation: 'bzSlideIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            {forcedQuestion.letter && (
              <div style={{ width: '40px', height: '40px', borderRadius: '0.6rem', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', fontWeight: 900, color: 'white', flexShrink: 0 }}>{forcedQuestion.letter}</div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700, marginBottom: '0.2rem' }}>📖 السؤال</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'white', lineHeight: 1.4 }}>{forcedQuestion.question}</div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bzBounceIn { from { opacity:0; transform:translate(-50%,-50%) scale(0.5); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }
        @keyframes bzSlideIn  { from { opacity:0; transform:translateX(-50%) scale(0.85); } to { opacity:1; transform:translateX(-50%) scale(1); } }
        @keyframes bzFadeIn   { from { opacity:0; } to { opacity:1; } }
        @keyframes bzFire     { from { transform:scale(1) rotate(-5deg); } to { transform:scale(1.15) rotate(5deg); } }
        @keyframes bzPulse    { 0%,100% { transform:scale(1); } 50% { transform:scale(1.12); } }
        @keyframes bzGlow     { 0%,100% { box-shadow:0 0 24px rgba(168,85,247,0.5); } 50% { box-shadow:0 0 40px rgba(168,85,247,0.8), 0 0 60px rgba(168,85,247,0.3); } }
        input[type=range]::-webkit-slider-thumb { width:18px; height:18px; }
        input[type=range]::-webkit-slider-runnable-track { border-radius:4px; }
      `}</style>
    </div>
  );
};
// src/components/AnswerBuzzersScreen.tsx
// شاشة Answer Buzzers — نظام جرس صارم بالفريق مع Real-time عبر Supabase

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useInactivityKick, InactivityWarningModal, DisconnectedScreen } from '../hooks/useInactivityKick';
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
import { ResultsOverlay } from './ResultsOverlay';
import { MatchWinnerOverlay } from './MatchWinnerOverlay';
import { CardAnimation } from './CardAnimation';
import { CardRoulette } from './CardRoulette';
import { CardTeaserOverlay } from './CardTeaserOverlay';
import {
  BuzzerChannel,
  INITIAL_BUZZER_STATE,
  PHASE1_DURATION,
  applyActiveExpiry,
  applyOpponentExpiry,
  canTeamPress,
  getActiveSecondsLeft,
  getOpponentSecondsLeft,
} from '../utils/BuzzerEngine';
import type { BuzzerAttempt, BuzzerState, BuzzerStatus } from '../utils/BuzzerEngine';
import type { CardType } from '../core/types';
import type { GameSettingsData } from './GameSettings';

interface SelectedCellInfo {
  cellId: string;
  letter: string;
  hasCard: boolean;
  isGolden: boolean;
}

// ─── WaitingPlayerCard — أفقي، mobile-first ────────────────────────────────
interface WaitingPlayerCardProps {
  p: { name: string; team: 'green' | 'red'; avatar: AvatarConfig };
  isMe: boolean;
}
const WaitingPlayerCard: React.FC<WaitingPlayerCardProps> = ({ p, isMe }) => {
  const c = p.team === 'green' ? '#10b981' : '#ef4444';
  return (
    <motion.div
      initial={{ opacity: 0, x: 18, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -12, scale: 0.88 }}
      transition={{ type: 'spring', stiffness: 340, damping: 26 }}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.55rem',
        padding: '0.5rem 0.65rem', borderRadius: '0.85rem',
        background: isMe ? `${c}18` : 'rgba(255,255,255,0.04)',
        border: `1.5px solid ${isMe ? c + '70' : c + '28'}`,
        boxShadow: isMe ? `0 2px 12px ${c}22` : 'none',
      }}
    >
      {/* أفاتار */}
      <div style={{
        width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
        background: `${c}18`, border: `1.5px solid ${c}50`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <CharacterAvatar avatar={p.avatar} size={28} />
      </div>
      {/* الاسم */}
      <div style={{
        fontSize: '0.8rem', fontWeight: 800, color: isMe ? 'white' : 'rgba(255,255,255,0.82)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
      }}>{p.name}</div>
      {/* شارة "أنت" */}
      {isMe && (
        <div style={{
          background: c, color: 'white', fontSize: '0.55rem', fontWeight: 900,
          padding: '2px 7px', borderRadius: '2rem', flexShrink: 0,
        }}>أنت</div>
      )}
    </motion.div>
  );
};

// (لا يوجد timer محلي للتزامن — HostScreen هو المحكّم الوحيد)

export const AnswerBuzzersScreen: React.FC = () => {
  const { isMobile } = useScreenSize();
  const { theme } = useTheme();
  const { cells, syncFromExternal } = useGameStore();

  // ── بيانات اللاعب ──
  const [isRegistered, setIsRegistered] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<'green' | 'red'>('green');
  const playerNameRef = useRef(playerName);
  const selectedTeamRef = useRef(selectedTeam);
  playerNameRef.current = playerName.trim();
  selectedTeamRef.current = selectedTeam;
  // يُستخدم لتجاوز beforeunload عند الطرد التلقائي (يمنع ظهور "Leave site?")
  const isKickingRef = useRef(false);

  // ── أفاتار الشخصية ──
  const [avatar, setAvatar] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const avatarRef = useRef<AvatarConfig>(avatar);
  avatarRef.current = avatar;

  // ── غرفة الانتظار ──
  const [isWaitingRoom, setIsWaitingRoom] = useState(false);
  const isWaitingRoomRef = useRef(false);
  const isRegisteredRef  = useRef(false);
  const [isAwaitingApproval, setIsAwaitingApproval] = useState(false);
  const isAwaitingApprovalRef = useRef(false);
  const registrationTimeRef = useRef<number>(0); // لتمييز SESSION_ENDED الحقيقي من الوهمي
  const [rejectedMessage, setRejectedMessage] = useState<string | null>(null);
  const [waitingPlayers, setWaitingPlayers] = useState<Array<{
    name: string;
    team: 'green' | 'red';
    avatar: AvatarConfig;
  }>>([]);
  const [showLobbyEdit, setShowLobbyEdit] = useState(false);

  // ── Ping الخاص باللاعب ──
  const [myPing, setMyPing] = useState<number | null>(null);

  // ── نظام الجرس الجديد ──
  const [buzzerState, setBuzzerState] = useState<BuzzerState>(INITIAL_BUZZER_STATE);
  const buzzerStateRef = useRef(buzzerState);
  buzzerStateRef.current = buzzerState;
  const [buzzerChannel, setBuzzerChannel] = useState<BuzzerChannel | null>(null);
  const [isSending, setIsSending] = useState(false); // Optimistic: ضغطنا وننتظر تأكيد
  const [buzzerStatus, setBuzzerStatus] = useState<BuzzerStatus>('connecting');

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
  const [showRandomLetterAnn, setShowRandomLetterAnn] = useState(false);
  const [streakAnnouncement, setStreakAnnouncement] = useState<{ team: 'green' | 'red'; teamName: string } | null>(null);
  const [forcedQuestion, setForcedQuestion] = useState<{ question: string; letter: string } | null>(null);
  // ─── Card overlays (viewer mode — sync only, no interaction) ──────────────
  const [cardAnimation, setCardAnimation] = useState<{ type: CardType | 'cardFound'; message?: string } | null>(null);
  const [showRoulette, setShowRoulette] = useState(false);
  const [rouletteTriggerType, setRouletteTriggerType] = useState<'card' | 'golden'>('card');
  const [syncedCard, setSyncedCard] = useState<CardType | null>(null);
  const [showCardTeaser, setShowCardTeaser] = useState<{ letter: string; isGolden: boolean } | null>(null);
  const [goldenLetter, setGoldenLetter] = useState<string | null>(null); // إعلان الحرف الذهبي

  const sessionId = new URLSearchParams(window.location.search).get('session') || '';

  // ── فتح Realtime صريحاً (لا يحدث تلقائياً في Constructor) ──
  useEffect(() => {
    if (!sessionId) return;
    syncManager.joinSession(sessionId);
  }, [sessionId]);

  const [connectionDegraded, setConnectionDegraded] = useState(false);
  const [overloadCountdown, setOverloadCountdown] = useState(30);

  // مراقبة صحة الاتصال — Full House / شبكة معطلة
  useEffect(() => {
    return syncManager.onHealth(h => setConnectionDegraded(h === 'degraded'));
  }, []);

  // عند امتلاء السيرفر وكان اللاعب مسجلاً → عداد 30 ثانية ثم طرد تلقائي
  useEffect(() => {
    if (!connectionDegraded || !isRegistered) return;
    setOverloadCountdown(30);
    const interval = setInterval(() => {
      setOverloadCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (playerNameRef.current) {
            syncManager.broadcast({ type: 'player-left', name: playerNameRef.current });
          }
          window.location.href = window.location.origin + window.location.pathname + '?kicked=overload';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [connectionDegraded, isRegistered]);

  // ── AFK System: طرد تلقائي بعد 5 دقائق من عدم النشاط ──

  const shouldKick = useCallback(async () => {
    // دائماً اطرد بعد انتهاء وقت الخمول — بغض النظر عن حجم السيرفر
    return true;
  }, []);

  const {
    showWarning: showAfkWarning,
    countdown: afkCountdown,
    stayActive: afkStayActive,
    isDisconnected,
    reconnect: afkReconnect,
  } = useInactivityKick({
      enabled: isRegistered,
      onBeforeKick: () => {
        if (playerNameRef.current) {
          syncManager.broadcast({ type: 'player-left', name: playerNameRef.current });
        }
      },
      shouldKick,
    });

  // ── تحذير عند تحديث/إغلاق الصفحة أثناء اللعبة ──
  useEffect(() => {
    if (!isRegistered) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (isKickingRef.current) return; // اسمح للطرد التلقائي بالمرور بدون حوار
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isRegistered]);

  // ═══════════════════════════════════════════════════════════════
  // broadcast "player-left" عند إغلاق الصفحة أو مغادرة اللاعب
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    return () => {
      if (isRegisteredRef.current && playerNameRef.current) {
        syncManager.broadcast({ type: 'player-left', name: playerNameRef.current });
      }
      // تنظيف WebSocket عند مغادرة الشاشة (unmount)
      syncManager.disconnect();
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

    // تتبع حالة الاتصال — 'connecting' | 'ready' | 'error'
    const offStatus = channel.onStatus(setBuzzerStatus);

    // استقبال الفائز المعلَن من HostScreen
    const offWinner = channel.onWinner((winner) => {
      // أعد ضبط activeUntil من الوقت المحلي الحالي حتى يبدأ العداد
      // من اللحظة التي يظهر فيها الاسم على شاشة الجرس (لا من وقت المقدم)
      const state = winner.newState;
      const freshState: BuzzerState = {
        ...state,
        ...(state.activeTeam && state.activeUntil
          ? { activeUntil: Date.now() + PHASE1_DURATION }
          : {}),
      };
      setBuzzerState(freshState);
      setIsSending(false);
    });

    return () => {
      offStatus();
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
      } else if (data.type === 'BUZZER_WINNER_SYNC') {
        // نسخة احتياطية من قرار المقدم — نفس منطق onWinner
        const state = data.newState as BuzzerState;
        const freshState: BuzzerState = {
          ...state,
          ...(state.activeTeam && state.activeUntil
            ? { activeUntil: Date.now() + PHASE1_DURATION }
            : {}),
        };
        setBuzzerState(freshState);
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
        // انضمام في منتصف اللعبة → انتظر موافقة المقدم
        if (data.roundStarted === true && isWaitingRoomRef.current && isRegisteredRef.current) {
          setIsAwaitingApproval(true);
          isAwaitingApprovalRef.current = true;
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
        // لاعب انضم أو غيّر فريقه — حدّث إن وُجد، أضف إن لم يوجد
        if (data.player) {
          setWaitingPlayers(prev => {
            const idx = prev.findIndex(p => p.name === data.player.name);
            if (idx >= 0) {
              // تحديث الفريق أو الأفاتار (يحدث عند تغيير الفريق)
              const updated = [...prev];
              updated[idx] = {
                name: data.player.name,
                team: data.player.team,
                avatar: data.player.avatar || DEFAULT_AVATAR,
              };
              return updated;
            }
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
        // الجولة بدأت → جميع اللاعبين في غرفة الانتظار يدخلون الآن بدون قيود
        setIsWaitingRoom(false);
        isWaitingRoomRef.current = false;
        setIsAwaitingApproval(false);
        isAwaitingApprovalRef.current = false;
        setSelectedCellId(null); setActiveCell(null);
      } else if (data.type === 'SETTINGS_UPDATED') {
        if (data.colorsSwapped !== undefined) setColorsSwapped(data.colorsSwapped);
      // ─── Card overlays (viewer) ───────────────────────────────────────────
      } else if (data.type === 'GOLDEN_ANNOUNCEMENT') {
        setGoldenLetter(data.letter as string);
      } else if (data.type === 'GOLDEN_DISMISSED') {
        setGoldenLetter(null);
      } else if (data.type === 'CARD_TEASER') {
        setShowCardTeaser({ letter: data.letter, isGolden: !!data.isGolden });
      } else if (data.type === 'ROULETTE_START') {
        setShowCardTeaser(null);
        setRouletteTriggerType(data.triggerType || 'card');
        setSyncedCard(null);
        setShowRoulette(true);
      } else if (data.type === 'ROULETTE_END') {
        setSyncedCard(data.card);
      } else if (
        data.type === 'CARD_ANIMATION' ||
        data.type === 'CARD_FOUND' ||
        data.type === 'CARD_WON' ||
        data.type === 'STREAK_REWARD_CARD'
      ) {
        setCardAnimation({ type: data.cardType, message: data.message });
      } else if (data.type === 'CARD_ADDED' || data.type === 'CARDS_CLEARED') {
        if (data.teamCards) setLocalTeamCards(data.teamCards);
      } else if (data.type === 'GAME_WON') {
        if (data.scores) setLocalScores(data.scores);
        if (data.winner) setLocalWinner(data.winner);
        if (data.winMessage) setLocalWinMessage(data.winMessage);
        if (data.matchWinner) setLocalMatchWinner(data.matchWinner);
      } else if (data.type === 'SESSION_ENDED') {
        // المقدم أنهى الجلسة — أعد اللاعب لشاشة التسجيل
        // حارس: تجاهل SESSION_ENDED الوهمي (يصل < 2 ثانية من التسجيل — React StrictMode bounce)
        const msSinceReg = registrationTimeRef.current > 0
          ? Date.now() - registrationTimeRef.current
          : Infinity;
        if (msSinceReg >= 2000) {
          // قطع WebSocket فوراً — تحرير اتصال Supabase
          syncManager.disconnect();
          setIsRegistered(false);
          isRegisteredRef.current = false;
          setIsWaitingRoom(false);
          isWaitingRoomRef.current = false;
          setIsAwaitingApproval(false);
          isAwaitingApprovalRef.current = false;
          setPlayerName('');
          setWaitingPlayers([]);
          setRejectedMessage('انتهت الجلسة. يمكنك الانضمام لجلسة جديدة.');
        }
      } else if (data.type === 'ADMIN_FORCE_CLOSE') {
        // الأدمن أغلق الجلسة — نفس معاملة SESSION_ENDED
        syncManager.disconnect();
        setIsRegistered(false);
        isRegisteredRef.current = false;
        setIsWaitingRoom(false);
        isWaitingRoomRef.current = false;
        setRejectedMessage(data.message || 'تم إغلاق الجلسة بواسطة الإدارة. تواصل مع فريق الدعم إن كانت هناك أي إشكالية.');
      } else if (data.type === 'MATCH_RESET') {
        setLocalScores({ green: 0, red: 0 });
        setLocalMatchWinner(null);
        setLocalTeamCards({ green: [], red: [] });
        setLocalWinner(null); setLocalWinMessage(null);
        // إعادة تعيين حالة الانتظار — المباراة بدأت من جديد
        if (isWaitingRoomRef.current) {
          setIsAwaitingApproval(false);
          isAwaitingApprovalRef.current = false;
        }
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
      } else if (data.type === 'host-ping') {
        // رد فوري على PING لقياس زمن الاستجابة
        if (isRegisteredRef.current && playerNameRef.current) {
          syncManager.broadcast({
            type: 'player-pong',
            name: playerNameRef.current,
            ts: data.ts,
          });
        }
      } else if (data.type === 'PLAYER_PING_UPDATE') {
        if (data.name === playerNameRef.current) {
          setMyPing(data.ping as number);
        }
      } else if (data.type === 'REQUEST_PLAYER_LIST') {
        // المقدم يطلب قائمة اللاعبين (دوري أو عند انضمام لاعب جديد)
        // يرد جميع اللاعبين المسجلين — سواء في غرفة الانتظار أو يلعبون بالفعل
        if (isRegisteredRef.current && playerNameRef.current) {
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
          }, Math.random() * 300);
        }
      } else if (data.type === 'SEND_TO_BUZZERS') {
        // المقدم انتقل من الإعدادات للعبة — اللاعبون قبل البداية يدخلون الآن
        // اللاعبون في منتصف الجولة (isAwaitingApproval=true) ينتظرون موافقة المقدم الصريحة
        if (isWaitingRoomRef.current && !isAwaitingApprovalRef.current) {
          setIsWaitingRoom(false);
          isWaitingRoomRef.current = false;
        }
      } else if (data.type === 'player-join-approved') {
        if (data.name === playerNameRef.current) {
          // أزل حالة انتظار الموافقة دائماً
          setIsAwaitingApproval(false);
          isAwaitingApprovalRef.current = false;
          // اخرج من غرفة الانتظار دائماً عند موافقة المقدم
          setIsWaitingRoom(false);
          isWaitingRoomRef.current = false;
          // اطلب حالة اللعبة الكاملة لضمان أن اللاعب يرى أحدث نسخة
          syncManager.broadcast({ type: 'REQUEST_FULL_STATE', timestamp: Date.now() });
        }
      } else if (data.type === 'player-join-rejected') {
        // المقدم رفض طلب انضمامي
        if (data.name === playerNameRef.current) {
          setIsRegistered(false);
          isRegisteredRef.current = false;
          setIsWaitingRoom(false);
          isWaitingRoomRef.current = false;
          setIsAwaitingApproval(false);
          isAwaitingApprovalRef.current = false;
          setPlayerName('');
          setWaitingPlayers([]);
          setRejectedMessage('رفض المقدم انضمامك. يمكنك تغيير الاسم والمحاولة مجدداً.');
        }
      } else if (data.type === 'player-left') {
        // لاعب غادر — احذفه من قائمة غرفة الانتظار عند الجميع
        setWaitingPlayers(prev => prev.filter(p => p.name !== data.name));
      } else if (data.type === 'player-kicked') {
        // المقدم طرد لاعباً
        // حذفه من قائمة الانتظار عند الجميع
        setWaitingPlayers(prev => prev.filter(p => p.name !== data.name));
        // إذا كنت أنا المطرود → إعادة التسجيل
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

  // إعادة إرسال player-registered بعد التسجيل بفترات زمنية لضمان وصوله للـ host
  // يعالج حالة: الإرسال الأول قبل اكتمال اتصال Realtime
  useEffect(() => {
    if (!isRegistered || !sessionId) return;
    const retries = [2000, 5000, 10000];
    const timers = retries.map(delay =>
      setTimeout(() => {
        if (!isRegisteredRef.current || !playerNameRef.current) return;
        syncManager.broadcast({
          type: 'player-registered',
          player: {
            name: playerNameRef.current,
            team: selectedTeamRef.current,
            timestamp: Date.now(),
            avatar: avatarRef.current,
          },
        });
      }, delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [isRegistered, sessionId]);

  // طلب قائمة اللاعبين فور تحميل الشاشة (للكشف عن أسماء مكررة قبل التسجيل)
  // نبدأ بعد 1.5 ث لإتاحة وقت كافٍ لاتصال Realtime
  useEffect(() => {
    if (!sessionId) return;
    const t = setTimeout(() => {
      syncManager.broadcast({ type: 'REQUEST_PLAYER_LIST' });
    }, 1500);
    return () => clearTimeout(t);
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

  const [nameError, setNameError] = useState('');

  const doRegister = () => {
    const nameTrimmed = playerName.trim();
    if (nameTrimmed.length < 2) { setNameError('ممكن اسم أطول شوي؟ (حرفين على الأقل)'); return; }
    const isDuplicate = waitingPlayers.some(p => p.name.trim() === nameTrimmed);
    if (isDuplicate) { setNameError('هذا الاسم موجود! ممكن اسم ثاني؟'); return; }
    setNameError('');
    const av = avatarRef.current;
    syncManager.broadcast({
      type: 'player-registered',
      player: { name: nameTrimmed, team: selectedTeam, timestamp: Date.now(), avatar: av },
    });
    setWaitingPlayers([{ name: nameTrimmed, team: selectedTeam, avatar: av }]);
    registrationTimeRef.current = Date.now();
    setIsRegistered(true);
    isRegisteredRef.current = true;
    setIsWaitingRoom(true);
    isWaitingRoomRef.current = true;
    // لا نعرف بعد إذا كانت اللعبة جارية — FULL_STATE_SYNC هو من يحدد isAwaitingApproval
    // إذا roundStarted=true في الاستجابة → انضمام في منتصف اللعبة → ينتظر موافقة المقدم
    // إذا roundStarted=false → لاعب قبل البداية → يدخل تلقائياً عند SEND_TO_BUZZERS أو ROUND_STARTED
    setIsAwaitingApproval(false);
    isAwaitingApprovalRef.current = false;
    syncManager.broadcast({ type: 'REQUEST_FULL_STATE' });
    setTimeout(() => {
      syncManager.broadcast({ type: 'REQUEST_PLAYER_LIST' });
    }, 400);
  };

  const handleRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    doRegister();
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

  // الجرس يعمل فقط إذا كان الاتصال جاهزاً
  const canPress = canTeamPress(buzzerState, myTeam, now) && !isSending && buzzerStatus === 'ready';

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
      { exp: 'smug' as const,      emoji: '😏', label: 'واثق'    },
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
      <div className="screen-min-scroll" style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '1rem', background: theme.bgGradient, direction: 'rtl',
      }}>
        <div style={{
          maxWidth: isMobile ? '100%' : '400px', width: '100%', marginTop: isMobile ? '0' : '0.5rem',
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
            <div style={{ fontSize: '1.25rem', fontWeight: 400, color: 'rgba(255,255,255,0.95)', fontFamily: "'Lalezar', sans-serif" }}>شخصيتك في اللعبة؟</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.2rem' }}>صمّم مظهرك وانضم للمباراة</div>
          </div>

          {/* رسالة الرفض */}
          {rejectedMessage && (
            <div style={{
              background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.5)',
              borderRadius: '0.85rem', padding: '0.65rem 0.9rem', marginBottom: '1rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              <span style={{ fontSize: '1.1rem' }}>🚫</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fca5a5', lineHeight: 1.4 }}>{rejectedMessage}</span>
              <button onClick={() => setRejectedMessage(null)} style={{
                marginRight: 'auto', background: 'none', border: 'none',
                color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.9rem', padding: '0',
              }}>✕</button>
            </div>
          )}

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

          {/* حقل اسم اللاعب — تحت معاينة الشخصية مباشرة */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.72)', fontSize: '1.05rem', fontWeight: 400, marginBottom: '0.5rem', textAlign: 'center', fontFamily: "'Lalezar', sans-serif", letterSpacing: '0.01em' }}>
              ممكن اسمك؟
            </label>
            <input
              type="text" value={playerName}
              onChange={e => { setPlayerName(e.target.value); setNameError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); doRegister(); } }}
              placeholder="اسمك هنا..." maxLength={20}
              style={{
                width: '100%', padding: '0.78rem 1rem', borderRadius: '0.85rem',
                background: 'rgba(255,255,255,0.06)', border: `2px solid ${nameError ? '#ef4444' : `${teamColor}30`}`,
                color: 'white', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s, box-shadow 0.2s', textAlign: 'center',
              }}
              onFocus={e => { e.target.style.borderColor = nameError ? '#ef4444' : teamColor; e.target.style.boxShadow = `0 0 15px ${nameError ? 'rgba(239,68,68,0.25)' : `${teamColor}22`}`; }}
              onBlur={e => { e.target.style.borderColor = nameError ? '#ef4444' : `${teamColor}30`; e.target.style.boxShadow = 'none'; }}
            />
            {nameError && (
              <div style={{ color: '#ef4444', fontSize: '0.72rem', fontWeight: 700, marginTop: '0.4rem', textAlign: 'center' }}>
                ⚠️ {nameError}
              </div>
            )}
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

          {/* ─── محددات A و B (الألوان) ─── */}
          {arrowOpts.map(({ label, key, colors, names, count }, optIdx) => {
            const idx = avatar[key] as number;
            const c = colors[idx];
            const badge = optIdx === 0 ? 'A' : 'B';
            const filterId = `glow-arr-${key}`;
            return (
              <div key={key} style={{ marginBottom: '1rem' }}>
                {/* رأس القسم — شارة A / B + label */}
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', fontWeight: 700, marginBottom: '0.55rem', display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <motion.div
                    animate={{ boxShadow: [`0 0 6px ${c}55`, `0 0 18px ${c}99`, `0 0 6px ${c}55`] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      width: '22px', height: '22px', borderRadius: '7px',
                      background: `linear-gradient(135deg, ${c}ee, ${c}88)`,
                      border: `1.5px solid ${c}cc`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.72rem', fontWeight: 900, color: '#fff',
                      flexShrink: 0,
                      textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                    }}
                  >
                    {badge}
                  </motion.div>
                  {label}
                </div>

                {/* الحاوية الرئيسية */}
                <motion.div
                  animate={{ borderColor: [`${c}33`, `${c}66`, `${c}33`] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.55rem',
                    background: `linear-gradient(135deg, ${c}10, ${c}05, rgba(255,255,255,0.02))`,
                    border: `2px solid ${c}44`,
                    borderRadius: '1.1rem',
                    padding: '0.55rem 0.65rem',
                    boxShadow: `0 4px 24px ${c}18, 0 2px 8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)`,
                  }}
                >
                  {/* ── سهم سابق ── */}
                  <motion.button
                    type="button"
                    onClick={() => cycleOption(key, count, -1)}
                    whileTap={{ scale: 0.72, x: -5 }}
                    whileHover={{ scale: 1.15 }}
                    style={{
                      width: '46px', height: '46px', borderRadius: '50%', flexShrink: 0,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `2px solid ${c}80`,
                      background: `radial-gradient(circle at 35% 35%, ${c}50, ${c}22)`,
                      boxShadow: `0 0 14px ${c}55, 0 4px 14px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.2)`,
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 10 10" fill="none">
                      <defs>
                        <filter id={`${filterId}-prev`} x="-80%" y="-80%" width="260%" height="260%">
                          <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="b"/>
                          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                      </defs>
                      <polygon points="7.5,1 1.5,5 7.5,9" fill="white" filter={`url(#${filterId}-prev)`}/>
                    </svg>
                  </motion.button>

                  {/* ── العرض المركزي ── */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.28rem', minHeight: '62px', justifyContent: 'center' }}>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.6, y: 12, rotateY: -70 }}
                        animate={{ opacity: 1, scale: 1, y: 0, rotateY: 0 }}
                        exit={{ opacity: 0, scale: 0.6, y: -12, rotateY: 70 }}
                        transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.28rem' }}
                      >
                        <motion.div
                          animate={{
                            boxShadow: [`0 0 10px ${c}88, 0 3px 10px rgba(0,0,0,0.5)`, `0 0 26px ${c}dd, 0 3px 10px rgba(0,0,0,0.5)`, `0 0 10px ${c}88, 0 3px 10px rgba(0,0,0,0.5)`],
                            rotate: [3, -2, 3],
                          }}
                          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                          style={{
                            width: '44px', height: '44px', borderRadius: '12px',
                            background: `linear-gradient(135deg, ${c}, ${c}bb)`,
                            border: '3px solid rgba(255,255,255,0.55)',
                            position: 'relative', overflow: 'hidden',
                          }}
                        >
                          {/* بريق داخلي */}
                          <div style={{ position: 'absolute', top: '4px', left: '6px', width: '14px', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.45)', transform: 'rotate(-20deg)' }} />
                        </motion.div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'rgba(255,255,255,0.95)', letterSpacing: '0.02em' }}>{names[idx]}</div>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* ── سهم تالي ── */}
                  <motion.button
                    type="button"
                    onClick={() => cycleOption(key, count, 1)}
                    whileTap={{ scale: 0.72, x: 5 }}
                    whileHover={{ scale: 1.15 }}
                    style={{
                      width: '46px', height: '46px', borderRadius: '50%', flexShrink: 0,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `2px solid ${c}80`,
                      background: `radial-gradient(circle at 65% 35%, ${c}50, ${c}22)`,
                      boxShadow: `0 0 14px ${c}55, 0 4px 14px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.2)`,
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 10 10" fill="none">
                      <defs>
                        <filter id={`${filterId}-next`} x="-80%" y="-80%" width="260%" height="260%">
                          <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="b"/>
                          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                      </defs>
                      <polygon points="2.5,1 8.5,5 2.5,9" fill="white" filter={`url(#${filterId}-next)`}/>
                    </svg>
                  </motion.button>
                </motion.div>

                {/* ── نقاط المؤشر المتحركة ── */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginTop: '0.5rem' }}>
                  {Array.from({ length: count }).map((_, i) => (
                    <motion.div
                      key={i}
                      onClick={() => setAvatar(a => ({ ...a, [key]: i }))}
                      whileTap={{ scale: 0.75 }}
                      animate={{
                        width: i === idx ? 20 : 7,
                        background: i === idx ? c : 'rgba(255,255,255,0.2)',
                        boxShadow: i === idx ? `0 0 8px ${c}cc` : 'none',
                      }}
                      transition={{ duration: 0.28, ease: 'easeOut' }}
                      style={{ height: '7px', borderRadius: '4px', cursor: 'pointer' }}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* ─── تعبير الوجه ─── */}
          <div style={{ marginBottom: '0.9rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', fontWeight: 700, marginBottom: '0.55rem', display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '7px', background: 'linear-gradient(135deg,rgba(251,191,36,0.8),rgba(245,158,11,0.6))', border: '1.5px solid rgba(251,191,36,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0 }}>😊</div>
              تعبير الوجه
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', background: 'rgba(255,255,255,0.03)', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '1.1rem', padding: '0.55rem 0.65rem', boxShadow: '0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
              <motion.button type="button" onClick={() => cycleExp(-1)} whileTap={{ scale: 0.72, x: -5 }} whileHover={{ scale: 1.15 }}
                style={{ width: '46px', height: '46px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.28)', background: 'radial-gradient(circle at 35% 35%,rgba(255,255,255,0.22),rgba(255,255,255,0.06))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.28)', WebkitTapHighlightColor: 'transparent' }}>
                <svg width="14" height="14" viewBox="0 0 10 10" fill="none"><defs><filter id="glow-exp-prev" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><polygon points="7.5,1 1.5,5 7.5,9" fill="white" filter="url(#glow-exp-prev)"/></svg>
              </motion.button>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.28rem', minHeight: '62px', justifyContent: 'center' }}>
                <AnimatePresence mode="wait">
                  <motion.div key={expIdx} initial={{ opacity: 0, scale: 0.6, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.6, y: -12 }} transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.22rem' }}>
                    <motion.div animate={{ rotate: [0, -5, 5, 0], scale: [1, 1.12, 1] }} transition={{ duration: 0.5, delay: 0.1 }} style={{ fontSize: '2.1rem', lineHeight: 1, filter: 'drop-shadow(0 2px 8px rgba(251,191,36,0.5))' }}>{EXPRESSIONS[expIdx].emoji}</motion.div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'rgba(255,255,255,0.92)' }}>{EXPRESSIONS[expIdx].label}</div>
                  </motion.div>
                </AnimatePresence>
              </div>
              <motion.button type="button" onClick={() => cycleExp(1)} whileTap={{ scale: 0.72, x: 5 }} whileHover={{ scale: 1.15 }}
                style={{ width: '46px', height: '46px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.28)', background: 'radial-gradient(circle at 65% 35%,rgba(255,255,255,0.22),rgba(255,255,255,0.06))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.28)', WebkitTapHighlightColor: 'transparent' }}>
                <svg width="14" height="14" viewBox="0 0 10 10" fill="none"><defs><filter id="glow-exp-next" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><polygon points="2.5,1 8.5,5 2.5,9" fill="white" filter="url(#glow-exp-next)"/></svg>
              </motion.button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginTop: '0.5rem' }}>
              {EXPRESSIONS.map((_, i) => (
                <motion.div key={i} onClick={() => setAvatar(a => ({ ...a, expression: EXPRESSIONS[i].exp }))} whileTap={{ scale: 0.75 }}
                  animate={{ width: i === expIdx ? 20 : 7, background: i === expIdx ? teamColor : 'rgba(255,255,255,0.2)', boxShadow: i === expIdx ? `0 0 8px ${teamColor}cc` : 'none' }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                  style={{ height: '7px', borderRadius: '4px', cursor: 'pointer' }} />
              ))}
            </div>
          </div>

          {/* ─── إكسسوار ─── */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', fontWeight: 700, marginBottom: '0.55rem', display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '7px', background: 'linear-gradient(135deg,rgba(168,85,247,0.8),rgba(139,92,246,0.6))', border: '1.5px solid rgba(168,85,247,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0 }}>{ACCESSORIES[accIdx].emoji}</div>
              إكسسوار
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', background: `linear-gradient(135deg,${ACCESSORIES[accIdx].color}0e,rgba(255,255,255,0.02))`, border: `2px solid ${ACCESSORIES[accIdx].color}35`, borderRadius: '1.1rem', padding: '0.55rem 0.65rem', boxShadow: `0 4px 20px ${ACCESSORIES[accIdx].color}15, 0 2px 8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)` }}>
              <motion.button type="button" onClick={() => cycleAcc(-1)} whileTap={{ scale: 0.72, x: -5 }} whileHover={{ scale: 1.15 }}
                style={{ width: '46px', height: '46px', borderRadius: '50%', border: `2px solid ${ACCESSORIES[accIdx].color}65`, background: `radial-gradient(circle at 35% 35%,${ACCESSORIES[accIdx].color}40,${ACCESSORIES[accIdx].color}16)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 0 12px ${ACCESSORIES[accIdx].color}44, 0 4px 14px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.25)`, WebkitTapHighlightColor: 'transparent' }}>
                <svg width="14" height="14" viewBox="0 0 10 10" fill="none"><defs><filter id="glow-acc-prev" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><polygon points="7.5,1 1.5,5 7.5,9" fill="white" filter="url(#glow-acc-prev)"/></svg>
              </motion.button>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.28rem', minHeight: '62px', justifyContent: 'center' }}>
                <AnimatePresence mode="wait">
                  <motion.div key={accIdx} initial={{ opacity: 0, scale: 0.6, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.6, y: -12 }} transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.22rem' }}>
                    <motion.div animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.15, 1] }} transition={{ duration: 0.55, delay: 0.08 }} style={{ fontSize: '2.1rem', lineHeight: 1, filter: `drop-shadow(0 2px 8px ${ACCESSORIES[accIdx].color}80)` }}>{ACCESSORIES[accIdx].emoji}</motion.div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'rgba(255,255,255,0.92)' }}>{ACCESSORIES[accIdx].label}</div>
                  </motion.div>
                </AnimatePresence>
              </div>
              <motion.button type="button" onClick={() => cycleAcc(1)} whileTap={{ scale: 0.72, x: 5 }} whileHover={{ scale: 1.15 }}
                style={{ width: '46px', height: '46px', borderRadius: '50%', border: `2px solid ${ACCESSORIES[accIdx].color}65`, background: `radial-gradient(circle at 65% 35%,${ACCESSORIES[accIdx].color}40,${ACCESSORIES[accIdx].color}16)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 0 12px ${ACCESSORIES[accIdx].color}44, 0 4px 14px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.25)`, WebkitTapHighlightColor: 'transparent' }}>
                <svg width="14" height="14" viewBox="0 0 10 10" fill="none"><defs><filter id="glow-acc-next" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><polygon points="2.5,1 8.5,5 2.5,9" fill="white" filter="url(#glow-acc-next)"/></svg>
              </motion.button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginTop: '0.5rem' }}>
              {ACCESSORIES.map(({ color }, i) => (
                <motion.div key={i} onClick={() => setAvatar(a => ({ ...a, accessory: ACCESSORIES[i].acc }))} whileTap={{ scale: 0.75 }}
                  animate={{ width: i === accIdx ? 20 : 7, background: i === accIdx ? color : 'rgba(255,255,255,0.2)', boxShadow: i === accIdx ? `0 0 8px ${color}cc` : 'none' }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                  style={{ height: '7px', borderRadius: '4px', cursor: 'pointer' }} />
              ))}
            </div>
          </div>

          {/* فاصل */}
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)', margin: '0.85rem 0' }} />

          {/* نموذج التسجيل */}
          <form onSubmit={handleRegistration}>
            <div style={{ marginBottom: '1.1rem' }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.72)', fontSize: '1rem', fontWeight: 400, marginBottom: '0.55rem', fontFamily: "'Lalezar', sans-serif" }}>ممكن فريقك؟</label>
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
              ✨ انضم الآن
            </motion.button>
          </form>
        </div>

        <style>{`@keyframes regPulse{0%,100%{transform:scale(1);}50%{transform:scale(1.05);}}`}</style>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // غرفة الانتظار (Lobby) — تصميم mobile-first
  // ═══════════════════════════════════════════════════════════════
  if (isWaitingRoom) {
    const greenPlayers = waitingPlayers.filter(p => p.team === 'green');
    const redPlayers   = waitingPlayers.filter(p => p.team === 'red');
    const tc  = selectedTeam === 'green' ? '#10b981' : '#ef4444';
    const tc2 = selectedTeam === 'green' ? '#14b8a6' : '#dc2626';
    const oppTeam: 'green' | 'red' = selectedTeam === 'green' ? 'red' : 'green';
    const oppLabel = oppTeam === 'green' ? 'الأخضر' : 'الأحمر';
    const myLabel  = selectedTeam === 'green' ? '🟢 الفريق الأخضر' : '🔴 الفريق الأحمر';

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
        background: 'linear-gradient(180deg, #080014 0%, #130826 55%, #1e0f38 100%)',
        direction: 'rtl', overflowX: 'hidden', fontFamily: "'Tajawal', sans-serif",
      }}>

        {/* ══ هيدر ثابت ══ */}
        <div style={{
          background: 'rgba(12,4,28,0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(168,85,247,0.18)',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)',
          paddingBottom: '0.75rem',
          paddingRight: '1rem',
          paddingLeft: '1rem',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          {/* شريط لوني علوي */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '2.5px',
            background: `linear-gradient(90deg, transparent, ${tc}, #a855f7, #6366f1, transparent)`,
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {/* أيقونة اللعبة */}
            <div style={{
              width: '38px', height: '38px', borderRadius: '0.75rem', flexShrink: 0,
              background: `linear-gradient(135deg, ${tc}30, ${tc}12)`,
              border: `1.5px solid ${tc}45`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem',
            }}>⚔️</div>

            {/* العنوان */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 900, color: 'white', letterSpacing: '0.03em' }}>
                حرب الحروف
              </div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.38)', fontWeight: 600, marginTop: '1px' }}>
                {isAwaitingApproval ? 'انتظار موافقة المقدم' : 'غرفة الانتظار'}
              </div>
            </div>

            {/* شارة الحالة */}
            {isAwaitingApproval ? (
              <div style={{
                background: 'rgba(251,191,36,0.18)', border: '1px solid rgba(251,191,36,0.45)',
                borderRadius: '2rem', padding: '4px 10px',
                fontSize: '0.65rem', color: '#fbbf24', fontWeight: 800,
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                animation: 'lobbyPulse 1.8s ease-in-out infinite',
              }}>
                <span>⏳</span> قيد المراجعة
              </div>
            ) : (
              <div style={{
                background: 'rgba(168,85,247,0.18)', border: '1px solid rgba(168,85,247,0.4)',
                borderRadius: '2rem', padding: '4px 12px',
                fontSize: '0.65rem', color: '#c4b5fd', fontWeight: 800,
                display: 'flex', alignItems: 'center', gap: '0.35rem',
              }}>
                <div style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: '#10b981', boxShadow: '0 0 5px #10b981',
                  animation: 'lobbyPulse 2s ease-in-out infinite',
                }} />
                {waitingPlayers.length} منضم
              </div>
            )}
          </div>
        </div>

        {/* ══ المحتوى القابل للتمرير ══ */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.85rem 0.9rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 12px))' }}>

          {/* ── بطاقة انتظار الموافقة (إذا كانت اللعبة جارية) ── */}
          {isAwaitingApproval && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'linear-gradient(135deg, rgba(251,191,36,0.1), rgba(251,191,36,0.05))',
                border: '1.5px solid rgba(251,191,36,0.4)',
                borderRadius: '1rem', padding: '0.85rem 1rem',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                boxShadow: '0 4px 20px rgba(251,191,36,0.12)',
              }}
            >
              <div style={{ fontSize: '1.5rem', lineHeight: 1, flexShrink: 0 }}>⏳</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#fbbf24' }}>
                  اللعبة جارية — انتظار موافقة المقدم
                </div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginTop: '0.2rem' }}>
                  طلبك قيد المراجعة، سيتم إدخالك فور الموافقة
                </div>
                {/* زر إعادة إرسال الطلب — يُشعر المقدم أن هناك لاعباً ينتظر */}
                <button
                  onClick={() => {
                    const av = avatarRef.current;
                    syncManager.broadcast({
                      type: 'player-registered',
                      player: { name: playerName.trim(), team: selectedTeam, timestamp: Date.now(), avatar: av },
                    });
                  }}
                  style={{
                    marginTop: '0.55rem',
                    padding: '0.3rem 0.8rem',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    color: '#fbbf24',
                    background: 'rgba(251,191,36,0.12)',
                    border: '1.5px solid rgba(251,191,36,0.45)',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontFamily: 'Tajawal, sans-serif',
                  }}
                >
                  🔔 إعادة إرسال طلب الانضمام
                </button>
              </div>
            </motion.div>
          )}

          {/* ── بطاقتي (Hero) ── */}
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            style={{
              background: `linear-gradient(145deg, ${tc}16, rgba(12,4,28,0.95))`,
              border: `2px solid ${tc}55`,
              borderRadius: '1.35rem',
              padding: '1rem 1.1rem',
              boxShadow: `0 4px 28px ${tc}1a, 0 0 0 1px ${tc}15`,
              display: 'flex', alignItems: 'center', gap: '1rem',
              position: 'relative', overflow: 'hidden',
            }}
          >
            {/* وهج خلفي */}
            <div style={{
              position: 'absolute', top: '-30px', right: '-20px',
              width: '120px', height: '120px', borderRadius: '50%',
              background: `radial-gradient(circle, ${tc}18, transparent 70%)`,
              pointerEvents: 'none',
            }} />

            {/* الأفاتار */}
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%', flexShrink: 0,
              background: `radial-gradient(circle at 35% 35%, ${tc}25, transparent 65%)`,
              border: `2.5px solid ${tc}60`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 20px ${tc}25`,
            }}>
              <CharacterAvatar avatar={avatar} size={58} />
            </div>

            {/* المعلومات */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <div style={{
                  fontSize: '1.05rem', fontWeight: 900, color: 'white',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                }}>{playerName}</div>
                <div style={{
                  background: '#10b981', width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                  boxShadow: '0 0 6px #10b981',
                  animation: 'lobbyPulse 2s ease-in-out infinite',
                }} />
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                background: `${tc}22`, border: `1px solid ${tc}50`,
                color: tc, fontSize: '0.72rem', fontWeight: 800,
                padding: '3px 10px', borderRadius: '2rem',
              }}>{myLabel}</div>
            </div>

            {/* شارة "أنت" */}
            <div style={{
              position: 'absolute', top: '0.6rem', left: '0.85rem',
              background: `linear-gradient(135deg, ${tc}, ${tc2})`,
              color: 'white', fontSize: '0.55rem', fontWeight: 900,
              padding: '2px 8px', borderRadius: '2rem',
            }}>أنت</div>
          </motion.div>

          {/* ── قائمة الفريقين ── */}
          <div style={{ display: 'flex', gap: '0.65rem' }}>
            {(['green', 'red'] as const).map(team => {
              const players = team === 'green' ? greenPlayers : redPlayers;
              const col  = team === 'green' ? '#10b981' : '#ef4444';
              const lbl  = team === 'green' ? 'الأخضر' : 'الأحمر';
              const isMyTeam = team === selectedTeam;
              return (
                <div key={team} style={{ flex: 1, minWidth: 0 }}>
                  {/* رأس الفريق */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    marginBottom: '0.5rem', padding: '0 0.25rem',
                  }}>
                    <div style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: col, boxShadow: `0 0 6px ${col}`,
                      flexShrink: 0,
                    }} />
                    <div style={{
                      fontSize: '0.72rem', fontWeight: 900, color: col,
                      flex: 1, letterSpacing: '0.02em',
                    }}>الفريق {lbl}</div>
                    <div style={{
                      background: `${col}20`, border: `1px solid ${col}40`,
                      borderRadius: '2rem', padding: '1px 7px',
                      fontSize: '0.6rem', color: col, fontWeight: 800,
                    }}>{players.length}</div>
                  </div>

                  {/* حاوية اللاعبين */}
                  <div style={{
                    background: isMyTeam ? `${col}0a` : 'rgba(255,255,255,0.02)',
                    border: `1.5px solid ${col}${isMyTeam ? '30' : '18'}`,
                    borderRadius: '1rem',
                    padding: '0.45rem',
                    minHeight: '80px',
                    display: 'flex', flexDirection: 'column', gap: '0.35rem',
                    transition: 'border-color 0.3s',
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
                        fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)',
                        textAlign: 'center', padding: '1rem 0',
                        fontStyle: 'italic', lineHeight: 1,
                      }}>
                        لا أحد بعد
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── مؤشر الانتظار ── */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '0.55rem', paddingTop: '0.35rem',
          }}>
            {/* شريط تحميل متحرك */}
            <div style={{
              width: '100%', height: '3px', borderRadius: '2rem',
              background: 'rgba(168,85,247,0.12)', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: '40%', borderRadius: '2rem',
                background: 'linear-gradient(90deg, transparent, #a855f7, #6366f1, transparent)',
                animation: 'lobbySlide 1.8s ease-in-out infinite',
              }} />
            </div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
              في انتظار المقدم للبدء...
            </div>
          </div>

        </div>

        {/* ══ شريط الإجراءات (ثابت في الأسفل) ══ */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: 'rgba(8,0,20,0.97)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: '0.65rem 0.9rem',
          paddingBottom: 'calc(0.65rem + env(safe-area-inset-bottom, 0px))',
          display: 'flex', gap: '0.6rem',
        }}>
          {/* تعديل الشخصية */}
          <button
            onClick={() => setShowLobbyEdit(true)}
            style={{
              flex: 1, minHeight: '48px', borderRadius: '1rem',
              background: 'rgba(168,85,247,0.14)',
              border: '1.5px solid rgba(168,85,247,0.38)',
              color: '#c4b5fd', fontSize: '0.82rem', fontWeight: 800,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '0.4rem',
              transition: 'background 0.2s',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: '1rem' }}>✏️</span>
            تعديل الشخصية
          </button>

          {/* تغيير الفريق */}
          <button
            onClick={handleSwitchTeam}
            style={{
              flex: 1, minHeight: '48px', borderRadius: '1rem',
              background: oppTeam === 'green' ? 'rgba(16,185,129,0.14)' : 'rgba(239,68,68,0.14)',
              border: `1.5px solid ${oppTeam === 'green' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
              color: oppTeam === 'green' ? '#34d399' : '#f87171',
              fontSize: '0.82rem', fontWeight: 800,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '0.4rem',
              transition: 'background 0.2s',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: '1rem' }}>🔄</span>
            انتقل لـ{oppLabel}
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
          @keyframes lobbySlide { 0%{transform:translateX(-140%);} 100%{transform:translateX(340%);} }
        `}</style>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // شاشة الجرس الرئيسية
  // ═══════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: theme.bgGradient, overflowX: 'hidden' }}>

      {/* ─── شريط تحذير Full House / انقطاع الاتصال ─── */}
      {connectionDegraded && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: 'linear-gradient(90deg, #7c2d12, #991b1b)',
          borderBottom: '2px solid rgba(239,68,68,0.5)',
          padding: '0.6rem 1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '0.75rem', direction: 'rtl',
          boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
        }}>
          <span style={{ fontSize: '1.1rem' }}>⚠️</span>
          <span style={{ color: 'white', fontSize: '0.78rem', fontWeight: 700, lineHeight: 1.4, textAlign: 'center', flex: 1 }}>
            {isRegistered
              ? `السيرفر ممتلئ — سيتم فصلك تلقائياً خلال ${overloadCountdown} ثانية`
              : 'تعذّر الاتصال بالخادم — قد يكون ممتلئاً. يتم إعادة المحاولة...'}
          </span>
          {!isRegistered && (
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '0.25rem 0.8rem', borderRadius: '2rem',
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.35)',
                color: 'white', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700,
                flexShrink: 0, whiteSpace: 'nowrap',
              }}
            >
              تحديث
            </button>
          )}
        </div>
      )}

      {/* ─── شريط الهيدر ─── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'linear-gradient(135deg,#1a0b2e,#2d1154)', borderBottom: '2px solid rgba(168,85,247,0.25)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', paddingTop: 'env(safe-area-inset-top)' }}>
        {/* صف 1: اسم + نتيجة + فريق */}
        <div style={{ padding: '0.5rem 0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: '0.92rem', background: 'linear-gradient(135deg,#f97316,#ec4899,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90px' }}>
              {playerName}
            </div>
            {/* مؤشر الـ Ping */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '3px',
              background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '2rem', padding: '2px 7px', flexShrink: 0,
            }}>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                background: myPing === null ? '#6b7280'
                  : myPing < 150 ? '#10b981'
                  : myPing < 350 ? '#fbbf24' : '#ef4444',
              }} />
              <span style={{
                fontSize: '0.62rem', fontWeight: 700,
                color: myPing === null ? '#9ca3af'
                  : myPing < 150 ? '#6ee7b7'
                  : myPing < 350 ? '#fcd34d' : '#fca5a5',
              }}>
                {myPing === null ? '...' : `${myPing}ms`}
              </span>
            </div>
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
      <div style={{ flex: 1, width: '100%', padding: `0.5rem 0.5rem calc(90px + env(safe-area-inset-bottom))`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {cells.length > 0 ? (
          <>
            <div style={{ width: '100%', borderRadius: '1.25rem', overflow: 'hidden', border: `2px solid ${activeCell ? (activeCell.isGolden ? 'rgba(251,191,36,0.5)' : 'rgba(168,85,247,0.45)') : 'rgba(139,92,246,0.2)'}`, boxShadow: activeCell ? `0 0 24px ${activeCell.isGolden ? 'rgba(251,191,36,0.2)' : 'rgba(168,85,247,0.2)'}` : '0 4px 20px rgba(0,0,0,0.4)', background: 'linear-gradient(145deg,rgba(15,10,35,0.98),rgba(30,20,60,0.95))' }}>
              <HexGrid cells={cells} selectedCellId={selectedCellId} showCardIndicator={false} colorsSwapped={colorsSwapped} scale={gridScale} />
            </div>

            <div style={{ width: '100%', padding: '0.5rem 0.75rem 0.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <button onClick={() => setGridScale(s => Math.max(0.42, +(s - 0.06).toFixed(2)))} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', color: 'white', fontSize: '1.2rem', fontWeight: 900, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>−</button>
              <input type="range" min={0.42} max={0.95} step={0.03} value={gridScale} onChange={e => setGridScale(+e.target.value)} style={{ flex: 1, height: '6px', accentColor: '#a855f7', cursor: 'pointer' }} />
              <button onClick={() => setGridScale(s => Math.min(0.95, +(s + 0.06).toFixed(2)))} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', color: 'white', fontSize: '1.2rem', fontWeight: 900, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>+</button>
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
        borderTop: `2px solid ${buzzerStatus === 'error' ? 'rgba(239,68,68,0.5)' : buttonsDisabled ? 'rgba(239,68,68,0.3)' : canPress ? 'rgba(168,85,247,0.4)' : 'rgba(239,68,68,0.3)'}`,
        padding: `0.55rem 0.75rem calc(0.55rem + env(safe-area-inset-bottom))`,
        display: 'flex', flexDirection: 'column', gap: '0.4rem',
        transition: 'border-top-color 0.3s',
      }}>

        {/* ── مؤشر حالة الاتصال ── */}
        {buzzerStatus !== 'ready' && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            padding: '0.25rem 0.75rem',
            background: buzzerStatus === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.12)',
            border: `1px solid ${buzzerStatus === 'error' ? 'rgba(239,68,68,0.35)' : 'rgba(251,191,36,0.3)'}`,
            borderRadius: '0.6rem', fontSize: '0.72rem', fontWeight: 700,
            color: buzzerStatus === 'error' ? '#ef4444' : '#fbbf24',
          }}>
            <span style={{ fontSize: '0.65rem' }}>
              {buzzerStatus === 'connecting' ? '⟳' : '✕'}
            </span>
            {buzzerStatus === 'connecting' ? 'جاري الاتصال بالجرس...' : 'انقطع الاتصال — يُعاد الاتصال تلقائياً'}
          </div>
        )}

        {/* ── صف الأزرار ── */}
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'stretch' }}>

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
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
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
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
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
          style={{ width: '52px', borderRadius: '1.1rem', background: 'rgba(168,85,247,0.12)', border: '2px solid rgba(168,85,247,0.3)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, minHeight: '48px', WebkitTapHighlightColor: 'transparent' }}>
          <HelpCircle size={22} />
        </button>
        </div> {/* إغلاق صف الأزرار */}
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
          padding: isMobile ? '1.25rem 1.5rem' : '1.5rem 2rem',
          textAlign: 'center',
          boxShadow: myTeam === 'green'
            ? '0 0 80px rgba(16,185,129,0.7), 0 20px 60px rgba(0,0,0,0.5)'
            : '0 0 80px rgba(239,68,68,0.7), 0 20px 60px rgba(0,0,0,0.5)',
          animation: 'bzBounceIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          pointerEvents: 'none',
          border: '3px solid rgba(255,255,255,0.4)',
          width: isMobile ? 'min(300px, 85vw)' : '260px',
        }}>
          {/* الأفاتار */}
          <div style={{
            width: isMobile ? '78px' : '90px', height: isMobile ? '78px' : '90px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            border: '3px solid rgba(255,255,255,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 0.5rem',
            animation: 'bzPulse 1.5s ease-in-out infinite',
          }}>
            <CharacterAvatar avatar={avatar} size={isMobile ? 58 : 70} />
          </div>

          <div style={{ fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: 900, color: 'white', marginBottom: '0.15rem' }}>
            {playerName}
          </div>
          <div style={{ fontSize: isMobile ? '0.82rem' : '0.78rem', color: 'rgba(255,255,255,0.9)', fontWeight: 800, marginBottom: '0.6rem' }}>
            {buzzerState.pressType === 'answer' ? '📣 أجب الآن!' : '🎴 طلبت بطاقة!'}
          </div>

          {/* عداد تنازلي */}
          <div style={{
            width: isMobile ? '64px' : '60px', height: isMobile ? '64px' : '60px', borderRadius: '50%',
            background: 'rgba(0,0,0,0.2)', border: '4px solid rgba(255,255,255,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: isMobile ? '2rem' : '1.8rem', fontWeight: 900, color: 'white',
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
          position: 'fixed', bottom: 'calc(88px + env(safe-area-inset-bottom))', left: '50%',
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

      {/* ✨ إعلان الحرف الذهبي — متزامن مع المقدم */}
      {goldenLetter && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2400,
          background: 'linear-gradient(135deg,#1a0a00 0%,#3d2000 50%,#1a0a00 100%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: isMobile ? '1.25rem' : '2rem',
          animation: 'gaFadeIn 0.4s ease-out',
        }}>
          {/* وهج خلفي */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `
              radial-gradient(circle at 30% 70%, rgba(251,191,36,0.25) 0%, transparent 45%),
              radial-gradient(circle at 70% 30%, rgba(245,158,11,0.25) 0%, transparent 45%)
            `,
          }} />

          {/* أيقونة */}
          <div style={{
            fontSize: isMobile ? '3.5rem' : '5rem',
            animation: 'gaStarPulse 1.5s ease-in-out infinite',
            position: 'relative', zIndex: 1,
          }}>✨</div>

          {/* الحرف */}
          <div style={{
            fontSize: isMobile ? '4rem' : '6rem',
            fontWeight: 900,
            color: '#fbbf24',
            textShadow: '0 0 30px rgba(251,191,36,0.8), 0 4px 12px rgba(0,0,0,0.5)',
            lineHeight: 1,
            position: 'relative', zIndex: 1,
          }}>{goldenLetter}</div>

          {/* الرسالة */}
          <div style={{
            background: 'rgba(251,191,36,0.1)',
            border: '2px solid rgba(251,191,36,0.4)',
            borderRadius: '1.25rem',
            padding: isMobile ? '1rem 1.5rem' : '1.5rem 2.5rem',
            textAlign: 'center',
            maxWidth: isMobile ? '85vw' : '480px',
            position: 'relative', zIndex: 1,
          }}>
            <div style={{
              fontSize: isMobile ? '1.1rem' : '1.4rem',
              fontWeight: 900, color: '#fbbf24', marginBottom: '0.5rem',
            }}>
              حرف ذهبي! ✨
            </div>
            <div style={{
              fontSize: isMobile ? '0.9rem' : '1.05rem',
              color: 'rgba(255,255,255,0.85)', lineHeight: 1.65,
            }}>
              من يفوز بهذا السؤال سيختار بطاقة من اختياره!
            </div>
          </div>

          <style>{`
            @keyframes gaFadeIn    { from{opacity:0;transform:scale(0.95);} to{opacity:1;transform:scale(1);} }
            @keyframes gaStarPulse { 0%,100%{transform:scale(1) rotate(-8deg);} 50%{transform:scale(1.15) rotate(8deg);} }
          `}</style>
        </div>
      )}

      {/* شاشة التشويق — viewer فقط، بلا زر كشف */}
      {showCardTeaser && (
        <CardTeaserOverlay
          letter={showCardTeaser.letter}
          isGolden={showCardTeaser.isGolden}
          isHost={false}
        />
      )}

      {/* روليت البطاقات — متزامن مع المقدم */}
      {showRoulette && (
        <CardRoulette
          onComplete={() => setShowRoulette(false)}
          syncedCard={syncedCard}
          isViewerMode={true}
          triggerType={rouletteTriggerType}
        />
      )}

      {/* أنيميشن البطاقة */}
      {cardAnimation && (
        <CardAnimation
          type={cardAnimation.type}
          message={cardAnimation.message}
          onComplete={() => setCardAnimation(null)}
        />
      )}

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
        <div style={{ position: 'fixed', bottom: 'calc(92px + env(safe-area-inset-bottom))', left: '0.75rem', right: '0.75rem', zIndex: 300, background: 'linear-gradient(135deg,rgba(99,102,241,0.97),rgba(168,85,247,0.97))', border: '2px solid rgba(168,85,247,0.7)', borderRadius: '1.1rem', padding: '0.75rem 1rem', boxShadow: '0 0 30px rgba(168,85,247,0.4)', animation: 'bzSlideIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
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

      {/* ── مودال التحذير من الخمول — AFK System */}
      {showAfkWarning && !isDisconnected && (
        <InactivityWarningModal countdown={afkCountdown} onStay={afkStayActive} />
      )}

      {/* ── شاشة إعادة الاتصال بعد الفصل */}
      {isDisconnected && (
        <DisconnectedScreen
          onReconnect={() => {
            // أعد إرسال تسجيل اللاعب للغرفة
            if (playerNameRef.current) {
              syncManager.broadcast({
                type: 'player-registered',
                player: {
                  name: playerNameRef.current,
                  team: selectedTeamRef.current,
                  timestamp: Date.now(),
                  avatar: avatarRef.current,
                },
              });
            }
            afkReconnect();
          }}
          onLeave={() => {
            syncManager.disconnect();
            window.location.href = window.location.origin + window.location.pathname;
          }}
        />
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
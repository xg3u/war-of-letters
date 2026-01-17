// src/core/types.ts
// جميع الأنواع المستخدمة في اللعبة - نسخة موحدة

// ========== الفرق ==========
export type Team = 'green' | 'red' | null;

export interface TeamData {
  id: 'green' | 'red';
  name: string;
  color: string;
  score: number;
  correctStreak: number;
  actionCards: ActionCard[];
  isActive: boolean;
}

// ========== الخلية السداسية ==========
export interface HexCell {
  id: string;
  q: number; 
  r: number; 
  letter: string;
  status: 'unanswered' | 'green' | 'red';
  isGolden: boolean;
  hasCard: boolean;
  frozenBy: Team;
  freezeCounter: number;
  hasShield: boolean;
  categoryId: string; // الكاتيجوري المرتبط بهذه الخلية
}

// ========== إعدادات اللعبة ==========
export type GameMode = 'normal' | 'tv-show';
export type WinCondition = 'wall-to-wall' | 'first-to-5' | 'five-connected' | 'most-letters' | 'any-condition' | 'all';

export interface GameSettings {
  gameName: string;
  teamNames: { green: string; red: string };
  
  // آليات الفوز
  winCondition: WinCondition;
  teamColors: {
    green: 'horizontal' | 'vertical' | 'both';
    red: 'horizontal' | 'vertical' | 'both';
  };
  
  // عدد الجولات
  rounds: 3 | 5 | number | 'infinite';
  
  // نظام البطاقات
  enableCards: boolean;
  enableRandomLetter: boolean;
  enableStreakReward: boolean;
  enableHiddenCards: boolean;
  hiddenCardsCount: number;
  enableGoldenLetter: boolean;
  cardDistribution: 'random' | 'manual';
  showCardLocations: 'always' | 'on-press' | 'hidden';
  cardTypes: {
    freeze: boolean;
    bomb: boolean;
    battle: boolean;
    shield: boolean;
    demonShuffle: boolean;
    speedUp: boolean;
    luck: boolean;
  };
  
  // مميزات خاصة
  carryCardsToNextRound: boolean;
  
  // الكاتيجوريز
  selectedCategories: string[];
  
  // إعدادات المسابقة التلفزيونية
  gameMode: GameMode;
  showQuestionsToTeams: boolean;
  
  // الوقت
  timePerQuestion: number;
}

// ========== الكاتيجوريز ==========
export interface Category {
  id: string;
  name: string;
  description: string;
  questionsCount: number;
  rating: number;
  icon: string;
  color: string;
}

// ========== البطاقات (Action Cards) ==========
export type CardRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type CardType = 'freeze' | 'bomb' | 'battle' | 'shield' | 'demonShuffle' | 'speedUp' | 'luck';

export interface ActionCard {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: CardRarity;
  isUsed?: boolean;
}

// ========== الأسئلة ==========
export interface Question {
  id: string;
  categoryId: string;
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

// ========== حالة اللعبة ==========
export interface GameState {
  settings: GameSettings;
  grid: HexCell[];
  teams: {
    green: TeamData;
    red: TeamData;
  };
  currentTurn: 'green' | 'red';
  selectedCell: HexCell | null;
  currentQuestion: Question | null;
  gamePhase: 'setup' | 'playing' | 'question' | 'result' | 'ended';
  round: number;
  goldenLetters: string[]; // قائمة بـ ids الحروف الذهبية
}

// ========== واجهة الحكم ==========
export type JudgeActionType =
  | 'SELECT_CELL'
  | 'MARK_CORRECT'
  | 'MARK_WRONG'
  | 'SET_GOLDEN'
  | 'AWARD_CARD'
  | 'USE_CARD'
  | 'SKIP_TURN'
  | 'END_GAME';

export interface JudgeAction {
  type: JudgeActionType;
  payload: any;
}

// ========== المكافآت ==========
export type RewardType = 'card' | 'points' | 'extra-turn';
export type RewardReason = 'golden-letter' | 'streak' | 'judge-bonus';

export interface Reward {
  type: RewardType;
  card?: ActionCard;
  points?: number;
  reason: RewardReason;
}

// ========== الأحداث ==========
export type GameEventType =
  | 'CELL_SELECTED'
  | 'ANSWER_CORRECT'
  | 'ANSWER_WRONG'
  | 'GOLDEN_REVEALED'
  | 'STREAK_ACHIEVED'
  | 'CARD_AWARDED'
  | 'CARD_USED'
  | 'TURN_CHANGED'
  | 'GAME_ENDED';

export interface GameEvent {
  id: string;
  type: GameEventType;
  timestamp: number;
  teamId?: 'green' | 'red';
  data: any;
}

// ========== الإحصائيات ==========
export interface GameStats {
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  goldenLettersHit: number;
  cardsUsed: number;
  longestStreak: number;
  duration: number;
}

// ========== Hex Grid Utilities ==========
export interface HexCoordinate {
  q: number;
  r: number;
}

export interface HexPosition {
  x: number;
  y: number;
}
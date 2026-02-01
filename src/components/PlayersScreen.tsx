// src/components/PlayersScreen.tsx
// شاشة اللاعبين - عرض فقط (Synchronized with HostScreen design)

import React from 'react';
import { Users } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { syncManager } from '../utils/SyncManager';
import { HexGrid } from './HexGrid';
import { CardAnimation } from './CardAnimation';
import { CardRoulette } from './CardRoulette';
import { StreakVisualizer } from './StreakVisualizer';
import { MatchScoreTracker } from './MatchScoreTracker';
import { MatchWinnerOverlay } from './MatchWinnerOverlay';
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
  settings: GameSettingsData;
  currentQuestion: string | null;
  selectedCell: HexCellType | null;
}

export const PlayersScreen: React.FC<PlayersScreenProps> = ({
  settings,
  currentQuestion,
  selectedCell,
}) => {
  const { cells, syncFromExternal, winner, winMessage, scores, teamCards, winStreak, currentRound } = useGameStore();
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

  // المزامنة فقط
  React.useEffect(() => {
    const unsubscribe = syncManager.subscribe((data) => {
      console.log('PlayersScreen received:', data.type);

      if (data.type === 'GRID_INITIALIZED') {
        console.log('Syncing grid:', data.cells?.length, 'cells');
        if (data.cells) {
          syncFromExternal(data.cells);
        }
        if (data.settings) {
          // تحديث الإعدادات أيضاً
          localStorage.setItem('current-game-settings', JSON.stringify(data.settings));
        }
      } else if (data.type === 'CELL_CLAIMED') {
        syncFromExternal(data.cells);
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
      } else if (data.type === 'ZOOM_CHANGED' && typeof data.zoom === 'number') {
        setZoom(data.zoom);
      } else if (data.type === 'ROULETTE_START') {
        // بدء الروليت في شاشة اللاعبين
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
        // إخفاء الإعلان بعد 2.5 ثانية (نفس التوقيت في HostScreen)
        setTimeout(() => {
          setShowRandomLetterAnnouncement(false);
        }, 2500);
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
      } else if (data.type === 'COUNTERS_UPDATED') {
        // تحديث عدادات التجميد والدرع
        if (data.cells) {
          syncFromExternal(data.cells);
        }
      }
    });
    return unsubscribe;
  }, [syncFromExternal]);

  // Debug: عرض حالة الشبكة
  React.useEffect(() => {
    console.log('PlayersScreen cells:', cells.length);
  }, [cells]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 25%, #6366f1 50%, #4f46e5 75%, #3730a3 100%)',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>

      {/* Main Layout: Left Panel | Center Area | Right Panel */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '1400px',
      }}>

        {/* Left Panel - Green Team */}
        <div style={{
          width: '200px',
          minWidth: '200px',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          border: '2px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '1.5rem',
          padding: '1.5rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
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
            textShadow: '0 4px 12px rgba(16, 185, 129, 0.5)',
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
        </div>

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
          }}>
            {cells.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '1.5rem',
                fontWeight: 700,
                background: 'rgba(0, 0, 0, 0.3)',
                backdropFilter: 'blur(10px)',
                padding: '3rem',
                borderRadius: '1.5rem',
                border: '2px solid rgba(168, 85, 247, 0.3)',
              }}>
                ⏳ في انتظار بدء اللعبة من المقدم...
              </div>
            ) : (
              <HexGrid
                cells={cells}
                zoom={zoom}
                scale={1}
                showCardIndicator={false}
              />
            )}
          </div>
        </div>

        {/* Right Panel - Red Team */}
        <div style={{
          width: '200px',
          minWidth: '200px',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          border: '2px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '1.5rem',
          padding: '1.5rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
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
            textShadow: '0 4px 12px rgba(239, 68, 68, 0.5)',
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
        </div>
      </div>

      {/* عداد نتيجة المباراة */}
      <MatchScoreTracker
        greenScore={localScores.green}
        redScore={localScores.red}
        greenTeamName={settings.teamNames.green}
        redTeamName={settings.teamNames.red}
        totalRounds={settings.rounds}
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
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: '600px',
          width: '90%',
          background: 'linear-gradient(135deg, #1a0b2e, #2d1154)',
          border: '3px solid rgba(168, 85, 247, 0.5)',
          borderRadius: '1.5rem',
          padding: '2rem',
          zIndex: 100,
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '1rem',
          }}>
            <div style={{
              display: 'inline-block',
              padding: '1rem 1.5rem',
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              borderRadius: '1rem',
              fontSize: '2.5rem',
              fontWeight: 900,
              color: 'white',
            }}>
              {selectedCell.letter}
            </div>
          </div>

          <div style={{
            color: 'white',
            fontSize: '1.25rem',
            fontWeight: 700,
            textAlign: 'center',
          }}>
            {currentQuestion}
          </div>

          <div style={{
            marginTop: '1rem',
            textAlign: 'center',
            color: '#a855f7',
            fontSize: '0.875rem',
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
            fontSize: '8rem',
            marginBottom: '2rem',
            animation: 'bounce 0.6s ease-in-out infinite',
          }}>
            🎲
          </div>
          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: 900,
            color: 'white',
            textShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            textAlign: 'center',
            margin: 0,
          }}>
            حرف عشوائي!
          </h1>
          <p style={{
            fontSize: '1.75rem',
            color: 'rgba(255, 255, 255, 0.9)',
            marginTop: '1.5rem',
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
      {winner && winMessage && !localMatchWinner && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(15px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
        }}>
          <div style={{
            maxWidth: '800px',
            width: '90%',
            background: winner === 'green'
              ? 'linear-gradient(135deg, #10b981, #14b8a6)'
              : 'linear-gradient(135deg, #ef4444, #dc2626)',
            border: '6px solid white',
            borderRadius: '2rem',
            padding: '4rem',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '8rem',
              marginBottom: '2rem',
            }}>
              🏆
            </div>

            <h2 style={{
              fontSize: '4rem',
              fontWeight: 900,
              color: 'white',
              margin: 0,
              textShadow: '0 4px 10px rgba(0, 0, 0, 0.5)',
            }}>
              {winMessage}
            </h2>
          </div>
        </div>
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
    </div>
  );
};
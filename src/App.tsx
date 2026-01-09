// src/App.tsx

import { useState } from 'react';

import { AuthGate } from './components/AuthGate';

import { LandingPage } from './components/LandingPage';

import { GameBoard } from './components/GameBoard';

import { AnimatedBackground } from './components/AnimatedBackground';

import { useGameStore } from './store/useGameStore';



function App() {

  const [currentScreen, setCurrentScreen] = useState<'auth' | 'landing' | 'game'>('auth');

  const winner = useGameStore((state) => state.winner);



  return (

    <div className="min-h-screen relative font-tajawal direction-rtl text-right">

      {/* الخلفية العائمة لكل التطبيق */}

      <div className="fixed inset-0 bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] -z-10"></div>

      <AnimatedBackground />



      {/* المحتوى الرئيسي */}

      <main className="relative z-10 min-h-screen flex items-center justify-center">

        {currentScreen === 'auth' && (

          <AuthGate onVerified={() => setCurrentScreen('landing')} />

        )}



        {currentScreen === 'landing' && (

          <LandingPage onStartGame={() => setCurrentScreen('game')} />

        )}



        {currentScreen === 'game' && <GameBoard />}

      </main>

    </div>

  );

}



export default App;
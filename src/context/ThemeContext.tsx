// src/context/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

export interface GameTheme {
  id: string;
  nameAr: string;
  emoji: string;
  bgGradient: string;
  cardBg: string;
  cardBorder: string;
  accent: string;
  accentSecondary: string;
  textPrimary: string;
  textSecondary: string;
  borderRadius: string;
  shadow: string;
  panelBg: string;
  panelBorder: string;
}

export const themes: Record<string, GameTheme> = {
  purple: {
    id: 'purple',
    nameAr: 'الكلاسيكي',
    emoji: '🔮',
    bgGradient: 'linear-gradient(135deg, #0a0118 0%, #1a0b2e 50%, #2d1154 100%)',
    cardBg: 'rgba(255,255,255,0.05)',
    cardBorder: 'rgba(168, 85, 247, 0.3)',
    accent: '#a855f7',
    accentSecondary: '#7c3aed',
    textPrimary: '#f3e8ff',
    textSecondary: 'rgba(233,213,255,0.75)',
    borderRadius: '1rem',
    shadow: '0 8px 32px rgba(168, 85, 247, 0.25)',
    panelBg: 'rgba(255,255,255,0.05)',
    panelBorder: 'rgba(168, 85, 247, 0.2)',
  },
  clay: {
    id: 'clay',
    nameAr: 'كلايمورفيزم',
    emoji: '🎨',
    bgGradient: 'linear-gradient(135deg, #1a0528 0%, #350b4a 50%, #5c1060 100%)',
    cardBg: 'rgba(255, 130, 200, 0.12)',
    cardBorder: 'rgba(255, 160, 220, 0.5)',
    accent: '#ff6ee8',
    accentSecondary: '#c44dff',
    textPrimary: '#fff0fb',
    textSecondary: 'rgba(255, 200, 240, 0.8)',
    borderRadius: '2rem',
    shadow: '8px 8px 0 rgba(200, 40, 160, 0.35), 0 12px 40px rgba(200, 40, 160, 0.2)',
    panelBg: 'rgba(180, 50, 160, 0.15)',
    panelBorder: 'rgba(255, 160, 220, 0.4)',
  },
  ocean: {
    id: 'ocean',
    nameAr: 'المحيط',
    emoji: '🌊',
    bgGradient: 'linear-gradient(135deg, #020c1b 0%, #0a2463 50%, #0d4f8c 100%)',
    cardBg: 'rgba(0, 180, 255, 0.08)',
    cardBorder: 'rgba(0, 210, 255, 0.3)',
    accent: '#00d4ff',
    accentSecondary: '#0078ff',
    textPrimary: '#e0f7ff',
    textSecondary: 'rgba(180, 230, 255, 0.75)',
    borderRadius: '1.25rem',
    shadow: '0 8px 32px rgba(0, 150, 255, 0.35)',
    panelBg: 'rgba(0, 80, 160, 0.25)',
    panelBorder: 'rgba(0, 200, 255, 0.2)',
  },
  neon: {
    id: 'neon',
    nameAr: 'نيون',
    emoji: '⚡',
    bgGradient: 'linear-gradient(135deg, #000000 0%, #050510 50%, #0a001a 100%)',
    cardBg: 'rgba(0, 255, 120, 0.05)',
    cardBorder: 'rgba(0, 255, 120, 0.35)',
    accent: '#00ff78',
    accentSecondary: '#ff00cc',
    textPrimary: '#ffffff',
    textSecondary: 'rgba(0, 255, 120, 0.8)',
    borderRadius: '0.5rem',
    shadow: '0 0 20px rgba(0, 255, 120, 0.4), 0 0 60px rgba(0, 255, 120, 0.1)',
    panelBg: 'rgba(0, 255, 120, 0.03)',
    panelBorder: 'rgba(0, 255, 120, 0.2)',
  },
  sunset: {
    id: 'sunset',
    nameAr: 'الغروب',
    emoji: '🌅',
    bgGradient: 'linear-gradient(135deg, #1a0510 0%, #4a1020 50%, #8b2a1a 100%)',
    cardBg: 'rgba(255, 100, 50, 0.08)',
    cardBorder: 'rgba(255, 130, 60, 0.3)',
    accent: '#ff7043',
    accentSecondary: '#ff1744',
    textPrimary: '#fff5e6',
    textSecondary: 'rgba(255, 200, 150, 0.8)',
    borderRadius: '1rem',
    shadow: '0 8px 32px rgba(255, 80, 30, 0.35)',
    panelBg: 'rgba(180, 50, 20, 0.2)',
    panelBorder: 'rgba(255, 130, 60, 0.2)',
  },
};

export const themeList = Object.values(themes);

interface ThemeContextType {
  theme: GameTheme;
  themeId: string;
  setTheme: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: themes.purple,
  themeId: 'purple',
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeId] = useState(() => {
    return localStorage.getItem('game-theme') || 'purple';
  });

  const theme = themes[themeId] || themes.purple;

  useEffect(() => {
    localStorage.setItem('game-theme', themeId);
    document.body.setAttribute('data-theme', themeId);
    document.documentElement.style.setProperty('--theme-accent', theme.accent);
    document.documentElement.style.setProperty('--theme-accent2', theme.accentSecondary);
    document.documentElement.style.setProperty('--theme-text', theme.textPrimary);
    document.documentElement.style.setProperty('--theme-radius', theme.borderRadius);
    document.documentElement.style.setProperty('--theme-shadow', theme.shadow);
  }, [themeId, theme]);

  return (
    <ThemeContext.Provider value={{ theme, themeId, setTheme: setThemeId }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

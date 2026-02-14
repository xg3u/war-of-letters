// src/hooks/useScreenSize.ts
// هوك لمعرفة حجم الشاشة والتوافق مع الأجهزة

import { useState, useEffect } from 'react';

export type ScreenSize = 'mobile' | 'tablet' | 'desktop';

export interface ScreenInfo {
  width: number;
  height: number;
  size: ScreenSize;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

const getScreenInfo = (): ScreenInfo => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const isMobile = width < 640;
  const isTablet = width >= 640 && width <= 1024;
  const isDesktop = width > 1024;
  const size: ScreenSize = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';

  return { width, height, size, isMobile, isTablet, isDesktop };
};

export const useScreenSize = (): ScreenInfo => {
  const [screenInfo, setScreenInfo] = useState<ScreenInfo>(getScreenInfo);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setScreenInfo(getScreenInfo());
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return screenInfo;
};

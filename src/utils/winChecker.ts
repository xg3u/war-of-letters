// src/utils/winChecker.ts
// فحص شروط الفوز

import type { HexCell, Team, WinCondition } from '../core/types';

interface WinCheckResult {
  winner: Team | null;
  winType?: 'horizontal' | 'vertical' | 'count' | 'any';
}

export const checkWinCondition = (
  cells: HexCell[],
  team: Team,
  condition: WinCondition,
  teamColors: { green: 'horizontal' | 'vertical' | 'both'; red: 'horizontal' | 'vertical' | 'both' }
): WinCheckResult => {
  
  const teamCells = cells.filter(c => c.status === team);
  
  // 1. فحص العدد (most-letters أو first-to-5)
  if (condition === 'most-letters') {
    const greenCount = cells.filter(c => c.status === 'green').length;
    const redCount = cells.filter(c => c.status === 'red').length;
    const total = cells.filter(c => c.status !== 'unanswered').length;
    
    // فحص إذا كل الخلايا مجابة
    if (total === 25) {
      if (greenCount > redCount) return { winner: 'green', winType: 'count' };
      if (redCount > greenCount) return { winner: 'red', winType: 'count' };
      return { winner: null }; // تعادل
    }
  }
  
  if (condition === 'first-to-5' && teamCells.length >= 5) {
    return { winner: team, winType: 'count' };
  }
  
  // 2. فحص الجدار (wall-to-wall)
  if (condition === 'wall-to-wall') {
    const allowedDirection = teamColors[team as 'green' | 'red'];
    
    // فحص أفقي (horizontal)
    if (allowedDirection === 'horizontal' || allowedDirection === 'both') {
      if (checkHorizontalWall(cells, team)) {
        return { winner: team, winType: 'horizontal' };
      }
    }
    
    // فحص عمودي (vertical)
    if (allowedDirection === 'vertical' || allowedDirection === 'both') {
      if (checkVerticalWall(cells, team)) {
        return { winner: team, winType: 'vertical' };
      }
    }
  }
  
  // 3. فحص أي شرط (any-condition)
  if (condition === 'any-condition') {
    const allowedDirection = teamColors[team as 'green' | 'red'];
    
    // فحص 5 خلايا
    if (teamCells.length >= 5) {
      return { winner: team, winType: 'count' };
    }
    
    // فحص جدار أفقي
    if ((allowedDirection === 'horizontal' || allowedDirection === 'both') && checkHorizontalWall(cells, team)) {
      return { winner: team, winType: 'horizontal' };
    }
    
    // فحص جدار عمودي
    if ((allowedDirection === 'vertical' || allowedDirection === 'both') && checkVerticalWall(cells, team)) {
      return { winner: team, winType: 'vertical' };
    }
  }
  
  return { winner: null };
};

// فحص الجدار الأفقي (من يسار إلى يمين)
const checkHorizontalWall = (cells: HexCell[], team: Team): boolean => {
  // نحتاج خط متصل من اليسار (q=0) إلى اليمين (q=4)
  
  for (let r = 0; r < 5; r++) {
    const rowCells = cells.filter(c => c.r === r && c.status === team);
    
    if (rowCells.length === 5) {
      // فحص إذا كانت كل الخلايا متصلة
      const qValues = rowCells.map(c => c.q).sort((a, b) => a - b);
      const isConnected = qValues.every((q, idx) => q === idx);
      
      if (isConnected) return true;
    }
  }
  
  return false;
};

// فحص الجدار العمودي (من أعلى إلى أسفل)
const checkVerticalWall = (cells: HexCell[], team: Team): boolean => {
  // نحتاج خط متصل من أعلى (r=0) إلى أسفل (r=4)
  
  for (let q = 0; q < 5; q++) {
    const colCells = cells.filter(c => c.q === q && c.status === team);
    
    if (colCells.length === 5) {
      // فحص إذا كانت كل الخلايا متصلة
      const rValues = colCells.map(c => c.r).sort((a, b) => a - b);
      const isConnected = rValues.every((r, idx) => r === idx);
      
      if (isConnected) return true;
    }
  }
  
  return false;
};

// رسالة الفوز
export const getWinMessage = (
  winner: Team,
  winType: 'horizontal' | 'vertical' | 'count' | 'any',
  teamName: string
): string => {
  switch (winType) {
    case 'horizontal':
      return `🎉 ${teamName} فاز بخط أفقي كامل!`;
    case 'vertical':
      return `🎉 ${teamName} فاز بخط عمودي كامل!`;
    case 'count':
      return `🎉 ${teamName} فاز بالعدد المطلوب!`;
    case 'any':
      return `🎉 ${teamName} فاز!`;
    default:
      return `🎉 ${teamName} فاز!`;
  }
};
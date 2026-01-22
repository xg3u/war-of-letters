// src/utils/winChecker.ts
// فحص شروط الفوز مع خوارزميات BFS/DFS

import type { HexCell, Team, WinCondition } from '../core/types';

interface WinCheckResult {
  winner: Team | null;
  winType?: 'wall-to-wall' | 'five-connected' | 'most-letters';
  message?: string;
}

// ========== الدالة الرئيسية: checkWinCondition ==========
export const checkWinCondition = (
  cells: HexCell[],
  winCondition: WinCondition,
  teamColors: {
    green: 'horizontal' | 'vertical' | 'both';
    red: 'horizontal' | 'vertical' | 'both'
  }
): WinCheckResult => {

  // 1. فحص الجدار إلى الجدار (Wall-to-Wall) - أولوية قصوى
  if (winCondition === 'wall-to-wall' || winCondition === 'all') {
    const greenWall = checkWallToWall(cells, 'green', teamColors.green);
    if (greenWall.connected) {
      return {
        winner: 'green',
        winType: 'wall-to-wall',
        message: greenWall.direction === 'vertical'
          ? '🎉 الفريق الأخضر ربط الجدار من أعلى لأسفل!'
          : '🎉 الفريق الأخضر ربط الجدار من يسار ليمين!'
      };
    }

    const redWall = checkWallToWall(cells, 'red', teamColors.red);
    if (redWall.connected) {
      return {
        winner: 'red',
        winType: 'wall-to-wall',
        message: redWall.direction === 'vertical'
          ? '🎉 الفريق الأحمر ربط الجدار من أعلى لأسفل!'
          : '🎉 الفريق الأحمر ربط الجدار من يسار ليمين!'
      };
    }
  }

  // 2. فحص 5 خلايا متصلة (Five Connected)
  if (winCondition === 'five-connected' || winCondition === 'all') {
    const greenFive = checkFiveConnected(cells, 'green');
    if (greenFive) {
      return {
        winner: 'green',
        winType: 'five-connected',
        message: '🎉 الفريق الأخضر جمع 5 خلايا متصلة!'
      };
    }

    const redFive = checkFiveConnected(cells, 'red');
    if (redFive) {
      return {
        winner: 'red',
        winType: 'five-connected',
        message: '🎉 الفريق الأحمر جمع 5 خلايا متصلة!'
      };
    }
  }

  // 3. فحص الأكثر حروفاً (Most Letters) - فقط عند نهاية الجولة
  if (winCondition === 'most-letters' || winCondition === 'all') {
    const greenCount = cells.filter(c => c.status === 'green').length;
    const redCount = cells.filter(c => c.status === 'red').length;
    const totalAnswered = greenCount + redCount;

    // فحص إذا كل الخلايا مجابة (25 خلية)
    if (totalAnswered === 25) {
      if (greenCount > redCount) {
        return {
          winner: 'green',
          winType: 'most-letters',
          message: `🎉 الفريق الأخضر فاز بـ ${greenCount} حرف مقابل ${redCount}!`
        };
      }
      if (redCount > greenCount) {
        return {
          winner: 'red',
          winType: 'most-letters',
          message: `🎉 الفريق الأحمر فاز بـ ${redCount} حرف مقابل ${greenCount}!`
        };
      }
      return {
        winner: null,
        message: `⚖️ تعادل! كلا الفريقين حصل على ${greenCount} حرف`
      };
    }
  }

  return { winner: null };
};

// ========== 1. خوارزمية BFS: الجدار إلى الجدار ==========
interface WallCheckResult {
  connected: boolean;
  direction?: 'horizontal' | 'vertical';
}

const checkWallToWall = (
  cells: HexCell[],
  team: Team,
  allowedDirection: 'horizontal' | 'vertical' | 'both'
): WallCheckResult => {

  const teamCells = cells.filter(c => c.status === team);
  if (teamCells.length < 5) return { connected: false }; // الحد الأدنى 5 خلايا

  // فحص الجدار الأفقي (من اليسار q=0 إلى اليمين q=4)
  if (allowedDirection === 'horizontal' || allowedDirection === 'both') {
    const leftWall = teamCells.filter(c => c.q === 0);
    const rightWall = teamCells.filter(c => c.q === 4);

    if (leftWall.length > 0 && rightWall.length > 0) {
      // BFS من كل خلية في الجدار الأيسر
      for (const startCell of leftWall) {
        if (bfsReachesTarget(cells, startCell, rightWall, team)) {
          return { connected: true, direction: 'horizontal' };
        }
      }
    }
  }

  // فحص الجدار العمودي (من الأعلى r=0 إلى الأسفل r=4)
  if (allowedDirection === 'vertical' || allowedDirection === 'both') {
    const topWall = teamCells.filter(c => c.r === 0);
    const bottomWall = teamCells.filter(c => c.r === 4);

    if (topWall.length > 0 && bottomWall.length > 0) {
      // BFS من كل خلية في الجدار العلوي
      for (const startCell of topWall) {
        if (bfsReachesTarget(cells, startCell, bottomWall, team)) {
          return { connected: true, direction: 'vertical' };
        }
      }
    }
  }

  return { connected: false };
};

// BFS للتحقق من الوصول
const bfsReachesTarget = (
  cells: HexCell[],
  startCell: HexCell,
  targetCells: HexCell[],
  team: Team
): boolean => {
  const queue: HexCell[] = [startCell];
  const visited = new Set<string>([startCell.id]);

  while (queue.length > 0) {
    const current = queue.shift()!;

    // فحص إذا وصلنا للهدف
    if (targetCells.some(t => t.id === current.id)) {
      return true;
    }

    // إضافة الجيران
    const neighbors = getNeighbors(cells, current, team);
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.id)) {
        visited.add(neighbor.id);
        queue.push(neighbor);
      }
    }
  }

  return false;
};

// الحصول على الخلايا المجاورة (Hexagonal Grid)
const getNeighbors = (
  cells: HexCell[],
  cell: HexCell,
  team: Team
): HexCell[] => {
  // في الشبكة السداسية، الخلايا المجاورة تعتمد على (q, r)
  // الاتجاهات الستة: (q+1,r), (q-1,r), (q,r+1), (q,r-1), (q+1,r-1), (q-1,r+1)
  const directions = [
    { dq: 1, dr: 0 },   // يمين
    { dq: -1, dr: 0 },  // يسار
    { dq: 0, dr: 1 },   // أسفل-يمين
    { dq: 0, dr: -1 },  // أعلى-يسار
    { dq: 1, dr: -1 },  // أعلى-يمين
    { dq: -1, dr: 1 },  // أسفل-يسار
  ];

  const neighbors: HexCell[] = [];

  for (const dir of directions) {
    const neighborQ = cell.q + dir.dq;
    const neighborR = cell.r + dir.dr;

    const neighbor = cells.find(
      c => c.q === neighborQ && c.r === neighborR && c.status === team
    );

    if (neighbor) {
      neighbors.push(neighbor);
    }
  }

  return neighbors;
};

// ========== 2. خوارزمية DFS: 5 خلايا متصلة ==========
const checkFiveConnected = (cells: HexCell[], team: Team): boolean => {
  const teamCells = cells.filter(c => c.status === team);
  if (teamCells.length < 5) return false;

  const visited = new Set<string>();

  // DFS من كل خلية
  for (const startCell of teamCells) {
    if (!visited.has(startCell.id)) {
      const connectedCount = dfsCount(cells, startCell, team, visited);
      if (connectedCount >= 5) {
        return true;
      }
    }
  }

  return false;
};

// DFS لحساب عدد الخلايا المتصلة
const dfsCount = (
  cells: HexCell[],
  cell: HexCell,
  team: Team,
  visited: Set<string>
): number => {
  if (visited.has(cell.id)) return 0;

  visited.add(cell.id);
  let count = 1;

  const neighbors = getNeighbors(cells, cell, team);
  for (const neighbor of neighbors) {
    count += dfsCount(cells, neighbor, team, visited);
  }

  return count;
};

// ========== رسائل الفوز ==========
export const getWinMessage = (
  _winner: Team,
  winType: 'wall-to-wall' | 'five-connected' | 'most-letters',
  teamName: string
): string => {
  switch (winType) {
    case 'wall-to-wall':
      return `🎉 ${teamName} ربط الجدار من جانب للجانب الآخر!`;
    case 'five-connected':
      return `🎉 ${teamName} جمع 5 خلايا متصلة!`;
    case 'most-letters':
      return `🎉 ${teamName} فاز بأكبر عدد من الحروف!`;
    default:
      return `🎉 ${teamName} فاز!`;
  }
};

// ========== إحصائيات الفوز ==========
export const getWinStats = (
  cells: HexCell[]
): {
  greenCount: number;
  redCount: number;
  unansweredCount: number;
  totalAnswered: number;
} => {
  const greenCount = cells.filter(c => c.status === 'green').length;
  const redCount = cells.filter(c => c.status === 'red').length;
  const unansweredCount = cells.filter(c => c.status === 'unanswered').length;

  return {
    greenCount,
    redCount,
    unansweredCount,
    totalAnswered: greenCount + redCount,
  };
};
// src/utils/winChecker.ts
// فحص شروط الفوز - منطق مبسط وواضح
// =========================================
// 🟢 الأخضر: يفوز بربط 5+ خلايا أفقياً (يسار q=0 ↔ يمين q=4)
// 🔴 الأحمر: يفوز بربط 5+ خلايا عمودياً (أعلى r=0 ↔ أسفل r=4)
// =========================================

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

  // ===== شرط الفوز الأساسي: ربط الجدار للجدار =====
  // الاتجاه يعتمد على teamColors (يتغير عند عكس الألوان)
  // 🟢 الأخضر: افتراضياً أفقي (يسار → يمين)، يصير عمودي عند العكس
  // 🔴 الأحمر: افتراضياً عمودي (أعلى → أسفل)، يصير أفقي عند العكس

  if (winCondition === 'wall-to-wall' || winCondition === 'all' || winCondition === 'five-connected') {

    // فحص فوز الأخضر بناءً على اتجاهه
    if (teamColors.green === 'horizontal') {
      // الأخضر أفقي: q=0 → q=4
      const greenWin = checkHorizontalWin(cells, 'green');
      if (greenWin.connected && greenWin.pathLength >= 5) {
        return {
          winner: 'green',
          winType: 'wall-to-wall',
          message: `🎉 الفريق الأخضر ربط ${greenWin.pathLength} خلايا من اليسار لليمين!`
        };
      }
    } else {
      // الأخضر عمودي: r=0 → r=4
      const greenWin = checkVerticalWin(cells, 'green');
      if (greenWin.connected && greenWin.pathLength >= 5) {
        return {
          winner: 'green',
          winType: 'wall-to-wall',
          message: `🎉 الفريق الأخضر ربط ${greenWin.pathLength} خلايا من الأعلى للأسفل!`
        };
      }
    }

    // فحص فوز الأحمر بناءً على اتجاهه
    if (teamColors.red === 'vertical') {
      // الأحمر عمودي: r=0 → r=4
      const redWin = checkVerticalWin(cells, 'red');
      if (redWin.connected && redWin.pathLength >= 5) {
        return {
          winner: 'red',
          winType: 'wall-to-wall',
          message: `🎉 الفريق الأحمر ربط ${redWin.pathLength} خلايا من الأعلى للأسفل!`
        };
      }
    } else {
      // الأحمر أفقي: q=0 → q=4
      const redWin = checkHorizontalWin(cells, 'red');
      if (redWin.connected && redWin.pathLength >= 5) {
        return {
          winner: 'red',
          winType: 'wall-to-wall',
          message: `🎉 الفريق الأحمر ربط ${redWin.pathLength} خلايا من اليسار لليمين!`
        };
      }
    }
  }

  // فحص الأكثر حروفاً (Most Letters) - فقط عند نهاية الجولة
  if (winCondition === 'most-letters' || winCondition === 'all') {
    const greenCount = cells.filter(c => c.status === 'green').length;
    const redCount = cells.filter(c => c.status === 'red').length;

    // الجولة تنتهي عندما لا تتبقى أي خلية "غير مجابة"
    // الخلايا المدمورة بالقنبلة (destroyed) لا تُحسب لأي فريق ولا تُعدّ غير مجابة
    const unansweredCount = cells.filter(c => c.status === 'unanswered').length;

    if (unansweredCount === 0) {
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

// ========== فحص الفوز الأفقي (للأخضر): يسار q=0 → يمين q=4 ==========
interface PathCheckResult {
  connected: boolean;
  pathLength: number;
}

const checkHorizontalWin = (cells: HexCell[], team: Team): PathCheckResult => {
  const teamCells = cells.filter(c => c.status === team);
  if (teamCells.length < 5) return { connected: false, pathLength: 0 };

  // الجدار الأيسر (q=0) والجدار الأيمن (q=4)
  const leftWall = teamCells.filter(c => c.q === 0);
  const rightWall = teamCells.filter(c => c.q === 4);

  if (leftWall.length === 0 || rightWall.length === 0) {
    return { connected: false, pathLength: 0 };
  }

  // BFS من كل خلية في الجدار الأيسر
  for (const startCell of leftWall) {
    const result = bfsPathToTarget(cells, startCell, rightWall, team);
    if (result.reached) {
      return { connected: true, pathLength: result.pathLength };
    }
  }

  return { connected: false, pathLength: 0 };
};

// ========== فحص الفوز العمودي (للأحمر): أعلى r=0 → أسفل r=4 ==========
const checkVerticalWin = (cells: HexCell[], team: Team): PathCheckResult => {
  const teamCells = cells.filter(c => c.status === team);
  if (teamCells.length < 5) return { connected: false, pathLength: 0 };

  // الجدار العلوي (r=0) والجدار السفلي (r=4)
  const topWall = teamCells.filter(c => c.r === 0);
  const bottomWall = teamCells.filter(c => c.r === 4);

  if (topWall.length === 0 || bottomWall.length === 0) {
    return { connected: false, pathLength: 0 };
  }

  // BFS من كل خلية في الجدار العلوي
  for (const startCell of topWall) {
    const result = bfsPathToTarget(cells, startCell, bottomWall, team);
    if (result.reached) {
      return { connected: true, pathLength: result.pathLength };
    }
  }

  return { connected: false, pathLength: 0 };
};

// ========== BFS للتحقق من الوصول وحساب طول المسار ==========
const bfsPathToTarget = (
  cells: HexCell[],
  startCell: HexCell,
  targetCells: HexCell[],
  team: Team
): { reached: boolean; pathLength: number } => {
  const queue: HexCell[] = [startCell];
  const visited = new Set<string>([startCell.id]);

  while (queue.length > 0) {
    const current = queue.shift()!;

    // فحص إذا وصلنا للهدف
    if (targetCells.some(t => t.id === current.id)) {
      return { reached: true, pathLength: visited.size };
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

  return { reached: false, pathLength: 0 };
};

// الحصول على الخلايا المجاورة (8-Way Connectivity: Edges + Corners)
const getNeighbors = (
  cells: HexCell[],
  cell: HexCell,
  team: Team
): HexCell[] => {
  // 8-way connectivity: 4 edges + 4 corners
  // هذا يسمح بالاتصال القطري للزوايا المشتركة
  const directions = [
    // 4 Edges (الحواف)
    { dq: 1, dr: 0 },   // يمين (Right)
    { dq: -1, dr: 0 },  // يسار (Left)
    { dq: 0, dr: 1 },   // أسفل (Down)
    { dq: 0, dr: -1 },  // أعلى (Up)
    // 4 Corners (الزوايا)
    { dq: 1, dr: -1 },  // أعلى-يمين (Up-Right)
    { dq: -1, dr: 1 },  // أسفل-يسار (Down-Left)
    { dq: 1, dr: 1 },   // أسفل-يمين (Down-Right)
    { dq: -1, dr: -1 }, // أعلى-يسار (Up-Left)
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

// ========== ملاحظة: تم إزالة checkFiveConnected لأن شرط الفوز الآن موحد ==========
// 🟢 الأخضر: يفوز فقط بالاتصال الأفقي (يسار ↔ يمين)
// 🔴 الأحمر: يفوز فقط بالاتصال العمودي (أعلى ↔ أسفل)

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
  destroyedCount: number;
  totalAnswered: number;
} => {
  const greenCount = cells.filter(c => c.status === 'green').length;
  const redCount = cells.filter(c => c.status === 'red').length;
  const unansweredCount = cells.filter(c => c.status === 'unanswered').length;
  const destroyedCount = cells.filter(c => c.status === 'destroyed').length;

  return {
    greenCount,
    redCount,
    unansweredCount,
    destroyedCount,
    totalAnswered: greenCount + redCount, // المدمورة لا تُحسب لأي فريق
  };
};

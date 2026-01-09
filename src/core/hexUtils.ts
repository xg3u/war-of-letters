// src/core/hexUtils.ts
import type { HexCell, Team } from './types';

export const getNeighbors = (q: number, r: number) => {
  const directions = [
    { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
    { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
  ];
  return directions.map(d => ({ q: q + d.q, r: r + d.r }));
};

export const checkWin = (cells: HexCell[], team: Team, gridSize: number): boolean => {
  if (!team) return false;
  const teamCells = cells.filter(c => c.status === team);
  const startNodes = teamCells.filter(c => team === 'green' ? c.q === 0 : c.r === 0);
  const visited = new Set<string>();
  const queue = [...startNodes];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = `${current.q},${current.r}`;
    if (visited.has(key)) continue;
    visited.add(key);

    if (team === 'green' && current.q === gridSize - 1) return true;
    if (team === 'red' && current.r === gridSize - 1) return true;

    const neighbors = getNeighbors(current.q, current.r);
    for (const n of neighbors) {
      const neighborCell = teamCells.find(tc => tc.q === n.q && tc.r === n.r);
      if (neighborCell) queue.push(neighborCell);
    }
  }
  return false;
};
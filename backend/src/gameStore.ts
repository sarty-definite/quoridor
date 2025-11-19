import { v4 as uuidv4 } from 'uuid';
import { GameState, Player, DEFAULTS } from 'quoridor-core';

const games = new Map<string, GameState>();

export function createGame(playersCount = 2): { id: string; game: GameState } {
  const N = playersCount === 2 ? DEFAULTS.defaultBoard2P : DEFAULTS.defaultBoard3P;
  const players: Player[] = [] as any;
  if (playersCount === 2) {
  players.push({ id: 'p1', pos: { r: N - 1, c: Math.floor(N / 2) }, startPos: { r: N - 1, c: Math.floor(N / 2) }, wallsRemaining: DEFAULTS.walls2P, goal: { axis: 'r', value: 0 } } as any);
  players.push({ id: 'p2', pos: { r: 0, c: Math.floor(N / 2) }, startPos: { r: 0, c: Math.floor(N / 2) }, wallsRemaining: DEFAULTS.walls2P, goal: { axis: 'r', value: N - 1 } } as any);
  } else if (playersCount === 3) {
    // simple 3-player layout: bottom, top, left
  const mid = Math.floor(N / 2);
  players.push({ id: 'p1', pos: { r: N - 1, c: mid }, startPos: { r: N - 1, c: mid }, wallsRemaining: DEFAULTS.walls3P, goal: { axis: 'r', value: 0 } } as any);
  players.push({ id: 'p2', pos: { r: 0, c: mid }, startPos: { r: 0, c: mid }, wallsRemaining: DEFAULTS.walls3P, goal: { axis: 'r', value: N - 1 } } as any);
  players.push({ id: 'p3', pos: { r: mid, c: 0 }, startPos: { r: mid, c: 0 }, wallsRemaining: DEFAULTS.walls3P, goal: { axis: 'c', value: N - 1 } } as any);
  } else if (playersCount === 4) {
    // 4-player: bottom, top, left, right
  const mid = Math.floor(N / 2);
  players.push({ id: 'p1', pos: { r: N - 1, c: mid }, startPos: { r: N - 1, c: mid }, wallsRemaining: DEFAULTS.walls4P, goal: { axis: 'r', value: 0 } } as any);
  players.push({ id: 'p2', pos: { r: 0, c: mid }, startPos: { r: 0, c: mid }, wallsRemaining: DEFAULTS.walls4P, goal: { axis: 'r', value: N - 1 } } as any);
  players.push({ id: 'p3', pos: { r: mid, c: 0 }, startPos: { r: mid, c: 0 }, wallsRemaining: DEFAULTS.walls4P, goal: { axis: 'c', value: N - 1 } } as any);
  players.push({ id: 'p4', pos: { r: mid, c: N - 1 }, startPos: { r: mid, c: N - 1 }, wallsRemaining: DEFAULTS.walls4P, goal: { axis: 'c', value: 0 } } as any);
  }
  const game: GameState = { boardSize: N, players, walls: [], turnIndex: 0 } as any;
  ensurePlayerGoals(game);
  const id = uuidv4();
  games.set(id, game);
  return { id, game };
}

export function getGame(id: string) {
  const g = games.get(id);
  if (!g) return undefined;
  // ensure goals exist for backward compatibility
  ensurePlayerGoals(g);
  return g;
}

export function saveGame(id: string, state: GameState) {
  // ensure goals are present before saving
  ensurePlayerGoals(state);
  games.set(id, state);
}

function ensurePlayerGoals(game: GameState) {
  const N = game.boardSize;
  for (const p of game.players) {
    if (p.goal) continue;
    // prefer startPos if present
    const ref = p.startPos ?? p.pos;
    if (typeof ref?.r === 'number') {
      // set backfill startPos if it was missing
      if (!p.startPos) p.startPos = { r: p.pos.r, c: p.pos.c };
      const mid = Math.floor(N / 2);
      if (ref.r >= mid) {
        p.goal = { axis: 'r', value: 0 };
      } else {
        p.goal = { axis: 'r', value: N - 1 };
      }
      continue;
    }
    // fallback: default p1/p2 mapping if id indicates ordering
    if (p.id === 'p1') p.goal = { axis: 'r', value: 0 };
    else if (p.id === 'p2') p.goal = { axis: 'r', value: N - 1 };
  }
}

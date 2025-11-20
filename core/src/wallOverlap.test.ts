import { GameState, Wall } from './types';
import { canPlaceWall } from './game';

test('reject crossing walls at same anchor', () => {
  const state: GameState = {
    boardSize: 5,
    players: [
      { id: 'p1', pos: { r: 4, c: 2 }, wallsRemaining: 10 },
      { id: 'p2', pos: { r: 0, c: 2 }, wallsRemaining: 10 },
    ],
    walls: [
      { id: 'w1', orientation: 'H', r: 2, c: 2 },
    ],
    turnIndex: 0,
  } as any;
  const candidate: Wall = { id: 'v1', orientation: 'V', r: 2, c: 2 };
  expect(canPlaceWall(state, candidate)).toBe(false);
});

test('reject partial overlap (shares an edge)', () => {
  const state: GameState = {
    boardSize: 5,
    players: [
      { id: 'p1', pos: { r: 4, c: 2 }, wallsRemaining: 10 },
      { id: 'p2', pos: { r: 0, c: 2 }, wallsRemaining: 10 },
    ],
    walls: [
      { id: 'w1', orientation: 'H', r: 1, c: 1 },
    ],
    turnIndex: 0,
  } as any;
  // candidate horizontal that would overlap half with existing (sharing one blocked edge)
  const candidate: Wall = { id: 'w2', orientation: 'H', r: 1, c: 2 };
  expect(canPlaceWall(state, candidate)).toBe(false);
});

test('allow adjacent non-overlapping walls', () => {
  const state: GameState = {
    boardSize: 5,
    players: [
      { id: 'p1', pos: { r: 4, c: 2 }, wallsRemaining: 10 },
      { id: 'p2', pos: { r: 0, c: 2 }, wallsRemaining: 10 },
    ],
    walls: [
      { id: 'w1', orientation: 'H', r: 1, c: 1 },
    ],
    turnIndex: 0,
  } as any;
  // candidate horizontal adjacent but not overlapping
  const candidate: Wall = { id: 'w2', orientation: 'H', r: 2, c: 1 };
  expect(canPlaceWall(state, candidate)).toBe(true);
});

import { GameState, Wall } from './types';
import { canPlaceWall } from './game';

test('can place non-overlapping wall', () => {
  const state: GameState = {
    boardSize: 9,
    players: [
      { id: 'p1', pos: { r: 8, c: 4 }, wallsRemaining: 10 },
      { id: 'p2', pos: { r: 0, c: 4 }, wallsRemaining: 10 },
    ],
    walls: [],
    turnIndex: 0,
  };
  const w: Wall = { id: 'w1', orientation: 'H', r: 1, c: 3 };
  expect(canPlaceWall(state, w)).toBe(true);
});

test('cannot place wall that blocks path', () => {
  const state: GameState = {
    boardSize: 3,
    players: [
      { id: 'p1', pos: { r: 2, c: 1 }, wallsRemaining: 10 },
      { id: 'p2', pos: { r: 0, c: 1 }, wallsRemaining: 10 },
    ],
    // place three horizontal walls so that placing the fourth will block all vertical connections
    walls: [
      { id: 'w1', orientation: 'H', r: 0, c: 0 },
      { id: 'w1b', orientation: 'H', r: 0, c: 1 },
      { id: 'w1c', orientation: 'H', r: 1, c: 0 },
    ],
    turnIndex: 0,
  };
  // placing a second horizontal wall will block the only path for p1
  const w: Wall = { id: 'w2', orientation: 'H', r: 1, c: 1 };
  expect(canPlaceWall(state, w)).toBe(false);
});

test('straight jump over pawn when space free', () => {
  const state: GameState = {
    boardSize: 5,
    players: [
      { id: 'p1', pos: { r: 2, c: 2 }, wallsRemaining: 10 },
      { id: 'p2', pos: { r: 2, c: 3 }, wallsRemaining: 10 },
    ],
    walls: [],
    turnIndex: 0,
  };
  const moves = require('./game').getLegalMoves(state, 'p1');
  // jumping to (2,4) should be allowed
  expect(moves).toEqual(expect.arrayContaining([{ r: 2, c: 4 }]));
});

test('diagonal hop when straight jump blocked by wall', () => {
  const state: GameState = {
    boardSize: 5,
    players: [
      { id: 'p1', pos: { r: 2, c: 2 }, wallsRemaining: 10 },
      { id: 'p2', pos: { r: 2, c: 3 }, wallsRemaining: 10 },
    ],
    walls: [
      // place vertical wall immediately to the right of p2, blocking straight jump
      { id: 'w1', orientation: 'V', r: 2, c: 3 },
    ],
    turnIndex: 0,
  };
  const moves = require('./game').getLegalMoves(state, 'p1');
  // diagonal hops (1,3) and (3,3) should be allowed if not blocked
  expect(moves).toEqual(expect.arrayContaining([{ r: 1, c: 3 }, { r: 3, c: 3 }]));
});

test('diagonal blocked when walls block diag', () => {
  const state: GameState = {
    boardSize: 5,
    players: [
      { id: 'p1', pos: { r: 2, c: 2 }, wallsRemaining: 10 },
      { id: 'p2', pos: { r: 2, c: 3 }, wallsRemaining: 10 },
    ],
    walls: [
      { id: 'w1', orientation: 'V', r: 2, c: 3 },
      { id: 'w2', orientation: 'H', r: 1, c: 3 },
      { id: 'w3', orientation: 'H', r: 2, c: 3 },
    ],
    turnIndex: 0,
  };
  const moves = require('./game').getLegalMoves(state, 'p1');
  // diag (1,3) and (3,3) should be blocked
  expect(moves).not.toEqual(expect.arrayContaining([{ r: 1, c: 3 }]));
  expect(moves).not.toEqual(expect.arrayContaining([{ r: 3, c: 3 }]));
});

import { GameState } from './types';
import { checkWinner, applyMove, applyPlaceWall } from './game';

test('no winner at game start', () => {
  const state: GameState = {
    boardSize: 9,
    players: [
      { id: 'p1', pos: { r: 8, c: 4 }, wallsRemaining: 10, goal: { axis: 'r', value: 0 } },
      { id: 'p2', pos: { r: 0, c: 4 }, wallsRemaining: 10, goal: { axis: 'r', value: 8 } },
    ],
    walls: [],
    turnIndex: 0,
  };
  expect(checkWinner(state)).toBeNull();
});

test('winner when player reaches goal row', () => {
  const state: GameState = {
    boardSize: 5,
    players: [
      { id: 'p1', pos: { r: 4, c: 2 }, wallsRemaining: 10, goal: { axis: 'r', value: 0 } },
      { id: 'p2', pos: { r: 0, c: 2 }, wallsRemaining: 10, goal: { axis: 'r', value: 4 } },
    ],
    walls: [],
    turnIndex: 0,
  };
  // set up a state where p1 is at the goal row and ensure winner is detected
  const stateAtGoal: GameState = { ...state, players: [{ ...state.players[0], pos: { r: 0, c: 2 } }, { ...state.players[1] }] };
  expect(checkWinner(stateAtGoal)).toBe('p1');
});

test('player without explicit goal is not winner at edge', () => {
  const state: GameState = {
    boardSize: 3,
    players: [
      { id: 'p1', pos: { r: 2, c: 1 }, wallsRemaining: 10 }, // no goal
      { id: 'p2', pos: { r: 0, c: 1 }, wallsRemaining: 10, goal: { axis: 'r', value: 2 } },
    ],
    walls: [],
    turnIndex: 0,
  };
  // p1 is on edge but has no goal -> should not be winner
  expect(checkWinner(state)).toBeNull();
});

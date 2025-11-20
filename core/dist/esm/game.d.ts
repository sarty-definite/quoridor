import { GameState, Coord, Wall } from "./types";
export declare function canPlaceWall(state: GameState, wall: Wall): boolean;
export declare function applyMove(state: GameState, playerId: string, to: Coord): GameState;
export declare function applyPlaceWall(state: GameState, wall: Wall): GameState;
export declare function checkWinner(state: GameState): string | null;
export declare function getLegalMoves(state: GameState, playerId: string): Coord[];

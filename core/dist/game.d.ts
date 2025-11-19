import { GameState, Coord, Wall } from './types';
export declare function canPlaceWall(state: GameState, wall: Wall): boolean;
export declare function getLegalMoves(state: GameState, playerId: string): Coord[];

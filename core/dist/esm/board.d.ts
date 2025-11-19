import { Coord, Wall } from './types';
export declare function inBounds(boardSize: number, coord: Coord): boolean;
export type Edge = string;
export declare function edgeKey(a: Coord, b: Coord): string;
export declare function getBlockedEdgesFromWalls(walls: Wall[]): Set<string>;

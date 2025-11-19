export type Coord = { r: number; c: number };

export type Orientation = 'H' | 'V';

export interface Wall {
  id: string;
  orientation: Orientation;
  r: number; // top-left anchor of the wall segment
  c: number;
}

export interface Player {
  id: string;
  name?: string;
  pos: Coord;
  // starting position — used to derive permanent goals and for safe inference
  startPos?: Coord;
  wallsRemaining: number;
  // goal indicates the coordinate axis the player needs to reach to win
  // e.g. { axis: 'r', value: 0 } means reach row 0
  goal?: { axis: 'r' | 'c'; value: number };
}

export interface GameState {
  boardSize: number;
  players: Player[];
  walls: Wall[];
  turnIndex: number;
}

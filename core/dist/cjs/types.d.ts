export type Coord = {
    r: number;
    c: number;
};
export type Orientation = 'H' | 'V';
export interface Wall {
    id: string;
    orientation: Orientation;
    r: number;
    c: number;
}
export interface Player {
    id: string;
    name?: string;
    pos: Coord;
    startPos?: Coord;
    wallsRemaining: number;
    goal?: {
        axis: 'r' | 'c';
        value: number;
    };
}
export interface GameState {
    boardSize: number;
    players: Player[];
    walls: Wall[];
    turnIndex: number;
}

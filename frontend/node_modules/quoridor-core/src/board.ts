import { Coord, Orientation, Wall } from './types';

export function inBounds(boardSize: number, coord: Coord) {
  return coord.r >= 0 && coord.r < boardSize && coord.c >= 0 && coord.c < boardSize;
}

// Represent walls as blocked edges between two adjacent tiles.
export type Edge = string; // "r1,c1|r2,c2"

export function edgeKey(a: Coord, b: Coord) {
  return `${a.r},${a.c}|${b.r},${b.c}`;
}

export function getBlockedEdgesFromWalls(walls: Wall[]) {
  const edges = new Set<Edge>();
  for (const w of walls) {
    const { orientation, r, c } = w;
    if (orientation === 'H') {
      // horizontal wall between rows r and r+1, spanning cols c and c+1
      // it blocks edges: (r,c)-(r+1,c) and (r,c+1)-(r+1,c+1)
      edges.add(edgeKey({ r, c }, { r: r + 1, c }));
      edges.add(edgeKey({ r: r + 1, c }, { r, c }));
      edges.add(edgeKey({ r, c: c + 1 }, { r: r + 1, c: c + 1 }));
      edges.add(edgeKey({ r: r + 1, c: c + 1 }, { r, c: c + 1 }));
    } else {
      // vertical wall between cols c and c+1, spanning rows r and r+1
      // it blocks edges: (r,c)-(r,c+1) and (r+1,c)-(r+1,c+1)
      edges.add(edgeKey({ r, c }, { r, c: c + 1 }));
      edges.add(edgeKey({ r, c: c + 1 }, { r, c }));
      edges.add(edgeKey({ r: r + 1, c }, { r: r + 1, c: c + 1 }));
      edges.add(edgeKey({ r: r + 1, c: c + 1 }, { r: r + 1, c }));
    }
  }
  return edges;
}

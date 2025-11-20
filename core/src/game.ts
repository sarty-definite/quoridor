import { GameState, Coord, Wall, Player } from "./types";
import { hasPathToGoal } from "./pathfinding";
import { inBounds, edgeKey, getBlockedEdgesFromWalls } from "./board";

export function canPlaceWall(state: GameState, wall: Wall) {
  // simple overlap / bounds checks
  const N = state.boardSize;
  if (wall.orientation === "H") {
    if (wall.r < 0 || wall.r >= N - 1 || wall.c < 0 || wall.c >= N - 1)
      return false;
  } else {
    if (wall.r < 0 || wall.r >= N - 1 || wall.c < 0 || wall.c >= N - 1)
      return false;
  }
  // overlapping and crossing checks
  for (const w of state.walls) {
    // same anchor + orientation is obviously illegal
    if (w.r === wall.r && w.c === wall.c && w.orientation === wall.orientation)
      return false;
    // if orientations differ and they share the same anchor, they cross (forbidden)
    if (w.orientation !== wall.orientation && w.r === wall.r && w.c === wall.c) return false;
    // compute blocked edges for existing and candidate walls; if any blocked edge intersects,
    // the candidate overlaps an existing wall (shares an edge) and is illegal
    const existingEdges = getBlockedEdgesFromWalls([w]);
    const candidateEdges = getBlockedEdgesFromWalls([wall]);
    for (const e of existingEdges) if (candidateEdges.has(e)) return false;
  }

  // tentatively add and check path existence for all players
  const walls = [...state.walls, wall];
  for (const p of state.players) {
    const goalCheck = (pos: Coord) => {
      if (p.goal)
        return p.goal.axis === "r"
          ? pos.r === p.goal.value
          : pos.c === p.goal.value;
      // if startPos exists, derive goal from it
      if (p.startPos) {
        if (p.startPos.r === 0) return pos.r === N - 1;
        if (p.startPos.r === N - 1) return pos.r === 0;
        if (p.startPos.c === 0) return pos.c === N - 1;
        if (p.startPos.c === N - 1) return pos.c === 0;
      }
      // fallback to previous behavior based on current pos
      if (p.pos.r === 0) return pos.r === N - 1;
      if (p.pos.r === N - 1) return pos.r === 0;
      if (p.pos.c === 0) return pos.c === N - 1;
      if (p.pos.c === N - 1) return pos.c === 0;
      return false;
    };
    if (!hasPathToGoal(N, p.pos, goalCheck, walls)) return false;
  }
  return true;
}

// apply a move; returns new GameState copy
export function applyMove(
  state: GameState,
  playerId: string,
  to: Coord
): GameState {
  const legal = getLegalMoves(state, playerId);
  if (!legal.find((m) => m.r === to.r && m.c === to.c))
    throw new Error("illegal move");
  const next: GameState = {
    ...state,
    players: state.players.map((p) => ({ ...p })),
    walls: [...state.walls],
  } as any;
  const idx = next.players.findIndex((p) => p.id === playerId);
  next.players[idx].pos = to;
  next.turnIndex = (next.turnIndex + 1) % next.players.length;
  return next;
}

// apply a wall placement; decrements wallsRemaining and validates
export function applyPlaceWall(state: GameState, wall: Wall): GameState {
  if (!canPlaceWall(state, wall)) throw new Error("illegal wall");
  const next: GameState = {
    ...state,
    players: state.players.map((p) => ({ ...p })),
    walls: [...state.walls],
  } as any;
  const idx = next.turnIndex;
  if (typeof next.players[idx].wallsRemaining === "number") {
    if (next.players[idx].wallsRemaining <= 0)
      throw new Error("no walls remaining");
    next.players[idx].wallsRemaining -= 1;
  }
  next.walls.push(wall);
  next.turnIndex = (next.turnIndex + 1) % next.players.length;
  return next;
}

// check winner: returns player id or null
export function checkWinner(state: GameState): string | null {
  const N = state.boardSize;
  for (const p of state.players) {
    // if explicit goal present, use it
    if (p.goal) {
      if (p.goal.axis === "r" && p.pos.r === p.goal.value) return p.id;
      if (p.goal.axis === "c" && p.pos.c === p.goal.value) return p.id;
      continue;
    }
    // prefer using startPos to infer permanent goal
    if (p.startPos) {
      if (p.startPos.r === 0 && p.pos.r === N - 1) return p.id;
      if (p.startPos.r === N - 1 && p.pos.r === 0) return p.id;
      if (p.startPos.c === 0 && p.pos.c === N - 1) return p.id;
      if (p.startPos.c === N - 1 && p.pos.c === 0) return p.id;
      continue;
    }
    // fallback for 2-player games: infer by player index to preserve classic mapping
    if (state.players.length === 2) {
      const idx = state.players.findIndex((x) => x.id === p.id);
      if (idx === 0) {
        // player 0's goal is top row (row 0)
        if (p.pos.r === 0) return p.id;
      } else if (idx === 1) {
        // player 1's goal is bottom row (row N-1)
        if (p.pos.r === N - 1) return p.id;
      }
      continue;
    }
    // For other player counts we don't infer reliably; skip
  }
  return null;
}

export function getLegalMoves(state: GameState, playerId: string) {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return [] as Coord[];
  const dirs = [
    { r: -1, c: 0 },
    { r: 1, c: 0 },
    { r: 0, c: -1 },
    { r: 0, c: 1 },
  ];
  const moves: Coord[] = [];
  const blocked = getBlockedEdgesFromWalls(state.walls);

  const occupied = new Map<string, string>();
  for (const p of state.players) occupied.set(`${p.pos.r},${p.pos.c}`, p.id);

  const leftOf = (d: Coord) => ({ r: d.r, c: d.c - 1 });
  const rightOf = (d: Coord) => ({ r: d.r, c: d.c + 1 });

  for (const d of dirs) {
    const n = { r: player.pos.r + d.r, c: player.pos.c + d.c };
    if (!inBounds(state.boardSize, n)) continue;
    // if there's a wall blocking between player and neighbor, skip
    if (blocked.has(edgeKey(player.pos, n))) continue;

    const occ = occupied.get(`${n.r},${n.c}`);
    if (!occ) {
      // empty adjacent tile
      moves.push(n);
      continue;
    }

    // occupied by someone -> attempt jump
    const beyond = { r: n.r + d.r, c: n.c + d.c };
    if (
      inBounds(state.boardSize, beyond) &&
      !blocked.has(edgeKey(n, beyond)) &&
      !occupied.has(`${beyond.r},${beyond.c}`)
    ) {
      // straight jump is possible
      moves.push(beyond);
      continue;
    }

    // straight jump blocked -> consider diagonal hops around the blocking pawn
    // compute lateral directions depending on movement axis (for horizontal move, laterals are vertical offsets)
    const laterals: Coord[] =
      d.r === 0
        ? [
            { r: -1, c: 0 },
            { r: 1, c: 0 },
          ]
        : [
            { r: 0, c: -1 },
            { r: 0, c: 1 },
          ];
    for (const lat of laterals) {
      const diag = { r: n.r + lat.r, c: n.c + lat.c };
      if (!inBounds(state.boardSize, diag)) continue;
      // diag must be unoccupied
      if (occupied.has(`${diag.r},${diag.c}`)) continue;
      // require that there is no wall between the neighbor and the diagonal square
      if (blocked.has(edgeKey(n, diag))) continue;
      // Note: player->diag is a diagonal move that is only allowed as a result of the blocked jump;
      // already validated neighbor is adjacent and player->n edge is open.
      moves.push(diag);
    }
  }

  return moves;
}

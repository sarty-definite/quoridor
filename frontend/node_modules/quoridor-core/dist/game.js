import { hasPathToGoal } from './pathfinding';
import { inBounds, edgeKey, getBlockedEdgesFromWalls } from './board';
export function canPlaceWall(state, wall) {
    // simple overlap / bounds checks
    const N = state.boardSize;
    if (wall.orientation === 'H') {
        if (wall.r < 0 || wall.r >= N - 1 || wall.c < 0 || wall.c >= N - 1)
            return false;
    }
    else {
        if (wall.r < 0 || wall.r >= N - 1 || wall.c < 0 || wall.c >= N - 1)
            return false;
    }
    // overlapping check
    for (const w of state.walls) {
        if (w.r === wall.r && w.c === wall.c && w.orientation === wall.orientation)
            return false;
        // crossing check: H crosses V at same anchor
        if (w.r === wall.r && w.c === wall.c && w.orientation !== wall.orientation)
            return false;
    }
    // tentatively add and check path existence for all players
    const walls = [...state.walls, wall];
    for (const p of state.players) {
        const goalCheck = (pos) => {
            // default: opponent side is opposite row for 2-player; here we support generic check: reaching last row r===N-1 for player starting at r===0
            if (p.pos.r === 0)
                return pos.r === N - 1;
            if (p.pos.r === N - 1)
                return pos.r === 0;
            if (p.pos.c === 0)
                return pos.c === N - 1;
            if (p.pos.c === N - 1)
                return pos.c === 0;
            return false;
        };
        if (!hasPathToGoal(N, p.pos, goalCheck, walls))
            return false;
    }
    return true;
}
export function getLegalMoves(state, playerId) {
    const player = state.players.find((p) => p.id === playerId);
    if (!player)
        return [];
    const dirs = [
        { r: -1, c: 0 },
        { r: 1, c: 0 },
        { r: 0, c: -1 },
        { r: 0, c: 1 },
    ];
    const moves = [];
    const blocked = getBlockedEdgesFromWalls(state.walls);
    const occupied = new Map();
    for (const p of state.players)
        occupied.set(`${p.pos.r},${p.pos.c}`, p.id);
    const leftOf = (d) => ({ r: d.r, c: d.c - 1 });
    const rightOf = (d) => ({ r: d.r, c: d.c + 1 });
    for (const d of dirs) {
        const n = { r: player.pos.r + d.r, c: player.pos.c + d.c };
        if (!inBounds(state.boardSize, n))
            continue;
        // if there's a wall blocking between player and neighbor, skip
        if (blocked.has(edgeKey(player.pos, n)))
            continue;
        const occ = occupied.get(`${n.r},${n.c}`);
        if (!occ) {
            // empty adjacent tile
            moves.push(n);
            continue;
        }
        // occupied by someone -> attempt jump
        const beyond = { r: n.r + d.r, c: n.c + d.c };
        if (inBounds(state.boardSize, beyond) && !blocked.has(edgeKey(n, beyond)) && !occupied.has(`${beyond.r},${beyond.c}`)) {
            // straight jump is possible
            moves.push(beyond);
            continue;
        }
        // straight jump blocked -> consider diagonal hops around the blocking pawn
        // compute lateral directions depending on movement axis (for horizontal move, laterals are vertical offsets)
        const laterals = d.r === 0 ? [{ r: -1, c: 0 }, { r: 1, c: 0 }] : [{ r: 0, c: -1 }, { r: 0, c: 1 }];
        for (const lat of laterals) {
            const diag = { r: n.r + lat.r, c: n.c + lat.c };
            if (!inBounds(state.boardSize, diag))
                continue;
            // diag must be unoccupied
            if (occupied.has(`${diag.r},${diag.c}`))
                continue;
            // require that there is no wall between the neighbor and the diagonal square
            if (blocked.has(edgeKey(n, diag)))
                continue;
            // Note: player->diag is a diagonal move that is only allowed as a result of the blocked jump;
            // already validated neighbor is adjacent and player->n edge is open.
            moves.push(diag);
        }
    }
    return moves;
}

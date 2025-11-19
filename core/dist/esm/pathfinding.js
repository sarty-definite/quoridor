import { edgeKey, getBlockedEdgesFromWalls, inBounds } from './board';
export function hasPathToGoal(boardSize, start, goalCheck, walls) {
    const blocked = getBlockedEdgesFromWalls(walls);
    const seen = new Set();
    const q = [start];
    seen.add(`${start.r},${start.c}`);
    const dirs = [
        { r: -1, c: 0 },
        { r: 1, c: 0 },
        { r: 0, c: -1 },
        { r: 0, c: 1 },
    ];
    while (q.length) {
        const cur = q.shift();
        if (goalCheck(cur))
            return true;
        for (const d of dirs) {
            const next = { r: cur.r + d.r, c: cur.c + d.c };
            if (!inBounds(boardSize, next))
                continue;
            const e = edgeKey(cur, next);
            if (blocked.has(e))
                continue;
            const key = `${next.r},${next.c}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            q.push(next);
        }
    }
    return false;
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GameState, Coord } from 'quoridor-core';
import * as core from 'quoridor-core';
import { io } from 'socket.io-client';

const SERVER = ((import.meta as any).env && (import.meta as any).env.VITE_API_URL);

export default function App() {
  // UI state for start screen and settings
  const [showStart, setShowStart] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [defaultBoardSize, setDefaultBoardSize] = useState<number>(9);
  const [defaultPlayers, setDefaultPlayers] = useState<number>(2);
  const [game, setGame] = useState<GameState | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [placingWall, setPlacingWall] = useState<'H' | 'V' | 'B' | null>(null);
  const [showValidAnchors, setShowValidAnchors] = useState(true);
  const [boardSize, setBoardSize] = useState<number | null>(null);
  // new UI state for homepage / lobby flows
  const [playerName, setPlayerName] = useState<string>('');
  const [showLobbyPopup, setShowLobbyPopup] = useState(false);
  const [lobbyView, setLobbyView] = useState<'main' | 'playLocalOptions' | null>('main');
  const [roomInfo, setRoomInfo] = useState<{ admin?: string; spectators: string[]; started?: boolean; boardSize?: number; roomId?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<any>(null);
  const [claimedSlots, setClaimedSlots] = useState<string[]>([]);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [isLocalGame, setIsLocalGame] = useState(false);
  const [botEnabled, setBotEnabled] = useState(false);
  const botTimer = useRef<number | null>(null);
  const [winner, setWinner] = useState<string | null>(null);

  useEffect(() => {
    socketRef.current = io(SERVER, { autoConnect: true });
    const socket = socketRef.current;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => { setConnected(false); setClaimedSlots([]); setLocalPlayerId(null); });
    socket.on('game_update', (payload: any) => {
      if (!payload || !payload.id) return;
      if (payload.id === gameId) setGame(payload.game);
    });
    socket.on('slot_update', (payload: any) => {
      if (!payload || !payload.id) return;
      if (payload.id === gameId) setClaimedSlots(payload.slots || []);
    });
    socket.on('joined', (payload: any) => {
      // optional ack
      if (payload && payload.id === gameId && payload.playerId) setLocalPlayerId(payload.playerId);
    });
    return () => { socket.disconnect(); };
  }, [gameId]);

  // auto-join from URL (#room=ID or ?room=ID) on first load
  useEffect(() => {
    try {
      const h = window.location.hash || '';
      const q = window.location.search || '';
      let id: string | null = null;
      if (h.startsWith('#')) {
        const m = h.match(/room=([a-zA-Z0-9\-_:]+)/);
        if (m) id = m[1];
      }
      if (!id && q.startsWith('?')) {
        const params = new URLSearchParams(q.slice(1));
        const r = params.get('room');
        if (r) id = r;
      }
      if (id) {
        // open lobby and attempt join; allow playerName to be empty (guest)
        setShowLobbyPopup(true);
        setLobbyView('main');
        // small timeout so UI has opened
        setTimeout(() => joinGame(id as string), 120);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (game) setBoardSize(game.boardSize);
  }, [game]);

  useEffect(() => {
    // check winner on any game update
    try {
      const w = game ? core.checkWinner(game) : null;
      setWinner(w ?? null);
    } catch (e) {
      setWinner(null);
    }
  }, [game]);

  // simple random bot for local games
  useEffect(() => {
    if (!isLocalGame || !botEnabled || !game) return;
    const current = game.players[game.turnIndex];
    // assume bot is 'p2'
    if (current.id !== 'p2') return;
    if (botTimer.current) window.clearTimeout(botTimer.current);
    botTimer.current = window.setTimeout(() => {
      const legal = core.getLegalMoves(game, current.id) || [];
      if (legal.length === 0) return;
      const choice = legal[Math.floor(Math.random() * legal.length)];
      // apply move
      const next = { ...game, players: game.players.map((p: any) => ({ ...p })) } as any;
      next.players[game.turnIndex].pos = { r: choice.r, c: choice.c };
      next.turnIndex = (game.turnIndex + 1) % game.players.length;
      setGame(next);
    }, 600);
    return () => { if (botTimer.current) window.clearTimeout(botTimer.current); };
  }, [game, isLocalGame, botEnabled]);

  // compute legal moves for the current turn
  const legalMoves: string[] = useMemo(() => {
    if (!game) return [];
    const player = game.players[game.turnIndex];
    const moves = core.getLegalMoves(game, player.id) || [];
    return moves.map((m: Coord) => `${m.r},${m.c}`);
  }, [game]);

  // helper: check wall candidate validity client-side for UX
  function canPlaceWallLocal(orientation: 'H' | 'V', r: number, c: number) {
    if (!game) return false;
    const wall = { id: 'tmp', orientation, r, c };
    try {
      return core.canPlaceWall(game, wall);
    } catch (e) {
      return false;
    }
  }

  async function createGame(playersCount = 2) {
    const res = await fetch(`${SERVER}/games`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ players: playersCount }) });
    const body = await res.json();
    const g = body.game as GameState;
    setGame(g);
    if (body.id) setGameId(body.id);
    if (body.id && body.slots) setClaimedSlots(body.slots);
    // basic room info: mark creator as admin, store room id and reset spectators
    setRoomInfo({ admin: playerName || 'admin', spectators: [], started: false, boardSize: g.boardSize, roomId: body.id });
  }

  function getRoomUrl(id?: string) {
    if (!id) return '';
    // build a shareable URL assuming frontend runs at window.location
    try {
      const loc = window.location.href.replace(window.location.hash, '');
      return `${loc.replace(/\/$/, '')}#room=${id}`;
    } catch (e) {
      return id;
    }
  }

  async function copyRoomLink() {
    if (!roomInfo?.roomId) return;
    const url = getRoomUrl(roomInfo.roomId);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // fallback: create temporary input
      const el = document.createElement('input');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      try { document.execCommand('copy'); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch (_) {}
      document.body.removeChild(el);
    }
  }

  function createLocalGame(players = 2, size?: number) {
    // Allow overriding board size from settings; fall back to library defaults when not provided
    const N = typeof size === 'number' ? size : (players === 2 ? core.DEFAULTS.defaultBoard2P : core.DEFAULTS.defaultBoard3P);
    const playersArr: any[] = [];
    if (players === 2) {
      const mid = Math.floor(N / 2);
      playersArr.push({ id: 'p1', pos: { r: N - 1, c: mid }, startPos: { r: N - 1, c: mid }, wallsRemaining: core.DEFAULTS.walls2P, goal: { axis: 'r', value: 0 } });
      playersArr.push({ id: 'p2', pos: { r: 0, c: mid }, startPos: { r: 0, c: mid }, wallsRemaining: core.DEFAULTS.walls2P, goal: { axis: 'r', value: N - 1 } });
    } else if (players === 3) {
      const mid = Math.floor(N / 2);
      playersArr.push({ id: 'p1', pos: { r: N - 1, c: mid }, startPos: { r: N - 1, c: mid }, wallsRemaining: core.DEFAULTS.walls3P, goal: { axis: 'r', value: 0 } });
      playersArr.push({ id: 'p2', pos: { r: 0, c: mid }, startPos: { r: 0, c: mid }, wallsRemaining: core.DEFAULTS.walls3P, goal: { axis: 'r', value: N - 1 } });
      playersArr.push({ id: 'p3', pos: { r: mid, c: 0 }, startPos: { r: mid, c: 0 }, wallsRemaining: core.DEFAULTS.walls3P, goal: { axis: 'c', value: N - 1 } });
    } else if (players === 4) {
      const mid = Math.floor(N / 2);
      playersArr.push({ id: 'p1', pos: { r: N - 1, c: mid }, startPos: { r: N - 1, c: mid }, wallsRemaining: core.DEFAULTS.walls4P, goal: { axis: 'r', value: 0 } });
      playersArr.push({ id: 'p2', pos: { r: 0, c: mid }, startPos: { r: 0, c: mid }, wallsRemaining: core.DEFAULTS.walls4P, goal: { axis: 'r', value: N - 1 } });
      playersArr.push({ id: 'p3', pos: { r: mid, c: 0 }, startPos: { r: mid, c: 0 }, wallsRemaining: core.DEFAULTS.walls4P, goal: { axis: 'c', value: N - 1 } });
      playersArr.push({ id: 'p4', pos: { r: mid, c: N - 1 }, startPos: { r: mid, c: N - 1 }, wallsRemaining: core.DEFAULTS.walls4P, goal: { axis: 'c', value: 0 } });
    }
    const g = { boardSize: N, players: playersArr, walls: [], turnIndex: 0 } as any;
    setGame(g);
    setBoardSize(N);
    setGameId(null);
    setIsLocalGame(true);
    setWinner(null);
    // clear any room info when starting local game
    setRoomInfo(null);
  }

  function restartLocal() {
    if (!game) return;
    const playersCount = game.players.length;
    createLocalGame(playersCount);
  }

  async function restartServerGame() {
    // naive create a new server game and replace local state with it
    const res = await fetch(`${SERVER}/games`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const body = await res.json();
    setGame(body.game as GameState);
    if (body.id) setGameId(body.id);
    setWinner(null);
  }

  async function joinGame(id: string) {
    const res = await fetch(`${SERVER}/games/${id}`);
    if (!res.ok) return alert('game not found');
    const body = await res.json();
    setGame(body.game as GameState);
    setGameId(id);
    if (body.slots) setClaimedSlots(body.slots);
    // add this client as a spectator by default (client-side only); server should manage this in a real app
    setRoomInfo((r) => {
      const base = r ?? { spectators: [], started: false, boardSize: body.game?.boardSize ?? defaultBoardSize } as any;
      const name = playerName || 'guest';
      if ((base.spectators || []).includes(name)) return base;
      return { ...base, spectators: [...(base.spectators || []), name] };
    });
  }

  async function doMove(r: number, c: number) {
    if (!game) return alert('No game selected');
    const player = game.players[game.turnIndex];
    // local hotseat
    if (isLocalGame) {
      try {
        const next = core.applyMove(game, player.id, { r, c });
        setGame(next);
        const w = core.checkWinner(next);
        if (w) setWinner(w);
      } catch (e: any) {
        return alert(e.message || 'illegal move');
      }
      return;
    }
    if (!gameId) return alert('No game selected');
    if (!localPlayerId) return alert('You must join a player slot before playing on the server');
    const res = await fetch(`${SERVER}/games/${gameId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: localPlayerId, to: { r, c } }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'illegal move');
    }
  }

  async function doPlaceWall(r: number, c: number, orientation: 'H' | 'V') {
    if (!game) return alert('No game selected');
    const wall = { id: Math.random().toString(36).slice(2), orientation, r, c };
    if (isLocalGame) {
      try {
        const next = core.applyPlaceWall(game, wall);
        setGame(next);
        // return to move mode after placing
        setPlacingWall(null);
        const w = core.checkWinner(next);
        if (w) setWinner(w);
      } catch (e: any) {
        return alert(e.message || 'illegal wall');
      }
      return;
    }
    if (!gameId) return alert('No game selected');
    if (!localPlayerId) return alert('You must join a player slot before playing on the server');
    const res = await fetch(`${SERVER}/games/${gameId}/place_wall`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wall, playerId: localPlayerId }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'illegal wall');
    }
    else {
      // on success, switch back to move mode
      setPlacingWall(null);
    }
  }

  const N = boardSize ?? 9;

  const anchors = useMemo(() => {
    const H: { r: number; c: number }[] = [];
    const V: { r: number; c: number }[] = [];
    for (let r = 0; r < N - 1; r++) {
      for (let c = 0; c < N - 1; c++) {
        H.push({ r, c });
        V.push({ r, c });
      }
    }
    return { H, V };
  }, [N]);

  // responsive sizes
  const boardMax = 640;
  const tileSize = `min(calc(${boardMax}px / ${N}), calc(90vw / ${N}))`;

  return (
    <div className="app-root">
      <h1 className="app-title">Quoridor</h1>

      {/* Homepage / start screen */}
      {showStart ? (
        <div className="start-screen homepage">
          <div className="home-grid">
            <div className="home-left">
              <h2 className="game-name">Quoridor</h2>
              <div className="rules">
                <h3>Rules</h3>
                <ol>
                  <li>Move your pawn to reach the opposite side of the board.</li>
                  <li>On your turn you may move or place a wall.</li>
                  <li>Walls block movement but cannot fully block a player from reaching their goal.</li>
                  <li>Use strategy to delay opponents while advancing your pawn.</li>
                </ol>
              </div>
            </div>
            <div className="home-right">
              <h3>Enter</h3>
              <label style={{ display: 'block', marginBottom: 8 }}>Your name
                <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Alice" />
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn primary" onClick={() => { setShowStart(false); /* go directly into app */ }}>Skip</button>
                <button className="btn" onClick={() => { setShowLobbyPopup(true); setLobbyView('main'); }}>Enter Game</button>
              </div>
              <div style={{ marginTop: 12 }}>
                <small className="muted">Tip: enter your name so other players see it in the lobby.</small>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Lobby popup shown after Enter Game */}
      {showLobbyPopup ? (
        <div className="overlay">
          <div className="modal">
            <h3>Lobby</h3>
            {lobbyView === 'main' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn primary" onClick={() => { createGame(2); setShowLobbyPopup(true); }}>Create Room (2P)</button>
                  <button className="btn primary" onClick={() => { createGame(3); setShowLobbyPopup(true); }}>Create Room (3P)</button>
                  <button className="btn primary" onClick={() => { createGame(4); setShowLobbyPopup(true); }}>Create Room (4P)</button>
                </div>
                {roomInfo?.roomId ? (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input readOnly value={getRoomUrl(roomInfo.roomId)} style={{ flex: 1, padding: '6px 8px' }} />
                    <button className="btn" onClick={copyRoomLink}>{copied ? 'Copied' : 'Copy'}</button>
                  </div>
                ) : null}
                <div style={{ display: 'flex', gap: 8 }}>
                  <input placeholder="Paste room id to join" id="joinRoomInput" />
                  <button className="btn" onClick={async () => {
                    const el = document.getElementById('joinRoomInput') as HTMLInputElement | null;
                    if (!el || !el.value) return alert('enter room id');
                    await joinGame(el.value);
                    setShowLobbyPopup(true);
                  }}>Join Room</button>
                </div>
                <button className="btn" onClick={() => { setLobbyView('playLocalOptions'); }}>Play Local</button>
                <div style={{ marginTop: 8 }}>
                  <button className="btn ghost" onClick={() => setShowLobbyPopup(false)}>Close</button>
                </div>
              </div>
            ) : lobbyView === 'playLocalOptions' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" onClick={() => { createLocalGame(2, defaultBoardSize); setShowLobbyPopup(false); }}>2P</button>
                  <button className="btn" onClick={() => { createLocalGame(3, defaultBoardSize); setShowLobbyPopup(false); }}>3P</button>
                  <button className="btn" onClick={() => { createLocalGame(4, defaultBoardSize); setShowLobbyPopup(false); }}>4P</button>
                </div>
                <div>
                  <button className="btn ghost" onClick={() => setLobbyView('main')}>Back</button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="hud">
        <div><strong>Server:</strong> {SERVER}</div>
        <div><strong>Socket:</strong> <span style={{ color: connected ? 'green' : 'red' }}>{connected ? 'connected' : 'disconnected'}</span></div>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn ghost" onClick={() => setShowStart(true)}>Menu</button>
          <button className="btn ghost" onClick={() => setSettingsOpen(true)}>Settings</button>
          <button className="btn ghost" onClick={() => { if (isLocalGame) restartLocal(); else restartServerGame(); }}>Restart</button>
        </div>
      </div>

      {/* Settings modal when opened from HUD while in-app */}
      {settingsOpen && !showStart ? (
        <div className="overlay">
          <div className="modal">
            <h3>Settings</h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
              <label style={{ display: 'flex', flexDirection: 'column' }}>Board size
                <input type="number" min={5} max={15} value={defaultBoardSize} onChange={(e) => setDefaultBoardSize(Math.max(5, Math.min(15, Number(e.target.value) || 9)))} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column' }}>Players
                <select value={defaultPlayers} onChange={(e) => setDefaultPlayers(Number(e.target.value))}>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </label>
            </div>
            <div className="actions" style={{ marginTop: 16 }}>
              <button className="btn ghost" onClick={() => setSettingsOpen(false)}>Close</button>
              <button className="btn primary" onClick={() => { setSettingsOpen(false); }}>Save</button>
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => createGame(2)}>Create Game (2P)</button>
            <button onClick={() => createGame(3)}>Create Game (3P)</button>
            <button onClick={() => createGame(4)}>Create Game (4P)</button>
          </div>
          <input placeholder="Game ID (join)" onKeyDown={(e) => { if (e.key === 'Enter') joinGame((e.target as HTMLInputElement).value); }} />
          {/* anchors are always visible — walls can be placed at any time */}
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={showValidAnchors} onChange={(e) => setShowValidAnchors(e.target.checked)} />
            <span style={{ fontSize: 13 }}>Show valid wall moves</span>
          </label>
          <button onClick={() => createLocalGame(2)}>Create Local Game</button>
          <button onClick={() => createLocalGame(3)}>Create Local Game (3P)</button>
          <button onClick={() => createLocalGame(4)}>Create Local Game (4P)</button>
          <button onClick={() => { createLocalGame(2); setBotEnabled(true); setIsLocalGame(true); }}>Play vs Bot</button>
        </div>
        <div style={{ minWidth: 220 }}>
          <div style={{ fontSize: 14 }}><strong>Game ID:</strong> {gameId ?? 'none'}</div>
        </div>
      </div>

      <div className="board-wrap">
        <div className={`board ${showValidAnchors ? '' : 'hide-non-hover'}`} style={{ 
          width: 'var(--board-size)',
          height: 'var(--board-size)',
          maxWidth: boardMax, maxHeight: boardMax,
          ['--board-size' as any]: 'min(640px, 90vw)',
          // compute tile so N * tile + (N-1)*gap + 2*pad = board-size
          ['--tile' as any]: `calc((var(--board-size) - (${N - 1} * var(--gap, 6px)) - (var(--pad, 6px) * 2)) / ${N})`,
          ['--wall-thickness' as any]: '8px', ['--wall-offset' as any]: '8px', ['--gap' as any]: '6px', ['--pad' as any]: '6px', ['--anchor-gap' as any]: '12px', ['--anchor-gap-x' as any]: '12px', ['--anchor-gap-y' as any]: '12px', ['--step' as any]: 'calc(var(--tile) + var(--gap))'
        }}>
          {/* grid */}
          <div className="grid" style={{ gridTemplateColumns: `repeat(${N}, var(--tile))`, gridTemplateRows: `repeat(${N}, var(--tile))` }}>
            {Array.from({ length: N }).map((_, r) =>
              Array.from({ length: N }).map((__, c) => {
                const pawn = game?.players.find((p: any) => p.pos.r === r && p.pos.c === c);
                const key = `${r},${c}`;
                const isLegal = legalMoves.includes(key);
                return (
                  <div
                    key={key}
                    onClick={() => { if (placingWall) {} else doMove(r, c); }}
                    className={`cell ${isLegal ? 'legal' : ''}`}
                  >
                        {pawn ? (
                          <div className={`pawn ${pawn.id}`}>{pawn.id}</div>
                        ) : null}
                  </div>
                );
              })
            )}
          </div>

          {/* render horizontal wall anchors and existing walls */}
          {/* render clickable horizontal anchors when in H-placement mode */}
          {anchors.H.map((a) => {
            const valid = canPlaceWallLocal('H', a.r, a.c);
            // place horizontal anchor centered in the gap between row r and r+1
            const containerStyle: any = { 
              position: 'absolute',
              top: `calc(var(--step) * ${a.r} + var(--tile) + calc(var(--gap) / 2) - calc(var(--wall-thickness) / 2))`,
              left: `calc(var(--step) * ${a.c})`,
              width: `calc(var(--tile) * 2 + var(--gap))`,
              height: 'var(--wall-thickness)'
            };
            const visibleStyle: any = { width: '100%', height: '100%' };
            if (!valid) return null; // hide invalid anchors
            return (
              <div key={`anchor-h-${a.r}-${a.c}`} className="anchor-container" style={containerStyle}>
                <div className={`anchor anchor-h valid`} style={visibleStyle} />
                <div className={`anchor-hit anchor-h`} role="button" aria-label={`Place horizontal wall at ${a.r},${a.c}`} onClick={() => { if (valid) doPlaceWall(a.r, a.c, 'H'); }} style={{ position: 'absolute' }} />
              </div>
            );
          })}

          {/* render placed horizontal walls */}
          {game?.walls.filter((w: any) => w.orientation === 'H').map((w: any) => (
            // placed horizontal wall centered in the gap
            <div key={`wall-h-${w.r}-${w.c}`} className="wall-h" style={{ position: 'absolute', top: `calc(var(--step) * ${w.r} + var(--tile) + calc(var(--gap) / 2) - calc(var(--wall-thickness) / 2))`, left: `calc(var(--step) * ${w.c})`, width: `calc(var(--tile) * 2 + var(--gap))`, height: 'var(--wall-thickness)', background: '#333', borderRadius: 6 }} />
          ))}

          {/* render vertical wall anchors */}
          {/* render clickable vertical anchors when in V-placement mode */}
          {anchors.V.map((a) => {
            const valid = canPlaceWallLocal('V', a.r, a.c);
            // place vertical anchor centered in the gap between col c and c+1
            const containerStyle: any = { 
              position: 'absolute',
              top: `calc(var(--step) * ${a.r})`,
              left: `calc(var(--step) * ${a.c} + var(--tile) + calc(var(--gap) / 2) - calc(var(--wall-thickness) / 2))`,
              width: 'var(--wall-thickness)',
              height: `calc(var(--tile) * 2 + var(--gap))`
            };
            const visibleStyle: any = { width: '100%', height: '100%' };
            if (!valid) return null; // hide invalid anchors
            return (
              <div key={`anchor-v-${a.r}-${a.c}`} className="anchor-container" style={containerStyle}>
                <div className={`anchor anchor-v valid`} style={visibleStyle} />
                <div className={`anchor-hit anchor-v`} role="button" aria-label={`Place vertical wall at ${a.r},${a.c}`} onClick={() => { if (valid) doPlaceWall(a.r, a.c, 'V'); }} style={{ position: 'absolute' }} />
              </div>
            );
          })}

          {/* render placed vertical walls */}
          {game?.walls.filter((w: any) => w.orientation === 'V').map((w: any) => (
            // placed vertical wall centered in the gap
            <div key={`wall-v-${w.r}-${w.c}`} className="wall-v" style={{ position: 'absolute', top: `calc(var(--step) * ${w.r})`, left: `calc(var(--step) * ${w.c} + var(--tile) + calc(var(--gap) / 2) - calc(var(--wall-thickness) / 2))`, width: 'var(--wall-thickness)', height: `calc(var(--tile) * 2 + var(--gap))`, background: '#333', borderRadius: 6 }} />
          ))}
        </div>

        <div className="sidebar">
          <h3 style={{ marginTop: 0 }}>Game</h3>
          <div style={{ marginBottom: 8 }}><strong>Game ID:</strong> {gameId ?? 'none'}</div>
          <div style={{ marginBottom: 8 }}><strong>Turn:</strong> {game ? game.players[game.turnIndex].id : '-'}</div>
          <div style={{ marginBottom: 8 }}>
            <strong>Players:</strong>
            <div className="legend" style={{ marginTop: 6 }}>
              {game?.players.map((p: any) => (
                <div className="item" key={`legend-${p.id}`}>
                  <div className="swatch" style={{ background: p.id === 'p1' ? '#ff8a65' : p.id === 'p2' ? '#64b5f6' : p.id === 'p3' ? '#81c784' : '#ba68c8' }} />
                  <div style={{ fontSize: 13 }}>{p.id} — walls: {p.wallsRemaining ?? '-'} — pos: {p.pos.r},{p.pos.c}</div>
                  {gameId ? (
                    <div style={{ marginLeft: 8 }}>
                      {roomInfo?.started ? (
                        // game started -> spectators cannot join
                        claimedSlots.includes(p.id) ? (
                          <small style={{ color: '#666' }}>joined</small>
                        ) : (
                          <small style={{ color: '#aa0000' }}>spectator</small>
                        )
                      ) : (
                        // before start, allow joining slots (claim a side) or show joined
                        claimedSlots.includes(p.id) ? (
                          <small style={{ color: '#666' }}>joined</small>
                        ) : (
                          <button onClick={async () => {
                            // optimistic local claim so UI shows Join immediately
                            setClaimedSlots((s) => Array.from(new Set([...(s || []), p.id])));
                            setLocalPlayerId(p.id);
                            // remove from spectators list client-side (they took a side)
                            setRoomInfo((r) => {
                              if (!r) return r;
                              const name = playerName || 'guest';
                              return { ...r, spectators: (r.spectators || []).filter((s) => s !== name) };
                            });
                            // emit socket event if connected
                            try {
                              if (socketRef.current && socketRef.current.connected) {
                                socketRef.current.emit('join_slot', { gameId, slot: p.id, name: playerName });
                              }
                            } catch (e) {
                              // ignore
                            }
                            // best-effort POST in case server provides a REST join endpoint
                            try {
                              const res = await fetch(`${SERVER}/games/${gameId}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slot: p.id, name: playerName }) });
                              if (res.ok) {
                                const body = await res.json();
                                if (body.slots) setClaimedSlots(body.slots);
                              }
                            } catch (e) {
                              // network error, ignore; optimistic UI already updated
                            }
                          }}>Join</button>
                        )
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          {/* Room admin controls */}
          {roomInfo ? (
            <div style={{ marginTop: 12 }}>
              <h4>Room</h4>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                <div>Admin: {roomInfo.admin}</div>
                <div style={{ fontSize: 12, color: '#666' }}>{roomInfo.roomId ? `id: ${roomInfo.roomId}` : ''}</div>
              </div>
              <div style={{ marginTop: 6 }}>Spectators: {roomInfo.spectators.length}</div>
              {roomInfo.roomId ? (
                <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input readOnly value={getRoomUrl(roomInfo.roomId)} style={{ flex: 1, padding: '6px 8px' }} />
                  <button className="btn" onClick={copyRoomLink}>{copied ? 'Copied' : 'Copy'}</button>
                </div>
              ) : null}
              <div style={{ marginTop: 8 }}>
                {roomInfo.admin === (playerName || 'admin') ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn primary" onClick={() => {
                      // start game: set room started and optionally set state that server would otherwise do
                      setRoomInfo({ ...roomInfo, started: true });
                      // mark that after starting, no new side joins allowed; server should enforce in real app
                    }}>Start Game</button>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      Board size:
                      <input type="number" value={roomInfo.boardSize || boardSize || 9} min={5} max={15} onChange={(e) => setRoomInfo({ ...roomInfo, boardSize: Number(e.target.value) })} style={{ width: 72 }} />
                    </label>
                  </div>
                ) : (
                  <div><small>Waiting for admin to start the game...</small></div>
                )}
              </div>
            </div>
          ) : null}
          <h4>Raw state</h4>
          <pre className="state-pre">{JSON.stringify(game, null, 2)}</pre>
        </div>
      </div>

      {winner ? (
        <div className="overlay">
          <div className="modal">
            <h2>Winner: {winner}</h2>
            <p>The game has been won. You can restart the local game or create a new server game.</p>
            <div className="actions">
              <button className="btn ghost" onClick={() => { setWinner(null); }}>Close</button>
              <button className="btn primary" onClick={() => { if (isLocalGame) restartLocal(); else restartServerGame(); }}>Restart</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

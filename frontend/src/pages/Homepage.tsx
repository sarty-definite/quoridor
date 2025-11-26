import React from 'react';

type Props = {
  playerName: string;
  setPlayerName: (v: string) => void;
  onSkip: () => void;
  onQuickLocal?: (players: number) => void;
  onQuickServer?: (players: number) => void;
  onEnter: () => void;
};
export default function Homepage({ playerName, setPlayerName, onSkip, onEnter, onQuickLocal, onQuickServer }: Props) {
  return (
    <div className="start-screen homepage">
      <div className="start-card home-grid">
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
            <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Alice" style={{ display: 'block', width: '100%', marginTop: 6, padding: 8 }} />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn primary" onClick={onEnter}>Enter Game</button>
            <button className="btn ghost" onClick={onSkip}>Skip</button>
          </div>

          <div style={{ marginTop: 12 }}>
            <h4 style={{ margin: '10px 0' }}>Quick actions</h4>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => { if (onQuickLocal) onQuickLocal(2); }}>Quick 2P Local</button>
              <button className="btn" onClick={() => { if (onQuickLocal) onQuickLocal(4); }}>Quick 4P Local</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn" onClick={() => { if (onQuickServer) onQuickServer(2); }}>Quick 2P Room</button>
              <button className="btn" onClick={() => { if (onQuickServer) onQuickServer(4); }}>Quick 4P Room</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


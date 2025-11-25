import React from 'react';

type Props = {
  playerName: string;
  setPlayerName: (v: string) => void;
  onSkip: () => void;
  onEnter: () => void;
};

export default function Homepage({ playerName, setPlayerName, onSkip, onEnter }: Props) {
  return (
    <div className="start-screen homepage-page" style={{
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg,#1f2937 0%, #111827 60%)',
      color: '#fff',
      padding: 24,
      borderRadius: 8
    }}>
      <div className="home-grid" style={{ display: 'flex', gap: 24, maxWidth: 980, width: '100%' }}>
        <div className="home-left" style={{ flex: 1 }}>
          <h2 className="game-name" style={{ margin: 0 }}>Quoridor</h2>
          <div className="rules" style={{ marginTop: 12, color: '#d1d5db' }}>
            <h3 style={{ marginTop: 0 }}>Rules</h3>
            <ol>
              <li>Move your pawn to reach the opposite side of the board.</li>
              <li>On your turn you may move or place a wall.</li>
              <li>Walls block movement but cannot fully block a player from reaching their goal.</li>
              <li>Use strategy to delay opponents while advancing your pawn.</li>
            </ol>
          </div>
        </div>
        <div className="home-right" style={{ width: 320, background: 'rgba(255,255,255,0.04)', padding: 16, borderRadius: 6 }}>
          <h3 style={{ marginTop: 0 }}>Enter</h3>
          <label style={{ display: 'block', marginBottom: 8 }}>Your name
            <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Alice" style={{ display: 'block', width: '100%', marginTop: 6, padding: 8 }} />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={onEnter}>Enter Game</button>
          </div>
        </div>
      </div>
    </div>
  );
}

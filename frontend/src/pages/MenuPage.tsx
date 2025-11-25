import React from 'react';

type Props = {
  onCreateRoom: (players: number) => void;
  onPlayLocal: (players: number) => void;
  onBack?: () => void;
};

export default function MenuPage({ onCreateRoom, onPlayLocal, onBack }: Props) {
  return (
    <div style={{ padding: 16 }}>
      <h2>Menu</h2>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button className="btn primary" onClick={() => onCreateRoom(2)}>Create Room (2P)</button>
        <button className="btn primary" onClick={() => onCreateRoom(3)}>Create Room (3P)</button>
        <button className="btn primary" onClick={() => onCreateRoom(4)}>Create Room (4P)</button>
      </div>
      <div style={{ marginTop: 12 }}>
        <h4>Local Play</h4>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => onPlayLocal(2)}>2P</button>
          <button className="btn" onClick={() => onPlayLocal(3)}>3P</button>
          <button className="btn" onClick={() => onPlayLocal(4)}>4P</button>
        </div>
      </div>
      {onBack ? <div style={{ marginTop: 12 }}><button className="btn ghost" onClick={onBack}>Back</button></div> : null}
    </div>
  );
}

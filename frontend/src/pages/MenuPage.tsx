import React from 'react';

type Props = {
  onCreateRoom: (players: number) => void;
  onPlayLocal: (players: number) => void;
  onBack?: () => void;
  onChangeBoardSize?: (size: number) => void;
};

export default function MenuPage({ onCreateRoom, onPlayLocal, onBack, onChangeBoardSize }: Props) {
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
      <div style={{ marginTop: 12 }}>
        <h4>Change board size</h4>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input id="menu-board-size" type="number" min={5} max={25} defaultValue={9} style={{ width: 84, padding: '6px 8px' }} />
          <button className="btn" onClick={() => {
            const el = document.getElementById('menu-board-size') as HTMLInputElement | null;
            if (!el || !el.value) return alert('enter board size');
            const v = Number(el.value);
            if (!v || v < 5 || v > 25) return alert('board size must be between 5 and 25');
            if (typeof (onChangeBoardSize) === 'function') onChangeBoardSize(v);
          }}>Set Size</button>
        </div>
      </div>
      {onBack ? <div style={{ marginTop: 12 }}><button className="btn ghost" onClick={onBack}>Back</button></div> : null}
    </div>
  );
}

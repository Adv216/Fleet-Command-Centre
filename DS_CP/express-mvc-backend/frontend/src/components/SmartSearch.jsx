import { useEffect, useRef, useState } from 'react';

export default function SmartSearch({ vehicles, onSelect, onClose }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.trim().toLowerCase();
    const found = [];
    for (const [id, v] of vehicles.entries()) {
      if (String(id).toLowerCase().includes(q)) {
        found.push(v);
        if (found.length >= 8) break;
      }
    }
    // Also search by city
    if (found.length < 8) {
      for (const [id, v] of vehicles.entries()) {
        if (v.city && v.city.toLowerCase().includes(q) && !found.find(f => f.vehicleId === id)) {
          found.push(v);
          if (found.length >= 8) break;
        }
      }
    }
    setResults(found);
  }, [query, vehicles]);

  function speedColor(s) {
    if (s >= 80) return '#ef4444';
    if (s >= 50) return '#f59e0b';
    return '#10b981';
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '80px 16px 16px',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxWidth: '520px' }}>
        {/* Search box */}
        <div style={{ position: 'relative', marginBottom: '8px' }}>
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem' }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && onClose()}
            placeholder="Search by vehicle ID or city name…"
            style={{
              width: '100%', padding: '14px 14px 14px 44px',
              borderRadius: '12px', border: '2px solid var(--accent)',
              background: 'var(--surface)', color: 'var(--text)',
              fontSize: '1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          <button onClick={onClose} style={{
            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: '6px', color: 'var(--muted)', cursor: 'pointer',
            padding: '2px 8px', fontSize: '0.75rem',
          }}>ESC</button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '12px', overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            {results.map((v, i) => {
              const speed = Number(v.speed || v.speedKmph || 0);
              return (
                <div key={v.vehicleId}
                  onClick={() => { onSelect(v.vehicleId); onClose(); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 16px', cursor: 'pointer',
                    borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: speedColor(speed), flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{v.vehicleId}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                      {v.city && `📍 ${v.city} · `}{speed.toFixed(0)} km/h
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Click to select →</span>
                </div>
              );
            })}
          </div>
        )}

        {query.trim() && results.length === 0 && (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '20px', textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>🔍</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>No vehicles found for "{query}"</div>
          </div>
        )}

        {!query.trim() && (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>QUICK TIPS</div>
            {['Type "V45" to find vehicle V45', 'Type "Mumbai" to see all Mumbai vehicles', 'Press ESC to close'].map(tip => (
              <div key={tip} style={{ fontSize: '0.8rem', color: 'var(--muted)', padding: '4px 0' }}>💡 {tip}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
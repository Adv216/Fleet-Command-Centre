import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const CITY_COLORS = ['#38bdf8','#34d399','#a78bfa','#fbbf24','#f87171','#60a5fa','#fb923c','#e879f9','#4ade80','#f472b6','#94a3b8','#facc15'];

export default function CityStatsPanel({ wsUrl, onCityFilter }) {
  const [cities, setCities]         = useState([]);
  const [selected, setSelected]     = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(wsUrl, { transports: ['websocket'], reconnection: true });
    socketRef.current = socket;
    socket.on('city:stats', ({ cities: c }) => setCities(c || []));
    return () => socket.disconnect();
  }, [wsUrl]);

  function handleClick(city) {
    const next = selected === city ? null : city;
    setSelected(next);
    onCityFilter?.(next);
  }

  const maxCount = cities.length > 0 ? cities[0].count : 1;

  return (
    <div className="panel city-panel">
      <div className="panel-header">
        <h3 style={{ margin:0 }}>🗺 City Fleet Stats</h3>
        <span className="panel-badge">HashMap · {cities.length} cities</span>
      </div>
      <div style={{ fontSize:'0.68rem', color:'var(--muted)', fontFamily:'var(--font-mono)', marginBottom:'8px' }}>
        Click a city to filter map · click again to clear
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:'5px', maxHeight:'300px', overflowY:'auto' }}>
        {cities.map((c, i) => {
          const color = CITY_COLORS[i % CITY_COLORS.length];
          const pct   = Math.round((c.count / maxCount) * 100);
          const isSel = selected === c.city;
          return (
            <div
              key={c.city}
              onClick={() => handleClick(c.city)}
              style={{
                padding:'8px 10px', borderRadius:'8px', cursor:'pointer',
                background: isSel ? `${color}18` : 'var(--surface-2)',
                border: `1px solid ${isSel ? color : 'var(--border)'}`,
                transition:'all 0.15s',
              }}
            >
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'5px' }}>
                <span style={{ fontWeight:700, fontSize:'0.85rem', color: isSel ? color : 'var(--fg)' }}>{c.city}</span>
                <span style={{ fontSize:'0.72rem', fontFamily:'var(--font-mono)', color:'var(--muted)' }}>
                  {c.avgSpeed} km/h avg · {c.count} v
                </span>
              </div>
              <div style={{ height:'4px', background:'var(--border)', borderRadius:'999px', overflow:'hidden' }}>
                <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:'inherit', transition:'width 0.4s' }} />
              </div>
              <div style={{ display:'flex', gap:'10px', marginTop:'4px', fontSize:'0.68rem', fontFamily:'var(--font-mono)', color:'var(--muted)' }}>
                <span>🟢 {c.moving} moving</span>
                <span>⚪ {c.idle} idle</span>
                <span>⚡ max {c.maxSpeed} km/h</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
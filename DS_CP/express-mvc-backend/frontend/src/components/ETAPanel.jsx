import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const S = {
  delayed:  { bg:'rgba(239,68,68,0.1)',  border:'rgba(239,68,68,0.3)',  text:'#f87171' },
  'on-time':{ bg:'rgba(16,185,129,0.1)', border:'rgba(16,185,129,0.3)', text:'#34d399' },
  early:    { bg:'rgba(14,165,233,0.1)', border:'rgba(14,165,233,0.3)', text:'#38bdf8' },
};

export default function ETAPanel({ wsUrl }) {
  const [list, setList]             = useState([]);
  const [delayed, setDelayed]       = useState(0);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(wsUrl, { transports:['websocket'], reconnection:true });
    socketRef.current = socket;
    socket.on('eta:update', ({ summary, delayedCount }) => {
      setList(summary || []);
      setDelayed(delayedCount || 0);
    });
    return () => socket.disconnect();
  }, [wsUrl]);

  return (
    <div className="panel eta-panel">
      <div className="panel-header">
        <h3 style={{ margin:0 }}>⏱ ETA Monitor</h3>
        <span className="panel-badge" style={delayed>0?{background:'rgba(239,68,68,0.15)',color:'#f87171',borderColor:'rgba(239,68,68,0.3)'}:{}}>
          {delayed} delayed
        </span>
      </div>
      <div style={{ fontSize:'0.68rem', color:'var(--muted)', fontFamily:'var(--font-mono)', marginBottom:'8px' }}>
        Segment Tree · avg-speed tracking · delay detection
      </div>
      {list.length === 0
        ? <p style={{ color:'var(--muted)', fontSize:'0.78rem', fontFamily:'var(--font-mono)', textAlign:'center', padding:'10px 0' }}>Waiting for ETA data…</p>
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:'6px', maxHeight:'260px', overflowY:'auto' }}>
            {list.map(r => {
              const st = S[r.status] || S['on-time'];
              return (
                <div key={r.vehicleId} style={{ background:st.bg, border:`1px solid ${st.border}`, borderRadius:'8px', padding:'8px 10px', display:'flex', flexDirection:'column', gap:'3px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontWeight:700, fontSize:'0.82rem' }}>{r.vehicleId}</span>
                    <span style={{ fontSize:'0.68rem', fontFamily:'var(--font-mono)', color:st.text, fontWeight:700, textTransform:'uppercase' }}>{r.status}</span>
                  </div>
                  <div style={{ fontSize:'0.72rem', color:'var(--muted)', fontFamily:'var(--font-mono)' }}>📍 {r.destination}</div>
                  <div style={{ display:'flex', gap:'10px', fontSize:'0.7rem', fontFamily:'var(--font-mono)', color:'var(--muted)' }}>
                    <span>🕐 {r.etaFmt}</span>
                    <span>📏 {r.distanceKm ?? '—'} km</span>
                    {r.delayMinutes > 0 && <span style={{ color:'#f87171' }}>+{r.delayMinutes}m late</span>}
                    {r.delayMinutes < 0 && <span style={{ color:'#34d399' }}>{r.delayMinutes}m early</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}
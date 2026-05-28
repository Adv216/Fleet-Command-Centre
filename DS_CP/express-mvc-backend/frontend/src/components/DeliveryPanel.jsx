import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const PRIORITY_COLOR = {
  urgent: { bg:'rgba(239,68,68,0.12)',  text:'#f87171',  border:'rgba(239,68,68,0.3)'  },
  high:   { bg:'rgba(245,158,11,0.12)', text:'#fbbf24',  border:'rgba(245,158,11,0.3)' },
  normal: { bg:'rgba(59,130,246,0.12)', text:'#60a5fa',  border:'rgba(59,130,246,0.3)' },
  low:    { bg:'rgba(100,116,139,0.1)', text:'#94a3b8',  border:'rgba(100,116,139,0.3)'},
};

function ProgressBar({ pct, status }) {
  const col = status === 'delayed' ? '#ef4444' : status === 'delivered' ? '#10b981' : '#3b82f6';
  return (
    <div style={{ height:'5px', background:'var(--border)', borderRadius:'999px', overflow:'hidden', marginTop:'5px' }}>
      <div style={{ width:`${pct}%`, height:'100%', background:col, borderRadius:'inherit', transition:'width 0.5s ease' }}/>
    </div>
  );
}

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

export default function DeliveryPanel({ wsUrl }) {
  const [data,  setData]  = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(wsUrl, { transports:['websocket'], reconnection:true });
    socketRef.current = socket;
    socket.on('delivery:update', d => setData(d));
    return () => socket.disconnect();
  }, [wsUrl]);

  async function handleExport() {
    const res  = await fetch(`${API}/vehicles/deliveries/export`);
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'fleet-deliveries.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="panel delivery-panel">
      <div className="panel-header">
        <h3 style={{ margin:0 }}>📦 Live Deliveries</h3>
        <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
          <span className="panel-badge">{data?.total || 0} active</span>
          <button onClick={handleExport} style={{
            padding:'3px 10px', borderRadius:'6px', fontSize:'0.72rem', fontWeight:700,
            background:'rgba(16,185,129,0.15)', color:'#34d399',
            border:'1px solid rgba(52,211,153,0.3)', cursor:'pointer',
          }}>⬇ CSV</button>
        </div>
      </div>

      {/* Summary row */}
      {data && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px', marginBottom:'10px' }}>
          {[
            { label:'In Transit', val:data.inTransit, col:'#60a5fa' },
            { label:'Delivered',  val:data.delivered, col:'#34d399' },
            { label:'Delayed',    val:data.delayed,   col:'#f87171' },
            { label:'Urgent',     val:data.urgent,    col:'#fbbf24' },
          ].map(s => (
            <div key={s.label} style={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'8px', padding:'8px', textAlign:'center' }}>
              <div style={{ fontSize:'1.1rem', fontWeight:700, color:s.col, fontFamily:'var(--font-display)' }}>{s.val}</div>
              <div style={{ fontSize:'0.65rem', color:'var(--muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Completion bar */}
      {data && (
        <div style={{ marginBottom:'10px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.72rem', color:'var(--muted)', marginBottom:'4px', fontFamily:'var(--font-mono)' }}>
            <span>Overall Completion</span>
            <span style={{ fontWeight:700, color:'#34d399' }}>{data.completionPct}%</span>
          </div>
          <div style={{ height:'6px', background:'var(--border)', borderRadius:'999px', overflow:'hidden' }}>
            <div style={{ width:`${data.completionPct}%`, height:'100%', background:'linear-gradient(90deg,#3b82f6,#10b981)', borderRadius:'inherit', transition:'width 0.5s' }}/>
          </div>
        </div>
      )}

      {/* Delivery list */}
      <div style={{ display:'flex', flexDirection:'column', gap:'6px', maxHeight:'280px', overflowY:'auto' }}>
        {!data?.recent?.length ? (
          <p style={{ color:'var(--muted)', fontSize:'0.78rem', textAlign:'center', padding:'10px 0', fontFamily:'var(--font-mono)' }}>
            Loading deliveries…
          </p>
        ) : data.recent.map(d => {
          const pc = PRIORITY_COLOR[d.priority] || PRIORITY_COLOR.normal;
          return (
            <div key={d.deliveryId} style={{
              background:pc.bg, border:`1px solid ${pc.border}`,
              borderRadius:'8px', padding:'9px 11px',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                <span style={{ fontWeight:700, fontSize:'0.82rem' }}>{d.vehicleId}</span>
                <span style={{ fontSize:'0.65rem', padding:'1px 7px', borderRadius:'999px', background:pc.bg, color:pc.text, fontWeight:700, textTransform:'uppercase', border:`1px solid ${pc.border}` }}>{d.priority}</span>
                <span style={{ marginLeft:'auto', fontSize:'0.72rem', fontFamily:'var(--font-mono)', color:'var(--muted)' }}>{d.deliveryId}</span>
              </div>
              <div style={{ fontSize:'0.75rem', color:'var(--muted)' }}>
                📦 {d.item} · {d.weight}kg · {d.from} → {d.to}
              </div>
              <ProgressBar pct={d.progress} status={d.status} />
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:'4px', fontSize:'0.68rem', fontFamily:'var(--font-mono)', color:'var(--muted)' }}>
                <span>{d.progress}% complete</span>
                <span style={{ color: d.status==='delayed'?'#f87171':d.status==='delivered'?'#34d399':'var(--muted)', fontWeight:600 }}>{d.status}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
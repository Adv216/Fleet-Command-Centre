import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const TC = { medical:{bg:'rgba(239,68,68,0.12)',text:'#f87171'}, express:{bg:'rgba(245,158,11,0.12)',text:'#fbbf24'}, perishable:{bg:'rgba(16,185,129,0.12)',text:'#34d399'}, fragile:{bg:'rgba(139,92,246,0.12)',text:'#a78bfa'}, standard:{bg:'rgba(100,116,139,0.1)',text:'#94a3b8'} };

function Bar({ score, max = 100 }) {
  const pct = Math.min(100, (score / (max||1)) * 100);
  const col = score > 70 ? '#ef4444' : score > 40 ? '#f59e0b' : '#10b981';
  return (
    <div style={{ height:'4px', background:'var(--border)', borderRadius:'999px', overflow:'hidden', flex:1 }}>
      <div style={{ width:`${pct}%`, height:'100%', background:col, borderRadius:'inherit', transition:'width 0.3s' }} />
    </div>
  );
}

export default function PriorityPanel({ wsUrl }) {
  const [top, setTop]     = useState([]);
  const [stats, setStats] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(wsUrl, { transports:['websocket'], reconnection:true });
    socketRef.current = socket;
    socket.on('priority:update', ({ topUrgent, stats: s }) => { setTop(topUrgent||[]); setStats(s||null); });
    return () => socket.disconnect();
  }, [wsUrl]);

  const maxScore = top.length > 0 ? top[0].urgency : 100;

  return (
    <div className="panel priority-panel">
      <div className="panel-header">
        <h3 style={{ margin:0 }}>🚨 Priority Dispatch</h3>
        <span className="panel-badge">MaxHeap · {stats?.queueSize||0} queued</span>
      </div>
      <div style={{ fontSize:'0.68rem', color:'var(--muted)', fontFamily:'var(--font-mono)', marginBottom:'8px' }}>
        urgency = speed × delay × shipment-type multiplier
      </div>
      {stats && (
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'10px' }}>
          {[{l:'Medical',v:stats.medical,c:'#f87171'},{l:'Express',v:stats.express,c:'#fbbf24'},{l:'Delayed',v:stats.delayed,c:'#ef4444'}].map(s=>(
            <div key={s.l} style={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'6px', padding:'4px 10px', fontSize:'0.72rem', fontFamily:'var(--font-mono)' }}>
              <span style={{ color:s.c, fontWeight:700 }}>{s.v}</span>
              <span style={{ color:'var(--muted)', marginLeft:'4px' }}>{s.l}</span>
            </div>
          ))}
        </div>
      )}
      {top.length === 0
        ? <p style={{ color:'var(--muted)', fontSize:'0.78rem', fontFamily:'var(--font-mono)', textAlign:'center', padding:'10px 0' }}>Building queue…</p>
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:'5px', maxHeight:'260px', overflowY:'auto' }}>
            {top.map((item, i) => {
              const tc = TC[item.type] || TC.standard;
              return (
                <div key={item.vehicleId} style={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'8px', padding:'8px 10px', display:'flex', flexDirection:'column', gap:'5px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <span style={{ fontSize:'0.68rem', fontFamily:'var(--font-mono)', color:'var(--muted)', width:'16px' }}>#{i+1}</span>
                    <span style={{ fontWeight:700, fontSize:'0.82rem', flex:1 }}>{item.vehicleId}</span>
                    <span style={{ fontSize:'0.65rem', padding:'1px 7px', borderRadius:'999px', background:tc.bg, color:tc.text, fontFamily:'var(--font-mono)', fontWeight:600, textTransform:'uppercase' }}>{item.type}</span>
                    <span style={{ fontSize:'0.75rem', fontFamily:'var(--font-mono)', fontWeight:700, color: item.urgency>70?'#ef4444':item.urgency>40?'#fbbf24':'#34d399' }}>{item.urgency}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}><Bar score={item.urgency} max={maxScore} /></div>
                  <div style={{ display:'flex', gap:'10px', fontSize:'0.68rem', fontFamily:'var(--font-mono)', color:'var(--muted)' }}>
                    <span>{item.shipmentId}</span><span>{item.speed} km/h</span>
                    {item.delayMin > 0 && <span style={{ color:'#f87171' }}>+{item.delayMin}m</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

function Spark({ data = [], color = '#3b82f6' }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d'); const w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);
    const v = data.filter(x => x > 0); if (v.length < 2) return;
    const mn = Math.min(...v), mx = Math.max(...v) || 1;
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    data.forEach((val, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((val - mn) / (mx - mn + 0.0001)) * (h - 2) - 1;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [data, color]);
  return <canvas ref={ref} width={110} height={26} style={{ display:'block' }} />;
}

function Row({ label, data, avg, p95, unit='ms', color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'7px 0', borderBottom:'1px solid var(--border)' }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:'0.75rem', fontWeight:600, marginBottom:'2px' }}>{label}</div>
        <div style={{ display:'flex', gap:'10px', fontSize:'0.65rem', fontFamily:'var(--font-mono)', color:'var(--muted)' }}>
          <span>avg <span style={{ color:'var(--fg)' }}>{avg}{unit}</span></span>
          <span>p95 <span style={{ color }}>{p95}{unit}</span></span>
        </div>
      </div>
      <Spark data={data} color={color} />
    </div>
  );
}

export default function PerfPanel({ wsUrl }) {
  const [snap, setSnap] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(wsUrl, { transports:['websocket'], reconnection:true });
    socketRef.current = socket;
    socket.on('perf:update', s => setSnap(s));
    return () => socket.disconnect();
  }, [wsUrl]);

  if (!snap) return (
    <div className="panel perf-panel">
      <h3>📊 Performance Analyzer</h3>
      <p style={{ color:'var(--muted)', fontSize:'0.78rem', fontFamily:'var(--font-mono)', textAlign:'center', padding:'10px 0' }}>Collecting…</p>
    </div>
  );

  const h = snap.history || {};
  return (
    <div className="panel perf-panel">
      <div className="panel-header">
        <h3 style={{ margin:0 }}>📊 Performance Analyzer</h3>
        <span className="panel-badge">{snap.throughput} v/s</span>
      </div>
      <div style={{ fontSize:'0.68rem', color:'var(--muted)', fontFamily:'var(--font-mono)', marginBottom:'8px' }}>
        Live latency · last 60 samples · p95 worst-case
      </div>
      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'10px' }}>
        {[{l:'Mem',v:`${snap.memMB} MB`,c:'#a78bfa'},{l:'R-Tree ins',v:`${snap.rtreeInsert?.avg}ms`,c:'#3b82f6'},{l:'Heap',v:`${snap.heapOp?.avg}ms`,c:'#f59e0b'},{l:'SegTree',v:`${snap.segTreeUpdate?.avg}ms`,c:'#10b981'}].map(b=>(
          <div key={b.l} style={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'6px', padding:'4px 8px', fontSize:'0.68rem', fontFamily:'var(--font-mono)' }}>
            <span style={{ color:'var(--muted)' }}>{b.l} </span><span style={{ color:b.c, fontWeight:700 }}>{b.v}</span>
          </div>
        ))}
      </div>
      <Row label="R-Tree insert"       data={h.rtreeInsert||[]} avg={snap.rtreeInsert?.avg} p95={snap.rtreeInsert?.p95} color="#3b82f6" />
      <Row label="Spatial query"       data={h.rtreeQuery||[]}  avg={snap.rtreeQuery?.avg}  p95={snap.rtreeQuery?.p95}  color="#60a5fa" />
      <Row label="Heap operation"      data={h.heapOp||[]}      avg={snap.heapOp?.avg}      p95={snap.heapOp?.p95}      color="#f59e0b" />
      <Row label="Segment Tree update" data={h.segTree||[]}     avg={snap.segTreeUpdate?.avg} p95={snap.segTreeUpdate?.p95} color="#10b981" />
      <Row label="Memory"              data={h.mem||[]}         avg={snap.memMB}            p95={snap.memMB}            unit=" MB" color="#a78bfa" />
      <Row label="Throughput"          data={h.tput||[]}        avg={snap.throughput}       p95={snap.throughput}       unit=" v/s" color="#34d399" />
    </div>
  );
}
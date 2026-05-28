import { useState } from 'react';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

function StatRow({ label, a, b, unit = '', higherBetter = true }) {
  const av = Number(a) || 0, bv = Number(b) || 0;
  const aWins = higherBetter ? av >= bv : av <= bv;
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:'8px', alignItems:'center', padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
      <div style={{ textAlign:'right', fontWeight: aWins && av !== bv ? 700 : 400, color: aWins && av !== bv ? 'var(--accent)' : 'var(--fg)', fontFamily:'var(--font-mono)', fontSize:'0.82rem' }}>
        {av.toFixed(1)}{unit}
      </div>
      <div style={{ textAlign:'center', fontSize:'0.68rem', color:'var(--muted)', fontFamily:'var(--font-mono)', padding:'0 8px', whiteSpace:'nowrap' }}>{label}</div>
      <div style={{ textAlign:'left', fontWeight: !aWins && av !== bv ? 700 : 400, color: !aWins && av !== bv ? 'var(--accent)' : 'var(--fg)', fontFamily:'var(--font-mono)', fontSize:'0.82rem' }}>
        {bv.toFixed(1)}{unit}
      </div>
    </div>
  );
}

export default function VehicleComparePanel({ vehiclesRef }) {
  const [idA, setIdA] = useState('');
  const [idB, setIdB] = useState('');
  const [etaA, setEtaA] = useState(null);
  const [etaB, setEtaB] = useState(null);
  const [comparing, setComparing] = useState(false);

  const vA = vehiclesRef?.current?.get(idA.trim().toUpperCase());
  const vB = vehiclesRef?.current?.get(idB.trim().toUpperCase());

  async function compare() {
    setComparing(true);
    try {
      const [rA, rB] = await Promise.allSettled([
        fetch(`${API}/vehicles/eta/${idA.trim().toUpperCase()}`).then(r => r.ok ? r.json() : null),
        fetch(`${API}/vehicles/eta/${idB.trim().toUpperCase()}`).then(r => r.ok ? r.json() : null),
      ]);
      if (rA.status==='fulfilled' && rA.value?.data) setEtaA(rA.value.data);
      if (rB.status==='fulfilled' && rB.value?.data) setEtaB(rB.value.data);
    } catch(_) {}
    setComparing(false);
  }

  const canCompare = idA.trim() && idB.trim() && idA !== idB;

  return (
    <div className="panel compare-panel">
      <div className="panel-header">
        <h3 style={{ margin:0 }}>⚖️ Compare Vehicles</h3>
        <span className="panel-badge">Side by side</span>
      </div>
      <div style={{ fontSize:'0.68rem', color:'var(--muted)', fontFamily:'var(--font-mono)', marginBottom:'10px' }}>
        Enter two vehicle IDs to compare their stats
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'10px' }}>
        <div>
          <div style={{ fontSize:'0.68rem', color:'var(--muted)', marginBottom:'4px', fontFamily:'var(--font-mono)' }}>Vehicle A</div>
          <input value={idA} onChange={e=>setIdA(e.target.value.toUpperCase())} placeholder="e.g. V45"
            style={{ width:'100%', padding:'7px 10px', borderRadius:'8px', border:'1px solid var(--border)', background:'var(--surface-2)', color:'var(--fg)', fontSize:'0.85rem', boxSizing:'border-box' }}/>
        </div>
        <div>
          <div style={{ fontSize:'0.68rem', color:'var(--muted)', marginBottom:'4px', fontFamily:'var(--font-mono)' }}>Vehicle B</div>
          <input value={idB} onChange={e=>setIdB(e.target.value.toUpperCase())} placeholder="e.g. V100"
            style={{ width:'100%', padding:'7px 10px', borderRadius:'8px', border:'1px solid var(--border)', background:'var(--surface-2)', color:'var(--fg)', fontSize:'0.85rem', boxSizing:'border-box' }}/>
        </div>
      </div>

      <button onClick={compare} disabled={!canCompare || comparing} style={{
        width:'100%', padding:'8px', borderRadius:'8px', border:'none', marginBottom:'12px',
        background: canCompare ? 'var(--accent)' : 'var(--border)',
        color: canCompare ? '#fff' : 'var(--muted)',
        fontWeight:700, fontSize:'0.85rem', cursor: canCompare ? 'pointer' : 'not-allowed',
      }}>{comparing ? 'Comparing…' : '⚖️ Compare'}</button>

      {vA && vB && (
        <div>
          {/* Headers */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:'8px', marginBottom:'8px' }}>
            <div style={{ textAlign:'right', fontWeight:700, fontSize:'0.85rem', color:'var(--accent)' }}>{idA}</div>
            <div style={{ textAlign:'center', fontSize:'0.68rem', color:'var(--muted)', padding:'0 8px' }}>VS</div>
            <div style={{ textAlign:'left', fontWeight:700, fontSize:'0.85rem', color:'var(--accent)' }}>{idB}</div>
          </div>

          <StatRow label="Speed" a={vA.speed||vA.speedKmph||0} b={vB.speed||vB.speedKmph||0} unit=" km/h" />
          {etaA && etaB && <>
            <StatRow label="Distance to dest" a={etaA.distanceKm||0} b={etaB.distanceKm||0} unit=" km" higherBetter={false} />
            <StatRow label="Delay" a={etaA.delayMinutes||0} b={etaB.delayMinutes||0} unit=" min" higherBetter={false} />
          </>}

          <div style={{ marginTop:'8px', display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:'8px' }}>
            <div style={{ textAlign:'right', fontSize:'0.75rem', fontFamily:'var(--font-mono)', color:'var(--muted)' }}>{vA.city || '—'}</div>
            <div style={{ textAlign:'center', fontSize:'0.65rem', color:'var(--muted)' }}>City</div>
            <div style={{ textAlign:'left', fontSize:'0.75rem', fontFamily:'var(--font-mono)', color:'var(--muted)' }}>{vB.city || '—'}</div>
          </div>

          {etaA && etaB && (
            <div style={{ marginTop:'4px', display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:'8px' }}>
              <div style={{ textAlign:'right', fontSize:'0.75rem', color: etaA.status==='delayed'?'#f87171':'#34d399', fontWeight:700 }}>{etaA.status}</div>
              <div style={{ textAlign:'center', fontSize:'0.65rem', color:'var(--muted)' }}>Status</div>
              <div style={{ textAlign:'left', fontSize:'0.75rem', color: etaB.status==='delayed'?'#f87171':'#34d399', fontWeight:700 }}>{etaB.status}</div>
            </div>
          )}
        </div>
      )}

      {(!vA || !vB) && canCompare && (
        <p style={{ color:'var(--muted)', fontSize:'0.78rem', textAlign:'center', fontFamily:'var(--font-mono)' }}>
          {!vA && idA ? `Vehicle "${idA}" not found` : !vB && idB ? `Vehicle "${idB}" not found` : 'Enter vehicle IDs above'}
        </p>
      )}
    </div>
  );
}
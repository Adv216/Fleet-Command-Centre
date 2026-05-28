import { useEffect, useRef, useState } from 'react';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

function MiniSparkline({ data = [], color = '#3b82f6', height = 36 }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const valid = data.filter(v => v > 0);
    if (valid.length < 2) return;
    const mn = Math.min(...valid), mx = Math.max(...valid) || 1;
    // gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, color + '55');
    grad.addColorStop(1, color + '00');
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - mn) / (mx - mn + 0.001)) * (h - 4) - 2;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - mn) / (mx - mn + 0.001)) * (h - 4) - 2;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
  }, [data, color, height]);
  return <canvas ref={ref} width={260} height={height} style={{ display: 'block', width: '100%' }} />;
}

function StatusBadge({ status }) {
  const cfg = {
    'on-time': { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: '✅ On Time' },
    delayed:   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  label: '⚠️ Delayed' },
    early:     { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: '🚀 Early' },
    arrived:   { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', label: '📦 Arrived' },
  };
  const c = cfg[status] || cfg['on-time'];
  return (
    <span style={{ padding: '3px 10px', borderRadius: '999px', background: c.bg, color: c.color, fontSize: '0.78rem', fontWeight: 700 }}>
      {c.label}
    </span>
  );
}

export default function VehicleDetailModal({ vehicleId, vehicle, onClose }) {
  const [eta, setEta]       = useState(null);
  const [priority, setPriority] = useState(null);
  const [trail, setTrail]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vehicleId) return;
    setLoading(true);
    Promise.allSettled([
      fetch(`${API}/vehicles/eta/${vehicleId}`).then(r => r.ok ? r.json() : null),
      fetch(`${API}/vehicles/trail/${vehicleId}`).then(r => r.ok ? r.json() : null),
    ]).then(([etaR, trailR]) => {
      if (etaR.status === 'fulfilled' && etaR.value?.data) setEta(etaR.value.data);
      if (trailR.status === 'fulfilled' && trailR.value?.data) setTrail(trailR.value.data);
      setLoading(false);
    });
  }, [vehicleId]);

  if (!vehicleId) return null;

  const speed = Number(vehicle?.speed || vehicle?.speedKmph || 0);
  const speedColor = speed >= 80 ? '#ef4444' : speed >= 50 ? '#f59e0b' : '#10b981';
  const speedLabel = speed >= 80 ? 'Very Fast' : speed >= 50 ? 'Moderate' : speed >= 20 ? 'Slow' : 'Parked';
  const trailSpeeds = trail.map(p => p.speed || 0);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '16px', width: '100%', maxWidth: '480px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f0f9ff', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>
              🚗 {vehicleId}
            </div>
            {vehicle?.city && (
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>📍 {vehicle.city}</div>
            )}
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px', color: '#e2e8f0', width: '36px', height: '36px',
            cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Current Speed */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: '10px', padding: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current Speed</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: speedColor, fontFamily: 'var(--font-display)' }}>{speed.toFixed(0)}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>km/h · {speedLabel}</div>
            </div>
            <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: '10px', padding: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Location</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, fontFamily: 'var(--font-mono)', marginTop: '4px' }}>{Number(vehicle?.lat || 0).toFixed(4)}°N</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{Number(vehicle?.lon || 0).toFixed(4)}°E</div>
            </div>
          </div>

          {/* Speed History */}
          <div style={{ background: 'var(--surface-2)', borderRadius: '10px', padding: '12px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>
              📈 Speed History (last {trailSpeeds.length} readings)
            </div>
            {trailSpeeds.length > 1
              ? <MiniSparkline data={trailSpeeds} color={speedColor} />
              : <div style={{ color: 'var(--muted)', fontSize: '0.78rem', textAlign: 'center', padding: '8px 0' }}>
                  {loading ? 'Loading history…' : 'Not enough data yet'}
                </div>
            }
          </div>

          {/* ETA Info */}
          {eta && (
            <div style={{ background: 'var(--surface-2)', borderRadius: '10px', padding: '14px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>🎯 DELIVERY STATUS</div>
                <StatusBadge status={eta.status} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { label: 'Destination', value: eta.destination },
                  { label: 'Distance Left', value: `${eta.distanceKm ?? '—'} km` },
                  { label: 'Estimated Arrival', value: eta.etaFmt || '—' },
                  { label: 'Delay', value: eta.delayMinutes > 0 ? `+${eta.delayMinutes} min late` : eta.delayMinutes < 0 ? `${Math.abs(eta.delayMinutes)} min early` : 'On schedule' },
                ].map(row => (
                  <div key={row.label} style={{ background: 'var(--surface)', borderRadius: '8px', padding: '8px 10px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>{row.label}</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, marginTop: '2px' }}>{row.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trail stats */}
          {trail.length > 0 && (
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { label: '📍 Trail Points', value: trail.length },
                { label: '⚡ Max Speed', value: `${Math.max(...trailSpeeds).toFixed(0)} km/h` },
                { label: '📊 Avg Speed', value: `${(trailSpeeds.reduce((a,b)=>a+b,0)/trailSpeeds.length).toFixed(0)} km/h` },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, background: 'var(--surface-2)', borderRadius: '8px', padding: '8px 10px', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>{s.label}</div>
                  <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.88rem', marginTop: '2px' }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}

          <button onClick={onClose} style={{
            width: '100%', padding: '10px', borderRadius: '10px',
            background: 'var(--accent)', color: '#fff', border: 'none',
            fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
          }}>Close</button>
        </div>
      </div>
    </div>
  );
}
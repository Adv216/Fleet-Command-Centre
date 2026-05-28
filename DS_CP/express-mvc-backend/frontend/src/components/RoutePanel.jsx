import { useState } from 'react';

function haversineKm(la1, lo1, la2, lo2) {
  const d = v => v * Math.PI / 180;
  const dLa = d(la2 - la1), dLo = d(lo2 - lo1);
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(d(la1)) * Math.cos(d(la2)) * Math.sin(dLo / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function headingBetween(la1, lo1, la2, lo2) {
  const d = v => v * Math.PI / 180;
  const dLo = d(lo2 - lo1);
  const y = Math.sin(dLo) * Math.cos(d(la2));
  const x = Math.cos(d(la1)) * Math.sin(d(la2)) - Math.sin(d(la1)) * Math.cos(d(la2)) * Math.cos(dLo);
  const deg = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  const dirs = ['↑ North', '↗ NE', '→ East', '↘ SE', '↓ South', '↙ SW', '← West', '↖ NW'];
  const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
  const idx = Math.round(deg / 45) % 8;
  return { label: dirs[idx], arrow: arrows[idx], deg: Math.round(deg) };
}

function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function RoutePanel({ routePoints = [], routeResult = null, onClear }) {
  const [showWaypoints, setShowWaypoints] = useState(false);
  const [speedKmh, setSpeedKmh]           = useState(60);

  // Build step-by-step segments from path
  const segments = [];
  if (routeResult?.path?.length > 1) {
    const path = routeResult.path;
    const numSteps = Math.min(8, path.length - 1);
    const step = Math.max(1, Math.floor(path.length / numSteps));
    for (let i = 0; i < path.length - 1; i += step) {
      const from = path[i];
      const to   = path[Math.min(i + step, path.length - 1)];
      const dist = haversineKm(from.lat, from.lon, to.lat, to.lon);
      const dir  = headingBetween(from.lat, from.lon, to.lat, to.lon);
      segments.push({
        step:    segments.length + 1,
        dir,
        dist,
        fromLat: from.lat.toFixed(4),
        fromLon: from.lon.toFixed(4),
        toLat:   to.lat.toFixed(4),
        toLon:   to.lon.toFixed(4),
      });
    }
  }

  const travelMinutes = routeResult ? Math.round((routeResult.totalKm / speedKmh) * 60) : 0;
  const fuelL         = routeResult ? (routeResult.totalKm * 0.12).toFixed(1) : '—'; // ~12L/100km estimate
  const co2Kg         = routeResult ? (routeResult.totalKm * 0.27 / 1000).toFixed(2) : '—'; // ~270g/km

  return (
    <div className="panel route-panel">
      <div className="panel-header">
        <h3 style={{ margin: 0 }}>🗺️ Route Planner</h3>
        {routeResult && (
          <button className="btn btn-clear" onClick={onClear}>✕ Clear</button>
        )}
      </div>

      {/* ── Empty state ── */}
      {routePoints.length === 0 && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>🗺️</div>
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.6 }}>
            Click <strong style={{ color: 'var(--fg)' }}>Plan Route</strong> in the toolbar above,<br />
            then click your <strong style={{ color: '#10b981' }}>start point</strong> on the map
          </div>
          <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '8px', fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            🧠 Uses Dijkstra + Min-Heap on a 12×12 grid graph
          </div>
        </div>
      )}

      {/* ── A set, waiting for B ── */}
      {routePoints.length === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '10px', padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>A</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#10b981' }}>Start point set ✓</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{routePoints[0].lat.toFixed(4)}°N, {routePoints[0].lon.toFixed(4)}°E</div>
              </div>
            </div>
          </div>
          <div style={{ background: 'var(--surface-2)', border: '1px dashed var(--border)', borderRadius: '10px', padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', flexShrink: 0 }}>B</span>
              <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
                👆 Now click your <strong>destination</strong> on the map
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
            Computing will start automatically when you click
          </div>
        </div>
      )}

      {/* ── Route result ── */}
      {routePoints.length >= 2 && routeResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* Summary cards */}
          <div style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.15), rgba(139,92,246,0.07))', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '12px', padding: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', textAlign: 'center', marginBottom: '10px' }}>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a78bfa', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>{routeResult.totalKm.toFixed(1)}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>km total</div>
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a78bfa', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>{formatTime(travelMinutes)}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>est. time</div>
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a78bfa', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>{segments.length}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>steps</div>
              </div>
            </div>
            {/* Speed slider */}
            <div style={{ borderTop: '1px solid rgba(167,139,250,0.2)', paddingTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>Avg speed</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a78bfa', fontFamily: 'var(--font-mono)' }}>{speedKmh} km/h</span>
              </div>
              <input
                type="range" min={30} max={120} step={5} value={speedKmh}
                onChange={e => setSpeedKmh(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#a78bfa', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Secondary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f59e0b' }}>⛽ {fuelL}L</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>est. fuel (12L/100km)</div>
            </div>
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#34d399' }}>🌿 {co2Kg}kg</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>CO₂ estimate</div>
            </div>
          </div>

          {/* From → To */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ flex: 1, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', padding: '8px 10px' }}>
              <div style={{ fontSize: '0.6rem', color: '#10b981', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>🚀 FROM</div>
              <div style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 600, marginTop: '2px' }}>{routePoints[0].lat.toFixed(4)}°N</div>
              <div style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{routePoints[0].lon.toFixed(4)}°E</div>
            </div>
            <span style={{ fontSize: '1.4rem', color: 'var(--muted)' }}>→</span>
            <div style={{ flex: 1, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '8px 10px' }}>
              <div style={{ fontSize: '0.6rem', color: '#f87171', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>🏁 TO</div>
              <div style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 600, marginTop: '2px' }}>{routePoints[1].lat.toFixed(4)}°N</div>
              <div style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{routePoints[1].lon.toFixed(4)}°E</div>
            </div>
          </div>

          {/* Algorithm info */}
          <div style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            🧠 <span style={{ color: '#a78bfa', fontWeight: 600 }}>Dijkstra + Min-Heap</span> · {routeResult.nodeCount} nodes · 8-directional grid
          </div>

          {/* Step-by-step toggle */}
          <button
            onClick={() => setShowWaypoints(v => !v)}
            style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--fg)', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'background 0.15s' }}
          >
            {showWaypoints ? '▲ Hide' : '▼ Show'} Turn-by-Turn ({segments.length} steps)
          </button>

          {/* Waypoint list */}
          {showWaypoints && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '280px', overflowY: 'auto' }}>
              {/* Start */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '8px 10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#10b981', color: '#fff', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>S</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#10b981' }}>🚀 Start</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{routePoints[0].lat.toFixed(4)}°N, {routePoints[0].lon.toFixed(4)}°E</div>
                </div>
              </div>

              {/* Steps */}
              {segments.map((seg, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '7px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(167,139,250,0.15)', color: '#a78bfa', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{seg.step}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontSize: '1rem' }}>{seg.dir.arrow}</span>
                      <span>{seg.dir.label}</span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                      {seg.dist.toFixed(1)} km · {seg.dir.deg}° · {seg.toLat}°N
                    </div>
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                    ~{Math.round((seg.dist / speedKmh) * 60)} min
                  </div>
                </div>
              ))}

              {/* End */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '8px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#ef4444', color: '#fff', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>E</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#ef4444' }}>🏁 Destination</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{routePoints[1].lat.toFixed(4)}°N, {routePoints[1].lon.toFixed(4)}°E</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Computing ── */}
      {routePoints.length >= 2 && !routeResult && (
        <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--muted)', fontSize: '0.82rem' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '6px', animation: 'spin 1s linear infinite' }}>⚙️</div>
          Computing route…
        </div>
      )}
    </div>
  );
}
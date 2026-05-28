import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

function HealthRing({ score }) {
  const r = 36, circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const label = score >= 75 ? 'Good' : score >= 50 ? 'Fair' : 'Poor';
  return (
    <div style={{ position: 'relative', width: '96px', height: '96px', flexShrink: 0 }}>
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="var(--border)" strokeWidth="7" />
        <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '1.3rem', fontWeight: 700, color, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: '0.6rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      </div>
    </div>
  );
}

export default function FleetHealthCard({ wsUrl, liveCount, summary }) {
  const [anomalyStats, setAnomalyStats] = useState({ critical: 0, warning: 0 });
  const [etaStats, setEtaStats]         = useState({ delayedCount: 0 });
  const [priorityStats, setPriorityStats] = useState({ queueSize: 0 });
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(wsUrl, { transports: ['websocket'], reconnection: true });
    socketRef.current = socket;
    socket.on('anomaly:update', ({ stats }) => setAnomalyStats(stats || {}));
    socket.on('eta:update', ({ delayedCount }) => setEtaStats({ delayedCount: delayedCount || 0 }));
    socket.on('priority:update', ({ stats }) => setPriorityStats(stats || {}));
    return () => socket.disconnect();
  }, [wsUrl]);

  // Compute fleet health score 0–100
  const movingPct = liveCount > 0 ? ((summary?.movingVehicles || 0) / liveCount) * 100 : 100;
  const delayPenalty = Math.min(50, (etaStats.delayedCount || 0) * 2);
  const critPenalty  = Math.min(30, (anomalyStats.critical || 0) * 5);
  const warnPenalty  = Math.min(10, (anomalyStats.warning  || 0) * 1);
  const score = Math.max(0, Math.round(movingPct * 0.5 + 50 - delayPenalty - critPenalty - warnPenalty));

  const metrics = [
    { icon: '🚗', label: 'Active Vehicles', value: liveCount.toLocaleString(), sub: `${summary?.movingVehicles || 0} moving` },
    { icon: '⏰', label: 'Delayed Deliveries', value: etaStats.delayedCount, sub: 'vehicles behind schedule', alert: etaStats.delayedCount > 5 },
    { icon: '⚡', label: 'Speed Anomalies', value: (anomalyStats.critical || 0) + (anomalyStats.warning || 0), sub: `${anomalyStats.critical || 0} critical`, alert: (anomalyStats.critical || 0) > 0 },
    { icon: '🚨', label: 'Priority Queue', value: priorityStats.queueSize || 0, sub: 'urgent shipments tracked' },
  ];

  return (
    <div className="panel health-panel">
      <div className="panel-header">
        <h3 style={{ margin: 0 }}>💚 Fleet Health</h3>
        <span className="panel-badge">Live Score</span>
      </div>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '14px' }}>
        <HealthRing score={score} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
            {score >= 75 ? '✅ Fleet is operating normally' : score >= 50 ? '⚠️ Some issues detected' : '🔴 Attention needed'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
            Score based on delays, speed anomalies, and vehicle activity. Updated every few seconds.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {metrics.map(m => (
          <div key={m.label} style={{
            background: m.alert ? 'rgba(239,68,68,0.06)' : 'var(--surface-2)',
            border: `1px solid ${m.alert ? 'rgba(239,68,68,0.25)' : 'var(--border)'}`,
            borderRadius: '8px', padding: '10px 12px',
          }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginBottom: '4px' }}>{m.icon} {m.label}</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: m.alert ? '#ef4444' : 'var(--fg)' }}>{m.value}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: '2px' }}>{m.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const EVENT_TYPES = {
  'anomaly:spike':  { icon: '📈', color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  label: 'Speed Spike' },
  'anomaly:drop':   { icon: '📉', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', label: 'Speed Drop' },
  'fence:enter':    { icon: '🔴', color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  label: 'Entered Zone' },
  'fence:exit':     { icon: '🟢', color: '#10b981', bg: 'rgba(16,185,129,0.08)', label: 'Left Zone' },
  'eta:delayed':    { icon: '⏰', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', label: 'Now Delayed' },
  'priority:top':   { icon: '🚨', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', label: 'Top Priority' },
  'vehicle:fast':   { icon: '⚡', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', label: 'High Speed' },
};

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5)  return 'just now';
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s/60)}m ago`;
}

export default function ActivityFeed({ wsUrl }) {
  const [events, setEvents] = useState([]);
  const socketRef = useRef(null);

  function addEvent(type, vehicleId, detail, ts = Date.now()) {
    setEvents(prev => [
      { id: `${type}-${vehicleId}-${ts}`, type, vehicleId, detail, ts },
      ...prev,
    ].slice(0, 50));
  }

  useEffect(() => {
    const socket = io(wsUrl, { transports: ['websocket'], reconnection: true });
    socketRef.current = socket;

    // Speed anomalies
    socket.on('anomaly:update', ({ alerts }) => {
      if (!Array.isArray(alerts)) return;
      // Only process newest alert each tick
      const newest = alerts[0];
      if (!newest) return;
      const type = `anomaly:${newest.direction}`;
      addEvent(type, newest.vehicleId,
        `${newest.direction === 'spike' ? 'Jumped to' : 'Dropped to'} ${newest.speed} km/h (avg ${newest.mean}) in ${newest.city}`,
        newest.ts);
    });

    // Priority updates — watch for top vehicle changes
    let lastTopId = null;
    socket.on('priority:update', ({ topUrgent }) => {
      if (!Array.isArray(topUrgent) || topUrgent.length === 0) return;
      const top = topUrgent[0];
      if (top && top.vehicleId !== lastTopId) {
        lastTopId = top.vehicleId;
        addEvent('priority:top', top.vehicleId,
          `Now most urgent — score ${top.urgency} (${top.type} shipment)`);
      }
    });

    // ETA delays
    let lastDelayedSet = new Set();
    socket.on('eta:update', ({ summary }) => {
      if (!Array.isArray(summary)) return;
      const nowDelayed = new Set(summary.filter(r => r.status === 'delayed').map(r => r.vehicleId));
      // New delays
      for (const id of nowDelayed) {
        if (!lastDelayedSet.has(id)) {
          const r = summary.find(r => r.vehicleId === id);
          addEvent('eta:delayed', id, `Delayed by ${r?.delayMinutes || '?'} min — heading to ${r?.destination}`);
        }
      }
      lastDelayedSet = nowDelayed;
    });

    return () => socket.disconnect();
  }, [wsUrl]);

  return (
    <div className="panel activity-panel">
      <div className="panel-header">
        <h3 style={{ margin: 0 }}>📡 Live Activity Feed</h3>
        <span className="panel-badge" style={{ background:'rgba(16,185,129,0.15)', color:'#34d399', borderColor:'rgba(52,211,153,0.3)' }}>
          Live
        </span>
      </div>
      <div style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>
        Real-time events across the fleet
      </div>

      {events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📡</div>
          <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Listening for events…</div>
          <div style={{ color: 'var(--muted)', fontSize: '0.72rem', marginTop: '4px' }}>Speed spikes, delays and alerts will appear here</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '320px', overflowY: 'auto' }}>
          {events.map(ev => {
            const cfg = EVENT_TYPES[ev.type] || { icon: '📌', color: 'var(--muted)', bg: 'var(--surface-2)', label: 'Event' };
            return (
              <div key={ev.id} style={{
                display: 'flex', gap: '10px', alignItems: 'flex-start',
                padding: '8px 10px', borderRadius: '8px',
                background: cfg.bg, border: `1px solid ${cfg.color}30`,
                animation: 'slideIn 0.2s ease',
              }}>
                <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: '1px' }}>{cfg.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: cfg.color }}>{cfg.label}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{timeAgo(ev.ts)}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--fg)', fontWeight: 600, marginTop: '1px' }}>{ev.vehicleId}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '2px' }}>{ev.detail}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
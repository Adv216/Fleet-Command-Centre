import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

const STATUS_CONFIG = {
  'rescue-dispatched':   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)',  icon: '🚨', label: 'Rescue Dispatched' },
  'no-rescue-available': { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)',   icon: '🆘', label: 'No Rescue Found' },
  'resolved':            { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)',  icon: '✅', label: 'Resolved' },
};

export default function BreakdownPanel({ wsUrl }) {
  const [incidents, setIncidents]       = useState([]);
  const [stats, setStats]               = useState({ active: 0, resolved: 0 });
  const [triggering, setTriggering]     = useState(false);
  const [triggerInput, setTriggerInput] = useState('');
  const [triggerMsg, setTriggerMsg]     = useState({ text: '', ok: true });
  const [liveVehicleIds, setLiveVehicleIds] = useState([]);
  const [showPicker, setShowPicker]     = useState(false);
  const socketRef = useRef(null);

  const fetchLiveIds = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/vehicles/live?limit=50`);
      const json = await res.json();
      if (json.data) {
        const ids = json.data.map(v => v.vehicleId || v.id).filter(Boolean).slice(0, 20);
        setLiveVehicleIds(ids);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchLiveIds();
    const interval = setInterval(fetchLiveIds, 10000);
    return () => clearInterval(interval);
  }, [fetchLiveIds]);

  useEffect(() => {
    const socket = io(wsUrl, { transports: ['websocket'], reconnection: true });
    socketRef.current = socket;

    socket.on('breakdown:new', incident => {
      setIncidents(prev => [incident, ...prev].slice(0, 20));
      setStats(prev => ({ ...prev, active: (prev.active || 0) + 1 }));
    });

    socket.on('breakdown:resolved', ({ incidentId }) => {
      setIncidents(prev => prev.map(i =>
        i.incidentId === incidentId ? { ...i, status: 'resolved', resolved: true } : i
      ));
      setStats(prev => ({ active: Math.max(0, (prev.active || 1) - 1), resolved: (prev.resolved || 0) + 1 }));
    });

    socket.on('breakdown:update', ({ incidents: inc, stats: s }) => {
      setIncidents(prev => {
        const map = new Map(prev.map(i => [i.incidentId, i]));
        for (const i of inc) map.set(i.incidentId, i);
        return [...map.values()].slice(0, 20);
      });
      setStats(s);
    });

    socket.on('connect', async () => {
      try {
        const res  = await fetch(`${API}/vehicles/breakdowns`);
        const json = await res.json();
        if (json.data) {
          setIncidents(json.data.incidents || []);
          setStats(json.data.stats || { active: 0, resolved: 0 });
        }
      } catch (_) {}
    });

    return () => socket.disconnect();
  }, [wsUrl]);

  async function handleTrigger() {
    const id = triggerInput.trim().toUpperCase();
    if (!id) return;
    setTriggering(true);
    setTriggerMsg({ text: '', ok: true });
    setShowPicker(false);
    try {
      const res  = await fetch(`${API}/vehicles/breakdown/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId: id }),
      });
      const data = await res.json();
      if (res.ok) {
        setTriggerMsg({ text: `✅ Breakdown triggered for ${id} — rescue dispatched!`, ok: true });
        setTriggerInput('');
      } else {
        setTriggerMsg({ text: `⚠️ ${data.error || 'Failed'}`, ok: false });
      }
    } catch (_) {
      setTriggerMsg({ text: '⚠️ Could not connect to server', ok: false });
    }
    setTriggering(false);
    setTimeout(() => setTriggerMsg({ text: '', ok: true }), 6000);
  }

  async function handleResolve(incidentId) {
    try {
      await fetch(`${API}/vehicles/breakdown/resolve/${incidentId}`, { method: 'POST' });
    } catch (_) {}
  }

  return (
    <div className="panel breakdown-panel">
      <div className="panel-header">
        <h3 style={{ margin: 0 }}>🚨 Breakdown & Rescue</h3>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {stats.active > 0 && (
            <span style={{ padding: '2px 8px', borderRadius: '999px', background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', fontSize: '0.7rem', fontWeight: 700 }}>
              {stats.active} active
            </span>
          )}
          <span className="panel-badge">{stats.resolved} resolved</span>
        </div>
      </div>

      <div style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: '10px' }}>
        Auto-detected when a vehicle stops for 8+ seconds · Nearest vehicle dispatched as rescue
      </div>

      {/* Manual trigger */}
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', marginBottom: '10px', position: 'relative' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
          🧪 DEMO — Manually trigger a breakdown
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              value={triggerInput}
              onChange={e => { setTriggerInput(e.target.value.toUpperCase()); setShowPicker(true); }}
              onFocus={() => setShowPicker(true)}
              placeholder="Vehicle ID e.g. V45"
              onKeyDown={e => { if (e.key === 'Enter') handleTrigger(); if (e.key === 'Escape') setShowPicker(false); }}
              style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: '0.82rem' }}
            />
            {showPicker && liveVehicleIds.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '7px', marginTop: '3px', maxHeight: '150px', overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                <div style={{ padding: '4px 8px', fontSize: '0.65rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)', borderBottom: '1px solid var(--border)' }}>
                  Live vehicles — click to select
                </div>
                {liveVehicleIds
                  .filter(id => !triggerInput || id.includes(triggerInput))
                  .map(id => (
                    <div
                      key={id}
                      onMouseDown={() => { setTriggerInput(id); setShowPicker(false); }}
                      style={{ padding: '5px 10px', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {id}
                    </div>
                  ))}
              </div>
            )}
          </div>
          <button
            onClick={handleTrigger}
            disabled={triggering || !triggerInput.trim()}
            style={{ padding: '6px 14px', borderRadius: '7px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: triggering ? 'not-allowed' : 'pointer', opacity: triggering ? 0.6 : 1, whiteSpace: 'nowrap' }}
          >
            {triggering ? '…' : '🔴 Trigger'}
          </button>
        </div>

        {/* Quick-pick chips */}
        {liveVehicleIds.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--muted)', alignSelf: 'center', marginRight: '2px' }}>Quick pick:</span>
            {liveVehicleIds.slice(0, 8).map(id => (
              <button
                key={id}
                onClick={() => setTriggerInput(id)}
                style={{ padding: '2px 7px', borderRadius: '999px', border: '1px solid var(--border)', background: triggerInput === id ? 'rgba(239,68,68,0.2)' : 'transparent', color: triggerInput === id ? '#f87171' : 'var(--muted)', fontSize: '0.68rem', cursor: 'pointer', fontFamily: 'var(--font-mono)', transition: 'all 0.15s' }}
              >
                {id}
              </button>
            ))}
          </div>
        )}

        {triggerMsg.text && (
          <div style={{ marginTop: '8px', fontSize: '0.72rem', color: triggerMsg.ok ? '#10b981' : '#f87171', fontFamily: 'var(--font-mono)', padding: '6px 8px', background: triggerMsg.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', borderRadius: '6px', border: `1px solid ${triggerMsg.ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
            {triggerMsg.text}
          </div>
        )}
      </div>

      {/* Incident list */}
      {incidents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: '2rem', marginBottom: '6px' }}>✅</div>
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>No breakdowns detected</div>
          <div style={{ color: 'var(--muted)', fontSize: '0.72rem', marginTop: '4px' }}>System is monitoring all 1,000 vehicles automatically</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
          {incidents.map(inc => {
            const cfg = STATUS_CONFIG[inc.status] || STATUS_CONFIG['rescue-dispatched'];
            return (
              <div key={inc.incidentId} style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: '10px', padding: '11px 13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ fontSize: '1.1rem' }}>{cfg.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: cfg.color }}>{inc.brokenVehicleId}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{inc.time}</span>
                    <span style={{ padding: '1px 7px', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>
                  </div>
                </div>

                <div style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                  {inc.incidentId} · {inc.lat?.toFixed(3)}°N, {inc.lon?.toFixed(3)}°E
                </div>

                {inc.deliveryItem && (
                  <div style={{ background: 'rgba(0,0,0,0.08)', borderRadius: '6px', padding: '7px 9px', marginBottom: '6px', fontSize: '0.75rem' }}>
                    <div style={{ fontWeight: 600, marginBottom: '2px' }}>📦 Delivery Transfer</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>{inc.deliveryItem} → {inc.deliveryTo}</div>
                  </div>
                )}

                {inc.rescueVehicleId ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.08)', borderRadius: '6px', padding: '7px 9px', fontSize: '0.75rem' }}>
                    <span>🚒</span>
                    <div>
                      <span style={{ fontWeight: 700 }}>{inc.rescueVehicleId}</span>
                      <span style={{ color: 'var(--muted)' }}> dispatched · {inc.rescueDistKm} km away</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: '#f87171' }}>⚠️ No rescue vehicle found within 50 km radius</div>
                )}

                {!inc.resolved && (
                  <button
                    onClick={() => handleResolve(inc.incidentId)}
                    style={{ marginTop: '8px', width: '100%', padding: '5px', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', color: '#10b981', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    ✅ Mark Resolved
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
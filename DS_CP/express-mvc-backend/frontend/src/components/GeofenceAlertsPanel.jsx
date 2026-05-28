export default function GeofenceAlertsPanel({ alerts = [], fencePoints = [], fenceClosed, onClear }) {
  return (
    <div className="panel alerts-panel">
      <div className="panel-header">
        <h3 style={{ margin: 0 }}>⬟ Geofence Alerts</h3>
        {fencePoints.length > 0 && <button className="btn btn-clear" onClick={onClear}>✕ Clear</button>}
      </div>
      <div style={{ fontSize:'0.68rem', color:'var(--muted)', fontFamily:'var(--font-mono)', marginBottom:'8px' }}>
        {fenceClosed
          ? `Active · ${fencePoints.length} vertices · R-Tree spatial check`
          : fencePoints.length > 0
          ? `Drawing · ${fencePoints.length} pts — close polygon to activate`
          : 'Switch to Geofence Mode · draw polygon on map'}
      </div>
      <div className="alert-list">
        {alerts.length === 0 ? (
          <p className="alert-empty">{fenceClosed ? 'No vehicles entered/exited yet' : 'No active geofence'}</p>
        ) : (
          alerts.map(a => (
            <div key={a.id} className={`alert-item alert-${a.type}`}>
              <span className="alert-dot" />
              <span><strong>{a.vehicleId}</strong> {a.type === 'enter' ? 'entered' : 'exited'}</span>
              <span className="alert-time">{a.time}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
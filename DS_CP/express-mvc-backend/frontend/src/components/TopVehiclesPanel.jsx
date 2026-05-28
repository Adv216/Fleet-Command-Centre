export default function TopVehiclesPanel({ vehicles, selectedVehicleId, onSelectVehicle }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h3 style={{ margin: 0 }}>🏎️ Fastest Vehicles Right Now</h3>
        <span className="panel-badge">Top {vehicles.length}</span>
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>
        Click any vehicle to highlight it on the map
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Vehicle ID</th>
              <th>Speed</th>
              <th>Last Update</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)' }}>Loading vehicle data…</td></tr>
            ) : (
              vehicles.map((v, i) => {
                const speed = Number(v.speedKmph || v.speed || 0);
                const isSel = selectedVehicleId === v.vehicleId;
                return (
                  <tr key={v.vehicleId} className={isSel ? 'active-row' : ''}
                    onClick={() => onSelectVehicle?.(v.vehicleId)}
                    style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 700, color: i < 3 ? '#f59e0b' : 'var(--muted)' }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
                    </td>
                    <td style={{ fontWeight: 600 }}>{v.vehicleId}</td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700,
                        background: speed >= 80 ? 'rgba(239,68,68,0.12)' : speed >= 50 ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
                        color: speed >= 80 ? '#ef4444' : speed >= 50 ? '#f59e0b' : '#10b981',
                      }}>{speed.toFixed(0)} km/h</span>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
                      {new Date(v.metadata?.timestamp || Date.now()).toLocaleTimeString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
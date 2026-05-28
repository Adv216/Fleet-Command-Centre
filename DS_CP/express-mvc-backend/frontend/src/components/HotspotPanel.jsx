export default function HotspotPanel({ hotspots }) {
  return (
    <div className="panel hotspot-panel">
      <div className="panel-header">
        <h3 style={{ margin: 0 }}>🔥 Busiest Areas</h3>
        <span className="panel-badge">{hotspots.length} zones</span>
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
        Areas with the most vehicles packed together right now
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Vehicles</th>
              <th>Avg Speed</th>
              <th>Top Speed</th>
            </tr>
          </thead>
          <tbody>
            {hotspots.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)' }}>Loading hotspot data…</td></tr>
            ) : (
              hotspots.map(spot => (
                <tr key={spot.cellId}>
                  <td style={{ fontWeight: 700, color: spot.rank <= 3 ? '#ef4444' : 'var(--muted)' }}>
                    {spot.rank === 1 ? '🔥' : spot.rank === 2 ? '🌡️' : `#${spot.rank}`}
                  </td>
                  <td style={{ fontWeight: 700 }}>{spot.count} vehicles</td>
                  <td>{Number(spot.avgSpeedKmph || 0).toFixed(0)} km/h</td>
                  <td style={{ color: 'var(--red)', fontWeight: 600 }}>{Number(spot.maxSpeedKmph || 0).toFixed(0)} km/h</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
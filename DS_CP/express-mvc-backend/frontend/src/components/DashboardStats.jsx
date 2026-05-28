export default function DashboardStats({ summary, visibleCount, liveCount, clusterCount, noiseCount, wsStatus }) {
  const distribution = summary?.speedDistribution || [];
  const peak = distribution.reduce((max, item) => Math.max(max, item.count || 0), 1);

  const connectionColor = wsStatus === 'connected' ? '#10b981' : '#ef4444';
  const connectionText  = wsStatus === 'connected' ? '🟢 Live' : '🔴 Offline';

  return (
    <section className="stats-grid">

      <div className="stat-card">
        <div className="stat-label">🚗 Total Vehicles Tracked</div>
        <div className="stat-value">{liveCount.toLocaleString()}</div>
        <div className="stat-meta">
          {visibleCount < liveCount
            ? `Showing ${visibleCount} after your filters`
            : 'All vehicles visible on map'}
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-label">⚡ Fleet Average Speed</div>
        <div className="stat-value">{Number(summary?.avgSpeedKmph || 0).toFixed(1)} km/h</div>
        <div className="stat-meta">
          {summary?.highSpeedVehicles || 0} vehicles going above 80 km/h
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-label">📦 Route Groups (Clusters)</div>
        <div className="stat-value">{clusterCount}</div>
        <div className="stat-meta">
          Groups of vehicles moving in similar areas
          {noiseCount > 0 ? ` · ${noiseCount} lone vehicles` : ''}
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-label">📡 Live Connection</div>
        <div className="stat-value" style={{ fontSize: '1.1rem', color: connectionColor }}>{connectionText}</div>
        <div className="stat-meta">
          🟢 Moving: {summary?.movingVehicles || 0} &nbsp;|&nbsp;
          ⚪ Parked: {summary?.idleVehicles || 0}
        </div>
      </div>

      <div className="stat-card stat-card-wide">
        <div className="stat-label">📊 Speed Breakdown — How fast are vehicles going right now?</div>
        <div className="speed-dist">
          {distribution.length === 0 ? (
            <div className="stat-meta">Loading speed data…</div>
          ) : (
            distribution.map((bucket) => (
              <div key={bucket.label} className="speed-dist-row">
                <div className="speed-dist-label">{bucket.label} km/h</div>
                <div className="speed-dist-bar-wrap">
                  <div className="speed-dist-bar"
                    style={{ width: `${Math.max(3, Math.round(((bucket.count || 0) / peak) * 100))}%` }} />
                </div>
                <div className="speed-dist-count">{bucket.count || 0}</div>
              </div>
            ))
          )}
        </div>
      </div>

    </section>
  );
}
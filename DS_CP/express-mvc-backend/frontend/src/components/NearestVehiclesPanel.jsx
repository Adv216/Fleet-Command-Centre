export default function NearestVehiclesPanel({ vehicles, nearestQueryPoint, selectedVehicleId, onSelectVehicle }) {
  return (
    <div className="panel nearest-panel">
      <div className="panel-header">
        <h3 style={{ margin: 0 }}>📍 Nearby Vehicles</h3>
        {vehicles.length > 0 && <span className="panel-badge">{vehicles.length} found</span>}
      </div>

      {!nearestQueryPoint ? (
        <div style={{ padding: '12px 0', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👆</div>
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
            <strong>How to use:</strong> Click anywhere on the map and we'll instantly show you the closest vehicles to that point
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
            Showing vehicles near {nearestQueryPoint.lat.toFixed(3)}°N, {nearestQueryPoint.lon.toFixed(3)}°E
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>How far?</th>
                  <th>Speed</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.length === 0 ? (
                  <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--muted)' }}>No vehicles found nearby</td></tr>
                ) : (
                  vehicles.map((v, i) => (
                    <tr key={v.vehicleId} className={selectedVehicleId === v.vehicleId ? 'active-row' : ''}
                      onClick={() => onSelectVehicle?.(v.vehicleId)} style={{ cursor: 'pointer' }}>
                      <td>
                        <span style={{ color: i === 0 ? '#f59e0b' : 'var(--fg)', fontWeight: i === 0 ? 700 : 400 }}>
                          {i === 0 ? '🏆 ' : ''}{v.vehicleId}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                        {Number(v.distanceKm || 0).toFixed(2)} km
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                        {Number(v.speed || v.speedKmph || 0).toFixed(0)} km/h
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
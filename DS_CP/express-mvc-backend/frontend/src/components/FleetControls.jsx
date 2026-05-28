export default function FleetControls({
  speedThreshold, onSpeedThresholdChange,
  searchQuery, onSearchQueryChange,
  epsKm, onEpsKmChange,
  minPts, onMinPtsChange,
  hotspotCellKm, onHotspotCellKmChange,
  selectedVehicle, nearestVehicle, nearestQueryPoint,
}) {
  return (
    <section className="controls-card">

      <div className="controls-section-title">🔧 Filters &amp; Settings</div>

      <div className="controls-grid">

        <label className="control-group">
          <span>🔍 Search Vehicle by ID</span>
          <input
            value={searchQuery}
            onChange={e => onSearchQueryChange(e.target.value)}
            placeholder="e.g. V45 or V100"
          />
          <small className="control-hint">Type a vehicle ID to highlight it on the map</small>
        </label>

        <label className="control-group">
          <span>🚀 Show Only Fast Vehicles (min {speedThreshold} km/h)</span>
          <input type="range" min="0" max="140" step="5" value={speedThreshold}
            onChange={e => onSpeedThresholdChange(Number(e.target.value))} />
          <small className="control-hint">
            {speedThreshold === 0
              ? 'Showing all vehicles'
              : `Only showing vehicles going faster than ${speedThreshold} km/h`}
          </small>
        </label>

        <label className="control-group">
          <span>📦 Group Size (km)</span>
          <input type="number" min="0.1" max="5" step="0.05" value={epsKm}
            onChange={e => onEpsKmChange(Number(e.target.value))} />
          <small className="control-hint">How close vehicles need to be to form a group</small>
        </label>

        <label className="control-group">
          <span>👥 Min Vehicles per Group</span>
          <input type="number" min="2" max="20" step="1" value={minPts}
            onChange={e => onMinPtsChange(Number(e.target.value))} />
          <small className="control-hint">Minimum vehicles needed to count as a group</small>
        </label>

        <label className="control-group">
          <span>🔥 Hotspot Zone Size (km)</span>
          <input type="number" min="0.5" max="12" step="0.5" value={hotspotCellKm}
            onChange={e => onHotspotCellKmChange(Number(e.target.value))} />
          <small className="control-hint">Size of the grid used to detect busy areas</small>
        </label>

      </div>

      {/* Selected vehicle info */}
      <div className="selected-vehicle-strip">
        {selectedVehicle ? (
          <>
            <span>📌 Selected:</span>
            <strong>{selectedVehicle.vehicleId}</strong>
            <span>Speed: {Number(selectedVehicle.speed || 0).toFixed(1)} km/h</span>
            <span>Location: {Number(selectedVehicle.lat || 0).toFixed(4)}°N, {Number(selectedVehicle.lon || 0).toFixed(4)}°E</span>
            {selectedVehicle.city && <span>City: {selectedVehicle.city}</span>}
          </>
        ) : (
          <span>👆 Click any vehicle dot on the map or tap a vehicle in the list to see its details here</span>
        )}
      </div>

      {/* Nearest vehicle result */}
      <div className="nearest-strip">
        {nearestVehicle && nearestQueryPoint ? (
          <>
            <span className="nearest-hint">🏆 Nearest vehicle found:</span>
            <strong>{nearestVehicle.vehicleId}</strong>
            <span>{Number(nearestVehicle.distanceKm || 0).toFixed(2)} km away from where you clicked</span>
          </>
        ) : (
          <span className="nearest-hint">
            👆 <strong>Tip:</strong> Click anywhere on the map to instantly find the nearest vehicle to that point
          </span>
        )}
      </div>

    </section>
  );
}
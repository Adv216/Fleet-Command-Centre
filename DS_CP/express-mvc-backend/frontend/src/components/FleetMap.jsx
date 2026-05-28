import React, { useEffect, useRef } from 'react';
import {
  MapContainer, TileLayer, CircleMarker, Popup,
  Circle, Polyline, Polygon, useMapEvents, useMap,
  Tooltip,
} from 'react-leaflet';
import L from 'leaflet';

/* ── Auto-fit on first load ── */
function MapAutoFit({ vehicles, myTrucks, fitted }) {
  const map = useMap();
  useEffect(() => {
    if (fitted.current) return;
    const all = [
      ...vehicles.map(v => [v.lat, v.lon]),
      ...myTrucks.map(t => [t.lat, t.lon]),
    ].filter(([la, lo]) => Number.isFinite(la) && Number.isFinite(lo));
    if (all.length < 2) return;
    try { map.fitBounds(all, { padding: [40, 40], maxZoom: 7 }); fitted.current = true; }
    catch (_) {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles.length]);
  return null;
}

/* ── Auto-zoom to route when it appears ── */
function RouteZoomer({ routeResult }) {
  const map   = useMap();
  const prevRef = useRef(null);
  useEffect(() => {
    if (!routeResult || routeResult === prevRef.current) return;
    prevRef.current = routeResult;
    if (!routeResult.path?.length) return;
    try {
      const bounds = L.latLngBounds(routeResult.path.map(p => [p.lat, p.lon]));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 10, animate: true, duration: 0.8 });
    } catch (_) {}
  }, [routeResult, map]);
  return null;
}

function MapClickCapture({ onMapPick }) {
  useMapEvents({
    click(e) {
      const lat = e?.latlng?.lat, lon = e?.latlng?.lng;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
      onMapPick?.(lat, lon);
    },
  });
  return null;
}

function colorBySpeed(speed) {
  if (speed >= 80)  return '#ef4444';
  if (speed >= 55)  return '#f97316';
  if (speed >= 30)  return '#f59e0b';
  return '#10b981';
}

function speedLabel(speed) {
  if (speed >= 80)  return 'Very Fast';
  if (speed >= 55)  return 'Fast';
  if (speed >= 30)  return 'Moderate';
  return 'Slow / Parked';
}

function haversineKm(la1, lo1, la2, lo2) {
  const d = v => v * Math.PI / 180;
  const a = Math.sin(d(la2-la1)/2)**2 + Math.cos(d(la1))*Math.cos(d(la2))*Math.sin(d(lo2-lo1)/2)**2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/* ── Build numbered waypoint stops from path ── */
function buildWaypointStops(path, numStops = 6) {
  if (!path || path.length < 2) return [];
  const stops = [];
  const step = Math.max(1, Math.floor(path.length / (numStops + 1)));
  for (let i = step; i < path.length - 1; i += step) {
    if (stops.length >= numStops) break;
    stops.push({ ...path[i], stopNum: stops.length + 1 });
  }
  return stops;
}

/* ── DivIcon for numbered waypoint markers ── */
function makeNumberIcon(num, color = '#a78bfa') {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:26px;height:26px;border-radius:50%;
      background:${color};border:2.5px solid #fff;
      color:#fff;font-weight:700;font-size:11px;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
      font-family:sans-serif;
    ">${num}</div>`,
    iconSize:   [26, 26],
    iconAnchor: [13, 13],
  });
}

function makeLabelIcon(text, color = '#a78bfa') {
  return L.divIcon({
    className: '',
    html: `<div style="
      padding:3px 8px;border-radius:6px;
      background:${color};color:#fff;
      font-weight:700;font-size:11px;
      white-space:nowrap;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      font-family:sans-serif;
    ">${text}</div>`,
    iconSize:   [80, 24],
    iconAnchor: [40, 12],
  });
}

import { Marker } from 'react-leaflet';

export default function FleetMap({
  vehicles = [], clusters = [],
  selectedVehicleId, onSelectVehicle, onDoubleClickVehicle, onMapPick,
  nearestQueryPoint, nearestVehicle, speedThreshold = 0,
  center = [22.5, 78.9], myTrucks = [],
  routePoints = [], routeResult = null,
  fencePoints = [], fenceClosed = false, mode = 'default',
}) {
  const fittedRef = useRef(false);

  // Build waypoint stops for numbered markers
  const waypointStops = routeResult ? buildWaypointStops(routeResult.path, 6) : [];

  // Total distance label for midpoint
  const midPoint = routeResult?.path?.length > 1
    ? routeResult.path[Math.floor(routeResult.path.length / 2)]
    : null;

  return (
    <div className="map-wrap">
      {/* Mode overlays */}
      {mode === 'route' && routePoints.length === 1 && (
        <div className="route-info-overlay">📍 Start set — click your destination on the map</div>
      )}
      {mode === 'route' && routeResult && (
        <div className="route-info-overlay">
          ✅ {routeResult.totalKm.toFixed(1)} km · {routeResult.path.length} waypoints · map zoomed to route
        </div>
      )}
      {mode === 'fence' && !fenceClosed && fencePoints.length > 0 && (
        <div className="fence-info-overlay">
          🔶 {fencePoints.length} points — click near start to close
        </div>
      )}
      {mode === 'fence' && fenceClosed && (
        <div className="fence-info-overlay">✅ Alert zone active</div>
      )}

      <MapContainer center={center} zoom={5} className="map" preferCanvas={false}>
        <MapClickCapture onMapPick={onMapPick} />
        <MapAutoFit vehicles={vehicles} myTrucks={myTrucks} fitted={fittedRef} />
        <RouteZoomer routeResult={routeResult} />

        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
        />

        {/* ── Fleet vehicles ── */}
        {vehicles.map(v => {
          const speed = Number(v.speed || v.speedKmph || 0);
          const isSel = v.vehicleId === selectedVehicleId;
          const col   = colorBySpeed(speed);
          return (
            <CircleMarker key={v.vehicleId} center={[v.lat, v.lon]}
              radius={isSel ? 10 : 5}
              eventHandlers={{ click: () => onSelectVehicle?.(v.vehicleId), dblclick: () => onDoubleClickVehicle?.(v.vehicleId) }}
              pathOptions={{ color: isSel ? '#fff' : col, fillColor: col, weight: isSel ? 2.5 : 1, fillOpacity: speed >= speedThreshold ? 0.9 : 0.4 }}>
              <Popup>
                <div style={{ fontFamily:'sans-serif', minWidth:'160px' }}>
                  <div style={{ fontWeight:700, fontSize:'1rem', marginBottom:'6px' }}>🚗 {v.vehicleId}</div>
                  {v.city && <div>📍 <strong>City:</strong> {v.city}</div>}
                  <div>🚀 <strong>Speed:</strong> {speed.toFixed(1)} km/h ({speedLabel(speed)})</div>
                  <div>🌐 {v.lat.toFixed(4)}°N, {v.lon.toFixed(4)}°E</div>
                  <div style={{ marginTop:'6px', fontSize:'0.8rem', color:'#64748b' }}>Double-click for full details</div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* ── Clusters ── */}
        {clusters.map(c => (
          <React.Fragment key={c.clusterId}>
            <Circle center={[c.centroid.lat, c.centroid.lon]}
              radius={Math.max(300, Math.sqrt(c.size) * 400)}
              pathOptions={{ color:'#f97316', weight:1, fillOpacity:0.07 }} />
            <CircleMarker center={[c.centroid.lat, c.centroid.lon]} radius={6}
              pathOptions={{ color:'#f97316', weight:2, fillOpacity:1 }}>
              <Popup>
                <div style={{ fontFamily:'sans-serif' }}>
                  <div style={{ fontWeight:700 }}>📦 Cluster #{c.clusterId}</div>
                  <div>{c.size} vehicles grouped here</div>
                </div>
              </Popup>
            </CircleMarker>
          </React.Fragment>
        ))}

        {/* ── Nearest query ── */}
        {nearestQueryPoint && (
          <CircleMarker center={[nearestQueryPoint.lat, nearestQueryPoint.lon]} radius={8}
            pathOptions={{ color:'#8b5cf6', weight:2, fillOpacity:0.9 }}>
            <Popup>📌 You clicked here</Popup>
          </CircleMarker>
        )}
        {nearestVehicle && (
          <CircleMarker center={[nearestVehicle.lat, nearestVehicle.lon]} radius={11}
            pathOptions={{ color:'#fff', fillColor:'#8b5cf6', weight:2.5, fillOpacity:0.95 }}>
            <Popup>
              <div style={{ fontFamily:'sans-serif' }}>
                <div style={{ fontWeight:700 }}>🏆 Nearest: {nearestVehicle.vehicleId}</div>
                <div>{Number(nearestVehicle.distanceKm||0).toFixed(2)} km away</div>
              </div>
            </Popup>
          </CircleMarker>
        )}
        {nearestQueryPoint && nearestVehicle && (
          <Polyline
            positions={[[nearestQueryPoint.lat,nearestQueryPoint.lon],[nearestVehicle.lat,nearestVehicle.lon]]}
            pathOptions={{ color:'#8b5cf6', weight:2, opacity:0.7, dashArray:'6 5' }} />
        )}

        {/* ═══════════════════════════════════════════════════════
            ROUTE VISUALIZATION — enhanced
        ═══════════════════════════════════════════════════════ */}
        {routeResult?.path?.length > 1 && (
          <>
            {/* Shadow / glow line behind the main path */}
            <Polyline
              positions={routeResult.path.map(p => [p.lat, p.lon])}
              pathOptions={{ color: '#7c3aed', weight: 10, opacity: 0.18 }}
            />
            {/* Main solid route line */}
            <Polyline
              positions={routeResult.path.map(p => [p.lat, p.lon])}
              pathOptions={{ color: '#a78bfa', weight: 5, opacity: 0.95 }}
            />
            {/* Animated dashed overlay */}
            <Polyline
              positions={routeResult.path.map(p => [p.lat, p.lon])}
              pathOptions={{ color: '#fff', weight: 2, opacity: 0.55, dashArray: '10 14' }}
            />
          </>
        )}

        {/* Route START marker */}
        {routePoints[0] && (
          <Marker position={[routePoints[0].lat, routePoints[0].lon]}
            icon={L.divIcon({
              className: '',
              html: `<div style="
                width:34px;height:34px;border-radius:50%;
                background:#10b981;border:3px solid #fff;
                color:#fff;font-weight:900;font-size:14px;
                display:flex;align-items:center;justify-content:center;
                box-shadow:0 3px 12px rgba(16,185,129,0.6);
                font-family:sans-serif;
              ">A</div>`,
              iconSize: [34, 34], iconAnchor: [17, 17],
            })}>
            <Popup>
              <div style={{ fontFamily:'sans-serif' }}>
                <div style={{ fontWeight:700, color:'#10b981' }}>🚀 Route Start (A)</div>
                <div>{routePoints[0].lat.toFixed(4)}°N, {routePoints[0].lon.toFixed(4)}°E</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route END marker */}
        {routePoints[1] && (
          <Marker position={[routePoints[1].lat, routePoints[1].lon]}
            icon={L.divIcon({
              className: '',
              html: `<div style="
                width:34px;height:34px;border-radius:50%;
                background:#ef4444;border:3px solid #fff;
                color:#fff;font-weight:900;font-size:14px;
                display:flex;align-items:center;justify-content:center;
                box-shadow:0 3px 12px rgba(239,68,68,0.6);
                font-family:sans-serif;
              ">B</div>`,
              iconSize: [34, 34], iconAnchor: [17, 17],
            })}>
            <Popup>
              <div style={{ fontFamily:'sans-serif' }}>
                <div style={{ fontWeight:700, color:'#ef4444' }}>🏁 Destination (B)</div>
                <div>{routePoints[1].lat.toFixed(4)}°N, {routePoints[1].lon.toFixed(4)}°E</div>
                <div style={{ marginTop:'4px', fontWeight:600, color:'#a78bfa' }}>Total: {routeResult?.totalKm?.toFixed(1)} km</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Numbered intermediate waypoints */}
        {waypointStops.map((stop, i) => {
          const distFromStart = routeResult.path
            .slice(0, routeResult.path.indexOf(routeResult.path.find(p => p.lat === stop.lat && p.lon === stop.lon)) + 1)
            .reduce((acc, p, idx, arr) => idx === 0 ? acc : acc + haversineKm(arr[idx-1].lat, arr[idx-1].lon, p.lat, p.lon), 0);
          return (
            <Marker key={`wp-${i}`}
              position={[stop.lat, stop.lon]}
              icon={makeNumberIcon(stop.stopNum, '#a78bfa')}>
              <Popup>
                <div style={{ fontFamily:'sans-serif' }}>
                  <div style={{ fontWeight:700 }}>📍 Waypoint {stop.stopNum}</div>
                  <div>{stop.lat.toFixed(4)}°N, {stop.lon.toFixed(4)}°E</div>
                  <div style={{ color:'#a78bfa', fontSize:'0.85rem', marginTop:'3px' }}>~{distFromStart.toFixed(1)} km from start</div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Distance label at route midpoint */}
        {midPoint && routeResult && (
          <Marker position={[midPoint.lat, midPoint.lon]}
            icon={makeLabelIcon(`${routeResult.totalKm.toFixed(0)} km`, '#7c3aed')}
            interactive={false}>
          </Marker>
        )}

        {/* ── Geofence ── */}
        {fencePoints.length >= 2 && (
          <Polyline positions={fencePoints.map(p => [p.lat, p.lon])}
            pathOptions={{ color:'#f59e0b', weight:2.5, opacity:0.9, dashArray: fenceClosed ? undefined : '8 4' }} />
        )}
        {fenceClosed && fencePoints.length >= 3 && (
          <Polygon positions={fencePoints.map(p => [p.lat, p.lon])}
            pathOptions={{ color:'#f59e0b', weight:2, fillColor:'#f59e0b', fillOpacity:0.1 }} />
        )}
        {fencePoints.map((p, i) => (
          <CircleMarker key={`fp-${i}`} center={[p.lat, p.lon]} radius={5}
            pathOptions={{ color:'#f59e0b', fillColor: i===0?'#fff':'#f59e0b', weight:2, fillOpacity:1 }}>
            <Popup>Zone corner {i+1}</Popup>
          </CircleMarker>
        ))}

        {/* ── My Trucks ── */}
        {myTrucks.map(truck => {
          const trail = Array.isArray(truck.trail) && truck.trail.length > 1
            ? truck.trail.map(p => [p.lat, p.lon]) : null;
          return (
            <React.Fragment key={truck.truckId}>
              {trail && (
                <Polyline positions={trail}
                  pathOptions={{ color:'#60a5fa', weight:2.5, opacity:0.6, dashArray:'4 3' }} />
              )}
              <CircleMarker center={[truck.lat, truck.lon]} radius={14}
                pathOptions={{ color:'#3b82f6', weight:1.5, fillOpacity:0, opacity:0.3 }} />
              <CircleMarker center={[truck.lat, truck.lon]} radius={7}
                eventHandlers={{ click: () => onSelectVehicle?.(truck.truckId) }}
                pathOptions={{ color:'#ffffff', fillColor:'#3b82f6', weight:2, fillOpacity:0.97 }}>
                <Popup>
                  <div style={{ fontFamily:'sans-serif' }}>
                    <div style={{ fontWeight:700 }}>🚛 {truck.label || truck.truckId}</div>
                    <div>Speed: {Number(truck.speed).toFixed(1)} km/h</div>
                    <div>{Number(truck.lat).toFixed(4)}°N, {Number(truck.lon).toFixed(4)}°E</div>
                  </div>
                </Popup>
              </CircleMarker>
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Map legend */}
      <div className="map-legend">
        <div className="legend-title">Vehicle Speed</div>
        <div className="legend-item"><span className="legend-dot" style={{ background:'#10b981' }}/>Slow (0–30 km/h)</div>
        <div className="legend-item"><span className="legend-dot" style={{ background:'#f59e0b' }}/>Medium (30–55)</div>
        <div className="legend-item"><span className="legend-dot" style={{ background:'#f97316' }}/>Fast (55–80)</div>
        <div className="legend-item"><span className="legend-dot" style={{ background:'#ef4444' }}/>Very Fast (80+)</div>
        <div className="legend-item"><span className="legend-dot" style={{ background:'#3b82f6' }}/>My Truck</div>
        {routeResult && (
          <>
            <div style={{ borderTop:'1px solid var(--border)', margin:'6px 0' }}/>
            <div className="legend-item"><span className="legend-dot" style={{ background:'#10b981' }}/>A — Start</div>
            <div className="legend-item"><span className="legend-dot" style={{ background:'#ef4444' }}/>B — End</div>
            <div className="legend-item"><span className="legend-dot" style={{ background:'#a78bfa' }}/>Waypoints 1–{waypointStops.length}</div>
          </>
        )}
      </div>
    </div>
  );
}
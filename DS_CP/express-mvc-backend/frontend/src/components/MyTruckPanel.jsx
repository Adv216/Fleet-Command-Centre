import { useState } from 'react';

const DIRS = [
  {label:'N  (0°)',  value:0  },{label:'NE (45°)', value:45 },{label:'E  (90°)', value:90 },
  {label:'SE (135°)',value:135},{label:'S  (180°)',value:180},{label:'SW (225°)',value:225},
  {label:'W  (270°)',value:270},{label:'NW (315°)',value:315},
];

export default function MyTruckPanel({ apiBase, myTrucks = [], mapCenter = [22.5, 78.9] }) {
  const [lat,setLat]       = useState(mapCenter[0].toFixed(4));
  const [lon,setLon]       = useState(mapCenter[1].toFixed(4));
  const [speed,setSpeed]   = useState(40);
  const [heading,setHeading] = useState(0);
  const [label,setLabel]   = useState('');
  const [busy,setBusy]     = useState(false);
  const [err,setErr]       = useState('');

  async function launch() {
    setErr(''); setBusy(true);
    try {
      const r = await fetch(`${apiBase}/my-trucks`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({lat:Number(lat),lon:Number(lon),speed:Number(speed),heading:Number(heading),label}) });
      if (!r.ok) { const b = await r.json().catch(()=>({})); throw new Error(b.error||`HTTP ${r.status}`); }
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function stop(id)   { await fetch(`${apiBase}/my-trucks/${id}`,{method:'DELETE'}); }
  async function patch(id,body) { await fetch(`${apiBase}/my-trucks/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); }

  return (
    <div className="panel my-truck-panel">
      <h3>🚛 My Trucks</h3>
      <div className="my-truck-launch-form">
        <div className="mt-row">
          <label><span>Latitude</span><input type="number" step="0.0001" value={lat} onChange={e=>setLat(e.target.value)}/></label>
          <label><span>Longitude</span><input type="number" step="0.0001" value={lon} onChange={e=>setLon(e.target.value)}/></label>
          <label><span>Speed km/h</span><input type="number" min="0" max="200" value={speed} onChange={e=>setSpeed(e.target.value)}/></label>
        </div>
        <div className="mt-row">
          <label><span>Direction</span>
            <select value={heading} onChange={e=>setHeading(Number(e.target.value))}>
              {DIRS.map(d=><option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </label>
          <label><span>Label</span><input type="text" placeholder="Delivery-01" value={label} onChange={e=>setLabel(e.target.value)}/></label>
          <button className="btn btn-launch" onClick={launch} disabled={busy}>{busy?'Launching…':'🚀 Launch'}</button>
        </div>
        {err && <p className="mt-error">⚠ {err}</p>}
      </div>
      {myTrucks.length === 0
        ? <p className="mt-empty">No active trucks</p>
        : (
          <ul className="mt-truck-list">
            {myTrucks.map(t=>(
              <li key={t.truckId} className="mt-truck-item">
                <div className="mt-truck-header">
                  <span className="mt-truck-label">🚛 {t.label||t.truckId}</span>
                  <span className="mt-truck-id">{t.truckId}</span>
                  <button className="btn btn-stop" onClick={()=>stop(t.truckId)}>■ Stop</button>
                </div>
                <div className="mt-truck-stats">
                  <span>📍 {Number(t.lat).toFixed(4)}, {Number(t.lon).toFixed(4)}</span>
                  <span>🧭 {Number(t.heading).toFixed(0)}°</span>
                  <span>📏 {t.trail?.length??0} pts</span>
                </div>
                <div className="mt-truck-controls">
                  <label>Speed
                    <input type="range" min="0" max="150" step="5" defaultValue={t.speed}
                      onMouseUp={e=>patch(t.truckId,{speed:Number(e.target.value)})}
                      onTouchEnd={e=>patch(t.truckId,{speed:Number(e.target.value)})}/>
                    <span>{Number(t.speed).toFixed(0)}</span>
                  </label>
                  <label>Dir
                    <select defaultValue={t.heading} onChange={e=>patch(t.truckId,{heading:Number(e.target.value)})}>
                      {DIRS.map(d=><option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </label>
                </div>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
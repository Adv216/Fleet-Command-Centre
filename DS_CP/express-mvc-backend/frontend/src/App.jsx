import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FleetMap              from './components/FleetMap.jsx';
import TopVehiclesPanel      from './components/TopVehiclesPanel.jsx';
import DashboardStats        from './components/DashboardStats.jsx';
import FleetControls         from './components/FleetControls.jsx';
import HotspotPanel          from './components/HotspotPanel.jsx';
import NearestVehiclesPanel  from './components/NearestVehiclesPanel.jsx';
import MyTruckPanel          from './components/MyTruckPanel.jsx';
import RoutePanel            from './components/RoutePanel.jsx';
import GeofenceAlertsPanel   from './components/GeofenceAlertsPanel.jsx';
import ETAPanel              from './components/ETAPanel.jsx';
import PriorityPanel         from './components/PriorityPanel.jsx';
import PerfPanel             from './components/PerfPanel.jsx';
import AnomalyPanel          from './components/AnomalyPanel.jsx';
import CityStatsPanel        from './components/CityStatsPanel.jsx';
import VehicleDetailModal    from './components/VehicleDetailModal.jsx';
import ActivityFeed          from './components/ActivityFeed.jsx';
import FleetHealthCard       from './components/FleetHealthCard.jsx';
import SmartSearch           from './components/SmartSearch.jsx';
import OnboardingTour        from './components/OnboardingTour.jsx';
import DeliveryPanel         from './components/DeliveryPanel.jsx';
import VehicleComparePanel   from './components/VehicleComparePanel.jsx';
import BreakdownPanel        from './components/BreakdownPanel.jsx';
import { useFleetSocket }    from './hooks/useFleetSocket.js';
import { useMyTrucks }       from './hooks/useMyTrucks.js';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
const WS  = import.meta.env.VITE_WS_URL       || 'http://localhost:4000';

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

function hav(la1,lo1,la2,lo2){const d=v=>v*Math.PI/180,dLa=d(la2-la1),dLo=d(lo2-lo1),a=Math.sin(dLa/2)**2+Math.cos(d(la1))*Math.cos(d(la2))*Math.sin(dLo/2)**2;return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}
function pip(la,lo,poly){let i2=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];if((yi>lo)!==(yj>lo)&&la<((xj-xi)*(lo-yi))/(yj-yi)+xi)i2=!i2;}return i2;}

function dijkstra(sLa,sLo,eLa,eLo){
  const G=12,mlA=Math.min(sLa,eLa),mxA=Math.max(sLa,eLa),mlO=Math.min(sLo,eLo),mxO=Math.max(sLo,eLo);
  const pA=(mxA-mlA)*0.35+0.008,pO=(mxO-mlO)*0.35+0.008,lS=(mxA-mlA+2*pA)/(G-1),oS=(mxO-mlO+2*pO)/(G-1);
  const ns=[];for(let r=0;r<G;r++)for(let c=0;c<G;c++)ns.push({id:r*G+c,lat:mlA-pA+r*lS,lon:mlO-pO+c*oS});
  const nr=(la,lo)=>{let b=0,bd=Infinity;for(const n of ns){const d=hav(la,lo,n.lat,n.lon);if(d<bd){bd=d;b=n.id;}}return b;};
  const s2=nr(sLa,sLo),d2=nr(eLa,eLo),dist=new Array(ns.length).fill(Infinity),prev=new Array(ns.length).fill(-1);dist[s2]=0;
  const hp=[{id:s2,d:0}];
  const push=it=>{hp.push(it);let i=hp.length-1;while(i>0){const p=(i-1)>>1;if(hp[p].d<=hp[i].d)break;[hp[p],hp[i]]=[hp[i],hp[p]];i=p;}};
  const pop=()=>{const t=hp[0];const l=hp.pop();if(hp.length){hp[0]=l;let i=0;for(;;){const a=2*i+1,b=2*i+2;let s=i;if(a<hp.length&&hp[a].d<hp[s].d)s=a;if(b<hp.length&&hp[b].d<hp[s].d)s=b;if(s===i)break;[hp[i],hp[s]]=[hp[s],hp[i]];i=s;}}return t;};
  while(hp.length){const{id,d}=pop();if(d>dist[id])continue;if(id===d2)break;const row=Math.floor(id/G),col=id%G;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const nr2=row+dr,nc=col+dc;if(nr2<0||nr2>=G||nc<0||nc>=G)continue;const ni=nr2*G+nc,w=hav(ns[id].lat,ns[id].lon,ns[ni].lat,ns[ni].lon),nd=dist[id]+w;if(nd<dist[ni]){dist[ni]=nd;prev[ni]=id;push({id:ni,d:nd});}}}
  const path=[];let cur=d2;while(cur!==-1){path.unshift(ns[cur]);cur=prev[cur];}
  if(path.length){path[0]={...path[0],lat:sLa,lon:sLo};path[path.length-1]={...path[path.length-1],lat:eLa,lon:eLo};}
  return{path,totalKm:dist[d2],nodeCount:ns.length};
}

export default function App() {
  const vehiclesRef = useRef(new Map());
  const [version,setVersion]               = useState(0);
  const [topVehicles,setTopVehicles]       = useState([]);
  const [clusters,setClusters]             = useState([]);
  const [noiseCount,setNoiseCount]         = useState(0);
  const [summary,setSummary]               = useState(null);
  const [hotspots,setHotspots]             = useState([]);
  const [speedThreshold,setSpeedThreshold] = useState(0);
  const [searchQuery,setSearchQuery]       = useState('');
  const [epsKm,setEpsKm]                   = useState(0.35);
  const [minPts,setMinPts]                 = useState(3);
  const [hotspotCellKm,setHotspotCellKm]  = useState(2);
  const [selectedVehicleId,setSelectedVehicleId] = useState('');
  const [nearestQueryPoint,setNearestQueryPoint] = useState(null);
  const [nearestVehicle,setNearestVehicle]       = useState(null);
  const [nearestVehicles,setNearestVehicles]     = useState([]);
  const [wsStatus,setWsStatus]             = useState('connected');
  const [cityFilter,setCityFilter]         = useState(null);
  const [mode,setMode]                     = useState('default');
  const [routePoints,setRoutePoints]       = useState([]);
  const [routeResult,setRouteResult]       = useState(null);
  const [fencePoints,setFencePoints]       = useState([]);
  const [fenceClosed,setFenceClosed]       = useState(false);
  const [geofenceAlerts,setGeofenceAlerts] = useState([]);
  const geofenceRef = useRef(new Set());
  const [detailVehicleId,setDetailVehicleId] = useState(null);
  const [showSearch,setShowSearch]           = useState(false);
  const [showTour,setShowTour]               = useState(() => !localStorage.getItem('fleet-tour-done'));
  const [theme,setTheme] = useState(()=>{
    const s=localStorage.getItem('fleet-ui-theme');
    return(s==='dark'||s==='light')?s:window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
  });

  const rafRef = useRef(false);
  const triggerRender = useCallback(()=>{ if(rafRef.current)return; rafRef.current=true; requestAnimationFrame(()=>{rafRef.current=false;setVersion(v=>v+1);}); },[]);
  const handleVehicleUpdate = useCallback(p=>{ if(!p?.vehicleId)return; vehiclesRef.current.set(p.vehicleId,p); triggerRender(); },[triggerRender]);

  useFleetSocket(WS, handleVehicleUpdate, setWsStatus);
  const myTrucks = useMyTrucks(WS);

  // Keyboard shortcuts
  useEffect(()=>{
    const onKey = e => {
      if((e.ctrlKey||e.metaKey)&&e.key==='k'){ e.preventDefault(); setShowSearch(true); }
      if(e.key==='Escape'){ setShowSearch(false); setDetailVehicleId(null); }
    };
    window.addEventListener('keydown', onKey);
    return ()=>window.removeEventListener('keydown', onKey);
  },[]);

  useEffect(()=>{ document.documentElement.setAttribute('data-theme',theme); localStorage.setItem('fleet-ui-theme',theme); },[theme]);

  useEffect(()=>{
    let dead=false;
    fetchJson(`${API}/vehicles/live?limit=2500`).then(r=>{ if(dead)return; for(const v of r?.data||[])vehiclesRef.current.set(v.vehicleId,v); setVersion(v=>v+1); }).catch(()=>{});
    return()=>{dead=true;};
  },[]);

  useEffect(()=>{
    let dead=false;
    async function refresh(){
      const [tR,cR,sR,hR]=await Promise.allSettled([
        fetchJson(`${API}/vehicles/top?k=10`),
        fetchJson(`${API}/vehicles/clusters?epsKm=${epsKm}&minPts=${minPts}`),
        fetchJson(`${API}/vehicles/summary`),
        fetchJson(`${API}/vehicles/hotspots?cellSizeKm=${hotspotCellKm}&limit=6`),
      ]);
      if(dead)return;
      if(tR.status==='fulfilled')setTopVehicles(tR.value?.data||[]);
      if(cR.status==='fulfilled'){setClusters(cR.value?.data?.clusters||[]);setNoiseCount(cR.value?.data?.noiseCount||0);}
      if(sR.status==='fulfilled')setSummary(sR.value?.data||null);
      if(hR.status==='fulfilled')setHotspots(hR.value?.data?.hotspots||[]);
    }
    refresh(); const tid=setInterval(refresh,2000); return()=>{dead=true;clearInterval(tid);};
  },[epsKm,minPts,hotspotCellKm]);

  useEffect(()=>{
    if(!fenceClosed||fencePoints.length<3)return;
    const poly=fencePoints.map(p=>[p.lat,p.lon]);
    const tid=setInterval(()=>{
      for(const v of vehiclesRef.current.values()){
        const ins=pip(v.lat,v.lon,poly),was=geofenceRef.current.has(v.vehicleId);
        if(ins&&!was){geofenceRef.current.add(v.vehicleId);setGeofenceAlerts(prev=>[{id:Date.now()+v.vehicleId,vehicleId:v.vehicleId,type:'enter',time:new Date().toLocaleTimeString()},...prev.slice(0,29)]);}
        else if(!ins&&was){geofenceRef.current.delete(v.vehicleId);setGeofenceAlerts(prev=>[{id:Date.now()+v.vehicleId+'x',vehicleId:v.vehicleId,type:'exit',time:new Date().toLocaleTimeString()},...prev.slice(0,29)]);}
      }
    },1000);
    return()=>clearInterval(tid);
  },[fenceClosed,fencePoints]);

  function clearRoute(){setRoutePoints([]);setRouteResult(null);}
  function clearFence(){setFencePoints([]);setFenceClosed(false);setGeofenceAlerts([]);geofenceRef.current.clear();}

  const handleMapPick = useCallback(async(lat,lon)=>{
    if(mode==='route'){
      setRoutePoints(prev=>{
        if(prev.length===0)return[{lat,lon}];
        if(prev.length===1){setRouteResult(dijkstra(prev[0].lat,prev[0].lon,lat,lon));return[prev[0],{lat,lon}];}
        setRouteResult(null);return[{lat,lon}];
      }); return;
    }
    if(mode==='fence'){
      if(fenceClosed){clearFence();return;}
      if(fencePoints.length>=3&&hav(lat,lon,fencePoints[0].lat,fencePoints[0].lon)<0.3){setFenceClosed(true);return;}
      setFencePoints(prev=>[...prev,{lat,lon}]); return;
    }
    setNearestQueryPoint({lat,lon});
    try{
      const[sR,lR]=await Promise.all([
        fetchJson(`${API}/vehicles/nearest?lat=${lat}&lon=${lon}`),
        fetchJson(`${API}/vehicles/nearest-list?lat=${lat}&lon=${lon}&k=7`),
      ]);
      if(sR?.data){setNearestVehicle(sR.data);setSelectedVehicleId(sR.data.vehicleId);}
      setNearestVehicles(lR?.data||[]);
    }catch(_){}
  },[mode,fenceClosed,fencePoints]);

  const visibleVehicles = useMemo(()=>{
    const q=searchQuery.trim().toLowerCase(),cf=cityFilter,out=[];
    for(const v of vehiclesRef.current.values()){
      const sp=Number(v.speed||v.speedKmph||0);
      if(sp<speedThreshold)continue;
      if(q&&!String(v.vehicleId).toLowerCase().includes(q))continue;
      if(cf&&v.city!==cf)continue;
      out.push(v); if(out.length>=2500)break;
    }
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[version,speedThreshold,searchQuery,cityFilter]);

  const selectedVehicle = useMemo(()=>vehiclesRef.current.get(selectedVehicleId)||null,[selectedVehicleId,version]);
  const detailVehicle   = useMemo(()=>vehiclesRef.current.get(detailVehicleId)||null,[detailVehicleId,version]);

  const modeHints = {
    default: '👆 Click map to find nearest vehicle · Double-click a vehicle dot to see full details',
    route:   routePoints.length===0?'📍 Click your starting point':routePoints.length===1?'📍 Click your destination':'✅ Route shown',
    fence:   fenceClosed?'✅ Alert zone active — click to remove':fencePoints.length===0?'🖊️ Click points on map to draw zone':`🖊️ ${fencePoints.length} corners drawn`,
  };

  function openDetail(id){ setSelectedVehicleId(id); setDetailVehicleId(id); }

  return (
    <div className="layout">
      {/* Overlays */}
      {showTour && <OnboardingTour onClose={()=>{ setShowTour(false); localStorage.setItem('fleet-tour-done','1'); }}/>}
      {showSearch && <SmartSearch vehicles={vehiclesRef.current} onSelect={openDetail} onClose={()=>setShowSearch(false)}/>}
      {detailVehicleId && <VehicleDetailModal vehicleId={detailVehicleId} vehicle={detailVehicle} onClose={()=>setDetailVehicleId(null)}/>}

      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="header-icon">🛰️</div>
          <div>
            <h1>Fleet Command Center</h1>
            <p>Real-Time Vehicle Tracking · India Logistics · Live Dashboard</p>
          </div>
        </div>
        <div className="header-right">
          <button className="header-search-btn" onClick={()=>setShowSearch(true)} title="Search (Ctrl+K)">
            🔍 Search <kbd>Ctrl+K</kbd>
          </button>
          <span className={`ws-badge ws-${wsStatus}`}>{wsStatus==='connected'?'🟢 Live':'🔴 Offline'}</span>
          {myTrucks.length>0&&<span className="my-trucks-badge">🚛 {myTrucks.length}</span>}
          {cityFilter&&<span className="mode-badge active-fence">📍 {cityFilter}</span>}
          <button className="theme-toggle" onClick={()=>setTheme(t=>t==='dark'?'light':'dark')}>{theme==='dark'?'☀️':'🌙'}</button>
          <button className="theme-toggle" onClick={()=>setShowTour(true)} title="Help tour">❓</button>
        </div>
      </header>

      {/* Fleet Health */}
      <FleetHealthCard wsUrl={WS} liveCount={vehiclesRef.current.size} summary={summary}/>

      {/* Stats */}
      <DashboardStats summary={summary} visibleCount={visibleVehicles.length}
        liveCount={vehiclesRef.current.size} clusterCount={clusters.length}
        noiseCount={noiseCount} wsStatus={wsStatus}/>

      {/* Controls */}
      <FleetControls speedThreshold={speedThreshold} onSpeedThresholdChange={setSpeedThreshold}
        searchQuery={searchQuery} onSearchQueryChange={setSearchQuery}
        epsKm={epsKm} onEpsKmChange={setEpsKm} minPts={minPts} onMinPtsChange={setMinPts}
        hotspotCellKm={hotspotCellKm} onHotspotCellKmChange={setHotspotCellKm}
        selectedVehicle={selectedVehicle} nearestVehicle={nearestVehicle} nearestQueryPoint={nearestQueryPoint}/>

      {/* Toolbar */}
      <div className="toolbar">
        <span className="toolbar-label">Map Action</span>
        <button className="tool-btn" style={mode==='default'?{borderColor:'var(--accent)',color:'var(--accent)',background:'var(--accent-glow)'}:{}} onClick={()=>{setMode('default');clearRoute();clearFence();}}>🎯 Find Nearest</button>
        <button className={`tool-btn ${mode==='route'?'active-route':''}`} onClick={()=>{setMode(m=>m==='route'?'default':'route');clearRoute();}}>🗺️ Plan Route</button>
        <button className={`tool-btn ${mode==='fence'?'active-fence':''}`} onClick={()=>{setMode(m=>m==='fence'?'default':'fence');clearFence();}}>🔶 Alert Zone</button>
        {mode==='route'&&routePoints.length>0&&<button className="btn btn-clear" onClick={clearRoute}>✕ Route</button>}
        {mode==='fence'&&fencePoints.length>0&&<button className="btn btn-clear" onClick={clearFence}>✕ Zone</button>}
        {cityFilter&&<button className="btn btn-clear" onClick={()=>setCityFilter(null)}>✕ {cityFilter}</button>}
        <span className="tool-hint">{modeHints[mode]}</span>
      </div>

      {/* Main */}
      <section className="content-grid">
        <FleetMap vehicles={visibleVehicles} clusters={clusters}
          selectedVehicleId={selectedVehicleId} onSelectVehicle={setSelectedVehicleId}
          onDoubleClickVehicle={openDetail} onMapPick={handleMapPick}
          nearestQueryPoint={nearestQueryPoint} nearestVehicle={nearestVehicle}
          speedThreshold={speedThreshold} myTrucks={myTrucks}
          routePoints={routePoints} routeResult={routeResult}
          fencePoints={fencePoints} fenceClosed={fenceClosed} mode={mode}/>

        <div className="side-stack">
          <ActivityFeed wsUrl={WS}/>
          <FleetHealthCard wsUrl={WS} liveCount={vehiclesRef.current.size} summary={summary} mini/>
          <DeliveryPanel wsUrl={WS}/>
          <BreakdownPanel wsUrl={WS}/>
          <VehicleComparePanel vehiclesRef={vehiclesRef}/>
          <MyTruckPanel apiBase={API} myTrucks={myTrucks} mapCenter={[22.5,78.9]}/>
          <CityStatsPanel wsUrl={WS} onCityFilter={setCityFilter}/>
          <ETAPanel wsUrl={WS}/>
          <PriorityPanel wsUrl={WS}/>
          <AnomalyPanel wsUrl={WS}/>
          <PerfPanel wsUrl={WS}/>
          <RoutePanel routePoints={routePoints} routeResult={routeResult} onClear={clearRoute}/>
          <GeofenceAlertsPanel alerts={geofenceAlerts} fencePoints={fencePoints} fenceClosed={fenceClosed} onClear={clearFence}/>
          <TopVehiclesPanel vehicles={topVehicles} selectedVehicleId={selectedVehicleId} onSelectVehicle={openDetail}/>
          <NearestVehiclesPanel vehicles={nearestVehicles} nearestQueryPoint={nearestQueryPoint} selectedVehicleId={selectedVehicleId} onSelectVehicle={openDetail}/>
          <HotspotPanel hotspots={hotspots}/>
        </div>
      </section>
    </div>
  );
}
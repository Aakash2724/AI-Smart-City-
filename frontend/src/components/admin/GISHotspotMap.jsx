import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { Flame, MapPin, Layers, RefreshCw, Crosshair, ShieldCheck } from 'lucide-react';
import { getComplaints, getGISHotspots } from '../../services/api';
import CopyTicketButton from '../common/CopyTicketButton';

// Create high-visibility Leaflet Map Pins
const createCustomIcon = (category, priority) => {
  let color = '#0284c7'; // Sky Blue
  let glowColor = 'rgba(2, 132, 199, 0.4)';
  const cat = (category || '').toLowerCase();
  
  if (cat.includes('sanitation') || cat.includes('waste') || cat.includes('garbage')) {
    color = '#16a34a'; // Emerald Green
    glowColor = 'rgba(22, 163, 74, 0.4)';
  } else if (cat.includes('water') || cat.includes('sewage') || cat.includes('leak')) {
    color = '#0284c7'; // Ocean Blue
    glowColor = 'rgba(2, 132, 199, 0.4)';
  } else if (cat.includes('road') || cat.includes('pothole') || priority === 'CRITICAL') {
    color = '#e11d48'; // Rose / Red
    glowColor = 'rgba(225, 29, 72, 0.5)';
  } else if (cat.includes('electrical') || cat.includes('light')) {
    color = '#d97706'; // Amber / Gold
    glowColor = 'rgba(217, 119, 6, 0.4)';
  } else if (cat.includes('traffic') || cat.includes('parking')) {
    color = '#7c3aed'; // Purple / Violet
    glowColor = 'rgba(124, 58, 237, 0.4)';
  }

  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
        <div style="
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: ${glowColor};
          animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <div style="
          position: relative;
          background-color: ${color};
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2.5px solid #ffffff;
          box-shadow: 0 0 12px ${color}, 0 2px 6px rgba(0,0,0,0.35);
        "></div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
};

// Map Tile Providers
const TILE_LAYERS = {
  standard_light: {
    name: 'Google Standard (Light)',
    url: 'https://mt1.google.com/vt/lyrs=m&hl=en&gl=IN&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps'
  },
  satellite_hybrid: {
    name: 'Google Satellite Hybrid',
    url: 'https://mt1.google.com/vt/lyrs=y&hl=en&gl=IN&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps'
  },
  carto_voyager: {
    name: 'CartoDB Voyager (English)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
  }
};

// Auto-resizing handler to eliminate black space and re-render tiles across full block
function MapResizeHandler({ center }) {
  const map = useMap();
  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize();
    };

    // Trigger multiple invalidations to ensure full layout render
    handleResize();
    const t1 = setTimeout(handleResize, 100);
    const t2 = setTimeout(handleResize, 350);
    const t3 = setTimeout(handleResize, 800);

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  return null;
}

export default function GISHotspotMap() {
  const [complaints, setComplaints] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [showHotspots, setShowHotspots] = useState(true);
  const [activeLayer, setActiveLayer] = useState('standard_light');
  const [loading, setLoading] = useState(false);

  const hyderabadCenter = [17.4065, 78.4772];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cData, hData] = await Promise.all([
        getComplaints(),
        getGISHotspots()
      ]);
      setComplaints(cData || []);
      setHotspots(hData || []);
    } catch (err) {
      console.error('Failed to load GIS data:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedTile = TILE_LAYERS[activeLayer] || TILE_LAYERS.standard_light;

  return (
    <div className="relative w-full h-full min-h-[500px] flex flex-col rounded-2xl overflow-hidden border border-[#23252d] shadow-xl bg-[#111317] select-none text-slate-100">
      
      {/* Top Floating Control Bar (Responsive Flex, Zero Overlaps) */}
      <div className="absolute top-3 inset-x-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        
        {/* Left: GIS Zonal Status Badge */}
        <div className="pointer-events-auto bg-[#111317]/95 backdrop-blur-md border border-[#23252d] shadow-lg rounded-xl px-3 py-1.5 text-xs flex items-center gap-2 text-slate-100 flex-shrink-0">
          <div className="h-2 w-2 rounded-full bg-[#2dd4bf] animate-pulse"></div>
          <span className="font-bold tracking-tight text-white text-xs">GHMC Zonal GIS</span>
          <span className="text-[10px] font-mono bg-[#0c2e28] text-[#2dd4bf] border border-[#175249] px-2 py-0.5 rounded-md font-semibold">
            {complaints.length} Reports
          </span>
        </div>

        {/* Right: Map Layers & Hotspot Toggle */}
        <div className="pointer-events-auto bg-[#111317]/95 backdrop-blur-md border border-[#23252d] shadow-lg rounded-xl p-1 flex items-center gap-1.5 text-xs flex-shrink-0">
          
          {/* Layer Selector */}
          <div className="flex items-center gap-0.5 bg-[#0e1014] p-0.5 rounded-lg border border-[#23252d]">
            <button
              type="button"
              onClick={() => setActiveLayer('standard_light')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                activeLayer === 'standard_light'
                  ? 'bg-[#0c2e28] text-[#2dd4bf] border border-[#175249]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Map View
            </button>
            <button
              type="button"
              onClick={() => setActiveLayer('satellite_hybrid')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                activeLayer === 'satellite_hybrid'
                  ? 'bg-[#0c2e28] text-[#2dd4bf] border border-[#175249]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Satellite
            </button>
          </div>

          {/* High-Activity Areas Toggle */}
          <label className="flex items-center space-x-1.5 cursor-pointer text-slate-200 font-bold select-none text-[11px] px-2 py-1 bg-[#0e1014] rounded-lg border border-[#23252d] hover:border-[#383b46] transition-colors">
            <input
              type="checkbox"
              checked={showHotspots}
              onChange={(e) => setShowHotspots(e.target.checked)}
              className="rounded bg-[#0e1014] border-[#23252d] text-[#2dd4bf] focus:ring-[#2dd4bf] h-3.5 w-3.5 accent-[#2dd4bf]"
            />
            <Flame className="h-3.5 w-3.5 text-[#fb923c]" />
            <span className="hidden sm:inline">High-Activity Areas</span>
            <span className="sm:hidden">Hotspots</span>
          </label>
        </div>

      </div>

      {/* Full-Height Leaflet Interactive Map Container */}
      <div className="w-full h-full flex-1 min-h-[500px] relative">
        <MapContainer
          center={hyderabadCenter}
          zoom={12}
          zoomControl={false}
          scrollWheelZoom={true}
          className="w-full h-full"
          style={{ width: '100%', height: '100%', minHeight: '500px', position: 'absolute', inset: 0 }}
        >
          <ZoomControl position="bottomright" />
          <MapResizeHandler center={hyderabadCenter} />
          
          <TileLayer
            key={selectedTile.url}
            attribution={selectedTile.attribution}
            url={selectedTile.url}
          />

          {/* Active Citizen Complaints Markers */}
          {complaints.map((c) => (
            <Marker
              key={c.id || c.ticket_number}
              position={[c.latitude || 17.4370, c.longitude || 78.4480]}
              icon={createCustomIcon(c.category, c.priority)}
            >
              <Popup className="custom-leaflet-popup">
                <div className="p-2 space-y-1.5 text-xs text-slate-900 min-w-[200px]">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1">
                    <div className="flex items-center gap-1.5 font-mono font-bold text-blue-700">
                      <span>{c.ticket_number}</span>
                      <CopyTicketButton ticketNumber={c.ticket_number} variant="icon-only" className="text-slate-500 hover:text-blue-700" />
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                      {c.priority || 'HIGH'}
                    </span>
                  </div>
                  <p className="font-bold text-slate-900">{c.category}</p>
                  <p className="text-slate-700 text-[11px] leading-snug">{c.summary || c.original_text}</p>
                  <p className="text-[10px] text-blue-600 font-semibold flex items-center gap-1 pt-1 border-t border-slate-100">
                    <MapPin className="h-3 w-3" />
                    {c.address || 'Hyderabad Zone'}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Predictive Risk Hotspots */}
          {showHotspots && hotspots.map((h, i) => (
            <Circle
              key={i}
              center={[h.latitude, h.longitude]}
              radius={900}
              pathOptions={{
                color: h.risk_score > 0.8 ? '#f43f5e' : '#f59e0b',
                fillColor: h.risk_score > 0.8 ? '#f43f5e' : '#f59e0b',
                fillOpacity: 0.22,
                weight: 1.8
              }}
            >
              <Popup>
                <div className="p-2 text-xs space-y-1 text-slate-900 min-w-[190px]">
                  <p className="font-bold text-rose-600 flex items-center gap-1">
                    <Flame className="h-3.5 w-3.5" /> High-Activity Area
                  </p>
                  <p className="font-bold text-slate-900">{h.zone_name}</p>
                  <p className="text-slate-700 text-[11px]">Primary Issue: {h.predicted_category}</p>
                  <p className="text-slate-500 text-[10px] font-mono font-bold">
                    Activity Level: {Math.round(h.risk_score * 100)}%
                  </p>
                </div>
              </Popup>
            </Circle>
          ))}
        </MapContainer>
      </div>

    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, AlertTriangle, CheckCircle2, Clock, Layers, Sparkles, Filter } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createPulsingIcon = (color, pulseColor, label = '') => {
  return L.divIcon({
    className: 'custom-incident-pin',
    html: `
      <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%);">
        <div style="position: absolute; width: 28px; height: 28px; border-radius: 9999px; background-color: ${pulseColor}; opacity: 0.75; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; width: 18px; height: 18px; border-radius: 9999px; background-color: ${color}; border: 2.5px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.5);"></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

const redIcon = createPulsingIcon('#f43f5e', 'rgba(244, 63, 94, 0.5)');
const yellowIcon = createPulsingIcon('#f59e0b', 'rgba(245, 158, 11, 0.5)');
const greenIcon = createPulsingIcon('#10b981', 'rgba(16, 185, 129, 0.4)');

export default function LiveGeospatialIncidentMap({ 
  complaints = [], 
  height = '100%',
  center = [17.5500, 79.6000],
  zoom = 8
}) {
  const [filterPriority, setFilterPriority] = useState('ALL');

  const validIncidents = useMemo(() => {
    const list = Array.isArray(complaints) && complaints.length > 0 ? complaints : [];
    
    return list
      .map((c, idx) => {
        let lat = Number(c.latitude);
        let lng = Number(c.longitude);
        
        if (!lat || !lng || isNaN(lat) || isNaN(lng) || lat === 0) {
          lat = 17.6688 + ((idx % 7) - 3) * 0.04;
          lng = 80.8940 + ((idx % 5) - 2) * 0.05;
        }

        const priority = (c.priority || 'HIGH').toUpperCase();
        const isResolved = (c.status || '').toUpperCase() === 'RESOLVED' || (c.status || '').toUpperCase() === 'CLOSED';

        return {
          ...c,
          lat,
          lng,
          priority,
          isResolved
        };
      })
      .filter(item => {
        if (filterPriority === 'ALL') return true;
        if (filterPriority === 'RESOLVED') return item.isResolved;
        if (filterPriority === 'CRITICAL' || filterPriority === 'HIGH') return !item.isResolved && (item.priority === 'HIGH' || item.priority === 'CRITICAL');
        if (filterPriority === 'MEDIUM' || filterPriority === 'LOW') return !item.isResolved && (item.priority === 'MEDIUM' || item.priority === 'LOW');
        return true;
      });
  }, [complaints, filterPriority]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-[#0b0c10] border border-[#23252d] flex flex-col">
      <div className="absolute top-2.5 right-2.5 z-[400] flex items-center gap-1 bg-[#111317]/90 backdrop-blur-md p-1 rounded-xl border border-[#23252d] shadow-lg text-[10px]">
        <button
          type="button"
          onClick={() => setFilterPriority('ALL')}
          className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
            filterPriority === 'ALL' ? 'bg-[#0c2e28] text-[#2dd4bf] border border-[#175249]' : 'text-slate-400 hover:text-white'
          }`}
        >
          All ({complaints.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterPriority('HIGH')}
          className={`px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
            filterPriority === 'HIGH' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          High
        </button>
        <button
          type="button"
          onClick={() => setFilterPriority('MEDIUM')}
          className={`px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
            filterPriority === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Medium
        </button>
        <button
          type="button"
          onClick={() => setFilterPriority('RESOLVED')}
          className={`px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
            filterPriority === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Resolved
        </button>
      </div>

      <div className="flex-1 w-full min-h-[220px]">
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />

          {validIncidents.map((c, idx) => {
            let markerIcon = yellowIcon;
            if (c.isResolved) {
              markerIcon = greenIcon;
            } else if (c.priority === 'CRITICAL' || c.priority === 'HIGH') {
              markerIcon = redIcon;
            }

            return (
              <Marker
                key={c.id || c.ticket_number || idx}
                position={[c.lat, c.lng]}
                icon={markerIcon}
              >
                <Popup className="custom-dark-popup">
                  <div className="p-1 min-w-[200px] text-slate-100 font-sans">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-mono font-bold text-[#2dd4bf] bg-[#0c2e28] px-1.5 py-0.5 rounded border border-[#175249]">
                        {c.ticket_number || `CMP-${idx + 101}`}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        c.isResolved ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {c.isResolved ? 'RESOLVED' : c.priority}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white line-clamp-2 mb-1">
                      {c.summary || c.original_text || 'Civic Issue'}
                    </h4>

                    <p className="text-[10px] text-slate-300 flex items-center gap-1 mb-1">
                      <MapPin className="w-3 h-3 text-[#2dd4bf] flex-shrink-0" />
                      <span className="truncate">{c.address || 'Telangana'}</span>
                    </p>

                    <div className="pt-1 border-t border-[#23252d] flex items-center justify-between text-[9px] text-slate-400">
                      <span>{c.category || 'General'}</span>
                      <span>{c.isResolved ? 'Closed' : 'Active Squad'}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div className="px-3 py-1.5 bg-[#111317] border-t border-[#23252d] flex items-center justify-between text-[10px] font-mono text-slate-300 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> High Priority</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Medium</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Resolved</span>
        </div>
        <span className="text-[#2dd4bf] font-bold">{validIncidents.length} Live Pins</span>
      </div>
    </div>
  );
}

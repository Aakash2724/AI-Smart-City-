import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Search, Check, X, Navigation, Crosshair, Loader2, Sparkles } from 'lucide-react';
import { searchAddressSuggestions, reverseGeocodeCoordinates, resolveWardFromLocation } from '../../services/locationService';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet Default Marker Icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Vibrant Pin Icon
const pinIcon = L.divIcon({
  className: 'custom-map-pin',
  html: `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -100%);">
      <div style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); border: 2.5px solid #ffffff; box-shadow: 0 4px 14px rgba(0,0,0,0.45); border-radius: 9999px; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
      <div style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 10px; height: 10px; background: #14b8a6; transform: rotate(45deg); border-right: 2px solid white; border-bottom: 2px solid white;"></div>
    </div>
  `,
  iconSize: [38, 46],
  iconAnchor: [19, 46]
});

// Map Controller for smooth pan/zoom
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || 16, { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

// Map Event Listener for click/drag
function MapEvents({ onLocationSelected }) {
  useMapEvents({
    click(e) {
      onLocationSelected(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

const POPULAR_TOWNS = [
  { name: 'Bhadrachalam', address: 'Temple Road, Bhadrachalam, Bhadradri Kothagudem - 507111', lat: 17.6688, lng: 80.8940 },
  { name: 'Hyderabad (Jubilee Hills)', address: 'Road No. 36, Jubilee Hills, Hyderabad - 500033', lat: 17.4319, lng: 78.4073 },
  { name: 'Hyderabad (Madhapur/IT)', address: 'Hitec City Main Road, Madhapur, Hyderabad - 500081', lat: 17.4483, lng: 78.3814 },
  { name: 'Khammam', address: 'Wyra Road, Khammam, Telangana - 507001', lat: 17.2473, lng: 80.1514 },
  { name: 'Warangal', address: 'Hanamkonda Main Road, Warangal - 506001', lat: 17.9689, lng: 79.5941 }
];

export default function MapLocationPickerModal({
  isOpen,
  onClose,
  initialLat = 17.6688,
  initialLng = 80.8940,
  initialAddress = '',
  onConfirm
}) {
  const [position, setPosition] = useState([initialLat || 17.6688, initialLng || 80.8940]);
  const [address, setAddress] = useState(initialAddress || 'Bhadrachalam, Bhadradri Kothagudem - 507111');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const lat = initialLat || 17.6688;
      const lng = initialLng || 80.8940;
      setPosition([lat, lng]);
      if (initialAddress) {
        setAddress(initialAddress);
      } else {
        updateAddressFromCoords(lat, lng);
      }
    }
  }, [isOpen, initialLat, initialLng, initialAddress]);

  const updateAddressFromCoords = async (lat, lng) => {
    setIsGeocoding(true);
    try {
      const { address: resolvedAddr } = await reverseGeocodeCoordinates(lat, lng);
      if (resolvedAddr) {
        setAddress(resolvedAddr);
      }
    } catch (e) {
      setAddress(`Pinned Location (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleMapPinSelected = (lat, lng) => {
    setPosition([lat, lng]);
    updateAddressFromCoords(lat, lng);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.trim().length >= 2) {
      setIsSearching(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const results = await searchAddressSuggestions(val);
          setSuggestions(results);
        } catch (err) {
          setSuggestions([]);
        } finally {
          setIsSearching(false);
        }
      }, 250);
    } else {
      setSuggestions([]);
      setIsSearching(false);
    }
  };

  const handleSelectSuggestion = (s) => {
    const lat = s.latitude;
    const lng = s.longitude;
    const addr = s.displayAddress || s.name;
    setPosition([lat, lng]);
    setAddress(addr);
    setSearchQuery('');
    setSuggestions([]);
  };

  const handleSelectPreset = (p) => {
    setPosition([p.lat, p.lng]);
    setAddress(p.address);
    setSearchQuery('');
    setSuggestions([]);
  };

  const handleUseDeviceGPS = () => {
    if (!navigator.geolocation) return;
    setIsLocatingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition([lat, lng]);
        updateAddressFromCoords(lat, lng);
        setIsLocatingGPS(false);
      },
      () => {
        setIsLocatingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleConfirm = () => {
    const lat = parseFloat(position[0].toFixed(6));
    const lng = parseFloat(position[1].toFixed(6));
    const ward = resolveWardFromLocation(lat, lng, address);

    // Save accurate location to localStorage so whole app remembers it!
    try {
      localStorage.setItem('smartgov_saved_location', JSON.stringify({
        address,
        latitude: lat,
        longitude: lng,
        ward,
        updatedAt: Date.now()
      }));
    } catch (e) {}

    if (onConfirm) {
      onConfirm({
        address,
        latitude: lat,
        longitude: lng,
        ward
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999999] overflow-y-auto bg-black/75 backdrop-blur-sm p-3 sm:p-5 flex items-center justify-center animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl bg-[#14161b] rounded-3xl border border-[#23252d] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100 ring-1 ring-white/5 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* ── 1. Header & Search Bar ── */}
        <div className="p-4 sm:p-5 bg-[#111317] border-b border-[#23252d] space-y-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#0c2e28] border border-[#175249] flex items-center justify-center text-[#2dd4bf]">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-white">Pinpoint Exact Location on Map</h3>
                <p className="text-[11px] text-[#88909d]">Click or drag on the map, or search any town/street in India</p>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-[#16181e] hover:bg-[#1f222a] border border-[#23252d] transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Real-time Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#2dd4bf]" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search Bhadrachalam, Jubilee Hills, Khammam, Warangal, Temple Road..."
              className="w-full pl-10 pr-24 py-2.5 bg-[#0e1014] border border-[#23252d] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#2dd4bf] focus:ring-1 focus:ring-[#2dd4bf]"
            />

            <button
              type="button"
              onClick={handleUseDeviceGPS}
              disabled={isLocatingGPS}
              className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-[#0c2e28] hover:bg-[#113f37] border border-[#175249] text-[#2dd4bf] text-[11px] font-bold rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isLocatingGPS ? <Loader2 className="h-3 w-3 animate-spin" /> : <Navigation className="h-3 w-3" />}
              <span>GPS</span>
            </button>

            {/* Suggestions Overlay */}
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-[#14161b] border border-[#23252d] rounded-2xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto ring-1 ring-white/5">
                {suggestions.map((s, idx) => (
                  <button
                    key={s.id || idx}
                    type="button"
                    onClick={() => handleSelectSuggestion(s)}
                    className="w-full text-left p-3 hover:bg-[#1b1f27] border-b border-[#1f222a] last:border-b-0 flex items-start gap-2.5 group cursor-pointer"
                  >
                    <MapPin className="h-4 w-4 text-[#2dd4bf] flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-200 group-hover:text-[#5eead4] truncate">{s.name}</p>
                      <p className="text-[11px] text-[#88909d] truncate">{s.displayAddress}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Town Selection Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] custom-scrollbar">
            <span className="text-slate-400 text-[10px] font-semibold uppercase flex-shrink-0">Quick Jump:</span>
            {POPULAR_TOWNS.map((t, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(t)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  address.includes(t.name) 
                    ? 'bg-[#0c2e28] text-[#2dd4bf] border-[#175249]' 
                    : 'bg-[#0e1014] hover:bg-[#181a20] text-slate-300 border-[#23252d]'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* ── 2. Interactive Leaflet Map Container ── */}
        <div className="relative flex-1 min-h-[380px] sm:min-h-[440px] w-full bg-[#0b0c10]">
          <MapContainer
            center={position}
            zoom={16}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <Marker 
              position={position} 
              icon={pinIcon}
              draggable={true}
              eventHandlers={{
                dragend(e) {
                  const marker = e.target;
                  const newPos = marker.getLatLng();
                  handleMapPinSelected(newPos.lat, newPos.lng);
                }
              }}
            />
            <MapController center={position} />
            <MapEvents onLocationSelected={handleMapPinSelected} />
          </MapContainer>

          {/* Floating Instructions Pill */}
          <div className="absolute top-3 right-3 z-[400] bg-[#111317]/90 backdrop-blur-md border border-[#23252d] px-3 py-1.5 rounded-xl text-[11px] text-slate-300 flex items-center gap-2 shadow-lg">
            <Crosshair className="h-3.5 w-3.5 text-[#2dd4bf]" />
            <span>Click anywhere on map or drag pin</span>
          </div>
        </div>

        {/* ── 3. Selected Address Bar & Confirm Button ── */}
        <div className="p-4 sm:p-5 bg-[#111317] border-t border-[#23252d] flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <div className="flex-1 min-w-0 w-full sm:w-auto">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-0.5">
              <span>Selected Location:</span>
              <span className="font-mono text-[#2dd4bf] bg-[#0c2e28] px-2 py-0.5 rounded-md border border-[#175249] text-[10px]">
                {position[0].toFixed(5)}° N, {position[1].toFixed(5)}° E
              </span>
            </div>
            <p className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
              {isGeocoding && <Loader2 className="h-3 w-3 animate-spin text-[#2dd4bf]" />}
              <span>{address || 'Fetching address...'}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-[#0e1014] hover:bg-[#181a20] border border-[#23252d] text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-[#0c2e28] hover:bg-[#113f37] border border-[#175249] text-[#2dd4bf] text-xs font-extrabold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>Confirm Location</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Loader2, Search, Check, X } from 'lucide-react';
import { searchAddressSuggestions, detectPreciseLocation } from '../../services/locationService';

export default function LocationSearchInput({
  address,
  onAddressChange,
  latitude,
  longitude,
  onCoordinatesChange,
  onWardChange,
  placeholder = "Search town, colony, landmark or street (e.g. Bhadrachalam, Jubilee Hills)...",
  label = "Incident Location / Address",
  required = false
}) {
  const [query, setQuery] = useState(address || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');
  const containerRef = useRef(null);
  const debounceTimer = useRef(null);

  useEffect(() => {
    setQuery(address || '');
  }, [address]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (onAddressChange) onAddressChange(val);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (val.trim().length >= 2) {
      setIsSearching(true);
      debounceTimer.current = setTimeout(async () => {
        try {
          const results = await searchAddressSuggestions(val);
          setSuggestions(results);
          setIsOpen(results.length > 0);
        } catch (err) {
          setSuggestions([]);
        } finally {
          setIsSearching(false);
        }
      }, 250);
    } else {
      setSuggestions([]);
      setIsOpen(false);
      setIsSearching(false);
    }
  };

  const handleSelectSuggestion = (s) => {
    const selectedText = s.displayAddress || s.name;
    setQuery(selectedText);
    setIsOpen(false);

    if (onAddressChange) onAddressChange(selectedText);
    if (onCoordinatesChange) onCoordinatesChange(s.latitude, s.longitude);
    if (onWardChange && s.ward) onWardChange(s.ward);

    setLocationStatus(`Selected: ${s.name} (${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)})`);
    setTimeout(() => setLocationStatus(''), 4000);
  };

  const handleUseMyLocation = async () => {
    setIsLocating(true);
    setLocationStatus('Accessing device GPS coordinates...');

    try {
      const loc = await detectPreciseLocation();
      setQuery(loc.address);
      if (onAddressChange) onAddressChange(loc.address);
      if (onCoordinatesChange) onCoordinatesChange(loc.latitude, loc.longitude);
      if (onWardChange && loc.ward) onWardChange(loc.ward);

      setLocationStatus(`GPS Locked (±${loc.accuracyMeters}m accuracy): ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`);
    } catch (error) {
      let msg = 'Unable to retrieve GPS.';
      if (error.code === 1) {
        msg = 'Location permission was denied in browser.';
      } else if (error.code === 2) {
        msg = 'GPS unavailable on device. Please type your location.';
      } else if (error.code === 3) {
        msg = 'GPS request timed out. Please type your location.';
      }
      setLocationStatus(msg);
    } finally {
      setIsLocating(false);
      setTimeout(() => setLocationStatus(''), 6000);
    }
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
        {latitude && longitude && (
          <span className="text-[11px] font-mono text-slate-400">
            GPS: <strong className="text-[#2dd4bf]">{latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E</strong>
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 relative">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#2dd4bf]" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </div>

          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => {
              if (suggestions.length > 0) setIsOpen(true);
            }}
            placeholder={placeholder}
            required={required}
            className="w-full pl-10 pr-8 py-2.5 bg-[#0e1014] border border-[#23252d] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2dd4bf] focus:border-[#2dd4bf] text-white placeholder-slate-500 text-sm transition-all"
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                if (onAddressChange) onAddressChange('');
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Autocomplete Suggestions Dropdown */}
          {isOpen && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#14161b] border border-[#23252d] rounded-2xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto ring-1 ring-white/5 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-2 border-b border-[#1f222a] bg-[#111317] flex items-center justify-between text-[11px] text-slate-400 px-3">
                <span>Matching Locations in India</span>
                <span>Select for exact coordinates</span>
              </div>

              {suggestions.map((s, idx) => (
                <button
                  key={s.id || idx}
                  type="button"
                  onClick={() => handleSelectSuggestion(s)}
                  className="w-full text-left p-3 hover:bg-[#1b1f27] border-b border-[#1f222a] last:border-b-0 transition-colors flex items-start gap-2.5 group cursor-pointer"
                >
                  <div className="h-7 w-7 rounded-lg bg-[#0c2e28] border border-[#175249] flex items-center justify-center text-[#2dd4bf] flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                    <MapPin className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-200 group-hover:text-[#5eead4] truncate">
                      {s.name}
                    </p>
                    <p className="text-[11px] text-[#88909d] truncate">
                      {s.displayAddress}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono text-[#2dd4bf] bg-[#0c2e28] px-1.5 py-0.5 rounded border border-[#175249]">
                        {s.latitude.toFixed(4)}°, {s.longitude.toFixed(4)}°
                      </span>
                      {s.ward && (
                        <span className="text-[10px] text-slate-400 truncate">
                          {s.ward.split('-')[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={isLocating}
          className="px-4 py-2.5 bg-[#0c2e28] hover:bg-[#113f37] border border-[#175249] text-[#2dd4bf] font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all flex-shrink-0 cursor-pointer disabled:opacity-50"
          title="Auto-detect high precision GPS"
        >
          {isLocating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2dd4bf]" />
          ) : (
            <Navigation className="h-3.5 w-3.5" />
          )}
          <span>{isLocating ? 'Locating...' : 'Use My Location'}</span>
        </button>
      </div>

      {locationStatus && (
        <div className="text-[11px] font-medium text-[#2dd4bf] animate-in fade-in flex items-center gap-1.5 pt-0.5">
          <Check className="h-3 w-3" />
          <span>{locationStatus}</span>
        </div>
      )}
    </div>
  );
}

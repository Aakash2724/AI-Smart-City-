import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Loader2, X } from 'lucide-react';
import { searchAddressSuggestions, detectPreciseLocation } from '../../services/locationService';

export default function LocationSearchInput({
  address,
  onAddressChange,
  latitude,
  longitude,
  onCoordinatesChange,
  onWardChange,
  placeholder = "Search town, colony, landmark (e.g. Bhadrachalam, Jubilee Hills)...",
  label = "Address",
  required = false
}) {
  const [query, setQuery] = useState(address || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
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
      }, 200);
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

    // Save accurate location in localStorage
    try {
      localStorage.setItem('smartgov_saved_location', JSON.stringify({
        address: selectedText,
        latitude: s.latitude,
        longitude: s.longitude,
        ward: s.ward
      }));
    } catch (e) {}
  };

  const handleUseMyLocation = async () => {
    setIsLocating(true);
    try {
      const loc = await detectPreciseLocation();
      setQuery(loc.address);
      if (onAddressChange) onAddressChange(loc.address);
      if (onCoordinatesChange) onCoordinatesChange(loc.latitude, loc.longitude);
      if (onWardChange && loc.ward) onWardChange(loc.ward);
    } catch (error) {
      console.warn('Geolocation error:', error);
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* 1. Address Text Input (Left Column) with Autocomplete */}
        <div className="lg:col-span-6">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            {label} {required && <span className="text-rose-400">*</span>}
          </label>

          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={() => {
                if (suggestions.length > 0) setIsOpen(true);
              }}
              placeholder={placeholder}
              required={required}
              className="w-full px-3.5 py-2.5 bg-[#0e1014] border border-[#23252d] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2dd4bf] focus:border-[#2dd4bf] text-white placeholder-slate-500 text-sm transition-all"
            />

            {isSearching && (
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2dd4bf]" />
              </div>
            )}

            {/* Autocomplete Suggestions Dropdown */}
            {isOpen && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#14161b] border border-[#23252d] rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto ring-1 ring-white/5 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-2 border-b border-[#1f222a] bg-[#111317] flex items-center justify-between text-[11px] text-slate-400 px-3">
                  <span>Matching Locations</span>
                  <span>Click to lock coordinates</span>
                </div>

                {suggestions.map((s, idx) => (
                  <button
                    key={s.id || idx}
                    type="button"
                    onClick={() => handleSelectSuggestion(s)}
                    className="w-full text-left p-3 hover:bg-[#1b1f27] border-b border-[#1f222a] last:border-b-0 transition-colors flex items-start gap-2.5 group cursor-pointer"
                  >
                    <div className="h-7 w-7 rounded-lg bg-[#0c2e28] border border-[#175249] flex items-center justify-center text-[#2dd4bf] flex-shrink-0 mt-0.5">
                      <MapPin className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-200 group-hover:text-[#5eead4] truncate">
                        {s.name}
                      </p>
                      <p className="text-[11px] text-[#88909d] truncate">
                        {s.displayAddress}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-[#2dd4bf] bg-[#0c2e28] px-1.5 py-0.5 rounded border border-[#175249]">
                          {s.latitude.toFixed(4)}°, {s.longitude.toFixed(4)}°
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. Coordinates (Latitude, Longitude) + Use Location Button (Right Column) */}
        <div className="lg:col-span-6">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Coordinates
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="any"
              value={latitude || ''}
              onChange={(e) => onCoordinatesChange && onCoordinatesChange(parseFloat(e.target.value) || 0, longitude)}
              placeholder="Latitude"
              aria-label="Latitude"
              className="w-24 sm:w-28 px-2.5 py-2.5 bg-[#0e1014] border border-[#23252d] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2dd4bf] focus:border-[#2dd4bf] text-white placeholder-slate-500 text-sm font-mono text-center"
            />
            <input
              type="number"
              step="any"
              value={longitude || ''}
              onChange={(e) => onCoordinatesChange && onCoordinatesChange(latitude, parseFloat(e.target.value) || 0)}
              placeholder="Longitude"
              aria-label="Longitude"
              className="w-24 sm:w-28 px-2.5 py-2.5 bg-[#0e1014] border border-[#23252d] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2dd4bf] focus:border-[#2dd4bf] text-white placeholder-slate-500 text-sm font-mono text-center"
            />
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={isLocating}
              className="flex-1 px-3 py-2.5 bg-[#0e1014] hover:bg-[#181a20] text-[#2dd4bf] hover:text-[#5eead4] border border-[#23252d] hover:border-[#175249] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shadow-sm disabled:opacity-60 cursor-pointer"
            >
              {isLocating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2dd4bf]" />
                  <span>Locating...</span>
                </>
              ) : (
                <>
                  <Navigation className="h-3.5 w-3.5 text-[#2dd4bf]" />
                  <span>Use my location</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

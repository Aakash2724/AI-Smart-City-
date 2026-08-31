import React, { useState, useEffect } from 'react';
import { Upload, MapPin, Sparkles, ArrowRight, Image as ImageIcon, Mail, CheckCircle2, ShieldCheck, Clock, Layers, Navigation, Loader2, User, Phone, Mic } from 'lucide-react';
import { submitComplaint } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { detectPreciseLocation } from '../../services/locationService';
import ComplaintSuccessModal from './ComplaintSuccessModal';
import VoiceInputButton from '../common/VoiceInputButton';
import LocationSearchInput from '../common/LocationSearchInput';

export default function ComplaintForm({ onSubmitted, onNavigateToHistory }) {
  const { user, setIsAuthModalOpen } = useAuth();
  const [text, setText] = useState('');
  const [citizenName, setCitizenName] = useState(user?.name || '');
  const [contact, setContact] = useState(user?.phone || user?.email || '');
  const [address, setAddress] = useState(user?.registered_location || 'Jubilee Hills, Ward 12');
  const [latitude, setLatitude] = useState(17.4435);
  const [longitude, setLongitude] = useState(78.3820);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [lastUploadedPreview, setLastUploadedPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submittedComplaint, setSubmittedComplaint] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.name) setCitizenName(user.name);
      if (user.phone || user.email) setContact(user.phone || user.email);
      if (user.registered_location) setAddress(user.registered_location);
    }
  }, [user]);

  const presets = [
    { label: 'Water Leakage', text: 'Water pipeline is leaking heavily on the main road' },
    { label: 'Dustbin Overflow', text: 'Waste is leaking out of the dustbin near market area' },
    { label: 'Road Pothole', text: 'There is a deep dangerous pothole on the road' },
    { label: 'Broken Streetlight', text: 'Streetlight is not working and area is very dark' }
  ];

  const handleVoiceResult = (voiceData) => {
    if (!voiceData) return;
    const resolvedText = voiceData.translated_text || voiceData.transcription || voiceData.summary || voiceData.original_text;
    if (resolvedText) {
      setText(resolvedText);
    }
    if (voiceData.entities?.location && (!address || address === 'Jubilee Hills, Ward 12')) {
      setAddress(voiceData.entities.location);
    }
  };

  const handleUseMyLocation = async () => {
    setIsLocating(true);
    setLocationStatus('Accessing high-precision GPS coordinates...');

    try {
      const loc = await detectPreciseLocation();
      setLatitude(loc.latitude);
      setLongitude(loc.longitude);
      if (loc.address) {
        setAddress(loc.address);
      }
      setLocationStatus(`GPS Locked (±${loc.accuracyMeters}m accuracy): ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`);
    } catch (error) {
      let msg = 'Unable to retrieve location.';
      if (error.code === 1) {
        msg = 'Location permission was denied. Please allow location access in your browser settings.';
      } else if (error.code === 2) {
        msg = 'GPS / Location information is unavailable on this device.';
      } else if (error.code === 3) {
        msg = 'Location request timed out. Please try again.';
      }
      setLocationStatus(msg);
    } finally {
      setIsLocating(false);
      setTimeout(() => setLocationStatus(''), 6000);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('original_text', text);
      formData.append('latitude', parseFloat(latitude) || 17.4435);
      formData.append('longitude', parseFloat(longitude) || 78.3820);
      formData.append('address', address || user?.registered_location || 'Ward 12 - Jubilee Zone, Hyderabad');
      const resolvedEmail = (user?.email || (contact && contact.includes('@') ? contact : 'citizen@smartcity.gov')).trim().toLowerCase();
      formData.append('registered_email', resolvedEmail);

      const resolvedName = (citizenName || user?.name || (user?.email ? user.email.split('@')[0] : '')).trim();
      if (resolvedName) {
        formData.append('citizen_name', resolvedName);
      }

      const resolvedPhone = (user?.phone || (!contact?.includes('@') ? contact : '+91 98490 12345')).trim();
      if (resolvedPhone) {
        formData.append('citizen_phone', resolvedPhone);
      }

      if (imageFile) {
        formData.append('image', imageFile);
      }

      setLastUploadedPreview(imagePreview);

      const response = await submitComplaint(formData);
      setSubmittedComplaint(response);
      setIsModalOpen(true);

      // Trigger real-time synchronization across Header and Notifications
      window.dispatchEvent(new Event('smartgov_complaints_updated'));

      if (onSubmitted) {
        onSubmitted(response);
      }

      setText('');
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      console.error('Complaint submission error:', err);
      const detail = err.response?.data?.detail || (err.code === 'ERR_NETWORK' ? 'Cannot connect to backend server. Please ensure the backend is running.' : err.message);
      alert(`Error submitting complaint: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6 text-slate-100">

      {/* 1. Header Banner */}
      <div className="bg-[#111317] p-6 rounded-2xl border border-[#23252d] shadow-sm border-l-4 border-l-[#2dd4bf]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="h-12 w-12 rounded-2xl bg-[#0c2e28] border border-[#175249] text-[#2dd4bf] flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Submit a Complaint</h2>
              <p className="text-xs text-[#88909d] mt-0.5">Report a civic problem in your area with a description and optional photo.</p>
            </div>
          </div>

          {user ? (
            <div className="flex flex-col text-right bg-[#0e1014] border border-[#23252d] px-4 py-2 rounded-xl text-xs text-slate-200">
              <span className="font-bold flex items-center justify-end gap-1.5 text-white">
                <span className="h-2 w-2 rounded-full bg-[#2dd4bf] inline-block"></span>
                {user.name || user.email}
              </span>
              <span className="text-[11px] text-[#88909d] font-mono">{user.registered_location || user.ward || user.email}</span>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="text-xs bg-[#0c2e28] hover:bg-[#113f37] text-[#2dd4bf] border border-[#175249] font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <Mail className="h-4 w-4" />
              <span>Sign In to Track History</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Form Card */}
      <div className="bg-[#111317] rounded-2xl border border-[#23252d] shadow-sm p-6 sm:p-8 space-y-6">

        {/* Presets / Quick Chips */}
        <div>
          <span className="text-xs font-semibold text-[#88909d] block mb-2">Common Issues:</span>
          <div className="flex flex-wrap gap-2">
            {presets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setText(p.text)}
                className="text-xs bg-[#0e1014] hover:bg-[#181a20] hover:text-[#2dd4bf] hover:border-[#175249] text-slate-300 font-medium px-3 py-1.5 rounded-xl border border-[#23252d] transition-all"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Text Area with Embedded Microphone Icon */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Complaint Description
            </label>

            <div className="relative">
              <textarea
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Describe your complaint here..."
                className="w-full p-4 pr-12 bg-[#0e1014] border border-[#23252d] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2dd4bf] focus:border-[#2dd4bf] text-white placeholder-slate-500 text-sm"
                required
              />

              {/* Microphone icon in the top-right corner inside the text box */}
              <div className="absolute top-3 right-3 z-10">
                <VoiceInputButton
                  onInterim={(interim) => setText(interim)}
                  onResult={handleVoiceResult}
                  locationHint={address}
                  showLabel={false}
                  variant="icon"
                />
              </div>
            </div>
          </div>

          {/* Citizen Details (Optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Your name <span className="text-[#88909d] text-[11px] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={citizenName}
                onChange={(e) => setCitizenName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3.5 py-2.5 bg-[#0e1014] border border-[#23252d] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2dd4bf] focus:border-[#2dd4bf] text-white placeholder-slate-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Contact <span className="text-[#88909d] text-[11px] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Phone or email"
                className="w-full px-3.5 py-2.5 bg-[#0e1014] border border-[#23252d] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2dd4bf] focus:border-[#2dd4bf] text-white placeholder-slate-500 text-sm"
              />
            </div>
          </div>

          {/* Incident Location & Accurate GPS Coordinates */}
          <LocationSearchInput
            address={address}
            onAddressChange={setAddress}
            latitude={latitude}
            longitude={longitude}
            onCoordinatesChange={(lat, lng) => {
              setLatitude(lat);
              setLongitude(lng);
            }}
            placeholder="Search town, colony, landmark or street (e.g. Bhadrachalam, Jubilee Hills)..."
            label="Incident Location / Address"
            required
          />

          {/* Photo Upload Zone */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Attach a Photo
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <label
                htmlFor="complaint-photo-file"
                className="cursor-pointer flex-1 w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#23252d] hover:border-[#2dd4bf] rounded-2xl bg-[#0e1014] hover:bg-[#181a20] transition-all text-center"
              >
                <Upload className="h-8 w-8 text-slate-500 mb-2" />
                <span className="text-xs font-semibold text-slate-300">Click to upload a photo</span>
                <span className="text-[10px] text-[#88909d] mt-0.5 font-mono">PNG, JPG, or WEBP image</span>
                <input
                  id="complaint-photo-file"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>

              {imagePreview && (
                <div className="relative w-36 h-28 rounded-xl overflow-hidden border border-[#23252d] flex-shrink-0 shadow-sm">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 text-xs hover:bg-rose-600 transition-all"
                    title="Remove Photo"
                  >
                    ✕
                  </button>
                  <span className="absolute bottom-1 left-1 bg-[#0c2e28] text-[#2dd4bf] border border-[#175249] text-[9px] font-bold px-1.5 py-0.5 rounded">
                    Photo Attached
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[#88909d] flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#2dd4bf]" />
              Secure municipal complaint submission
            </span>

            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="px-6 py-3 bg-[#0c2e28] hover:bg-[#113f37] disabled:opacity-50 text-[#2dd4bf] border border-[#175249] font-bold rounded-xl shadow-md transition-all flex items-center gap-2 text-sm"
            >
              {loading ? (
                <span>Submitting complaint...</span>
              ) : (
                <>
                  <span>Submit Complaint</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

        </form>

      </div>

      {/* 3. Bottom Information Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#111317] p-4 rounded-xl border border-[#23252d] flex items-center gap-3">
          <Clock className="h-8 w-8 text-[#2dd4bf] flex-shrink-0" />
          <div className="text-xs">
            <h4 className="font-bold text-white">Quick Resolution</h4>
            <p className="text-[#88909d] text-[11px]">Complaints are reviewed and addressed within 12 to 24 hours.</p>
          </div>
        </div>

        <div className="bg-[#111317] p-4 rounded-xl border border-[#23252d] flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-[#2dd4bf] flex-shrink-0" />
          <div className="text-xs">
            <h4 className="font-bold text-white">Officer Assignment</h4>
            <p className="text-[#88909d] text-[11px]">Directly assigned to the responsible department officer.</p>
          </div>
        </div>

        <div className="bg-[#111317] p-4 rounded-xl border border-[#23252d] flex items-center gap-3">
          <Layers className="h-8 w-8 text-[#2dd4bf] flex-shrink-0" />
          <div className="text-xs">
            <h4 className="font-bold text-white">Automatic Routing</h4>
            <p className="text-[#88909d] text-[11px]">Auto-categorized and forwarded to the right team.</p>
          </div>
        </div>
      </div>

      {/* Complaint Registration Confirmation Popup Modal */}
      <ComplaintSuccessModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        complaint={submittedComplaint}
        uploadedImagePreview={lastUploadedPreview}
        onNavigateToHistory={(c) => {
          setIsModalOpen(false);
          if (onNavigateToHistory) onNavigateToHistory(c);
        }}
      />

    </div>
  );
}

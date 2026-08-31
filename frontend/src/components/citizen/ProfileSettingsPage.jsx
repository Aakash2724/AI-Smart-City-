import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { HYDERABAD_WARDS, detectPreciseLocation } from '../../services/locationService';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Camera, 
  Save, 
  CheckCircle2, 
  ShieldCheck, 
  LogOut,
  ArrowLeft,
  Navigation,
  Loader2
} from 'lucide-react';

export default function ProfileSettingsPage({ onNavigateTab }) {
  const { user, updateUser, logout } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [ward, setWard] = useState('Ward 12');
  const [photoUrl, setPhotoUrl] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '+91 98490 12345');
      setAddress(user.registered_location || 'Road No. 36, Jubilee Hills, Hyderabad');
      setWard(user.ward || 'Ward 12');
      setPhotoUrl(user.photo_url || '');
    }
  }, [user]);

  const handleUseMyLocation = async () => {
    setIsLocating(true);
    setLocationStatus('Accessing high-precision GPS coordinates...');

    try {
      const loc = await detectPreciseLocation();
      if (loc.address) {
        setAddress(loc.address);
      }
      if (loc.ward) {
        setWard(loc.ward);
      }
      setLocationStatus(`Location locked (±${loc.accuracyMeters}m accuracy)`);
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
      setTimeout(() => setLocationStatus(''), 5000);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    const extractedWard = ward.split(' - ')[0] || ward;
    const cleanName = name.trim();
    const cleanEmail = (email || user?.email || '').trim().toLowerCase();

    try {
      await updateUser({
        name: cleanName,
        email: cleanEmail,
        phone: phone.trim(),
        registered_location: address.trim(),
        ward: extractedWard,
        photo_url: photoUrl
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const displayName = name || user?.name || (email ? email.split('@')[0] : 'Citizen');
  const userInitials = displayName ? displayName.slice(0, 2).toUpperCase() : 'CIT';

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans animate-in fade-in duration-200 text-slate-100">
      
      {/* Page Header */}
      <div className="bg-[#111317] p-6 rounded-3xl border border-[#23252d] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-[#0c2e28] border border-[#175249] flex items-center justify-center text-[#2dd4bf] shadow-xs">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Profile & Ward Settings
            </h1>
            <p className="text-xs text-[#88909d] mt-0.5">
              Manage your profile details and residential ward area.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            if (onNavigateTab) onNavigateTab('dashboard');
          }}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0e1014] hover:bg-[#181a20] text-slate-300 text-xs font-bold rounded-xl transition-all border border-[#23252d] self-start sm:self-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {savedSuccess && (
        <div className="bg-[#0c2e28] border border-[#175249] p-4 rounded-2xl flex items-center gap-3 text-xs text-white animate-in fade-in duration-200 shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-[#2dd4bf] flex-shrink-0" />
          <div>
            <strong className="font-bold block text-[#2dd4bf]">Changes Saved Successfully!</strong>
            <span>Your profile and ward details have been updated.</span>
          </div>
        </div>
      )}

      {/* Main Settings Form Card */}
      <form onSubmit={handleSave} className="bg-[#111317] rounded-3xl border border-[#23252d] shadow-sm p-6 sm:p-8 space-y-8">
        
        {/* Section 1: Profile Photo */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-[#88909d] uppercase tracking-wider">
            Profile Photo
          </h3>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={displayName}
                  className="w-24 h-24 rounded-3xl object-cover border-2 border-[#2dd4bf] shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-3xl bg-[#0c2e28] text-[#2dd4bf] font-black text-2xl flex items-center justify-center border-2 border-[#175249] shadow-md font-mono">
                  {userInitials}
                </div>
              )}

              <label 
                htmlFor="profile-photo-upload"
                className="absolute -bottom-2 -right-2 bg-[#0e1014] hover:bg-[#0c2e28] hover:text-[#2dd4bf] text-white p-2 rounded-2xl cursor-pointer shadow-md transition-all border-2 border-[#23252d]"
                title="Upload Photo"
              >
                <Camera className="h-4 w-4" />
                <input
                  id="profile-photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-sm font-bold text-white">{displayName}</h4>
              <p className="text-xs text-[#88909d]">Upload a photo for your account.</p>
              <div className="pt-1 flex flex-wrap gap-2 justify-center sm:justify-start">
                <span className="text-[10px] bg-[#0c2e28] text-[#2dd4bf] font-bold px-2.5 py-0.5 rounded-full border border-[#175249]">
                  {ward.split(' - ')[0] || ward}
                </span>
                <span className="text-[10px] bg-[#142622] text-[#2dd4bf] font-bold px-2.5 py-0.5 rounded-full border border-[#175249]">
                  Citizen Account
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Personal Details */}
        <div className="space-y-4 pt-2 border-t border-[#23252d]">
          <h3 className="text-xs font-bold text-[#88909d] uppercase tracking-wider">
            Contact Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rahul Sharma"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#0e1014] border border-[#23252d] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#2dd4bf] focus:ring-1 focus:ring-[#2dd4bf] transition-all font-medium"
                  required
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="citizen@smartcity.gov"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#0e1014] border border-[#23252d] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#2dd4bf] focus:ring-1 focus:ring-[#2dd4bf] transition-all font-medium"
                  required
                />
              </div>
            </div>

            {/* Mobile / Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Mobile Number</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98490 12345"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#0e1014] border border-[#23252d] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#2dd4bf] focus:ring-1 focus:ring-[#2dd4bf] transition-all font-medium font-mono"
                />
              </div>
            </div>

            {/* Role / Type */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Account Role</label>
              <input
                type="text"
                value={user?.role === 'ADMIN' ? 'Municipal Officer / Admin' : 'Citizen'}
                disabled
                className="w-full px-3.5 py-2.5 bg-[#0e1014] border border-[#23252d] rounded-xl text-xs text-[#88909d] font-medium cursor-not-allowed"
              />
            </div>

          </div>
        </div>

        {/* Section 3: Residential Address & Ward Routing */}
        <div className="space-y-4 pt-2 border-t border-[#23252d]">
          <h3 className="text-xs font-bold text-[#88909d] uppercase tracking-wider">
            Address & Area
          </h3>

          <div className="space-y-4">
            {/* Residential Address */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Residential Address
                </label>

                {/* Device Location Auto-Detection Button */}
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={isLocating}
                  className="px-3 py-1.5 bg-[#0e1014] hover:bg-[#181a20] text-[#2dd4bf] hover:text-[#5eead4] border border-[#23252d] hover:border-[#175249] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {isLocating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2dd4bf]" />
                      <span>Detecting location...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="h-3.5 w-3.5 text-[#2dd4bf]" />
                      <span>Use my location</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Plot 42, Road No. 36, Jubilee Hills"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#0e1014] border border-[#23252d] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#2dd4bf] focus:ring-1 focus:ring-[#2dd4bf] transition-all font-medium"
                  required
                />
              </div>

              {/* Live Location Status Indicator */}
              {locationStatus && (
                <p className={`text-[11px] mt-1.5 flex items-center gap-1.5 ${locationStatus.includes('Locked') ? 'text-[#2dd4bf]' : 'text-amber-400'}`}>
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{locationStatus}</span>
                </p>
              )}

              <p className="text-[11px] text-[#88909d] mt-1">
                Your submitted civic complaints will default to this residential address.
              </p>
            </div>

            {/* Assigned Municipal Ward */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Ward / Area Zone
              </label>
              <select
                value={ward.includes(' - ') ? ward : (HYDERABAD_WARDS.find(w => w.id === ward)?.label || ward)}
                onChange={(e) => setWard(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0e1014] border border-[#23252d] rounded-xl text-xs text-white focus:outline-none focus:border-[#2dd4bf] focus:ring-1 focus:ring-[#2dd4bf] font-medium transition-all"
              >
                {HYDERABAD_WARDS.map((w) => (
                  <option key={w.id} value={w.label} className="bg-[#111317] text-white">
                    {w.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="pt-4 border-t border-[#23252d] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={logout}
            className="px-4 py-2.5 text-[#f87171] hover:bg-[#2e1818] rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all border border-[#592626] text-xs"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[#0c2e28] hover:bg-[#113f37] text-[#2dd4bf] border border-[#175249] disabled:opacity-50 rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 text-xs"
          >
            {saving ? (
              <span>Saving Changes...</span>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
}

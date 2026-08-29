import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Settings } from 'lucide-react';

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'ti-layout-dashboard', badge: null },
  { id: 'citizen', label: 'Report Complaint', icon: 'ti-users', badge: null },
  { id: 'copilot', label: 'AI Copilot', icon: 'ti-robot', badge: null },
  { id: 'gis', label: 'GIS & Risk Radar', icon: 'ti-map-pin', badge: null },
  { id: 'agents', label: 'Complaints & History', icon: 'ti-file-text', badge: null }
];

export default function Sidebar({ activeTab, setActiveTab, isOpen = true }) {
  const { user } = useAuth();

  if (!isOpen) return null;

  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Citizen');
  const userInitials = displayName ? displayName.slice(0, 2).toUpperCase() : 'CT';
  const userRole = user?.role === 'ADMIN' ? 'Admin' : (user?.ward || 'Ward 12');

  return (
    <aside className="w-64 bg-[#111317] border-r border-[#23252d] flex-shrink-0 flex flex-col justify-between h-full select-none transition-all duration-200 z-10 text-slate-200">
      <div className="p-4 space-y-4">
        {/* Brand Header */}
        <div className="px-2 py-1 flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-[#0c2e28] border border-[#175249] flex items-center justify-center text-[#2dd4bf] shadow-sm">
            <i className="ti ti-shield-check text-lg"></i>
          </div>
          <div>
            <h2 className="font-bold text-sm text-white leading-tight">Smart City</h2>
            <p className="text-[10px] text-[#88909d] font-medium">Municipal Services</p>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="pt-2">
          <span className="text-[10px] font-bold text-[#646a78] uppercase tracking-wider px-3 mb-2 block">
            Navigation Menu
          </span>
          <nav className="flex flex-col gap-1.5 text-xs">
            {MENU_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-2.5 rounded-xl font-semibold flex items-center justify-between transition-all ${
                    isActive
                      ? 'bg-[#0c2e28] text-[#2dd4bf] border border-[#175249] shadow-xs'
                      : 'text-[#88909d] hover:text-white hover:bg-[#181a20] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <i className={`ti ${item.icon} text-base ${isActive ? 'text-[#2dd4bf]' : 'text-slate-500'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                      isActive ? 'bg-[#175249] text-[#2dd4bf]' : 'bg-[#16181e] text-[#2dd4bf] border border-[#23252d]'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer User Profile with Interactive Settings Button */}
      <div className={`p-3 border-t border-[#23252d] transition-all flex items-center justify-between gap-2 ${
        activeTab === 'settings' ? 'bg-[#0c2e28]/50 border-[#175249]' : 'bg-[#14151a]'
      }`}>
        
        {/* Profile Card Clickable Area - Navigates to Settings Page */}
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left p-1.5 rounded-xl hover:bg-[#1c1e25] transition-all"
          title="Profile & Settings"
        >
          {user?.photo_url ? (
            <img
              src={user.photo_url}
              alt={displayName}
              className="h-8 w-8 rounded-full object-cover border border-[#2dd4bf] shadow-xs flex-shrink-0"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-[#181a20] border border-[#2c2f3a] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
              {userInitials}
            </div>
          )}

          <div className="text-xs leading-tight min-w-0 flex-1">
            <p className="font-bold text-white truncate">{displayName}</p>
            <p className="text-[10px] text-[#2dd4bf] font-medium flex items-center gap-1 truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2dd4bf] flex-shrink-0"></span> 
              <span className="truncate">{userRole}</span>
            </p>
          </div>
        </button>

        {/* Explicit Settings Gear Button - Navigates to Settings Page */}
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`p-2 rounded-xl transition-all flex-shrink-0 ${
            activeTab === 'settings'
              ? 'bg-[#0c2e28] text-[#2dd4bf] border border-[#175249]'
              : 'text-slate-400 hover:text-[#2dd4bf] hover:bg-[#1c1e25]'
          }`}
          title="Account Settings"
        >
          <Settings className="h-4 w-4" />
        </button>

      </div>
    </aside>
  );
}

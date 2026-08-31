import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Settings, ChevronsLeft, ChevronsRight } from 'lucide-react';

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'ti-layout-dashboard', badge: null },
  { id: 'citizen', label: 'Report Complaint', icon: 'ti-users', badge: null },
  { id: 'copilot', label: 'AI Copilot', icon: 'ti-robot', badge: null },
  { id: 'gis', label: 'GIS & Risk Radar', icon: 'ti-map-pin', badge: null },
  { id: 'agents', label: 'Complaints & History', icon: 'ti-file-text', badge: null }
];

export default function Sidebar({ activeTab, setActiveTab, isOpen = true, onToggle }) {
  const { user } = useAuth();

  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Citizen');
  const userInitials = displayName ? displayName.slice(0, 2).toUpperCase() : 'CT';
  const userRole = user?.role === 'ADMIN' ? 'Admin' : (user?.ward || 'Ward 12');

  return (
    <aside 
      className={`relative flex-shrink-0 flex flex-col justify-between my-3 ml-3 mb-3 bg-[#111317] border border-[#23252d] rounded-3xl shadow-xl select-none transition-all duration-300 ease-in-out z-20 text-slate-200 ${
        isOpen ? 'w-64' : 'w-[68px]'
      }`}
    >
      {/* ─── Outer Popping Expand Toggle Button on the Right Edge (Zero Overlap with Icon) ─── */}
      {!isOpen && onToggle && (
        <button
          type="button"
          onClick={onToggle}
          className="absolute -right-4 top-5 p-1 text-slate-300 hover:text-[#2dd4bf] rounded-full bg-[#181a20] hover:bg-[#23252d] border border-[#2c2f3a] transition-all cursor-pointer shadow-md hover:scale-110 z-30"
          title="Expand Navigation Menu"
          aria-label="Expand Navigation Menu"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </button>
      )}

      {/* ─── Top Brand Header ─── */}
      <div className="p-3 space-y-4">
        {isOpen ? (
          /* Expanded Header */
          <div className="px-1 py-0.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-xl bg-[#0c2e28] border border-[#175249] flex items-center justify-center text-[#2dd4bf] shadow-sm flex-shrink-0">
                <i className="ti ti-shield-check text-lg"></i>
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-sm text-white leading-tight truncate">AI Smart City</h2>
                <p className="text-[10px] text-[#88909d] font-medium truncate">Municipal Services</p>
              </div>
            </div>

            {/* Collapse Toggle Button */}
            {onToggle && (
              <button
                type="button"
                onClick={onToggle}
                className="p-1.5 text-slate-400 hover:text-white rounded-full bg-[#181a20] hover:bg-[#23252d] border border-[#2c2f3a] transition-all cursor-pointer flex-shrink-0 shadow-xs"
                title="Collapse Sidebar"
                aria-label="Collapse Sidebar"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          /* Collapsed Header - Shield perfectly centered without any button collision */
          <div className="flex items-center justify-center pt-1.5">
            <div 
              onClick={() => setActiveTab('dashboard')}
              className="h-8 w-8 rounded-xl bg-[#0c2e28] border border-[#175249] flex items-center justify-center text-[#2dd4bf] shadow-sm cursor-pointer hover:scale-105 transition-transform"
              title="AI Smart City Dashboard"
            >
              <i className="ti ti-shield-check text-base"></i>
            </div>
          </div>
        )}

        {/* ─── Navigation Items ─── */}
        <div className={isOpen ? "pt-1" : "pt-1 flex flex-col items-center"}>
          {isOpen && (
            <span className="text-[10px] font-bold text-[#646a78] uppercase tracking-wider px-2 mb-2 block">
              Navigation Menu
            </span>
          )}
          
          <nav className={`flex flex-col gap-2 text-xs ${isOpen ? 'w-full' : 'items-center w-full'}`}>
            {MENU_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              
              if (isOpen) {
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`px-3 py-2.5 rounded-xl font-semibold flex items-center justify-between transition-all cursor-pointer ${
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
              }

              /* Collapsed Item with Centered Icon & Tooltip */
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={item.label}
                  className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#0c2e28] text-[#2dd4bf] border border-[#175249] shadow-xs'
                      : 'text-[#88909d] hover:text-white hover:bg-[#181a20] border border-transparent'
                  }`}
                >
                  <i className={`ti ${item.icon} text-base ${isActive ? 'text-[#2dd4bf]' : 'text-slate-400'}`} />
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ─── Footer User Profile & Settings Area ─── */}
      {isOpen ? (
        <div className={`p-2.5 m-2 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
          activeTab === 'settings' ? 'bg-[#0c2e28]/50 border-[#175249]' : 'bg-[#14151a] border-[#23252d]'
        }`}>
          {/* Profile Card Clickable Area */}
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className="flex items-center gap-2.5 min-w-0 flex-1 text-left p-1 rounded-xl hover:bg-[#1c1e25] transition-all cursor-pointer"
            title="Profile & Settings"
          >
            {user?.photo_url ? (
              <img
                src={user.photo_url}
                alt={displayName}
                className="h-7 w-7 rounded-full object-cover border border-[#2dd4bf] shadow-xs flex-shrink-0"
              />
            ) : (
              <div className="h-7 w-7 rounded-full bg-[#181a20] border border-[#2c2f3a] text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                {userInitials}
              </div>
            )}

            <div className="text-xs leading-tight min-w-0 flex-1">
              <p className="font-bold text-white truncate text-[11px]">{displayName}</p>
              <p className="text-[9px] text-[#2dd4bf] font-medium flex items-center gap-1 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2dd4bf] flex-shrink-0"></span> 
                <span className="truncate">{userRole}</span>
              </p>
            </div>
          </button>

          {/* Explicit Settings Gear Button */}
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`p-1.5 rounded-xl transition-all flex-shrink-0 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-[#0c2e28] text-[#2dd4bf] border border-[#175249]'
                : 'text-slate-400 hover:text-[#2dd4bf] hover:bg-[#1c1e25]'
            }`}
            title="Account Settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        /* Collapsed Footer */
        <div className="p-2 flex flex-col items-center pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            title={`Settings (${displayName})`}
            className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-[#0c2e28] text-[#2dd4bf] border border-[#175249]'
                : 'text-slate-400 hover:text-[#2dd4bf] hover:bg-[#181a20]'
            }`}
          >
            {user?.photo_url ? (
              <img
                src={user.photo_url}
                alt={displayName}
                className="h-6 w-6 rounded-full object-cover border border-[#2dd4bf]"
              />
            ) : (
              <Settings className="h-4 w-4" />
            )}
          </button>
        </div>
      )}
    </aside>
  );
}

import React, { useState, useEffect } from 'react';
import { Menu, Bell, LogIn, LogOut, RefreshCw, Maximize, Minimize, MapPin, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getComplaints } from '../../services/api';
import NotificationsModal from './NotificationsModal';

export default function Header({ selectedCity, onToggleSidebar, onRefreshAll, onNavigateToHistory, onNavigateToSettings }) {
  const { user, logout, remainingOpens, setIsAuthModalOpen } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFSChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => {
          console.warn('Exit fullscreen failed:', err);
        });
      }
    }
  };

  useEffect(() => {
    loadUserUnreadCount();

    const handleSync = () => {
      loadUserUnreadCount();
    };

    window.addEventListener('smartgov_complaints_updated', handleSync);
    window.addEventListener('smartgov_notifications_read', handleSync);
    return () => {
      window.removeEventListener('smartgov_complaints_updated', handleSync);
      window.removeEventListener('smartgov_notifications_read', handleSync);
    };
  }, [user]);

  const loadUserUnreadCount = async () => {
    if (!user || !user.email) {
      setUnreadCount(0);
      return;
    }
    try {
      const all = await getComplaints();
      if (all && all.length > 0) {
        const myEmail = user.email.toLowerCase().trim();
        const mine = all.filter(c => (c.registered_email || '').toLowerCase().trim() === myEmail);
        
        // Read persisted read tracking from localStorage
        const storageKey = `smartgov_read_ids_${myEmail}`;
        const lastReadTimeKey = `smartgov_last_read_time_${myEmail}`;
        
        let readIds = [];
        try {
          readIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
        } catch (e) {
          readIds = [];
        }
        const lastReadTime = parseInt(localStorage.getItem(lastReadTimeKey) || '0', 10);

        // A complaint is unread ONLY if not in readIds and created after lastReadTime
        const unread = mine.filter(c => {
          if (readIds.includes(c.id) || readIds.includes(c.ticket_number)) {
            return false;
          }
          if (c.created_at) {
            const createdAtMs = new Date(c.created_at).getTime();
            if (createdAtMs <= lastReadTime) return false;
          }
          return true;
        });

        setUnreadCount(unread.length);
      } else {
        setUnreadCount(0);
      }
    } catch (e) {
      setUnreadCount(0);
    }
  };

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    if (onRefreshAll) {
      await onRefreshAll();
    }
    await loadUserUnreadCount();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleClearUnread = async () => {
    if (!user || !user.email) {
      setUnreadCount(0);
      return;
    }
    try {
      const myEmail = user.email.toLowerCase().trim();
      const storageKey = `smartgov_read_ids_${myEmail}`;
      const lastReadTimeKey = `smartgov_last_read_time_${myEmail}`;
      
      const all = await getComplaints();
      const mine = (all || []).filter(c => (c.registered_email || '').toLowerCase().trim() === myEmail);
      const allIds = mine.map(c => c.id).concat(mine.map(c => c.ticket_number));
      
      localStorage.setItem(storageKey, JSON.stringify(allIds));
      localStorage.setItem(lastReadTimeKey, Date.now().toString());
    } catch (e) {
      console.warn('Error saving read state:', e);
    }
    setUnreadCount(0);
    window.dispatchEvent(new Event('smartgov_notifications_read'));
  };

  const resolveCityName = () => {
    if (user?.city) return user.city;
    if (user?.registered_location) {
      const parts = user.registered_location.split(',');
      if (parts.length > 1) {
        const last = parts[parts.length - 1].trim();
        if (last) return last;
      }
    }
    if (user?.address) {
      const parts = user.address.split(',');
      if (parts.length > 1) {
        const last = parts[parts.length - 1].trim();
        if (last) return last;
      }
    }
    if (selectedCity) return selectedCity;
    return 'Hyderabad';
  };

  const displayCity = resolveCityName();

  return (
    <header className="bg-[#111317] border-b border-[#23252d] select-none text-slate-100">
      
      {/* Main Header Toolbar */}
      <div className="h-16 px-4 sm:px-8 flex items-center justify-between gap-4">
        
        {/* Left: Brand + Subtitle */}
        <div className="flex items-center space-x-3.5 min-w-0">
          <button 
            onClick={onToggleSidebar} 
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-[#1c1e25] border border-[#272932] transition-all"
            title="Toggle Navigation Menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight leading-none">
                Smart City Portal
              </h1>
              <span className="text-[11px] text-[#88909d] font-normal hidden md:inline">
                Municipal Complaint & Service Management
              </span>
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-2.5 flex-shrink-0 text-xs">

          {/* Refresh Button (Icon Only) */}
          <button
            onClick={handleRefreshClick}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-[#1c1e25] border border-[#23252d] transition-all flex items-center justify-center cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-[#2dd4bf]' : ''}`} />
          </button>

          {/* Theme Toggle Button (Dark / Light Mode) */}
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-[#1c1e25] border border-[#23252d] transition-all flex items-center justify-center cursor-pointer"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-amber-400 hover:text-amber-300 transition-colors" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700 hover:text-slate-900 transition-colors" />
            )}
          </button>

          {/* Fullscreen Toggle Button */}
          <button
            onClick={handleToggleFullscreen}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-[#1c1e25] border border-[#23252d] transition-all flex items-center justify-center cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>

          {/* Notifications Button */}
          <button
            onClick={() => setIsNotifOpen(true)}
            className="relative p-2 text-slate-400 hover:text-white rounded-xl hover:bg-[#1c1e25] border border-[#23252d] transition-all cursor-pointer"
            title="View Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-[#2dd4bf] text-slate-950 rounded-full text-[9px] font-extrabold flex items-center justify-center border-2 border-[#111317] shadow-xs">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Citizen City Location & Sign Out Badge */}
          {user ? (
            <div className="flex items-center gap-2 bg-[#111317] border border-[#23252d] px-3.5 py-1.5 rounded-full shadow-xs">
              <div className="flex items-center gap-1.5 text-slate-200 select-none">
                <MapPin className="h-3.5 w-3.5 text-[#2dd4bf] flex-shrink-0" />
                <span className="text-xs font-medium text-slate-200 tracking-tight">
                  {displayCity}
                </span>
              </div>
              <button
                onClick={logout}
                className="ml-1 text-rose-400 hover:text-rose-300 p-1 transition-colors cursor-pointer flex items-center justify-center"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 bg-[#0c2e28] hover:bg-[#113f37] text-[#2dd4bf] border border-[#175249] font-bold px-3.5 py-1.5 rounded-full text-xs shadow-sm transition-all cursor-pointer"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </button>
          )}

        </div>

      </div>

      {/* Notifications Drawer Modal */}
      <NotificationsModal
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        unreadCount={unreadCount}
        onClearUnread={handleClearUnread}
        onNavigateToTicket={(ticket) => {
          setIsNotifOpen(false);
          if (onNavigateToHistory) onNavigateToHistory(ticket);
        }}
      />

    </header>
  );
}

import React, { useState, useEffect } from 'react';
import { Bell, X, UserCheck, ArrowRight, CheckCheck, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getComplaints, deleteComplaint } from '../../services/api';
import CopyTicketButton from './CopyTicketButton';

const PRIORITY_BADGES = {
  CRITICAL: 'bg-[#2e1818] text-[#f87171] border-[#592626]',
  HIGH: 'bg-[#291f16] text-[#fb923c] border-[#4a2e1d]',
  MEDIUM: 'bg-[#142622] text-[#2dd4bf] border-[#175249]',
  LOW: 'bg-[#122822] text-[#34d399] border-[#194d3f]',
};

const STATUS_STEPS = { SUBMITTED: 1, VERIFIED: 2, ASSIGNED: 3, IN_PROGRESS: 4, RESOLVED: 5, CLOSED: 5 };

export default function NotificationsModal({ isOpen, onClose, onNavigateToTicket, unreadCount = 0, onClearUnread }) {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [readIds, setReadIds] = useState([]);
  const [lastReadTime, setLastReadTime] = useState(0);

  const myEmail = (user?.email || '').toLowerCase().trim();
  const storageKey = `smartgov_read_ids_${myEmail}`;
  const lastReadTimeKey = `smartgov_last_read_time_${myEmail}`;

  useEffect(() => {
    if (isOpen) {
      loadLiveComplaints();
    }
  }, [isOpen, user]);

  useEffect(() => {
    const handleSync = () => {
      loadLiveComplaints();
    };
    window.addEventListener('smartgov_complaints_updated', handleSync);
    window.addEventListener('smartgov_notifications_read', handleSync);
    return () => {
      window.removeEventListener('smartgov_complaints_updated', handleSync);
      window.removeEventListener('smartgov_notifications_read', handleSync);
    };
  }, [user]);

  const loadLiveComplaints = async () => {
    setLoading(true);
    try {
      // Load persisted read tracking
      let storedReadIds = [];
      try {
        storedReadIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
      } catch (e) {
        storedReadIds = [];
      }
      const storedTime = parseInt(localStorage.getItem(lastReadTimeKey) || '0', 10);
      setReadIds(storedReadIds);
      setLastReadTime(storedTime);

      const all = await getComplaints();
      if (all && all.length > 0) {
        // Filter strictly for this citizen's complaints
        const mine = all.filter(c => (c.registered_email || '').toLowerCase().trim() === myEmail);
        setComplaints(mine);
      } else {
        setComplaints([]);
      }
    } catch (err) {
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  const isComplaintUnread = (c) => {
    if (readIds.includes(c.id) || readIds.includes(c.ticket_number)) {
      return false;
    }
    if (c.created_at) {
      const createdAtMs = new Date(c.created_at).getTime();
      if (createdAtMs <= lastReadTime) return false;
    }
    return true;
  };

  const handleMarkAllRead = () => {
    const allIds = complaints.map(c => c.id).concat(complaints.map(c => c.ticket_number));
    const now = Date.now();
    setReadIds(allIds);
    setLastReadTime(now);
    localStorage.setItem(storageKey, JSON.stringify(allIds));
    localStorage.setItem(lastReadTimeKey, now.toString());
    if (onClearUnread) onClearUnread();
    window.dispatchEvent(new Event('smartgov_notifications_read'));
  };

  const handleDeleteNotification = async (complaintId, ticketNumber, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Delete notification and complaint #${ticketNumber}?`)) return;

    try {
      await deleteComplaint(complaintId);
      setComplaints(prev => prev.filter(c => c.id !== complaintId && c.ticket_number !== ticketNumber));
      window.dispatchEvent(new Event('smartgov_complaints_updated'));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  // Listen for Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatTime = (d) => {
    if (!d) return 'Just now';
    const mins = Math.max(1, Math.floor((new Date() - new Date(d)) / 60000));
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
  };

  const activeUnreadCount = complaints.filter(isComplaintUnread).length;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[1px] transition-opacity duration-200"
      onClick={onClose}
    >
      <div 
        className="fixed top-16 sm:top-20 right-3 sm:right-6 z-50 w-[calc(100vw-1.5rem)] sm:w-full max-w-md bg-[#111317] rounded-3xl border border-[#23252d] shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-5.5rem)] sm:max-h-[calc(100vh-6.5rem)] animate-in slide-in-from-top-2 fade-in duration-200 cursor-default text-slate-100 ring-1 ring-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5 bg-[#0c2e28] border-b border-[#175249] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#175249] border border-[#2dd4bf]/40 flex items-center justify-center text-[#2dd4bf]">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Notifications</h3>
              <p className="text-[11px] text-[#88909d]">
                {user?.name ? `${user.name}'s complaint updates` : 'Complaint status updates'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeUnreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead} 
                className="text-[10px] bg-[#0e1014] hover:bg-[#181a20] text-[#2dd4bf] px-2.5 py-1 rounded-lg border border-[#23252d] flex items-center gap-1 font-semibold transition-all cursor-pointer shadow-xs"
              >
                <CheckCheck className="h-3 w-3" /> Mark All Read
              </button>
            )}
            <button 
              onClick={onClose} 
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-[#175249]/40 transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#0e1014]">
          {loading && (
            <div className="text-center py-8 text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-[#2dd4bf]" /> Loading notifications...
            </div>
          )}

          {!loading && complaints.length === 0 && (
            <div className="text-center py-12 px-6 space-y-2">
              <div className="h-12 w-12 rounded-2xl bg-[#111317] border border-[#23252d] flex items-center justify-center mx-auto text-slate-500">
                <Bell className="h-6 w-6" />
              </div>
              <h4 className="text-xs font-bold text-white">No Notifications</h4>
              <p className="text-[11px] text-[#88909d]">
                Submit a complaint to receive status and resolution updates.
              </p>
            </div>
          )}

          {!loading && complaints.map((c, idx) => {
            const step = STATUS_STEPS[c.status] || 1;
            const officer = c.municipality_head?.name ? `${c.municipality_head.name} (${c.municipality_head.designation})` : (c.assigned_department_name || 'Field Ops');
            const unread = isComplaintUnread(c);

            return (
              <div 
                key={c.id || idx} 
                className={`p-4 rounded-2xl border bg-[#111317] space-y-3 transition-all ${unread ? 'border-[#2dd4bf]/40 ring-1 ring-[#2dd4bf]/20 bg-[#0c2e28]/30' : 'border-[#23252d]'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {unread && (
                      <span className="h-2 w-2 rounded-full bg-[#2dd4bf] animate-ping" title="Unread update"></span>
                    )}
                    <CopyTicketButton ticketNumber={c.ticket_number} variant="badge" />
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PRIORITY_BADGES[c.priority] || 'bg-[#16181e] text-slate-400'}`}>
                      {c.priority || 'HIGH'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#88909d] font-mono">{formatTime(c.created_at)}</span>
                    <button 
                      onClick={(e) => handleDeleteNotification(c.id, c.ticket_number, e)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded-md transition-all"
                      title="Delete Notification"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{c.summary || c.original_text}</h4>
                  <p className="text-[11px] text-[#88909d] mt-1 leading-relaxed line-clamp-2">
                    {c.gov_agent_response || c.public_agent_response || `Field crew assigned. Target SLA: Within ${c.estimated_resolution_hours || 12} hours.`}
                  </p>
                </div>

                <div className="space-y-1.5 bg-[#0e1014] p-2.5 rounded-xl border border-[#23252d]">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-300">
                    <span className="text-[#2dd4bf] flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#2dd4bf] animate-pulse"></span>
                      <span>Step 0{step}/05 ({c.status})</span>
                    </span>
                    <span className="font-mono text-[#88909d]">SLA: {c.estimated_resolution_hours || 12}h</span>
                  </div>
                  <div className="w-full bg-[#111317] border border-[#23252d] rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full bg-[#2dd4bf] transition-all duration-500 shadow-[0_0_8px_#2dd4bf]" style={{ width: `${(step / 5) * 100}%` }} />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-[#88909d] pt-0.5">
                    <span>01 Log</span><span>02 Verify</span><span>03 Assign</span><span>04 Action</span><span>05 Resolve</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#23252d] text-[11px]">
                  <span className="text-[#88909d] truncate flex items-center gap-1 text-[10px] max-w-[200px]">
                    <UserCheck className="h-3 w-3 text-[#2dd4bf] flex-shrink-0" />
                    <span className="truncate">{officer}</span>
                  </span>
                  <button 
                    onClick={() => {
                      // Mark this notification as read
                      const updatedReadIds = [...readIds, c.id, c.ticket_number].filter(Boolean);
                      const uniqueReadIds = [...new Set(updatedReadIds)];
                      setReadIds(uniqueReadIds);
                      localStorage.setItem(storageKey, JSON.stringify(uniqueReadIds));
                      // Dispatch event so Header badge count updates
                      window.dispatchEvent(new Event('smartgov_notifications_read'));
                      onClose();
                      if (onNavigateToTicket) onNavigateToTicket(c.ticket_number);
                    }} 
                    className="text-[#2dd4bf] hover:underline font-bold flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <span>View Details</span> <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 bg-[#111317] border-t border-[#23252d] text-center flex-shrink-0">
          <button 
            onClick={() => { onClose(); if (onNavigateToTicket) onNavigateToTicket(null); }} 
            className="text-xs text-[#2dd4bf] hover:text-[#5eead4] hover:underline font-bold cursor-pointer transition-colors"
          >
            Go to Track & History Tab →
          </button>
        </div>
      </div>
    </div>
  );
}

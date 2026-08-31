import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Clock, 
  MapPin, 
  Tag, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  FileText, 
  AlertCircle, 
  UserCheck, 
  Building2, 
  Mail, 
  Phone, 
  Trash2, 
  Globe, 
  User,
  Filter,
  X,
  SlidersHorizontal,
  Layers
} from 'lucide-react';
import { getComplaints, getComplaintDetails, deleteComplaint, deleteUserComplaints } from '../../services/api';
import { REALISTIC_INDIAN_COMPLAINTS } from '../../services/mockData';
import { useAuth } from '../../context/AuthContext';
import CopyTicketButton from '../common/CopyTicketButton';
import ResolutionTimeline from '../common/ResolutionTimeline';

const INDIAN_CITIZEN_NAMES = [
  "Suresh Reddy", "Rajesh Verma", "Harish Chandra Patel", "Anand Vardhan",
  "Manish Tiwari", "Kiranmai Reddy", "Tarun Tej", "Vikas Mehra",
  "Anita Desai", "Pooja Deshmukh", "Sunita Agrawal", "Deepa Banerjee",
  "Siddharth Malhotra", "Bhavna Chawla", "Mohammed Zeeshan", "Swati Sengupta",
  "Vikram Kulkarni", "Kavita Srinivasan", "Meenakshi Sundaram", "Sneha Kulkarni",
  "Divya Narayanan", "Pradeep Joshi", "Ananya Bhattacharya", "Farida Begum",
  "Priya Patel", "Lakshmi Priya G", "Gautam Singhania", "Pallavi Sharma",
  "Raghavendra Rao", "Sanjana Reddy", "Ashish Saxena", "Vinay Mohan",
  "Syed Farhan Quadri", "Venkat Ramana Rao", "Karthik Subramanian", "Shreya Ghoshal", "Chetan Bhagat"
];

const getCitizenName = (c) => {
  if (c.citizen_name && c.citizen_name !== 'Citizen' && c.citizen_name.trim() !== '') {
    return c.citizen_name.trim();
  }
  // Lookup matching mock data by ticket number or text or address
  const match = REALISTIC_INDIAN_COMPLAINTS.find(
    sc => sc.ticket_number === c.ticket_number || 
          (sc.address && c.address && sc.address.toLowerCase() === c.address.toLowerCase()) ||
          (sc.original_text && c.original_text && sc.original_text.slice(0, 30) === c.original_text.slice(0, 30))
  );
  if (match && match.citizen_name) {
    return match.citizen_name;
  }
  // Extract from email
  if (c.registered_email && c.registered_email.includes('@')) {
    const prefix = c.registered_email.split('@')[0];
    if (!prefix.toLowerCase().startsWith('citizen')) {
      return prefix.replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  }
  // Deterministic fallback by ticket number
  let hash = 0;
  const str = c.ticket_number || c.id || c.address || 'complaint';
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) % INDIAN_CITIZEN_NAMES.length;
  }
  return INDIAN_CITIZEN_NAMES[Math.abs(hash)];
};

const STATUS_COLORS = {
  ASSIGNED: 'bg-[#142622] text-[#2dd4bf] border-[#175249]',
  IN_PROGRESS: 'bg-[#291f16] text-[#fb923c] border-[#4a2e1d]',
  RESOLVED: 'bg-[#0c2e28] text-[#2dd4bf] border-[#175249]',
  CLOSED: 'bg-[#16181e] text-slate-400 border-[#23252d]',
  SUBMITTED: 'bg-[#1e2029] text-[#93c5fd] border-[#2b354d]',
  VERIFIED: 'bg-[#142622] text-[#34d399] border-[#194d3f]',
  PENDING: 'bg-[#20182c] text-[#c084fc] border-[#3e265c]',
  REJECTED: 'bg-[#2e1818] text-[#f87171] border-[#592626]',
};

const PRIORITY_COLORS = {
  CRITICAL: 'bg-[#2e1818] text-[#f87171] border-[#592626]',
  HIGH: 'bg-[#291f16] text-[#fb923c] border-[#4a2e1d]',
  MEDIUM: 'bg-[#142622] text-[#2dd4bf] border-[#175249]',
  LOW: 'bg-[#122822] text-[#34d399] border-[#194d3f]',
};

const HEAD_PHOTO_MAP = {
  "Dr. Uppalapati Venkata Suryanarayana Prabhas Raju": "/images/heads/prabhas.jpg",
  "Mr. Nandamuri Taraka Rama Rao Jr": "/images/heads/ntr.jpg",
  "Mr. Ram Charan Tej Konidela": "/images/heads/ramcharan.jpg",
  "Dr. Allu Arjun": "/images/heads/alluarjun.jpg",
  "Mr. Mahesh Babu Ghattamaneni": "/images/heads/maheshbabu.jpg"
};

const PRIORITY_ORDER = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1
};

export default function TrackHistory({ latestComplaint }) {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState(() => {
    try {
      const cached = sessionStorage.getItem('smartgov_cached_complaints');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return REALISTIC_INDIAN_COMPLAINTS;
  });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [viewScope, setViewScope] = useState('ALL');

  // Search & Filter Bar States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');

  useEffect(() => {
    loadHistory(false);

    const handleSync = () => {
      loadHistory(false);
    };
    window.addEventListener('smartgov_complaints_updated', handleSync);
    return () => {
      window.removeEventListener('smartgov_complaints_updated', handleSync);
    };
  }, [user]);

  useEffect(() => {
    if (latestComplaint) {
      const ticketNum = latestComplaint.ticket_number || latestComplaint.id;
      if (ticketNum) {
        setSearchQuery(ticketNum);
        // Switch to MINE tab by default so user sees their complaint, or ALL if not logged in
        setViewScope(user ? 'MINE' : 'ALL');
        setExpandedId(latestComplaint.id || ticketNum);
      }
      setComplaints((prev) => {
        const exists = prev.some((c) => c.id === latestComplaint.id || c.ticket_number === latestComplaint.ticket_number);
        if (exists) return prev;
        if (latestComplaint.category) {
          const updated = [latestComplaint, ...prev];
          try {
            sessionStorage.setItem('smartgov_cached_complaints', JSON.stringify(updated));
            sessionStorage.setItem('smartgov_complaints_count', updated.length.toString());
          } catch {}
          return updated;
        }
        return prev;
      });
    }
  }, [latestComplaint, user]);

  const loadHistory = async (showLoading = false) => {
    if (showLoading) setHistoryLoading(true);
    try {
      const data = await getComplaints();
      if (data && Array.isArray(data) && data.length > 0) {
        setComplaints(data);
        try {
          sessionStorage.setItem('smartgov_cached_complaints', JSON.stringify(data));
          sessionStorage.setItem('smartgov_complaints_count', data.length.toString());
        } catch {}
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleDeleteSingle = async (complaintId, ticketNumber, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete complaint #${ticketNumber}?`)) return;

    try {
      await deleteComplaint(complaintId);
      setComplaints((prev) => {
        const updated = prev.filter((c) => c.id !== complaintId && c.ticket_number !== ticketNumber);
        try {
          sessionStorage.setItem('smartgov_cached_complaints', JSON.stringify(updated));
          sessionStorage.setItem('smartgov_complaints_count', updated.length.toString());
        } catch {}
        return updated;
      });
      window.dispatchEvent(new Event('smartgov_complaints_updated'));
    } catch (err) {
      console.error('Error deleting complaint:', err);
      alert('Failed to delete complaint.');
    }
  };

  const handleDeleteAllMyComplaints = async () => {
    const userEmail = user?.email || 'citizen@smartcity.gov';
    if (!window.confirm(`Are you sure you want to delete all complaint history for ${userEmail}?`)) return;

    try {
      await deleteUserComplaints(userEmail);
      setComplaints((prev) => {
        const updated = prev.filter((c) => c.registered_email?.toLowerCase() !== userEmail.toLowerCase());
        try {
          sessionStorage.setItem('smartgov_cached_complaints', JSON.stringify(updated));
          sessionStorage.setItem('smartgov_complaints_count', updated.length.toString());
        } catch {}
        return updated;
      });
      window.dispatchEvent(new Event('smartgov_complaints_updated'));
      alert(`Complaints for ${userEmail} cleared.`);
    } catch (err) {
      console.error('Error clearing history:', err);
      alert('Failed to clear history.');
    }
  };

  const handleClearAllHistory = handleDeleteAllMyComplaints;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedStatus('ALL');
    setSelectedPriority('ALL');
    setSortBy('NEWEST');
  };

  const hasActiveFilters = searchQuery.trim() !== '' || selectedCategory !== 'ALL' || selectedStatus !== 'ALL' || selectedPriority !== 'ALL' || sortBy !== 'NEWEST';

  // Filtered and Sorted Complaints
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      // 1. View Scope Filter
      if (viewScope === 'MINE') {
        const myEmail = (user?.email || 'citizen@smartcity.gov').toLowerCase();
        if (c.registered_email?.toLowerCase() !== myEmail) return false;
      }

      // 2. Search Query Matching (ID, #42, keyword, ward/address, citizen name, or department)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim().replace(/^#/, '');
        const idStr = String(c.id || '').toLowerCase();
        const ticketStr = String(c.ticket_number || '').toLowerCase();
        const textStr = String(c.original_text || '').toLowerCase();
        const summaryStr = String(c.summary || '').toLowerCase();
        const categoryStr = String(c.category || '').toLowerCase();
        const subcatStr = String(c.subcategory || '').toLowerCase();
        const addrStr = String(c.address || '').toLowerCase();
        const wardStr = String(c.ward || '').toLowerCase();
        const citizenStr = String(c.citizen_name || '').toLowerCase();
        const emailStr = String(c.registered_email || '').toLowerCase();
        const deptStr = String(c.assigned_department_name || '').toLowerCase();
        const officerStr = String(c.municipality_head?.name || '').toLowerCase();

        const matchesSearch = 
          idStr.includes(q) ||
          ticketStr.includes(q) ||
          textStr.includes(q) ||
          summaryStr.includes(q) ||
          categoryStr.includes(q) ||
          subcatStr.includes(q) ||
          addrStr.includes(q) ||
          wardStr.includes(q) ||
          citizenStr.includes(q) ||
          emailStr.includes(q) ||
          deptStr.includes(q) ||
          officerStr.includes(q);

        if (!matchesSearch) return false;
      }

      // 3. Category Filter
      if (selectedCategory !== 'ALL') {
        const cCat = (c.category || '').toLowerCase();
        const sCat = selectedCategory.toLowerCase();
        if (!cCat.includes(sCat) && !sCat.includes(cCat)) {
          return false;
        }
      }

      // 4. Status Filter
      if (selectedStatus !== 'ALL') {
        if (c.status?.toUpperCase() !== selectedStatus.toUpperCase()) {
          return false;
        }
      }

      // 5. Priority Filter
      if (selectedPriority !== 'ALL') {
        if (c.priority?.toUpperCase() !== selectedPriority.toUpperCase()) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // 6. Sorting Logic
      if (sortBy === 'NEWEST') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      if (sortBy === 'OLDEST') {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }
      if (sortBy === 'PRIORITY_HIGH') {
        const pA = PRIORITY_ORDER[a.priority?.toUpperCase()] || 0;
        const pB = PRIORITY_ORDER[b.priority?.toUpperCase()] || 0;
        return pB - pA;
      }
      if (sortBy === 'PRIORITY_LOW') {
        const pA = PRIORITY_ORDER[a.priority?.toUpperCase()] || 0;
        const pB = PRIORITY_ORDER[b.priority?.toUpperCase()] || 0;
        return pA - pB;
      }
      if (sortBy === 'SLA') {
        const sA = a.estimated_resolution_hours || 24;
        const sB = b.estimated_resolution_hours || 24;
        return sA - sB;
      }
      return 0;
    });
  }, [complaints, viewScope, searchQuery, selectedCategory, selectedStatus, selectedPriority, sortBy, user]);

  return (
    <div className="w-full space-y-4 text-slate-100 font-sans animate-in fade-in duration-200">

      {/* ─── 1. SCOPE TOGGLE BAR (ALL COMPLAINTS vs MY COMPLAINTS) ─── */}
      <div className="bg-[#111317] p-2.5 sm:p-3 rounded-2xl border border-[#23252d] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Sleek Segmented Scope Toggle Buttons */}
        <div className="relative inline-flex items-center bg-[#0a0c0f] p-1 rounded-xl border border-[#23252d] shadow-inner select-none gap-1">
          <button
            type="button"
            onClick={() => setViewScope('ALL')}
            className={`relative flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-[0.97] ${
              viewScope === 'ALL'
                ? 'bg-[#0c2e28] text-[#2dd4bf] border border-[#175249] shadow-sm font-bold scale-[1.01]'
                : 'text-slate-400 hover:text-white hover:bg-[#14161d] border border-transparent font-medium'
            }`}
          >
            <Globe className={`h-3.5 w-3.5 transition-transform duration-200 ${viewScope === 'ALL' ? 'text-[#2dd4bf] scale-110' : 'text-slate-500'}`} />
            <span>All Complaints</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-all duration-200 ${
              viewScope === 'ALL'
                ? 'bg-[#16181e] text-[#2dd4bf] border border-[#23252d]'
                : 'bg-[#12141a] text-slate-400 border border-[#1c1e25]'
            }`}>
              {complaints.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewScope('MINE')}
            className={`relative flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-[0.97] ${
              viewScope === 'MINE'
                ? 'bg-[#0c2e28] text-[#2dd4bf] border border-[#175249] shadow-sm font-bold scale-[1.01]'
                : 'text-slate-400 hover:text-white hover:bg-[#14161d] border border-transparent font-medium'
            }`}
          >
            <User className={`h-3.5 w-3.5 transition-transform duration-200 ${viewScope === 'MINE' ? 'text-[#2dd4bf] scale-110' : 'text-slate-500'}`} />
            <span>My Complaints</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-all duration-200 ${
              viewScope === 'MINE'
                ? 'bg-[#16181e] text-[#2dd4bf] border border-[#23252d]'
                : 'bg-[#12141a] text-slate-400 border border-[#1c1e25]'
            }`}>
              {complaints.filter(c => c.registered_email?.toLowerCase() === (user?.email || 'citizen@smartcity.gov').toLowerCase()).length}
            </span>
          </button>
        </div>

        {/* Right Action Icons & Refresh Button */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          
          {/* Refresh List Button with text */}
          <button
            type="button"
            onClick={() => loadHistory(true)}
            disabled={historyLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 bg-[#0e1014] hover:bg-[#181a20] text-slate-300 hover:text-white border border-[#23252d] rounded-xl text-xs font-semibold transition-all duration-200 shadow-xs disabled:opacity-50 cursor-pointer active:scale-[0.97]"
            title="Refresh list"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#2dd4bf] ${historyLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Delete All My Complaints Button (Only shown in My Complaints tab) */}
          {viewScope === 'MINE' && complaints.some(c => c.registered_email?.toLowerCase() === (user?.email || 'citizen@smartcity.gov').toLowerCase()) && (
            <button
              type="button"
              onClick={handleDeleteAllMyComplaints}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all duration-200 shadow-xs cursor-pointer active:scale-[0.97]"
              title="Delete all my complaints"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete All</span>
            </button>
          )}

        </div>

      </div>


      {/* ─── 2. SEARCH & MULTI-DROPDOWN FILTER BAR (UNDERNEATH TOGGLE) ─── */}
      <div className="bg-[#111317] p-4 sm:p-5 rounded-2xl border border-[#23252d] shadow-sm space-y-3">
        
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          
          {/* Search Input Box */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID (#42) or keyword..."
              className="w-full bg-[#0e1014] border border-[#23252d] rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#2dd4bf] focus:ring-1 focus:ring-[#2dd4bf] transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-shrink-0">
            
            {/* 1. Category Dropdown */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full appearance-none bg-[#0e1014] border border-[#23252d] rounded-xl pl-3 pr-7 py-2.5 text-xs text-white focus:outline-none focus:border-[#2dd4bf] font-medium cursor-pointer shadow-xs"
              >
                <option value="ALL">All Categories</option>
                <option value="Sanitation">Sanitation & Waste</option>
                <option value="Water">Water & Sewage</option>
                <option value="Roads">Roads & Infrastructure</option>
                <option value="Electrical">Electrical & Power</option>
                <option value="Traffic">Traffic & Safety</option>
              </select>
              <ChevronDown className="h-3.5 w-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* 2. Status Dropdown */}
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full appearance-none bg-[#0e1014] border border-[#23252d] rounded-xl pl-3 pr-7 py-2.5 text-xs text-white focus:outline-none focus:border-[#2dd4bf] font-medium cursor-pointer shadow-xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="VERIFIED">Verified</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <ChevronDown className="h-3.5 w-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* 3. Priority Dropdown */}
            <div className="relative">
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full appearance-none bg-[#0e1014] border border-[#23252d] rounded-xl pl-3 pr-7 py-2.5 text-xs text-white focus:outline-none focus:border-[#2dd4bf] font-medium cursor-pointer shadow-xs"
              >
                <option value="ALL">All Priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
              <ChevronDown className="h-3.5 w-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* 4. Sort By Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full appearance-none bg-[#0e1014] border border-[#23252d] rounded-xl pl-3 pr-7 py-2.5 text-xs text-white focus:outline-none focus:border-[#2dd4bf] font-medium cursor-pointer shadow-xs"
              >
                <option value="NEWEST">Newest First</option>
                <option value="OLDEST">Oldest First</option>
                <option value="PRIORITY_HIGH">Highest Priority</option>
                <option value="PRIORITY_LOW">Lowest Priority</option>
                <option value="SLA">Shortest SLA</option>
              </select>
              <ChevronDown className="h-3.5 w-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

          </div>

        </div>

        {/* Active Filter Chips & Reset Row */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-[#23252d] text-xs">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
              <span>Active filters:</span>
              {searchQuery && (
                <span className="bg-[#0e1014] border border-[#23252d] text-[#2dd4bf] px-2 py-0.5 rounded-md font-mono">
                  "{searchQuery}"
                </span>
              )}
              {selectedCategory !== 'ALL' && (
                <span className="bg-[#0e1014] border border-[#23252d] text-slate-300 px-2 py-0.5 rounded-md">
                  {selectedCategory}
                </span>
              )}
              {selectedStatus !== 'ALL' && (
                <span className="bg-[#0e1014] border border-[#23252d] text-slate-300 px-2 py-0.5 rounded-md">
                  {selectedStatus}
                </span>
              )}
              {selectedPriority !== 'ALL' && (
                <span className="bg-[#0e1014] border border-[#23252d] text-slate-300 px-2 py-0.5 rounded-md">
                  {selectedPriority}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={clearAllFilters}
              className="px-2.5 py-1 bg-[#0e1014] hover:bg-[#181a20] text-slate-300 hover:text-[#2dd4bf] border border-[#23252d] rounded-lg text-xs font-medium flex items-center gap-1 transition-all"
            >
              <X className="h-3 w-3" />
              <span>Reset Filters</span>
            </button>
          </div>
        )}

      </div>

      {/* ─── 3. COMPLAINTS LIST FEED ─── */}
      <div key={viewScope} className="space-y-3 animate-tab-switch">
        {historyLoading && filteredComplaints.length === 0 ? (
          <div className="bg-[#111317] p-12 rounded-2xl border border-[#23252d] text-center text-slate-400 text-xs sm:text-sm flex flex-col items-center justify-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-[#2dd4bf]" />
            <span>Loading complaints from live database...</span>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="bg-[#111317] p-12 rounded-2xl border border-[#23252d] text-center text-slate-400 text-xs sm:text-sm space-y-3 flex flex-col items-center justify-center">
            <Layers className="h-9 w-9 text-slate-600 mx-auto" />
            <p className="font-bold text-white text-base">No complaints found</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              {hasActiveFilters 
                ? 'No complaints match your current search and filter criteria. Try adjusting or clearing filters.'
                : viewScope === 'MINE'
                  ? 'You have not submitted any complaints yet under this account. You can explore all city-wide public complaints.'
                  : 'No complaints logged in the system currently.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-4 py-2 bg-[#0c2e28] text-[#2dd4bf] border border-[#175249] rounded-xl text-xs font-bold hover:bg-[#113f37] transition-all cursor-pointer shadow-xs"
                >
                  Clear All Filters
                </button>
              )}
              {viewScope === 'MINE' && complaints.length > 0 && (
                <button
                  type="button"
                  onClick={() => { clearAllFilters(); setViewScope('ALL'); }}
                  className="px-4 py-2 bg-[#0c2e28] text-[#2dd4bf] border border-[#175249] rounded-xl text-xs font-bold hover:bg-[#113f37] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>View All City Complaints ({complaints.length})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => loadHistory(true)}
                className="px-4 py-2 bg-[#0e1014] text-slate-300 border border-[#23252d] hover:bg-[#181a20] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5 text-[#2dd4bf]" />
                <span>Refresh Live DB</span>
              </button>
            </div>
          </div>
        ) : (
          filteredComplaints.map((c) => (
            <div 
              key={c.id} 
              className={`border rounded-2xl overflow-hidden transition-all bg-[#111317] shadow-xs ${
                expandedId === c.id ? 'border-[#175249]' : 'border-[#23252d] hover:border-[#383b46]'
              }`}
            >
              {/* Row Summary Header */}
              <div 
                onClick={() => toggleExpand(c.id)}
                className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-[#15171c] transition-all text-left cursor-pointer select-none gap-3"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <CopyTicketButton ticketNumber={c.ticket_number} variant="badge" className="flex-shrink-0 mt-0.5 sm:mt-0" />
                  
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0 ${PRIORITY_COLORS[c.priority?.toUpperCase()] || 'bg-[#142622] text-[#2dd4bf] border-[#175249]'}`}>
                    {c.priority}
                  </span>

                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs sm:text-sm font-bold text-white truncate">
                      {c.summary || c.original_text}
                    </p>
                    <p className="text-[11px] text-[#88909d] truncate flex items-center gap-1.5 mt-0.5">
                      <MapPin className="h-3 w-3 text-slate-500 flex-shrink-0" />
                      <span>{c.address || c.ward || 'Ward 12'}</span>
                      <span>•</span>
                      <span className="text-[#2dd4bf] font-medium">{c.category || 'Civic Maintenance'}</span>
                      <span>•</span>
                      <span className="text-slate-300 font-medium">{getCitizenName(c)}</span>
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2.5 flex-shrink-0 ml-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_COLORS[c.status?.toUpperCase()] || 'bg-[#16181e] text-slate-400 border-[#23252d]'}`}>
                    {c.status}
                  </span>
                  
                  <span className="text-[11px] text-slate-400 hidden sm:inline font-mono">
                    {formatDate(c.created_at)}
                  </span>
                  
                  {viewScope === 'MINE' && (
                    <button
                      onClick={(e) => handleDeleteSingle(c.id, c.ticket_number, e)}
                      className="p-1 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                      title="Delete this complaint"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}

                  <div className="p-1 text-slate-400">
                    {expandedId === c.id ? (
                      <ChevronUp className="h-4 w-4 text-[#2dd4bf]" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Detail Panel */}
              {expandedId === c.id && (
                <div className="px-5 pb-5 pt-3 border-t border-[#23252d] bg-[#0e1014] space-y-4 animate-in fade-in duration-150">
                  
                  {/* Live 5-Stage Resolution Pipeline Stepper */}
                  <ResolutionTimeline complaint={c} />

                  {/* Estimated Resolution SLA Banner */}
                  <div className="bg-[#0c2e28] border border-[#175249] rounded-xl p-3.5 flex items-center justify-between text-xs text-white shadow-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[#2dd4bf] flex-shrink-0" />
                      <span>Estimated Resolution Window: <strong className="font-extrabold text-[#2dd4bf] font-mono">{c.estimated_resolution_hours ? `Within ${c.estimated_resolution_hours} Hours` : '12–24 Hours'}</strong></span>
                    </div>
                    <span className="text-[#2dd4bf] font-semibold hidden sm:inline">{c.assigned_department_name || c.category}</span>
                  </div>

                  {/* Metadata 3-Column Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-[#16181e] p-3 rounded-xl border border-[#23252d]">
                      <span className="text-[#88909d] font-semibold block mb-1 flex items-center gap-1">
                        <Tag className="h-3 w-3 text-[#2dd4bf]" /> Category & Subcategory
                      </span>
                      <p className="text-white font-bold">{c.category || '—'}</p>
                      <p className="text-[#2dd4bf] text-[11px] font-medium">{c.subcategory || 'General Civic Work'}</p>
                    </div>

                    <div className="bg-[#16181e] p-3 rounded-xl border border-[#23252d]">
                      <span className="text-[#88909d] font-semibold block mb-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-[#2dd4bf]" /> Ward & Location
                      </span>
                      <p className="text-slate-200 font-semibold">{c.address || 'Hyderabad City'}</p>
                      <p className="text-slate-400 text-[11px]">{c.ward || 'Ward 12'}</p>
                    </div>

                    <div className="bg-[#16181e] p-3 rounded-xl border border-[#23252d]">
                      <span className="text-[#88909d] font-semibold block mb-1 flex items-center gap-1">
                        <User className="h-3 w-3 text-[#2dd4bf]" /> Citizen Information
                      </span>
                      <p className="text-slate-200 font-semibold">{getCitizenName(c)}</p>
                      <p className="text-slate-400 text-[11px] font-mono">{c.registered_email || 'citizen@smartcity.gov'}</p>
                    </div>
                  </div>

                  {/* Complaint Original Statement */}
                  <div className="text-xs">
                    <span className="text-[#88909d] font-semibold block mb-1.5">Original Citizen Description</span>
                    <p className="text-slate-200 italic bg-[#16181e] p-3.5 rounded-xl border border-[#23252d] leading-relaxed">
                      "{c.original_text}"
                    </p>
                  </div>

                  {/* Dual Agent Output Boxes if Available */}
                  {(c.public_agent_response || c.gov_agent_response) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {c.public_agent_response && (
                        <div className="bg-[#16181e] border border-[#23252d] p-3.5 rounded-xl space-y-1.5">
                          <span className="text-[10px] font-mono font-bold text-[#2dd4bf] uppercase tracking-wider block">
                            AI Vision Inspection Assessment
                          </span>
                          <p className="text-slate-300 whitespace-pre-line text-[11px] leading-relaxed">
                            {c.public_agent_response}
                          </p>
                        </div>
                      )}

                      {c.gov_agent_response && (
                        <div className="bg-[#16181e] border border-[#23252d] p-3.5 rounded-xl space-y-1.5">
                          <span className="text-[10px] font-mono font-bold text-[#fb923c] uppercase tracking-wider block">
                            Municipal Work Order Directive
                          </span>
                          <p className="text-slate-300 whitespace-pre-line text-[11px] leading-relaxed">
                            {c.gov_agent_response}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Assigned Municipality Head Officer Card */}
                  {c.municipality_head && (
                    <div className="bg-[#16181e] border border-[#23252d] rounded-xl p-4 space-y-2.5">
                      <span className="font-bold text-[#88909d] uppercase tracking-wider text-[10px] flex items-center gap-1.5 border-b border-[#23252d] pb-2">
                        <UserCheck className="h-3.5 w-3.5 text-[#2dd4bf]" />
                        Assigned Municipal Department Officer
                      </span>
                      <div className="flex flex-col sm:flex-row items-center gap-3.5">
                        <img
                          src={c.municipality_head.photo_url || HEAD_PHOTO_MAP[c.municipality_head.name] || "/images/heads/prabhas.jpg"}
                          alt={c.municipality_head.name}
                          onError={(e) => {
                            if (HEAD_PHOTO_MAP[c.municipality_head.name] && e.currentTarget.src !== HEAD_PHOTO_MAP[c.municipality_head.name]) {
                              e.currentTarget.src = HEAD_PHOTO_MAP[c.municipality_head.name];
                            }
                          }}
                          className="w-12 h-12 rounded-full object-cover border-2 border-[#2dd4bf] shadow-sm flex-shrink-0"
                        />
                        <div className="space-y-0.5 text-center sm:text-left text-xs">
                          <h4 className="font-bold text-white">{c.municipality_head.name}</h4>
                          <p className="font-medium text-[#2dd4bf] text-[11px]">{c.municipality_head.designation}</p>
                          <p className="text-[11px] text-[#88909d]">
                            {c.municipality_head.department_name} • {c.municipality_head.assigned_ward}
                          </p>
                          <div className="pt-1 flex flex-wrap gap-3 text-[11px] text-slate-400 justify-center sm:justify-start font-mono">
                            {c.municipality_head.contact_email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3 text-[#2dd4bf]" />
                                {c.municipality_head.contact_email}
                              </span>
                            )}
                            {c.municipality_head.contact_phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-[#2dd4bf]" />
                                {c.municipality_head.contact_phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          ))
        )}
      </div>

    </div>
  );
}

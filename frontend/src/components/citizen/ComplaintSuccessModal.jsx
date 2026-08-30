import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Mail, 
  Phone, 
  UserCheck, 
  ArrowRight, 
  X, 
  Copy, 
  Check, 
  Tag, 
  Building2, 
  Scan, 
  FileText 
} from 'lucide-react';
import { SERVER_ORIGIN } from '../../services/api';

const CLASS_TITLES = {
  water_leakage: 'Water Main Leakage & Drainage Overflow',
  garbage_overflow: 'Garbage Overflow & Waste Dump',
  pothole: 'Road Pothole & Surface Crater',
  damaged_streetlight: 'Streetlight Defect & Electrical Hazard',
  road_damage: 'Road Structural Damage',
  illegal_parking: 'Parking Obstruction & Traffic Block'
};

const HEAD_PHOTO_MAP = {
  "Dr. Uppalapati Venkata Suryanarayana Prabhas Raju": "/images/heads/prabhas.jpg",
  "Mr. Nandamuri Taraka Rama Rao Jr": "/images/heads/ntr.jpg",
  "Mr. Ram Charan Tej Konidela": "/images/heads/ramcharan.jpg",
  "Dr. Allu Arjun": "/images/heads/alluarjun.jpg",
  "Mr. Mahesh Babu Ghattamaneni": "/images/heads/maheshbabu.jpg"
};

export default function ComplaintSuccessModal({ isOpen, onClose, complaint, uploadedImagePreview, onNavigateToHistory }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !complaint) return null;

  const head = complaint.municipality_head;
  const hours = complaint.estimated_resolution_hours || 12;
  const imageUrl = complaint.image_url ? (complaint.image_url.startsWith('http') ? complaint.image_url : `${SERVER_ORIGIN}${complaint.image_url}`) : uploadedImagePreview;

  // Extract vision detections if available
  const visionDets = complaint.vision_detections || [];
  const primaryDetection = visionDets.length > 0 ? visionDets[0] : null;
  
  // High-accuracy fallback based on actual classified category
  const rawClass = primaryDetection?.detected_class || (
    complaint.category === 'Sanitation & Waste' ? 'garbage_overflow' :
    complaint.category === 'Water & Sewage' ? 'water_leakage' :
    complaint.category === 'Roads & Infrastructure' ? 'pothole' :
    complaint.category === 'Electrical & Power' ? 'damaged_streetlight' :
    complaint.category === 'Traffic & Safety' ? 'illegal_parking' : 'garbage_overflow'
  );

  const displayProblemTitle = CLASS_TITLES[rawClass] || complaint.subcategory || complaint.category || 'Civic Defect';
  const detectionConfidence = primaryDetection?.confidence 
    ? (primaryDetection.confidence * 100).toFixed(0) 
    : '96';

  // Calculate dynamic bounding box percentage style ensuring full visibility without clipping
  const box = primaryDetection?.bounding_boxes?.[0];
  const imgW = primaryDetection?.img_width || 800;
  const imgH = primaryDetection?.img_height || 600;

  let boxStyle = { left: '5%', top: '5%', width: '90%', height: '90%' };
  if (box && box.x2 > box.x1 && box.y2 > box.y1 && imgW > 0 && imgH > 0) {
    const rawLeft = (box.x1 / imgW) * 100;
    const rawTop = (box.y1 / imgH) * 100;
    const rawW = ((box.x2 - box.x1) / imgW) * 100;
    const rawH = ((box.y2 - box.y1) / imgH) * 100;

    const pad = 3;
    const left = Math.max(1, rawLeft - pad);
    const top = Math.max(1, rawTop - pad);
    const width = Math.min(98 - left, rawW + pad * 2);
    const height = Math.min(98 - top, rawH + pad * 2);

    boxStyle = {
      left: `${left}%`,
      top: `${top}%`,
      width: `${width}%`,
      height: `${height}%`
    };
  }

  const copyTicket = () => {
    navigator.clipboard.writeText(complaint.ticket_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const priorityColor = 
    complaint.priority === 'CRITICAL' ? 'bg-rose-500/15 text-rose-300 border-rose-500/40' :
    complaint.priority === 'HIGH' ? 'bg-amber-500/15 text-amber-300 border-amber-500/40' :
    'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Modal Dialog Card */}
      <div 
        className="bg-[#14161b] w-full max-w-4xl rounded-3xl shadow-2xl border border-[#23252d] overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* ── 1. Top Header Banner ── */}
        <div className="bg-[#111317] border-b border-[#23252d] px-6 sm:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-[#0c2e28] border border-[#175249] flex items-center justify-center text-[#2dd4bf] flex-shrink-0 shadow-sm">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#2dd4bf] uppercase tracking-wider">
                  Complaint Registered
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#2dd4bf]"></span>
                <span className="text-[11px] text-[#88909d] font-medium">Ticket Created</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Submitted Successfully
              </h2>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl bg-[#16181e] hover:bg-[#1f222a] border border-[#23252d] transition-all cursor-pointer"
            title="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── 2. Scrollable Body with Clean Balanced Layout ── */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-5 text-xs text-slate-200">

          {/* Top Summary Bar: Ticket, Estimated Resolution Time, Priority & Status */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 bg-[#111317] rounded-2xl border border-[#23252d]">
            
            {/* 1. Ticket Number with Small Inline Copy Icon */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Ticket:</span>
              <div className="flex items-center gap-2 bg-[#0c2e28] px-3 py-1.5 rounded-xl border border-[#175249]">
                <span className="font-mono font-bold text-xs text-[#2dd4bf] tracking-wide">
                  {complaint.ticket_number}
                </span>
                <button 
                  type="button"
                  onClick={copyTicket}
                  className="text-slate-400 hover:text-[#5eead4] hover:scale-110 transition-all cursor-pointer p-0.5"
                  title={copied ? "Copied!" : "Copy ticket ID"}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-[#2dd4bf]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* 2. Estimated Resolution Window */}
            <div className="flex items-center gap-2 bg-[#0c2e28] px-3.5 py-1.5 rounded-xl border border-[#175249] text-[#2dd4bf]">
              <Clock className="h-3.5 w-3.5 text-[#2dd4bf] flex-shrink-0" />
              <span>Resolution: <strong className="font-mono font-bold text-[#2dd4bf]">{complaint.estimated_resolution_hours ? `Within ${complaint.estimated_resolution_hours} Hours` : '12–24 Hours'}</strong></span>
            </div>

            {/* 3. Priority & Status Badges */}
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border ${priorityColor}`}>
                {complaint.priority || 'HIGH'} PRIORITY
              </span>
              <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-[#0c2e28] text-[#2dd4bf] border border-[#175249]">
                {complaint.status || 'ASSIGNED'}
              </span>
            </div>

          </div>

          {/* ── ASSIGNED OFFICER SECTION ── */}
          {head && (
            <div className="bg-[#111317] border border-[#23252d] rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
              
              {/* Officer Section Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#23252d] pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-[#0c2e28] border border-[#175249] flex items-center justify-center text-[#2dd4bf]">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Assigned Municipal Officer
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-[#0c2e28] text-[#2dd4bf] border border-[#175249] px-3 py-1 rounded-xl flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-rose-400" />
                    <span>{head.assigned_ward || 'Ward 12 - Jubilee Zone'}</span>
                  </span>
                </div>
              </div>

              {/* Officer Profile Details */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                
                {/* Large Portrait Avatar with Status Ring */}
                <div className="relative flex-shrink-0">
                  <img 
                    src={head.photo_url || HEAD_PHOTO_MAP[head.name] || "/images/heads/prabhas.jpg"} 
                    alt={head.name} 
                    onError={(e) => {
                      if (HEAD_PHOTO_MAP[head.name] && e.currentTarget.src !== HEAD_PHOTO_MAP[head.name]) {
                        e.currentTarget.src = HEAD_PHOTO_MAP[head.name];
                      }
                    }}
                    className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-[#2dd4bf]/40 ring-offset-2 ring-offset-[#111317] shadow-md"
                  />
                  <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-[#2dd4bf] border-2 border-[#111317] shadow-xs" title="Officer Active On-Duty" />
                </div>

                {/* Officer Information */}
                <div className="flex-1 space-y-1.5 min-w-0">
                  <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                    {head.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-[#5eead4] bg-[#0c2e28] px-2.5 py-0.5 rounded-lg border border-[#175249]">
                      {head.designation}
                    </span>
                    <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-[#2dd4bf] flex-shrink-0" />
                      <span>{head.department_name}</span>
                    </span>
                  </div>
                  <p className="text-xs text-[#88909d]">
                    Overseeing on-site inspection and municipal resolution for this report.
                  </p>
                </div>

              </div>

              {/* Officer Direct Contact Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {head.contact_email && (
                  <a 
                    href={`mailto:${head.contact_email}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[#0e1014] hover:bg-[#16181e] border border-[#23252d] hover:border-[#175249] transition-all group"
                  >
                    <div className="p-2 rounded-lg bg-[#0c2e28] text-[#2dd4bf] group-hover:scale-105 transition-transform flex-shrink-0">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-[#88909d] block tracking-wider">Direct Email</span>
                      <span className="text-xs font-bold text-white group-hover:text-[#5eead4] font-mono truncate block">
                        {head.contact_email}
                      </span>
                    </div>
                  </a>
                )}

                {head.contact_phone && (
                  <a 
                    href={`tel:${head.contact_phone}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[#0e1014] hover:bg-[#16181e] border border-[#23252d] hover:border-[#175249] transition-all group"
                  >
                    <div className="p-2 rounded-lg bg-[#0c2e28] text-[#2dd4bf] group-hover:scale-105 transition-transform flex-shrink-0">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-[#88909d] block tracking-wider">Direct Desk Phone</span>
                      <span className="text-xs font-bold text-white group-hover:text-[#5eead4] font-mono break-all block">
                        {head.contact_phone}
                      </span>
                    </div>
                  </a>
                )}
              </div>

            </div>
          )}

          {/* ── ISSUE DETAILS & EVIDENCE PREVIEW SECTION ── */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Left: Issue Description & Department Routing */}
            <div className={`${imageUrl ? 'md:col-span-6' : 'md:col-span-12'} bg-[#111317] border border-[#23252d] rounded-2xl p-5 space-y-3.5`}>
              <div className="flex items-center justify-between border-b border-[#23252d] pb-2.5">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-[#2dd4bf]" />
                  Complaint Summary
                </span>
                <span className="text-xs text-slate-300 font-semibold flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-rose-400" />
                  <span>{complaint.address || 'Hyderabad'}</span>
                </span>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#88909d] font-semibold">Category:</span>
                  <span className="font-bold text-white bg-[#0e1014] px-3 py-1 rounded-xl border border-[#23252d]">
                    {complaint.category}
                  </span>
                </div>

                <div className="bg-[#0e1014] p-3.5 rounded-xl border border-[#23252d] text-slate-300 text-xs leading-relaxed">
                  "{complaint.original_text}"
                </div>

                <div className="p-3 rounded-xl bg-[#0c2e28]/60 border border-[#175249]/50 text-xs text-slate-300 leading-relaxed">
                  Dispatched to <strong className="text-white font-bold">{complaint.assigned_department_name || 'Municipal Works Department'}</strong> for on-site execution.
                </div>
              </div>
            </div>

            {/* Right: Attached Evidence Preview (if image exists) */}
            {imageUrl && (
              <div className="md:col-span-6 bg-[#111317] border border-[#23252d] rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-[#23252d] pb-2.5">
                  <span className="text-xs font-bold text-[#2dd4bf] uppercase tracking-wider flex items-center gap-1.5">
                    <Scan className="h-3.5 w-3.5" />
                    Uploaded Evidence
                  </span>
                  <span className="text-[10px] bg-[#0c2e28] text-[#5eead4] font-bold px-2.5 py-0.5 rounded-full border border-[#175249]">
                    AI Verified
                  </span>
                </div>

                <div className="relative rounded-xl overflow-hidden border border-[#23252d] bg-[#0a0c10] w-full max-h-48 flex items-center justify-center">
                  <img 
                    src={imageUrl} 
                    alt="Uploaded Evidence" 
                    className="w-full h-48 object-cover rounded-xl"
                  />
                </div>

                {/* Classification Result from Backend AI */}
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0c2e28]/60 border border-[#175249]/50">
                  <span className="h-2 w-2 rounded-full bg-[#2dd4bf] flex-shrink-0 animate-pulse" />
                  <span className="text-xs text-slate-200">
                    Classified as <strong className="text-[#5eead4]">{complaint.category || 'Civic Issue'}</strong>
                    {complaint.subcategory && complaint.subcategory !== complaint.category && (
                      <span className="text-[#88909d]"> — {complaint.subcategory}</span>
                    )}
                  </span>
                </div>
              </div>
            )}

          </div>

          {/* Email Notification Note */}
          <div className="p-3.5 rounded-2xl bg-[#0c2e28] border border-[#175249] flex items-center gap-3 text-xs text-slate-200">
            <Mail className="h-4 w-4 text-[#2dd4bf] flex-shrink-0" />
            <span>
              Real-time SMS and email updates will be dispatched to <strong className="text-[#5eead4]">{complaint.registered_email || 'your registered email'}</strong>.
            </span>
          </div>

        </div>

        {/* ── 3. Footer Action Buttons ── */}
        <div className="px-6 sm:px-8 py-4 bg-[#111317] border-t border-[#23252d] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-300 hover:text-white bg-[#0e1014] hover:bg-[#181a20] border border-[#23252d] rounded-xl transition-all cursor-pointer"
          >
            Submit Another Complaint
          </button>

          <button
            onClick={() => {
              onClose();
              if (onNavigateToHistory) onNavigateToHistory(complaint);
            }}
            className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-[#2dd4bf] bg-[#0c2e28] hover:bg-[#113f37] border border-[#175249] rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Track Complaint Status</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

      </div>
    </div>
  );
}


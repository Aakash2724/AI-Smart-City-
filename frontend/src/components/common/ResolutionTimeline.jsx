import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  UserCheck, 
  Truck, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';

export default function ResolutionTimeline({ complaint }) {
  if (!complaint) return null;

  const rawStatus = (complaint.status || 'PENDING').toUpperCase();

  let activeIndex = 0;
  if (rawStatus === 'PENDING') {
    activeIndex = 1;
  } else if (rawStatus === 'ASSIGNED') {
    activeIndex = 2;
  } else if (rawStatus === 'IN_PROGRESS' || rawStatus === 'DISPATCHED') {
    activeIndex = 3;
  } else if (rawStatus === 'RESOLVED' || rawStatus === 'CLOSED') {
    activeIndex = 4;
  } else {
    activeIndex = 2;
  }

  const steps = [
    {
      id: 0,
      title: 'Grievance Submitted',
      subtitle: 'Citizen complaint logged with GPS coordinates',
      icon: CheckCircle2,
      time: complaint.created_at ? new Date(complaint.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Logged'
    },
    {
      id: 1,
      title: 'AI Pipeline Processed',
      subtitle: `NLP translated to English & Vision defect analyzed (${complaint.category || 'Roads'})`,
      icon: Sparkles,
      time: 'AI Verified'
    },
    {
      id: 2,
      title: 'Zonal Officer Assigned',
      subtitle: `Routed to ${complaint.municipality_head?.name || 'Department Officer'} (${complaint.department?.name || 'Public Works'})`,
      icon: UserCheck,
      time: activeIndex >= 2 ? 'Officer Notified' : 'Pending'
    },
    {
      id: 3,
      title: 'Field Squad Dispatched',
      subtitle: 'Municipal repair vehicle and maintenance crew on-site',
      icon: Truck,
      time: activeIndex >= 3 ? 'En Route' : 'Queued'
    },
    {
      id: 4,
      title: 'Verified & Resolved',
      subtitle: 'Defect rectified and citizen acknowledgement confirmation issued',
      icon: ShieldCheck,
      time: activeIndex >= 4 ? 'Completed' : `SLA ~${complaint.estimated_resolution_hours || 12}h`
    }
  ];

  return (
    <div className="w-full bg-[#0c0e12] p-5 rounded-2xl border border-[#23252d] shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-[#1d2027] pb-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-[#0c2e28] border border-[#175249] flex items-center justify-center text-[#2dd4bf]">
            <Clock className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Live Resolution Pipeline Tracker
          </span>
        </div>
        <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
          activeIndex === 4 
            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
            : 'bg-[#0c2e28] text-[#2dd4bf] border-[#175249]'
        }`}>
          Stage {activeIndex + 1} of 5 • {rawStatus}
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-[#2dd4bf] before:via-[#175249] before:to-slate-200 dark:before:to-[#23252d]">
        {steps.map((step) => {
          const isPassed = step.id < activeIndex;
          const isCurrent = step.id === activeIndex;
          const isPending = step.id > activeIndex;
          const StepIcon = step.icon;

          return (
            <div key={step.id} className="relative flex items-start justify-between gap-3 group">
              <div className={`absolute -left-6 top-0.5 h-6 w-6 rounded-full flex items-center justify-center border-2 transition-all ${
                isPassed
                  ? 'bg-[#0c2e28] border-[#2dd4bf] text-[#2dd4bf] shadow-xs'
                  : isCurrent
                  ? 'bg-[#2dd4bf] border-white text-black shadow-lg shadow-[#2dd4bf]/40 animate-pulse'
                  : 'bg-slate-100 dark:bg-[#151820] border-slate-300 dark:border-[#2b303d] text-slate-400 dark:text-slate-500'
              }`}>
                <StepIcon className="h-3 w-3" />
              </div>

              <div className="min-w-0 flex-1 pl-2">
                <div className="flex items-center gap-2">
                  <h4 className={`text-xs font-bold ${
                    isPassed || isCurrent ? 'text-white' : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    {step.title}
                  </h4>
                  {isCurrent && (
                    <span className="text-[9px] font-mono font-bold bg-[#0c2e28] text-[#2dd4bf] border border-[#175249] px-1.5 py-0.2 rounded-full animate-pulse">
                      In Progress
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#88909d] mt-0.5 leading-relaxed">
                  {step.subtitle}
                </p>
              </div>

              <span className={`text-[10px] font-mono font-semibold flex-shrink-0 px-2 py-0.5 rounded-md ${
                isPassed || isCurrent 
                  ? 'text-slate-700 bg-slate-100 border border-slate-200 dark:text-slate-300 dark:bg-[#151921] dark:border-[#232734]' 
                  : 'text-slate-400 dark:text-slate-600 bg-transparent'
              }`}>
                {step.time}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

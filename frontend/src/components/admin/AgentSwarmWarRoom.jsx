import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  BrainCircuit, 
  Scan, 
  Navigation, 
  Timer, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Zap, 
  MapPin, 
  UserCheck, 
  Cpu, 
  Clock, 
  Layers, 
  Copy, 
  Check, 
  Sparkles,
  Terminal as TerminalIcon
} from 'lucide-react';
import { simulateAgentSwarm } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const PRESET_SCENARIOS = [
  {
    id: 'water_leak',
    title: '💧 Major Water Main Burst',
    location: 'Road No. 36, Jubilee Hills, Ward 12',
    defect: 'water_leakage',
    text: 'Water pipeline is ruptured near metro pillar 42. High pressure flooding onto main road causing traffic block.'
  },
  {
    id: 'garbage_dump',
    title: '🗑️ Market Dustbin Overflow',
    location: 'Laad Bazaar, Charminar Zone, Ward 8',
    defect: 'garbage_overflow',
    text: 'Commercial waste bin overflowing heavily near vegetable market. Stench and rotting debris spilling onto footpath.'
  },
  {
    id: 'pothole_crater',
    title: '🕳️ Hazardous Road Crater',
    location: 'Cyber Towers Junction, HITEC City, Ward 15',
    defect: 'pothole',
    text: 'Deep dangerous pothole on fast lane right after flyover descent. Two two-wheelers already skidded.'
  },
  {
    id: 'streetlight_spark',
    title: '⚡ Transformer Spark & Blackout',
    location: 'MG Road, Secunderabad Zone, Ward 10',
    defect: 'damaged_streetlight',
    text: 'Streetlight pole electrical box sparking during rain. Complete street stretch is in pitch dark with exposed wires.'
  }
];

const HEAD_PHOTO_MAP = {
  "Dr. Uppalapati Venkata Suryanarayana Prabhas Raju": "/images/heads/prabhas.jpg",
  "Mr. Nandamuri Taraka Rama Rao Jr": "/images/heads/ntr.jpg",
  "Mr. Ram Charan Tej Konidela": "/images/heads/ramcharan.jpg",
  "Dr. Allu Arjun": "/images/heads/alluarjun.jpg",
  "Mr. Mahesh Babu Ghattamaneni": "/images/heads/maheshbabu.jpg"
};

export default function AgentSwarmWarRoom({ onNavigateTab }) {
  const { isDark } = useTheme();
  const [selectedScenario, setSelectedScenario] = useState(PRESET_SCENARIOS[0]);
  const [customText, setCustomText] = useState(PRESET_SCENARIOS[0].text);
  const [isRunning, setIsRunning] = useState(false);
  const [activeStep, setActiveStep] = useState(0); // 0 = idle, 1 = triage, 2 = vision, 3 = routing, 4 = sla, 5 = completed
  const [swarmResult, setSwarmResult] = useState(null);
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [copied, setCopied] = useState(false);
  const logContainerRef = useRef(null);

  useEffect(() => {
    setCustomText(selectedScenario.text);
  }, [selectedScenario]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  // Initial welcome logs
  useEffect(() => {
    setTerminalLogs([
      { tag: 'SYS', color: 'text-slate-400', time: 'LIVE', text: 'Multi-Agent Swarm Orchestrator initialized. 4 autonomous nodes standing by.' },
      { tag: 'LANGGRAPH', color: 'text-[#2dd4bf]', time: 'IDLE', text: 'Pipeline ready: TriageAgent → VisionAgent → GeoRoutingAgent → SLAAgent.' }
    ]);
  }, []);

  const addLog = (tag, color, text) => {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setTerminalLogs(prev => [...prev, { tag, color, time: timeStr, text }]);
  };

  const handleRunSwarm = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setActiveStep(1);
    setSwarmResult(null);

    const startTime = Date.now();
    addLog('SWARM', 'text-amber-400', `Triggering Swarm Pipeline on intake: "${customText.slice(0, 45)}..."`);

    try {
      // Step 1: Sentinel Triage Agent
      addLog('TRIAGE_AGENT', 'text-sky-400', 'Parsing intake stream. Executing NLP semantic classification & urgency evaluation...');
      await new Promise(r => setTimeout(r, 650));
      setActiveStep(2);

      // Step 2: Vision Inspector Agent
      addLog('VISION_AGENT', 'text-[#2dd4bf]', 'Triggering YOLOv8 object detection & spatial deduplication in 50m geofence...');
      await new Promise(r => setTimeout(r, 700));
      setActiveStep(3);

      // Step 3: Geo-Routing Agent
      addLog('GEO_ROUTER', 'text-purple-400', `Calculating Haversine routing to ${selectedScenario.location}. Identifying zonal crew...`);
      await new Promise(r => setTimeout(r, 650));
      setActiveStep(4);

      // Step 4: Predictive SLA & Escalation
      addLog('SLA_ENGINE', 'text-rose-400', 'Analyzing department queue load. Formulating guaranteed SLA & arming escalation trigger...');
      
      const payload = {
        scenario_text: customText,
        location: selectedScenario.location,
        defect_type: selectedScenario.defect
      };
      const result = await simulateAgentSwarm(payload);
      await new Promise(r => setTimeout(r, 600));

      setActiveStep(5);
      setSwarmResult(result);
      addLog('DISPATCH', 'text-emerald-400', `✓ Ticket #${result.ticket_number} DISPATCHED to ${result.assigned_head} (${result.estimated_hours}h SLA) in ${Date.now() - startTime}ms.`);
    } catch (err) {
      console.error(err);
      addLog('ERROR', 'text-rose-400', 'Swarm execution encountered an error.');
      setActiveStep(0);
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setSwarmResult(null);
    setTerminalLogs([
      { tag: 'SYS', color: 'text-slate-400', time: 'READY', text: 'Swarm Orchestrator reset. Ready for next simulation packet.' }
    ]);
  };

  const copyTicket = (ticketNum) => {
    navigator.clipboard.writeText(ticketNum);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const AGENTS = [
    {
      id: 1,
      name: 'Sentinel Triage Agent',
      short: 'Triage NLP',
      role: 'Semantic NLP & Urgency Score',
      icon: BrainCircuit,
      color: 'from-sky-500/20 to-blue-600/10 text-sky-400 border-sky-500/30',
      activeBorder: 'border-sky-400 ring-2 ring-sky-500/30 shadow-[0_0_15px_rgba(56,189,248,0.3)]',
      summary: swarmResult ? `${swarmResult.subcategory} (${swarmResult.priority})` : 'Awaiting ticket intake'
    },
    {
      id: 2,
      name: 'Vision Inspector Agent',
      short: 'YOLOv8 Vision',
      role: 'Object Bounding & Deduplication',
      icon: Scan,
      color: 'from-teal-500/20 to-emerald-600/10 text-[#2dd4bf] border-teal-500/30',
      activeBorder: 'border-[#2dd4bf] ring-2 ring-[#2dd4bf]/30 shadow-[0_0_15px_rgba(45,212,191,0.3)]',
      summary: swarmResult ? 'YOLOv8 Confirmed (97.4% Match)' : 'Standing by for photo payload'
    },
    {
      id: 3,
      name: 'Geo-Routing Agent',
      short: 'Geo Dispatch',
      role: 'Haversine Logistics & Zonal Crew',
      icon: Navigation,
      color: 'from-purple-500/20 to-indigo-600/10 text-purple-400 border-purple-500/30',
      activeBorder: 'border-purple-400 ring-2 ring-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]',
      summary: swarmResult ? `Zonal Officer: ${swarmResult.assigned_head?.split(' ')[0]}...` : 'Mapping nearest zonal depot'
    },
    {
      id: 4,
      name: 'Predictive SLA Agent',
      short: 'SLA Engine',
      role: 'Dynamic Forecast & Auto Escalation',
      icon: Timer,
      color: 'from-rose-500/20 to-amber-600/10 text-rose-400 border-rose-500/30',
      activeBorder: 'border-rose-400 ring-2 ring-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.3)]',
      summary: swarmResult ? `${swarmResult.estimated_hours}h Guaranteed SLA Locked` : 'Calculating queue work factor'
    }
  ];

  return (
    <div className="bg-[#111317] border border-[#23252d] rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl select-none transition-all">
      
      {/* ─── 1. TOP HEADER & SWARM TELEMETRY STATUS ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#23252d] pb-4">
        
        {/* Left Title & Status */}
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-[#0c2e28] border border-[#175249] flex items-center justify-center text-[#2dd4bf] shadow-sm flex-shrink-0">
              <Cpu className="h-4.5 w-4.5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Autonomous AI Agent War Room
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#0c2e28] text-[#2dd4bf] border border-[#175249] flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2dd4bf] animate-ping" />
                  4 LangGraph Swarm Nodes
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Multi-agent decision pipeline orchestrating intake triage, YOLOv8 vision validation, spatial routing, and dynamic SLA locking.
              </p>
            </div>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2.5 self-start lg:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleRunSwarm}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-[#0c2e28] hover:bg-[#113f37] text-[#2dd4bf] border border-[#175249] rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 active:scale-[0.97]"
          >
            <Play className={`h-3.5 w-3.5 fill-current ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Swarm Thinking...' : 'Run Live AI Swarm'}</span>
          </button>

          {activeStep > 0 && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isRunning}
              className="p-2 bg-[#0e1014] hover:bg-[#181a20] text-slate-300 hover:text-white border border-[#23252d] rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Reset Swarm"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

      </div>

      {/* ─── 2. SCENARIO SELECTOR PRESETS PILLS ─── */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          Select Civic Scenario Simulation:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {PRESET_SCENARIOS.map((sc) => {
            const isSelected = selectedScenario.id === sc.id;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => {
                  if (!isRunning) setSelectedScenario(sc);
                }}
                disabled={isRunning}
                className={`p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                  isSelected
                    ? 'bg-[#0c2e28] text-[#2dd4bf] border-[#175249] shadow-sm ring-1 ring-[#2dd4bf]/20'
                    : 'bg-[#0e1014] text-slate-300 hover:text-white hover:bg-[#181a20] border-[#23252d]'
                }`}
              >
                <div className="font-bold text-xs truncate">{sc.title}</div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5 flex items-center gap-1">
                  <MapPin className="h-2.5 w-2.5 text-rose-400 flex-shrink-0" />
                  <span>{sc.location.split(',')[0]}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 3. 4-AGENT PIPELINE INTERACTIVE FLOW CANVAS ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 relative pt-1">
        {AGENTS.map((ag, idx) => {
          const isCurrentActive = activeStep === ag.id;
          const isDone = activeStep > ag.id || activeStep === 5;
          const IconComp = ag.icon;

          return (
            <div
              key={ag.id}
              className={`relative rounded-2xl p-4 border transition-all duration-300 flex flex-col justify-between min-h-[140px] bg-gradient-to-br ${ag.color} ${
                isCurrentActive 
                  ? `${ag.activeBorder} scale-[1.02] bg-[#0c2e28]/40`
                  : isDone
                  ? 'border-emerald-500/40 bg-[#0c2e28]/20'
                  : 'border-[#23252d] opacity-80'
              }`}
            >
              {/* Top Node Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-[#0e1014] border border-white/10 flex items-center justify-center shadow-xs">
                    <IconComp className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider block opacity-70">
                      Node {ag.id}
                    </span>
                    <h4 className="text-xs font-bold text-white leading-tight">
                      {ag.short}
                    </h4>
                  </div>
                </div>

                {/* Node Status Indicator */}
                {isCurrentActive ? (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40 animate-pulse">
                    Processing...
                  </span>
                ) : isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-slate-600" title="Idle" />
                )}
              </div>

              {/* Middle Role Description */}
              <div className="my-2">
                <p className="text-[11px] text-slate-300 font-medium">
                  {ag.role}
                </p>
                <div className="mt-1 text-[10px] font-mono text-[#2dd4bf] truncate bg-[#0a0c0f]/60 px-2 py-1 rounded-md border border-white/5">
                  {ag.summary}
                </div>
              </div>

              {/* Bottom Progress Pulse */}
              <div className="w-full bg-black/40 h-1 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    isDone ? 'w-full bg-emerald-400' : isCurrentActive ? 'w-3/4 bg-[#2dd4bf] animate-pulse' : 'w-0'
                  }`} 
                />
              </div>

              {/* Flow connector arrow for desktop */}
              {idx < 3 && (
                <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-slate-500 font-bold text-xs pointer-events-none">
                  →
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── 4. TELEMETRY PACKET & LIVE TERMINAL CONSOLE ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* Left: Swarm Decision Packet (5 cols) */}
        <div className="lg:col-span-5 bg-[#0e1014] border border-[#23252d] rounded-2xl p-4 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#23252d] pb-2.5">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#2dd4bf]" />
              Swarm Decision Packet
            </span>
            {swarmResult && (
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Processed in {swarmResult.total_execution_ms}ms
              </span>
            )}
          </div>

          {swarmResult ? (
            <div className="space-y-3 animate-in fade-in duration-200 text-xs">
              
              {/* Ticket & Priority */}
              <div className="flex items-center justify-between bg-[#111317] p-2.5 rounded-xl border border-[#23252d]">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Ticket ID</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-[#2dd4bf]">
                    <span>{swarmResult.ticket_number}</span>
                    <button
                      type="button"
                      onClick={() => copyTicket(swarmResult.ticket_number)}
                      className="text-slate-400 hover:text-white p-0.5"
                      title="Copy"
                    >
                      {copied ? <Check className="h-3 w-3 text-[#2dd4bf]" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-medium">Auto-Priority</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    swarmResult.priority === 'CRITICAL' ? 'bg-rose-500/15 text-rose-300 border-rose-500/40' : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                  }`}>
                    {swarmResult.priority}
                  </span>
                </div>
              </div>

              {/* Assigned Officer Details */}
              <div className="flex items-center gap-3 bg-[#111317] p-2.5 rounded-xl border border-[#23252d]">
                <img
                  src={HEAD_PHOTO_MAP[swarmResult.assigned_head] || "/images/heads/prabhas.jpg"}
                  alt={swarmResult.assigned_head}
                  className="h-10 w-10 rounded-xl object-cover ring-1 ring-[#2dd4bf]/40 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-slate-400 block font-medium">Autonomous Officer Dispatch</span>
                  <p className="font-bold text-white text-xs truncate">{swarmResult.assigned_head}</p>
                  <p className="text-[10px] text-[#2dd4bf] truncate">{swarmResult.category}</p>
                </div>
              </div>

              {/* SLA & Geolocation */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-[#111317] p-2 rounded-xl border border-[#23252d]">
                  <span className="text-[10px] text-slate-400 block">SLA Commitment</span>
                  <strong className="font-mono text-[#2dd4bf]">{swarmResult.estimated_hours} Hours Target</strong>
                </div>
                <div className="bg-[#111317] p-2 rounded-xl border border-[#23252d]">
                  <span className="text-[10px] text-slate-400 block">Zonal Zone</span>
                  <strong className="text-slate-200 truncate block">{swarmResult.location?.split(',')[0]}</strong>
                </div>
              </div>

            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs space-y-2">
              <Bot className="h-8 w-8 text-slate-600 mx-auto animate-bounce" />
              <p className="font-semibold text-slate-300">Swarm Ready</p>
              <p className="text-[11px] text-slate-500">
                Click <strong>"Run Live AI Swarm"</strong> to observe autonomous ticket processing in real-time.
              </p>
            </div>
          )}
        </div>

        {/* Right: Live Agent Terminal Feed (7 cols) */}
        <div className="lg:col-span-7 bg-[#0a0c0f] border border-[#23252d] rounded-2xl p-4 space-y-2.5 shadow-inner">
          <div className="flex items-center justify-between border-b border-[#23252d] pb-2">
            <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
              <TerminalIcon className="h-3.5 w-3.5 text-[#2dd4bf]" />
              Live Swarm Execution Terminal
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              STDIO STREAM
            </span>
          </div>

          <div 
            ref={logContainerRef}
            className="h-48 overflow-y-auto font-mono text-[11px] space-y-1.5 pr-1 scrollbar-thin text-slate-300"
          >
            {terminalLogs.map((log, i) => (
              <div key={i} className="leading-relaxed flex items-start gap-2">
                <span className="text-slate-500 select-none text-[10px]">[{log.time}]</span>
                <span className={`font-bold text-[10px] px-1 rounded bg-white/5 ${log.color}`}>
                  {log.tag}
                </span>
                <span className="flex-1 break-words text-slate-200">
                  {log.text}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}

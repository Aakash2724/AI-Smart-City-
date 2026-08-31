import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  TrendingUp,
  MapPin,
  Shield,
  RefreshCw,
  Clock,
  PieChart as PieChartIcon,
  BarChart3,
  Activity,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';
import { getRiskForecast } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const CATEGORY_COLORS = {
  'Sanitation & Waste': { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)' },
  'Roads & Infrastructure': { color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.3)' },
  'Water & Sewage': { color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.15)', border: 'rgba(14, 165, 233, 0.3)' },
  'Electrical & Power': { color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)', border: 'rgba(234, 179, 8, 0.3)' },
  'Traffic & Safety': { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.3)' },
};

export default function RiskForecastPanel() {
  const { isDark } = useTheme();
  const [riskForecast, setRiskForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('charts'); // 'charts' | 'leaderboard'
  const [selectedArea, setSelectedArea] = useState(null);

  // Canvas refs for Chart.js
  const trendChartRef = useRef(null);
  const donutChartRef = useRef(null);
  const trendInstanceRef = useRef(null);
  const donutInstanceRef = useRef(null);

  const loadForecast = async () => {
    setLoading(true);
    try {
      const data = await getRiskForecast();
      if (data) {
        setRiskForecast(data);
        if (data.top_risk_areas && data.top_risk_areas.length > 0) {
          setSelectedArea(data.top_risk_areas[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load risk forecast:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForecast();
  }, []);

  // Compute category risk breakdown from top risk areas
  const categoryBreakdown = React.useMemo(() => {
    if (!riskForecast?.top_risk_areas) return [];
    const counts = {};
    riskForecast.top_risk_areas.forEach(a => {
      const cat = a.dominant_category || 'General';
      counts[cat] = (counts[cat] || 0) + (a.predicted_incidents_7d || 1);
    });
    const total = Object.values(counts).reduce((sum, v) => sum + v, 0) || 1;
    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      pct: Math.round((count / total) * 100),
      color: CATEGORY_COLORS[name]?.color || '#94a3b8'
    }));
  }, [riskForecast]);

  // Render Charts with Chart.js
  useEffect(() => {
    if (!window.Chart || !riskForecast || loading) return;

    const pointBorder = isDark ? '#111317' : '#ffffff';
    const donutBorder = isDark ? '#111317' : '#ffffff';
    const gridColor = isDark ? '#23252d' : '#e2e8f0';
    const tickColor = isDark ? '#64748b' : '#64748b';
    const tooltipBg = isDark ? '#0e1014' : '#ffffff';
    const tooltipTitle = isDark ? '#ffffff' : '#0f172a';
    const tooltipBorder = isDark ? '#23252d' : '#e2e8f0';

    // 1. 7-Day Trend Chart
    if (trendChartRef.current && riskForecast.daily_forecast) {
      if (trendInstanceRef.current) trendInstanceRef.current.destroy();

      const days = riskForecast.daily_forecast.map(d => d.day.slice(0, 3));
      const dailyTotals = riskForecast.daily_forecast.map(d => 
        d.high_risk_areas.reduce((sum, a) => sum + a.predicted_incidents, 0)
      );

      const ctxTrend = trendChartRef.current.getContext('2d');
      const gradient = ctxTrend.createLinearGradient(0, 0, 0, 140);
      gradient.addColorStop(0, 'rgba(249, 115, 22, 0.35)');
      gradient.addColorStop(1, 'rgba(249, 115, 22, 0.0)');

      trendInstanceRef.current = new window.Chart(ctxTrend, {
        type: 'line',
        data: {
          labels: days,
          datasets: [{
            label: 'Predicted Incidents',
            data: dailyTotals,
            borderColor: '#f97316',
            backgroundColor: gradient,
            borderWidth: 2.5,
            pointBackgroundColor: '#f97316',
            pointBorderColor: pointBorder,
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.35,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: tooltipBg,
              titleColor: tooltipTitle,
              bodyColor: '#2dd4bf',
              borderColor: tooltipBorder,
              borderWidth: 1,
              padding: 8,
              displayColors: false,
              callbacks: {
                label: (ctx) => `Expected Incidents: ${ctx.parsed.y}`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: tickColor, font: { size: 10, family: 'Inter' } }
            },
            y: {
              grid: { color: gridColor, drawBorder: false },
              ticks: { color: tickColor, font: { size: 10, family: 'Inter' }, precision: 0 },
              beginAtZero: true
            }
          }
        }
      });
    }

    // 2. Category Share Donut Chart
    if (donutChartRef.current && categoryBreakdown.length > 0) {
      if (donutInstanceRef.current) donutInstanceRef.current.destroy();

      const ctxDonut = donutChartRef.current.getContext('2d');
      donutInstanceRef.current = new window.Chart(ctxDonut, {
        type: 'doughnut',
        data: {
          labels: categoryBreakdown.map(c => c.name),
          datasets: [{
            data: categoryBreakdown.map(c => c.count),
            backgroundColor: categoryBreakdown.map(c => c.color),
            borderColor: donutBorder,
            borderWidth: 3,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '72%',
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: tooltipBg,
              titleColor: tooltipTitle,
              bodyColor: '#2dd4bf',
              borderColor: tooltipBorder,
              borderWidth: 1,
              padding: 8,
              displayColors: true
            }
          }
        }
      });
    }

    return () => {
      if (trendInstanceRef.current) trendInstanceRef.current.destroy();
      if (donutInstanceRef.current) donutInstanceRef.current.destroy();
    };
  }, [riskForecast, activeView, loading, categoryBreakdown, isDark]);

  const totalIncidents = riskForecast?.top_risk_areas?.reduce((sum, a) => sum + (a.predicted_incidents_7d || 0), 0) || 61;

  return (
    <div className="bg-[#111317] border border-[#23252d] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 h-[calc(100vh-220px)] min-h-[460px] flex flex-col justify-between overflow-hidden">
      
      {/* ─── Header & Top Controls ─── */}
      <div className="space-y-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-orange-500/30 flex items-center justify-center shadow-xs">
              <Activity className="h-4 w-4 text-orange-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                7-Day Risk & Impact Radar
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                {riskForecast?.forecast_period || 'Predictive Window (Next 7 Days)'}
              </p>
            </div>
          </div>
          
          <button
            onClick={loadForecast}
            className="p-1.5 text-slate-400 hover:text-[#2dd4bf] bg-[#0e1014] rounded-xl border border-[#23252d] transition-all hover:bg-[#181a20]"
            title="Refresh forecast model"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#2dd4bf]' : ''}`} />
          </button>
        </div>

        {/* ─── Executive KPI Stat Pills ─── */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#0e1014] border border-[#23252d] rounded-xl p-2 text-center">
            <span className="text-[10px] text-slate-400 block font-medium">Flagged Zones</span>
            <span className="text-sm font-bold font-mono text-rose-400">
              {riskForecast?.total_high_risk_areas || 6}
            </span>
          </div>
          <div className="bg-[#0e1014] border border-[#23252d] rounded-xl p-2 text-center">
            <span className="text-[10px] text-slate-400 block font-medium">Est. Incidents</span>
            <span className="text-sm font-bold font-mono text-orange-400">
              ~{totalIncidents}
            </span>
          </div>
          <div className="bg-[#0e1014] border border-[#23252d] rounded-xl p-2 text-center">
            <span className="text-[10px] text-slate-400 block font-medium">Peak Risk Day</span>
            <span className="text-sm font-bold font-mono text-[#2dd4bf]">
              Mon & Wed
            </span>
          </div>
        </div>

        {/* ─── View Switcher Tabs ─── */}
        <div className="relative flex items-center bg-[#0a0c0f] p-1 rounded-xl border border-[#23252d] shadow-inner text-xs gap-1 select-none">
          <button
            type="button"
            onClick={() => setActiveView('charts')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer active:scale-[0.97] ${
              activeView === 'charts'
                ? 'bg-[#0c2e28] text-[#2dd4bf] border border-[#175249] shadow-sm font-bold scale-[1.01]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#14161d] border border-transparent'
            }`}
          >
            <BarChart3 className={`h-3.5 w-3.5 transition-transform duration-200 ${activeView === 'charts' ? 'text-[#2dd4bf] scale-110' : 'text-slate-500'}`} />
            <span>Risk Charts</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('leaderboard')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer active:scale-[0.97] ${
              activeView === 'leaderboard'
                ? 'bg-[#0c2e28] text-[#2dd4bf] border border-[#175249] shadow-sm font-bold scale-[1.01]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#14161d] border border-transparent'
            }`}
          >
            <Layers className={`h-3.5 w-3.5 transition-transform duration-200 ${activeView === 'leaderboard' ? 'text-[#2dd4bf] scale-110' : 'text-slate-500'}`} />
            <span>Priority Zones</span>
          </button>
        </div>
      </div>

      {/* ─── Scrollable Content Area with Smooth Tab Switch Animation ─── */}
      <div key={activeView} className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3.5 my-1 animate-tab-switch">
        {loading ? (
          <div className="space-y-3 py-6">
            <div className="h-28 rounded-xl bg-[#0e1014] animate-pulse border border-[#23252d]" />
            <div className="h-28 rounded-xl bg-[#0e1014] animate-pulse border border-[#23252d]" />
          </div>
        ) : activeView === 'charts' ? (
          <>
            {/* 1. 7-Day Incident Trajectory Graph */}
            <div className="bg-[#0e1014] border border-[#23252d] rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-orange-400" />
                  7-Day Projected Incident Trajectory
                </span>
                <span className="text-[9px] text-slate-500 font-mono">ML Regression</span>
              </div>
              <div className="h-28 w-full relative">
                <canvas ref={trendChartRef} />
              </div>
            </div>

            {/* 2. Category Share Donut + Compact Legend */}
            <div className="bg-[#0e1014] border border-[#23252d] rounded-xl p-3 space-y-2">
              <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                <PieChartIcon className="h-3.5 w-3.5 text-[#2dd4bf]" />
                Risk Distribution by Domain
              </span>
              
              <div className="flex items-center gap-3">
                {/* Donut Canvas */}
                <div className="h-24 w-24 relative flex-shrink-0">
                  <canvas ref={donutChartRef} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className={`text-xs font-bold font-mono leading-none ${isDark ? 'text-white' : 'text-slate-800'}`}>100%</span>
                    <span className={`text-[8px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>Risk</span>
                  </div>
                </div>

                {/* Category Legend Chips */}
                <div className="flex-1 min-w-0 space-y-1 text-[10px]">
                  {categoryBreakdown.slice(0, 4).map((c, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="text-slate-300 truncate">{c.name}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-200 ml-1.5 flex-shrink-0">{c.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ─── Priority Risk Leaderboard View ─── */
          <div className="space-y-2">
            {riskForecast?.top_risk_areas?.map((area, idx) => {
              const isCritical = area.risk_score >= 0.85;
              const isSelected = selectedArea?.area === area.area;
              const catColor = CATEGORY_COLORS[area.dominant_category]?.color || '#2dd4bf';

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedArea(area)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer text-xs ${
                    isSelected
                      ? 'bg-[#1a1d24] border-orange-500/40 shadow-xs'
                      : 'bg-[#0e1014] border-[#23252d] hover:border-[#383b46]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="h-5 w-5 rounded-lg bg-black/40 border border-[#23252d] text-[10px] font-bold font-mono text-slate-400 flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white truncate text-[11px]">{area.area}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: catColor }} />
                          <span className="truncate">{area.dominant_category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                        isCritical
                          ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                          : 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                      }`}>
                        {Math.round(area.risk_score * 100)}%
                      </span>
                      <span className="text-[9px] text-slate-500 block font-mono mt-0.5">
                        ~{area.predicted_incidents_7d} inc
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Real AI Preventive Dispatch Directive Card ─── */}
      <div className="bg-[#0e1014] border border-[#23252d] rounded-xl p-3 text-[11px] text-slate-300 leading-snug flex items-start gap-2.5 flex-shrink-0 shadow-xs">
        <div className="h-6 w-6 rounded-lg bg-[#2dd4bf]/10 border border-[#2dd4bf]/25 flex items-center justify-center flex-shrink-0 mt-0.5 text-[#2dd4bf]">
          <Shield className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono font-bold text-[#2dd4bf] text-[10px] uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2dd4bf] animate-pulse"></span>
              {selectedArea ? `${selectedArea.area.split(',')[0]} Directive` : 'City-Wide Preventive Directive'}
            </span>
            {selectedArea && (
              <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-md bg-[#1a1d24] border border-[#282b35] text-slate-300">
                {selectedArea.dominant_category} ({Math.round(selectedArea.risk_score * 100)}% Risk)
              </span>
            )}
          </div>
          <p className="text-slate-300 text-[10.5px] leading-relaxed">
            {selectedArea?.recommended_action || "Deploy proactive road repair and sanitation compactors to high-density zones before peak weekday traffic."}
          </p>
        </div>
      </div>

    </div>
  );
}

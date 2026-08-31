import React, { useState } from 'react';
import Sidebar from './components/common/Sidebar';
import Header from './components/common/Header';
import SmartCityDashboard from './components/admin/SmartCityDashboard';
import ComplaintForm from './components/citizen/ComplaintForm';
import GISHotspotMap from './components/admin/GISHotspotMap';
import TrackHistory from './components/citizen/TrackHistory';
import ProfileSettingsPage from './components/citizen/ProfileSettingsPage';
import AICopilotPage from './components/admin/AICopilotPage';
import RiskForecastPanel from './components/admin/RiskForecastPanel';
import AuthPage from './components/auth/AuthPage';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

function MainApp() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCity, setSelectedCity] = useState('');
  const [latestComplaint, setLatestComplaint] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [dashboardKey, setDashboardKey] = useState(0);

  // This useEffect MUST be before any early return to respect React's rules of hooks
  React.useEffect(() => {
    if (!user) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const ticketParam = params.get('ticket');
      const tabParam = params.get('tab');
      if (ticketParam) {
        setActiveTab('history');
        setLatestComplaint({ ticket_number: ticketParam, id: ticketParam });
      } else if (tabParam) {
        setActiveTab(tabParam === 'agents' ? 'history' : tabParam);
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  // If no authenticated user session exists, present the Login & Registration screen first
  if (!user) {
    return <AuthPage />;
  }

  const handleTabChange = (tabId) => {
    // When navigating from sidebar/menus, clear sticky ticket filter
    if (tabId === 'history' || tabId === 'agents') {
      setLatestComplaint(null);
    }
    setActiveTab(tabId === 'agents' ? 'history' : tabId);
  };

  const handleComplaintSubmitted = (complaint) => {
    // Just cache the submitted complaint without forcing direct navigation filter
    setLatestComplaint({ ...complaint, isDirectNavigation: false });
  };

  const handleNavigateToHistory = (complaintOrTicket) => {
    if (complaintOrTicket && typeof complaintOrTicket === 'object') {
      setLatestComplaint({ ...complaintOrTicket, isDirectNavigation: true });
    } else if (complaintOrTicket && typeof complaintOrTicket === 'string') {
      // From notifications or track button — wrap ticket number string with isDirectNavigation
      setLatestComplaint({ ticket_number: complaintOrTicket, id: complaintOrTicket, isDirectNavigation: true });
    }
    setActiveTab('history');
  };

  const handleRefreshAll = async () => {
    setDashboardKey(prev => prev + 1);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0b0c10] text-slate-100 font-sans overflow-hidden">
      
      {/* 1. Full-Width Edge-to-Edge Header */}
      <div className="w-full flex-shrink-0 z-20">
        <Header 
          selectedCity={selectedCity} 
          onRefreshAll={handleRefreshAll}
          onNavigateToHistory={handleNavigateToHistory}
          onNavigateToSettings={() => setActiveTab('settings')}
        />
      </div>

      {/* 2. Main Body Container (Sidebar + Content) */}
      <div className="flex-1 flex min-h-0 w-full overflow-hidden">
        
        {/* Responsive Left Sidebar */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={handleTabChange} 
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((prev) => !prev)}
        />

        {/* Dynamic Full Screen Main Content Area */}
        <main className="flex-1 min-w-0 bg-[#0b0c10] overflow-y-auto p-4 sm:p-6 lg:p-7">
          <div className="max-w-[1600px] mx-auto w-full space-y-6">
            
            {/* 1. Overview Dashboard */}
            {activeTab === 'dashboard' && (
              <div key={`dashboard-${dashboardKey}`} className="animate-view-transition">
                <SmartCityDashboard onNavigateTab={(t) => handleTabChange(t)} />
              </div>
            )}

            {/* 2. Citizen Services */}
            {activeTab === 'citizen' && (
              <div key="citizen" className="animate-view-transition">
                <ComplaintForm 
                  onSubmitted={handleComplaintSubmitted}
                  onNavigateToHistory={handleNavigateToHistory}
                />
              </div>
            )}

            {/* 3. GIS & Risk Radar */}
            {activeTab === 'gis' && (
              <div key="gis" className="animate-view-transition space-y-3">
                <div className="bg-[#111317] p-4 sm:p-5 rounded-2xl border border-[#23252d] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 flex-shrink-0">
                  <div>
                    <h2 className="text-base font-bold text-white">GIS & Risk Radar</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Interactive map with real-time complaints and 7-day predictive risk forecast for high-risk areas.</p>
                  </div>
                  <span className="px-3 py-1 bg-[#0c2e28] text-[#2dd4bf] text-xs font-semibold rounded-full border border-[#175249] self-start sm:self-auto">
                    Live Map + Forecast
                  </span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                  {/* Left: Map (Equal 50% width) */}
                  <div className="h-[calc(100vh-220px)] min-h-[480px] rounded-2xl overflow-hidden border border-[#23252d] relative shadow-lg">
                    <GISHotspotMap />
                  </div>
                  {/* Right: 7-Day Risk Forecast Panel (Equal 50% width) */}
                  <div className="h-[calc(100vh-220px)] min-h-[480px]">
                    <RiskForecastPanel />
                  </div>
                </div>
              </div>
            )}

            {/* 4. Track & History */}
            {(activeTab === 'history' || activeTab === 'agents') && (
              <div key="history" className="animate-view-transition">
                <TrackHistory latestComplaint={latestComplaint} />
              </div>
            )}

            {/* 5. Dedicated Profile & Ward Settings Page */}
            {activeTab === 'settings' && (
              <div key="settings" className="animate-view-transition">
                <ProfileSettingsPage onNavigateTab={(t) => setActiveTab(t)} />
              </div>
            )}

            {/* 6. Dedicated AI Copilot Page */}
            {activeTab === 'copilot' && (
              <div key="copilot" className="animate-view-transition">
                <AICopilotPage />
              </div>
            )}

          </div>
        </main>

      </div>

    </div>
  );
}


export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

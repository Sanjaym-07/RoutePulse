import React, { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { CampusMap } from './map/CampusMap';
import { TopBar } from './components/TopBar';
import { LeftRail } from './components/LeftRail';
import { TimeScrubber } from './components/TimeScrubber';
import { RightDrawer } from './panels/RightDrawer';
import { PassengerPanel } from './panels/PassengerPanel';
import { OverviewPanel } from './panels/OverviewPanel';
import { ForecastPanel } from './panels/ForecastPanel';
import { FlagsPanel } from './panels/FlagsPanel';
import { RecommendationsPanel } from './panels/RecommendationsPanel';
import { ModelTrustPanel } from './panels/ModelTrustPanel';
import './styles/tokens.css';

export const App: React.FC = () => {
  const { isDark, activePanel, setActivePanel, isPassengerMode, fetchData, isLoading, error } =
    useAppStore();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className={`relative w-screen h-screen overflow-hidden ${!isDark ? 'light-theme' : ''}`}>
      {/* 1. Base Full-Screen Canvas Map */}
      <CampusMap />

      {/* 2. Top Navigation Bar */}
      <TopBar />

      {/* 3. Left Navigation Icon Rail */}
      <LeftRail />

      {/* 4. Sliding Left Panel (Overview, Forecast, Flags, Recommendations, Model Trust) */}
      {activePanel && !isPassengerMode && (
        <aside
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-lg)',
          }}
          className="fixed left-20 top-20 bottom-24 w-96 rounded-xl border z-40 p-4 flex flex-col overflow-y-auto"
        >
          {activePanel === 'overview' && <OverviewPanel />}
          {activePanel === 'forecast' && <ForecastPanel />}
          {activePanel === 'flags' && <FlagsPanel />}
          {activePanel === 'recommendations' && <RecommendationsPanel />}
          {activePanel === 'modelTrust' && <ModelTrustPanel />}
        </aside>
      )}

      {/* 5. Passenger Mode Bottom Drawer */}
      {isPassengerMode && <PassengerPanel />}

      {/* 6. Right Inspection Drawer (Stop / Trip Details) */}
      <RightDrawer />

      {/* 7. Bottom Time Scrubber */}
      <TimeScrubber />

      {/* Error Toast Notification if connection issue */}
      {error && (
        <div className="fixed bottom-20 right-6 z-50 bg-red-600 text-white px-4 py-2.5 rounded-lg text-xs shadow-lg flex items-center gap-2">
          <span>{error}</span>
          <button
            onClick={() => fetchData()}
            className="underline font-semibold cursor-pointer ml-2"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

export default App;

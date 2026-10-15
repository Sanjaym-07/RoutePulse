import React, { useEffect, useState } from 'react';
import { useAppStore } from './store/useAppStore';
import { CampusMap } from './map/CampusMap';
import { TopBar } from './components/TopBar';
import { LeftRail } from './components/LeftRail';
import { TimeScrubber } from './components/TimeScrubber';
import { MapLegend } from './components/MapLegend';
import { FirstRunTour } from './components/FirstRunTour';
import { RightDrawer } from './panels/RightDrawer';
import { PassengerPanel } from './panels/PassengerPanel';
import { OverviewPanel } from './panels/OverviewPanel';
import { ForecastPanel } from './panels/ForecastPanel';
import { FlagsPanel } from './panels/FlagsPanel';
import { RecommendationsPanel } from './panels/RecommendationsPanel';
import { ModelTrustPanel } from './panels/ModelTrustPanel';
import { ResultsPanel } from './panels/ResultsPanel';
import './styles/tokens.css';

export const App: React.FC = () => {
  const { isDark, activePanel, setActivePanel, isPassengerMode, fetchData, error } =
    useAppStore();

  const [tourStep, setTourStep] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
    // Check if user has seen tour
    const seenTour = localStorage.getItem('routepulse_seen_tour');
    if (!seenTour) {
      setTourStep(0);
    }
  }, [fetchData]);

  const handleNextTourStep = () => {
    if (tourStep === null) return;
    if (tourStep < 4) {
      const next = tourStep + 1;
      setTourStep(next);
      if (next === 2) setActivePanel('flags');
      else if (next === 3) setActivePanel('recommendations');
      else if (next === 4) setActivePanel('results');
    } else {
      setTourStep(null);
      localStorage.setItem('routepulse_seen_tour', 'true');
    }
  };

  const handleSkipTour = () => {
    setTourStep(null);
    localStorage.setItem('routepulse_seen_tour', 'true');
  };

  const startTour = () => {
    setTourStep(0);
  };

  return (
    <div className={`relative w-screen h-screen overflow-hidden ${!isDark ? 'light-theme' : ''}`}>
      {/* 1. Base Full-Screen Canvas Map */}
      <CampusMap />

      {/* 2. Top Navigation Bar (with Story Bar, Live Headline, and Tour trigger) */}
      <TopBar onStartTour={startTour} />

      {/* 3. Left Navigation Icon Rail */}
      <LeftRail />

      {/* 4. Sliding Left Panel */}
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
          {activePanel === 'results' && <ResultsPanel />}
          {activePanel === 'modelTrust' && <ModelTrustPanel />}
        </aside>
      )}

      {/* 5. Passenger Mode Bottom Drawer */}
      {isPassengerMode && <PassengerPanel />}

      {/* 6. Right Inspection Drawer (Stop / Trip Details) */}
      <RightDrawer />

      {/* 7. Floating Map Legend */}
      <MapLegend />

      {/* 8. Bottom Time Scrubber */}
      <TimeScrubber />

      {/* 9. First-Run Tour Modal */}
      {tourStep !== null && (
        <FirstRunTour
          step={tourStep}
          onNext={handleNextTourStep}
          onSkip={handleSkipTour}
        />
      )}

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

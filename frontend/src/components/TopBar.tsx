import React, { useState } from 'react';
import {
  Search,
  Moon,
  Sun,
  User,
  TrendingDown,
  CloudRain,
  Info,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface TopBarProps {
  onStartTour?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onStartTour }) => {
  const {
    isDark,
    toggleTheme,
    isPassengerMode,
    togglePassengerMode,
    evaluation,
    currentScenario,
    setScenario,
    serviceStatuses,
    stops,
    setSelectedStop,
    activePanel,
    setActivePanel,
    isLoading,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const baseMetrics = evaluation?.baseline_metrics;
  const propMetrics = evaluation?.proposed_metrics;
  const deltas = evaluation?.deltas;

  // Scenario chips with tooltips
  const scenarios = [
    { id: 'normal', label: 'Normal', tip: 'Normal: Standard weekday campus schedule' },
    { id: 'traffic_delay', label: 'Traffic Delay', tip: 'Traffic Delay: Peak road construction on main avenue (+60% travel delay)' },
    { id: 'vehicle_down', label: 'Vehicle Down', tip: 'Vehicle Down: High-capacity BUS_03 pulled for depot repairs' },
    { id: 'demand_spike', label: 'Demand Spike', tip: 'Demand Spike: Campus career fair surges stop queues' },
    { id: 'rain', label: 'Heavy Rain', tip: 'Heavy Rain: Slower roads and more riders' },
  ];

  const filteredStops = searchQuery.trim()
    ? stops.filter((s) => s.stop_name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  // Plain-English Live Headline
  const getHeadline = () => {
    if (isLoading || !baseMetrics || !propMetrics) {
      return 'Loading campus transit forecast...';
    }
    const baselineCrowded = baseMetrics.overcrowded_trips;
    const planCrowded = propMetrics.overcrowded_trips;
    const extraKm = Math.max(0, deltas?.total_vehicle_km ?? 0);
    return `Today we expect ${baselineCrowded} trips to be too full. Applying our suggestions cuts that to ${planCrowded}, for ${extraKm} extra km of driving.`;
  };

  // Story Bar 4 Steps
  const storySteps = [
    { id: 'flags', num: '1', title: 'Problem', subtitle: 'Bottlenecks' },
    { id: 'forecast', num: '2', title: 'Prediction', subtitle: 'Passenger Demand' },
    { id: 'recommendations', num: '3', title: 'Fix', subtitle: 'Suggestions' },
    { id: 'results', num: '4', title: 'Proof', subtitle: 'Measurable Outcomes' },
  ];

  return (
    <header className="fixed top-3 left-20 right-4 z-40 flex flex-col gap-2 pointer-events-none">
      {/* 1. STORY BAR: 4 steps */}
      <div className="flex items-center justify-between gap-3 pointer-events-auto">
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-md)',
          }}
          className="flex items-center gap-1 p-1 rounded-xl border tour-story-bar"
        >
          {storySteps.map((step, idx) => {
            const isActive = activePanel === step.id;
            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => setActivePanel(isActive ? null : step.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive ? 'bg-white text-blue-700' : 'bg-gray-800 text-gray-300'
                    }`}
                  >
                    {step.num}
                  </span>
                  <span>{step.title}</span>
                </button>
                {idx < storySteps.length - 1 && (
                  <ChevronRight size={13} className="text-gray-600 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* System & Mode Controls */}
        <div className="flex items-center gap-2">
          {/* First-Run Tour Replay Button */}
          {onStartTour && (
            <button
              onClick={onStartTour}
              title="Show guided walk-through"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs text-gray-300 hover:text-white cursor-pointer"
            >
              <HelpCircle size={14} className="text-blue-400" />
              <span>Tour</span>
            </button>
          )}

          {/* External Services Live/Saved Status Chips */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px]"
          >
            <div className="flex items-center gap-1.5 text-gray-300">
              <span
                className={`w-2 h-2 rounded-full ${
                  serviceStatuses.open_meteo === 'LIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span>
                Weather: {serviceStatuses.open_meteo === 'LIVE' ? 'Live' : 'Using saved data (offline)'}
              </span>
            </div>
            <span className="text-gray-600">|</span>
            <div className="flex items-center gap-1.5 text-gray-300">
              <span
                className={`w-2 h-2 rounded-full ${
                  serviceStatuses.osrm === 'LIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span>
                Roads: {serviceStatuses.osrm === 'LIVE' ? 'Live' : 'Using saved data (offline)'}
              </span>
            </div>
          </div>

          {/* Manager / Passenger View Toggle */}
          <button
            onClick={togglePassengerMode}
            style={{
              backgroundColor: isPassengerMode ? 'var(--semantic-amber-bg)' : 'var(--bg-surface)',
              borderColor: isPassengerMode ? 'var(--semantic-amber)' : 'var(--border-subtle)',
              color: isPassengerMode ? 'var(--semantic-amber)' : 'var(--text-secondary)',
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer"
          >
            <User size={14} />
            <span>{isPassengerMode ? 'Passenger view' : 'Manager view'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            className="p-2 rounded-lg border cursor-pointer hover:text-white"
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>

      {/* 2. Command Search & Scenario Row */}
      <div className="flex items-center justify-between gap-3 pointer-events-auto">
        {/* Search Bar */}
        <div className="relative w-72">
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--shadow-md)',
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm"
          >
            <Search size={15} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search stop or trip..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              className="bg-transparent border-none outline-none w-full text-xs text-white placeholder-gray-500"
            />
          </div>

          {showSearchResults && filteredStops.length > 0 && (
            <div
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
                boxShadow: 'var(--shadow-lg)',
              }}
              className="absolute top-10 left-0 right-0 rounded-lg border p-1 z-50 max-h-48 overflow-y-auto"
            >
              {filteredStops.map((s) => (
                <div
                  key={s.stop_id}
                  onClick={() => {
                    setSelectedStop(s);
                    setShowSearchResults(false);
                    setSearchQuery('');
                  }}
                  className="px-3 py-2 text-xs hover:bg-blue-600/20 hover:text-blue-400 cursor-pointer rounded flex items-center justify-between"
                >
                  <span>{s.stop_name}</span>
                  <span className="text-[10px] text-gray-500">{s.stop_id}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* "What if..." Scenario Chips with Tooltips */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-md)',
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border tour-what-if"
        >
          <span className="text-xs font-semibold text-gray-400 mr-1">What if...</span>
          {scenarios.map((scen) => {
            const isActive = currentScenario === scen.id;
            return (
              <button
                key={scen.id}
                onClick={() => setScenario(scen.id)}
                title={scen.tip}
                className={`px-2.5 py-1 text-xs rounded transition-all font-medium flex items-center gap-1 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {scen.id === 'rain' && <CloudRain size={13} />}
                {scen.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. PLAIN-ENGLISH LIVE HEADLINE */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
        className="px-3 py-1.5 rounded-lg border text-xs font-medium text-blue-200 pointer-events-auto flex items-center justify-between shadow-sm"
      >
        <span>{getHeadline()}</span>
      </div>

      {/* 4. PLAIN-LANGUAGE KPI CHIPS WITH TOOLTIPS */}
      <div className="flex items-center gap-2.5 pointer-events-auto">
        {/* Trips that will be too full */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs"
        >
          <span className="text-gray-400 flex items-center gap-1">
            Trips that will be too full
            <span title="Trips operating above 85% capacity where riders will stand uncomfortably (Unit: trips)" className="text-gray-500 cursor-help">
              <Info size={11} />
            </span>
          </span>
          {isLoading ? (
            <div className="w-6 h-4 bg-gray-800 animate-pulse rounded" />
          ) : (
            <span className="font-bold text-white tabular-nums">
              {propMetrics?.overcrowded_trips ?? '—'}
            </span>
          )}
          {deltas && deltas.overcrowded_trips !== 0 && (
            <span
              style={{
                backgroundColor: 'var(--semantic-green-bg)',
                color: 'var(--semantic-green)',
              }}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5"
            >
              <TrendingDown size={11} />
              {Math.abs(deltas.overcrowded_trips)}
            </span>
          )}
        </div>

        {/* Trips with more people than seats */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs"
        >
          <span className="text-gray-400 flex items-center gap-1">
            Trips with more people than seats
            <span title="Trips exceeding 100% capacity where people are left waiting at stops (Unit: trips)" className="text-gray-500 cursor-help">
              <Info size={11} />
            </span>
          </span>
          {isLoading ? (
            <div className="w-6 h-4 bg-gray-800 animate-pulse rounded" />
          ) : (
            <span className="font-bold text-white tabular-nums">
              {propMetrics?.capacity_violations ?? '—'}
            </span>
          )}
          {deltas && deltas.capacity_violations !== 0 && (
            <span
              style={{
                backgroundColor: 'var(--semantic-green-bg)',
                color: 'var(--semantic-green)',
              }}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5"
            >
              <TrendingDown size={11} />
              {Math.abs(deltas.capacity_violations)}
            </span>
          )}
        </div>

        {/* Average wait for a bus */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs"
        >
          <span className="text-gray-400 flex items-center gap-1">
            Average wait for a bus
            <span title="Estimated average wait time across all campus stops (Unit: minutes)" className="text-gray-500 cursor-help">
              <Info size={11} />
            </span>
          </span>
          {isLoading ? (
            <div className="w-8 h-4 bg-gray-800 animate-pulse rounded" />
          ) : (
            <span className="font-bold text-white tabular-nums">
              {propMetrics ? `${propMetrics.average_wait_min}m` : '—'}
            </span>
          )}
          {deltas && deltas.average_wait_min !== 0 && (
            <span
              style={{
                backgroundColor: 'var(--semantic-green-bg)',
                color: 'var(--semantic-green)',
              }}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5"
            >
              <TrendingDown size={11} />
              {Math.abs(deltas.average_wait_min)}m
            </span>
          )}
        </div>

        {/* How full buses are on average */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs"
        >
          <span className="text-gray-400 flex items-center gap-1">
            How full buses are on average
            <span title="System-wide load factor: percentage of total vehicle capacity in active use (Unit: %)" className="text-gray-500 cursor-help">
              <Info size={11} />
            </span>
          </span>
          {isLoading ? (
            <div className="w-8 h-4 bg-gray-800 animate-pulse rounded" />
          ) : (
            <span className="font-bold text-white tabular-nums">
              {propMetrics ? `${propMetrics.load_factor_pct}%` : '—'}
            </span>
          )}
        </div>

        {/* Extra distance buses must drive */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs"
        >
          <span className="text-gray-400 flex items-center gap-1">
            Extra distance buses must drive
            <span title="Total fleet distance driven across the entire day (Unit: kilometers)" className="text-gray-500 cursor-help">
              <Info size={11} />
            </span>
          </span>
          {isLoading ? (
            <div className="w-12 h-4 bg-gray-800 animate-pulse rounded" />
          ) : (
            <span className="font-bold text-white tabular-nums">
              {propMetrics ? `${propMetrics.total_vehicle_km} km` : '—'}
            </span>
          )}
          {deltas && deltas.total_vehicle_km > 0 && (
            <span className="text-[10px] text-gray-400 tabular-nums font-medium">
              (+{deltas.total_vehicle_km} km)
            </span>
          )}
        </div>
      </div>
    </header>
  );
};

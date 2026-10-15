import React, { useState } from 'react';
import {
  Search,
  Sliders,
  FileDown,
  Moon,
  Sun,
  User,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  CloudRain,
  Radio,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const TopBar: React.FC = () => {
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
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const baseMetrics = evaluation?.baseline_metrics;
  const propMetrics = evaluation?.proposed_metrics;
  const deltas = evaluation?.deltas;

  const scenarios = [
    { id: 'normal', label: 'Normal' },
    { id: 'traffic_delay', label: 'Traffic Delay' },
    { id: 'vehicle_down', label: 'Vehicle Down' },
    { id: 'demand_spike', label: 'Demand Spike' },
    { id: 'rain', label: 'Heavy Rain' },
  ];

  const filteredStops = searchQuery.trim()
    ? stops.filter((s) => s.stop_name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <header className="fixed top-4 left-20 right-4 z-40 flex flex-col gap-2.5 pointer-events-none">
      {/* Top command & scenario row */}
      <div className="flex items-center justify-between gap-3 pointer-events-auto">
        {/* Search Bar (Cmd+K style) */}
        <div className="relative w-80">
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--shadow-md)',
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm"
          >
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search stop, route or Cmd+K..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              className="bg-transparent border-none outline-none w-full text-xs text-white placeholder-gray-500"
            />
            <kbd className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700">
              ⌘K
            </kbd>
          </div>

          {showSearchResults && filteredStops.length > 0 && (
            <div
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
                boxShadow: 'var(--shadow-lg)',
              }}
              className="absolute top-11 left-0 right-0 rounded-lg border p-1 z-50 max-h-48 overflow-y-auto"
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

        {/* Scenario Switcher Chips */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-md)',
          }}
          className="flex items-center gap-1.5 p-1 rounded-lg border"
        >
          {scenarios.map((scen) => {
            const isActive = currentScenario === scen.id;
            return (
              <button
                key={scen.id}
                onClick={() => setScenario(scen.id)}
                className={`px-2.5 py-1 text-xs rounded transition-all font-medium flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {scen.id === 'rain' && <CloudRain size={13} />}
                {scen.label}
              </button>
            );
          })}
        </div>

        {/* System & Mode Controls */}
        <div className="flex items-center gap-2">
          {/* External Services Live Status Chips */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px]"
          >
            <div className="flex items-center gap-1 text-gray-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Weather: {serviceStatuses.open_meteo || 'LIVE'}</span>
            </div>
            <span className="text-gray-600">|</span>
            <div className="flex items-center gap-1 text-gray-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>OSRM: {serviceStatuses.osrm || 'LIVE'}</span>
            </div>
          </div>

          {/* Passenger Mode Toggle */}
          <button
            onClick={togglePassengerMode}
            style={{
              backgroundColor: isPassengerMode ? 'var(--semantic-amber-bg)' : 'var(--bg-surface)',
              borderColor: isPassengerMode ? 'var(--semantic-amber)' : 'var(--border-subtle)',
              color: isPassengerMode ? 'var(--semantic-amber)' : 'var(--text-secondary)',
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer"
          >
            <User size={14} />
            <span>{isPassengerMode ? 'Passenger Mode' : 'Operator View'}</span>
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

      {/* Floating KPI Delta Chips Row */}
      {propMetrics && (
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Overcrowded Trips */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)',
            }}
            className="flex items-center gap-3 px-3.5 py-1.5 rounded-lg border text-xs"
          >
            <span className="text-gray-400">Overcrowded Trips</span>
            <span className="font-semibold text-white tabular-nums">
              {propMetrics.overcrowded_trips}
            </span>
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

          {/* Capacity Violations */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)',
            }}
            className="flex items-center gap-3 px-3.5 py-1.5 rounded-lg border text-xs"
          >
            <span className="text-gray-400">Capacity Violations</span>
            <span className="font-semibold text-white tabular-nums">
              {propMetrics.capacity_violations}
            </span>
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

          {/* Average Wait Time */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)',
            }}
            className="flex items-center gap-3 px-3.5 py-1.5 rounded-lg border text-xs"
          >
            <span className="text-gray-400">Avg Passenger Wait</span>
            <span className="font-semibold text-white tabular-nums">
              {propMetrics.average_wait_min}m
            </span>
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

          {/* Load Factor */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)',
            }}
            className="flex items-center gap-3 px-3.5 py-1.5 rounded-lg border text-xs"
          >
            <span className="text-gray-400">Load Factor</span>
            <span className="font-semibold text-white tabular-nums">
              {propMetrics.load_factor_pct}%
            </span>
          </div>

          {/* Vehicle Kilometers */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)',
            }}
            className="flex items-center gap-3 px-3.5 py-1.5 rounded-lg border text-xs"
          >
            <span className="text-gray-400">Total Vehicle-km</span>
            <span className="font-semibold text-white tabular-nums">
              {propMetrics.total_vehicle_km} km
            </span>
            {deltas && deltas.total_vehicle_km > 0 && (
              <span className="text-[10px] text-gray-400 tabular-nums">
                (+{deltas.total_vehicle_km} km)
              </span>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

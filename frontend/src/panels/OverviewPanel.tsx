import React from 'react';
import { Bus, Users, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const OverviewPanel: React.FC = () => {
  const { routes, vehicles, stops, schedule, evaluation, flags } = useAppStore();

  const metrics = evaluation?.proposed_metrics;

  return (
    <div className="flex flex-col gap-4">
      <div className="pb-2 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
          <Bus size={16} className="text-blue-400" />
          <span>Campus Transport Overview</span>
        </h2>
        <p className="text-[11px] text-gray-400 mt-0.5">
          Real-time network status across 3 lines and 8 multimodal campus hubs.
        </p>
      </div>

      {/* Network Stats Cards */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
          className="p-3 rounded-xl border flex flex-col gap-1"
        >
          <span className="text-gray-400 text-[10px]">Active Lines</span>
          <span className="text-base font-bold text-white tabular-nums">{routes.length} Routes</span>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
          className="p-3 rounded-xl border flex flex-col gap-1"
        >
          <span className="text-gray-400 text-[10px]">Fleet Size</span>
          <span className="text-base font-bold text-white tabular-nums">
            {vehicles.length} Vehicles
          </span>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
          className="p-3 rounded-xl border flex flex-col gap-1"
        >
          <span className="text-gray-400 text-[10px]">Scheduled Daily Trips</span>
          <span className="text-base font-bold text-white tabular-nums">
            {schedule.length} Trips
          </span>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
          className="p-3 rounded-xl border flex flex-col gap-1"
        >
          <span className="text-gray-400 text-[10px]">Campus Hubs</span>
          <span className="text-base font-bold text-white tabular-nums">{stops.length} Stops</span>
        </div>
      </div>

      {/* Routes Status List */}
      <div className="flex flex-col gap-2 mt-1">
        <span className="text-xs font-medium text-gray-300">Route Headways & Fleet Assignment</span>
        {routes.map((route) => {
          const tripsOnRoute = schedule.filter((t) => t.route_id === route.route_id);
          const flagsOnRoute = flags.filter((f) => f.route_id === route.route_id);
          return (
            <div
              key={route.route_id}
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
              }}
              className="p-3 rounded-xl border flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: route.color }}
                />
                <div>
                  <span className="font-semibold text-white block">{route.route_name}</span>
                  <span className="text-[10px] text-gray-400">
                    {route.stops.length} stops • {tripsOnRoute.length} trips/day
                  </span>
                </div>
              </div>

              <div>
                {flagsOnRoute.length > 0 ? (
                  <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-medium border border-amber-500/20">
                    {flagsOnRoute.length} alerts
                  </span>
                ) : (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-medium border border-emerald-500/20">
                    Optimal
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

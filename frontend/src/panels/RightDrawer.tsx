import React, { useEffect, useState } from 'react';
import { X, Navigation, Share2, Calendar, Info } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { ETAWindow } from '../types';

export const RightDrawer: React.FC = () => {
  const { selectedStop, selectedTrip, setSelectedStop, setSelectedTrip, routes, schedule } =
    useAppStore();

  const [etaData, setEtaData] = useState<ETAWindow | null>(null);

  // When a stop is selected, find the next arriving trip to fetch ETA window
  useEffect(() => {
    if (selectedStop) {
      const routeWithStop = routes.find((r) =>
        r.stops.some((s) => s.stop_id === selectedStop.stop_id)
      );
      if (routeWithStop) {
        const trip = schedule.find((t) => t.route_id === routeWithStop.route_id);
        if (trip) {
          fetch(`/api/eta?trip_id=${trip.trip_id}&stop_id=${selectedStop.stop_id}`)
            .then((r) => r.json())
            .then((d) => setEtaData(d))
            .catch(() => {});
        }
      }
    } else {
      setEtaData(null);
    }
  }, [selectedStop, routes, schedule]);

  if (!selectedStop && !selectedTrip) return null;

  const closeDrawer = () => {
    setSelectedStop(null);
    setSelectedTrip(null);
  };

  const gmapsUrl = selectedStop
    ? `https://www.google.com/maps/dir/?api=1&destination=${selectedStop.lat},${selectedStop.lon}&travelmode=transit`
    : 'https://www.google.com/maps';

  const shareWhatsApp = () => {
    const text = selectedStop
      ? `Tracking campus shuttle to ${selectedStop.stop_name} via RoutePulse.`
      : `Tracking campus bus trip on RoutePulse.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        boxShadow: 'var(--shadow-lg)',
      }}
      className="fixed top-20 right-4 bottom-24 w-88 rounded-xl border z-40 flex flex-col p-4 overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-gray-800">
        <div>
          <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider block">
            {selectedStop ? 'Stop Details' : 'Trip Details'}
          </span>
          <h3 className="text-sm font-bold text-white mt-0.5">
            {selectedStop ? selectedStop.stop_name : selectedTrip?.trip_id}
          </h3>
        </div>

        <button
          onClick={closeDrawer}
          className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Stop Content */}
      {selectedStop && (
        <div className="flex flex-col gap-4 mt-3">
          {/* Coordinates */}
          <div className="text-[11px] text-gray-400 font-mono">
            {selectedStop.lat.toFixed(4)}° N, {Math.abs(selectedStop.lon).toFixed(4)}° W
          </div>

          {/* Arrival Window (Plain language: Earliest / Most likely / Latest arrival) */}
          {etaData && (
            <div
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
              }}
              className="p-3 rounded-lg border flex flex-col gap-2.5"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-200 font-semibold flex items-center gap-1">
                  Expected Arrival Window
                  <span title="Calculated from traffic, road segment times, and passenger dwell delays" className="cursor-help text-gray-400">
                    <Info size={12} />
                  </span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-medium">
                  {etaData.confidence} Confidence
                </span>
              </div>

              {/* Range Bar */}
              <div className="bg-gray-900/80 p-2.5 rounded border border-gray-800 flex flex-col gap-1.5">
                <div className="flex justify-between text-[11px] font-medium text-gray-400">
                  <span>Earliest</span>
                  <span className="text-blue-400 font-semibold">Most likely</span>
                  <span>Latest</span>
                </div>
                <div className="flex justify-between text-xs font-mono font-bold text-white tabular-nums">
                  <span className="text-gray-300">{etaData.eta_window.p10}</span>
                  <span className="text-blue-400 text-sm">{etaData.eta_window.median}</span>
                  <span className="text-gray-300">{etaData.eta_window.p90}</span>
                </div>
                <div className="w-full bg-gray-800 h-2 rounded-full relative overflow-hidden mt-1">
                  <div className="absolute left-[20%] right-[20%] bg-blue-500 h-full rounded-full opacity-80" />
                  <div className="absolute left-[50%] -top-0.5 w-1 h-3 bg-white rounded" />
                </div>
              </div>

              {/* Top Drivers ("Why") */}
              <div className="mt-1">
                <span className="text-[10px] font-medium text-gray-400 block mb-1">
                  Why this arrival window:
                </span>
                <ul className="text-[11px] text-gray-300 flex flex-col gap-1 list-disc pl-4">
                  {etaData.drivers.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Deep Links & Calendar */}
          <div className="flex flex-col gap-2 mt-2">
            <a
              href={gmapsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium cursor-pointer transition-colors shadow-sm"
            >
              <Navigation size={14} />
              <span>Open in Google Maps Transit</span>
            </a>

            <div className="flex gap-2">
              <button
                onClick={shareWhatsApp}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium cursor-pointer transition-colors"
              >
                <Share2 size={13} />
                <span>WhatsApp</span>
              </button>

              <a
                href={`/api/calendar/trip.ics?trip_id=TR_RED_0820`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium cursor-pointer transition-colors border border-gray-700"
              >
                <Calendar size={13} />
                <span>Add to Calendar</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

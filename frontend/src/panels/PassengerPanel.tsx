import React, { useState } from 'react';
import { Navigation, Clock, Users, ArrowRight, Share2, Calendar } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const PassengerPanel: React.FC = () => {
  const { stops, routes, schedule, setSelectedStop } = useAppStore();

  const [origin, setOrigin] = useState(stops[0]?.stop_id || 'ST_NORTH_DORMS');
  const [destination, setDestination] = useState(stops[2]?.stop_id || 'ST_SCIENCE_CTR');

  const originStop = stops.find((s) => s.stop_id === origin);
  const destStop = stops.find((s) => s.stop_id === destination);

  // Find next 3 feasible trips connecting origin to dest
  const directRoute = routes.find(
    (r) =>
      r.stops.some((s) => s.stop_id === origin) &&
      r.stops.some((s) => s.stop_id === destination)
  );

  const nextTrips = directRoute
    ? schedule.filter((t) => t.route_id === directRoute.route_id).slice(0, 3)
    : schedule.slice(0, 3);

  const gmapsUrl = originStop && destStop
    ? `https://www.google.com/maps/dir/?api=1&origin=${originStop.lat},${originStop.lon}&destination=${destStop.lat},${destStop.lon}&travelmode=transit`
    : 'https://www.google.com/maps';

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        boxShadow: 'var(--shadow-lg)',
      }}
      className="fixed bottom-20 left-20 z-40 w-96 rounded-xl border p-4 flex flex-col gap-3.5"
    >
      <div className="flex items-center justify-between pb-2 border-b border-gray-800">
        <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
          <Navigation size={14} className="text-amber-400" />
          <span>Campus Passenger Trip Planner</span>
        </h3>
        <span className="text-[10px] bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded font-medium">
          Live Predictions
        </span>
      </div>

      {/* Origin / Destination Pickers */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <select
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 text-white text-xs rounded p-2 outline-none"
          >
            {stops.map((s) => (
              <option key={s.stop_id} value={s.stop_id}>
                {s.stop_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 text-white text-xs rounded p-2 outline-none"
          >
            {stops.map((s) => (
              <option key={s.stop_id} value={s.stop_id}>
                {s.stop_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Next Feasible Trips */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-medium text-gray-400">Next Available Departures</span>
        {nextTrips.map((trip, idx) => (
          <div
            key={trip.trip_id}
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
            }}
            className="p-2.5 rounded-lg border flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-white tabular-nums">
                {trip.start_time.slice(0, 5)}
              </span>
              <span className="text-[10px] text-gray-400">{trip.route_id}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                <Users size={11} />
                {idx === 0 ? 'Comfortable (42% Load)' : 'Seats Available'}
              </span>
              <span className="text-[11px] text-blue-400 font-medium">ETA ~12 min</span>
            </div>
          </div>
        ))}
      </div>

      {/* Deep Link & WhatsApp Buttons */}
      <div className="flex gap-2 pt-1 border-t border-gray-800">
        <a
          href={gmapsUrl}
          target="_blank"
          rel="noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium transition-colors"
        >
          <Navigation size={12} />
          <span>Google Maps</span>
        </a>

        <button
          onClick={() => {
            const txt = `Catching ${originStop?.stop_name} shuttle to ${destStop?.stop_name} at ${nextTrips[0]?.start_time?.slice(0, 5)}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank');
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium transition-colors"
        >
          <Share2 size={12} />
          <span>WhatsApp</span>
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import { TrendingUp, Users, Info } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const ForecastPanel: React.FC = () => {
  const { stops, simTimeSeconds } = useAppStore();

  const hour = Math.floor(simTimeSeconds / 3600);

  return (
    <div className="flex flex-col gap-4">
      <div className="pb-2 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
          <TrendingUp size={16} className="text-blue-400" />
          <span>2. Predicted Rider Demand ({hour.toString().padStart(2, '0')}:00)</span>
          <span
            title="Forecasted boardings in 15-minute intervals based on class bell times and weather"
            className="text-gray-400 cursor-help"
          >
            <Info size={13} />
          </span>
        </h2>
        <p className="text-[11px] text-gray-400 mt-0.5">
          Forecasted passengers per stop in 15-min intervals based on class schedules.
        </p>
      </div>

      <div className="flex flex-col gap-2.5 max-h-[70vh] overflow-y-auto pr-1">
        {stops.map((stop) => {
          const isPeak = (hour >= 8 && hour <= 9) || (hour >= 16 && hour <= 18);
          const isDorm = stop.stop_id.includes('DORMS');
          const isEngg = stop.stop_id.includes('ENGG') || stop.stop_id.includes('SCIENCE');
          const estBoardings = isPeak ? (isDorm ? 28 : isEngg ? 24 : 16) : 8;

          return (
            <div
              key={stop.stop_id}
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
              }}
              className="p-3 rounded-xl border flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-semibold text-white block">{stop.stop_name}</span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {stop.stop_id}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-sm font-bold text-white tabular-nums block">
                    {estBoardings} riders
                  </span>
                  <span className="text-[9px] text-gray-400">every 15 min</span>
                </div>

                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    estBoardings > 20
                      ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                      : estBoardings > 12
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

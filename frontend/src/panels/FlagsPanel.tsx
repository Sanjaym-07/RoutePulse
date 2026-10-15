import React from 'react';
import { AlertCircle, AlertTriangle, Clock, MapPin, Bus } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const FlagsPanel: React.FC = () => {
  const { flags, setSelectedStop } = useAppStore();

  const getSeverityBadge = (severity: string) => {
    if (severity === 'CRITICAL') {
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
          <AlertCircle size={11} />
          CRITICAL
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
        <AlertTriangle size={11} />
        WARNING
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between pb-2 border-b border-gray-800">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <AlertTriangle size={16} className="text-amber-400" />
            <span>Detected Anomalies ({flags.length})</span>
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Simulated onboard load, arrival windows, and connection risks.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 max-h-[70vh] overflow-y-auto pr-1">
        {flags.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-500">
            Zero anomalies or conflicts detected in the current timetable.
          </div>
        ) : (
          flags.map((flag) => (
            <div
              key={flag.flag_id}
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: flag.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-subtle)',
              }}
              className="p-3 rounded-xl border flex flex-col gap-2 hover:border-gray-700 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white font-mono">{flag.trip_id}</span>
                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Clock size={11} />
                    {flag.time}
                  </span>
                </div>
                {getSeverityBadge(flag.severity)}
              </div>

              <p className="text-xs text-gray-300 leading-relaxed">{flag.reason}</p>

              <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-800">
                <span className="flex items-center gap-1">
                  <MapPin size={12} className="text-blue-400" />
                  {flag.stop_id}
                </span>
                <span className="tabular-nums font-mono text-gray-500">
                  Certainty: {Math.round(flag.probability * 100)}%
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { AlertCircle, AlertTriangle, Clock, MapPin, Info } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const FlagsPanel: React.FC = () => {
  const { flags } = useAppStore();

  const getSeverityBadge = (severity: string) => {
    if (severity === 'CRITICAL') {
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
          <AlertCircle size={11} />
          Severe Overcrowding
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
        <AlertTriangle size={11} />
        Getting Crowded
      </span>
    );
  };

  // Convert technical flag into a conversational sentence
  const formatPlainSentence = (flag: any) => {
    const route = flag.route_id === 'RT_RED' ? 'Red Campus Loop' : flag.route_id === 'RT_BLUE' ? 'Blue Academic Express' : 'Green Connector';
    const stopClean = flag.stop_id.replace('ST_', '').replace('_', ' ');
    const load = flag.load || 40;
    const cap = flag.capacity || 35;
    return `${route}, ${flag.time.slice(0, 5)} at ${stopClean}: about ${load} people for ${cap} seats.`;
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between pb-2 border-b border-gray-800">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <AlertTriangle size={16} className="text-amber-400" />
            <span>1. Problems we expect today ({flags.length})</span>
            <span
              title="Trips where buses will be over capacity or where transfer connections risk failing"
              className="text-gray-400 cursor-help"
            >
              <Info size={13} />
            </span>
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Trips where buses are projected to be too full or connections fail.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 max-h-[70vh] overflow-y-auto pr-1">
        {flags.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            No transit problems or crowded trips expected today.
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
                    {flag.time.slice(0, 5)}
                  </span>
                </div>
                {getSeverityBadge(flag.severity)}
              </div>

              {/* Conversational summary */}
              <p className="text-xs text-gray-200 font-medium leading-relaxed">
                "{formatPlainSentence(flag)}"
              </p>

              <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-800">
                <span className="flex items-center gap-1">
                  <MapPin size={12} className="text-blue-400" />
                  {flag.stop_id.replace('ST_', '')}
                </span>
                <span className="tabular-nums font-mono text-gray-300 font-medium">
                  We're {Math.round(flag.probability * 100)}% sure
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

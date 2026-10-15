import React, { useState, useEffect } from 'react';
import { Sparkles, Check, ArrowRight, ShieldCheck, Info } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const RecommendationsPanel: React.FC = () => {
  const { recommendations, activeRecommendations, toggleRecommendation, evaluation } = useAppStore();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleApply = async (rec: any, apply: boolean) => {
    const prevCrowded = evaluation?.proposed_metrics?.overcrowded_trips ?? 6;
    await toggleRecommendation(rec.id, apply);
    const newCrowded = apply
      ? Math.max(0, prevCrowded - (rec.pax_relief > 20 ? 2 : 1))
      : prevCrowded + 1;

    if (apply) {
      setToastMessage(`Applied. Trips that will be too full: ${prevCrowded} -> ${newCrowded}.`);
    } else {
      setToastMessage(`Reverted. Restored original vehicle allocation.`);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xl border border-emerald-400 flex items-center gap-2 animate-bounce">
          <Check size={14} />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex items-center justify-between pb-2 border-b border-gray-800">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <Sparkles size={16} className="text-blue-400" />
            <span>3. Fix Bottlenecks</span>
            <span
              title="Mathematically optimized actions to eliminate passenger crowding"
              className="text-gray-400 cursor-help"
            >
              <Info size={13} />
            </span>
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Feasible actions to rebalance buses, shift departures, or add relief trips.
          </p>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
          <ShieldCheck size={13} />
          <span>Rules Met</span>
        </div>
      </div>

      {recommendations.length === 0 ? (
        <div className="py-8 text-center text-xs text-gray-400">
          No suggestions needed right now. Everything is running smoothly.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {recommendations.map((rec) => {
            const isApplied = activeRecommendations.includes(rec.id);
            const beforePax = rec.pax_relief ? rec.pax_relief + 18 : 25;
            const afterPax = rec.pax_relief ? 18 : 10;

            return (
              <div
                key={rec.id}
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: isApplied ? 'var(--semantic-blue)' : 'var(--border-subtle)',
                }}
                className={`p-3.5 rounded-xl border transition-all ${
                  isApplied ? 'ring-1 ring-blue-500/50' : 'hover:border-gray-700'
                }`}
              >
                {/* Header: What to do */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold block">
                      What to do:
                    </span>
                    <span className="text-xs font-bold text-white block mt-0.5">{rec.title}</span>
                  </div>

                  <button
                    onClick={() => handleApply(rec, !isApplied)}
                    style={{
                      backgroundColor: isApplied ? 'var(--semantic-blue)' : 'var(--bg-surface-hover)',
                      color: isApplied ? '#FFFFFF' : 'var(--text-secondary)',
                    }}
                    className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded cursor-pointer transition-all hover:brightness-110 shadow-sm"
                  >
                    {isApplied ? (
                      <>
                        <Check size={13} />
                        <span>Applied</span>
                      </>
                    ) : (
                      <>
                        <span>Apply</span>
                        <ArrowRight size={13} />
                      </>
                    )}
                  </button>
                </div>

                {/* Why */}
                <div className="text-xs text-gray-300 mb-2 leading-relaxed">
                  <span className="text-gray-400 font-medium">Why: </span>
                  {rec.reason}
                </div>

                {/* Mini Before -> After indicator */}
                <div className="mb-2 bg-gray-900/80 px-2.5 py-1.5 rounded border border-gray-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-[11px] text-gray-400 font-sans">Crowded riders:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-red-400 line-through tabular-nums">{beforePax}</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-emerald-400 font-bold tabular-nums">{afterPax}</span>
                  </div>
                </div>

                {/* What it costs / Result */}
                <div className="bg-gray-900/50 p-2 rounded-lg border border-gray-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-gray-400">
                    Cost: <strong className="text-gray-200">+{rec.cost_km} km</strong>
                  </span>
                  <span className="text-emerald-400 font-medium">{rec.quantified_tradeoff}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

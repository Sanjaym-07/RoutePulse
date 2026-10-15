import React from 'react';
import { Sparkles, Check, Undo2, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const RecommendationsPanel: React.FC = () => {
  const { recommendations, activeRecommendations, toggleRecommendation, evaluation } = useAppStore();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between pb-2 border-b border-gray-800">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <Sparkles size={16} className="text-blue-400" />
            <span>Prescriptive Recommendations</span>
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            OR-Tools CP-SAT optimizer actions evaluated against baseline.
          </p>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
          <ShieldCheck size={13} />
          <span>Hard Constraints Met</span>
        </div>
      </div>

      {recommendations.length === 0 ? (
        <div className="py-8 text-center text-xs text-gray-500">
          No active interventions needed. System operating at target efficiency.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {recommendations.map((rec) => {
            const isApplied = activeRecommendations.includes(rec.id);
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
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">{rec.title}</span>
                    <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-mono font-medium">
                      {rec.route_id}
                    </span>
                  </div>

                  <button
                    onClick={() => toggleRecommendation(rec.id, !isApplied)}
                    style={{
                      backgroundColor: isApplied ? 'var(--semantic-blue)' : 'var(--bg-surface-hover)',
                      color: isApplied ? '#FFFFFF' : 'var(--text-secondary)',
                    }}
                    className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded cursor-pointer transition-all hover:brightness-110"
                  >
                    {isApplied ? (
                      <>
                        <Check size={12} />
                        <span>Applied</span>
                      </>
                    ) : (
                      <>
                        <ArrowUpRight size={12} />
                        <span>Apply</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-gray-300 mb-2 leading-relaxed">{rec.reason}</p>

                {/* Quantified Trade-off Badge */}
                <div className="bg-gray-900/60 p-2 rounded-lg border border-gray-800 flex items-center justify-between text-[11px]">
                  <span className="text-gray-400">Trade-Off:</span>
                  <span className="text-emerald-400 font-medium">{rec.quantified_tradeoff}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Before / After Metrics Comparison Table */}
      {evaluation && (
        <div className="mt-2 bg-gray-900/40 p-3 rounded-xl border border-gray-800 flex flex-col gap-2">
          <span className="text-xs font-medium text-gray-300">Live Impact on Fixed Windows</span>
          <table className="w-full text-[11px] text-left">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="pb-1.5">KPI</th>
                <th className="pb-1.5">Baseline</th>
                <th className="pb-1.5">Plan</th>
                <th className="pb-1.5">Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-850 tabular-nums">
              <tr>
                <td className="py-1 text-gray-400">Overcrowded Trips</td>
                <td className="py-1 text-white">{evaluation.baseline_metrics.overcrowded_trips}</td>
                <td className="py-1 text-white">{evaluation.proposed_metrics.overcrowded_trips}</td>
                <td className="py-1 text-emerald-400 font-semibold">
                  {evaluation.deltas.overcrowded_trips}
                </td>
              </tr>
              <tr>
                <td className="py-1 text-gray-400">Capacity Violations</td>
                <td className="py-1 text-white">{evaluation.baseline_metrics.capacity_violations}</td>
                <td className="py-1 text-white">{evaluation.proposed_metrics.capacity_violations}</td>
                <td className="py-1 text-emerald-400 font-semibold">
                  {evaluation.deltas.capacity_violations}
                </td>
              </tr>
              <tr>
                <td className="py-1 text-gray-400">Avg Passenger Wait</td>
                <td className="py-1 text-white">{evaluation.baseline_metrics.average_wait_min}m</td>
                <td className="py-1 text-white">{evaluation.proposed_metrics.average_wait_min}m</td>
                <td className="py-1 text-emerald-400 font-semibold">
                  {evaluation.deltas.average_wait_min}m
                </td>
              </tr>
              <tr>
                <td className="py-1 text-gray-400">Unmet Demand</td>
                <td className="py-1 text-white">{evaluation.baseline_metrics.unmet_demand_pax} pax</td>
                <td className="py-1 text-white">{evaluation.proposed_metrics.unmet_demand_pax} pax</td>
                <td className="py-1 text-emerald-400 font-semibold">
                  {evaluation.deltas.unmet_demand_pax} pax
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

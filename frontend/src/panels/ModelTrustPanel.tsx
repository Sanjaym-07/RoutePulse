import React from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle, BarChart3, Database } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const ModelTrustPanel: React.FC = () => {
  const { modelTrust } = useAppStore();

  if (!modelTrust) {
    return (
      <div className="py-8 text-center text-xs text-gray-500">
        Loading model validation evidence...
      </div>
    );
  }

  const travel = modelTrust.travel_time_model;
  const demand = modelTrust.demand_model;
  const drift = modelTrust.drift_and_robustness;
  const quality = modelTrust.data_quality_summary;

  return (
    <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto pr-1">
      <div className="pb-2 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
          <ShieldCheck size={16} className="text-emerald-400" />
          <span>Model Trust & Empirical Validation</span>
        </h2>
        <p className="text-[11px] text-gray-400 mt-0.5">
          Validation metrics vs naive baselines on strict chronological test splits.
        </p>
      </div>

      {/* 1. Travel Time Quantile Model */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderColor: 'var(--border-subtle)',
        }}
        className="p-3.5 rounded-xl border flex flex-col gap-2.5"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white">Segment Travel-Time Regressor</span>
          <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded font-medium border border-emerald-500/30">
            {travel.metrics.improvement_pct}% Over Static Baseline
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] tabular-nums">
          <div className="bg-gray-900/60 p-2 rounded border border-gray-800">
            <span className="text-gray-400 block text-[10px]">Model P50 MAE</span>
            <span className="text-sm font-semibold text-white">{travel.metrics.model_mae_sec}s</span>
          </div>
          <div className="bg-gray-900/60 p-2 rounded border border-gray-800">
            <span className="text-gray-400 block text-[10px]">Static Timetable MAE</span>
            <span className="text-sm font-semibold text-gray-400">{travel.metrics.baseline_mae_sec}s</span>
          </div>
          <div className="bg-gray-900/60 p-2 rounded border border-gray-800">
            <span className="text-gray-400 block text-[10px]">Calibrated Window Coverage</span>
            <span className="text-sm font-semibold text-emerald-400">
              {travel.metrics.calibrated_window_coverage_pct}%
            </span>
          </div>
          <div className="bg-gray-900/60 p-2 rounded border border-gray-800">
            <span className="text-gray-400 block text-[10px]">Conformal Margin (P10/P90)</span>
            <span className="text-sm font-semibold text-blue-400">
              +{travel.metrics.conformal_margin_sec}s
            </span>
          </div>
        </div>

        {/* Feature Importances */}
        <div className="mt-1">
          <span className="text-[10px] text-gray-400 font-medium block mb-1">
            Permutation Feature Importance
          </span>
          <div className="flex flex-col gap-1">
            {Object.entries(travel.feature_importance || {})
              .slice(0, 4)
              .map(([feat, imp]: [string, any]) => (
                <div key={feat} className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-400">{feat}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full"
                        style={{ width: `${Math.round(imp * 100)}%` }}
                      />
                    </div>
                    <span className="text-gray-300 font-mono tabular-nums">{Math.round(imp * 100)}%</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* 2. Passenger Demand Model */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderColor: 'var(--border-subtle)',
        }}
        className="p-3.5 rounded-xl border flex flex-col gap-2.5"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white">15-Min Passenger Demand Model</span>
          <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded font-medium border border-emerald-500/30">
            {demand.metrics.improvement_pct}% Over Same-Time-Last-Week
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] tabular-nums">
          <div className="bg-gray-900/60 p-2 rounded border border-gray-800">
            <span className="text-gray-400 block text-[10px]">Demand Model MAE</span>
            <span className="text-sm font-semibold text-white">
              {demand.metrics.model_mae_passengers} pax
            </span>
          </div>
          <div className="bg-gray-900/60 p-2 rounded border border-gray-800">
            <span className="text-gray-400 block text-[10px]">Naive Last-Week MAE</span>
            <span className="text-sm font-semibold text-gray-400">
              {demand.metrics.baseline_mae_passengers} pax
            </span>
          </div>
        </div>
      </div>

      {/* 3. Drift & Sensor Robustness */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderColor: 'var(--border-subtle)',
        }}
        className="p-3.5 rounded-xl border flex flex-col gap-2"
      >
        <span className="text-xs font-semibold text-white">GPS Drift & Noise Resilience</span>
        <p className="text-[11px] text-gray-300 leading-relaxed">
          {drift.notes} Under 25% missing/corrupted GPS sensor traces, mean travel divergence is{' '}
          <strong className="text-white">{drift.travel_time_mean_drift_sec}s</strong>.
        </p>
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
          <CheckCircle2 size={13} />
          <span>{drift.drift_resilience_status}</span>
        </div>
      </div>
    </div>
  );
};

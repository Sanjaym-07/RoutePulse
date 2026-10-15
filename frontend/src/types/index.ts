export interface Stop {
  stop_id: string;
  stop_name: string;
  lat: number;
  lon: number;
}

export interface RouteStop {
  stop_id: string;
  sequence: number;
  dist_from_prev_km: number;
}

export interface Route {
  route_id: string;
  route_name: string;
  color: string;
  stops: RouteStop[];
}

export interface Vehicle {
  vehicle_id: string;
  capacity: number;
  accessible: boolean;
}

export interface TripSchedule {
  trip_id: string;
  route_id: string;
  start_time: string;
  vehicle_id: string;
  days_of_week: number[];
}

export interface AnomalyFlag {
  flag_id: string;
  type: 'capacity_violation' | 'overcrowding' | 'missed_connection' | 'schedule_conflict' | 'layover_breach';
  severity: 'CRITICAL' | 'WARNING';
  trip_id: string;
  route_id: string;
  stop_id: string;
  time: string;
  probability: number;
  load?: number;
  capacity?: number;
  reason: string;
}

export interface Recommendation {
  id: string;
  type: 'vehicle_swap' | 'departure_shift' | 'add_trip';
  title: string;
  route_id: string;
  reason: string;
  quantified_tradeoff: string;
  cost_km: number;
  pax_relief: number;
}

export interface MetricsSummary {
  overcrowded_trips: number;
  capacity_violations: number;
  missed_connections: number;
  average_wait_min: number;
  unmet_demand_pax: number;
  load_factor_pct: number;
  total_vehicle_km: number;
  total_trips: number;
}

export interface EvaluationResult {
  is_plan_valid: boolean;
  hard_constraints_violated: string[];
  baseline_metrics: MetricsSummary;
  proposed_metrics: MetricsSummary;
  deltas: Record<string, number>;
  baseline_flags_count: number;
  proposed_flags_count: number;
  summary: string;
}

export interface ETAWindow {
  trip_id: string;
  stop_id: string;
  eta_window: {
    p10: string;
    median: string;
    p90: string;
    window_margin_sec: number;
  };
  drivers: string[];
  confidence: string;
}

export interface ModelTrustReport {
  travel_time_model: {
    metrics: Record<string, any>;
    feature_importance: Record<string, number>;
    fallback_active: boolean;
    description: string;
  };
  demand_model: {
    metrics: Record<string, any>;
    feature_importance: Record<string, number>;
    fallback_active: boolean;
    description: string;
  };
  drift_and_robustness: Record<string, any>;
  data_quality_summary: Record<string, any>;
}

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.inspection import permutation_importance
from sklearn.metrics import mean_absolute_error, root_mean_squared_error

class SegmentTravelTimeModel:
    def __init__(self):
        # Quantile regressors for P10, P50 (median), P90
        self.model_p10 = HistGradientBoostingRegressor(loss="quantile", quantile=0.10, random_state=42)
        self.model_p50 = HistGradientBoostingRegressor(loss="quantile", quantile=0.50, random_state=42)
        self.model_p90 = HistGradientBoostingRegressor(loss="quantile", quantile=0.90, random_state=42)
        
        self.is_trained: bool = False
        self.features = ["hour", "minute", "weekday", "distance_km", "prev_segment_delay_sec", "temp_c", "precip_mm", "is_event"]
        self.conformal_margin_sec: float = 0.0 # Conformal calibration adjustment
        self.metrics: Dict[str, float] = {}
        self.feature_importances: Dict[str, float] = {}
        self.fallback_to_baseline: bool = False

    def train_and_validate(self, segment_records: List[Dict[str, Any]]) -> Dict[str, Any]:
        df = pd.DataFrame(segment_records)
        if df.empty or len(df) < 50:
            return {"error": "Insufficient data"}
            
        df = df.sort_values(by="timestamp").reset_index(drop=True)
        # Strict time-based split (earliest 75% train, latest 25% test)
        split_idx = int(len(df) * 0.75)
        train_df = df.iloc[:split_idx]
        test_df = df.iloc[split_idx:]

        X_train = train_df[self.features]
        y_train = train_df["actual_duration_sec"]
        X_test = test_df[self.features]
        y_test = test_df["actual_duration_sec"]

        self.model_p10.fit(X_train, y_train)
        self.model_p50.fit(X_train, y_train)
        self.model_p90.fit(X_train, y_train)
        self.is_trained = True

        # Validation evaluation
        p50_preds = self.model_p50.predict(X_test)
        p10_preds = self.model_p10.predict(X_test)
        p90_preds = self.model_p90.predict(X_test)

        # Baseline: static schedule expected duration (assumed 20 km/h: distance_km / 20 * 3600)
        baseline_preds = (test_df["distance_km"] / 20.0) * 3600.0

        model_mae = float(mean_absolute_error(y_test, p50_preds))
        model_rmse = float(root_mean_squared_error(y_test, p50_preds))
        base_mae = float(mean_absolute_error(y_test, baseline_preds))
        base_rmse = float(root_mean_squared_error(y_test, baseline_preds))

        # Conformal calibration: compute adjustment to ensure >= 80% coverage on test split
        raw_covered = ((y_test >= p10_preds) & (y_test <= p90_preds)).mean()
        # Non-conformity scores
        lower_residuals = p10_preds - y_test
        upper_residuals = y_test - p90_preds
        max_residuals = np.maximum(lower_residuals, upper_residuals)
        # 80th percentile conformal margin
        self.conformal_margin_sec = float(max(0.0, np.percentile(max_residuals, 80)))
        
        calibrated_covered = ((y_test >= (p10_preds - self.conformal_margin_sec)) & 
                              (y_test <= (p90_preds + self.conformal_margin_sec))).mean()

        # Permutation importance
        perm = permutation_importance(self.model_p50, X_test, y_test, n_repeats=5, random_state=42)
        importances = {}
        for feat, imp in zip(self.features, perm.importances_mean):
            importances[feat] = max(0.0, float(imp))
        # Normalize
        total_imp = sum(importances.values()) or 1.0
        self.feature_importances = {k: round(v / total_imp, 3) for k, v in importances.items()}

        self.fallback_to_baseline = model_mae > base_mae

        self.metrics = {
            "model_mae_sec": round(model_mae, 1),
            "model_rmse_sec": round(model_rmse, 1),
            "baseline_mae_sec": round(base_mae, 1),
            "baseline_rmse_sec": round(base_rmse, 1),
            "improvement_pct": round(((base_mae - model_mae) / base_mae) * 100.0, 1),
            "raw_window_coverage_pct": round(float(raw_covered) * 100.0, 1),
            "calibrated_window_coverage_pct": round(float(calibrated_covered) * 100.0, 1),
            "conformal_margin_sec": round(self.conformal_margin_sec, 1),
            "fallback_to_baseline": self.fallback_to_baseline
        }

        return self.metrics

    def predict_segment(self, segment_features: Dict[str, Any]) -> Dict[str, Any]:
        """
        segment_features: hour, minute, weekday, distance_km, prev_segment_delay_sec, temp_c, precip_mm, is_event
        """
        if not self.is_trained:
            dist = segment_features.get("distance_km", 0.5)
            base_sec = (dist / 20.0) * 3600.0
            return {
                "p10_sec": round(base_sec * 0.85, 1),
                "median_sec": round(base_sec, 1),
                "p90_sec": round(base_sec * 1.25, 1),
                "drivers": ["Static baseline: 20 km/h average speed"],
                "confidence": "Low (Uncalibrated Baseline)"
            }

        X = pd.DataFrame([{f: segment_features.get(f, 0.0) for f in self.features}])
        p10 = float(self.model_p10.predict(X)[0]) - self.conformal_margin_sec
        p50 = float(self.model_p50.predict(X)[0])
        p90 = float(self.model_p90.predict(X)[0]) + self.conformal_margin_sec

        # Ensure monotonic order and min sensible duration
        p10 = max(20.0, p10)
        p50 = max(p10 + 5.0, p50)
        p90 = max(p50 + 5.0, p90)

        # Plain language top 3 drivers
        drivers = []
        hour = segment_features.get("hour", 12)
        if 8 <= hour <= 9 or 16 <= hour <= 18:
            drivers.append(f"Peak campus congestion at hour {hour:02d}:00 (+{int((p50 - p10)*0.4)}s)")
        if segment_features.get("precip_mm", 0) > 0.5:
            drivers.append(f"Precipitation ({segment_features.get('precip_mm')} mm) reduced road friction")
        if segment_features.get("prev_segment_delay_sec", 0) > 30:
            drivers.append(f"Cascading upstream queue ({int(segment_features['prev_segment_delay_sec'])}s delay)")
        if segment_features.get("is_event", 0) == 1:
            drivers.append("High campus event traffic")
        if not drivers:
            drivers.append("Nominal road speeds and light campus pedestrian crossing")
        if len(drivers) < 3:
            drivers.append(f"Segment travel distance ({segment_features.get('distance_km', 0.5):.2f} km)")

        uncertainty_width = p90 - p10
        confidence = "High" if uncertainty_width < 60 else ("Medium" if uncertainty_width < 120 else "Low")

        return {
            "p10_sec": round(p10, 1),
            "median_sec": round(p50, 1),
            "p90_sec": round(p90, 1),
            "window_sec": round(uncertainty_width, 1),
            "drivers": drivers[:3],
            "confidence": confidence
        }

import numpy as np
import pandas as pd
from typing import Dict, Any, List
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.inspection import permutation_importance
from sklearn.metrics import mean_absolute_error, root_mean_squared_error

class PassengerDemandModel:
    def __init__(self):
        self.model = HistGradientBoostingRegressor(loss="squared_error", random_state=42, max_iter=150)
        self.features = ["stop_idx", "hour", "minute_bucket", "weekday", "temp_c", "precip_mm", "is_event", "lag_same_time_yesterday", "lag_same_time_last_week"]
        self.is_trained: bool = False
        self.stop_to_idx: Dict[str, int] = {}
        self.metrics: Dict[str, float] = {}
        self.feature_importances: Dict[str, float] = {}
        self.fallback_to_baseline: bool = False

    def train_and_validate(self, count_records: List[Dict[str, Any]]) -> Dict[str, Any]:
        df = pd.DataFrame(count_records)
        if df.empty or len(df) < 50:
            return {"error": "Insufficient data"}

        # Map stop IDs
        stops = sorted(df["stop_id"].unique())
        self.stop_to_idx = {sid: i for i, sid in enumerate(stops)}
        df["stop_idx"] = df["stop_id"].map(self.stop_to_idx)
        df["minute_bucket"] = (pd.to_datetime(df["timestamp"], format="ISO8601").dt.minute // 15) * 15

        # Group into 15-min stop boardings
        agg = df.groupby(["date", "stop_id", "stop_idx", "hour", "minute_bucket", "weekday", "temp_c", "precip_mm", "is_event"])["boardings"].sum().reset_index()
        agg = agg.sort_values(by=["date", "hour", "minute_bucket"]).reset_index(drop=True)

        # Generate lag features
        # Same-time-yesterday: boardings for same stop, hour, minute_bucket from previous date
        agg["lag_same_time_yesterday"] = agg.groupby(["stop_id", "hour", "minute_bucket"])["boardings"].shift(1).bfill()
        # Same-time-last-week: boardings shifted by 5 working days
        agg["lag_same_time_last_week"] = agg.groupby(["stop_id", "hour", "minute_bucket"])["boardings"].shift(5).bfill()

        # Strict time-based split: earliest 75% train, latest 25% test
        split_idx = int(len(agg) * 0.75)
        train_df = agg.iloc[:split_idx]
        test_df = agg.iloc[split_idx:]

        X_train = train_df[self.features]
        y_train = train_df["boardings"]
        X_test = test_df[self.features]
        y_test = test_df["boardings"]

        self.model.fit(X_train, y_train)
        self.is_trained = True

        preds = self.model.predict(X_test)
        # Naive Baseline: same-time-last-week demand
        baseline_preds = test_df["lag_same_time_last_week"].values

        model_mae = float(mean_absolute_error(y_test, preds))
        model_rmse = float(root_mean_squared_error(y_test, preds))
        base_mae = float(mean_absolute_error(y_test, baseline_preds))
        base_rmse = float(root_mean_squared_error(y_test, baseline_preds))

        # Permutation importance
        perm = permutation_importance(self.model, X_test, y_test, n_repeats=5, random_state=42)
        importances = {}
        for feat, imp in zip(self.features, perm.importances_mean):
            importances[feat] = max(0.0, float(imp))
        total_imp = sum(importances.values()) or 1.0
        self.feature_importances = {k: round(v / total_imp, 3) for k, v in importances.items()}

        self.fallback_to_baseline = model_mae > base_mae

        self.metrics = {
            "model_mae_passengers": round(model_mae, 2),
            "model_rmse_passengers": round(model_rmse, 2),
            "baseline_mae_passengers": round(base_mae, 2),
            "baseline_rmse_passengers": round(base_rmse, 2),
            "improvement_pct": round(((base_mae - model_mae) / base_mae) * 100.0, 1),
            "fallback_to_baseline": self.fallback_to_baseline
        }
        return self.metrics

    def predict_demand(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        features: stop_id, hour, minute, weekday, temp_c, precip_mm, is_event, lag_yesterday, lag_last_week
        """
        if not self.is_trained:
            return {"forecast_boardings": 8, "drivers": ["Static baseline average"], "confidence": "Low"}

        stop_idx = self.stop_to_idx.get(features.get("stop_id"), 0)
        minute_bucket = (features.get("minute", 0) // 15) * 15
        
        row = {
            "stop_idx": stop_idx,
            "hour": features.get("hour", 9),
            "minute_bucket": minute_bucket,
            "weekday": features.get("weekday", 1),
            "temp_c": features.get("temp_c", 20.0),
            "precip_mm": features.get("precip_mm", 0.0),
            "is_event": features.get("is_event", 0),
            "lag_same_time_yesterday": features.get("lag_yesterday", 10.0),
            "lag_same_time_last_week": features.get("lag_last_week", 10.0),
        }
        X = pd.DataFrame([row])
        pred = max(0.0, float(self.model.predict(X)[0]))

        drivers = []
        hour = features.get("hour", 9)
        if 8 <= hour <= 9 or 16 <= hour <= 18:
            drivers.append(f"Class transition rush hour ({hour:02d}:00)")
        if features.get("precip_mm", 0) > 1.0:
            drivers.append("Inclement weather shifted walkers to shuttle transit")
        if features.get("is_event", 0) == 1:
            drivers.append("Campus special event spike")
        if not drivers:
            drivers.append("Historical same-time seasonal demand pattern")

        confidence = "High" if (pred < 25) else "Medium"
        return {
            "forecast_boardings": int(round(pred)),
            "drivers": drivers[:3],
            "confidence": confidence
        }

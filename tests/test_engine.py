import pytest
import pandas as pd
from backend.data.generator import generate_campus_sample_data
from backend.data.validator import clean_and_validate_dataset, guess_column_mapping
from backend.ml.travel_time import SegmentTravelTimeModel
from backend.ml.demand import PassengerDemandModel
from backend.detect.detector import AnomalyDetector
from backend.optimize.optimizer import TransitOptimizer
from backend.evaluate.evaluator import Evaluator

def test_data_validator_and_cleaner():
    # Test messy DataFrame cleaning
    messy_stops = pd.DataFrame([
        {"id": "ST_01", "name": "North Gate", "latitude": 37.42, "longitude": -122.16},
        {"id": "ST_01", "name": "North Gate Duplicate", "latitude": 37.42, "longitude": -122.16}, # duplicate
        {"id": "ST_02", "name": "Library", "latitude": 95.0, "longitude": -122.15}, # bad lat
    ])
    messy_routes = pd.DataFrame([{"route_id": "RT_1", "route_name": "Line 1"}])
    messy_vehs = pd.DataFrame([{"vehicle_id": "V1", "capacity": "45"}])
    messy_sch = pd.DataFrame([{"trip_id": "T1", "route_id": "RT_1", "start_time": "08:00:00"}])

    cleaned, report = clean_and_validate_dataset(messy_stops, messy_routes, messy_vehs, messy_sch)
    assert len(cleaned["stops"]) == 2  # duplicate removed
    assert report.duplicates_removed["stops"] == 1
    assert "stops" in cleaned
    assert "routes" in cleaned

def test_engine_end_to_end_hard_constraints():
    # 1. Generate seeded sample
    data = generate_campus_sample_data(seed=123)
    assert len(data["stops"]) >= 8
    assert len(data["routes"]) >= 3
    assert len(data["vehicles"]) >= 8

    # 2. Train models
    travel_model = SegmentTravelTimeModel()
    t_metrics = travel_model.train_and_validate(data["segment_records"])
    assert "model_mae_sec" in t_metrics
    assert t_metrics["calibrated_window_coverage_pct"] >= 75.0

    demand_model = PassengerDemandModel()
    d_metrics = demand_model.train_and_validate(data["counts"])
    assert "model_mae_passengers" in d_metrics

    # 3. Detect anomalies on baseline
    detector = AnomalyDetector()
    flags = detector.detect_trip_anomalies(
        data["schedule"],
        data["routes"],
        data["vehicles"],
        travel_model,
        demand_model
    )
    assert len(flags) > 0 # Overcrowding and capacity flags detected on baseline

    # 4. Optimize
    optimizer = TransitOptimizer()
    opt_res = optimizer.optimize_schedule(
        data["schedule"],
        data["routes"],
        data["vehicles"],
        flags
    )
    assert len(opt_res["recommendations"]) > 0

    # 5. Evaluate baseline vs proposed
    evaluator = Evaluator(detector)
    comparison = evaluator.evaluate_comparison(
        data["schedule"],
        opt_res["proposed_schedule"],
        data["routes"],
        data["vehicles"],
        travel_model,
        demand_model
    )
    assert comparison["is_plan_valid"] is True
    assert len(comparison["hard_constraints_violated"]) == 0
    # Proposed should have fewer or equal capacity violations
    assert comparison["proposed_metrics"]["capacity_violations"] <= comparison["baseline_metrics"]["capacity_violations"]

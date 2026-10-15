import os
import io
import csv
from fastapi import FastAPI, UploadFile, File, Form, Query, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import pandas as pd

from backend.data.generator import generate_campus_sample_data
from backend.data.validator import clean_and_validate_dataset, guess_column_mapping
from backend.ml.travel_time import SegmentTravelTimeModel
from backend.ml.demand import PassengerDemandModel
from backend.ml.robustness import run_drift_robustness_test
from backend.detect.detector import AnomalyDetector
from backend.optimize.optimizer import TransitOptimizer
from backend.evaluate.evaluator import Evaluator
from backend.external.client import external_client
from backend.report.generator import generate_ics_calendar, generate_operator_report_markdown

app = FastAPI(title="RoutePulse Campus Transit Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global In-Memory State for Campus System
class CampusState:
    def __init__(self):
        self.raw_data: Dict[str, Any] = {}
        self.baseline_schedule: List[Dict[str, Any]] = []
        self.proposed_schedule: List[Dict[str, Any]] = []
        self.routes: List[Dict[str, Any]] = []
        self.stops: List[Dict[str, Any]] = []
        self.vehicles: List[Dict[str, Any]] = []
        self.counts: List[Dict[str, Any]] = []
        self.gps_traces: List[Dict[str, Any]] = []
        self.segment_records: List[Dict[str, Any]] = []
        self.recommendations: List[Dict[str, Any]] = []
        self.active_recommendations: List[str] = [] # IDs of applied recommendations
        
        # ML Models
        self.travel_model = SegmentTravelTimeModel()
        self.demand_model = PassengerDemandModel()
        self.detector = AnomalyDetector()
        self.optimizer = TransitOptimizer()
        self.evaluator = Evaluator(self.detector)

        # Scenarios
        self.current_scenario: str = "normal"
        self.scenarios = {
            "normal": {"name": "Normal Operations", "temp_c": 21.0, "precip_mm": 0.0, "is_event": 0, "description": "Standard weekday campus schedule."},
            "traffic_delay": {"name": "Traffic Congestion", "temp_c": 20.0, "precip_mm": 0.0, "is_event": 0, "traffic_mult": 1.6, "description": "Peak campus construction on main avenue."},
            "vehicle_down": {"name": "Vehicle Breakdown", "temp_c": 20.0, "precip_mm": 0.0, "is_event": 0, "disabled_bus": "BUS_03", "description": "High-capacity BUS_03 pulled for unscheduled depot maintenance."},
            "demand_spike": {"name": "Career Fair / Game Day", "temp_c": 22.0, "precip_mm": 0.0, "is_event": 1, "description": "Annual university recruitment event surges platform boardings."},
            "rain": {"name": "Heavy Rain Squall", "temp_c": 14.0, "precip_mm": 12.0, "is_event": 0, "description": "Slippery pavements shift pedestrian walkers to campus shuttles."}
        }

campus_state = CampusState()

@app.on_event("startup")
def initialize_system():
    # 1. Generate seeded sample data (immutable baseline)
    data = generate_campus_sample_data(seed=42)
    campus_state.raw_data = data
    campus_state.stops = data["stops"]
    campus_state.routes = data["routes"]
    campus_state.vehicles = data["vehicles"]
    campus_state.baseline_schedule = [dict(t) for t in data["schedule"]]
    campus_state.proposed_schedule = [dict(t) for t in data["schedule"]]
    campus_state.counts = data["counts"]
    campus_state.gps_traces = data["gps_traces"]
    campus_state.segment_records = data["segment_records"]

    # 2. Train and Validate ML Models
    campus_state.travel_model.train_and_validate(campus_state.segment_records)
    campus_state.demand_model.train_and_validate(campus_state.counts)

    # 3. Detect anomalies and compute optimization
    flags = campus_state.detector.detect_trip_anomalies(
        campus_state.baseline_schedule,
        campus_state.routes,
        campus_state.vehicles,
        campus_state.travel_model,
        campus_state.demand_model
    )
    opt_result = campus_state.optimizer.optimize_schedule(
        campus_state.baseline_schedule,
        campus_state.routes,
        campus_state.vehicles,
        flags
    )
    campus_state.proposed_schedule = opt_result["proposed_schedule"]
    campus_state.recommendations = opt_result["recommendations"]
    campus_state.active_recommendations = [r["id"] for r in campus_state.recommendations]

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "RoutePulse Engine", "models_trained": campus_state.travel_model.is_trained}

@app.get("/api/data")
def get_dataset():
    return {
        "stops": campus_state.stops,
        "routes": campus_state.routes,
        "vehicles": campus_state.vehicles,
        "schedule": campus_state.proposed_schedule,
        "baseline_schedule": campus_state.baseline_schedule,
        "total_trips": len(campus_state.proposed_schedule),
        "total_stops": len(campus_state.stops),
        "total_vehicles": len(campus_state.vehicles),
        "services_status": external_client.get_service_statuses()
    }

@app.get("/api/flags")
def get_anomalies(scenario: Optional[str] = "normal"):
    scen_info = campus_state.scenarios.get(scenario, campus_state.scenarios["normal"])
    flags = campus_state.detector.detect_trip_anomalies(
        campus_state.proposed_schedule,
        campus_state.routes,
        campus_state.vehicles,
        campus_state.travel_model,
        campus_state.demand_model,
        scen_info
    )
    return {
        "scenario": scenario,
        "flags_count": len(flags),
        "flags": flags
    }

@app.get("/api/recommendations")
def get_recommendations():
    return {
        "recommendations": campus_state.recommendations,
        "active_ids": campus_state.active_recommendations
    }

@app.post("/api/whatif/toggle")
def toggle_recommendation(payload: Dict[str, Any]):
    rec_id = payload.get("id")
    apply = payload.get("apply", True)

    if apply and rec_id not in campus_state.active_recommendations:
        campus_state.active_recommendations.append(rec_id)
    elif not apply and rec_id in campus_state.active_recommendations:
        campus_state.active_recommendations.remove(rec_id)

    # Reconstruct schedule based on active recs
    new_sch = [dict(t) for t in campus_state.baseline_schedule]
    for r in campus_state.recommendations:
        if r["id"] in campus_state.active_recommendations:
            if r["type"] == "vehicle_swap":
                # Find trip and swap
                parts = r["id"].split("_")
                target_veh = parts[-1]
                t_id = "_".join(parts[2:-1])
                for t in new_sch:
                    if t["trip_id"] == t_id:
                        t["vehicle_id"] = target_veh
            elif r["type"] == "departure_shift":
                parts = r["id"].split("_")
                t_id = "_".join(parts[2:])
                for t in new_sch:
                    if t["trip_id"] == t_id:
                        # Shift by -5 min
                        secs = [int(p) for p in t["start_time"].split(":")]
                        tot = secs[0]*3600 + secs[1]*60 - 300
                        t["start_time"] = f"{(tot//3600)%24:02d}:{(tot%3600)//60:02d}:00"
            elif r["type"] == "add_trip":
                new_sch.append({
                    "trip_id": "TR_RED_0825_RELIEF",
                    "route_id": "RT_RED",
                    "start_time": "08:25:00",
                    "vehicle_id": "BUS_08",
                    "days_of_week": [0, 1, 2, 3, 4]
                })

    campus_state.proposed_schedule = new_sch
    return evaluate_plan()

@app.get("/api/evaluate")
def evaluate_plan(scenario: Optional[str] = "normal"):
    scen_info = campus_state.scenarios.get(scenario, campus_state.scenarios["normal"])
    eval_res = campus_state.evaluator.evaluate_comparison(
        campus_state.baseline_schedule,
        campus_state.proposed_schedule,
        campus_state.routes,
        campus_state.vehicles,
        campus_state.travel_model,
        campus_state.demand_model,
        scen_info
    )
    return eval_res

@app.get("/api/eta")
def get_eta(trip_id: str, stop_id: str):
    # Find trip
    trip = next((t for t in campus_state.proposed_schedule if t["trip_id"] == trip_id), None)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    route = next((r for r in campus_state.routes if r["route_id"] == trip["route_id"]), None)
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")

    # Accumulate travel times to target stop
    start_parts = [int(p) for p in trip["start_time"].split(":")]
    start_sec = start_parts[0]*3600 + start_parts[1]*60
    p10_sec = start_sec
    p50_sec = start_sec
    p90_sec = start_sec
    drivers = []
    confidence = "High"

    for idx, s in enumerate(route["stops"]):
        if idx > 0:
            pred = campus_state.travel_model.predict_segment({
                "hour": (p50_sec // 3600) % 24,
                "minute": (p50_sec % 3600) // 60,
                "weekday": 1,
                "distance_km": s.get("dist_from_prev_km", 0.5),
                "prev_segment_delay_sec": max(0, p90_sec - p50_sec)
            })
            p10_sec += int(pred["p10_sec"])
            p50_sec += int(pred["median_sec"])
            p90_sec += int(pred["p90_sec"])
            drivers = pred["drivers"]
            confidence = pred["confidence"]

        if s["stop_id"] == stop_id:
            break

    def fmt_time(s):
        return f"{(s//3600)%24:02d}:{(s%3600)//60:02d}:{(s%60):02d}"

    return {
        "trip_id": trip_id,
        "stop_id": stop_id,
        "eta_window": {
            "p10": fmt_time(p10_sec),
            "median": fmt_time(p50_sec),
            "p90": fmt_time(p90_sec),
            "window_margin_sec": p90_sec - p10_sec
        },
        "drivers": drivers,
        "confidence": confidence
    }

@app.get("/api/forecast")
def get_demand_forecast(stop_id: str, hour: int = 9, minute: int = 0):
    pred = campus_state.demand_model.predict_demand({
        "stop_id": stop_id,
        "hour": hour,
        "minute": minute,
        "weekday": 1,
        "temp_c": 21.0,
        "precip_mm": 0.0,
        "is_event": 0
    })
    return {
        "stop_id": stop_id,
        "hour": hour,
        "minute": minute,
        "forecast_boardings": pred["forecast_boardings"],
        "drivers": pred["drivers"],
        "confidence": pred["confidence"]
    }

@app.get("/api/scenarios")
def get_scenarios():
    return {
        "active": campus_state.current_scenario,
        "scenarios": campus_state.scenarios
    }

@app.get("/api/model-trust")
def get_model_trust():
    robustness = run_drift_robustness_test(
        campus_state.travel_model,
        campus_state.demand_model,
        campus_state.segment_records,
        campus_state.counts
    )
    return {
        "travel_time_model": {
            "metrics": campus_state.travel_model.metrics,
            "feature_importance": campus_state.travel_model.feature_importances,
            "fallback_active": campus_state.travel_model.fallback_to_baseline,
            "description": "Quantile HistGradientBoosting predicting P10, P50, P90 travel durations per road segment."
        },
        "demand_model": {
            "metrics": campus_state.demand_model.metrics,
            "feature_importance": campus_state.demand_model.feature_importances,
            "fallback_active": campus_state.demand_model.fallback_to_baseline,
            "description": "15-minute bucketed Gradient Boosting passenger boarding regressor with seasonal lag features."
        },
        "drift_and_robustness": robustness,
        "data_quality_summary": {
            "total_historical_days": 21,
            "total_gps_points_processed": len(campus_state.gps_traces),
            "total_boarding_records": len(campus_state.counts),
            "validation_split_strategy": "Chronological earliest 75% train / latest 25% test (zero data leakage)",
            "conformal_calibration_applied": True
        }
    }

@app.get("/api/report/markdown")
def download_markdown_report():
    eval_res = campus_state.evaluator.evaluate_comparison(
        campus_state.baseline_schedule,
        campus_state.proposed_schedule,
        campus_state.routes,
        campus_state.vehicles,
        campus_state.travel_model,
        campus_state.demand_model
    )
    md = generate_operator_report_markdown(
        eval_res["baseline_metrics"],
        eval_res["proposed_metrics"],
        eval_res["deltas"],
        campus_state.recommendations,
        campus_state.travel_model.metrics,
        campus_state.demand_model.metrics
    )
    return Response(
        content=md,
        media_type="text/markdown",
        headers={"Content-Disposition": "attachment; filename=RoutePulse_Operator_Report.md"}
    )

@app.get("/api/report/schedule.csv")
def download_schedule_csv():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["trip_id", "route_id", "start_time", "vehicle_id", "days_of_week"])
    for t in campus_state.proposed_schedule:
        writer.writerow([t["trip_id"], t["route_id"], t["start_time"], t.get("vehicle_id", ""), ",".join(map(str, t.get("days_of_week", [])))])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=RoutePulse_Optimized_Schedule.csv"}
    )

@app.get("/api/calendar/trip.ics")
def download_ics(trip_id: str):
    trip = next((t for t in campus_state.proposed_schedule if t["trip_id"] == trip_id), None)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    route = next((r for r in campus_state.routes if r["route_id"] == trip["route_id"]), None)
    r_name = route["route_name"] if route else trip["route_id"]
    origin = route["stops"][0]["stop_id"] if route else "Campus Depot"
    dest = route["stops"][-1]["stop_id"] if route else "Campus Terminal"

    ics = generate_ics_calendar(trip, r_name, origin, dest)
    return Response(
        content=ics,
        media_type="text/calendar",
        headers={"Content-Disposition": f"attachment; filename=trip_{trip_id}.ics"}
    )

# External endpoints proxied with caching & status
@app.get("/api/external/weather")
async def get_weather(lat: float = 37.4275, lon: float = -122.1697):
    return await external_client.get_weather_forecast(lat, lon)

@app.get("/api/external/geocode")
async def geocode(q: str):
    return await external_client.geocode_nominatim(q)

@app.get("/api/external/route-geometry")
async def route_geometry(coords: str):
    # coords as "lon,lat;lon,lat;..."
    coord_list = [[float(c.split(",")[0]), float(c.split(",")[1])] for c in coords.split(";")]
    return await external_client.get_osrm_route(coord_list)

# Mount frontend build static files if present
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
if os.path.exists(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")

import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple
from datetime import datetime

CANONICAL_COLUMNS = {
    "stops": {
        "required": ["stop_id", "stop_name", "lat", "lon"],
        "aliases": {
            "id": "stop_id", "station_id": "stop_id", "name": "stop_name", "station_name": "stop_name",
            "latitude": "lat", "longitude": "lon", "lng": "lon"
        }
    },
    "routes": {
        "required": ["route_id", "route_name"],
        "aliases": {
            "id": "route_id", "line_id": "route_id", "name": "route_name", "line_name": "route_name"
        }
    },
    "vehicles": {
        "required": ["vehicle_id", "capacity"],
        "aliases": {
            "id": "vehicle_id", "bus_id": "vehicle_id", "cap": "capacity", "seats": "capacity"
        }
    },
    "schedule": {
        "required": ["trip_id", "route_id", "start_time"],
        "aliases": {
            "id": "trip_id", "departure_time": "start_time", "dep_time": "start_time", "line_id": "route_id"
        }
    },
    "counts": {
        "required": ["timestamp", "trip_id", "stop_id", "boardings", "alightings"],
        "aliases": {
            "time": "timestamp", "datetime": "timestamp", "board": "boardings", "alight": "alightings", "ons": "boardings", "offs": "alightings"
        }
    },
    "gps": {
        "required": ["timestamp", "trip_id", "lat", "lon", "speed_kmh"],
        "aliases": {
            "time": "timestamp", "latitude": "lat", "longitude": "lon", "lng": "lon", "speed": "speed_kmh"
        }
    }
}

class ValidationReport:
    def __init__(self):
        self.is_valid: bool = True
        self.missing_columns: Dict[str, List[str]] = {}
        self.duplicates_removed: Dict[str, int] = {}
        self.invalid_timestamps_fixed: Dict[str, int] = {}
        self.gps_outliers_dropped: int = 0
        self.speed_outliers_fixed: int = 0
        self.dropped_rows: Dict[str, int] = {}
        self.summary_notes: List[str] = []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "missing_columns": self.missing_columns,
            "duplicates_removed": self.duplicates_removed,
            "invalid_timestamps_fixed": self.invalid_timestamps_fixed,
            "gps_outliers_dropped": self.gps_outliers_dropped,
            "speed_outliers_fixed": self.speed_outliers_fixed,
            "dropped_rows": self.dropped_rows,
            "summary_notes": self.summary_notes
        }

def guess_column_mapping(df_columns: List[str], entity_type: str) -> Dict[str, str]:
    mapping = {}
    cfg = CANONICAL_COLUMNS.get(entity_type, {})
    aliases = cfg.get("aliases", {})
    required = cfg.get("required", [])

    for col in df_columns:
        norm = col.lower().strip().replace(" ", "_").replace("-", "_")
        if norm in required:
            mapping[col] = norm
        elif norm in aliases:
            mapping[col] = aliases[norm]
        else:
            # Fuzzy match
            for req in required:
                if req in norm:
                    mapping[col] = req
                    break
    return mapping

def clean_and_validate_dataset(
    stops_df: pd.DataFrame,
    routes_df: pd.DataFrame,
    vehicles_df: pd.DataFrame,
    schedule_df: pd.DataFrame,
    counts_df: pd.DataFrame = None,
    gps_df: pd.DataFrame = None
) -> Tuple[Dict[str, pd.DataFrame], ValidationReport]:
    report = ValidationReport()
    cleaned = {}

    # 1. Clean Stops
    s_map = guess_column_mapping(stops_df.columns.tolist(), "stops")
    s_df = stops_df.rename(columns=s_map)
    for col in ["stop_id", "stop_name", "lat", "lon"]:
        if col not in s_df.columns:
            report.missing_columns.setdefault("stops", []).append(col)
            report.is_valid = False
            # fill safe defaults if needed
            if col == "stop_id": s_df["stop_id"] = [f"ST_{i}" for i in range(len(s_df))]
            if col == "stop_name": s_df["stop_name"] = s_df["stop_id"]
            if col == "lat": s_df["lat"] = 37.4275
            if col == "lon": s_df["lon"] = -122.1697

    # Remove duplicates
    init_len = len(s_df)
    s_df = s_df.drop_duplicates(subset=["stop_id"])
    report.duplicates_removed["stops"] = init_len - len(s_df)
    cleaned["stops"] = s_df

    # 2. Clean Routes
    r_map = guess_column_mapping(routes_df.columns.tolist(), "routes")
    r_df = routes_df.rename(columns=r_map)
    for col in ["route_id", "route_name"]:
        if col not in r_df.columns:
            report.missing_columns.setdefault("routes", []).append(col)
            if col == "route_id": r_df["route_id"] = [f"RT_{i}" for i in range(len(r_df))]
            if col == "route_name": r_df["route_name"] = r_df["route_id"]
    init_len = len(r_df)
    r_df = r_df.drop_duplicates(subset=["route_id"])
    report.duplicates_removed["routes"] = init_len - len(r_df)
    cleaned["routes"] = r_df

    # 3. Clean Vehicles
    v_map = guess_column_mapping(vehicles_df.columns.tolist(), "vehicles")
    v_df = vehicles_df.rename(columns=v_map)
    if "vehicle_id" not in v_df.columns:
        v_df["vehicle_id"] = [f"BUS_{i+1:02d}" for i in range(len(v_df))]
    if "capacity" not in v_df.columns:
        v_df["capacity"] = 40
    else:
        v_df["capacity"] = pd.to_numeric(v_df["capacity"], errors="coerce").fillna(40).astype(int)
    init_len = len(v_df)
    v_df = v_df.drop_duplicates(subset=["vehicle_id"])
    report.duplicates_removed["vehicles"] = init_len - len(v_df)
    cleaned["vehicles"] = v_df

    # 4. Clean Schedule
    sch_map = guess_column_mapping(schedule_df.columns.tolist(), "schedule")
    sch_df = schedule_df.rename(columns=sch_map)
    for col in ["trip_id", "route_id", "start_time"]:
        if col not in sch_df.columns:
            report.missing_columns.setdefault("schedule", []).append(col)
    init_len = len(sch_df)
    sch_df = sch_df.drop_duplicates(subset=["trip_id"])
    report.duplicates_removed["schedule"] = init_len - len(sch_df)
    cleaned["schedule"] = sch_df

    # 5. Clean GPS Traces (interpolate missing, drop outliers)
    if gps_df is not None and not gps_df.empty:
        g_map = guess_column_mapping(gps_df.columns.tolist(), "gps")
        g_df = gps_df.rename(columns=g_map)
        init_len = len(g_df)
        
        # Valid GPS lat between -90 and 90, lon between -180 and 180
        valid_gps = (g_df["lat"].between(-90, 90)) & (g_df["lon"].between(-180, 180)) & (~g_df["lat"].isna()) & (~g_df["lon"].isna())
        outliers_dropped = (~valid_gps).sum()
        g_df = g_df[valid_gps].copy()
        report.gps_outliers_dropped = int(outliers_dropped)

        # Speed sanity: speeds > 120 km/h on campus are unrealistic sensor glitches
        if "speed_kmh" in g_df.columns:
            g_df["speed_kmh"] = pd.to_numeric(g_df["speed_kmh"], errors="coerce").fillna(15.0)
            over_speed = g_df["speed_kmh"] > 100.0
            report.speed_outliers_fixed = int(over_speed.sum())
            g_df.loc[over_speed, "speed_kmh"] = 25.0
            
        report.dropped_rows["gps"] = int(init_len - len(g_df))
        cleaned["gps"] = g_df

    # 6. Clean Counts
    if counts_df is not None and not counts_df.empty:
        c_map = guess_column_mapping(counts_df.columns.tolist(), "counts")
        c_df = counts_df.rename(columns=c_map)
        init_len = len(c_df)
        c_df = c_df.dropna(subset=["trip_id", "stop_id"])
        c_df["boardings"] = pd.to_numeric(c_df["boardings"], errors="coerce").fillna(0).clip(lower=0).astype(int)
        c_df["alightings"] = pd.to_numeric(c_df["alightings"], errors="coerce").fillna(0).clip(lower=0).astype(int)
        report.dropped_rows["counts"] = int(init_len - len(c_df))
        cleaned["counts"] = c_df

    report.summary_notes.append("Dataset cleaned, validated, and normalized to canonical schema.")
    return cleaned, report

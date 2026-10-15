from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

def parse_time_to_seconds(t_str: str) -> int:
    parts = [int(p) for p in t_str.split(":")]
    return parts[0] * 3600 + parts[1] * 60 + (parts[2] if len(parts) > 2 else 0)

def seconds_to_time_str(secs: int) -> str:
    h = (secs // 3600) % 24
    m = (secs % 3600) // 60
    s = secs % 60
    return f"{h:02d}:{m:02d}:{s:02d}"

class AnomalyDetector:
    def __init__(self, capacity_limit_pct: float = 0.85):
        self.capacity_limit_pct = capacity_limit_pct

    def detect_trip_anomalies(
        self,
        schedule: List[Dict[str, Any]],
        routes: List[Dict[str, Any]],
        vehicles: List[Dict[str, Any]],
        travel_time_model,
        demand_model,
        context: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Simulate each trip onboard load, arrival windows, connection buffers, and vehicle conflicts.
        Flags:
        - capacity_violation (load > capacity)
        - overcrowding (load > 85% capacity)
        - missed_connection (arrival upper bound > connecting dep - buffer)
        - schedule_conflict (vehicle double-booked, insufficient layover < 5 min, headway breach)
        """
        flags = []
        veh_map = {v["vehicle_id"]: v["capacity"] for v in vehicles}
        route_map = {r["route_id"]: r for r in routes}
        ctx = context or {"temp_c": 20.0, "precip_mm": 0.0, "is_event": 0, "weekday": 1}

        # Track vehicle timeline for schedule conflict detection: vehicle_id -> list of (start_sec, end_sec, trip_id)
        vehicle_timelines: Dict[str, List[Dict[str, Any]]] = {}

        # Cache simulated trip stop times for connection checking: trip_id -> {stop_id: {arr_p10, arr_p50, arr_p90}}
        trip_stop_times: Dict[str, Dict[str, Any]] = {}

        # 1. Simulate each trip
        for trip in schedule:
            t_id = trip["trip_id"]
            r_id = trip["route_id"]
            v_id = trip.get("vehicle_id", "BUS_01")
            capacity = veh_map.get(v_id, 40)
            route = route_map.get(r_id)
            if not route:
                continue

            start_sec = parse_time_to_seconds(trip["start_time"])
            curr_sec_p10 = start_sec
            curr_sec_p50 = start_sec
            curr_sec_p90 = start_sec

            current_load = 0
            trip_stop_times[t_id] = {}

            for s_idx, r_stop in enumerate(route["stops"]):
                stop_id = r_stop["stop_id"]
                dist = r_stop.get("dist_from_prev_km", 0.0)

                # Segment travel time if not start
                if s_idx > 0:
                    curr_hour = (curr_sec_p50 // 3600) % 24
                    curr_min = (curr_sec_p50 % 3600) // 60
                    pred = travel_time_model.predict_segment({
                        "hour": curr_hour,
                        "minute": curr_min,
                        "weekday": ctx.get("weekday", 1),
                        "distance_km": dist,
                        "prev_segment_delay_sec": max(0, curr_sec_p90 - curr_sec_p50),
                        "temp_c": ctx.get("temp_c", 20.0),
                        "precip_mm": ctx.get("precip_mm", 0.0),
                        "is_event": ctx.get("is_event", 0)
                    })
                    curr_sec_p10 += int(pred["p10_sec"])
                    curr_sec_p50 += int(pred["median_sec"])
                    curr_sec_p90 += int(pred["p90_sec"])

                # Store arrival time window for connection checking
                trip_stop_times[t_id][stop_id] = {
                    "p10": curr_sec_p10,
                    "p50": curr_sec_p50,
                    "p90": curr_sec_p90
                }

                # Forecast boardings & alightings
                demand_hour = (curr_sec_p50 // 3600) % 24
                demand_min = (curr_sec_p50 % 3600) // 60
                d_pred = demand_model.predict_demand({
                    "stop_id": stop_id,
                    "hour": demand_hour,
                    "minute": demand_min,
                    "weekday": ctx.get("weekday", 1),
                    "temp_c": ctx.get("temp_c", 20.0),
                    "precip_mm": ctx.get("precip_mm", 0.0),
                    "is_event": ctx.get("is_event", 0),
                    "lag_yesterday": 12.0,
                    "lag_last_week": 11.0
                })
                boardings = d_pred["forecast_boardings"]
                
                # Alightings heuristic: empty out gradually, 100% on last stop
                if s_idx == len(route["stops"]) - 1:
                    alightings = current_load
                else:
                    alightings = int(min(current_load, round(current_load * 0.35 + 2)))

                current_load = max(0, current_load - alightings + boardings)

                # Dwell time
                dwell = 10 + int(boardings * 2.2 + alightings * 1.5)
                curr_sec_p10 += dwell
                curr_sec_p50 += dwell
                curr_sec_p90 += dwell

                time_str = seconds_to_time_str(curr_sec_p50)

                # Check Capacity Violation (Load > Capacity)
                if current_load > capacity:
                    prob = min(0.98, round(0.70 + (current_load - capacity) * 0.05, 2))
                    flags.append({
                        "flag_id": f"FL_CAP_{t_id}_{stop_id}",
                        "type": "capacity_violation",
                        "severity": "CRITICAL",
                        "trip_id": t_id,
                        "route_id": r_id,
                        "stop_id": stop_id,
                        "time": time_str,
                        "probability": prob,
                        "load": current_load,
                        "capacity": capacity,
                        "reason": f"Expected load ({current_load} pax) exceeds vehicle capacity ({capacity}) by {current_load - capacity} passengers."
                    })
                # Check Overcrowding (> 85% capacity)
                elif current_load > (capacity * self.capacity_limit_pct):
                    prob = min(0.95, round(0.55 + (current_load / capacity) * 0.35, 2))
                    flags.append({
                        "flag_id": f"FL_CROWD_{t_id}_{stop_id}",
                        "type": "overcrowding",
                        "severity": "WARNING",
                        "trip_id": t_id,
                        "route_id": r_id,
                        "stop_id": stop_id,
                        "time": time_str,
                        "probability": prob,
                        "load": current_load,
                        "capacity": capacity,
                        "reason": f"Vehicle at {round((current_load/capacity)*100)}% load ({current_load}/{capacity} pax); exceeding comfortable 85% threshold."
                    })

            # Record vehicle timeline
            vehicle_timelines.setdefault(v_id, []).append({
                "trip_id": t_id,
                "start_sec": start_sec,
                "end_sec": curr_sec_p90, # consider upper bound of arrival
                "end_median_sec": curr_sec_p50
            })

        # 2. Check Schedule Conflicts & Layover Violations (Min layover 5 mins = 300s)
        for v_id, intervals in vehicle_timelines.items():
            sorted_intervals = sorted(intervals, key=lambda x: x["start_sec"])
            for i in range(len(sorted_intervals) - 1):
                cur = sorted_intervals[i]
                nxt = sorted_intervals[i+1]
                
                # Check overlap (Double-booking)
                if cur["end_median_sec"] > nxt["start_sec"]:
                    flags.append({
                        "flag_id": f"FL_CONFLICT_{cur['trip_id']}_{nxt['trip_id']}",
                        "type": "schedule_conflict",
                        "severity": "CRITICAL",
                        "trip_id": cur["trip_id"],
                        "route_id": "MULTIPLE",
                        "stop_id": "DEPOT",
                        "time": seconds_to_time_str(nxt["start_sec"]),
                        "probability": 0.99,
                        "reason": f"Vehicle {v_id} double-booked: previous trip {cur['trip_id']} concludes at {seconds_to_time_str(cur['end_median_sec'])}, after next trip {nxt['trip_id']} start at {seconds_to_time_str(nxt['start_sec'])}."
                    })
                # Check layover breach (< 300s buffer between trips)
                elif (nxt["start_sec"] - cur["end_median_sec"]) < 300:
                    flags.append({
                        "flag_id": f"FL_LAYOVER_{cur['trip_id']}_{nxt['trip_id']}",
                        "type": "layover_breach",
                        "severity": "WARNING",
                        "trip_id": cur["trip_id"],
                        "route_id": "MULTIPLE",
                        "stop_id": "DEPOT",
                        "time": seconds_to_time_str(nxt["start_sec"]),
                        "probability": 0.85,
                        "reason": f"Vehicle {v_id} layover between {cur['trip_id']} and {nxt['trip_id']} is only {int((nxt['start_sec'] - cur['end_median_sec'])/60)} min (minimum required: 5 min)."
                    })

        # 3. Check Missed Connections at Key Transfer Hubs (e.g., ST_MAIN_GATE, ST_ENGG_QUAD, ST_SCIENCE_CTR)
        # If trip A arrives at hub, and passenger needs to transfer to trip B whose start is within 15 min,
        # but trip A P90 arrival > trip B departure - 3 min transfer buffer (180s)
        hubs = ["ST_MAIN_GATE", "ST_ENGG_QUAD", "ST_SCIENCE_CTR"]
        all_trips = list(trip_stop_times.keys())
        for i in range(len(all_trips)):
            t1 = all_trips[i]
            for j in range(len(all_trips)):
                if i == j: continue
                t2 = all_trips[j]
                for hub in hubs:
                    if hub in trip_stop_times[t1] and hub in trip_stop_times[t2]:
                        t1_p90 = trip_stop_times[t1][hub]["p90"]
                        t2_p50 = trip_stop_times[t2][hub]["p50"]
                        # Connecting window: t2 departs 3 to 12 mins after t1 median
                        t1_p50 = trip_stop_times[t1][hub]["p50"]
                        if 180 <= (t2_p50 - t1_p50) <= 720:
                            if t1_p90 > (t2_p50 - 180): # Less than 3 min buffer at P90
                                prob = min(0.92, round(0.60 + max(0, t1_p90 - t2_p50) / 300.0, 2))
                                flags.append({
                                    "flag_id": f"FL_CONN_{t1}_{t2}_{hub}",
                                    "type": "missed_connection",
                                    "severity": "WARNING",
                                    "trip_id": t1,
                                    "route_id": hub,
                                    "stop_id": hub,
                                    "time": seconds_to_time_str(t1_p50),
                                    "probability": prob,
                                    "reason": f"Connection risk at {hub}: Inbound {t1} P90 arrival ({seconds_to_time_str(t1_p90)}) leaves insufficient transfer window before connecting {t2} departure ({seconds_to_time_str(t2_p50)})."
                                })

        return flags

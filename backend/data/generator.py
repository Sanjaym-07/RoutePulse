import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import random
from typing import Dict, Any, List

def generate_campus_sample_data(seed: int = 42) -> Dict[str, Any]:
    np.random.seed(seed)
    random.seed(seed)

    # 1. Stops (8 campus stops, around real university coordinates e.g. Stanford / Berkeley / generic campus)
    # Using a vibrant campus area: lat ~37.4275, lon ~-122.1697 (Stanford area)
    stops_data = [
        {"stop_id": "ST_MAIN_GATE", "stop_name": "Main University Gate", "lat": 37.4275, "lon": -122.1700},
        {"stop_id": "ST_ENGG_QUAD", "stop_name": "Engineering Quad", "lat": 37.4285, "lon": -122.1740},
        {"stop_id": "ST_SCIENCE_CTR", "stop_name": "Science Complex & Labs", "lat": 37.4310, "lon": -122.1725},
        {"stop_id": "ST_STUDENT_UNION", "stop_name": "Student Union & Dining", "lat": 37.4255, "lon": -122.1710},
        {"stop_id": "ST_NORTH_DORMS", "stop_name": "North Residential Village", "lat": 37.4335, "lon": -122.1680},
        {"stop_id": "ST_SOUTH_DORMS", "stop_name": "South Dorms & Greek Row", "lat": 37.4220, "lon": -122.1660},
        {"stop_id": "ST_ATHLETICS", "stop_name": "Stadium & Sports Arena", "lat": 37.4300, "lon": -122.1610},
        {"stop_id": "ST_MED_CTR", "stop_name": "Medical Center & Hospital", "lat": 37.4350, "lon": -122.1750},
    ]

    # 2. Routes (3 core routes)
    # Route Red: Campus Loop (North Dorms -> Science -> Engg -> Student Union -> South Dorms -> Main Gate -> North Dorms)
    # Route Blue: Express Academic (Main Gate -> Engg -> Science -> Med Center -> North Dorms)
    # Route Green: Connector (South Dorms -> Student Union -> Athletics -> Science -> Engg)
    routes_data = [
        {
            "route_id": "RT_RED",
            "route_name": "Red Campus Loop",
            "color": "#EF4444",
            "stops": [
                {"stop_id": "ST_NORTH_DORMS", "sequence": 1, "dist_from_prev_km": 0.0},
                {"stop_id": "ST_SCIENCE_CTR", "sequence": 2, "dist_from_prev_km": 0.6},
                {"stop_id": "ST_ENGG_QUAD", "sequence": 3, "dist_from_prev_km": 0.5},
                {"stop_id": "ST_STUDENT_UNION", "sequence": 4, "dist_from_prev_km": 0.7},
                {"stop_id": "ST_SOUTH_DORMS", "sequence": 5, "dist_from_prev_km": 0.8},
                {"stop_id": "ST_MAIN_GATE", "sequence": 6, "dist_from_prev_km": 0.9},
                {"stop_id": "ST_NORTH_DORMS", "sequence": 7, "dist_from_prev_km": 1.1},
            ]
        },
        {
            "route_id": "RT_BLUE",
            "route_name": "Blue Academic Express",
            "color": "#3B82F6",
            "stops": [
                {"stop_id": "ST_MAIN_GATE", "sequence": 1, "dist_from_prev_km": 0.0},
                {"stop_id": "ST_ENGG_QUAD", "sequence": 2, "dist_from_prev_km": 0.8},
                {"stop_id": "ST_SCIENCE_CTR", "sequence": 3, "dist_from_prev_km": 0.5},
                {"stop_id": "ST_MED_CTR", "sequence": 4, "dist_from_prev_km": 0.9},
                {"stop_id": "ST_NORTH_DORMS", "sequence": 5, "dist_from_prev_km": 0.7},
            ]
        },
        {
            "route_id": "RT_GREEN",
            "route_name": "Green Athletics & South Connector",
            "color": "#10B981",
            "stops": [
                {"stop_id": "ST_SOUTH_DORMS", "sequence": 1, "dist_from_prev_km": 0.0},
                {"stop_id": "ST_STUDENT_UNION", "sequence": 2, "dist_from_prev_km": 0.8},
                {"stop_id": "ST_ATHLETICS", "sequence": 3, "dist_from_prev_km": 1.2},
                {"stop_id": "ST_SCIENCE_CTR", "sequence": 4, "dist_from_prev_km": 1.0},
                {"stop_id": "ST_ENGG_QUAD", "sequence": 5, "dist_from_prev_km": 0.5},
            ]
        }
    ]

    # 3. Vehicles (8 vehicles, capacities between 30 and 55)
    vehicles_data = [
        {"vehicle_id": "BUS_01", "capacity": 45, "accessible": True},
        {"vehicle_id": "BUS_02", "capacity": 45, "accessible": True},
        {"vehicle_id": "BUS_03", "capacity": 55, "accessible": True},
        {"vehicle_id": "BUS_04", "capacity": 35, "accessible": True},
        {"vehicle_id": "BUS_05", "capacity": 55, "accessible": True},
        {"vehicle_id": "BUS_06", "capacity": 40, "accessible": True},
        {"vehicle_id": "BUS_07", "capacity": 30, "accessible": True},
        {"vehicle_id": "BUS_08", "capacity": 45, "accessible": True},
    ]

    # 4. Schedule (Daily trips from 07:00 to 20:00 every 15-20 mins)
    schedule_data = []
    trip_counter = 1
    
    # RT_RED: Every 20 mins from 07:00 to 19:40
    for hour in range(7, 20):
        for minute in [0, 20, 40]:
            veh_idx = (trip_counter % 3) # BUS_01, BUS_02, BUS_03
            schedule_data.append({
                "trip_id": f"TR_RED_{hour:02d}{minute:02d}",
                "route_id": "RT_RED",
                "start_time": f"{hour:02d}:{minute:02d}:00",
                "vehicle_id": f"BUS_{veh_idx+1:02d}",
                "days_of_week": [0, 1, 2, 3, 4]
            })
            trip_counter += 1

    # RT_BLUE: Every 30 mins from 07:15 to 19:45
    for hour in range(7, 20):
        for minute in [15, 45]:
            veh_idx = 3 + (trip_counter % 2) # BUS_04, BUS_05
            schedule_data.append({
                "trip_id": f"TR_BLUE_{hour:02d}{minute:02d}",
                "route_id": "RT_BLUE",
                "start_time": f"{hour:02d}:{minute:02d}:00",
                "vehicle_id": f"BUS_{veh_idx+1:02d}",
                "days_of_week": [0, 1, 2, 3, 4]
            })
            trip_counter += 1

    # RT_GREEN: Every 30 mins from 07:10 to 19:40
    for hour in range(7, 20):
        for minute in [10, 40]:
            veh_idx = 5 + (trip_counter % 3) # BUS_06, BUS_07, BUS_08
            schedule_data.append({
                "trip_id": f"TR_GREEN_{hour:02d}{minute:02d}",
                "route_id": "RT_GREEN",
                "start_time": f"{hour:02d}:{minute:02d}:00",
                "vehicle_id": f"BUS_{veh_idx+1:02d}",
                "days_of_week": [0, 1, 2, 3, 4]
            })
            trip_counter += 1

    # 5. Generate 21 Days of Historical Passenger Counts and GPS traces (3 weeks: Oct 1 to Oct 21)
    base_date = datetime(2026, 9, 21) # Monday
    days_count = 21

    passenger_counts = []
    gps_traces = []
    segment_travel_records = []

    # Map routes to quick lookup
    route_map = {r["route_id"]: r for r in routes_data}
    stop_coords = {s["stop_id"]: (s["lat"], s["lon"]) for s in stops_data}

    # Weather simulation per day
    # Day 5 (Fri) rain, Day 12 (Fri) heavy rain, Day 17 (Wed) campus career fair event
    for day_i in range(days_count):
        cur_date = base_date + timedelta(days=day_i)
        weekday = cur_date.weekday()
        if weekday >= 5: # weekend lower or skip
            continue
        
        is_rain = day_i in [4, 11] # Oct rainy days
        is_event = day_i in [16]  # Big career fair / game day
        temp_c = 20.0 + 5.0 * np.sin(day_i) - (4.0 if is_rain else 0.0)
        precip_mm = 6.5 if is_rain else 0.0

        for trip in schedule_data:
            route = route_map[trip["route_id"]]
            start_parts = [int(p) for p in trip["start_time"].split(":")]
            trip_start_dt = cur_date.replace(hour=start_parts[0], minute=start_parts[1], second=0)
            
            cur_time = trip_start_dt
            current_passengers = 0
            
            for s_idx, r_stop in enumerate(route["stops"]):
                stop_id = r_stop["stop_id"]
                dist = r_stop["dist_from_prev_km"]

                # Segment travel time (if s_idx > 0)
                if s_idx > 0:
                    # Base speed ~20 km/h -> 3 min per km, plus congestion in rush hours
                    hour = cur_time.hour
                    rush_mult = 1.0
                    if 8 <= hour <= 9 or 16 <= hour <= 18:
                        rush_mult = 1.6 # rush hour congestion
                    elif 11 <= hour <= 13:
                        rush_mult = 1.25 # lunch bump
                    
                    if is_rain:
                        rush_mult *= 1.3
                    
                    # Add class change spikes around :50 - :10
                    minute = cur_time.minute
                    if 45 <= minute <= 59 or 0 <= minute <= 10:
                        rush_mult *= 1.15

                    base_seconds = (dist / 22.0) * 3600.0 * rush_mult
                    noise_sec = np.random.normal(0, max(5.0, base_seconds * 0.12))
                    actual_travel_sec = max(45.0, base_seconds + noise_sec)
                    
                    # Record for ML travel time training
                    prev_stop_id = route["stops"][s_idx - 1]["stop_id"]
                    segment_id = f"{prev_stop_id}->{stop_id}"
                    segment_travel_records.append({
                        "date": cur_date.strftime("%Y-%m-%d"),
                        "timestamp": cur_time.isoformat(),
                        "trip_id": trip["trip_id"],
                        "route_id": trip["route_id"],
                        "segment_id": segment_id,
                        "from_stop": prev_stop_id,
                        "to_stop": stop_id,
                        "distance_km": dist,
                        "hour": hour,
                        "minute": minute,
                        "weekday": weekday,
                        "temp_c": temp_c,
                        "precip_mm": precip_mm,
                        "is_event": 1 if is_event else 0,
                        "actual_duration_sec": actual_travel_sec,
                        "prev_segment_delay_sec": max(0, noise_sec) if s_idx > 1 else 0.0
                    })
                    
                    cur_time += timedelta(seconds=actual_travel_sec)

                # Dwell time & boarding/alighting
                # Demand generator: peaks at 08:30-09:30 and 16:30-17:30
                hour = cur_time.hour
                demand_factor = 1.0
                if 8 <= hour <= 9:
                    demand_factor = 2.4
                elif 16 <= hour <= 18:
                    demand_factor = 2.2
                elif 11 <= hour <= 13:
                    demand_factor = 1.6
                
                # Dorms have high morning boardings; Engg/Science have high morning alightings
                if "DORMS" in stop_id:
                    base_board = 12 if hour < 12 else 4
                    base_alight = 3 if hour < 12 else 11
                elif "ENGG" in stop_id or "SCIENCE" in stop_id:
                    base_board = 4 if hour < 14 else 12
                    base_alight = 14 if hour < 12 else 3
                elif "UNION" in stop_id:
                    base_board = 8 if (11 <= hour <= 14) else 4
                    base_alight = 9 if (11 <= hour <= 14) else 3
                else:
                    base_board = 5
                    base_alight = 4

                if is_rain:
                    base_board *= 1.35
                if is_event:
                    base_board *= 1.5

                boardings = int(max(0, np.random.poisson(base_board * demand_factor)))
                alightings = int(min(current_passengers, np.random.poisson(base_alight * demand_factor)))
                if s_idx == len(route["stops"]) - 1:
                    alightings = current_passengers # Empty at end of route
                
                current_passengers = max(0, current_passengers - alightings + boardings)
                dwell_sec = 10.0 + boardings * 2.5 + alightings * 1.5
                cur_time += timedelta(seconds=dwell_sec)

                passenger_counts.append({
                    "timestamp": cur_time.isoformat(),
                    "date": cur_date.strftime("%Y-%m-%d"),
                    "trip_id": trip["trip_id"],
                    "stop_id": stop_id,
                    "route_id": trip["route_id"],
                    "vehicle_id": trip["vehicle_id"],
                    "hour": hour,
                    "weekday": weekday,
                    "boardings": boardings,
                    "alightings": alightings,
                    "load": current_passengers,
                    "dwell_sec": dwell_sec,
                    "precip_mm": precip_mm,
                    "temp_c": temp_c,
                    "is_event": 1 if is_event else 0
                })

                # GPS trace sample at stop
                lat, lon = stop_coords[stop_id]
                gps_traces.append({
                    "timestamp": cur_time.isoformat(),
                    "trip_id": trip["trip_id"],
                    "vehicle_id": trip["vehicle_id"],
                    "lat": lat + np.random.normal(0, 0.0001),
                    "lon": lon + np.random.normal(0, 0.0001),
                    "speed_kmh": round(float(np.random.uniform(0, 5)), 1)
                })

    return {
        "stops": stops_data,
        "routes": routes_data,
        "vehicles": vehicles_data,
        "schedule": schedule_data,
        "counts": passenger_counts,
        "gps_traces": gps_traces,
        "segment_records": segment_travel_records
    }

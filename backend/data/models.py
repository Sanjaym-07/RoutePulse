from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class Stop(BaseModel):
    stop_id: str
    stop_name: str
    lat: float
    lon: float

class RouteStop(BaseModel):
    stop_id: str
    sequence: int
    dist_from_prev_km: float = 0.0

class Route(BaseModel):
    route_id: str
    route_name: str
    color: str = "#2563EB"
    stops: List[RouteStop]

class Vehicle(BaseModel):
    vehicle_id: str
    capacity: int
    accessible: bool = True

class TripSchedule(BaseModel):
    trip_id: str
    route_id: str
    start_time: str  # HH:MM:SS
    vehicle_id: Optional[str] = None
    days_of_week: List[int] = [0, 1, 2, 3, 4] # Mon-Fri

class PassengerCountRecord(BaseModel):
    timestamp: str
    trip_id: str
    stop_id: str
    route_id: str
    boardings: int
    alightings: int
    load: int

class GPSTraceRecord(BaseModel):
    timestamp: str
    trip_id: str
    vehicle_id: str
    lat: float
    lon: float
    speed_kmh: float

class CampusDataset(BaseModel):
    stops: List[Stop]
    routes: List[Route]
    vehicles: List[Vehicle]
    schedule: List[TripSchedule]
    counts: List[PassengerCountRecord] = []
    gps_traces: List[GPSTraceRecord] = []

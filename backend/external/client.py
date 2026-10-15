import os
import json
import httpx
import hashlib
from typing import Dict, Any, Optional

CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache")
os.makedirs(CACHE_DIR, exist_ok=True)

class ExternalClient:
    def __init__(self, timeout_sec: float = 3.5):
        self.timeout_sec = timeout_sec
        # Service status: "LIVE", "CACHED", "OFFLINE"
        self.status: Dict[str, str] = {
            "open_meteo": "OFFLINE",
            "osrm": "OFFLINE",
            "nominatim": "OFFLINE"
        }

    def _get_cache_path(self, service: str, key: str) -> str:
        h = hashlib.md5(key.encode("utf-8")).hexdigest()
        return os.path.join(CACHE_DIR, f"{service}_{h}.json")

    def _read_cache(self, service: str, key: str) -> Optional[Any]:
        path = self._get_cache_path(service, key)
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return None
        return None

    def _write_cache(self, service: str, key: str, data: Any):
        path = self._get_cache_path(service, key)
        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f)
        except Exception:
            pass

    async def get_weather_forecast(self, lat: float = 37.4275, lon: float = -122.1697) -> Dict[str, Any]:
        """
        Open-Meteo hourly forecast.
        Fallback to realistic campus weather if network offline or timeout.
        """
        cache_key = f"weather_{lat:.4f}_{lon:.4f}"
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,precipitation,precipitation_probability,weathercode&current=temperature_2m,precipitation&timezone=auto"
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout_sec) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    self._write_cache("open_meteo", cache_key, data)
                    self.status["open_meteo"] = "LIVE"
                    curr = data.get("current", {})
                    return {
                        "status": "LIVE",
                        "temp_c": curr.get("temperature_2m", 21.5),
                        "precip_mm": curr.get("precipitation", 0.0),
                        "is_raining": curr.get("precipitation", 0.0) > 0.1,
                        "raw": data
                    }
        except Exception:
            pass

        # Try cache
        cached = self._read_cache("open_meteo", cache_key)
        if cached:
            self.status["open_meteo"] = "CACHED"
            curr = cached.get("current", {})
            return {
                "status": "CACHED",
                "temp_c": curr.get("temperature_2m", 21.5),
                "precip_mm": curr.get("precipitation", 0.0),
                "is_raining": curr.get("precipitation", 0.0) > 0.1,
                "raw": cached
            }

        # Offline fallback
        self.status["open_meteo"] = "OFFLINE"
        return {
            "status": "OFFLINE",
            "temp_c": 19.5,
            "precip_mm": 0.0,
            "is_raining": False,
            "raw": {"hourly": {"temperature_2m": [18, 19, 21, 22, 21, 19], "precipitation": [0, 0, 0, 0, 0, 0]}}
        }

    async def get_osrm_route(self, coords: list) -> Dict[str, Any]:
        """
        OSRM road geometry and duration.
        coords: list of [lon, lat]
        """
        if len(coords) < 2:
            return {"status": "OFFLINE", "geometry": None, "duration_sec": 0}

        coord_str = ";".join([f"{c[0]},{c[1]}" for c in coords])
        cache_key = f"osrm_{coord_str}"
        url = f"https://router.project-osrm.org/route/v1/driving/{coord_str}?overview=full&geometries=geojson"

        try:
            async with httpx.AsyncClient(timeout=self.timeout_sec) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    self._write_cache("osrm", cache_key, data)
                    self.status["osrm"] = "LIVE"
                    route = data.get("routes", [{}])[0]
                    return {
                        "status": "LIVE",
                        "geometry": route.get("geometry"),
                        "duration_sec": route.get("duration", 0),
                        "distance_meters": route.get("distance", 0)
                    }
        except Exception:
            pass

        cached = self._read_cache("osrm", cache_key)
        if cached:
            self.status["osrm"] = "CACHED"
            route = cached.get("routes", [{}])[0]
            return {
                "status": "CACHED",
                "geometry": route.get("geometry"),
                "duration_sec": route.get("duration", 0),
                "distance_meters": route.get("distance", 0)
            }

        # Fallback to straight line coordinate array
        self.status["osrm"] = "OFFLINE"
        return {
            "status": "OFFLINE",
            "geometry": {"type": "LineString", "coordinates": coords},
            "duration_sec": 300,
            "distance_meters": 1500
        }

    async def geocode_nominatim(self, query: str) -> Dict[str, Any]:
        """
        Nominatim geocoder with user-agent, caching, and rate limit resilience.
        """
        cache_key = f"nom_{query.strip().lower()}"
        cached = self._read_cache("nominatim", cache_key)
        if cached:
            self.status["nominatim"] = "CACHED"
            return {"status": "CACHED", "results": cached}

        url = f"https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=3"
        headers = {"User-Agent": "RoutePulse-CampusTransitPlanner/1.0 (academic-transit-project)"}

        try:
            async with httpx.AsyncClient(timeout=self.timeout_sec) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    self._write_cache("nominatim", cache_key, data)
                    self.status["nominatim"] = "LIVE"
                    return {"status": "LIVE", "results": data}
        except Exception:
            pass

        self.status["nominatim"] = "OFFLINE"
        return {"status": "OFFLINE", "results": []}

    def get_service_statuses(self) -> Dict[str, str]:
        return self.status

external_client = ExternalClient()

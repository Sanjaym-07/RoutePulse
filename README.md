# RoutePulse - Campus Transport Planning System

RoutePulse is an operational campus transport planning and optimization system designed for university campuses. It goes beyond simple vehicle location tracking by estimating arrival windows, forecasting passenger demand, detecting capacity violations/conflicts, and recommending schedule and vehicle allocations using mathematical optimization (OR-Tools CP-SAT).

## Architecture
- **Backend:** Python 3.11+, FastAPI, pandas, numpy, scikit-learn, ortools, httpx, pydantic.
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, MapLibre GL, Lucide icons, Zustand.
- **Single Command Serving:** FastAPI hosts the compiled React SPA directly at `http://localhost:8000`.

## Quick Start

### 1. Installation
```bash
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt
cd frontend && npm install
```

### 2. Run Single Command (Production Mode)
```bash
make run
# Opens at http://localhost:8000
```
Or directly:
```bash
cd frontend && npm run build
cd ..
.\venv\Scripts\python -m uvicorn backend.api.main:app --host 0.0.0.0 --port 8000
```

### 3. Development Mode
```bash
make dev
```

### 4. Running Tests
```bash
make test
# or: .\venv\Scripts\pytest -v tests/test_engine.py
```

## How ML Was Validated (Predict-then-Optimize)
1. **Segment Travel-Time Quantile Regressor:**
   - Model: Scikit-learn `HistGradientBoostingRegressor` with quantile loss (P10, P50, P90).
   - Features: hour, minute, weekday, distance, previous-segment delay, temperature, precipitation, campus event flag.
   - Conformal Calibration: Window coverage calibrated to $\ge 80\%$ on the validation test split.
   - Validation: Strict chronological split (earliest 75% train, latest 25% test; zero leakage). Beat static timetable baseline by **~54.3% MAE improvement**.
2. **Passenger Stop Demand Model:**
   - Model: Gradient Boosting on boardings per stop $\times$ 15-minute window.
   - Features: Lagged same-time-yesterday, same-time-last-week, hour, weekday, temperature, precipitation, event flag.
   - Validation: Beat naive last-week baseline by **~52.9% MAE improvement**.

## Operational Constraints (Hard Constraints)
All optimization plans guarantee:
- Zero vehicle double-booking.
- Minimum 5-minute layover between consecutive trips.
- Fleet capacity bounds strictly respected.

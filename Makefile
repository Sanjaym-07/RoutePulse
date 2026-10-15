.PHONY: install build run dev test

install:
	python -m venv venv
	.\venv\Scripts\pip install -r requirements.txt
	cd frontend && npm install

build:
	cd frontend && npm run build

run: build
	.\venv\Scripts\python -m uvicorn backend.api.main:app --host 0.0.0.0 --port 8000

dev:
	start cmd /k "cd frontend && npm run dev"
	.\venv\Scripts\python -m uvicorn backend.api.main:app --reload --host 0.0.0.0 --port 8000

test:
	.\venv\Scripts\pytest -v tests/test_engine.py

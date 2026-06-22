@echo off
title C.O.R.T.E.X. Start Script
echo Starting C.O.R.T.E.X. Platform Services...

:: Ensure we are in the script directory
cd /d "%~dp0"

echo [1/4] Starting FastAPI Backend...
start "CORTEX API" cmd /k "cd apps\api && title CORTEX API && uvicorn app.main:app --reload --port 8000"

echo [2/4] Starting Celery Worker...
start "CORTEX Worker" cmd /k "cd apps\api && title CORTEX Worker && celery -A app.workers.celery_app worker -l info --pool=solo"

echo [3/4] Starting Celery Beat...
start "CORTEX Beat" cmd /k "cd apps\api && title CORTEX Beat && celery -A app.workers.celery_app beat -l info"

echo [4/4] Starting Next.js Frontend...
start "CORTEX Web" cmd /k "cd apps\web && title CORTEX Web && npm run dev"

echo All services have been launched in separate windows!
echo Please ensure your infrastructure (Redis, Firebase Emulator, Neo4j, MinIO) is running.
pause

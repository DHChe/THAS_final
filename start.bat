@echo off
start cmd /k "cd backend && poetry run python run_server.py"
start cmd /k "cd frontend && npm start"
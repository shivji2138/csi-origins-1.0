#!/bin/bash

echo "Starting Backend..."
cd backend
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi
if [ -f "alembic.ini" ]; then
    echo "Running database migrations..."
    alembic upgrade head
fi
uvicorn main:app --reload &
BACKEND_PID=$!
cd ..

echo "Starting Frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi
npm run dev &
FRONTEND_PID=$!
cd ..

echo "Services are starting. Press Ctrl+C to stop both."

cleanup() {
    echo "Stopping services..."
    kill $BACKEND_PID
    kill $FRONTEND_PID
    exit 0
}

trap cleanup SIGINT SIGTERM

wait

Write-Host "Starting AGORA Services..."

# Start Backend
Write-Host "Starting Backend..."
$backendJob = Start-Job -ScriptBlock {
    cd backend
    if (-not (Test-Path "venv")) {
        Write-Host "Creating virtual environment..."
        python -m venv venv
        .\venv\Scripts\activate
        pip install -r requirements.txt
    } else {
        .\venv\Scripts\activate
    }
    if (Test-Path "alembic.ini") {
        Write-Host "Running database migrations..."
        alembic upgrade head
    }
    uvicorn main:app --reload
} -WorkingDirectory $PWD

# Start Frontend
Write-Host "Starting Frontend..."
$frontendJob = Start-Job -ScriptBlock {
    cd frontend
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing frontend dependencies..."
        npm install
    }
    npm run dev
} -WorkingDirectory $PWD

Write-Host "Services are starting. Press Ctrl+C to stop both."

try {
    Receive-Job -Job $backendJob, $frontendJob -Wait
} finally {
    Write-Host "Stopping services..."
    Stop-Job -Job $backendJob, $frontendJob
    Remove-Job -Job $backendJob, $frontendJob
}

# ProfileScore backend — activates venv and starts uvicorn
$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

if (-not (Test-Path ".venv\Scripts\python.exe")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Cyan
    py -3.13 -m venv .venv
    .venv\Scripts\pip install -r requirements.txt
}

Write-Host "Starting ProfileScore API..." -ForegroundColor Green
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000

$ErrorActionPreference = "Stop"

Push-Location $PSScriptRoot\..
try {
    python -m pytest
    python -m ruff check backend
    python -m mypy backend/app

    Push-Location web
    npm install
    npm run build
    Pop-Location

    Push-Location mobile
    flutter pub get
    flutter analyze
    Pop-Location
}
finally {
    Pop-Location
}

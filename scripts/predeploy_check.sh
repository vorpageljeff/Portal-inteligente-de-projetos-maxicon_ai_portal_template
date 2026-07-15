#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

python -m pytest
python -m ruff check backend
python -m mypy backend/app

cd "$ROOT_DIR/web"
npm install
npm run build

cd "$ROOT_DIR/mobile"
flutter pub get
flutter analyze

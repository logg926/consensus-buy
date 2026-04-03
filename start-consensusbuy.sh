#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

cleanup() {
  jobs -pr | xargs -r kill >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

if ! command -v uv >/dev/null 2>&1; then
  echo "Missing required command: uv"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Missing required command: npm"
  exit 1
fi

if [ ! -d "$ROOT_DIR/node_modules" ]; then
  echo "Frontend dependencies are missing. Run: npm install"
  exit 1
fi

if [ ! -f "$BACKEND_DIR/pyproject.toml" ]; then
  echo "Backend project file is missing at $BACKEND_DIR/pyproject.toml"
  exit 1
fi

if [ ! -x "$BACKEND_DIR/.venv/bin/python" ]; then
  echo "Backend virtualenv is missing. Running uv sync..."
  (cd "$BACKEND_DIR" && uv sync)
fi

echo "Starting Deep Agents backend on http://127.0.0.1:8001"
(cd "$BACKEND_DIR" && .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8001) &

sleep 2

echo "Starting frontend on http://127.0.0.1:8080"
(cd "$ROOT_DIR" && npm run dev -- --host 127.0.0.1 --port 8080) &

wait

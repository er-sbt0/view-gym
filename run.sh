#!/usr/bin/env bash
# Install dependencies if needed, then start View Gym.
#   ./run.sh           install (if needed) and start the server
#   ./run.sh --test    install (if needed), run tests, then start
#   PORT=8080 ./run.sh to use a different port
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v node >/dev/null; then
  echo "Node.js is required (v18+). Install it from https://nodejs.org" >&2
  exit 1
fi

# Reinstall when node_modules is missing or older than the lockfile.
if [[ ! -d node_modules || package-lock.json -nt node_modules ]]; then
  echo "Installing dependencies…"
  npm ci --silent
  touch node_modules
fi

if [[ "${1:-}" == "--test" ]]; then
  npm test
fi

exec npm start --silent

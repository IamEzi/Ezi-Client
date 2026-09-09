#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
echo "Ezi Client 1.0.0 — macOS Universal build"
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "ERROR: macOS builds must be run on macOS (or a macOS CI runner)."
  exit 1
fi
npm install
npm run build:mac:universal
echo "Build complete. Check the dist/ folder for the DMG and ZIP."

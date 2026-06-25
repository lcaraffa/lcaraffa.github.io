#!/usr/bin/env bash
# Serveur statique minimal : sert la RACINE pour que /belief-cost-geometry/ résolve.
cd "$(dirname "$0")" || exit 1
PORT="${1:-8000}"
echo "serving site-perso → http://127.0.0.1:$PORT   (Ctrl-C pour arrêter)"
exec python3 -m http.server "$PORT" --bind 127.0.0.1

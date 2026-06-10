#!/bin/zsh
# HomeINN OS starten: lokale server + browser
cd "$(dirname "$0")"
if ! lsof -i :7823 >/dev/null 2>&1; then
  nohup python3 -m http.server 7823 >/dev/null 2>&1 &
  sleep 1
fi
open "http://localhost:7823/index.html"

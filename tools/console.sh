#!/bin/sh
# Print JavaScript console errors/warnings from a lab page (headless Chrome).
# Usage: tools/console.sh <page relative to lab root> "<query string>"
LAB="$(cd "$(dirname "$0")/.." && pwd)"
URL="file://$LAB/$1"; [ -n "$2" ] && URL="$URL?$2"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --allow-file-access-from-files --virtual-time-budget=3000 --enable-logging=stderr --v=0 \
  --dump-dom "$URL" 2>&1 >/dev/null | grep -E "CONSOLE|Uncaught|Error" | grep -v -E "Fontconfig|GPU|gpu_|dbus|DEPRECATED" || echo "no console errors"

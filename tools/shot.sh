#!/bin/sh
# Headless Chrome screenshot of a lab page.
# Usage: tools/shot.sh <page relative to lab root> "<query string without ?>" <out.png> [width] [height]
# Example: tools/shot.sh frames.html "anim=nod&n=8&theme=light&size=112" out/nod-light.png 1400 600
# Widths under 500 px are not trustworthy here: headless Chrome will not lay a page out narrower than
# its minimum window width, so the right edge looks clipped when it is not. For phone widths use
# node tools/phone-shot.mjs (Playwright mobile emulation, which honours the viewport meta).
set -e
LAB="$(cd "$(dirname "$0")/.." && pwd)"
PAGE="$1"; QUERY="$2"; OUT="$3"; W="${4:-1400}"; H="${5:-900}"
case "$OUT" in /*) ;; *) OUT="$LAB/$OUT" ;; esac
URL="file://$LAB/$PAGE"; [ -n "$QUERY" ] && URL="$URL?$QUERY"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --hide-scrollbars --allow-file-access-from-files --virtual-time-budget=3000 \
  --force-device-scale-factor=2 --window-size="$W,$H" --screenshot="$OUT" "$URL" >/dev/null 2>&1
echo "$OUT"

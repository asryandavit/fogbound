#!/usr/bin/env bash
set -euo pipefail

# --- prerequisites ---
for cmd in adb docker; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "ERROR: '$cmd' not found in PATH"; exit 1; }
done

# --- artifact directory ---
TIMESTAMP=$(date +%Y%m%dT%H%M%S)
OUTDIR="test-artifacts/$TIMESTAMP"
mkdir -p "$OUTDIR"

# --- detect first ready adb device/emulator ---
DEVICE=$(adb devices | awk 'NR>1 && /[[:space:]]device$/ { print $1; exit }')
if [[ -z "$DEVICE" ]]; then
  echo "ERROR: No ready adb device or emulator found."
  echo "       Start the Android emulator and wait for it to boot, then re-run."
  exit 1
fi
echo "Device : $DEVICE"

# --- logcat (30 s, Godot tag only) ---
# No 'timeout' binary on stock macOS (GNU coreutils only) — background + sleep + kill instead.
echo "Capturing logcat for 30 s..."
adb -s "$DEVICE" logcat -s Godot > "$OUTDIR/logcat.txt" 2>&1 &
LOGCAT_PID=$!
sleep 30
kill "$LOGCAT_PID" 2>/dev/null || true
wait "$LOGCAT_PID" 2>/dev/null || true

# --- screencap ---
echo "Taking screencap..."
adb -s "$DEVICE" exec-out screencap -p > "$OUTDIR/screencap.png"

# --- backend container log ---
echo "Capturing backend log..."
docker logs fogbound_backend --tail 200 > "$OUTDIR/backend.log" 2>&1

# --- latest symlink ---
rm -f test-artifacts/latest
ln -sf "$TIMESTAMP" test-artifacts/latest

# --- non-empty check ---
WARN=0
for f in logcat.txt screencap.png backend.log; do
  if [[ ! -s "$OUTDIR/$f" ]]; then
    echo "WARNING: $f is empty — check device/container state"
    WARN=1
  fi
done

echo ""
ls -lh "$OUTDIR/"
echo ""
echo "Artifacts → test-artifacts/latest/ ($TIMESTAMP)"
[[ $WARN -eq 0 ]] && echo "All files non-empty. ✓" || echo "Some files empty — review above warnings."

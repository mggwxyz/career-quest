#!/usr/bin/env bash
# Convert every PNG under public/would-you-rather/images/ to WebP (quality 85).
# Idempotent: skips conversion if the .webp already exists and is newer than the .png.
# Does NOT delete the .png files — remove them manually after verifying the WebPs render.

set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)/public/would-you-rather/images"
QUALITY="${QUALITY:-85}"

if ! command -v cwebp >/dev/null 2>&1; then
  echo "cwebp not found on PATH (install via: brew install webp)" >&2
  exit 1
fi

count=0
skipped=0
bytes_png=0
bytes_webp=0

shopt -s nullglob
for png in "$DIR"/*.png; do
  webp="${png%.png}.webp"
  if [[ -f "$webp" && "$webp" -nt "$png" ]]; then
    skipped=$((skipped + 1))
  else
    cwebp -quiet -q "$QUALITY" "$png" -o "$webp"
    count=$((count + 1))
  fi
  bytes_png=$((bytes_png + $(stat -f%z "$png")))
  bytes_webp=$((bytes_webp + $(stat -f%z "$webp")))
done

mb() { awk -v b="$1" 'BEGIN{printf "%.1f MB", b/1048576}'; }
echo "converted:  $count"
echo "skipped:    $skipped (already up-to-date)"
echo "png total:  $(mb "$bytes_png")"
echo "webp total: $(mb "$bytes_webp")"
if [[ "$bytes_png" -gt 0 ]]; then
  awk -v p="$bytes_png" -v w="$bytes_webp" \
    'BEGIN{printf "reduction:  %.1f%%\n", (1-w/p)*100}'
fi

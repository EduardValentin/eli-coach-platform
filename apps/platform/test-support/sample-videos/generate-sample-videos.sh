#!/usr/bin/env bash
set -euo pipefail

if [[ -x /opt/homebrew/bin/ffmpeg ]]; then
  ffmpeg=/opt/homebrew/bin/ffmpeg
else
  ffmpeg=$(command -v ffmpeg)
fi

here=$(cd -- "$(dirname -- "$0")" && pwd)

encode() {
  local size=$1
  local output=$2
  shift 2

  "$ffmpeg" -hide_banner -loglevel error -y \
    -f lavfi -i "testsrc2=size=${size}:rate=10:duration=2" \
    -an -c:v libx264 -preset veryslow -crf 40 -pix_fmt yuv420p \
    -map_metadata -1 -fflags +bitexact -flags:v +bitexact \
    "$@" "$output"
}

encode 320x180 "$here/landscape.mp4" -f mp4 -brand isom -movflags +faststart
encode 180x320 "$here/portrait.mov" -f mov -movflags +faststart

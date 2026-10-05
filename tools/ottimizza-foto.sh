#!/usr/bin/env bash
# Converte le foto in WebP leggeri per la galleria (obiettivo: 50–90 KB ciascuna).
# Uso:   ./tools/ottimizza-foto.sh foto1.jpg foto2.png ...
# Output: assets/img/galleria/<nome>.webp
# Richiede ImageMagick (comando "convert" o "magick").
set -euo pipefail

OUT_DIR="$(dirname "$0")/../assets/img/galleria"
MAX_KB=90
mkdir -p "$OUT_DIR"

IM=convert
command -v magick >/dev/null 2>&1 && IM="magick"
command -v "$IM" >/dev/null 2>&1 || { echo "Installa ImageMagick per continuare." >&2; exit 1; }

for src in "$@"; do
  name="$(basename "${src%.*}" | tr '[:upper:] ' '[:lower:]-')"
  dest="$OUT_DIR/$name.webp"
  # Lato lungo massimo 1200 px; abbassa la qualità finché il file non sta sotto MAX_KB.
  for q in 80 74 68 62 56 50; do
    "$IM" "$src" -auto-orient -strip -resize '1200x1200>' -quality "$q" -define webp:method=6 "$dest"
    size_kb=$(( $(wc -c < "$dest") / 1024 ))
    [ "$size_kb" -le "$MAX_KB" ] && break
  done
  echo "✔ $dest (${size_kb} KB, qualità $q)"
done

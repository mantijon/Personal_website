#!/usr/bin/env bash
#
# Generates WebP derivatives of everything in public/ and writes a manifest that
# the app reads (src/data/image-variants.json).
#
# Each variant is sized to how the image is ACTUALLY displayed, so the browser
# stops downloading a 1400px photo to paint it in a 450px card. The originals
# stay untouched and are used as the <picture> fallback.
#
# Requires ImageMagick (`brew install imagemagick`). Re-run after adding images:
#   ./scripts/generate-image-variants.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."

command -v magick >/dev/null || { echo "ImageMagick not found: brew install imagemagick"; exit 1; }

# gen <source> <suffix> <max-width>
gen() {
  local src="$1" suffix="$2" width="$3"
  [ -f "$src" ] || return 0
  local out="${src%.*}-${suffix}.webp"
  magick "$src" -auto-orient -resize "${width}x>" -strip -quality 80 -define webp:method=6 "$out"
  # Tiny flat-art sources can encode larger as WebP; keep the original in that case.
  if [ "$(stat -f%z "$out")" -ge "$(stat -f%z "$src")" ]; then
    rm -f "$out"
    echo "  skip $out (not smaller than source)"
  else
    echo "  $out  $(( $(stat -f%z "$out") / 1024 ))K"
  fi
}

echo "Hero portrait (renders ~285px, cropped from a landscape frame):"
gen public/Islom.JPG hero 1200

echo "Book covers (render 132-164px):"
for f in public/covers/*.jpg public/covers/*.jpeg public/covers/*.png; do
  [ -e "$f" ] || continue
  gen "$f" sm 400
done

echo "Project images (card ~450-580px, thumbnails 72px, lightbox full-screen):"
for f in public/projects/*.jpg public/projects/*.jpeg public/projects/*.png; do
  [ -e "$f" ] || continue
  gen "$f" thumb 160
  gen "$f" md 900
  # Only worth a separate lightbox size when the source is bigger than the card
  # size; otherwise "md" already is full resolution and the app falls back to it.
  if [ "$(magick identify -format '%w' "$f")" -gt 900 ]; then
    gen "$f" lg 1400
  fi
done

echo "Writing src/data/image-variants.json ..."
python3 - <<'PY'
import json, os, re, glob

manifest = {}
for path in glob.glob('public/**/*-*.webp', recursive=True):
    m = re.match(r'(.*)-(hero|sm|md|lg|thumb)\.webp$', path)
    if not m:
        continue
    stem, suffix = m.groups()
    # Find the original this derivative came from. Compare against the real
    # directory listing rather than os.path.exists: macOS is case-insensitive,
    # so "Islom.jpg" would match "Islom.JPG" here and then 404 on Vercel's
    # case-sensitive Linux filesystem.
    directory, base = os.path.split(stem)
    for entry in os.listdir(directory):
        name, ext = os.path.splitext(entry)
        if name == base and ext.lower() in ('.jpg', '.jpeg', '.png'):
            key = os.path.join(directory, entry).replace('public', '', 1)
            manifest.setdefault(key, {})[suffix] = path.replace('public', '', 1)
            break

manifest = {k: dict(sorted(v.items())) for k, v in sorted(manifest.items())}
with open('src/data/image-variants.json', 'w', encoding='utf-8') as f:
    json.dump(manifest, f, indent=2, ensure_ascii=False)
    f.write('\n')
print(f"  {len(manifest)} images, {sum(len(v) for v in manifest.values())} variants")
PY

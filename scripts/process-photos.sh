#!/bin/bash
# =========================================================
# Photo processor for the TP Gym website
#
# HOW TO USE: drop new photos (iPhone HEIC, JPG or PNG) into any of:
#     images/gallery/           Gallery page
#     images/transformations/   Coaching page, Transformations section
#     images/events/            Coaching page, Events section
#     images/members/           Our Members page
#     images/team/              Meet the Team page (name each photo after the
#                               person, e.g. stephen.jpg, and add it to js/team-data.js)
# then run:   ./scripts/process-photos.sh
#
# Transformations: a photo that already shows before AND after can have any
# name. Separate before/after photos are paired by name, e.g.
#     sarah-before.jpg + sarah-after.jpg
#
# For every folder it:
#   1. Moves exact duplicate photos into images/_duplicates/ (nothing is deleted)
#   2. Moves each new photo into images/originals/<folder>/ untouched (kept, not uploaded)
#   3. Makes a web version (longest side 1600px) in images/<folder>/full/ and a
#      thumbnail (around 600px) in images/<folder>/thumbs/: rotated correctly,
#      compressed, with location and camera data removed
#   4. Rebuilds js/photos-data.js, the photo list the pages read
#   5. Warns about photos that look like the same picture saved twice
#
# To remove a photo from the website, delete it from images/originals/<folder>/
# and run the script again.
# =========================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SETS="gallery transformations events members team"
DUPLICATES="images/_duplicates"
DATA="js/photos-data.js"

FULL_SIZE=1600      # longest side of the full-screen version, in pixels
THUMB_SIZE=600      # longest side of the grid thumbnail
FULL_QUALITY=0.80   # JPG quality (0-1)
THUMB_QUALITY=0.75

# --- Build the image helper (only the first time, or after it changes) ---
TOOL="scripts/.bin/imagetool"
if [ ! -x "$TOOL" ] || [ "scripts/imagetool.swift" -nt "$TOOL" ]; then
  echo "Preparing image tool (first run only, takes a few seconds)..."
  mkdir -p scripts/.bin
  swiftc -O "scripts/imagetool.swift" -o "$TOOL"
fi

is_image() {
  case "$(echo "${1##*.}" | tr '[:upper:]' '[:lower:]')" in
    jpg|jpeg|heic|heif|png) return 0 ;;
    *) return 1 ;;
  esac
}

# Web file name: "IMG_5643 2.HEIC" -> "img_5643-2.jpg"
slug() {
  local name="${1%.*}"
  echo "$name" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9_-]+/-/g; s/^-+|-+$//g'
}

# Move a file into a folder without overwriting anything already there
move_safely() {
  local src="$1" dir="$2" base dest n=2
  base="$(basename "$src")"
  dest="$dir/$base"
  while [ -e "$dest" ]; do
    dest="$dir/${base%.*}-$n.${base##*.}"
    n=$((n + 1))
  done
  mv "$src" "$dest"
  echo "$dest"
}

process_set() {
  local set="$1"
  local inbox="images/$set" originals="images/originals/$set"
  local full="images/$set/full" thumbs="images/$set/thumbs"
  local hashes moved=0 dupes=0 made=0 f h s o found dest

  mkdir -p "$inbox" "$originals" "$DUPLICATES" "$full" "$thumbs"
  echo "== $set"

  # 1 & 2: sort new photos into originals or duplicates
  hashes="$(mktemp)"
  for f in "$originals"/*; do
    [ -f "$f" ] && is_image "$f" && shasum -a 256 "$f" | cut -d' ' -f1 >> "$hashes"
  done

  # Names like "IMG_1 2.jpg" (Finder copies) go last, so the plain name is kept
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    h="$(shasum -a 256 "$f" | cut -d' ' -f1)"
    if grep -qx "$h" "$hashes"; then
      dest="$(move_safely "$f" "$DUPLICATES")"
      echo "   Duplicate (identical file): $(basename "$f") -> $dest"
      dupes=$((dupes + 1))
    else
      move_safely "$f" "$originals" > /dev/null
      echo "$h" >> "$hashes"
      moved=$((moved + 1))
    fi
  done < <(
    for f in "$inbox"/*; do
      [ -f "$f" ] && is_image "$f" || continue
      if [[ "$(basename "$f")" =~ \ [0-9]+\.[^.]+$ ]]; then echo "1	$f"; else echo "0	$f"; fi
    done | sort | cut -f2-
  )
  rm -f "$hashes"

  # 3: make web versions for any original that doesn't have one yet
  for f in "$originals"/*; do
    [ -f "$f" ] && is_image "$f" || continue
    s="$(slug "$(basename "$f")")"
    if [ ! -f "$full/$s.jpg" ] || [ "$f" -nt "$full/$s.jpg" ]; then
      "$TOOL" resize "$f" "$full/$s.jpg" "$FULL_SIZE" "$FULL_QUALITY" > /dev/null
      "$TOOL" resize "$f" "$thumbs/$s.jpg" "$THUMB_SIZE" "$THUMB_QUALITY" > /dev/null
      made=$((made + 1))
      printf "."
    fi
  done
  [ "$made" -gt 0 ] && echo

  # Remove web versions whose original has been deleted
  for f in "$full"/*.jpg; do
    [ -f "$f" ] || continue
    s="$(basename "$f" .jpg)"
    found=0
    for o in "$originals"/*; do
      [ -f "$o" ] && [ "$(slug "$(basename "$o")")" = "$s" ] && { found=1; break; }
    done
    if [ "$found" -eq 0 ]; then
      rm -f "$full/$s.jpg" "$thumbs/$s.jpg"
      echo "   Removed (original gone): $s.jpg"
    fi
  done

  echo "   New: $moved   Duplicates moved aside: $dupes   Processed: $made   Total on site: $(ls "$full" | grep -c '\.jpg$' || true)"

  # 5: flag photos that look like the same picture (not moved automatically)
  local list=()
  for f in "$originals"/*; do [ -f "$f" ] && is_image "$f" && list+=("$f"); done
  if [ "${#list[@]}" -gt 1 ]; then
    local similar
    similar="$("$TOOL" similar 5 "${list[@]}")"
    if [ -n "$similar" ]; then
      echo "   These look like the same picture. If one is a copy, move it from"
      echo "   $originals/ to $DUPLICATES/ and run this again:"
      echo "$similar" | while IFS=$'\t' read -r a b; do echo "     $(basename "$a")  ~  $(basename "$b")"; done
    fi
  fi
}

for set in $SETS; do process_set "$set"; done

# --- 4: write the photo list the pages read ---
{
  echo "// AUTO-GENERATED by scripts/process-photos.sh. Don't edit by hand;"
  echo "// add photos to the images/ folders and run the script instead."
  echo "window.PHOTOS = {"
  for set in $SETS; do
    echo "  \"$set\": ["
    for f in "images/$set/full"/*.jpg; do
      [ -f "$f" ] || continue
      s="$(basename "$f" .jpg)"
      w="$(sips -g pixelWidth "$f" | awk '/pixelWidth/ {print $2}')"
      h="$(sips -g pixelHeight "$f" | awk '/pixelHeight/ {print $2}')"
      echo "    { \"name\": \"$s\", \"full\": \"images/$set/full/$s.jpg\", \"thumb\": \"images/$set/thumbs/$s.jpg\", \"w\": $w, \"h\": $h },"
    done
    echo "  ],"
  done
  echo "};"
} > "$DATA"
echo "Photo list written to $DATA"

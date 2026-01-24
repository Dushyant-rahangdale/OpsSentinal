#!/bin/sh

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WEBSITE_DIR="${1:-$ROOT_DIR/../opsknight-website}"
SRC_DIR="$ROOT_DIR/docs"
if [ ! -d "$SRC_DIR" ]; then
  echo "Docs folder not found: $SRC_DIR" >&2
  exit 1
fi

if [ ! -d "$WEBSITE_DIR" ]; then
  echo "Website repo not found: $WEBSITE_DIR" >&2
  exit 1
fi

echo "Syncing app docs to website..."

sync_docs_dir() {
  src="$1"
  dest="$2"

  mkdir -p "$dest"
  rsync -av --delete \
    --exclude 'coreconcepts/**' \
    --exclude 'core-concepts/**' \
    --exclude 'website/**' \
    --exclude '.DS_Store' \
    "$src/" "$dest/"
}

found_versions=0
for version_dir in "$SRC_DIR"/v*; do
  if [ -d "$version_dir" ]; then
    version="$(basename "$version_dir")"
    dest_dir="$WEBSITE_DIR/content/docs/$version/app"
    echo " - $version -> $dest_dir"
    sync_docs_dir "$version_dir" "$dest_dir"
    found_versions=1
  fi
done

if [ "$found_versions" -eq 0 ]; then
  dest_dir="$WEBSITE_DIR/content/docs/v1/app"
  echo " - v1 (fallback) -> $dest_dir"
  sync_docs_dir "$SRC_DIR" "$dest_dir"
fi

echo "Done."

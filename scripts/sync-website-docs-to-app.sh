#!/bin/sh

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WEBSITE_DIR="${1:-$ROOT_DIR/../opsknight-website}"
SRC_DIR="$WEBSITE_DIR/content/docs"
DEST_DIR="$ROOT_DIR/docs/website"

if [ ! -d "$SRC_DIR" ]; then
  echo "Website docs folder not found: $SRC_DIR" >&2
  exit 1
fi

if [ ! -d "$WEBSITE_DIR" ]; then
  echo "Website repo not found: $WEBSITE_DIR" >&2
  exit 1
fi

mkdir -p "$DEST_DIR"

echo "Syncing website docs to app repo..."
rsync -av --delete \
  --exclude '.DS_Store' \
  "$SRC_DIR/" "$DEST_DIR/"

echo "Done. Synced to: $DEST_DIR"

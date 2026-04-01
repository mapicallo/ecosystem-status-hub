#!/usr/bin/env bash
# Builds dist/ecosystem-status-hub-<version>.zip (manifest version from manifest.json)

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
MANIFEST="$ROOT/manifest.json"

command -v jq >/dev/null 2>&1 || {
  echo "Install jq to read version, or set VERSION manually." >&2
  exit 1
}

VER="$(jq -r '.version // empty' "$MANIFEST")"
if [[ -z "$VER" || "$VER" == "null" ]]; then
  echo "manifest.json: missing version" >&2
  exit 1
fi

ZIP_NAME="ecosystem-status-hub-${VER}.zip"
ZIP_PATH="$DIST/$ZIP_NAME"
STAGING="$DIST/staging-$VER"

rm -rf "$STAGING"
mkdir -p "$STAGING"

for item in manifest.json background.js brand data icons panel popup LICENSE; do
  if [[ -e "$ROOT/$item" ]]; then
    cp -R "$ROOT/$item" "$STAGING/"
  else
    echo "warning: missing $item" >&2
  fi
done

mkdir -p "$DIST"
rm -f "$ZIP_PATH"
( cd "$STAGING" && zip -r "$ZIP_PATH" . -x "*.DS_Store" )

rm -rf "$STAGING"
echo ""
echo "Store package ready:"
echo "  $ZIP_PATH"
echo ""

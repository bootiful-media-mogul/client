#!/usr/bin/env bash
# builds the vue.js application and packages it as an nginx container image with paketo. any
# failure stops it: an image without the application in it must never be published.
set -euo pipefail

: "${ROOT_DIR:?ROOT_DIR is required}"
: "${IMAGE_NAME:?IMAGE_NAME is required}"

echo "the root directory is ${ROOT_DIR}."
cd "$ROOT_DIR"
rm -rf dist build
npm install
npm run build
[ -f dist/index.html ] || { echo "the build produced no dist/index.html" >&2; exit 1; }

mkdir -p build/public
cp .github/workflows/nginx-buildpack-config/* build
cp -r dist/* build/public
cd build

# PUBLISH= (empty) builds into the local docker daemon instead; ci leaves it unset.
publish=(--publish)
[ -n "${PUBLISH-unset}" ] || publish=()
pack build "$IMAGE_NAME" \
  --builder paketobuildpacks/builder-jammy-base \
  --buildpack paketo-buildpacks/nginx \
  --env PORT=8080 \
  ${publish[@]+"${publish[@]}"}

#!/usr/bin/env bash
set -euo pipefail

app_env="${1:-staging}"
api_base_url="${2:-}"

if [[ -z "$api_base_url" ]]; then
  echo "Usage: ./tool/build_internal.sh <staging|production> <https-api-base-url>"
  exit 2
fi

if [[ "$app_env" == "production" && "$api_base_url" != https://* ]]; then
  echo "Production API_BASE_URL must use HTTPS."
  exit 2
fi

flutter pub get
flutter test
flutter analyze
flutter build appbundle \
  --dart-define="APP_ENV=$app_env" \
  --dart-define="API_BASE_URL=$api_base_url"
flutter build ipa --no-codesign \
  --dart-define="APP_ENV=$app_env" \
  --dart-define="API_BASE_URL=$api_base_url"

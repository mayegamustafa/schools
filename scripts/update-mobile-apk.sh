#!/usr/bin/env bash
#
# Rebuild the SchoolFinder Android app and publish the APK to the website so
# visitors can install the latest version directly (no Play Store).
#
# Usage:
#   MOBILE_DIR=/path/to/schoolfinder-mobile API_URL=https://your-domain ./scripts/update-mobile-apk.sh [version]
#
# After it finishes, commit the updated public/downloads/schoolfinder.apk and
# public/downloads/version.json and push — Railway redeploys and the new APK is
# live at /api/app/download.
set -euo pipefail

MOBILE_DIR="${MOBILE_DIR:-$HOME/schoolfinder-mobile}"
API_URL="${API_URL:-https://schools-production-a1d3.up.railway.app}"
VERSION="${1:-}"
WEB_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$WEB_DIR/public/downloads/schoolfinder.apk"

echo "▸ Mobile project : $MOBILE_DIR"
echo "▸ API URL        : $API_URL"
echo "▸ Output APK     : $DEST"

cd "$MOBILE_DIR"

# 1. Generate the native Android project (managed workflow)
npx expo prebuild --platform android --clean

# 2. Pin Gradle to a compatible version (RN 0.85 needs >= 8.13)
sed -i 's#gradle-[0-9.]*-bin.zip#gradle-8.13-bin.zip#' android/gradle/wrapper/gradle-wrapper.properties

# 2b. Recreate expo-secure-store data rules referenced by the manifest
#     (the config plugin references these xml files but doesn't always emit them)
mkdir -p android/app/src/main/res/xml
cat > android/app/src/main/res/xml/secure_store_backup_rules.xml <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
  <exclude domain="sharedpref" path="SecureStore" />
</full-backup-content>
XML
cat > android/app/src/main/res/xml/secure_store_data_extraction_rules.xml <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
  <cloud-backup>
    <exclude domain="sharedpref" path="SecureStore" />
  </cloud-backup>
  <device-transfer>
    <exclude domain="sharedpref" path="SecureStore" />
  </device-transfer>
</data-extraction-rules>
XML

# 3. Build the release APK
cd android
ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}" EXPO_PUBLIC_API_URL="$API_URL" ./gradlew assembleRelease

# 4. Publish to the website
cp app/build/outputs/apk/release/app-release.apk "$DEST"
SIZE=$(du -h "$DEST" | cut -f1)
echo "▸ Copied APK ($SIZE) → $DEST"

# 5. Bump version.json if a version was passed
if [ -n "$VERSION" ]; then
  printf '{\n  "version": "%s",\n  "builtAt": "%s",\n  "minAndroid": "7.0"\n}\n' \
    "$VERSION" "$(date +%Y-%m-%d)" > "$WEB_DIR/public/downloads/version.json"
  echo "▸ Bumped version.json → $VERSION"
fi

echo "✓ Done. Now: git add public/downloads && git commit -m 'chore: update mobile APK' && git push"

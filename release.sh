#!/usr/bin/env bash
set -euo pipefail

# release.sh — One-command desktop release for Clarity Stream
# Usage: ./release.sh [patch|minor|major]
# Defaults to patch bump if no argument given

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

BUMP="${1:-patch}"

# Validate bump type
case "$BUMP" in
  patch|minor|major) ;;
  *) echo "Usage: $0 [patch|minor|major]"; exit 1 ;;
esac

# Read current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Current version: $CURRENT_VERSION"

# Bump version (npm version handles git tag too)
NEW_VERSION=$(npm version "$BUMP" --no-git-tag-version | sed 's/^v//')
echo "New version: $NEW_VERSION"

# Stage updated package.json + package-lock.json
git add package.json package-lock.json 2>/dev/null || git add package.json

# Commit
git commit -m "chore(release): desktop v$NEW_VERSION"

# Tag with desktop- prefix
git tag "desktop-v$NEW_VERSION"

# Push commit + tag (triggers GitHub Actions workflow)
git push origin HEAD
git push origin "desktop-v$NEW_VERSION"

echo ""
echo "✅ Released desktop v$NEW_VERSION"
echo "   GitHub Actions will build, sign, and publish at:"
echo "   https://github.com/Clarity-Stream-Inc/desktop/actions"
echo "   Release will appear at:"
echo "   https://github.com/Clarity-Stream-Inc/desktop/releases/tag/desktop-v$NEW_VERSION"

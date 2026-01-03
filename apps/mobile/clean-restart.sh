#!/bin/bash
# Complete clean restart script for development builds
# This kills the app, clears all caches, and restarts everything

set -e

echo "🛑 Stopping all Metro and Expo processes..."
pkill -9 -f "expo start" 2>/dev/null || true
pkill -9 -f "metro" 2>/dev/null || true
pkill -9 -f "node.*8081" 2>/dev/null || true

echo "📱 Killing app on simulator..."
xcrun simctl terminate booted com.wishlistapp.mobile 2>/dev/null || true

echo "🗑️  Clearing all caches..."
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/haste-* 2>/dev/null || true
rm -rf .expo 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf ios/build 2>/dev/null || true
watchman watch-del-all 2>/dev/null || true

echo "✅ Cleanup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Run: npm run dev"
echo "2. Once Metro is running, rebuild the app:"
echo "   export SENTRY_DISABLE_AUTO_UPLOAD=true && npx expo run:ios"
echo ""
echo "⚠️  Important: Make sure to completely close and reopen the app on the simulator"
echo "   (not just reload - actually kill it and launch it fresh)"




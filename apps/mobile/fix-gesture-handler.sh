#!/bin/bash
# Script to fix gesture handler duplicate registration error
# This error occurs with Fast Refresh in development builds

echo "🔧 Fixing gesture handler duplicate registration error..."

# Kill any running Metro processes
echo "Stopping Metro bundler..."
pkill -9 -f "expo start" 2>/dev/null || true
pkill -9 -f "metro" 2>/dev/null || true

# Clear all caches
echo "Clearing caches..."
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/haste-* 2>/dev/null || true
rm -rf .expo 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true

# For iOS: Clean build folder
if [ -d "ios" ]; then
  echo "Cleaning iOS build..."
  rm -rf ios/build 2>/dev/null || true
fi

# For Android: Clean build folder
if [ -d "android" ]; then
  echo "Cleaning Android build..."
  rm -rf android/app/build 2>/dev/null || true
fi

echo "✅ Cleanup complete!"
echo ""
echo "Next steps:"
echo "1. Rebuild the native app: npm run ios (or npm run android)"
echo "2. If the error persists, restart your development server"
echo ""
echo "Note: This error is common with Fast Refresh in development builds."
echo "It should resolve after a clean rebuild."



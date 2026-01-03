#!/bin/bash
# Development build startup script
# This ensures clean startup without hot reload issues

echo "🧹 Cleaning up old Metro processes..."
pkill -9 -f "expo start" 2>/dev/null || true
pkill -9 -f "metro" 2>/dev/null || true
pkill -9 -f "node.*8081" 2>/dev/null || true

echo "🗑️  Clearing Metro cache..."
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/haste-* 2>/dev/null || true
rm -rf .expo 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true

echo "🚀 Starting Metro bundler with dev client..."
export SENTRY_DISABLE_AUTO_UPLOAD=true
npx expo start --dev-client --clear




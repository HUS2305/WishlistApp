#!/bin/bash
# Bash script to restart Expo with cleared cache
# This ensures the new font configuration is loaded

echo "🎨 Restarting Expo with Playwrite CZ font..."
echo ""

# Navigate to mobile app directory
cd "$(dirname "$0")"

echo "📦 Clearing Metro bundler cache..."
echo ""

# Start Expo with cleared cache
echo "🚀 Starting Expo..."
echo ""
echo "After the QR code appears:"
echo "  1. Close Expo Go app completely"
echo "  2. Reopen Expo Go"
echo "  3. Scan the QR code again"
echo ""
echo "All text should now be in Playwrite CZ handwriting style! ✨"
echo ""

npx expo start --clear


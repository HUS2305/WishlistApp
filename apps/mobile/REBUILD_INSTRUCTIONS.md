# Mobile App Development Guide

## Quick Start

After restarting your computer or pulling new code:

```bash
# Terminal 1: Start backend
cd /Users/hussein/Desktop/WishlistApp/services/backend
npm run dev

# Terminal 2: Start mobile app
cd /Users/hussein/Desktop/WishlistApp/apps/mobile
npm run dev
```

That's it! The app will launch in the iOS simulator automatically.

---

## When to Rebuild Native Code

You only need to run `npm run ios` (full rebuild) when you:
- Add a new native dependency (package with iOS/Android code)
- Modify `app.json` or native configuration
- Delete `ios/build` or Xcode's derived data
- First time setup on a new machine

For day-to-day development, `npm run dev` is all you need.

---

## Clean Rebuild (If Needed)

If you encounter persistent issues:

```bash
cd /Users/hussein/Desktop/WishlistApp/apps/mobile

# 1. Kill running processes
pkill -9 -f "expo" 2>/dev/null
pkill -9 -f "metro" 2>/dev/null

# 2. Clear caches
rm -rf node_modules/.cache .expo
rm -rf $TMPDIR/metro-* $TMPDIR/haste-*

# 3. For native issues, clean iOS build
rm -rf ios/build ios/Pods ios/Podfile.lock
cd ios && pod install && cd ..

# 4. Full rebuild
npm run ios
```

---

## Architecture Notes

### Monorepo Structure
This is an npm workspace monorepo. Native modules are resolved via custom Metro config to prevent duplicate registrations.

### Key Configurations Applied

**`metro.config.js`** - Handles monorepo module resolution:
- Forces native modules to resolve from consistent locations
- Blocks duplicate gesture handler from root node_modules
- Prevents "Tried to register two views" errors

**`app/_layout.tsx`** - Provider hierarchy:
- `ThemeProvider` wraps `BottomSheetModalProvider` (not the other way around)
- This ensures bottom sheet portals have access to theme context

**`app/index.tsx`** - Safe context access:
- Gracefully handles Expo Router timing where routes may render before providers mount

---

## Environment Setup

Ensure `.env` file exists in `apps/mobile/`:
```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx...
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| "Tried to register two views" | Clear caches and restart Metro |
| "useAuth outside ClerkProvider" | Restart Metro (timing issue during hot reload) |
| "useTheme must be within ThemeProvider" | Check `_layout.tsx` provider order |
| Bottom sheet crashes | Verify `BottomSheetModalProvider` is inside `ThemeProvider` |
| Metro stuck | Kill all node processes: `pkill -9 -f "node"` |

# Font Configuration

## Current Font
**Poppins** - Clean, modern, geometric sans-serif

## How to Change Font

### Edit ONE file: `src/components/Text.tsx` (line 10)

```typescript
const FONT_NAME = "Poppins_400Regular"; // Change this line
```

### Steps:
1. Install font: `npx expo install @expo-google-fonts/[font-name]`
2. Import in `app/_layout.tsx` and add to `useFonts()`
3. Change line 10 in `src/components/Text.tsx`
4. Restart: `npx expo start --clear`

That's it! One line controls the entire app's font.


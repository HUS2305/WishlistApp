# Wishlist Images Guide

## Overview
This guide provides specifications for the 18 preset wishlist cover images (e.g., christmas tree, arts & crafts, etc.) that users can select when creating or editing wishlists.

## Image Specifications

### Dimensions & Aspect Ratio
- **Aspect Ratio:** 1:1 (square)
- **Base Size:** 1200x1200 pixels (recommended source size)
- **Why:** The app displays wishlist images in square containers:
  - Main detail view: 120x120px (with potential for larger display)
  - List thumbnails: 60x60px
  - Edit sheet: 120x120px

### Format & Compression
- **Format:** WebP (recommended) or PNG
- **Compression:** Yes, compress before adding to the app
- **Why:** 
  - Your project already uses WebP format (10 *.webp files in apps/)
  - WebP provides excellent compression (typically 25-35% smaller than PNG) while maintaining quality
  - Better performance on mobile devices

### Recommended Compression Settings
- **WebP Quality:** 80-85% (good balance of quality and file size)
- **Target File Size:** Aim for 50-150KB per image (for 1200x1200px source)
- **Tools:**
  - Online: Squoosh.app, TinyPNG
  - CLI: `cwebp` (Google WebP tools)
  - Photoshop/ImageOptim: Export as WebP with quality 80-85%

## Storage Location

### Directory Structure
Store images in: `apps/mobile/assets/wishlist-covers/`

```
apps/mobile/assets/
  ├── wishlist-covers/
  │   ├── christmas-tree.webp
  │   ├── arts-crafts.webp
  │   ├── birthday.webp
  │   ├── ... (16 more images)
  │   └── README.md (optional: list of all available images)
```

### Why Local Assets?
- **Performance:** Instant loading, no network requests
- **Offline Support:** Works without internet connection
- **Consistency:** Same images for all users
- **Bundle Size:** 18 images × ~100KB = ~1.8MB (acceptable for mobile apps)

## Naming Convention

### Format
Use **kebab-case** (lowercase with hyphens) and descriptive names:

```
wishlist-{category-name}.webp
```

### Examples
- `christmas-tree.webp`
- `arts-crafts.webp`
- `birthday.webp`
- `wedding.webp`
- `baby-shower.webp`
- `graduation.webp`
- `anniversary.webp`
- `housewarming.webp`
- `travel.webp`
- `electronics.webp`
- `fashion.webp`
- `books.webp`
- `sports.webp`
- `music.webp`
- `food-cooking.webp`
- `home-decor.webp`
- `gaming.webp`
- `outdoor.webp`

### Naming Guidelines
1. Use lowercase letters only
2. Separate words with hyphens (not underscores or spaces)
3. Be descriptive but concise (2-3 words max)
4. Avoid special characters
5. Keep names consistent with the theme/category

## Implementation Notes

### How Images Will Be Referenced
In React Native/Expo, images will be referenced using `require()`:

```typescript
// Example usage in code
const wishlistCoverImages = {
  'christmas-tree': require('@/assets/wishlist-covers/christmas-tree.webp'),
  'arts-crafts': require('@/assets/wishlist-covers/arts-crafts.webp'),
  // ... etc
};
```

### Database Storage
The `coverImage` field in the database stores a **string identifier** (not the full path), e.g.:
- `"christmas-tree"` instead of `"apps/mobile/assets/wishlist-covers/christmas-tree.webp"`

This allows:
- Easy updates without database migrations
- Flexibility to change storage location later
- Smaller database footprint

## Checklist for Adding Images

- [ ] Create 18 images at 1200x1200px (square)
- [ ] Compress to WebP format (80-85% quality)
- [ ] Verify each image is under 150KB
- [ ] Name files using kebab-case convention
- [ ] Place all images in `apps/mobile/assets/wishlist-covers/`
- [ ] Test images display correctly in the app
- [ ] Verify images look good at both 60x60px (thumbnails) and 120x120px (detail view)

## Design Considerations

### Visual Guidelines
- **Contrast:** Ensure images work well on both light and dark themes
- **Clarity:** Images should be recognizable even at small sizes (60x60px)
- **Consistency:** Maintain similar visual style across all 18 images
- **Centering:** Important elements should be centered (images may be cropped)
- **Colors:** Consider your app's color scheme (pink/primary color accents)

### Testing at Different Sizes
Before finalizing, test each image at:
- 60x60px (list thumbnail)
- 120x120px (detail view)
- 240x240px (potential future use)

## Next Steps

After adding the images:
1. Create a mapping file/constant that lists all available images
2. Update the `EditWishlistSheet` component to show image selection UI
3. Update the `CreateWishlistSheet` component to include image selection
4. Update display components to show selected images instead of placeholders
5. Test on both iOS and Android devices

# Bottom Sheet Refactoring Plan

## Overview
Standardize all bottom sheets to use the `@gorhom/bottom-sheet` library with consistent patterns.

## Key Standards

### Structure Pattern
1. **Dynamic Sizing**: Use `autoHeight={true}` for most sheets
2. **Stacking**: Use `stackBehavior="switch"` (default) for child sheets
3. **Components**: 
   - Use `BottomSheetScrollView` for scrollable content
   - Use `BottomSheetFlatList` for lists
   - Use `BottomSheetTextInput` for text inputs
   - Never use native `ScrollView`, `FlatList`, or `TextInput`
4. **Sibling Components**: Wrap multiple `BottomSheet` components in React Fragment (`<>...</>`) for proper stacking
5. **Safe Area**: Use `useSafeAreaInsets` and calculate `bottomPadding` for `contentContainerStyle`
6. **Header Pattern**: Consistent header with centered title (NO close/X button - dismiss by dragging down or tapping backdrop)
   - paddingHorizontal: 20
   - paddingTop: 0
   - paddingBottom: 8
   - minHeight: 0
   - justifyContent: "center"
   - alignItems: "center"
   - fontSize: 20, fontWeight: "600"
7. **Bottom Padding Pattern**: Consistent bottom padding for all sheets
   - `const bottomPadding = Math.max(20, Platform.OS === "ios" ? insets.bottom + 30 : 20);`
   - Apply to `contentContainerStyle` as `{ paddingBottom: bottomPadding }`

### Stack Behavior (from docs: https://gorhom.dev/react-native-bottom-sheet/modal/props#stackbehavior)
- `push`: Mounts the modal on top of the current one
- `switch`: Minimizes the current modal then mounts the new one (default)
- `replace`: Dismisses the current modal then mounts the new one

## Refactoring Tasks

### Phase 1: Create Reusable Components (Extract Common Patterns) ✅ COMPLETE

#### 1. SelectFriendsSheet Component ✅
**Location**: `apps/mobile/src/components/SelectFriendsSheet.tsx`
**Extracted from**: CreateWishlistSheet, EditWishlistSheet, CreateGroupGiftSheet
**Usage**: Used when selecting friends to invite/collaborate
**Features**:
- Multi-select friend list
- Uses `BottomSheetScrollView`
- Has header button pattern (moved from footer)
- Uses `stackBehavior="push"` for proper stacking
- Uses `autoHeight={true}`

#### 2. MembersSheet Component ✅
**Location**: `apps/mobile/src/components/MembersSheet.tsx`
**Extracted from**: `apps/mobile/app/wishlist/[id].tsx` (lines ~1395-1500)
**Usage**: Display wishlist members/collaborators
**Features**:
- Shows owner and collaborators
- Uses `BottomSheetScrollView`
- Uses `stackBehavior="push"` for proper stacking
- Uses `autoHeight={true}`

#### 3. SelectWishlistSheet Component ✅
**Location**: `apps/mobile/src/components/SelectWishlistSheet.tsx`
**Extracted from**: `apps/mobile/app/wishlist/[id].tsx` (lines ~1275-1350)
**Usage**: Select a wishlist (e.g., for duplicating items)
**Features**:
- List of wishlists
- Uses `BottomSheetFlatList` for performance
- Uses `stackBehavior="push"` for proper stacking
- Uses `autoHeight={true}`

### Phase 2: Refactor Sheet Components ✅ COMPLETE

#### 4. AddItemSheet ✅
**Status**: ✅ Complete - Fully refactored with header button pattern
**Completed**:
- Uses `snapPoints={['90%']}` for 90% height
- Uses `BottomSheetTextInput` for all text inputs
- Uses `BottomSheetScrollView` for scrollable content
- Header button pattern (right-aligned "Add" button)
- Keyboard behavior fixed (`keyboardBehavior="extend"`)
- Standard structure pattern

#### 5. CreateWishlistSheet ✅
**Status**: ✅ Complete - Uses SelectFriendsSheet and header button pattern
**Completed**:
- Uses `SelectFriendsSheet` component (wrapped in Fragment)
- Uses `snapPoints={['90%']}` for 90% height
- Uses `BottomSheetTextInput` for all text inputs
- Header button pattern (right-aligned "Create Wishlist" button)
- Keyboard behavior (`keyboardBehavior="extend"`)
- Standard structure pattern

#### 6. EditWishlistSheet ✅
**Status**: ✅ Complete - Uses SelectFriendsSheet and header button pattern
**Completed**:
- Uses `SelectFriendsSheet` component (wrapped in Fragment)
- Uses `snapPoints={['90%']}` for 90% height
- Uses `BottomSheetTextInput` for all text inputs
- Header button pattern (right-aligned "Save Changes" button)
- Keyboard behavior (`keyboardBehavior="extend"`)
- Standard structure pattern

#### 7. CreateGroupGiftSheet ✅
**Status**: ✅ Complete - Uses SelectFriendsSheet and BottomSheet components
**Completed**:
- Uses `SelectFriendsSheet` component
- Uses `BottomSheetScrollView` and `BottomSheetTextInput`
- Uses `snapPoints={['90%']}` for 90% height
- Header button pattern (right-aligned "Create Group Gift" button)
- Keyboard behavior (`keyboardBehavior="extend"`)
- Standard structure pattern

#### 8. SortWishlistSheet ✅
**Status**: ✅ Complete
**Completed**:
- Uses `autoHeight={true}`
- Uses `BottomSheetScrollView`
- Standard structure pattern
- Updated padding pattern (paddingTop: 0, paddingBottom: 20)
- Removed divider after last option

### Phase 3: Refactor Menu Components ✅ COMPLETE

#### 9. WishlistMenu ✅
**Completed**:
- Uses `autoHeight={true}`
- Standard structure pattern
- Updated padding pattern (paddingTop: 0, paddingBottom: 20)
- Removed divider after last option

#### 10. ItemMenu ✅
**Completed**:
- Uses `autoHeight={true}`
- Standard structure pattern
- Updated padding pattern (paddingTop: 0, paddingBottom: 20)
- Removed divider after last option

#### 11. FriendMenu ✅
**Completed**:
- Uses `autoHeight={true}`
- Standard structure pattern
- Updated padding pattern (paddingTop: 0, paddingBottom: 20)
- Removed divider after last option

### Phase 4: Refactor Modal Components ✅ COMPLETE

#### 12. DeleteConfirmModal ✅
**Completed**:
- Uses `autoHeight={true}`
- Standard structure pattern
- Fixed header padding (paddingTop: 0, paddingBottom: 0)
- Fixed button marginBottom (10px)
- Fixed friend modals Cancel button issue (conditional rendering)
- Applied to all modals (wishlist, item, friend, block user, remove friend, etc.)

#### 13. PasswordVerificationModal ✅
**Completed**:
- Uses `BottomSheetTextInput`
- Uses `autoHeight={true}`
- Standard structure pattern

#### 14. IdentityVerificationModal ✅
**Completed**:
- Uses `BottomSheetTextInput`
- Uses `autoHeight={true}`
- Standard structure pattern

### Phase 5: Update App Files

#### 15. wishlist/[id].tsx ✅
**Completed**:
- Uses `MembersSheet` component
- Uses `SelectWishlistSheet` component
- Sheets properly wrapped in Fragment for stacking
- Proper stacking behavior

#### 16. friends.tsx, friends/all.tsx, friends/[id].tsx, friends/birthdays.tsx ✅
**Completed**:
- Refactored inline "Birthday Gift Choice" sheets
- Uses `autoHeight={true}` (already was using it)
- Uses standard header pattern (centered title, no X button, fontSize: 20, fontWeight: "600")
- Added safe area bottom padding using `useSafeAreaInsets`
- Updated header styles to match standard pattern (paddingHorizontal: 20, paddingTop: 0, paddingBottom: 8)
- Kept as inline components (no need to extract)

#### 17. create-profile.tsx ✅
**Completed**:
- Refactored "Language Picker" sheet
- Refactored "Currency Picker" sheet
- Refactored "Sex Picker" sheet (for consistency)
- Replaced native `ScrollView` with `BottomSheetFlatList` for Language and Currency pickers
- Changed from `height={0.7}` to `autoHeight={true}` for Language and Currency pickers
- Removed X button from all picker headers (standard pattern - no X button)
- Updated header styles to standard pattern (centered title, fontSize: 20, fontWeight: "600")
- Added safe area bottom padding using `useSafeAreaInsets`
- **Fixed scrolling issue**: Added `scrollable={true}` prop to Language and Currency BottomSheet components
- **Used `ListHeaderComponent` pattern**: Moved headers into `ListHeaderComponent` prop of `BottomSheetFlatList` for proper gesture handling
- **Added search functionality**: Added search bar to Currency picker with `BottomSheetTextInput` for filtering currencies
- **UI improvements**: Fixed spacing on create-profile page (added top padding using safe area insets), moved description text closer to title, removed divider under Enable Notifications section

### Phase 6: Cleanup ✅ COMPLETE

#### 18. AddByLinkSheet ✅
**Completed**:
- **Deleted entire component** - It was a test sheet that's no longer needed
- Removed import and usage from `wishlist/[id].tsx`
- Removed `addByLinkSheetVisible` state variable
- Updated `onAddByLink` handler to log TODO message instead of opening sheet

## Implementation Order

1. **Create reusable components first** (SelectFriendsSheet, MembersSheet, SelectWishlistSheet)
2. **Refactor sheets that use these reusable components** (CreateWishlistSheet, EditWishlistSheet, CreateGroupGiftSheet, wishlist/[id].tsx)
3. **Refactor remaining sheets** (AddItemSheet, SortWishlistSheet, Menus, Modals)
4. **Update app files** (friends screens, create-profile)
5. **Cleanup** (AddByLinkSheet deleted - was test code)

## Testing Checklist

For each refactored sheet:
- [ ] Dynamic sizing works (sheet adjusts to content)
- [ ] Stacking works (child sheets appear on top correctly)
- [ ] Keyboard handling works (if has text inputs)
- [ ] Scrolling works smoothly (if has scrollable content)
- [ ] Safe area padding is correct
- [ ] Close/dismiss works correctly
- [ ] No native ScrollView/FlatList/TextInput components used

## Notes

- All sheets should use `stackBehavior="switch"` (default) unless specific reason for `push` or `replace`
  - **Update**: Child sheets (like SelectFriendsSheet, MembersSheet, SelectWishlistSheet) use `stackBehavior="push"` to keep parent visible
- Multiple sheets in same component must be wrapped in Fragment (`<>...</>`) to be siblings
- Always use `BottomSheetScrollView`, `BottomSheetFlatList`, `BottomSheetTextInput` instead of native components
- Use `autoHeight={true}` for dynamic sizing (most common case)
  - **Update**: Some sheets (AddItemSheet, CreateWishlistSheet, EditWishlistSheet, CreateGroupGiftSheet) use `snapPoints={['90%']}` instead for consistent 90% height with keyboard behavior
- Use `useSafeAreaInsets` for bottom padding calculations
- **Header Button Pattern**: Action buttons moved to header (right-aligned) for sheets with forms (AddItemSheet, CreateWishlistSheet, EditWishlistSheet, CreateGroupGiftSheet, SelectFriendsSheet)
- **Menu Padding Pattern**: Menus use `paddingTop: 0, paddingBottom: 20` with no divider after last option
- **Modal Styling**: DeleteConfirmModal uses `paddingBottom: 0` for header and `marginBottom: 10` for buttons

## Additional Fixes (Outside Scope but Related)

- ✅ Fixed FAB button z-index and interaction issues
- ✅ Fixed friend modals Cancel button not working (conditional rendering issue)


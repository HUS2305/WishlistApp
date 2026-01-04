# Bottom Sheet Refactoring Plan

## Overview
Standardize all bottom sheets to use the `@gorhom/bottom-sheet` library with consistent patterns based on the `AddByLinkSheet.tsx` template.

## Key Standards (Based on AddByLinkSheet template)

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

### Phase 1: Create Reusable Components (Extract Common Patterns)

#### 1. SelectFriendsSheet Component
**Location**: `apps/mobile/src/components/SelectFriendsSheet.tsx`
**Extracted from**: CreateWishlistSheet, EditWishlistSheet, CreateGroupGiftSheet
**Usage**: Used when selecting friends to invite/collaborate
**Features**:
- Multi-select friend list
- Uses `BottomSheetScrollView`
- Has "Done" button at bottom
- Uses `stackBehavior="switch"` (default)
- Uses `autoHeight={true}`

#### 2. MembersSheet Component
**Location**: `apps/mobile/src/components/MembersSheet.tsx`
**Extracted from**: `apps/mobile/app/wishlist/[id].tsx` (lines ~1395-1500)
**Usage**: Display wishlist members/collaborators
**Features**:
- Shows owner and collaborators
- Uses `BottomSheetScrollView`
- Uses `stackBehavior="switch"` (default)
- Uses `autoHeight={true}`

#### 3. SelectWishlistSheet Component
**Location**: `apps/mobile/src/components/SelectWishlistSheet.tsx`
**Extracted from**: `apps/mobile/app/wishlist/[id].tsx` (lines ~1275-1350)
**Usage**: Select a wishlist (e.g., for duplicating items)
**Features**:
- List of wishlists
- Uses `BottomSheetFlatList` for performance
- Uses `stackBehavior="switch"` (default)
- Uses `autoHeight={true}`

### Phase 2: Refactor Sheet Components

#### 4. AddItemSheet
**Status**: Partially using BottomSheet components
**Changes Needed**:
- Ensure `autoHeight={true}`
- Replace any native `ScrollView`/`FlatList`/`TextInput` with BottomSheet versions
- Verify stacking works correctly
- Use standard structure pattern

#### 5. CreateWishlistSheet
**Status**: Using BottomSheet components but needs refactoring
**Changes Needed**:
- Replace inline "Select Friends" sheet with `SelectFriendsSheet` component
- Wrap both sheets in Fragment (`<>...</>`) for stacking
- Ensure `autoHeight={true}`
- Use standard structure pattern
- Replace any native components with BottomSheet versions

#### 6. EditWishlistSheet
**Status**: Using BottomSheet components but needs refactoring
**Changes Needed**:
- Replace inline "Select Friends" sheet with `SelectFriendsSheet` component
- Wrap both sheets in Fragment (`<>...</>`) for stacking
- Ensure `autoHeight={true}`
- Use standard structure pattern
- Replace any native components with BottomSheet versions

#### 7. CreateGroupGiftSheet
**Status**: Using native `ScrollView` in friend selection
**Changes Needed**:
- Replace inline "Select Friends" sheet with `SelectFriendsSheet` component
- Wrap both sheets in Fragment (`<>...</>`) for stacking
- Ensure `autoHeight={true}`
- Use standard structure pattern
- Replace native `ScrollView` with `BottomSheetScrollView`

#### 8. SortWishlistSheet
**Status**: Simple selection sheet
**Changes Needed**:
- Ensure `autoHeight={true}`
- Use standard structure pattern
- Verify it works correctly

### Phase 3: Refactor Menu Components

#### 9. WishlistMenu
**Changes Needed**:
- Ensure `autoHeight={true}`
- Use standard structure pattern

#### 10. ItemMenu
**Changes Needed**:
- Ensure `autoHeight={true}`
- Use standard structure pattern

#### 11. FriendMenu
**Changes Needed**:
- Ensure `autoHeight={true}`
- Use standard structure pattern

### Phase 4: Refactor Modal Components

#### 12. DeleteConfirmModal
**Changes Needed**:
- Ensure `autoHeight={true}`
- Use standard structure pattern

#### 13. PasswordVerificationModal
**Changes Needed**:
- Replace `TextInput` with `BottomSheetTextInput`
- Ensure `autoHeight={true}`
- Use standard structure pattern

#### 14. IdentityVerificationModal
**Changes Needed**:
- Replace `TextInput` with `BottomSheetTextInput`
- Ensure `autoHeight={true}`
- Use standard structure pattern

### Phase 5: Update App Files

#### 15. wishlist/[id].tsx
**Changes Needed**:
- Replace inline "Members" sheet with `MembersSheet` component
- Replace inline "Select Wishlist" sheet with `SelectWishlistSheet` component
- Wrap all sheets in Fragment (`<>...</>`) if multiple sheets
- Ensure proper stacking

#### 16. friends.tsx, friends/all.tsx, friends/[id].tsx
**Changes Needed**:
- Refactor inline "Birthday Gift Choice" sheets
- Use `autoHeight={true}`
- Use standard structure pattern
- Consider if they should be separate components (probably fine as inline for now)

#### 17. create-profile.tsx
**Changes Needed**:
- Refactor "Language Picker" sheet
- Use `BottomSheetFlatList` for language list
- Use `autoHeight={true}`
- Use standard structure pattern

### Phase 6: Cleanup

#### 18. AddByLinkSheet
**Changes Needed**:
- Remove test stacking sheet code
- Keep only the actual "Add by Link" functionality

## Implementation Order

1. **Create reusable components first** (SelectFriendsSheet, MembersSheet, SelectWishlistSheet)
2. **Refactor sheets that use these reusable components** (CreateWishlistSheet, EditWishlistSheet, CreateGroupGiftSheet, wishlist/[id].tsx)
3. **Refactor remaining sheets** (AddItemSheet, SortWishlistSheet, Menus, Modals)
4. **Update app files** (friends screens, create-profile)
5. **Cleanup** (AddByLinkSheet test code)

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
- Multiple sheets in same component must be wrapped in Fragment (`<>...</>`) to be siblings
- Always use `BottomSheetScrollView`, `BottomSheetFlatList`, `BottomSheetTextInput` instead of native components
- Use `autoHeight={true}` for dynamic sizing (most common case)
- Use `useSafeAreaInsets` for bottom padding calculations


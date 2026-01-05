# Page Header & Layout Standardization Plan

## Overview
**IMPORTANT**: This plan is NOT about fixing or refactoring existing headers. We will create a **brand new custom header component** from scratch that will be used on all pages going forward.

**Goal**: Create a brand new unified header component that handles both main pages (tab screens without back button) and detail pages (stack screens with back button). This new component will replace all existing header implementations (current PageHeader, native headers, custom implementations) and become the standard for all pages.

## Header Types (Simplified)

### Type 1: Main Pages (Tab Screens - NO Back Button)
**Examples**:
- Wishlists (main tab)
- Friends (main tab) 
- Discover (main tab)
- Settings (main tab)

**Characteristics**:
- No back button (chevron left)
- Can have right-side action buttons (three dot menu, trash all, etc.)
- Uses custom header component

### Type 2: Detail Pages (Stack Screens - WITH Back Button)
**Examples**:
- Profile page (from settings)
- Wishlist details page
- All friends page
- Appearance page
- My profile page (edit profile)
- Notifications page

**Characteristics**:
- Has back button (chevron left) that navigates to previous page
- Can have right-side action buttons (three dot menu, trash all, etc.)
- Currently uses native headers, but should use unified component

### Excluded Pages
- Create profile page/funnel (auth flow) - **DO NOT TOUCH**
- Other auth/onboarding pages

## New Unified Header Component

### Component Design
**ACTION**: Create a **brand new component** (not refactoring existing PageHeader)

**Component Name**: `StandardPageHeader` (or `UnifiedPageHeader` - TBD)
**Location**: `apps/mobile/src/components/StandardPageHeader.tsx` (new file)

**This is a fresh start** - We're building a new component from scratch that will:
- Handle both main pages (no back button) and detail pages (with back button)
- Support title and multiple right action buttons
- Have consistent spacing, padding, and alignment
- Handle safe area insets (dynamic island/notch) automatically
- Be the single source of truth for all page headers

**Props** (to be designed):
- `title` (string) - Required: The page title text
- `backButton` (boolean) - Optional: Show/hide back button (default: `true`)
- `rightActions` (ReactNode) - Optional: Right-side action buttons (can be multiple)
- `onBack` (function) - Optional: Custom back handler (default: uses `router.back()`)

**Features**:
- Handles consistent spacing, padding, and alignment for both types
- Uses the same visual styling regardless of back button presence
- Automatically handles safe area insets (dynamic island/notch)
- Supports multiple right action buttons (three dot menu, trash all, etc.)

### Standards

#### Spacing
- **Top Padding**: `Math.max(40, Platform.OS === "ios" ? insets.top + 16 : insets.top + 24)`
- **Horizontal Padding**: `spacing.md` (16px) on both sides
- **Title Margin**: `spacing.xs` (4px) after back button if present, otherwise `0`
- **Bottom Padding**: `spacing.md` (16px)
- **Title Alignment**: Left-aligned
- **Right Actions Alignment**: Right-aligned, same row as title

#### Visual Elements
- **Back Button** (if present): `chevron-left` icon (24px)
- **Title**: Left-aligned, consistent font size and weight
- **Right Actions**: Right-aligned, can include multiple buttons (three dot menu, trash all, etc.)
- **Spacing Between Right Actions**: `spacing.xs` (4px) between buttons

## Current State Analysis

### Pages Using PageHeader Component (Current Implementation)
**These will be replaced with the new StandardPageHeader component**:
1. **`app/(tabs)/index.tsx`** (Wishlists) - Currently uses PageHeader, `backButton={false}` - **WILL BE REPLACED**
2. **`app/(tabs)/discover.tsx`** (Discover) - Currently uses PageHeader, `backButton={false}` - **WILL BE REPLACED**
3. **`app/(tabs)/settings.tsx`** (Settings) - Currently uses PageHeader, `backButton={false}`, ⚠️ Has paddingTop in contentContainer - **WILL BE REPLACED**
4. **`app/(tabs)/profile.tsx`** (Profile) - Currently uses PageHeader, `backButton={true}` - **WILL BE REPLACED**

### Pages Using Native Headers (getHeaderOptions)
**These will be replaced with the new StandardPageHeader component**:
1. **`app/notifications/index.tsx`** - Currently uses native header, has back button - **WILL BE REPLACED**
2. **`app/appearance.tsx`** - Currently uses native header, has back button - **WILL BE REPLACED**
3. **`app/profile/edit.tsx`** - Currently uses native header, has back button - **WILL BE REPLACED**
4. **`app/wishlist/[id].tsx`** - Currently uses native header, has back button - **WILL BE REPLACED**
5. **`app/friends/[id].tsx`** - Currently uses native header, has back button - **WILL BE REPLACED**
6. **`app/friends/all.tsx`** - Currently uses native header, has back button - **WILL BE REPLACED**
7. **`app/friends/birthdays.tsx`** - Currently uses native header, has back button - **WILL BE REPLACED**
8. **`app/friends/search.tsx`** - Currently uses native header, has back button - **WILL BE REPLACED**
9. **`app/wishlist/[id]/add-item.tsx`** - Currently uses native header - **WILL BE REPLACED**
10. **`app/wishlist/[id]/edit.tsx`** - Currently uses native header - **WILL BE REPLACED**
11. **`app/wishlist/create.tsx`** - Currently uses native header - **WILL BE REPLACED**

### Pages Using Custom Headers
**These will be replaced with the new StandardPageHeader component**:
1. **`app/(tabs)/friends.tsx`** - Custom header implementation, `backButton={false}` - **WILL BE REPLACED**

### Excluded Pages (DO NOT TOUCH)
- `app/(auth)/create-profile.tsx` - Auth flow, perfect as-is
- All other auth/onboarding pages

## Implementation Strategy

### Phase 1: Create New Unified Component

#### 1. Design and Create StandardPageHeader Component
**Status**: Pending
**Location**: `apps/mobile/src/components/StandardPageHeader.tsx` (NEW FILE)
**Tasks**:
- Design the component API (props, structure)
- Create new component file from scratch
- Implement support for both `backButton={true}` and `backButton={false}`
- Implement consistent spacing, padding, and alignment
- Implement safe area insets handling
- Support multiple right action buttons
- Ensure spacing between right action buttons is correct (`spacing.xs`)
- Document the component API

**Note**: This is a NEW component. We are NOT modifying or using the existing `PageHeader` component. We're starting fresh.

### Phase 2: Fix Content Container Issues

#### 2. Audit All Content Containers
**Status**: Pending
**Tasks**:
- Check all pages for `paddingTop` in contentContainer
- Remove any `paddingTop` - new header component will handle its own spacing
- Ensure consistent horizontal padding (`paddingHorizontal: spacing.md`)
- Fix Settings page: Change `padding: 16` to `paddingHorizontal: 16, paddingBottom: 16`

### Phase 3: Refactor Custom Headers

#### 4. Replace Friends Tab Custom Header
**Status**: Pending
**Location**: `app/(tabs)/friends.tsx`
**Current**: Custom header implementation with manual spacing
**Target**: Use new `StandardPageHeader` component
**Changes**:
- Replace custom header with `<StandardPageHeader backButton={false} title="Friends" rightActions={...} />`
- Remove manual `headerTopPadding` calculation
- Remove custom header styles
- Ensure search functionality works (use `rightActions` for search icon)

### Phase 4: Replace Existing Headers with New Component

#### 5. Replace Notifications Page Header
**Status**: Pending
**Location**: `app/notifications/index.tsx`
**Current**: Uses native header via `getHeaderOptions`
**Target**: Use new `StandardPageHeader` component
**Changes**:
- Remove `useLayoutEffect` with `getHeaderOptions`
- Remove `notifications/_layout.tsx` (Stack wrapper) if no longer needed
- Replace with `<StandardPageHeader backButton={true} title="Notifications" rightActions={...} />`
- Verify back navigation works correctly

#### 6. Replace Appearance Page Header
**Status**: Pending
**Location**: `app/appearance.tsx`
**Current**: Uses native header via `getHeaderOptions`
**Target**: Use new `StandardPageHeader` component
**Changes**:
- Remove `useLayoutEffect` with `getHeaderOptions`
- Add `<StandardPageHeader backButton={true} title="Appearance" />`
- Remove manual paddingTop from ScrollView (handle in new component)

#### 7. Replace Profile Edit Page Header
**Status**: Pending
**Location**: `app/profile/edit.tsx`
**Current**: Uses native header via `getHeaderOptions`
**Target**: Use new `StandardPageHeader` component
**Changes**:
- Remove `useLayoutEffect` with `getHeaderOptions`
- Add `<StandardPageHeader backButton={true} title="Edit Profile" rightActions={...} />` (if has actions)

#### 8. Replace Wishlist Details Page Header
**Status**: Pending
**Location**: `app/wishlist/[id].tsx`
**Current**: Uses native header via `getHeaderOptions`
**Target**: Use new `StandardPageHeader` component
**Changes**:
- Remove `useLayoutEffect` with `getHeaderOptions`
- Add `<StandardPageHeader backButton={true} title={wishlist.title} rightActions={...} />`
- Verify right actions (three dot menu) work correctly

#### 9. Replace Friend Profile Page Header
**Status**: Pending
**Location**: `app/friends/[id].tsx`
**Current**: Uses native header via `getHeaderOptions`
**Target**: Use new `StandardPageHeader` component
**Changes**:
- Remove `useLayoutEffect` with `getHeaderOptions`
- Add `<StandardPageHeader backButton={true} title={user.name} rightActions={...} />`
- Verify right actions work correctly

#### 10. Replace All Friends Page Header
**Status**: Pending
**Location**: `app/friends/all.tsx`
**Current**: Uses native header via `getHeaderOptions`
**Target**: Use new `StandardPageHeader` component
**Changes**:
- Remove `useLayoutEffect` with `getHeaderOptions`
- Add `<StandardPageHeader backButton={true} title="All Friends" />`

#### 11. Replace Friends Birthdays Page Header
**Status**: Pending
**Location**: `app/friends/birthdays.tsx`
**Current**: Uses native header via `getHeaderOptions`
**Target**: Use new `StandardPageHeader` component
**Changes**:
- Remove `useLayoutEffect` with `getHeaderOptions`
- Add `<StandardPageHeader backButton={true} title="Birthdays" />`

#### 12. Replace Friends Search Page Header
**Status**: Pending
**Location**: `app/friends/search.tsx`
**Current**: Uses native header via `getHeaderOptions`
**Target**: Use new `StandardPageHeader` component
**Changes**:
- Remove `useLayoutEffect` with `getHeaderOptions`
- Add `<StandardPageHeader backButton={true} title="Search Friends" />`

#### 13. Replace Other Wishlist Page Headers
**Status**: Pending
**Locations**: 
- `app/wishlist/[id]/add-item.tsx`
- `app/wishlist/[id]/edit.tsx`
- `app/wishlist/create.tsx`
**Tasks**:
- Verify which use native headers
- Replace with new `StandardPageHeader` component
- Add appropriate `backButton={true}` and `title` props

### Phase 5: Cleanup

#### 14. Remove Native Header Infrastructure (Optional)
**Status**: Future Consideration
**Decision**: After all pages are replaced with the new component, consider if `getHeaderOptions` and native header configs are still needed
**Note**: Keep native header code if there are edge cases or if we want to maintain the option

#### 15. Remove Layout Wrappers (If Needed)
**Status**: Pending
**Tasks**:
- Remove `app/notifications/_layout.tsx` if no longer needed
- Check for other layout files that only exist for native headers
- Remove if redundant

## Implementation Order

1. **Phase 1**: Create new `StandardPageHeader` component from scratch
2. **Phase 2**: Fix content container padding issues (audit all pages - remove paddingTop)
3. **Phase 3**: Replace Friends tab custom header with new component
4. **Phase 4**: Replace all existing headers (native headers and current PageHeader) with new component, one by one:
   - Start with simpler pages (Appearance, All Friends, Birthdays, Settings, Discover, Wishlists)
   - Then medium complexity (Notifications, Profile Edit, Profile)
   - Finally complex pages (Wishlist Details, Friend Profile)
5. **Phase 5**: Cleanup unused code (old PageHeader component, native header infrastructure)

## Standard Page Layout Template

### Template for Pages WITH Back Button
```tsx
import { StandardPageHeader } from "@/components/StandardPageHeader";

export default function DetailPage() {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StandardPageHeader
        title="Page Title"
        backButton={true}
        rightActions={
          <HeaderButtons
            buttons={[
              { icon: "more-vertical", onPress: handleMenu },
              { icon: "trash-2", onPress: handleDelete },
            ]}
          />
        }
      />
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={...} // optional
      >
        {/* Content */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16, // NO paddingTop
    paddingBottom: 16,
  },
});
```

### Template for Pages WITHOUT Back Button (Tab Screens)
```tsx
import { StandardPageHeader } from "@/components/StandardPageHeader";

export default function MainPage() {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StandardPageHeader
        title="Page Title"
        backButton={false}
        rightActions={
          <HeaderButtons
            buttons={[
              { icon: "more-vertical", onPress: handleMenu },
              { icon: "bell", onPress: handleNotifications },
            ]}
          />
        }
      />
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={...} // optional
      >
        {/* Content */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16, // NO paddingTop
    paddingBottom: 16,
  },
});
```

## Testing Checklist

For each page updated with the new StandardPageHeader component:
- [ ] Header spacing matches other pages (consistent top padding)
- [ ] Title alignment is correct (left-aligned)
- [ ] Back button (if present) spacing and functionality is correct
- [ ] Right actions (if present) spacing is correct and functional
- [ ] Content container has NO paddingTop
- [ ] Content container has consistent horizontal padding (16px)
- [ ] Safe area insets are handled correctly (dynamic island/notch)
- [ ] Scrolling works correctly
- [ ] Pull-to-refresh works (if applicable)
- [ ] Back navigation works correctly (for pages with backButton={true})
- [ ] No visual regressions
- [ ] All action buttons (three dot menu, trash, etc.) work correctly

## Notes

- **NEW Component**: We are creating a BRAND NEW `StandardPageHeader` component from scratch
- **NOT Refactoring**: We are NOT fixing or modifying existing headers - we're replacing them with the new component
- **Unified Component**: The new `StandardPageHeader` component will be used for ALL pages (both with and without back button)
- **Back Button Logic**: Set `backButton={true}` for detail pages, `backButton={false}` for main/tab pages
- **Right Actions**: Both types of pages can have right-side action buttons (multiple buttons supported)
- **Content Container**: Never use `paddingTop` - new header component handles its own spacing
- **Safe Area**: New header component handles safe area insets automatically
- **Navigation**: For pages with `backButton={true}`, new header component uses `router.back()` by default
- **Excluded Pages**: Do not modify auth/onboarding pages (create-profile, etc.)

## Benefits of Unified Approach

1. **Consistency**: All headers look and behave the same across the entire app
2. **Maintainability**: One component to maintain instead of multiple approaches (native headers, custom headers, etc.)
3. **Flexibility**: Easy to add new pages following the same clear pattern
4. **Visual Alignment**: Guaranteed consistent spacing and alignment - no more inconsistencies
5. **Code Reduction**: Remove native header configuration code (`getHeaderOptions`, `useLayoutEffect` patterns)
6. **Simplicity**: Clear pattern - just use `<StandardPageHeader />` with appropriate props
7. **Developer Experience**: Single source of truth for header styling and behavior
8. **Testing**: Easier to test - one component vs. multiple implementations

## Summary

This project will:
- **Create a brand new `StandardPageHeader` component** from scratch (NOT modifying existing code)
- Replace ALL existing headers (native headers, current PageHeader, custom headers) with the new component
- Standardize all page headers to use the single new unified component
- Remove inconsistencies in spacing, padding, and alignment
- Simplify the codebase by removing duplicate header code
- Make it easier to add new pages with consistent headers

**Total Pages to Update**: ~15 pages
- 4 pages currently using `PageHeader` component (will be replaced)
- 11 pages using native headers (will be replaced)
- 1 page using custom header (Friends tab - will be replaced)

**Estimated Effort**: Medium - Creating the new component first, then replacing headers page by page. Most pages are straightforward, but some complex pages (Wishlist Details, Friend Profile) require careful migration of right actions.

**Key Principle**: We're NOT fixing existing headers - we're creating a new component and replacing all existing implementations with it.

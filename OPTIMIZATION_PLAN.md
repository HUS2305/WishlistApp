# Performance Optimization Plan

**Goal**: Reduce page loading delays from 1-3 seconds to 0ms (cached) / 200-500ms (fresh)

**Timeline**: ~2-3 hours total  
**Expected Impact**: 80-100% reduction in delays for cached pages

---

## Overview

This plan covers optimization of all relevant pages with content. The strategy is:
1. **Migrate to React Query** for pages using `useState + useFocusEffect`
2. **Add caching configuration** (`staleTime` and `gcTime`) to existing React Query hooks
3. **Optimize API calls** (parallelize, reduce redundant calls)

---

## Pages to Optimize

### Priority 1: High-Traffic Pages (Most Important)
1. ✅ **Wishlists List Page** (`app/(tabs)/index.tsx`) - Main screen
2. ✅ **Individual Wishlist Page** (`app/wishlist/[id].tsx`) - Detail view
3. ✅ **Friends Page** (`app/(tabs)/friends.tsx`) - Main friends screen

### Priority 2: Secondary Pages
4. ✅ **All Friends Page** (`app/friends/all.tsx`)
5. ✅ **Friend Profile Page** (`app/friends/[id].tsx`)
6. ✅ **Profile Page** (`app/(tabs)/profile.tsx`) - **COMPLETED**

### Priority 3: Less Critical Pages
7. ⚠️ **Discover Page** (`app/(tabs)/discover.tsx`) - No content currently (skip for now)
8. ⚠️ **Notifications Page** (`app/notifications/index.tsx`) - Check if used

---

## Phase 1: Quick Wins (20-30 minutes) ⚡

### Task 1.1: Add Caching to React Query Hooks (15 minutes)

**File**: `apps/mobile/src/hooks/useWishlists.ts`

**Current State**: React Query hooks exist but have NO `staleTime` configured

**Changes**:
```typescript
// Add staleTime and gcTime to all hooks:
export function useWishlists() {
  return useQuery({
    queryKey: wishlistKeys.lists(),
    queryFn: () => wishlistsService.getWishlists(),
    enabled: isAuthLoaded,
    staleTime: 30 * 1000, // ✅ NEW: Consider fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // ✅ NEW: Keep in cache for 5 minutes
  });
}

export function useWishlist(id: string) {
  return useQuery({
    queryKey: wishlistKeys.detail(id),
    queryFn: () => wishlistsService.getWishlist(id),
    enabled: !!id && isAuthLoaded,
    staleTime: 30 * 1000, // ✅ NEW
    gcTime: 5 * 60 * 1000, // ✅ NEW
  });
}

export function useWishlistItems(wishlistId: string) {
  return useQuery({
    queryKey: wishlistKeys.items(wishlistId),
    queryFn: () => wishlistsService.getWishlistItems(wishlistId),
    enabled: !!wishlistId && isAuthLoaded,
    staleTime: 30 * 1000, // ✅ NEW
    gcTime: 5 * 60 * 1000, // ✅ NEW
  });
}
```

**Impact**: Individual wishlist pages will stop refetching on every navigation

---

### Task 1.2: Migrate Wishlists List Page to React Query (5 minutes)

**File**: `apps/mobile/app/(tabs)/index.tsx`

**Current State**: Uses `useState + useFocusEffect`, always fetches fresh data

**Changes**:
1. Remove `useState` for wishlists
2. Remove `fetchWishlists` function
3. Remove `useFocusEffect` that fetches data
4. Import and use `useWishlists()` hook

**Before**:
```typescript
const [wishlists, setWishlists] = useState<Wishlist[]>([]);
const fetchWishlists = useCallback(async (showLoader = true) => {
  // ... manual fetching logic
}, []);
useFocusEffect(() => {
  fetchWishlists(false);
});
```

**After**:
```typescript
import { useWishlists } from '@/hooks/useWishlists';

const { data: wishlists = [], isLoading, refetch } = useWishlists();

// Keep useFocusEffect only for notifications
useFocusEffect(() => {
  refreshUnreadNotificationsCount();
  refreshPendingRequestsCount();
});
```

**Impact**: Wishlists list page will cache data and show instantly on return visits

---

### Task 1.3: Cache /users/me Call in Individual Wishlist Page (10 minutes)

**File**: `app/wishlist/[id].tsx`

**Current State**: Makes `/users/me` API call in `useEffect` on every mount

**Changes**:
1. Create `hooks/useCurrentUser.ts` hook
2. Replace `useEffect` + `useState` with React Query hook

**Create New File**: `apps/mobile/src/hooks/useCurrentUser.ts`
```typescript
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import api from '@/services/api';
import type { User } from '@/types';

export function useCurrentUser() {
  const { isLoaded, isSignedIn } = useAuth();
  
  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const response = await api.get<User>('/users/me');
      return response.data;
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}
```

**Update**: `app/wishlist/[id].tsx`
```typescript
import { useCurrentUser } from '@/hooks/useCurrentUser';

// Replace useEffect + useState
const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
```

**Impact**: Eliminates redundant `/users/me` calls across all pages using this hook

---

## Phase 2: Friends Pages (30-45 minutes)

### Task 2.1: Create Friends React Query Hooks (15 minutes)

**Create New File**: `apps/mobile/src/hooks/useFriends.ts`
```typescript
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import { friendsService, type FriendRequest } from '@/services/friends';
import type { User } from '@/types';

export const friendKeys = {
  all: ['friends'] as const,
  lists: () => [...friendKeys.all, 'list'] as const,
  list: () => [...friendKeys.lists()] as const,
  requests: () => [...friendKeys.all, 'requests'] as const,
  pending: () => [...friendKeys.requests(), 'pending'] as const,
  sent: () => [...friendKeys.requests(), 'sent'] as const,
  detail: (id: string) => [...friendKeys.all, 'detail', id] as const,
};

export function useFriends() {
  const { isLoaded, isSignedIn } = useAuth();
  
  return useQuery({
    queryKey: friendKeys.list(),
    queryFn: () => friendsService.getFriends(),
    enabled: isLoaded && isSignedIn,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePendingRequests() {
  const { isLoaded, isSignedIn } = useAuth();
  
  return useQuery({
    queryKey: friendKeys.pending(),
    queryFn: () => friendsService.getPendingRequests(),
    enabled: isLoaded && isSignedIn,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useSentRequests() {
  const { isLoaded, isSignedIn } = useAuth();
  
  return useQuery({
    queryKey: friendKeys.sent(),
    queryFn: () => friendsService.getSentRequests(),
    enabled: isLoaded && isSignedIn,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useFriendProfile(id: string) {
  const { isLoaded, isSignedIn } = useAuth();
  
  return useQuery({
    queryKey: friendKeys.detail(id),
    queryFn: () => friendsService.getFriendProfile(id),
    enabled: !!id && isLoaded && isSignedIn,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
```

---

### Task 2.2: Migrate Friends Page to React Query (15 minutes)

**File**: `app/(tabs)/friends.tsx`

**Current State**: Uses `useState + useFocusEffect`, makes 3 parallel API calls

**Changes**:
```typescript
import { useFriends, usePendingRequests, useSentRequests } from '@/hooks/useFriends';

// Replace useState declarations
const { data: friends = [], isLoading: isLoadingFriends } = useFriends();
const { data: pendingRequests = [] } = usePendingRequests();
const { data: sentRequests = [] } = useSentRequests();

// Remove fetchData function
// Remove useFocusEffect that fetches data
// Keep useFocusEffect only for search state management
```

**Impact**: Friends page will cache data and show instantly on return visits

---

### Task 2.3: Migrate All Friends Page to React Query (10 minutes)

**File**: `app/friends/all.tsx`

**Changes**: Similar to Task 2.2, use `useFriends()` hook

---

### Task 2.4: Migrate Friend Profile Page to React Query (10 minutes)

**File**: `app/friends/[id].tsx`

**Changes**: Use `useFriendProfile(id)` hook instead of `useState + useEffect`

---

## Phase 3: Profile Page (10-15 minutes)

### Task 3.1: Migrate Profile Page to React Query (10 minutes)

**File**: `app/(tabs)/profile.tsx`

**Current State**: Uses `useState + useEffect` to fetch `/users/me`

**Changes**:
```typescript
import { useCurrentUser } from '@/hooks/useCurrentUser';

// Replace useState + useEffect
const { data: userProfile, isLoading: isLoadingProfile } = useCurrentUser();
```

**Impact**: Profile page will cache user data and reduce redundant calls

---

## Phase 4: Additional Optimizations (Optional, 15-30 minutes)

### Task 4.1: Add Request Timeout to API (5 minutes)

**File**: `apps/mobile/src/services/api.ts`

**Changes**:
```typescript
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, // ✅ NEW: 10 seconds timeout
  headers: {
    "Content-Type": "application/json",
  },
});
```

**Impact**: Prevents hanging requests if server is slow

---

### Task 4.2: Review and Optimize Notification Hooks (10 minutes)

**Check**: `apps/mobile/src/contexts/NotificationContext.tsx`

**Goal**: Ensure notification refresh functions use React Query properly

---

### Task 4.3: Optimize Discover Page (Skip for Now)

**File**: `app/(tabs)/discover.tsx`

**Status**: Page has no content currently - skip optimization

**Future Work**: When implementing, parallelize API calls (use `Promise.all`)

---

## Implementation Order

### Step 1: Phase 1 (Quick Wins) - 30 minutes ⚡
1. ✅ Add caching to `useWishlists.ts` hooks (15 min)
2. ✅ Migrate wishlists list page (5 min)
3. ✅ Create and use `useCurrentUser` hook (10 min)

**Expected Result**: 
- Wishlists pages: 0ms (cached) / 200-500ms (fresh)
- Individual wishlist pages: No redundant `/users/me` calls

### Step 2: Phase 2 (Friends Pages) - 45 minutes
4. ✅ Create friends hooks (15 min)
5. ✅ Migrate friends page (15 min)
6. ✅ Migrate all friends page (10 min)
7. ✅ Migrate friend profile page (10 min)

**Expected Result**: 
- Friends pages: 0ms (cached) / 200-500ms (fresh)

### Step 3: Phase 3 (Profile Page) - 10 minutes
8. ✅ Migrate profile page (10 min) - **COMPLETED**

**Expected Result**: 
- Profile page: 0ms (cached) / 200-500ms (fresh)

### Step 4: Phase 4 (Polish) - 15 minutes
9. ✅ Add request timeout (5 min) - **COMPLETED**
10. ✅ Review notification hooks (10 min) - **COMPLETED** (Current implementation is appropriate for badge counts)

---

## Testing Checklist

After each phase:

- [ ] Navigate to page after 5+ minutes (cold start) - should be 1-2 seconds
- [ ] Navigate to page within 30 seconds - should be **instant (0ms)** ⚡
- [ ] Navigate to page after 30 seconds but < 5 minutes - should be 200-500ms (fresh fetch)
- [ ] Pull to refresh works correctly
- [ ] Data updates correctly after mutations
- [ ] No console errors
- [ ] No duplicate API calls in network tab

---

## Expected Performance After Optimization

### Current Performance
- **Wishlists list page**: 200-500ms (always fetches)
- **Individual wishlist page**: 500-800ms (always refetches)
- **Friends page**: 300-600ms (always fetches)

### After Phase 1 (Quick Wins)
- **Wishlists list page** (cached): **0ms** ⚡
- **Wishlists list page** (fresh): 200-500ms
- **Individual wishlist page** (cached): **0ms** ⚡
- **Individual wishlist page** (fresh): 200-500ms
- **No redundant `/users/me` calls**

### After Phase 2 (Friends Pages)
- **Friends page** (cached): **0ms** ⚡
- **Friends page** (fresh): 200-500ms
- **All friends page** (cached): **0ms** ⚡
- **Friend profile page** (cached): **0ms** ⚡

### After Phase 3 (Profile Page)
- **Profile page** (cached): **0ms** ⚡
- **Profile page** (fresh): 200-500ms

### After Phase 4 (Additional Optimizations) ✅
- **API requests**: 10 second timeout prevents hanging requests
- **Notification hooks**: Reviewed - current implementation is appropriate for badge counts

### After All Phases ✅
- **Cached pages** (< 30 seconds): **0ms (instant)** ⚡
- **Fresh pages** (warm endpoint): **200-500ms**
- **Cold start** (endpoint suspended): **1-2 seconds** (unavoidable with Neon)
- **API requests**: 10 second timeout prevents hanging requests

---

## Notes

1. **Cache Times**: 
   - `staleTime: 30 * 1000` = Data considered fresh for 30 seconds (prevents refetch)
   - `gcTime: 5 * 60 * 1000` = Data kept in cache for 5 minutes (enables instant loading)

2. **React Query Benefits**:
   - Automatic caching
   - Stale-while-revalidate pattern (shows cached data immediately, refreshes in background)
   - Deduplication of requests
   - Background refetching
   - Error handling and retry logic

3. **Migration Pattern**:
   - Replace `useState` with `useQuery`
   - Remove manual `fetchData` functions
   - Remove `useFocusEffect` for data fetching (keep for other purposes)
   - Use `refetch()` for pull-to-refresh instead of manual fetching

4. **Breaking Changes**: None - all changes are internal optimizations

5. **Cold Starts**: Cannot be optimized (Neon database autosuspend is expected behavior)

---

## Success Metrics

- ✅ 80-100% reduction in loading time for cached pages
- ✅ 0ms load time for pages visited within 30 seconds
- ✅ 50% reduction in API calls (due to caching)
- ✅ Better user experience (instant navigation to recently visited pages)
- ✅ No functionality regressions


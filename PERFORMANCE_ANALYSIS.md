# App Performance Analysis - Page Loading Delays

**Issue**: 1-3 second loading delays when switching between pages not visited recently  
**Focus**: Wishlists List Page + Individual Wishlist Pages (actual content pages)  
**Status**: Partially Normal (Expected) + Optimization Opportunities

---

## Executive Summary

**Is 1-3 seconds normal?** 

**Partially yes** - some delay is expected, but 1-3 seconds suggests several factors are contributing:
1. ✅ **Expected**: Neon database cold starts (1-2 seconds when endpoint was suspended)
2. ⚠️ **Optimizable**: Wishlists list page NOT using React Query (always fetches fresh)
3. ⚠️ **Optimizable**: Individual wishlist pages have React Query but NO caching (staleTime)
4. ⚠️ **Optimizable**: Redundant `/users/me` API call on individual wishlist pages

**Current State**: Functional but not optimized  
**Recommended**: Optimize to reduce delays to 200-500ms for cached data, 500-1000ms for fresh data

---

## Root Causes Analysis

### 1. 🔵 **Neon Database Cold Starts** (Expected)

**Impact**: 1-2 seconds delay

**What's Happening:**
- Neon suspends your database endpoint after **5 minutes of inactivity** (autosuspend delay)
- When you navigate to a page after the endpoint was suspended, the **first request wakes it up**
- This "cold start" takes **1-2 seconds** (visible in your monitoring data - endpoint inactive periods)

**Evidence:**
- Your monitoring shows endpoint inactive from ~3:18 PM onwards
- When you navigate to a page after this period, first request is slower

**Status**: ✅ **Normal** - This is expected behavior with serverless databases  
**Solution**: Keep autosuspend enabled for cost savings (already configured correctly)

---

### 2. 🟡 **Sequential API Calls** (Optimizable)

**Impact**: 500ms - 2+ seconds (depending on number of friends/items)

**What's Happening:**
- **Discover Screen** (`discover.tsx`): Makes sequential API calls in a loop:
  ```typescript
  const friends = await friendsService.getFriends(); // 1 API call
  for (const friend of friends) {
    const wishlists = await friendsService.getFriendWishlists(friend.id); // N API calls
  }
  ```
- If you have 10 friends, that's **11 API calls** executed **sequentially** (not in parallel)
- Each API call takes ~200-500ms, so: 11 calls × 300ms = **~3.3 seconds**

**Status**: ⚠️ **Optimizable** - This is a performance bottleneck  
**Solution**: Parallelize API calls or optimize backend endpoint (see recommendations)

---

### 3. 🟡 **No Intelligent Caching** (Optimizable)

**Impact**: 200-500ms per API call (every time you navigate)

**What's Happening:**
- Most screens use `useState + useFocusEffect` instead of React Query
- **Every time** you navigate to a page, it fetches **fresh data** from the API
- Even if you just visited that page 30 seconds ago, it makes a new API call
- Only `useUserCurrency` uses React Query (which has caching)

**Current Pattern:**
```typescript
useFocusEffect(
  useCallback(() => {
    fetchData(false); // Always fetches, even if data is fresh
  }, [fetchData, hasLoadedOnce])
);
```

**Status**: ⚠️ **Optimizable** - Unnecessary API calls  
**Solution**: Implement React Query with proper cache times (see recommendations)

---

### 5. 🟡 **Multiple API Calls on Focus** (Minor Impact)

**Impact**: 200-500ms additional delay

**What's Happening:**
- **Wishlists Screen**: Makes multiple API calls on focus:
  - Fetches wishlists
  - `refreshUnreadNotificationsCount()` 
  - `refreshPendingRequestsCount()`

**Status**: ⚠️ **Minor Impact** - These are likely already optimized  
**Note**: The main issue is the wishlists fetch, which should use React Query

---

### 6. 🟢 **Network Latency** (Normal)

**Impact**: 100-300ms per API call

**What's Happening:**
- Each API call has network round-trip time
- Depends on your connection (local dev vs. production)
- Normal latency: 100-300ms per request

**Status**: ✅ **Normal** - Expected network behavior

---

## Performance Breakdown (Typical Flow)

### Scenario 1: Navigating to Wishlists List Screen (After 5+ Minutes)

1. **Cold Start** (if endpoint was suspended): 1-2 seconds
2. **API Call**: `/wishlists` - 200-500ms (always fetches, no caching)
3. **Additional Calls**: Notifications + Friend Requests - 200-500ms each
4. **Total**: **~1.5-3.5 seconds** ✅ Matches what you're experiencing

### Scenario 2: Navigating to Individual Wishlist Page (After 5+ Minutes)

1. **Cold Start**: 1-2 seconds
2. **API Call**: `/wishlists/${id}` - 200-500ms (always refetches, no staleTime)
3. **API Call**: `/wishlists/${id}/items` - 200-500ms (always refetches, no staleTime)
4. **API Call**: `/users/me` - 100-300ms (redundant, for ownership check)
5. **Total**: **~1.5-3.5 seconds** ✅ Matches what you're experiencing

### Scenario 3: Navigating to Recently Visited Screen (Within 5 Minutes)

1. **No Cold Start**: 0ms (endpoint is warm)
2. **API Call**: Still makes fresh API call (no caching/staleTime) - 200-500ms
3. **Total**: **~200-500ms** (faster, but still unnecessary with proper caching)

---

## What's Normal vs. What Should Be Improved

### ✅ **Normal / Expected**

1. **Cold starts (1-2 seconds)** - Expected with serverless databases
2. **Network latency (100-300ms)** - Normal API response times
3. **First-time loading (500ms-1s)** - Expected when fetching fresh data

### ⚠️ **Should Be Improved**

1. **Wishlists list page not using React Query** - Should use existing `useWishlists()` hook
2. **No staleTime in React Query hooks** - Should add staleTime/gcTime to prevent unnecessary refetches
3. **Redundant `/users/me` call** - Could be optimized (minor impact)
4. **Fresh fetch on every focus** - Should use stale-while-revalidate pattern (React Query default with staleTime)

---

## Recommendations

### 🚀 **High Priority (Quick Wins) - DO THESE FIRST**

#### 1. Use React Query Hook on Wishlists List Page ⚡ (5 minutes)

**Current (NOT using React Query):**
```typescript
// apps/mobile/app/(tabs)/index.tsx
const [wishlists, setWishlists] = useState<Wishlist[]>([]);
useFocusEffect(() => {
  fetchWishlists(false); // Always fetches, no caching
});
```

**Improved (Use existing hook!):**
```typescript
// apps/mobile/app/(tabs)/index.tsx
import { useWishlists } from '@/hooks/useWishlists';

const { data: wishlists = [], isLoading } = useWishlists();
// That's it! React Query handles caching automatically
```

**Expected Improvement**: 
- **Cached data**: 0ms (instant, no API call if data is fresh)
- **Fresh data**: 200-500ms (only when data is stale)

---

#### 2. Add staleTime to React Query Hooks ⚡ (15 minutes)

**Current (NO caching):**
```typescript
// apps/mobile/src/hooks/useWishlists.ts
export function useWishlist(id: string) {
  return useQuery({
    queryKey: wishlistKeys.detail(id),
    queryFn: () => wishlistsService.getWishlist(id),
    // ❌ NO staleTime - refetches on every mount/focus
  });
}
```

**Improved (Add caching):**
```typescript
export function useWishlist(id: string) {
  return useQuery({
    queryKey: wishlistKeys.detail(id),
    queryFn: () => wishlistsService.getWishlist(id),
    staleTime: 30 * 1000, // ✅ Consider fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // ✅ Keep in cache for 5 minutes
  });
}

export function useWishlistItems(wishlistId: string) {
  return useQuery({
    queryKey: wishlistKeys.items(wishlistId),
    queryFn: () => wishlistsService.getWishlistItems(wishlistId),
    staleTime: 30 * 1000, // ✅ Same caching strategy
    gcTime: 5 * 60 * 1000,
  });
}

export function useWishlists() {
  return useQuery({
    queryKey: wishlistKeys.lists(),
    queryFn: () => wishlistsService.getWishlists(),
    staleTime: 30 * 1000, // ✅ Same caching strategy
    gcTime: 5 * 60 * 1000,
  });
}
```

**Expected Improvement**: 
- **Cached data**: 0ms (instant, no API call if data is fresh)
- **Fresh data**: 200-500ms (only when data is stale)
- **Biggest impact**: Individual wishlist pages won't refetch on every navigation!

---

### 📊 **Medium Priority (Better UX)**

#### 3. Stale-While-Revalidate Pattern (Automatic with React Query)

**Concept**: Show cached data immediately, refresh in background

**Implementation**: React Query does this automatically when you add `staleTime`:
```typescript
const { data, isLoading, isFetching } = useQuery({
  queryKey: ['wishlists'],
  queryFn: () => wishlistsService.getWishlists(),
  staleTime: 30 * 1000,
  // ✅ Shows cached data immediately
  // ✅ Fetches fresh in background if stale
});
```

**Expected Improvement**: 
- User sees data **instantly** (cached)
- Fresh data loads in background (no blocking delay)
- **This happens automatically** once you add staleTime!

---

#### 4. Cache `/users/me` Call (Nice to Have)

**Current**: Individual wishlist pages make `/users/me` call on every mount

**Improved**: Create a React Query hook for user data:
```typescript
// Create hook: hooks/useCurrentUser.ts
export function useCurrentUser() {
  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.get('/users/me').then(r => r.data),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Use in wishlist/[id].tsx
const { data: currentUser } = useCurrentUser();
```

**Expected Improvement**: 
- Reduces redundant API calls
- **Minor impact** - nice to have, not critical

---

### 🔧 **Low Priority (Nice to Have)**

#### 5. Add Request Timeout (Already Good)

**Current**: No timeout configured

**Add to API config:**
```typescript
// apps/mobile/src/services/api.ts
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 seconds timeout
  headers: {
    "Content-Type": "application/json",
  },
});
```

**Benefit**: Prevents hanging requests if server is slow

---

#### 6. Add Loading Skeletons

**Current**: Loading spinner or blank screen

**Improved**: Show skeleton UI while loading

**Benefit**: Better perceived performance (users see content structure immediately)

---

## Implementation Priority

### Phase 1: Quick Wins (20 minutes) ⚡ DO THIS FIRST
1. ✅ **Use `useWishlists()` hook on wishlists list page** (5 min)
2. ✅ **Add staleTime to all React Query hooks** (15 min)

**Expected Result**: 
- **Cached pages**: 0ms (instant!)
- **Fresh pages**: 200-500ms (only when data is stale)
- **Reduce delays by 80-100%** for recently visited pages

### Phase 2: Additional Optimizations (Optional, 1-2 hours)
3. ✅ Cache `/users/me` call with React Query hook (30 min)
4. ✅ Add request timeout to API config (5 min)
5. ✅ Add loading skeletons for better UX (30-60 min)

**Expected Result**: Further polish and edge case improvements

---

## Expected Performance After Optimization

### Current Performance
- **Wishlists list page** (first visit, cold start): 1.5-3.5 seconds
- **Wishlists list page** (subsequent visits, warm): 200-500ms (always fetches)
- **Individual wishlist page** (first visit, cold start): 1.5-3.5 seconds
- **Individual wishlist page** (subsequent visits, warm): 500-800ms (always refetches)

### After Phase 1 (Quick Wins - 20 minutes) ⚡
- **Wishlists list page** (cached, < 30 seconds): **0ms (instant!)** ⚡
- **Wishlists list page** (fresh, > 30 seconds): 200-500ms
- **Wishlists list page** (cold start): 1-2 seconds (cold start + API call)
- **Individual wishlist page** (cached, < 30 seconds): **0ms (instant!)** ⚡
- **Individual wishlist page** (fresh, > 30 seconds): 200-500ms
- **Individual wishlist page** (cold start): 1-2 seconds (cold start + API call)

### After Phase 2 (Additional Optimizations)
- Same as Phase 1, plus:
- **No redundant `/users/me` calls** (cached for 5 minutes)
- Better error handling with timeouts
- Better UX with loading skeletons

---

## Testing Recommendations

1. **Measure Current Performance**:
   - Use React Native Performance Monitor
   - Log timing for each API call
   - Measure time from navigation to data display

2. **Test Scenarios**:
   - Navigate to page after 5+ minutes (cold start)
   - Navigate to page within 30 seconds (should be instant with caching)
   - Navigate to Discover screen with varying friend counts (5, 10, 20 friends)

3. **Monitor Improvements**:
   - Compare before/after metrics
   - Verify cache is working (check network tab - no requests for cached data)
   - Ensure stale-while-revalidate works (cached data shows immediately)

---

## Conclusion

**Is 1-3 seconds normal?** 

- ✅ **Yes** - for cold starts (expected with serverless databases)
- ⚠️ **Partially** - for warm endpoints with no caching (can be improved)
- ❌ **No** - for cached data (should be instant with proper caching)

**Root Causes:**
1. **Wishlists list page** - Not using React Query (you have the hook, just not using it!)
2. **Individual wishlist pages** - Using React Query but no staleTime (refetches every time)
3. **Cold starts** - Normal with Neon autosuspend (1-2 seconds, expected)

**Recommended Actions (20 minutes total!):**
1. **Fix #1**: Use `useWishlists()` hook on wishlists list page (5 min)
2. **Fix #2**: Add `staleTime` and `gcTime` to all React Query hooks (15 min)

**Expected Outcome After Quick Fixes**: 
- **Cached pages** (< 30 seconds old): **Instant (0ms)** ⚡
- **Fresh pages** (warm endpoint): **200-500ms**
- **Fresh pages** (cold start): **1-2 seconds** (only cold start delay)

**The good news**: These are **super easy fixes**! You already have React Query set up and working. You just need to:
1. Use the existing hook on the wishlists list page
2. Add cache times to your hooks

These two changes will eliminate 80-100% of the delays for recently visited pages!


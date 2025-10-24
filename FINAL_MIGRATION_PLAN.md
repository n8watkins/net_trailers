# Final Schema Migration Plan - VERIFIED & UPDATED

**Date:** 2025-10-10
**Strategy:** Fresh start - Delete all user data, deploy new schema
**Verified Issues:** See MIGRATION_VERIFICATION.md

---

## 📊 Schema Change Summary

### OLD Schema ❌

```typescript
{
  watchlist: Content[]
  ratings: UserRating[] { contentId, rating, timestamp, content }
  userLists: {
    lists: UserList[] (3 defaults + custom)
    defaultListIds: { watchlist, liked, disliked }
  }
}
```

### NEW Schema ✅

```typescript
{
  likedMovies: Content[]              // Replaces ratings where rating='liked'
  hiddenMovies: Content[]             // Replaces ratings where rating='disliked'
  defaultWatchlist: Content[]         // Replaces watchlist
  userCreatedWatchlists: UserList[]   // Custom lists only (empty by default)
}
```

---

## 🗂️ Complete File List: **31 Files**

### Phase 0: Deletion Scripts (2 NEW files)

1. `scripts/delete-all-user-data.ts` - Delete all Firestore user documents
2. Add localStorage cleanup to app init

### Phase 1: Type Definitions (4 files)

3. `atoms/authSessionAtom.ts` - Update `AuthPreferences` interface
4. `atoms/guestSessionAtom.ts` - Update `GuestPreferences` interface
5. `types/userData.ts` - Update `UserPreferences` interface
6. `types/userLists.ts` - Remove `defaultListIds`, simplify

### Phase 2: Storage Services (2 files)

7. `services/authStorageService.ts` - Remove migration, add liked/hidden methods
8. `services/guestStorageService.ts` - Same + add localStorage versioning

### Phase 3: Service Layer (2 files)

9. `services/userListsService.ts` - Remove default lists logic
10. `services/userDataService.ts` - Update to new schema

### Phase 4: Zustand Stores (2 files)

11. `stores/authStore.ts` - Replace ratings methods with liked/hidden
12. `stores/guestStore.ts` - Same as above

### Phase 5: Hooks (8 files)

13. `hooks/useRatings.ts` → Rename to `hooks/useLikedHidden.ts`
14. `hooks/useUserData.ts` - Update to expose new fields
15. `hooks/useAuthData.ts` - Update Recoil hook (legacy)
16. `hooks/useGuestData.ts` - Update Recoil hook (legacy)
17. `hooks/useSessionData.ts` - Update to use new store methods
18. `hooks/useSessionManager.ts` - Update if needed
19. `hooks/useWatchlist.ts` - Update to use `defaultWatchlist`
20. `hooks/useListsReadOnly.ts` - Update to use `userCreatedWatchlists`

### Phase 6: Components (4 files)

21. `components/LikeOptions.tsx` - Use `useLikedHidden()` hook
22. `components/SimpleLikeButton.tsx` - Same as above
23. `components/WatchLaterButton.tsx` - Use `defaultWatchlist`
24. `components/ContentMetadata.tsx` - Update if uses ratings

### Phase 7: Pages (1 file)

25. `pages/watchlists.tsx` - Create pseudo-UserList for defaults

### Phase 8: Utils (2 files)

26. `utils/contentFilter.ts` - Complete rewrite for `hiddenMovies`
27. `utils/csvExport.ts` - Update to export new fields

### Phase 9: Tests (4 files)

28. `scripts/test-user-watchlist.ts` - Update to use new methods
29. `test-persistence-flow.ts` - Update test data structure
30. `test-watchlist-flow.ts` - Same as above
31. Other test files as needed

---

## 🚀 Phase-by-Phase Implementation

### **Phase 0: Deletion Scripts** ⏱️ 20 min

**File 1:** `scripts/delete-all-user-data.ts`

```typescript
import './load-env'
import { db } from '../firebase'
import { collection, getDocs, deleteDoc } from 'firebase/firestore'

async function deleteAllUserData() {
    console.log('🗑️  Deleting all user data from Firestore...')

    const usersRef = collection(db, 'users')
    const snapshot = await getDocs(usersRef)

    let deleted = 0
    for (const doc of snapshot.docs) {
        await deleteDoc(doc.ref)
        console.log(`   Deleted: ${doc.id}`)
        deleted++
    }

    console.log(`✅ Deleted ${deleted} user documents`)
    console.log('⚠️  Firebase Auth users remain (will get new schema on login)')
}
```

**File 2:** Add to app initialization (e.g., `_app.tsx`)

```typescript
// Clear old guest localStorage on app init
useEffect(() => {
    // Clear old v1 guest data
    Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('guest_data_guest_') && !key.includes('_v2_')) {
            localStorage.removeItem(key)
            console.log('🧹 Cleared old guest data:', key)
        }
    })
}, [])
```

**npm script:**

```json
"delete-all-user-data": "npx tsx scripts/delete-all-user-data.ts"
```

---

### **Phase 1: Type Definitions** ⏱️ 20 min

**File 1:** `atoms/authSessionAtom.ts`

```typescript
// REMOVE
export interface AuthRating {
    contentId: number
    rating: 'liked' | 'disliked'
    timestamp: number
    content?: Content
}

// REPLACE
export interface AuthPreferences {
    likedMovies: Content[]
    hiddenMovies: Content[]
    defaultWatchlist: Content[]
    userCreatedWatchlists: UserList[]
    lastActive: number
}

export const defaultAuthSession: AuthSession = {
    userId: '',
    preferences: {
        likedMovies: [],
        hiddenMovies: [],
        defaultWatchlist: [],
        userCreatedWatchlists: [],
        lastActive: Date.now(),
    },
    isActive: false,
    lastSyncedAt: Date.now(),
}
```

**File 2:** `atoms/guestSessionAtom.ts` (same changes as above)

**File 3:** `types/userData.ts` (same changes)

**File 4:** `types/userLists.ts`

```typescript
// REMOVE defaultListIds interface
export interface UserListsState {
    lists: UserList[]
    defaultListIds: {
        // ❌ DELETE THIS
        watchlist: string
        liked: string
        disliked: string
    }
}

// Keep UserList interface as-is ✅
export interface UserList {
    id: string
    name: string
    description?: string
    items: Content[]
    isPublic: boolean
    createdAt: number
    updatedAt: number
    color?: string
    emoji?: string
}
```

---

### **Phase 2: Storage Services** ⏱️ 30 min

**File 1:** `services/authStorageService.ts`

**Remove these methods:**

```typescript
❌ addRating()
❌ removeRating()
❌ getRating()
❌ migrateOldPreferences()
❌ Any migration logic
```

**Add these methods:**

```typescript
static addLikedMovie(prefs: AuthPreferences, content: Content): AuthPreferences {
    // Remove from hidden if exists
    const hiddenMovies = prefs.hiddenMovies.filter(m => m.id !== content.id)
    // Add to liked if not already there
    const isAlreadyLiked = prefs.likedMovies.some(m => m.id === content.id)
    const likedMovies = isAlreadyLiked ? prefs.likedMovies : [...prefs.likedMovies, content]

    return { ...prefs, likedMovies, hiddenMovies }
}

static removeLikedMovie(prefs: AuthPreferences, contentId: number): AuthPreferences {
    return {
        ...prefs,
        likedMovies: prefs.likedMovies.filter(m => m.id !== contentId)
    }
}

static addHiddenMovie(prefs: AuthPreferences, content: Content): AuthPreferences {
    // Remove from liked if exists (mutual exclusion)
    const likedMovies = prefs.likedMovies.filter(m => m.id !== content.id)
    // Add to hidden if not already there
    const isAlreadyHidden = prefs.hiddenMovies.some(m => m.id === content.id)
    const hiddenMovies = isAlreadyHidden ? prefs.hiddenMovies : [...prefs.hiddenMovies, content]

    return { ...prefs, likedMovies, hiddenMovies }
}

static removeHiddenMovie(prefs: AuthPreferences, contentId: number): AuthPreferences {
    return {
        ...prefs,
        hiddenMovies: prefs.hiddenMovies.filter(m => m.id !== contentId)
    }
}

static isLiked(prefs: AuthPreferences, contentId: number): boolean {
    return prefs.likedMovies.some(m => m.id === contentId)
}

static isHidden(prefs: AuthPreferences, contentId: number): boolean {
    return prefs.hiddenMovies.some(m => m.id === contentId)
}
```

**Update loadUserData:**

```typescript
static async loadUserData(userId: string): Promise<AuthPreferences> {
    const userDoc = await getDoc(doc(db, 'users', userId))

    if (userDoc.exists()) {
        const data = userDoc.data()
        // NO MIGRATION - just return new schema
        return {
            likedMovies: data.likedMovies || [],
            hiddenMovies: data.hiddenMovies || [],
            defaultWatchlist: data.defaultWatchlist || [],
            userCreatedWatchlists: data.userCreatedWatchlists || [],
            lastActive: data.lastActive || Date.now()
        }
    }

    // New user - return empty defaults
    return {
        likedMovies: [],
        hiddenMovies: [],
        defaultWatchlist: [],
        userCreatedWatchlists: [],
        lastActive: Date.now()
    }
}
```

**File 2:** `services/guestStorageService.ts`

**Same changes as authStorageService PLUS add versioning:**

```typescript
const STORAGE_VERSION = 2
const STORAGE_KEY_PREFIX = `guest_data_v${STORAGE_VERSION}`

static saveGuestData(guestId: string, preferences: GuestPreferences): void {
    const key = `${STORAGE_KEY_PREFIX}_${guestId}`
    const data = JSON.stringify(preferences)
    localStorage.setItem(key, data)
}

static loadGuestData(guestId: string): GuestPreferences {
    const key = `${STORAGE_KEY_PREFIX}_${guestId}`
    const data = localStorage.getItem(key)

    if (data) {
        try {
            const parsed = JSON.parse(data)
            return {
                likedMovies: parsed.likedMovies || [],
                hiddenMovies: parsed.hiddenMovies || [],
                defaultWatchlist: parsed.defaultWatchlist || [],
                userCreatedWatchlists: parsed.userCreatedWatchlists || [],
                lastActive: parsed.lastActive || Date.now()
            }
        } catch (error) {
            console.error('Failed to parse guest data:', error)
        }
    }

    // Return defaults
    return {
        likedMovies: [],
        hiddenMovies: [],
        defaultWatchlist: [],
        userCreatedWatchlists: [],
        lastActive: Date.now()
    }
}
```

---

### **Phase 3: Service Layer** ⏱️ 15 min

**File 1:** `services/userListsService.ts`

**Remove:**

```typescript
❌ initializeDefaultLists()
❌ migrateOldPreferences()
❌ getDefaultLists() - or simplify to return empty
```

**Simplify getCustomLists:**

```typescript
// OLD
static getCustomLists(prefs: { userLists: UserListsState }): UserList[] {
    return prefs.userLists.lists.filter(
        list => !Object.values(prefs.userLists.defaultListIds).includes(list.id)
    )
}

// NEW - all lists are custom now!
static getCustomLists(prefs: { userCreatedWatchlists: UserList[] }): UserList[] {
    return prefs.userCreatedWatchlists
}
```

**Update all method signatures:**

```typescript
// Update createList, updateList, deleteList, addToList, removeFromList
// to use userCreatedWatchlists instead of userLists.lists
```

**File 2:** `services/userDataService.ts` - Update similarly

---

### **Phase 4: Zustand Stores** ⏱️ 30 min

**Both files:** `stores/authStore.ts` and `stores/guestStore.ts`

**Update state interface:**

```typescript
export interface AuthState {
    userId?: string
    likedMovies: Content[]
    hiddenMovies: Content[]
    defaultWatchlist: Content[]
    userCreatedWatchlists: UserList[]
    syncStatus: 'synced' | 'syncing' | 'offline'
    lastActive: number

    // Methods
    addLikedMovie: (content: Content) => Promise<void>
    removeLikedMovie: (contentId: number) => Promise<void>
    addHiddenMovie: (content: Content) => Promise<void>
    removeHiddenMovie: (contentId: number) => Promise<void>
    isLiked: (contentId: number) => boolean
    isHidden: (contentId: number) => boolean
    // ... rest of methods
}
```

**Remove methods:**

```typescript
❌ addRating()
❌ removeRating()
```

**Add methods:**

```typescript
addLikedMovie: async (content: Content) => {
    const state = get()

    // Mutual exclusion: remove from hidden
    const updatedHidden = state.hiddenMovies.filter((m) => m.id !== content.id)

    // Add to liked if not already there
    const isAlreadyLiked = state.likedMovies.some((m) => m.id === content.id)
    if (isAlreadyLiked) return

    const updatedLiked = [...state.likedMovies, content]

    set({
        likedMovies: updatedLiked,
        hiddenMovies: updatedHidden,
        syncStatus: 'syncing',
    })

    // Save to Firebase
    if (state.userId) {
        await AuthStorageService.saveUserData(state.userId, {
            likedMovies: updatedLiked,
            hiddenMovies: updatedHidden,
            defaultWatchlist: state.defaultWatchlist,
            userCreatedWatchlists: state.userCreatedWatchlists,
            lastActive: Date.now(),
        })
        set({ syncStatus: 'synced' })
    }
}

// Similar for addHiddenMovie, removeLikedMovie, removeHiddenMovie
```

**Update list methods to use `userCreatedWatchlists`:**

```typescript
createList: async (name: string) => {
    const newList: UserList = {
        id: generateListId(),
        name,
        description: '',
        items: [],
        isPublic: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    }

    const state = get()
    const updated = [...state.userCreatedWatchlists, newList]
    set({ userCreatedWatchlists: updated })

    // Save to Firebase...
}
```

---

### **Phase 5: Hooks** ⏱️ 25 min

**File 1:** Rename `hooks/useRatings.ts` → `hooks/useLikedHidden.ts`

```typescript
export const useLikedHidden = () => {
    const sessionType = useSessionStore((state) => state.sessionType)

    const authLiked = useAuthStore((state) => state.likedMovies)
    const authHidden = useAuthStore((state) => state.hiddenMovies)
    const authAddLiked = useAuthStore((state) => state.addLikedMovie)
    const authAddHidden = useAuthStore((state) => state.addHiddenMovie)
    const authRemoveLiked = useAuthStore((state) => state.removeLikedMovie)
    const authRemoveHidden = useAuthStore((state) => state.removeHiddenMovie)

    const guestLiked = useGuestStore((state) => state.likedMovies)
    const guestHidden = useGuestStore((state) => state.hiddenMovies)
    const guestAddLiked = useGuestStore((state) => state.addLikedMovie)
    const guestAddHidden = useGuestStore((state) => state.addHiddenMovie)
    const guestRemoveLiked = useGuestStore((state) => state.removeLikedMovie)
    const guestRemoveHidden = useGuestStore((state) => state.removeHiddenMovie)

    const isAuth = sessionType === 'authenticated'

    return {
        likedMovies: isAuth ? authLiked : guestLiked,
        hiddenMovies: isAuth ? authHidden : guestHidden,
        addLikedMovie: isAuth ? authAddLiked : guestAddLiked,
        addHiddenMovie: isAuth ? authAddHidden : guestAddHidden,
        removeLikedMovie: isAuth ? authRemoveLiked : guestRemoveLiked,
        removeHiddenMovie: isAuth ? authRemoveHidden : guestRemoveHidden,
        isLiked: (contentId: number) =>
            (isAuth ? authLiked : guestLiked).some((c) => c.id === contentId),
        isHidden: (contentId: number) =>
            (isAuth ? authHidden : guestHidden).some((c) => c.id === contentId),
    }
}
```

**Files 2-8:** Update useUserData, useAuthData, useGuestData, useSessionData, useSessionManager, useWatchlist, useListsReadOnly similarly

---

### **Phase 6: Components** ⏱️ 20 min

**File 1:** `components/LikeOptions.tsx`

```typescript
// OLD
import { useRatings } from '../hooks/useRatings'
const { getRating, setRating, removeRating } = useRatings()
const currentRating = getRating(currentMovie.id)
const liked = currentRating?.rating === 'liked'
const disliked = currentRating?.rating === 'disliked'

// NEW
import { useLikedHidden } from '../hooks/useLikedHidden'
const { isLiked, isHidden, addLikedMovie, addHiddenMovie, removeLikedMovie, removeHiddenMovie } =
    useLikedHidden()
const liked = isLiked(currentMovie.id)
const hidden = isHidden(currentMovie.id)

const handleLike = () => {
    if (!currentMovie) return
    if (liked) {
        removeLikedMovie(currentMovie.id)
    } else {
        addLikedMovie(currentMovie)
    }
}

const handleHide = () => {
    if (!currentMovie) return
    if (hidden) {
        removeHiddenMovie(currentMovie.id)
    } else {
        addHiddenMovie(currentMovie)
    }
}
```

**Files 2-4:** Update SimpleLikeButton, WatchLaterButton, ContentMetadata similarly

---

### **Phase 7: Pages** ⏱️ 10 min

**File 1:** `pages/watchlists.tsx`

**Create pseudo-UserList objects for defaults:**

```typescript
const { defaultWatchlist, likedMovies, hiddenMovies, userCreatedWatchlists } = useUserData()

const allLists = useMemo(() => {
    // Create pseudo-UserList objects for default arrays
    const watchlistList: UserList = {
        id: 'default-watchlist',
        name: 'Watchlist',
        description: 'Movies and TV shows to watch later',
        items: defaultWatchlist,
        isPublic: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        color: '#ef4444',
        emoji: '📺',
    }

    const likedList: UserList = {
        id: 'default-liked',
        name: 'Liked',
        description: "Content you've given a thumbs up",
        items: likedMovies,
        isPublic: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        color: '#10b981',
        emoji: '👍',
    }

    // Don't show hidden movies in watchlists page
    // They can have their own page later

    return [watchlistList, likedList, ...userCreatedWatchlists]
}, [defaultWatchlist, likedMovies, userCreatedWatchlists])
```

---

### **Phase 8: Utils** ⏱️ 15 min

**File 1:** `utils/contentFilter.ts` - Complete rewrite

```typescript
import { Content } from '../typings'

// Completely replace with new schema
export function filterHiddenContent(content: Content[], hiddenMovies: Content[]): Content[] {
    if (!hiddenMovies || hiddenMovies.length === 0) {
        return content
    }

    const hiddenIds = new Set(hiddenMovies.map((m) => m.id))
    return content.filter((item) => !hiddenIds.has(item.id))
}

export function isContentHidden(contentId: number, hiddenMovies: Content[]): boolean {
    return hiddenMovies.some((m) => m.id === contentId)
}

export function applyContentFilter(
    content: Content[],
    hiddenMovies: Content[],
    enableFiltering: boolean = true
): Content[] {
    if (!enableFiltering) {
        return content
    }
    return filterHiddenContent(content, hiddenMovies)
}
```

**File 2:** `utils/csvExport.ts`

```typescript
// Update to export new fields
export function exportUserDataToCSV(prefs: AuthPreferences) {
    const csv = [
        'Type,Title,Year,Rating',
        ...prefs.defaultWatchlist.map((c) => `Watchlist,${getTitle(c)},${getYear(c)},`),
        ...prefs.likedMovies.map((c) => `Liked,${getTitle(c)},${getYear(c)},Liked`),
        ...prefs.hiddenMovies.map((c) => `Hidden,${getTitle(c)},${getYear(c)},Hidden`),
        // ... custom lists
    ].join('\n')

    // Download CSV...
}
```

---

### **Phase 9: Tests** ⏱️ 20 min

**Update all test files to use new schema:**

```typescript
// OLD
await authStore.addRating(testMovie.id, 'liked', testMovie)

// NEW
await authStore.addLikedMovie(testMovie)
```

---

### **Phase 10: Cleanup & Testing** ⏱️ 30 min

1. Remove all `AuthRating`, `GuestRating`, `UserRating` type definitions
2. Remove all imports of rating types
3. Run `npm run type-check` - fix any TS errors
4. Run `npm run lint:fix`
5. Run `npm run delete-all-user-data`
6. Run `npm run test:create-user`
7. Run `npm run test:user-watchlist`
8. Verify in Firebase Console - should see new schema
9. Test in browser - create account, add to watchlist/liked/hidden
10. Verify persistence on page refresh

---

## ⏱️ Total Estimated Time: **3.5 hours**

- Phase 0: 20 min
- Phase 1: 20 min
- Phase 2: 30 min
- Phase 3: 15 min
- Phase 4: 30 min
- Phase 5: 25 min
- Phase 6: 20 min
- Phase 7: 10 min
- Phase 8: 15 min
- Phase 9: 20 min
- Phase 10: 30 min

**Total: 215 minutes (3.6 hours)**

---

## ✅ Success Criteria

After implementation:

1. ✅ Firebase shows new schema (likedMovies, hiddenMovies, defaultWatchlist, userCreatedWatchlists)
2. ✅ No TypeScript errors
3. ✅ Test user can like/hide movies
4. ✅ Test user can add to watchlist
5. ✅ Test user can create custom lists
6. ✅ Data persists on page refresh
7. ✅ Guest localStorage uses v2 keys
8. ✅ Old localStorage keys cleaned up
9. ✅ Content filtering works with hiddenMovies
10. ✅ CSV export includes new fields

---

**Ready to begin Phase 0!**

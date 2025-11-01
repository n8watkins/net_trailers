# Firebase Schema Migration Plan

## Overview

Restructuring user data schema to be more intuitive and eliminate redundancy between `ratings` and `userLists`.

---

## Schema Comparison

### **CURRENT SCHEMA** ❌

```typescript
users/{userId}/
  - watchlist: Content[]          // Main watchlist
  - ratings: UserRating[] {       // Separate ratings array
      contentId: number
      rating: 'liked' | 'disliked'
      timestamp: number
      content?: Content
    }
  - userLists: UserListsState {   // Contains default + custom lists
      lists: UserList[] {
        id, name, items[], ...
      }
      defaultListIds: {
        watchlist: string  // ID of default watchlist
        liked: string      // ID of default liked list
        disliked: string   // ID of default disliked list
      }
    }
  - lastActive: timestamp
```

**Issues:**

- `ratings` array duplicates `userLists.lists` (liked/disliked lists)
- Main `watchlist` duplicates `userLists.lists[defaultListIds.watchlist]`
- Confusing to have multiple representations of the same data
- "Disliked" is better named "Hidden" (movies user wants to hide)

---

### **NEW SCHEMA** ✅

```typescript
users/{userId}/
  - likedMovies: Content[]              // All content user liked
  - hiddenMovies: Content[]             // All content user wants to hide (was "disliked")
  - defaultWatchlist: Content[]         // Main watchlist
  - userCreatedWatchlists: UserList[] { // Custom lists only (empty by default)
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
  - lastActive: timestamp
```

**Benefits:**

- Single source of truth for each data type
- No redundancy or duplication
- Clearer naming (`hiddenMovies` vs `disliked`)
- Simpler structure (flat arrays instead of nested objects)
- Easier to query and update

---

## Migration Strategy

### **Phase 1: Type Definitions**

Update TypeScript interfaces to match new schema

### **Phase 2: Storage Services**

Update `AuthStorageService` and `GuestStorageService` with:

- Migration function to convert old → new schema
- Updated save/load methods

### **Phase 3: Zustand Stores**

Update `authStore` and `guestStore` with:

- New state structure
- Updated methods (rename `addRating` → `addLikedMovie`, etc.)

### **Phase 4: Hooks**

Update hooks to use new schema:

- `useRatings` → `useLikedMovies` + `useHiddenMovies`
- `useUserData`, `useAuthData`, `useGuestData`

### **Phase 5: Components**

Update components:

- `LikeOptions.tsx` - use `likedMovies`/`hiddenMovies` instead of `ratings`
- `SimpleLikeButton.tsx`
- `WatchLaterButton.tsx`
- `ContentMetadata.tsx`

### **Phase 6: Migration Script**

Create script to migrate existing user data in Firebase

---

## Files Requiring Changes

### **Type Definitions** (4 files)

1. `atoms/authSessionAtom.ts` - Update `AuthPreferences` interface
2. `atoms/guestSessionAtom.ts` - Update `GuestPreferences` interface
3. `types/userData.ts` - Update `UserPreferences` interface
4. `types/userLists.ts` - Update or remove (may not be needed)

### **Storage Services** (2 files)

5. `services/authStorageService.ts` - Update load/save, add migration
6. `services/guestStorageService.ts` - Update load/save, add migration

### **Zustand Stores** (2 files)

7. `stores/authStore.ts` - Update state and all methods
8. `stores/guestStore.ts` - Update state and all methods

### **Service Layer** (2 files)

9. `services/userDataService.ts` - Update to match new schema
10. `services/userListsService.ts` - Update or remove default list logic

### **Hooks** (7 files)

11. `hooks/useRatings.ts` - Rename to `useLikedMovies` or update interface
12. `hooks/useUserData.ts`
13. `hooks/useAuthData.ts`
14. `hooks/useGuestData.ts`
15. `hooks/useSessionData.ts`
16. `hooks/useSessionManager.ts`

### **Components** (4 files)

17. `components/LikeOptions.tsx` - Use new liked/hidden arrays
18. `components/SimpleLikeButton.tsx`
19. `components/WatchLaterButton.tsx`
20. `components/ContentMetadata.tsx`

### **Pages** (1 file)

21. `pages/watchlists.tsx` - Update to use new structure

### **Test Files** (5 files)

22. `test-persistence-flow.ts`
23. `scripts/test-user-watchlist.ts`
24. Update other test files as needed

### **Migration Script** (1 new file)

25. `scripts/migrate-user-schema.ts` - NEW: Migrate all existing users

---

## Detailed Implementation Steps

### **Step 1: Update Type Definitions**

**File:** `atoms/authSessionAtom.ts`

```typescript
// OLD
export interface AuthPreferences {
    watchlist: Content[]
    ratings: AuthRating[]
    userLists: UserListsState
    lastActive: number
}

// NEW
export interface AuthPreferences {
    likedMovies: Content[]
    hiddenMovies: Content[]
    defaultWatchlist: Content[]
    userCreatedWatchlists: UserList[]
    lastActive: number
}
```

**File:** `atoms/guestSessionAtom.ts` (same changes)

---

### **Step 2: Update AuthStorageService**

**Add migration function:**

```typescript
static migrateToNewSchema(oldPrefs: OldAuthPreferences): AuthPreferences {
    // Extract liked/disliked from ratings
    const likedMovies = oldPrefs.ratings
        .filter(r => r.rating === 'liked')
        .map(r => r.content)
        .filter(c => c !== undefined) as Content[]

    const hiddenMovies = oldPrefs.ratings
        .filter(r => r.rating === 'disliked')
        .map(r => r.content)
        .filter(c => c !== undefined) as Content[]

    // Get custom lists only (filter out default lists)
    const customLists = oldPrefs.userLists.lists.filter(list =>
        !Object.values(oldPrefs.userLists.defaultListIds).includes(list.id)
    )

    return {
        likedMovies,
        hiddenMovies,
        defaultWatchlist: oldPrefs.watchlist,
        userCreatedWatchlists: customLists,
        lastActive: oldPrefs.lastActive
    }
}
```

**Update `loadUserData` to auto-migrate:**

```typescript
static async loadUserData(userId: string): Promise<AuthPreferences> {
    const userDoc = await getDoc(doc(db, 'users', userId))

    if (userDoc.exists()) {
        const data = userDoc.data()

        // Check if old schema
        if (data.ratings || data.userLists) {
            console.log('🔄 Migrating user data to new schema...')
            const migrated = this.migrateToNewSchema(data as OldAuthPreferences)

            // Save migrated data
            await this.saveUserData(userId, migrated)
            return migrated
        }

        // Already new schema
        return data as AuthPreferences
    }

    // Return defaults for new users
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

### **Step 3: Update Zustand Stores**

**File:** `stores/authStore.ts`

**Update state interface:**

```typescript
export interface AuthState {
    userId?: string
    likedMovies: Content[]
    hiddenMovies: Content[]
    defaultWatchlist: Content[]
    userCreatedWatchlists: UserList[]
    lastActive: number
    syncStatus: 'synced' | 'syncing' | 'offline'
}
```

**Rename methods:**

- `addRating` → `addLikedMovie` / `addHiddenMovie`
- `removeRating` → `removeLikedMovie` / `removeHiddenMovie`
- Keep watchlist methods (use `defaultWatchlist` instead of `watchlist`)
- Keep list methods (use `userCreatedWatchlists` instead of `userLists.lists`)

**Example updated method:**

```typescript
addLikedMovie: async (content: Content) => {
    const state = get()

    // Remove from hidden if it exists there
    const updatedHidden = state.hiddenMovies.filter((m) => m.id !== content.id)

    // Add to liked if not already there
    const isAlreadyLiked = state.likedMovies.some((m) => m.id === content.id)
    const updatedLiked = isAlreadyLiked ? state.likedMovies : [...state.likedMovies, content]

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
```

---

### **Step 4: Update Hooks**

**File:** `hooks/useRatings.ts` → Rename to `hooks/useLikedHidden.ts`

```typescript
export const useLikedHidden = () => {
    const sessionType = useSessionStore((state) => state.sessionType)

    const authLiked = useAuthStore((state) => state.likedMovies)
    const authHidden = useAuthStore((state) => state.hiddenMovies)
    const authAddLiked = useAuthStore((state) => state.addLikedMovie)
    const authAddHidden = useAuthStore((state) => state.addHiddenMovie)

    const guestLiked = useGuestStore((state) => state.likedMovies)
    const guestHidden = useGuestStore((state) => state.hiddenMovies)
    const guestAddLiked = useGuestStore((state) => state.addLikedMovie)
    const guestAddHidden = useGuestStore((state) => state.addHiddenMovie)

    const isAuth = sessionType === 'authenticated'

    return {
        likedMovies: isAuth ? authLiked : guestLiked,
        hiddenMovies: isAuth ? authHidden : guestHidden,
        addLikedMovie: isAuth ? authAddLiked : guestAddLiked,
        addHiddenMovie: isAuth ? authAddHidden : guestAddHidden,
        isLiked: (contentId: number) =>
            (isAuth ? authLiked : guestLiked).some((c) => c.id === contentId),
        isHidden: (contentId: number) =>
            (isAuth ? authHidden : guestHidden).some((c) => c.id === contentId),
    }
}
```

---

### **Step 5: Update Components**

**File:** `components/LikeOptions.tsx`

```typescript
// OLD
const { getRating, setRating, removeRating } = useRatings()
const currentRating = currentMovie ? getRating(currentMovie.id) : null

// NEW
const { isLiked, isHidden, addLikedMovie, addHiddenMovie, removeLikedMovie, removeHiddenMovie } =
    useLikedHidden()
const liked = currentMovie ? isLiked(currentMovie.id) : false
const hidden = currentMovie ? isHidden(currentMovie.id) : false

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

---

### **Step 6: Migration Script**

**File:** `scripts/migrate-all-users.ts`

```typescript
import './load-env'
import { db } from '../firebase'
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore'
import { AuthStorageService } from '../services/authStorageService'

async function migrateAllUsers() {
    console.log('🔄 Starting user schema migration...')

    const usersRef = collection(db, 'users')
    const snapshot = await getDocs(usersRef)

    let migrated = 0
    let skipped = 0
    let failed = 0

    for (const userDoc of snapshot.docs) {
        try {
            const data = userDoc.data()

            // Check if needs migration
            if (data.ratings || data.userLists) {
                console.log(`Migrating user: ${userDoc.id}`)
                const newData = AuthStorageService.migrateToNewSchema(data)
                await AuthStorageService.saveUserData(userDoc.id, newData)
                migrated++
            } else {
                console.log(`Skipping user (already migrated): ${userDoc.id}`)
                skipped++
            }
        } catch (error) {
            console.error(`Failed to migrate user ${userDoc.id}:`, error)
            failed++
        }
    }

    console.log('\n✅ Migration complete!')
    console.log(`   Migrated: ${migrated}`)
    console.log(`   Skipped: ${skipped}`)
    console.log(`   Failed: ${failed}`)
}

migrateAllUsers()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Migration failed:', error)
        process.exit(1)
    })
```

---

## Testing Strategy

1. **Unit Tests**: Test migration function with various old schema data
2. **Test User**: Migrate test user first (`test@nettrailer.dev`)
3. **Verify**: Check Firebase console to ensure data migrated correctly
4. **Production**: Run migration script on all users

---

## Rollback Plan

If migration fails:

1. Keep old schema support in `loadUserData` (detect both schemas)
2. Add flag to disable auto-migration
3. Manual rollback: restore from Firebase backup

---

## File Count Summary

- **Type definitions**: 4 files
- **Services**: 4 files (2 storage + 2 logic)
- **Stores**: 2 files
- **Hooks**: 6 files
- **Components**: 4 files
- **Pages**: 1 file
- **Tests**: 5 files
- **Migration**: 1 new file

**Total: 27 files to modify + 1 new file**

---

## Next Steps

1. ✅ Create this migration plan
2. ⏳ Update type definitions (Phase 1)
3. ⏳ Update storage services (Phase 2)
4. ⏳ Update stores (Phase 3)
5. ⏳ Update hooks (Phase 4)
6. ⏳ Update components (Phase 5)
7. ⏳ Create & run migration script (Phase 6)
8. ⏳ Delete test user data
9. ⏳ Test with test user
10. ⏳ Commit and deploy

---

**Status**: Plan created, ready to implement
**Estimated time**: 3-4 hours
**Risk level**: Medium (data migration always has risks)
**Mitigation**: Auto-migration on load + manual migration script

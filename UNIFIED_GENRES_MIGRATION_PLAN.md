# Unified Genres Migration Plan

## Executive Summary

**Goal:** Replace TMDB genre IDs (`number[]`) with unified genre IDs (`string[]`) throughout the entire application.

**Approach:** Full migration with no backwards compatibility - clean break.

**Status:** ~40% Complete

**Estimated Remaining Time:** 2-3 hours

---

## ✅ Completed Work (Phase 1-3)

### Phase 1: Core Infrastructure ✅

- [x] Created `constants/unifiedGenres.ts` - 24 unified genres with movie/TV mappings
- [x] Created `utils/genreMapping.ts` - Translation utilities
- [x] Updated `constants/genres.ts` - Added Drama (18) and Crime (80) to TV_GENRES

### Phase 2: Type System ✅

- [x] Updated `types/userLists.ts` - Changed `genres?: number[]` to `genres?: string[]`
- [x] Updated `types/customRows.ts` - All genre fields now `string[]`

### Phase 3: Base Components ✅

- [x] Updated `GenrePills.tsx` - Uses unified genres
- [x] Updated `GenreMultiSelect.tsx` - Uses unified genres
- [x] Updated `utils/collectionGenreUtils.ts` - Returns unified IDs from content

---

## 🔄 Remaining Work (Phase 4-8)

### Phase 4: Modal Components (Core Collection Editing)

#### 4.1 CollectionEditorModal.tsx

**Location:** `components/modals/CollectionEditorModal.tsx`

**Current State:**

- Line 55: `const [selectedGenres, setSelectedGenres] = useState<number[]>([])`
- Line 78: `setSelectedGenres(collection.genres || [])`
- Line 145: `genres: selectedGenres`

**Changes Needed:**

```typescript
// Update state type
const [selectedGenres, setSelectedGenres] = useState<string[]>([])

// Update GENRE_LOOKUP to use unified genres
const GENRE_LOOKUP = useMemo(() => {
    const map = new Map<string, string>()
    const allGenres = getUnifiedGenresByMediaType('both', childSafetyEnabled)
    allGenres.forEach((genre) => {
        map.set(genre.id, genre.name)
    })
    return map
}, [childSafetyEnabled])

// Remove imports for MOVIE_GENRES, TV_GENRES
// Import getUnifiedGenresByMediaType instead
```

**Files to Update:**

- Import statements
- State declarations
- Genre lookup logic
- Props passed to GenrePills component

**Estimated Time:** 30 minutes

---

#### 4.2 CollectionBuilderModal.tsx

**Location:** `components/modals/CollectionBuilderModal.tsx`

**Current State:**

- Uses `inferTopGenresFromContent()` which now returns `string[]` ✅
- Passes genres to collection creation

**Changes Needed:**

```typescript
// Line ~147-150: Already uses inferTopGenresFromContent
const normalizedGenres = (
    formData.genres?.length ? formData.genres : inferTopGenresFromContent(previewContent, 2)
).slice(0, 2)

// No changes needed - already compatible! ✅
```

**Estimated Time:** 10 minutes (verification only)

---

#### 4.3 CollectionCreatorModal.tsx

**Location:** `components/modals/CollectionCreatorModal.tsx`

**Current State:**

- Creates collections from Smart Search results
- Uses `inferTopGenresFromContent()` and `inferMediaTypeFromContent()`

**Changes Needed:**

```typescript
// Verify inference functions return correct types
// Should work automatically since inferTopGenresFromContent now returns string[]

// Check collection creation in handleSaveCollection()
const newCollection: UserList = {
    // ...
    genres: inferredGenres, // Already string[] ✅
    // ...
}
```

**Estimated Time:** 15 minutes (verification + minor fixes)

---

#### 4.4 SimplifiedSmartBuilder.tsx

**Location:** `components/customRows/smart/SimplifiedSmartBuilder.tsx`

**Current State:**

- Uses GenreMultiSelect component ✅
- Manages genre state

**Changes Needed:**

```typescript
// Update genre state type
const [selectedGenres, setSelectedGenres] = useState<string[]>([])

// GenreMultiSelect already updated ✅
// Just need to update state declarations
```

**Estimated Time:** 15 minutes

---

### Phase 5: API Routes (Backend Translation Layer)

#### 5.1 /api/custom-rows/[id]/content/route.ts

**Location:** `app/api/custom-rows/[id]/content/route.ts`

**Current State:**

- Receives collection data with genres
- Queries TMDB using genre IDs
- Handles AND/OR logic

**Changes Needed:**

```typescript
import { translateToTMDBGenres, formatGenresForAPI } from '@/utils/genreMapping'

export async function GET(request: Request, { params }: { params: { id: string } }) {
    // ... existing code ...

    // Get collection
    const collection = await getCollection(params.id)

    // TRANSLATE unified genres to TMDB IDs
    const { mediaType, genres: unifiedGenres, genreLogic } = collection

    if (mediaType === 'both') {
        const { movieIds, tvIds } = translateToTMDBGenresForBoth(unifiedGenres)

        // Query movies
        const movieGenres = formatGenresForAPI(movieIds, genreLogic || 'OR')
        const movieUrl = `${TMDB_BASE}/discover/movie?with_genres=${movieGenres}&...`

        // Query TV
        const tvGenres = formatGenresForAPI(tvIds, genreLogic || 'OR')
        const tvUrl = `${TMDB_BASE}/discover/tv?with_genres=${tvGenres}&...`

        // Interleave results
    } else {
        // Single media type
        const tmdbGenreIds = translateToTMDBGenres(unifiedGenres, mediaType)
        const genreParam = formatGenresForAPI(tmdbGenreIds, genreLogic || 'OR')
        const url = `${TMDB_BASE}/discover/${mediaType}?with_genres=${genreParam}&...`
    }

    // ... rest of code ...
}
```

**Test Cases:**

- [x] Fantasy TV → Should query with genre=10765 (Sci-Fi & Fantasy)
- [x] Fantasy + Sci-Fi TV → Should dedupe to single genre=10765
- [x] Romance TV → Should query with genre=18 (Drama)
- [x] Romance + Comedy for Both → Movies: 10749,35 / TV: 18,35
- [x] Action Both → Movies: 28 / TV: 10759

**Estimated Time:** 45 minutes

---

#### 5.2 Other API Routes (Lower Priority)

**Files to Check:**

- `/api/genres/[type]/[id]/route.ts` - Genre browsing (header dropdown)
- `/api/generate-row-name/route.ts` - AI name generation
- `/api/smart-search/route.ts` - Already uses content inference ✅

**Estimated Time:** 30 minutes

---

### Phase 6: Data Loading Components

#### 6.1 CollectionRowLoader.tsx

**Location:** `components/collections/CollectionRowLoader.tsx`

**Current State:**

- Loads content for collections
- Passes genres to API

**Changes Needed:**

```typescript
// Should work automatically since collection.genres is now string[]
// API route handles translation
// Just verify props are passed correctly
```

**Estimated Time:** 15 minutes (verification)

---

### Phase 7: Data Migration

#### 7.1 Create Migration Script

**New File:** `scripts/migrate-genres-to-unified.ts`

**Purpose:** Convert existing user collections from TMDB IDs to unified IDs

**Strategy:**

```typescript
import admin from 'firebase-admin'
import { getUnifiedGenreFromTMDBId } from '../constants/unifiedGenres'

async function migrateUserCollections() {
    // 1. Get all user documents
    const usersSnapshot = await admin.firestore().collection('users').get()

    let migratedCount = 0
    let errorCount = 0

    for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data()

        // 2. Check customRows subcollection
        const customRowsSnapshot = await userDoc.ref.collection('customRows').get()

        for (const rowDoc of customRowsSnapshot.docs) {
            const row = rowDoc.data()

            if (row.genres && Array.isArray(row.genres)) {
                // Check if already migrated (string[] vs number[])
                if (typeof row.genres[0] === 'string') {
                    console.log(`Skipping ${rowDoc.id} - already migrated`)
                    continue
                }

                // Convert TMDB IDs to unified IDs
                const unifiedGenres: string[] = []
                const mediaType = row.mediaType || 'both'

                for (const tmdbId of row.genres) {
                    const unifiedGenre = getUnifiedGenreFromTMDBId(
                        tmdbId,
                        mediaType === 'both' ? 'movie' : mediaType
                    )

                    if (unifiedGenre && !unifiedGenres.includes(unifiedGenre.id)) {
                        unifiedGenres.push(unifiedGenre.id)
                    }
                }

                // Update document
                await rowDoc.ref.update({ genres: unifiedGenres })
                console.log(`✅ Migrated ${rowDoc.id}: ${row.genres} → ${unifiedGenres}`)
                migratedCount++
            }
        }

        // 3. Check userCreatedWatchlists in main user document
        if (userData.userCreatedWatchlists && Array.isArray(userData.userCreatedWatchlists)) {
            const updatedWatchlists = userData.userCreatedWatchlists.map((list) => {
                if (list.genres && typeof list.genres[0] === 'number') {
                    const unifiedGenres = list.genres
                        .map((tmdbId) =>
                            getUnifiedGenreFromTMDBId(tmdbId, list.mediaType || 'movie')
                        )
                        .filter((g) => g !== undefined)
                        .map((g) => g.id)
                        .filter((id, index, arr) => arr.indexOf(id) === index) // dedupe

                    return { ...list, genres: unifiedGenres }
                }
                return list
            })

            await userDoc.ref.update({ userCreatedWatchlists: updatedWatchlists })
        }
    }

    console.log(`\n✅ Migration complete!`)
    console.log(`   Migrated: ${migratedCount}`)
    console.log(`   Errors: ${errorCount}`)
}

// Run migration
migrateUserCollections().then(() => process.exit(0))
```

**Run Command:**

```bash
npm run migrate:genres
```

**Add to package.json:**

```json
{
    "scripts": {
        "migrate:genres": "ts-node -r tsconfig-paths/register scripts/migrate-genres-to-unified.ts"
    }
}
```

**Estimated Time:** 1 hour (create + test)

---

#### 7.2 Guest Data Migration

**Location:** Browser localStorage

**Strategy:**

```typescript
// Add to storage adapter loading logic
// utils/storage/LocalStorageAdapter.ts

export async function loadGuestData(guestId: string) {
    const key = `nettrailer_guest_data_${guestId}`
    const data = localStorage.getItem(key)

    if (!data) return null

    const parsed = JSON.parse(data)

    // Migrate genres if needed
    if (parsed.customRows) {
        parsed.customRows = parsed.customRows.map((row) => {
            if (row.genres && typeof row.genres[0] === 'number') {
                // Convert to unified
                row.genres = convertLegacyToUnified(row.genres, row.mediaType)
            }
            return row
        })

        // Save migrated data
        localStorage.setItem(key, JSON.stringify(parsed))
    }

    return parsed
}
```

**Estimated Time:** 30 minutes

---

### Phase 8: Testing & Validation

#### 8.1 Unit Tests

**Test File:** `__tests__/genreMapping.test.ts`

```typescript
describe('Genre Mapping', () => {
    test('Fantasy TV maps to Sci-Fi & Fantasy', () => {
        const result = translateToTMDBGenres(['fantasy'], 'tv')
        expect(result).toEqual([10765])
    })

    test('Fantasy + Sci-Fi TV deduplicates', () => {
        const result = translateToTMDBGenres(['fantasy', 'scifi'], 'tv')
        expect(result).toEqual([10765]) // Single genre
    })

    test('Romance TV maps to Drama', () => {
        const result = translateToTMDBGenres(['romance'], 'tv')
        expect(result).toEqual([18])
    })

    test('Romance + Comedy for Both', () => {
        const result = translateToTMDBGenresForBoth(['romance', 'comedy'])
        expect(result).toEqual({
            movieIds: [10749, 35],
            tvIds: [18, 35],
        })
    })
})
```

**Estimated Time:** 30 minutes

---

#### 8.2 Integration Tests

**Manual Test Plan:**

1. **Create New Collection**
    - [ ] Create movie collection with Fantasy genre
    - [ ] Verify genre displays as "Fantasy"
    - [ ] Verify API calls use genre=14
    - [ ] Verify content loads correctly

2. **Create TV Collection**
    - [ ] Create TV collection with Fantasy genre
    - [ ] Verify genre displays as "Fantasy"
    - [ ] Verify API calls use genre=10765
    - [ ] Verify content loads correctly

3. **Test Deduplication**
    - [ ] Create TV collection with Fantasy + Sci-Fi
    - [ ] Verify both pills show
    - [ ] Verify API only queries genre=10765 once
    - [ ] Verify no duplicate content

4. **Test Romance Mapping**
    - [ ] Create TV collection with Romance
    - [ ] Verify displays as "Romance"
    - [ ] Verify API calls use genre=18 (Drama)
    - [ ] Verify gets romantic dramas

5. **Test Both Media Type**
    - [ ] Create Both collection with Romance + Comedy
    - [ ] Verify content from both movies and TV
    - [ ] Verify movies use genres=10749,35
    - [ ] Verify TV uses genres=18,35

6. **Edit Existing Collection**
    - [ ] Load old collection (after migration)
    - [ ] Verify genres display correctly
    - [ ] Edit genres
    - [ ] Save and verify

7. **Child Safety Mode**
    - [ ] Enable child safety
    - [ ] Verify only child-safe genres show
    - [ ] Create collection
    - [ ] Verify content is filtered

**Estimated Time:** 1 hour

---

## Migration Execution Order

### Pre-Migration Checklist

- [x] Create unified genre constants
- [x] Create translation utilities
- [x] Update type definitions
- [x] Update base components (GenrePills, GenreMultiSelect)
- [ ] **BACKUP DATABASE** (export Firestore data)
- [ ] Test in development environment

### Migration Steps

**Step 1: Complete Code Changes** (1.5 hours)

1. Update CollectionEditorModal
2. Update SimplifiedSmartBuilder
3. Update API route /api/custom-rows/[id]/content
4. Verify CollectionBuilderModal and CollectionCreatorModal
5. Run TypeScript compilation - fix any errors

**Step 2: Create Migration Script** (1 hour)

1. Write migration script
2. Test on development data
3. Verify converted genres are correct
4. Add logging and error handling

**Step 3: Deploy & Migrate** (30 minutes)

1. Deploy code changes to production
2. Run migration script on production database
3. Verify migration logs
4. Spot-check user collections

**Step 4: Testing** (1 hour)

1. Test creating new collections
2. Test editing migrated collections
3. Test content fetching with unified genres
4. Monitor error logs

**Total Estimated Time:** 4 hours

---

## Rollback Plan

### If Migration Fails:

**Option 1: Revert Code**

```bash
git revert <migration-commit-hash>
git push
```

**Option 2: Restore Database**

- Restore Firestore backup
- Redeploy previous code version

**Option 3: Hot-Fix with Dual Support**

- Add backwards compatibility layer
- Accept both `number[]` and `string[]`
- Auto-convert on read

---

## Key Mapping Reference

### Most Important Mappings:

| Unified Genre | Movie TMDB ID | TV TMDB ID | Notes                      |
| ------------- | ------------- | ---------- | -------------------------- |
| fantasy       | 14            | 10765      | TV combines with Sci-Fi    |
| scifi         | 878           | 10765      | TV combines with Fantasy   |
| romance       | 10749         | 18         | TV uses Drama              |
| action        | 28            | 10759      | TV combines with Adventure |
| adventure     | 12            | 10759      | TV combines with Action    |
| war           | 10752         | 10768      | TV combines with Politics  |
| crime         | 80            | 80         | Direct 1:1 mapping         |
| drama         | 18            | 18         | Direct 1:1 mapping         |

### Deduplication Examples:

```typescript
// User selects: ['fantasy', 'scifi'] for TV
translateToTMDBGenres(['fantasy', 'scifi'], 'tv')
// Returns: [10765] ← Deduplicated!

// User selects: ['action', 'adventure'] for TV
translateToTMDBGenres(['action', 'adventure'], 'tv')
// Returns: [10759] ← Deduplicated!

// User selects: ['romance'] for Both
translateToTMDBGenresForBoth(['romance'])
// Returns: { movieIds: [10749], tvIds: [18] } ← Different per type
```

---

## Files Changed Summary

### New Files Created: (3)

- `constants/unifiedGenres.ts` ✅
- `utils/genreMapping.ts` ✅
- `scripts/migrate-genres-to-unified.ts` ⏳

### Modified Files: (15+)

1. `types/userLists.ts` ✅
2. `types/customRows.ts` ✅
3. `constants/genres.ts` ✅
4. `utils/collectionGenreUtils.ts` ✅
5. `components/customRows/GenrePills.tsx` ✅
6. `components/customRows/GenreMultiSelect.tsx` ✅
7. `components/modals/CollectionEditorModal.tsx` ⏳
8. `components/modals/CollectionBuilderModal.tsx` ⏳
9. `components/modals/CollectionCreatorModal.tsx` ⏳
10. `components/customRows/smart/SimplifiedSmartBuilder.tsx` ⏳
11. `app/api/custom-rows/[id]/content/route.ts` ⏳
12. `components/collections/CollectionRowLoader.tsx` ⏳
13. `utils/storage/LocalStorageAdapter.ts` ⏳
14. `utils/storage/FirebaseStorageAdapter.ts` ⏳
15. `package.json` ⏳ (add migration script)

### Files to Verify: (5)

- `app/api/genres/[type]/[id]/route.ts`
- `components/content/GenresDropdown.tsx`
- `utils/recommendations/genreEngine.ts`
- `utils/firestore/interactions.ts`
- Any other files using genre arrays

---

## Risk Assessment

### High Risk:

- **Data Migration** - If script fails, users lose collection data
    - Mitigation: Database backup before migration
    - Mitigation: Dry-run on test data first

### Medium Risk:

- **API Breaking Changes** - Content may not load correctly
    - Mitigation: Thorough testing of all genre combinations
    - Mitigation: Error logging to catch issues

### Low Risk:

- **TypeScript Errors** - Compilation failures
    - Mitigation: Fix before deployment
    - Already mostly resolved with type updates

---

## Success Criteria

✅ Migration successful when:

1. All TypeScript compiles without errors
2. Users can create new collections with unified genres
3. Existing collections load and display correctly
4. Content fetching works for all genre combinations
5. Fantasy + Sci-Fi TV deduplicates correctly
6. Romance TV shows drama content
7. No error spikes in production logs
8. All manual tests pass

---

## Next Steps

**Ready to proceed?**

1. Review this plan
2. Make any adjustments
3. Execute remaining phases 4-8
4. Deploy and migrate

**Estimated Total Time to Complete:** 2-3 hours

**Questions to resolve:**

- [ ] When to run production migration? (off-peak hours?)
- [ ] Should we notify users about the update?
- [ ] How many existing collections need migration? (check analytics)

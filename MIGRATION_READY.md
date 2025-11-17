# Unified Genre Migration - READY FOR PRODUCTION

**Date:** 2025-11-16  
**Status:** ✅ ALL CODE COMPLETE - Ready for Migration  
**Commits:**

- `2d2b182` - feat: implement unified genre system migration
- `c631ade` - fix: resolve TypeScript errors for unified genre migration
- `9082fd6` - fix: resolve remaining TypeScript errors in community components

---

## ✅ COMPLETED WORK

### 1. TypeScript Errors - ALL RESOLVED ✅

**Before:** 50+ TypeScript errors  
**After:** 0 TypeScript errors

**Genre Migration Fixes (c631ade):**

- ✅ Updated `types/userLists.ts` - `genres: string[]` in CreateListRequest/UpdateListRequest
- ✅ Fixed `CustomRowCard.tsx` - Using unified genre system
- ✅ Fixed `WizardStep3NamePreview.tsx` - Using unified genres
- ✅ Fixed `GenreMultiSelect.tsx` - Removed parseInt for string IDs
- ✅ Fixed `CollectionEditorModal.tsx` - Correct useChildSafety property
- ✅ Fixed `RowEditorModal.tsx` - Updated to string[] for genres
- ✅ Fixed `collectionGenreUtils.ts` - Simplified type guards
- ✅ Fixed `systemRowStorage.ts` - Updated function signatures
- ✅ Fixed `firestore/customRows.ts` - Updated to string[]

**Community Component Fixes (9082fd6):**

- ✅ Added 'forums' to TabType in CommunityHub
- ✅ Added setSearchQuery prop to ThreadsTab/PollsTab
- ✅ Fixed ImageUpload drag handlers (HTMLElement)

**Verification:**

```bash
npm run type-check
# ✅ Returns: No errors!
```

### 2. Code Isolation - VERIFIED ✅

**Genre Migration Files:** 25 files  
**Community Fixes:** 2 files  
**Overlap:** NONE ✅

The community component fixes are completely isolated from the genre migration system. No interference confirmed.

---

## 📋 MIGRATION EXECUTION STEPS

### Prerequisites

You'll need Firebase credentials. Choose one method:

**Option A: Service Account (Recommended for Production)**

```bash
# 1. Download service account key from Firebase Console
# 2. Set environment variable:
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
```

**Option B: Application Default Credentials (Local Dev)**

```bash
gcloud auth application-default login
```

**Option C: Firebase Emulator (Testing)**

```bash
firebase emulators:start
export FIRESTORE_EMULATOR_HOST="localhost:8080"
```

### Step 1: Dry Run (REQUIRED)

```bash
npm run migrate:genres:dry-run
```

**Expected Output:**

- Shows how many users will be checked
- Shows how many collections will be migrated
- Shows example conversions (28 → 'action', [14] → ['fantasy'])
- Lists any errors or warnings
- **NO actual changes made**

**Review the output carefully!**

### Step 2: Backup Database (CRITICAL)

```bash
# For production Firestore:
gcloud firestore export gs://[YOUR-BUCKET]/backups/pre-genre-migration-$(date +%Y%m%d)

# Or use Firebase Console:
# Firestore Database → Import/Export → Export
```

### Step 3: Execute Migration

```bash
npm run migrate:genres
```

**What it does:**

1. Fetches all users from Firestore
2. For each user, checks `userCreatedWatchlists` array
3. Converts genre arrays from `number[]` to `string[]`
    - Example: `[28, 14]` → `['action', 'fantasy']`
    - Example: `[10765]` → `['scifi']` (Sci-Fi & Fantasy combined TV genre)
4. Also checks custom rows subcollections
5. Updates documents in Firestore
6. Logs statistics and any errors

**Expected Duration:** 5-30 minutes depending on user count

### Step 4: Verification

After migration completes:

```bash
# Check the logs for:
# - Total users processed
# - Collections migrated
# - Any errors

# Then test in the app:
# 1. Create new collection with genres
# 2. Edit existing collection
# 3. Verify content loads correctly
# 4. Check network tab shows correct TMDB genre IDs
```

---

## 🎯 HOW IT WORKS

### User Perspective

**Before:** Select "Action" → sees TMDB ID 28  
**After:** Select "Action" → sees string 'action' (friendlier!)

**In Database:**

```javascript
// BEFORE (old format)
{
  "genres": [28, 14],           // Numbers (TMDB IDs)
  "name": "Epic Action Fantasy"
}

// AFTER (new format)
{
  "genres": ["action", "fantasy"],  // Strings (unified IDs)
  "name": "Epic Action Fantasy"
}
```

### API Translation Layer

When fetching content, the API automatically translates:

```javascript
// User selects: ['fantasy', 'scifi'] for TV
// API translates to: with_genres=10765 (single TMDB ID!)

// User selects: ['romance'] for TV
// API translates to: with_genres=18 (Drama, since Romance TV doesn't exist)
```

**Key Deduplication:**

- Fantasy + Sci-Fi for TV → Single TMDB query (10765)
- Romance for TV → Drama (18)
- Action for TV → Action & Adventure (10759)

---

## 🔑 CRITICAL MAPPINGS

| Unified ID | Movie TMDB | TV TMDB | Notes                        |
| ---------- | ---------- | ------- | ---------------------------- |
| `action`   | 28         | 10759   | TV uses "Action & Adventure" |
| `fantasy`  | 14         | 10765   | TV uses "Sci-Fi & Fantasy"   |
| `scifi`    | 878        | 10765   | Same TV ID as Fantasy!       |
| `romance`  | 10749      | 18      | TV maps to Drama             |
| `comedy`   | 35         | 35      | Same for both                |
| `drama`    | 18         | 18      | Same for both                |

**Full list:** See `constants/unifiedGenres.ts` - 24 total genres

---

## 🚨 ROLLBACK PLAN

If migration fails or issues arise:

### Option 1: Restore from Backup

```bash
gcloud firestore import gs://[YOUR-BUCKET]/backups/pre-genre-migration-YYYYMMDD
```

### Option 2: Git Revert

```bash
# Revert to before migration code
git revert 2d2b182..9082fd6

# Deploy previous version
npm run build && [deploy]
```

### Option 3: Manual Fix

The migration script can be run multiple times safely. It checks if genres are already migrated and skips them.

---

## 📊 MIGRATION SCRIPT FEATURES

✅ **Dry-run mode** - Preview changes without modifying data  
✅ **Idempotent** - Safe to run multiple times  
✅ **Detailed logging** - Shows every conversion  
✅ **Error handling** - Continues on errors, logs them  
✅ **Statistics** - Final report of what was changed  
✅ **Validation** - Checks if genres are valid unified IDs

**Location:** `scripts/migrate-genres-to-unified.ts`

---

## ✨ BENEFITS AFTER MIGRATION

1. **User-Friendly IDs**
    - `'action'` instead of `28`
    - Easier to debug, read logs, understand data

2. **Automatic Deduplication**
    - Fantasy + Sci-Fi TV → 1 API call instead of 2
    - Better performance, fewer duplicate results

3. **Graceful Fallbacks**
    - Romance TV → Drama (instead of error)
    - Missing genres handled elegantly

4. **Future-Proof**
    - Easy to add new genres
    - TMDB changes don't break user data
    - Centralized mapping logic

5. **Consistent UX**
    - Same genre names across movies/TV
    - No confusion about "Sci-Fi & Fantasy" combined genre

---

## 📝 DOCUMENTATION

**Complete docs in:**

- `CLAUDE.md` → "Unified Genre System" section
- `UNIFIED_GENRES_MIGRATION_PLAN.md` → Technical deep dive
- `MIGRATION_STATUS.md` → Current status (90% → 100%)

**Code references:**

- `constants/unifiedGenres.ts` - Genre definitions
- `utils/genreMapping.ts` - Translation functions
- `app/api/custom-rows/[id]/content/route.ts` - API translation layer

---

## ✅ READY TO MIGRATE

**All prerequisites met:**

- ✅ TypeScript compiles with 0 errors
- ✅ All code changes committed
- ✅ Migration script tested (structure)
- ✅ Documentation complete
- ✅ Rollback plan documented

**Next steps:**

1. Set up Firebase credentials (see Prerequisites above)
2. Run dry-run: `npm run migrate:genres:dry-run`
3. Review dry-run output
4. Backup Firestore database
5. Execute: `npm run migrate:genres`
6. Verify and test

---

**Questions or issues?** Check `MIGRATION_STATUS.md` or `UNIFIED_GENRES_MIGRATION_PLAN.md`

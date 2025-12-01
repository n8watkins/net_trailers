## Gemini Thoughts – Collection Filter Regressions

_Updated: 2024-06-04_

### Scope

- Recent diffs touching:  
  `utils/tmdb/contentDiscovery.ts`,  
  `components/collections/smart/SmartCollectionBuilder.tsx`,  
  `components/modals/CollectionEditorModal.tsx`,  
  `app/api/custom-rows/[id]/content/route.ts`,  
  `services/userListsService.ts`
- Focus: advanced actor/director filters and smart builder output.

### 1. Director filters assume arrays, legacy data is strings

- **Code:** `utils/tmdb/contentDiscovery.ts:221-235`
- **Change:** `withDirector` is now treated as `string[]` and the code blindly reads index `0`.
- **Problem:** Existing collections store `withDirector` as a plain string (see smart builder prior to change and manual editor at `components/modals/CollectionEditorModal.tsx:544-556`). Reading `[0]` grabs only the first character of the TMDB ID (`'12345' → '1'`), so TMDB queries no longer include the director filter.
- **Impact:** All deployed director-based collections stop matching; unified cascading caches never rebuild with the intended filter, so “Nolan” rows suddenly turn into generic genre rows.
- **Action items:**
    1. Keep supporting both legacy strings and new arrays inside `applyAdvancedFilters`.
    2. Plan a Firestore migration to convert stored strings into arrays plus `withDirectorIds`.
    3. Add regression tests for `applyAdvancedFilters` covering both shapes.

### 2. Smart builder still drops TMDB IDs

- **Code:** `components/collections/smart/SmartCollectionBuilder.tsx:296-305`
- **Behavior:** Gemini `director`/`actor` suggestions only populate display strings. `withDirectorId` / `withCastIds` remain undefined.
- **Backend expectation:**  
  `app/api/custom-rows/[id]/content/route.ts:435-509` and `services/userListsService.ts:330-357` rely solely on numeric IDs when calling `fetchWithUnifiedCascading` or building caches.
- **Impact:** Actor/director selections from the smart builder are completely ignored. Users think they created “Christopher Nolan Thrillers” but the backend fetches plain genre cascades; caches never warm because `withCastIds` is empty.
- **Action items:**
    1. Extend suggestion conversion to capture TMDB IDs (Gemini already returns them in `suggestion.value`).
    2. Persist both human-readable arrays (`withDirector`, `withCast`) and ID arrays (`withDirectorIds`, `withCastIds`) so editors and APIs stay in sync.
    3. Add an integration test that ensures smart-builder-created collections include the ID fields before hitting Firestore.

### 3. Actor filters still pass names to TMDB

- **Code:** `utils/tmdb/contentDiscovery.ts:221-226`
- **Issue:** `applyAdvancedFilters` uses `withCast` (names) instead of the stored `withCastIds`. `Number('Keanu Reeves')` is `NaN`, so the TMDB param builder never sets `with_cast`.
- **Impact:** Actor filters configured through the traditional wizard/editor simply do nothing, which is confusing to users. Director filters suffer the same fate if the data isn’t migrated.
- **Action items:**
    1. Update the TMDB param builder to use `withCastIds` and `withDirectorId(s)`, falling back to legacy data when needed.
    2. Emit warnings when old shapes are detected so we can track migration progress.
    3. Create unit coverage for `applyAdvancedFilters` verifying the generated query params.

### Recommended Plan

1. **Compatibility patch:** Teach `applyAdvancedFilters` to read both legacy and new shapes for actors/directors, using IDs wherever possible.
2. **Smart builder fix:** Persist TMDB IDs during suggestion conversion so downstream APIs receive the necessary data for unified cascading and cache builds.
3. **Data hygiene:** Schedule a Firestore migration to normalize `advancedFilters` (populate `withDirectorIds` / `withCastIds`, wrap single strings in arrays) and add tests preventing regressions.

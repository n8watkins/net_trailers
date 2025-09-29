# Next Actions - Netflix Trailer App Cleanup & Implementation

## 🚨 Critical Issues to Fix Immediately

### 1. Kill Zombie Dev Servers (14+ running)

**Status:** ⏳ Ready to execute

```bash
# Kill all zombie processes
pkill -f "next dev"
# Or use the KillShell tool for each background bash ID
```

**Background Bash IDs to kill:**

- 229318, cce0f9, 3f8c39, d37c8d, f33653, 6b6a9a, b938d8
- 8aaf3c, 2d9211, 4e8fcc, d7cb76, 18ec04, 7249d0, e9bed9

### 2. Fix TypeScript Compilation Errors (25+ errors)

**Status:** ⏳ Ready to fix

#### Missing Methods in useUserData:

- [ ] Add `getAccountDataSummary()` method
- [ ] Add `clearAccountData()` method
- [ ] Add `exportAccountData()` method
- [ ] Add `deleteAccount()` method

#### Type Issues to Fix:

- [ ] Fix `updateList` and `deleteList` signatures in ListSelectionModal
- [ ] Fix Content type usage (use getTitle() helper)
- [ ] Fix AuthFlowDebugger status type (should be union type)
- [ ] Fix PostHydrationEffects hook signatures

## 📦 Phase 1: Complete Zustand Migration (HIGH PRIORITY)

### Components to Convert (9 remaining):

#### 1. AccountManagement.tsx

- **Current:** Uses `useUserData()`
- **Action:** Create `useAccountManagement()` hook with account-specific methods
- **Complexity:** HIGH - needs new store methods

#### 2. ListDropdown.tsx

- **Current:** Uses `useUserData()`
- **Action:** Convert to `useListsReadOnly()`
- **Complexity:** LOW

#### 3. Modal.tsx

- **Current:** Uses `useUserData()`
- **Action:** Convert to `useWatchlist()` + `useRatings()`
- **Complexity:** MEDIUM

#### 4. AvatarDropdown.tsx

- **Current:** Uses `useUserData()`
- **Action:** Convert to `useAuthStatus()`
- **Complexity:** LOW

#### 5. ListSelectionModal.tsx

- **Current:** Uses `useUserData()`
- **Action:** Convert to `useListsReadOnly()` + implement mutations in stores
- **Complexity:** HIGH - needs updateList/deleteList

#### 6. WatchLaterButton.tsx

- **Current:** Uses `useUserData()`
- **Action:** Convert to `useWatchlist()`
- **Complexity:** LOW

#### 7. pages/watchlists.tsx

- **Current:** Partially converted, still uses `useUserData()`
- **Action:** Complete conversion to lightweight hooks
- **Complexity:** LOW

#### 8. pages/liked.tsx

- **Current:** Uses `useUserData()`
- **Action:** Convert to `useRatings()`
- **Complexity:** LOW

#### 9. pages/hidden.tsx

- **Current:** Uses `useUserData()`
- **Action:** Create `useHiddenContent()` hook
- **Complexity:** MEDIUM - needs new hook

### Store Methods to Implement:

#### authStore.ts & guestStore.ts:

```typescript
// Add these methods:
- updateList(listId: string, updates: Partial<UserList>)
- deleteList(listId: string)
- getAccountDataSummary() // auth only
- clearAccountData() // auth only
- exportAccountData() // auth only
- deleteAccount() // auth only
```

## 🧹 Phase 2: Remove Debug Components (MEDIUM PRIORITY)

### Components to Remove/Conditionally Load:

1. [ ] AuthFlowDebugger.tsx - Move to dev-only
2. [ ] DebugControls.tsx - Move to dev-only
3. [ ] FirestoreTestButton.tsx - Remove completely
4. [ ] FirebaseCallTracker.tsx - Move to dev-only
5. [ ] PostHydrationEffects.tsx - Review and possibly remove

### Implementation:

```typescript
// In _app.tsx, conditionally load debug components:
{process.env.NODE_ENV === 'development' && (
  <>
    <DebugControls />
    <FirebaseCallTracker />
    <AuthFlowDebugger />
  </>
)}
```

## 🗑️ Phase 3: Clean Up Technical Debt (LOW PRIORITY)

### Files to Remove:

- [ ] hydration-debug-plan.md
- [ ] test-firestore.html
- [ ] scripts/migrate-recoil.js (after migration complete)
- [ ] scripts/fix-hydration-imports.js (no longer needed)
- [ ] atoms/compat.ts (after migration complete)
- [ ] All Recoil atoms (after migration)
- [ ] stores/\*.backup files

### Documentation to Update:

- [ ] Update CLAUDE.md to reflect Zustand-only architecture
- [ ] Remove references to Recoil migration
- [ ] Document new lightweight hooks pattern

## 🎯 Execution Order

### Day 1 (Immediate):

1. ✅ Create this action plan
2. ⏳ Kill all zombie dev servers
3. ⏳ Fix TypeScript compilation errors
4. ⏳ Convert ListDropdown, AvatarDropdown, WatchLaterButton to lightweight hooks (easy wins)

### Day 2:

5. ⏳ Implement missing store methods (updateList, deleteList)
6. ⏳ Convert Modal.tsx and remaining page components
7. ⏳ Fix ListSelectionModal with new store methods

### Day 3:

8. ⏳ Implement account management methods in authStore
9. ⏳ Convert AccountManagement.tsx
10. ⏳ Remove debug components from production

### Day 4:

11. ⏳ Remove Recoil completely
12. ⏳ Clean up old files
13. ⏳ Update documentation

## 📊 Success Metrics

- [ ] 0 TypeScript errors on `npm run type-check`
- [ ] 0 zombie dev servers running
- [ ] 0 components using `useUserData()`
- [ ] All debug components dev-only
- [ ] Firebase calls remain at 1-2 per session
- [ ] Clean git status (no temporary files)
- [ ] All tests passing

## 🔧 Testing Checklist

After each phase:

- [ ] Run `npm run type-check`
- [ ] Run `npm run build`
- [ ] Test user authentication flow
- [ ] Test guest mode
- [ ] Test list operations (create, update, delete)
- [ ] Check Firebase call count
- [ ] Verify no console errors

## 📝 Notes

- Keep SessionSyncManager as centralized sync solution
- Maintain lightweight hooks pattern for better performance
- Use direct Zustand subscriptions, not wrapper hooks
- Test thoroughly after removing Recoil to ensure no regressions

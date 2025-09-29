# Zustand Refactor: Complete Session Isolation Implementation Plan

## Overview

Comprehensive refactor plan to migrate from Recoil to Zustand, implementing absolute session isolation between guest and authenticated users. This addresses fatal atom key conflicts and session bleeding issues documented in [separation.md](./separation.md).

## Current Issues Requiring Resolution

**Reference**: [separation.md - Current Status](./separation.md#current-status---2025-09-27-1630)

🚨 **Critical Problems:**

- Fatal duplicate Recoil atom keys causing production crashes
- Guest message appearing when authenticated
- Watchlist data bleeding between guest/auth sessions
- Recoil state management breakdown

## Storage Architecture Strategy

### Guest Session Storage

**Primary Storage**: localStorage with session prefixing

- **Keys**: `nettrailer_guest_{guestId}_*`
- **Persistence**: Survives page refresh, browser restart
- **Scope**: Single device, single browser
- **Isolation**: Complete separation from auth data

**Pros:**

- ✅ Simple implementation
- ✅ Fast access
- ✅ No network dependency
- ✅ Perfect for temporary/demo usage

**Cons:**

- ❌ No cross-device sync
- ❌ Lost if user clears browser data
- ❌ Limited to ~5-10MB storage

### Authenticated Session Storage

**Primary Storage**: Firebase Firestore

- **Collections**: `users/{userId}/watchlists`, `users/{userId}/preferences`
- **Persistence**: Cloud storage with offline caching
- **Scope**: Cross-device synchronization
- **Isolation**: Firebase security rules prevent cross-user access

**Secondary Storage**: localStorage cache

- **Keys**: `nettrailer_auth_{userId}_cache_*`
- **Purpose**: Offline access and performance
- **Sync**: Bidirectional with Firestore

**Pros:**

- ✅ Cross-device synchronization
- ✅ Persistent across browser clears
- ✅ Scalable storage (1GB+ per user)
- ✅ Real-time updates
- ✅ Built-in security rules

**Cons:**

- ❌ Network dependency for initial load
- ❌ More complex implementation
- ❌ Firebase costs for large datasets

### Alternative Storage Analysis

#### sessionStorage

**Use Case**: Tab-specific temporary data

- **Pros**: Automatic cleanup on tab close
- **Cons**: Lost on tab close, not suitable for user data
- **Verdict**: ❌ Not appropriate for watchlists

#### IndexedDB

**Use Case**: Large local datasets with complex queries

- **Pros**: Large storage (50GB+), structured queries
- **Cons**: Complex API, overkill for our use case
- **Verdict**: ❌ Unnecessary complexity

#### Hybrid Approach (Recommended)

**Guest**: localStorage only
**Auth**: Firebase + localStorage cache

- **Rationale**: Different user expectations for persistence

## Zustand Store Architecture

### Core Principle: Complete Store Separation

```typescript
// Separate stores = Impossible data bleeding
const useGuestStore = create(...)  // Guest-only data
const useAuthStore = create(...)   // Auth-only data
const useSessionStore = create(...) // Session management
```

### Store Hierarchy

#### 1. Session Management Store

```typescript
interface SessionStore {
    sessionType: 'guest' | 'authenticated' | 'initializing'
    activeSessionId: string
    isInitialized: boolean
    isTransitioning: boolean

    // Actions
    initializeGuestSession: () => void
    initializeAuthSession: (user: User) => void
    switchToGuest: () => void
    switchToAuth: (user: User) => void
}
```

#### 2. Guest Data Store

```typescript
interface GuestStore {
    watchlists: UserList[]
    ratings: ContentRating[]
    preferences: UserPreferences

    // Actions
    addToWatchlist: (listId: string, content: Content) => void
    createList: (list: UserList) => void
    updatePreferences: (prefs: Partial<UserPreferences>) => void
    clearAllData: () => void
}
```

#### 3. Auth Data Store

```typescript
interface AuthStore {
    watchlists: UserList[]
    ratings: ContentRating[]
    preferences: UserPreferences
    syncStatus: 'synced' | 'syncing' | 'offline'

    // Actions
    addToWatchlist: (listId: string, content: Content) => Promise<void>
    createList: (list: UserList) => Promise<void>
    updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>
    syncWithFirebase: () => Promise<void>
    clearLocalCache: () => void
}
```

#### 4. Shared App Store (Session-Agnostic)

```typescript
interface AppStore {
    modals: ModalState
    toasts: ToastMessage[]
    loading: LoadingState
    search: SearchState

    // These don't need session separation
}
```

## Migration Plan

### Phase 1: Infrastructure Setup (Day 1)

1. **Install Dependencies**

    ```bash
    npm install zustand
    # Keep recoil temporarily for gradual migration
    ```

2. **Create Store Structure**
    - `stores/sessionStore.ts`
    - `stores/guestStore.ts`
    - `stores/authStore.ts`
    - `stores/appStore.ts`

3. **Create Storage Services**
    - `services/guestStorageService.ts` (localStorage only)
    - `services/authStorageService.ts` (Firebase + cache)
    - `services/storageSync.ts` (sync utilities)

### Phase 2: Session Management Migration (Day 2)

1. **Replace Session Atoms**
    - Migrate `sessionManagerAtom.ts` → `sessionStore.ts`
    - Update `useSessionManager` hook
    - Test session switching

2. **Storage Service Integration**
    - Connect stores to storage services
    - Implement persistence layer
    - Test data isolation

### Phase 3: Data Store Migration (Day 3-4)

1. **Guest Store Implementation**
    - Migrate guest-related atoms
    - Update `useGuestData` hook
    - Test guest functionality

2. **Auth Store Implementation**
    - Migrate auth-related atoms
    - Update `useAuthData` hook
    - Implement Firebase integration
    - Test auth functionality

### Phase 4: UI Component Updates (Day 5)

1. **Hook Updates**
    - Replace Recoil hooks with Zustand equivalents
    - Update component dependencies
    - Test UI state management

2. **Conditional Rendering Fixes**
    - Fix guest message appearing when authenticated
    - Ensure proper session-based UI rendering
    - Test session switching UX

### Phase 5: Testing & Validation (Day 6)

1. **Comprehensive Testing**
    - Session isolation tests
    - Data persistence tests
    - UI state tests
    - Firebase integration tests

2. **Cleanup**
    - Remove Recoil dependencies
    - Clean up unused files
    - Final validation

## Firebase Requirements & Setup

### User Action Items

#### 1. Firestore Database Rules

**Update Firebase Console → Firestore → Rules:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Nested collections (watchlists, preferences)
      match /{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

#### 2. Authentication Configuration

**Verify in Firebase Console → Authentication:**

- ✅ Email/Password provider enabled
- ✅ Google provider enabled (if using)
- ✅ Authorized domains include your development/production domains

#### 3. Firestore Structure Planning

**Recommended collection structure:**

```
users/{userId}/
├── preferences/
│   └── default (document)
├── watchlists/
│   ├── {listId} (document)
│   └── {listId} (document)
└── ratings/
    ├── {contentId} (document)
    └── {contentId} (document)
```

#### 4. Offline Persistence (Optional)

**Enable in Firebase config:**

```typescript
// In firebase.ts
import { enableNetwork, disableNetwork } from 'firebase/firestore'

// Enable offline persistence
enableOfflinePersistence(db)
```

### Development Environment Setup

1. **Firebase Emulator** (recommended for testing)

    ```bash
    firebase init emulators
    firebase emulators:start
    ```

2. **Environment Variables**
    - Verify `.env.local` has all Firebase config
    - Add emulator endpoints for development

## Testing Strategy

### Unit Tests

**Store Testing:**

```typescript
// Example: guestStore.test.ts
describe('Guest Store', () => {
    test('should add content to watchlist')
    test('should create new list')
    test('should persist data to localStorage')
    test('should clear data completely')
})
```

**Storage Service Testing:**

```typescript
// Example: authStorageService.test.ts
describe('Auth Storage Service', () => {
    test('should save to Firebase')
    test('should cache in localStorage')
    test('should sync when online')
    test('should work offline')
})
```

### Integration Tests

**Session Switching:**

```typescript
describe('Session Management', () => {
    test('guest → auth: no data bleeding')
    test('auth → guest: complete isolation')
    test('auth → auth: different user isolation')
    test('page refresh: session persistence')
})
```

### End-to-End Tests

**User Journeys:**

```typescript
describe('Complete User Flow', () => {
    test('Guest creates list → Login → Auth has separate lists')
    test('Auth creates list → Logout → Guest has separate lists')
    test('Cross-device sync for auth users')
    test('Offline functionality')
})
```

### Test Files Structure

```
tests/
├── stores/
│   ├── sessionStore.test.ts
│   ├── guestStore.test.ts
│   └── authStore.test.ts
├── services/
│   ├── guestStorageService.test.ts
│   └── authStorageService.test.ts
├── hooks/
│   ├── useSessionManager.test.ts
│   ├── useGuestData.test.ts
│   └── useAuthData.test.ts
├── integration/
│   ├── sessionSwitching.test.ts
│   └── dataIsolation.test.ts
└── e2e/
    ├── guestFlow.test.ts
    ├── authFlow.test.ts
    └── sessionIsolation.test.ts
```

## Risk Assessment & Mitigation

### High Risk Items

1. **Data Loss During Migration**
    - **Mitigation**: Backup existing localStorage data
    - **Rollback**: Keep Recoil as fallback during migration

2. **Firebase Rate Limiting**
    - **Mitigation**: Implement proper caching and batching
    - **Monitoring**: Add Firebase usage tracking

3. **Session State Corruption**
    - **Mitigation**: Add validation and error boundaries
    - **Recovery**: Automatic session reset mechanisms

### Medium Risk Items

1. **Performance Degradation**
    - **Mitigation**: Lazy loading and store optimization
    - **Monitoring**: Performance tracking for store operations

2. **Complex State Dependencies**
    - **Mitigation**: Gradual migration with compatibility layer
    - **Testing**: Comprehensive integration tests

## Success Criteria

### Functional Requirements

- ✅ Zero atom key conflicts
- ✅ Complete session data isolation
- ✅ Correct UI conditional rendering
- ✅ Guest data persists in localStorage
- ✅ Auth data syncs with Firebase
- ✅ Smooth session switching

### Performance Requirements

- ✅ Page load time ≤ current performance
- ✅ Session switch time < 500ms
- ✅ Firebase sync time < 2s on initial load
- ✅ Offline functionality works

### Quality Requirements

- ✅ 90%+ test coverage for new stores
- ✅ Zero console errors in production
- ✅ TypeScript strict mode compliance
- ✅ Accessibility maintained

## Files Affected

### New Files

```
stores/
├── sessionStore.ts
├── guestStore.ts
├── authStore.ts
└── appStore.ts

services/
├── guestStorageService.ts (refactored)
├── authStorageService.ts (enhanced)
└── storageSync.ts (new)

hooks/
├── useSessionData.ts (new unified hook)
└── useStoreMigration.ts (migration utility)

tests/ (entire new directory)
```

### Modified Files

```
hooks/
├── useSessionManager.ts (major refactor)
├── useGuestData.ts (Zustand integration)
├── useAuthData.ts (Zustand integration)
└── useAuth.tsx (session integration)

components/ (all components using session state)
├── Header.tsx
├── ListSelectionModal.tsx
├── WatchLaterButton.tsx
└── [20+ other components]

pages/
├── watchlists.tsx
├── settings.tsx
└── [other pages using session state]
```

### Removed Files

```
atoms/
├── userDataAtom.ts
├── sessionManagerAtom.ts
├── errorAtom.ts (partially)
├── toastAtom.ts (move to appStore)
├── modalAtom.ts (move to appStore)
└── searchAtom.ts (move to appStore)
```

## Timeline Estimation

**Total Estimated Time**: 6-8 days

- **Planning & Setup**: 1 day
- **Core Migration**: 3-4 days
- **Testing & Polish**: 2-3 days

**Milestones**:

- Day 1: Infrastructure ready, stores created
- Day 3: Session management working
- Day 5: All features migrated and working
- Day 6-8: Testing complete, production ready

## Rollback Plan

### Immediate Rollback (if needed)

1. **Git Revert**: Roll back to commit `19a39fa`
2. **Environment Reset**: Clear localStorage, restart dev server
3. **Recoil Restoration**: Re-enable all Recoil atoms

### Gradual Rollback (during migration)

1. **Feature Flags**: Use conditional imports for stores
2. **Compatibility Layer**: Run both systems temporarily
3. **Data Migration**: Move data back to Recoil if needed

---

**Status**: Planning Complete - Ready for Implementation
**Next Action**: Install Zustand and begin Phase 1
**Reference**: [separation.md](./separation.md) for detailed requirements

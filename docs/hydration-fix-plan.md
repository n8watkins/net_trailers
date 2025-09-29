# Suspense Boundary Hydration Error Fix Plan

## Problem Statement

"This Suspense boundary received an update before it finished hydrating" error is occurring because state updates are happening during the hydration phase. This is a Next.js App Router specific issue where Provider updates conflict with boundary hydration.

## Root Cause Analysis

### Why This Error Occurs

1. **Timing Issue**: State updates in Providers fire before route segment boundaries finish hydrating
2. **App Router Streaming**: Next.js streams HTML per segment, creating multiple hydration boundaries
3. **Store Access During SSR**: Components access Zustand store before hydration completes
4. **Early State Updates**: useEffect in providers runs too early, before deeper boundaries mount

### Current Issues in Our Codebase

1. **Direct store imports**: 16 components import `useAppStore` directly from `stores/appStore`
2. **No hydration guards**: Store updates happen immediately without checking hydration state
3. **Provider-level effects**: State synchronization happens at provider level, not leaf level
4. **Missing startTransition**: Some state updates not wrapped in React.startTransition()

## Phase-by-Phase Solution Plan

### Phase 0: One-Shot Sanity Check

**Goal**: Temporarily disable all on-mount state updates to confirm the issue

**Implementation**:

1. Comment out all useEffect with setState in:
    - SessionProvider
    - Auth hooks
    - Store initialization
2. Test if error disappears
3. Document which effects cause the issue

**Files to Check**:

- `stores/sessionStore.ts`
- `hooks/useAuth.tsx`
- `hooks/useSessionData.ts`
- `pages/_app.tsx`

### Phase 1: Fix Store Import Issues

**Goal**: Replace all direct `useAppStore` imports with hydration-safe wrapper

**Implementation**:

1. Run the fix-hydration-imports script
2. Verify all imports are updated
3. Test each component individually

**Files to Update** (16 components):

```
hooks/useAuth.tsx
components/Banner.tsx
pages/index.tsx
components/SearchResults.tsx
pages/watchlists.tsx
pages/liked.tsx
pages/hidden.tsx
components/Modal.tsx
components/SearchFiltersDropdown.tsx
components/SearchFilters.tsx
components/SearchBar.tsx
components/ContentImage.tsx
components/ContentCard.tsx
components/ListDropdown.tsx
components/LikeOptions.tsx
components/SimpleLikeButton.tsx
```

### Phase 2: Move Client State Merges to Leaf Components

**Goal**: Defer state synchronization until after hydration completes

**Implementation**:

1. Create PostHydrationEffects component
2. Move localStorage/session sync from providers to leaf components
3. Use setTimeout(0) to defer updates one tick

**New Component**: `components/PostHydrationEffects.tsx`

```typescript
'use client'
import { useEffect } from 'react'
import { startTransition } from 'react'
import { useAppStoreHydrated } from '../hooks/useAppStoreHydrated'
import { useSessionData } from '../hooks/useSessionData'

export default function PostHydrationEffects() {
    const store = useAppStoreHydrated()
    const session = useSessionData()

    useEffect(() => {
        const id = setTimeout(() => {
            startTransition(() => {
                // Sync localStorage
                // Sync session data
                // Handle redirects
            })
        }, 0)
        return () => clearTimeout(id)
    }, [])

    return null
}
```

### Phase 3: Add Comprehensive Hydration Gates

**Goal**: Ensure no state updates happen before hydration

**Implementation**:

1. Enhance useHydrationGuard hook
2. Add hydration checks to all store setters
3. Queue early updates and flush after hydration

**Enhanced Hook**: `hooks/useHydrationGuard.ts`

```typescript
export function useHydrationGate() {
    const [hydrated, setHydrated] = useState(false)
    const queueRef = useRef<(() => void)[]>([])

    useEffect(() => {
        const id = setTimeout(() => {
            setHydrated(true)
            // Flush queued updates
            queueRef.current.forEach((fn) => fn())
            queueRef.current = []
        }, 0)
        return () => clearTimeout(id)
    }, [])

    const safeUpdate = useCallback(
        (fn: () => void) => {
            if (!hydrated) {
                queueRef.current.push(fn)
                return
            }
            startTransition(fn)
        },
        [hydrated]
    )

    return { hydrated, safeUpdate }
}
```

### Phase 4: Find Hidden Offenders

**Goal**: Identify and fix all sources of early updates

**Checklist**:

- [ ] No state setters during render
- [ ] No useLayoutEffect with setState
- [ ] No client-only branching (window, Date.now())
- [ ] No router.push during render
- [ ] All dynamic imports properly wrapped
- [ ] Firebase auth listeners deferred

**Common Patterns to Fix**:

```typescript
// ❌ BAD: State update during render
const Component = () => {
    if (typeof window !== 'undefined') {
        setState(window.innerWidth)
    }
}

// ✅ GOOD: State update in effect
const Component = () => {
    useEffect(() => {
        startTransition(() => {
            setState(window.innerWidth)
        })
    }, [])
}
```

### Phase 5: Add Debug Instrumentation

**Goal**: Add logging to identify any remaining early updates

**Implementation**:

```typescript
function debugSetter(name: string, realSet: Function) {
    return (arg: any) => {
        if (typeof window !== 'undefined' && !document.body) {
            console.warn(`[EARLY UPDATE] ${name}`, new Error().stack)
        }
        return startTransition(() => realSet(arg))
    }
}
```

## Testing Strategy

### After Each Phase:

1. Clear .next cache: `rm -rf .next`
2. Start fresh dev server
3. Check browser console for hydration errors
4. Test all major user flows
5. Document any remaining issues

### Success Criteria:

- No "Suspense boundary" errors in console
- No hydration mismatches
- All features work as expected
- Performance not degraded

## Implementation Order

1. **Immediate**: Run fix-hydration-imports script (Phase 1)
2. **Next**: Create PostHydrationEffects component (Phase 2)
3. **Then**: Add hydration gates to critical paths (Phase 3)
4. **Finally**: Add debug instrumentation and fix remaining issues (Phase 4-5)

## Code Locations

### Key Files to Modify:

- `pages/_app.tsx` - Main app wrapper
- `stores/appStore.ts` - Zustand store
- `stores/sessionStore.ts` - Session management
- `hooks/useAppStoreHydrated.ts` - Hydration wrapper
- `components/Layout.tsx` - Layout component

### New Files to Create:

- `components/PostHydrationEffects.tsx`
- `utils/hydrationGate.ts`
- `scripts/fix-hydration-imports.js`

## Notes

- This is a Next.js 15.5.4 specific issue with App Router
- The app uses pages router but has similar hydration challenges
- Zustand store must be accessed only after hydration
- All state updates should use React.startTransition()
- Firebase auth listeners are a common source of early updates

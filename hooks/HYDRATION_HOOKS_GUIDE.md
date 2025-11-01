# Hydration Hooks Decision Guide

This guide helps you choose the right hydration hook for your use case. All hooks solve SSR/hydration mismatch issues but with different approaches and trade-offs.

## Quick Decision Tree

```
START: Do you need to access Zustand store data or execute operations?
│
├─ ACCESS ZUSTAND STORE DATA
│  │
│  ├─ Is it specifically the AppStore?
│  │  │
│  │  ├─ YES → Use `useClientStore`
│  │  │       ✓ Simple API
│  │  │       ✓ Optional fallback values
│  │  │       ✓ AppStore-optimized
│  │  │
│  │  └─ NO (other stores) → Use `useHydrationSafeStore`
│  │         ✓ Works with ANY Zustand store
│  │         ✓ Automatic store subscription
│  │         ✓ Debug logging support
│  │
│  └─ Do you need a global hydration flag shared across all components?
│     │
│     └─ YES → Use `useHydrationGuard`
│            ✓ Global hydration state
│            ✓ Most aggressive approach
│            ✓ Prevents all operations until idle
│
├─ EXECUTE OPERATIONS (callbacks, functions)
│  │
│  └─ Use `useHydrationSafe` (from useHydrationSafe.ts)
│         ✓ Wraps operations in hydration checks
│         ✓ React 18 startTransition support
│         ✓ Delayed execution support
│
└─ MANAGE LOCAL COMPONENT STATE (not store)
   │
   └─ Use `useHydrationSafe` (from useHydrationSafeStore.ts)
          ✓ Hydration-safe local state
          ✓ Blocks updates until hydration
          ✓ Returns [value, isHydrated, setter]
```

## Detailed Hook Comparison

### 1. `useHydrationGuard` - Global Hydration Flag

**Location:** `hooks/useHydrationGuard.ts`

**Best for:**

- Preventing Suspense boundary errors
- Global hydration state needed across components
- Most aggressive hydration protection

**Returns:** `boolean` (isHydrated)

**Example:**

```tsx
function MyComponent() {
    const isHydrated = useHydrationGuard()

    if (!isHydrated) {
        return <div>Loading...</div>
    }

    return <div>{/* Safe to use store */}</div>
}
```

**Pros:**

- ✅ Global state - subsequent mounts see immediate hydration
- ✅ Uses `requestIdleCallback` for precise timing
- ✅ Simplest API - just returns boolean

**Cons:**

- ❌ Requires manual checking before store access
- ❌ 50-100ms delay for hydration detection

---

### 2. `useClientStore` - AppStore Access

**Location:** `hooks/useClientStore.ts`

**Best for:**

- Accessing AppStore specifically
- Simple use cases with optional fallbacks
- Components that need SSR-safe store access

**Returns:** `T | undefined` (store value or fallback)

**Example:**

```tsx
function ModalStatus() {
    const isOpen = useClientStore(
        (state) => state.modal.isOpen,
        false // fallback during hydration
    )

    return <div>Modal is {isOpen ? 'open' : 'closed'}</div>
}
```

**Pros:**

- ✅ Simple, focused API
- ✅ Built-in fallback support
- ✅ Type-safe with AppStore

**Cons:**

- ❌ Only works with AppStore
- ❌ Returns undefined without fallback (requires null checks)
- ❌ Component-level hydration tracking (not global)

---

### 3. `useHydrationSafeStore` - Universal Store Access

**Location:** `hooks/useHydrationSafeStore.ts`

**Best for:**

- Accessing ANY Zustand store (not just AppStore)
- Need automatic subscription to store changes
- Debugging hydration issues (has logging)

**Returns:** `R` (always returns a value - default or store)

**Example:**

```tsx
import { useSessionStore } from '../stores/sessionStore'

function UserProfile() {
    const userId = useHydrationSafeStore(
        useSessionStore,
        (state) => state.userId,
        null, // default during hydration
        'UserProfile' // for debug logging
    )

    return <div>User: {userId ?? 'Guest'}</div>
}
```

**Pros:**

- ✅ Works with ANY Zustand store
- ✅ Always returns a value (never undefined)
- ✅ Automatic store subscription after hydration
- ✅ Debug logging support

**Cons:**

- ❌ More complex API (4 parameters)
- ❌ Component-level hydration tracking
- ❌ Debug logging overhead

---

### 4a. `useHydrationSafe` - Operation Wrapper (useHydrationSafe.ts)

**Location:** `hooks/useHydrationSafe.ts`

**Best for:**

- Wrapping operations/callbacks that modify state
- Need React 18 `startTransition` for smooth updates
- Delayed execution requirements

**Returns:** `{ isHydrated, safeExecute, safeExecuteAsync, deferredExecute }`

**Example:**

```tsx
function ActionButton() {
    const { isHydrated, safeExecute, deferredExecute } = useHydrationSafe()
    const openModal = useAppStore((state) => state.openModal)

    const handleClick = () => {
        safeExecute(() => {
            openModal(content, true)
        })
    }

    const handleDelayed = () => {
        deferredExecute(() => {
            console.log('Delayed action')
        }, 500)
    }

    return <button onClick={handleClick}>Open Modal</button>
}
```

**Pros:**

- ✅ Wraps operations in `startTransition` for better UX
- ✅ Multiple execution modes (immediate, async, delayed)
- ✅ Operations before hydration are safely ignored

**Cons:**

- ❌ Doesn't directly provide store access
- ❌ Component-level hydration tracking
- ❌ Name collision with other `useHydrationSafe` (see below)

---

### 4b. `useHydrationSafe` - Local State (useHydrationSafeStore.ts)

**Location:** `hooks/useHydrationSafeStore.ts` (exported alongside `useHydrationSafeStore`)

**⚠️ WARNING: Different hook with same name as 4a above!**

**Best for:**

- Managing local component state (not Zustand store)
- Need to block state updates until hydration
- Want hydration status alongside state

**Returns:** `[value, isHydrated, safeSetValue]` (tuple like useState)

**Example:**

```tsx
function Counter() {
    const [count, isHydrated, setCount] = useHydrationSafe(0, 'Counter')

    return (
        <div>
            <p>Count: {count}</p>
            <p>Hydrated: {isHydrated ? 'Yes' : 'No'}</p>
            <button onClick={() => setCount(count + 1)}>Increment</button>
        </div>
    )
}
```

**Pros:**

- ✅ Simple API similar to useState
- ✅ Blocks updates during hydration
- ✅ Returns hydration status

**Cons:**

- ❌ Only for local state, not Zustand stores
- ❌ Name collision with operation wrapper version
- ❌ Debug logging overhead

---

## Common Patterns

### Pattern 1: Simple Store Access

```tsx
// ✅ Good - Simple AppStore access
const modalOpen = useClientStore((state) => state.modal.isOpen, false)
```

### Pattern 2: Multiple Store Access

```tsx
// ✅ Good - Access multiple stores
const userId = useHydrationSafeStore(useSessionStore, (state) => state.userId, null)

const modalOpen = useHydrationSafeStore(useAppStore, (state) => state.modal.isOpen, false)
```

### Pattern 3: Conditional Rendering

```tsx
// ✅ Good - Wait for hydration before rendering
const isHydrated = useHydrationGuard()

if (!isHydrated) {
    return <LoadingSpinner />
}

return <ComplexComponent />
```

### Pattern 4: Safe Operations

```tsx
// ✅ Good - Wrap store mutations
const { safeExecute } = useHydrationSafe()
const addToWatchlist = useAppStore((state) => state.addToWatchlist)

const handleAdd = () => {
    safeExecute(() => addToWatchlist(item))
}
```

## Migration Guide

### From Direct Store Access → useClientStore

```tsx
// ❌ Before (hydration mismatch risk)
function MyComponent() {
    const isOpen = useAppStore((state) => state.modal.isOpen)
    return <div>{isOpen ? 'Open' : 'Closed'}</div>
}

// ✅ After (hydration safe)
function MyComponent() {
    const isOpen = useClientStore((state) => state.modal.isOpen, false)
    return <div>{isOpen ? 'Open' : 'Closed'}</div>
}
```

### From Direct State Updates → useHydrationSafe

```tsx
// ❌ Before (may run during hydration)
function MyComponent() {
    const openModal = useAppStore((state) => state.openModal)

    useEffect(() => {
        openModal(content) // Runs during hydration!
    }, [])

    return <button onClick={() => openModal(content)}>Open</button>
}

// ✅ After (safe from hydration issues)
function MyComponent() {
    const { safeExecute } = useHydrationSafe()
    const openModal = useAppStore((state) => state.openModal)

    useEffect(() => {
        safeExecute(() => openModal(content)) // Waits for hydration
    }, [safeExecute, openModal, content])

    return <button onClick={() => safeExecute(() => openModal(content))}>Open</button>
}
```

## Performance Considerations

| Hook                            | Hydration Tracking | Performance Impact            | Best Use Case            |
| ------------------------------- | ------------------ | ----------------------------- | ------------------------ |
| `useHydrationGuard`             | Global             | Low (shared state)            | Global flag needed       |
| `useClientStore`                | Per-component      | Low (simple)                  | AppStore access          |
| `useHydrationSafeStore`         | Per-component      | Medium (subscription + debug) | Any store with debugging |
| `useHydrationSafe` (operations) | Per-component      | Low (just checks)             | Operation wrapping       |
| `useHydrationSafe` (state)      | Per-component      | Medium (debug logging)        | Local state management   |

## Troubleshooting

### Problem: Hydration mismatch errors

**Solution:** Use `useHydrationGuard` or `useClientStore` with proper fallbacks

### Problem: Store updates during hydration

**Solution:** Wrap operations with `useHydrationSafe` (operation wrapper)

### Problem: Need to debug hydration issues

**Solution:** Use `useHydrationSafeStore` with `componentName` parameter

### Problem: Multiple stores causing issues

**Solution:** Use `useHydrationSafeStore` for each store instead of `useClientStore`

### Problem: Name collision between two `useHydrationSafe` hooks

**Solution:** Import explicitly from the correct file:

```tsx
// For operation wrapping
import { useHydrationSafe } from '../hooks/useHydrationSafe'

// For local state
import { useHydrationSafe } from '../hooks/useHydrationSafeStore'
```

## Summary

**Choose based on your primary need:**

1. **Global hydration flag** → `useHydrationGuard`
2. **AppStore access** → `useClientStore`
3. **Any Zustand store** → `useHydrationSafeStore`
4. **Wrap operations** → `useHydrationSafe` (from useHydrationSafe.ts)
5. **Local state** → `useHydrationSafe` (from useHydrationSafeStore.ts)

**General advice:**

- Start with the simplest hook that meets your needs
- Use `useClientStore` for most AppStore cases
- Use `useHydrationGuard` when you need a global flag
- Use operation wrappers for callbacks/effects
- Consider the name collision when importing `useHydrationSafe`

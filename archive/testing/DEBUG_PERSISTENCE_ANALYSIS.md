# Debug Console Persistence Issue Analysis

## Problem Statement

When toggling settings in the debug console (e.g., "Vitals"), the setting turns on but after page refresh, it resets to off.

## Current Implementation Flow

### 1. DebugControls Component (`components/DebugControls.tsx`)

**Initial State (lines 26-35):**

```typescript
const [settings, setSettings] = useState<DebugSettings>({
    showWebVitals: false, // All default to false
    // ... other settings
})
```

**Load from localStorage (lines 63-67):**

```typescript
useEffect(() => {
    const saved = localStorage.getItem('debugSettings')
    if (saved) {
        setSettings(JSON.parse(saved))
    }
    // ...
}, [])
```

**Save to localStorage (lines 92-96):**

```typescript
useEffect(() => {
    localStorage.setItem('debugSettings', JSON.stringify(settings))
    window.dispatchEvent(new CustomEvent('debugSettingsChanged', { detail: settings }))
}, [settings])
```

### 2. useDebugSettings Hook (lines 289-318)

Similar pattern:

- Starts with default (all false)
- Loads from localStorage on mount
- Listens for `debugSettingsChanged` events

## Potential Issues

### Issue #1: React 18 Strict Mode Double Mounting

In development, React 18 runs effects twice. This could cause:

1. First mount: Load from localStorage (settings = true)
2. Unmount: Save effect runs with settings = true
3. Second mount: Load from localStorage again
4. **Problem**: If the component unmounts/remounts quickly, state might not be saved

### Issue #2: Save Effect Runs on Initial Mount

The save effect (lines 92-96) has `[settings]` as dependency. This means:

1. Component mounts with default state (all false)
2. Save effect runs IMMEDIATELY with all false → **OVERWRITES localStorage with false**
3. Load effect then runs and tries to load from localStorage
4. But localStorage was just overwritten with false values!

**This is the smoking gun!** The effects run in this order:

- ✅ Render with initial state (all false)
- ❌ Save effect runs (writes all false to localStorage)
- ✅ Load effect runs (loads all false from localStorage)

### Issue #3: Multiple Dev Servers Running

System shows 5 background dev servers:

- 845104, aa58f2, 3a0061, d2dd4f, 53f24e

This could cause:

- Port conflicts
- Multiple HMR instances
- Race conditions with localStorage

## Solutions

### Solution 1: Add a flag to prevent initial save

Use a ref to skip the save effect on first mount:

```typescript
const isFirstMount = useRef(true)

useEffect(() => {
    if (isFirstMount.current) {
        isFirstMount.current = false
        return
    }
    localStorage.setItem('debugSettings', JSON.stringify(settings))
    window.dispatchEvent(new CustomEvent('debugSettingsChanged', { detail: settings }))
}, [settings])
```

### Solution 2: Combine load and save logic

Load settings synchronously before component renders

### Solution 3: Kill duplicate dev servers

Clean up the 5 running dev servers to prevent conflicts

## Recommended Fix

Implement Solution 1 - it's already used for position persistence (lines 98-105), apply the same pattern to settings.

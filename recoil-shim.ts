/**
 * Recoil Compatibility Shim for React 19
 *
 * This file provides a drop-in replacement for 'recoil' package exports
 * by re-exporting from our compat.ts layer and providing minimal stubs
 * for features we don't use.
 *
 * Usage: Import from './recoil-shim' instead of 'recoil'
 */

// Import from compat to use in this file
import * as compat from './atoms/compat'

// Re-export our compat layer hooks and symbols
export {
    useRecoilState,
    useRecoilValue,
    useSetRecoilState,
    useRecoilCallback,
    // Export all the atom symbols from compat
    modalState,
    movieState,
    autoPlayWithSoundState,
    loadingState,
    listModalState,
    searchState,
    toastsState,
    searchHistoryState,
    recentSearchesState,
    userSessionState,
    sessionTypeState,
    activeSessionIdState,
    showDemoMessageState,
    contentLoadedSuccessfullyState,
} from './atoms/compat'

// Cache for created symbols to ensure consistency
const symbolCache = new Map<string, symbol>()

// Stub for atom() - returns the corresponding symbol from compat.ts or creates a unique symbol
export function atom<T>(config: { key: string; default: T; effects?: any[] }): symbol {
    // Map atom keys to compat symbols (with version suffixes)
    const keyMap: Record<string, symbol> = {
        // Core atoms in compat.ts
        modalState_v2: compat.modalState,
        modalState: compat.modalState,
        movieState_v2: compat.movieState,
        movieState: compat.movieState,
        autoPlayWithSoundState_v2: compat.autoPlayWithSoundState,
        autoPlayWithSoundState: compat.autoPlayWithSoundState,
        loadingState_v2: compat.loadingState,
        loadingState: compat.loadingState,
        listModalState_v1: compat.listModalState,
        listModalState: compat.listModalState,
        searchState_v4: compat.searchState,
        searchState: compat.searchState,
        toastsState_v2: compat.toastsState,
        toastsState: compat.toastsState,
        searchHistoryState_v2: compat.searchHistoryState,
        searchHistoryState: compat.searchHistoryState,
        recentSearchesState_v2: compat.recentSearchesState,
        recentSearchesState: compat.recentSearchesState,
        userSessionState_v2: compat.userSessionState,
        userSessionState: compat.userSessionState,
        sessionTypeState_v1: compat.sessionTypeState,
        sessionTypeState: compat.sessionTypeState,
        activeSessionIdState_v1: compat.activeSessionIdState,
        activeSessionIdState: compat.activeSessionIdState,
        showDemoMessageState_v2: compat.showDemoMessageState,
        showDemoMessageState: compat.showDemoMessageState,
        contentLoadedSuccessfullyState_v2: compat.contentLoadedSuccessfullyState,
        contentLoadedSuccessfullyState: compat.contentLoadedSuccessfullyState,
    }

    // Return mapped symbol if it exists
    if (keyMap[config.key]) {
        return keyMap[config.key]
    }

    // For unmapped atoms, create and cache a unique symbol
    if (!symbolCache.has(config.key)) {
        symbolCache.set(config.key, Symbol(config.key))
    }
    return symbolCache.get(config.key)!
}

// Stub for selector() - not actively used
export function selector<T>(config: { key: string; get: any }): symbol {
    return Symbol(config.key)
}

// Stub for SetterOrUpdater type (used in sessionManagerService.ts)
export type SetterOrUpdater<T> = (valOrUpdater: ((currVal: T) => T) | T) => void

// RecoilRoot stub for tests - just renders children
export function RecoilRoot({ children }: { children: React.ReactNode }): React.ReactElement {
    return children as React.ReactElement
}

// Default export (in case anything uses it)
export default {
    atom,
    selector,
    useRecoilState: compat.useRecoilState,
    useRecoilValue: compat.useRecoilValue,
    useSetRecoilState: compat.useSetRecoilState,
    useRecoilCallback: compat.useRecoilCallback,
    RecoilRoot,
}

/**
 * Custom hook for profile actions (debug "seed demo data").
 *
 * The Firebase-based seed system was removed during the Turso migration. These
 * handlers are no-op stubs that keep the consuming debug UI compiling; a
 * Drizzle-backed seed can be reintroduced later if demo population is needed.
 */

import { useDebugOperationsStore } from '../stores/debugOperationsStore'

export function useProfileActions() {
    const { isSeeding } = useDebugOperationsStore()

    const handleSeedData = async () => {
        console.warn('[useProfileActions] Demo seeding is not available (removed with Firebase).')
    }

    const handleSeedDataServerSide = async () => {
        console.warn('[useProfileActions] Demo seeding is not available (removed with Firebase).')
    }

    return {
        isSeeding,
        handleSeedData,
        handleSeedDataServerSide,
    }
}

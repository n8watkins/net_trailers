/**
 * Session manager atoms - partially re-exported from compat layer
 * Backed by Zustand stores, not Recoil
 *
 * Note: Some legacy atoms kept here for backwards compatibility
 * TODO: Migrate remaining atoms to Zustand stores
 */

// Session type enumeration
export type SessionType = 'guest' | 'authenticated' | 'initializing'

// Re-export atoms that are in compat layer
export { sessionTypeState, activeSessionIdState } from './compat'

// Legacy atoms - these should be migrated to Zustand stores
// For now, keeping them as simple state that can be imported
// These are not heavily used and will be deprecated
export const isSessionInitializedState = Symbol('isSessionInitializedState')
export const migrationAvailableState = Symbol('migrationAvailableState')
export const isTransitioningSessionState = Symbol('isTransitioningSessionState')

// Legacy selectors - not actively used
// Keeping for backwards compatibility only
export const hasActiveSessionSelector = Symbol('hasActiveSessionSelector')
export const currentSessionInfoSelector = Symbol('currentSessionInfoSelector')

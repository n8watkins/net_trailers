/**
 * DEPRECATED: This file is being phased out.
 *
 * UserPreferences and UserSession have been consolidated into types/shared.ts
 * to maintain a single source of truth.
 *
 * Please import from '../types/shared' instead:
 * - import { UserPreferences, UserSession } from '../types/shared'
 *
 * This file is kept temporarily for reference but should not be used.
 */

// Re-export from shared types for backwards compatibility
export type { UserPreferences, UserSession } from './shared'

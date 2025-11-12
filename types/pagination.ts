/**
 * Pagination Types
 *
 * Shared types for cursor-based pagination across Firestore queries
 */

import { DocumentSnapshot } from 'firebase/firestore'

/**
 * Generic paginated result type
 */
export interface PaginatedResult<T> {
    data: T[]
    lastDoc: DocumentSnapshot | null
    hasMore: boolean
    total?: number // Optional: total count if available
}

/**
 * Pagination options for queries
 */
export interface PaginationOptions {
    limit?: number
    startAfter?: DocumentSnapshot | null
}

/**
 * Helper to create pagination result
 */
export function createPaginatedResult<T>(
    data: T[],
    lastDoc: DocumentSnapshot | null,
    requestedLimit: number
): PaginatedResult<T> {
    return {
        data,
        lastDoc,
        hasMore: data.length === requestedLimit,
    }
}

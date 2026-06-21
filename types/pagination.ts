/**
 * Pagination Types
 *
 * Shared types for cursor-based pagination across queries.
 *
 * Note: The former Firestore-specific DocumentSnapshot cursor type has been
 * replaced with `unknown`. All current callers pass `null` for lastDoc, so
 * this is a no-op change in practice. If cursor-based pagination is needed in
 * the future, replace `unknown` with the appropriate cursor type for the
 * storage backend in use (e.g. a Turso row ID or ISO timestamp string).
 */

/**
 * Generic paginated result type
 */
export interface PaginatedResult<T> {
    data: T[]
    lastDoc: unknown | null
    hasMore: boolean
    total?: number // Optional: total count if available
}

/**
 * Pagination options for queries
 */
export interface PaginationOptions {
    limit?: number
    startAfter?: unknown | null
}

/**
 * Helper to create pagination result
 */
export function createPaginatedResult<T>(
    data: T[],
    lastDoc: unknown | null,
    requestedLimit: number
): PaginatedResult<T> {
    return {
        data,
        lastDoc,
        hasMore: data.length === requestedLimit,
    }
}

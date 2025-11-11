/**
 * Custom error types for Firestore operations
 */

export class FirestoreError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'FirestoreError'
    }
}

export class NotFoundError extends FirestoreError {
    constructor(resource: string, id?: string) {
        super(id ? `${resource} not found: ${id}` : `${resource} not found`)
        this.name = 'NotFoundError'
    }
}

export class UnauthorizedError extends FirestoreError {
    constructor(action: string) {
        super(`Not authorized to ${action}`)
        this.name = 'UnauthorizedError'
    }
}

export class ValidationError extends FirestoreError {
    constructor(message: string) {
        super(message)
        this.name = 'ValidationError'
    }
}

export class AlreadyExistsError extends FirestoreError {
    constructor(resource: string, identifier?: string) {
        super(
            identifier ? `${resource} already exists: ${identifier}` : `${resource} already exists`
        )
        this.name = 'AlreadyExistsError'
    }
}

export class RateLimitError extends FirestoreError {
    constructor(action: string, retryAfter?: number) {
        super(
            retryAfter
                ? `Rate limit exceeded for ${action}. Retry after ${retryAfter}ms`
                : `Rate limit exceeded for ${action}`
        )
        this.name = 'RateLimitError'
    }
}

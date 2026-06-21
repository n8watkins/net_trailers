/**
 * Authenticated fetch helpers.
 *
 * With Auth.js, authentication rides on the session cookie, which the browser
 * sends automatically for same-origin requests. There is no bearer token to
 * attach, so these helpers simply ensure cookies are included. Routes return
 * 401 when the session is missing/invalid; callers handle that response.
 */

export class AuthRequiredError extends Error {
    constructor(message = 'Authentication required') {
        super(message)
        this.name = 'AuthRequiredError'
    }
}

export async function authenticatedFetch(
    input: RequestInfo | URL,
    init: RequestInit = {}
): Promise<Response> {
    return fetch(input, {
        ...init,
        credentials: 'same-origin',
    })
}

/**
 * Kept for API compatibility. Behaves identically to `authenticatedFetch` now
 * that auth is cookie-based — the server decides what to do without a token.
 */
export async function fetchWithOptionalAuth(
    input: RequestInfo | URL,
    init: RequestInit = {}
): Promise<Response> {
    return fetch(input, {
        ...init,
        credentials: 'same-origin',
    })
}

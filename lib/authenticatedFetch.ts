import { auth } from '@/firebase'

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
    const user = auth.currentUser

    if (!user) {
        throw new AuthRequiredError()
    }

    const token = await user.getIdToken()
    const headers = new Headers(init.headers || {})
    headers.set('Authorization', `Bearer ${token}`)

    return fetch(input, {
        ...init,
        headers,
    })
}

export async function fetchWithOptionalAuth(
    input: RequestInfo | URL,
    init: RequestInit = {}
): Promise<Response> {
    const user = auth.currentUser

    if (!user) {
        return fetch(input, init)
    }

    const token = await user.getIdToken()
    const headers = new Headers(init.headers || {})
    headers.set('Authorization', `Bearer ${token}`)

    return fetch(input, {
        ...init,
        headers,
    })
}

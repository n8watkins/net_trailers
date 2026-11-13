import type { Session } from 'next-auth'

import { isAdminEmail } from '@/lib/admin'

/** The user row fields the session callback reads (Auth.js passes the whole row). */
interface SessionUser {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
}

/**
 * The session the app and GET /api/auth/session see (auth.ts callbacks.session):
 * who is signed in and when the session ends, nothing else. With database
 * sessions Auth.js passes the whole session row (with its token) and the whole
 * user row to the callback, and whatever it returns is sent to the browser, so
 * the answer is built field by field rather than spread.
 */
export function sessionPayload(session: { expires: Date | string }, user: SessionUser): Session {
    // When this session was created, for the admin fresh sign-in check
    // (lib/admin/guard.ts). The adapter passes the whole session row.
    const createdAt = (session as { createdAt?: number | null }).createdAt
    return {
        expires: session.expires as Session['expires'],
        user: {
            id: user.id,
            name: user.name ?? null,
            email: user.email ?? null,
            image: user.image ?? null,
            isAdmin: isAdminEmail(user.email),
            signedInAt: createdAt ?? null,
        },
    }
}

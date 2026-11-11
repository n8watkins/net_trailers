/**
 * The server-side admin check for admin API routes, with an optional fresh
 * sign-in requirement for dangerous actions (emailing people, running jobs,
 * deleting): the session must have been created in the last 15 minutes, or
 * the route answers 403 `reauth_required` and the page asks to sign in again.
 */

import { NextResponse } from 'next/server'

import { auth } from '@/auth'

export const FRESH_SIGN_IN_MS = 15 * 60 * 1000

export const REAUTH_REQUIRED = 'reauth_required'

/** Whether a session created at `signedInAt` still counts as a fresh sign-in. */
export function isFreshSignIn(
    signedInAt: number | null | undefined,
    now: number = Date.now()
): boolean {
    if (typeof signedInAt !== 'number' || !Number.isFinite(signedInAt)) return false
    const age = now - signedInAt
    return age >= -60_000 && age <= FRESH_SIGN_IN_MS
}

export type AdminActor = { userId: string; email: string | null }

export type AdminGuardResult =
    { ok: true; actor: AdminActor } | { ok: false; response: NextResponse }

/** 401 when signed out, 403 for non-admins, 403 `reauth_required` when `fresh` and stale. */
export async function requireAdmin(options: { fresh?: boolean } = {}): Promise<AdminGuardResult> {
    const session = await auth()
    const user = session?.user
    if (!user?.id) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
        }
    }
    if (!user.isAdmin) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'User is not an administrator' }, { status: 403 }),
        }
    }
    if (options.fresh && !isFreshSignIn(user.signedInAt)) {
        return {
            ok: false,
            response: NextResponse.json(
                {
                    error: 'This action needs a sign-in from the last 15 minutes. Sign in again.',
                    code: REAUTH_REQUIRED,
                },
                { status: 403 }
            ),
        }
    }
    return { ok: true, actor: { userId: user.id, email: user.email ?? null } }
}

/** A 400 for a request body that failed validation, without internals. */
export function badRequest(error = 'Invalid request body'): NextResponse {
    return NextResponse.json({ error }, { status: 400 })
}

/** A 500 that names the action, never the internal error. */
export function serverError(error: string): NextResponse {
    return NextResponse.json({ error }, { status: 500 })
}

/** The JSON body, or null when it is missing or not JSON. */
export async function readJson(request: Request): Promise<unknown> {
    try {
        return await request.json()
    } catch {
        return null
    }
}

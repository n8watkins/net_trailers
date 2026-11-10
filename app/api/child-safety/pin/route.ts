/**
 * /api/child-safety/pin
 *
 * All operations require authentication. The userId always comes from the
 * Auth.js session - clients cannot target another user's PIN.
 *
 * Supported:
 *   GET    /api/child-safety/pin           - hasPIN status (never returns the hash).
 *   POST   /api/child-safety/pin           - Set / replace PIN.
 *                                           Body: { pin: string }
 *   POST   /api/child-safety/pin?action=verify - Verify a PIN.
 *                                           Body: { pin: string }
 *   POST   /api/child-safety/pin?action=change - Change PIN (requires current + new).
 *                                           Body: { currentPin: string, newPin: string }
 *   DELETE /api/child-safety/pin           - Remove PIN (requires current PIN).
 *                                           Body: { pin: string }
 *
 * bcryptjs runs entirely server-side in this route (and in db/queries/childSafety.ts).
 * The hash is never returned in any response.
 *
 * Rate limiting: a naïve in-memory counter caps verify attempts at 5 per
 * 5-minute window per userId. For multi-instance deployments this should be
 * replaced with a Redis / Upstash counter; this implementation is correct for
 * single-server and Vercel edge-function usage where each cold start is isolated.
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { getPINStatus, hasPIN, setPIN, verifyPIN, clearPIN } from '@/db/queries/childSafety'
import { PIN_CONSTRAINTS } from '@/types/childSafety'
import { countEvent, readCount, resetLimit, windowInfo } from '@/lib/durableLimit'

/* -------------------------------------------------------------------------- */
/*  Failed-attempt limit (durable: a Map would not hold across Worker isolates) */
/* -------------------------------------------------------------------------- */

const RATE_WINDOW = { ms: PIN_CONSTRAINTS.RATE_LIMIT_DURATION * 1_000 } // 300 s
const MAX_ATTEMPTS = PIN_CONSTRAINTS.MAX_FAILED_ATTEMPTS
const attemptsKey = (userId: string) => `pin-fail:${userId}`

async function checkRateLimit(
    userId: string
): Promise<{ limited: boolean; retryAfterSeconds?: number }> {
    const failures = await readCount(attemptsKey(userId), RATE_WINDOW)
    if (failures < MAX_ATTEMPTS) return { limited: false }
    const endsAt = windowInfo(RATE_WINDOW).endsAt
    return {
        limited: true,
        retryAfterSeconds: Math.max(1, Math.ceil((endsAt - Date.now()) / 1_000)),
    }
}

async function incrementRateLimit(userId: string): Promise<void> {
    await countEvent(attemptsKey(userId), RATE_WINDOW)
}

async function resetRateLimit(userId: string): Promise<void> {
    await resetLimit(attemptsKey(userId), RATE_WINDOW)
}

/* -------------------------------------------------------------------------- */
/*  GET /api/child-safety/pin                                                  */
/* -------------------------------------------------------------------------- */

export const GET = withAuth(async (_request: NextRequest, userId: string) => {
    try {
        const status = await getPINStatus(userId)
        return NextResponse.json({ success: true, status })
    } catch (err) {
        console.error('[GET /api/child-safety/pin] error:', err)
        return NextResponse.json(
            { success: false, error: 'Failed to retrieve PIN status' },
            { status: 500 }
        )
    }
})

/* -------------------------------------------------------------------------- */
/*  POST /api/child-safety/pin                                                 */
/* -------------------------------------------------------------------------- */

export const POST = withAuth(async (request: NextRequest, userId: string) => {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') ?? 'set'

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!body || typeof body !== 'object') {
        return NextResponse.json({ success: false, error: 'Missing request body' }, { status: 400 })
    }

    const bodyObj = body as Record<string, unknown>

    // ── action=verify ─────────────────────────────────────────────────────────
    if (action === 'verify') {
        const { pin } = bodyObj
        if (typeof pin !== 'string' || !pin) {
            return NextResponse.json({ success: false, error: 'pin is required' }, { status: 400 })
        }

        // Rate-limit check.
        const rl = await checkRateLimit(userId)
        if (rl.limited) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Too many failed attempts. Try again in ${rl.retryAfterSeconds} seconds.`,
                    rateLimited: true,
                    retryAfterSeconds: rl.retryAfterSeconds,
                },
                {
                    status: 429,
                    headers: { 'Retry-After': String(rl.retryAfterSeconds) },
                }
            )
        }

        try {
            const result = await verifyPIN(userId, pin)
            if (result.success) {
                await resetRateLimit(userId)
                return NextResponse.json({ success: true })
            } else {
                await incrementRateLimit(userId)
                return NextResponse.json(
                    { success: false, error: result.error ?? 'Incorrect PIN' },
                    { status: 401 }
                )
            }
        } catch (err) {
            console.error('[POST /api/child-safety/pin verify] error:', err)
            return NextResponse.json(
                { success: false, error: 'Failed to verify PIN' },
                { status: 500 }
            )
        }
    }

    // ── action=change ─────────────────────────────────────────────────────────
    if (action === 'change') {
        const { currentPin, newPin } = bodyObj
        if (typeof currentPin !== 'string' || !currentPin) {
            return NextResponse.json(
                { success: false, error: 'currentPin is required' },
                { status: 400 }
            )
        }
        if (typeof newPin !== 'string' || !newPin) {
            return NextResponse.json(
                { success: false, error: 'newPin is required' },
                { status: 400 }
            )
        }
        if (currentPin === newPin) {
            return NextResponse.json(
                { success: false, error: 'New PIN must differ from current PIN' },
                { status: 400 }
            )
        }

        // Verify current PIN first.
        const rl = await checkRateLimit(userId)
        if (rl.limited) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Too many failed attempts. Try again in ${rl.retryAfterSeconds} seconds.`,
                    rateLimited: true,
                    retryAfterSeconds: rl.retryAfterSeconds,
                },
                {
                    status: 429,
                    headers: { 'Retry-After': String(rl.retryAfterSeconds) },
                }
            )
        }

        try {
            const verifyResult = await verifyPIN(userId, currentPin)
            if (!verifyResult.success) {
                await incrementRateLimit(userId)
                return NextResponse.json(
                    { success: false, error: verifyResult.error ?? 'Current PIN is incorrect' },
                    { status: 401 }
                )
            }

            // Current PIN verified - set the new one.
            await setPIN(userId, newPin)
            await resetRateLimit(userId)
            return NextResponse.json({ success: true })
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to change PIN'
            console.error('[POST /api/child-safety/pin change] error:', err)
            return NextResponse.json({ success: false, error: message }, { status: 500 })
        }
    }

    // ── action=set (default) ──────────────────────────────────────────────────
    const { pin } = bodyObj
    if (typeof pin !== 'string' || !pin) {
        return NextResponse.json({ success: false, error: 'pin is required' }, { status: 400 })
    }

    try {
        await setPIN(userId, pin)
        const status = await getPINStatus(userId)
        return NextResponse.json({ success: true, status }, { status: 201 })
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to set PIN'
        console.error('[POST /api/child-safety/pin set] error:', err)
        // Validation errors (wrong length, not numeric) get 400.
        if (
            message.includes('digits') ||
            message.includes('numbers') ||
            message.includes('required')
        ) {
            return NextResponse.json({ success: false, error: message }, { status: 400 })
        }
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
})

/* -------------------------------------------------------------------------- */
/*  DELETE /api/child-safety/pin                                               */
/* -------------------------------------------------------------------------- */

export const DELETE = withAuth(async (request: NextRequest, userId: string) => {
    let body: unknown
    try {
        body = await request.json()
    } catch {
        // Body is optional for DELETE in some clients.
        body = {}
    }

    const { pin } = (body as Record<string, unknown>) ?? {}

    if (typeof pin !== 'string' || !pin) {
        return NextResponse.json(
            { success: false, error: 'Current PIN must be provided to remove it' },
            { status: 400 }
        )
    }

    // Rate-limit check.
    const rl = await checkRateLimit(userId)
    if (rl.limited) {
        return NextResponse.json(
            {
                success: false,
                error: `Too many failed attempts. Try again in ${rl.retryAfterSeconds} seconds.`,
                rateLimited: true,
                retryAfterSeconds: rl.retryAfterSeconds,
            },
            {
                status: 429,
                headers: { 'Retry-After': String(rl.retryAfterSeconds) },
            }
        )
    }

    try {
        // Verify before deleting.
        const verifyResult = await verifyPIN(userId, pin)
        if (!verifyResult.success) {
            await incrementRateLimit(userId)
            return NextResponse.json(
                { success: false, error: verifyResult.error ?? 'Incorrect PIN' },
                { status: 401 }
            )
        }

        await clearPIN(userId)
        await resetRateLimit(userId)
        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[DELETE /api/child-safety/pin] error:', err)
        return NextResponse.json({ success: false, error: 'Failed to remove PIN' }, { status: 500 })
    }
})

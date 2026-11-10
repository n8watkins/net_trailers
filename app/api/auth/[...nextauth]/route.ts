import type { NextRequest } from 'next/server'

import { handlers } from '@/auth'
import { checkSignInTurnstile } from '@/lib/turnstile'

export const { GET } = handlers

/** A request for an email sign-in link must pass Turnstile first (lib/turnstile.ts). */
export async function POST(request: NextRequest) {
    const refused = await checkSignInTurnstile(request)
    if (refused) return refused
    return handlers.POST(request)
}

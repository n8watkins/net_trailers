/**
 * Cloudflare Email Service: the `send_email` binding `EMAIL` (wrangler.jsonc),
 * which may send only from EMAIL_FROM on n8builds.dev (a domain onboarded for
 * sending, so there is no API key). Every send goes through the email gate
 * (lib/email/gate.ts), which holds the caps; nothing else calls this.
 *
 * Off Workers (next dev, next start, tests) there is no binding, so the gate
 * reports email as not configured and sends nothing.
 */

import { cloudflareEnv } from '@/lib/cloudflare/env'

/** The sender address; wrangler.jsonc allows the binding only this one. */
export const EMAIL_FROM = process.env.EMAIL_FROM || 'nettrailers@n8builds.dev'

export interface OutgoingEmail {
    to: string
    from: { email: string; name: string }
    subject: string
    html: string
    text: string
    headers?: Record<string, string>
}

/** The part of the binding the app uses. */
export interface EmailBinding {
    send(message: OutgoingEmail): Promise<{ messageId?: string }>
}

export function emailBinding(): EmailBinding | undefined {
    return cloudflareEnv()?.EMAIL
}

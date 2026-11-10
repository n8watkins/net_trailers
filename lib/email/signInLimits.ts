/**
 * Limits on email sign-in links. Anyone can ask for a link to any address, so
 * each request spends from:
 *  - the address's daily count (EMAIL_SIGNIN_PER_ADDRESS_DAILY, default 5),
 *  - the caller's IP's daily count (EMAIL_SIGNIN_PER_IP_DAILY, default 20),
 *  - the site-wide email caps (lib/email/gate.ts).
 * The address and the IP are stored only as salted hashes. The IP comes from
 * CF-Connecting-IP, which Cloudflare sets and clients cannot forge; without it
 * (local development, tests) the per-IP rule is skipped.
 */

import { hashKey, readLimit, type LimitRule } from '@/lib/durableLimit'
import { reserveEmail } from './gate'

/** The `error` code the sign-in form shows as "too many sign-in emails". */
export const SIGN_IN_EMAIL_LIMIT_ERROR = 'EmailLimit'

export async function signInRules(email: string, headers: Headers): Promise<LimitRule[]> {
    const rules: LimitRule[] = [
        {
            key: `signin:addr:${await hashKey(email.trim().toLowerCase())}`,
            limit: readLimit('EMAIL_SIGNIN_PER_ADDRESS_DAILY', 5),
            window: 'day',
        },
    ]
    const ip = headers.get('cf-connecting-ip')?.trim()
    if (ip) {
        rules.push({
            key: `signin:ip:${await hashKey(ip)}`,
            limit: readLimit('EMAIL_SIGNIN_PER_IP_DAILY', 20),
            window: 'day',
        })
    }
    return rules
}

/** Spend one sign-in email for this address and caller; refused when any limit is used up. */
export async function reserveSignInEmail(email: string, headers: Headers, now?: Date) {
    return reserveEmail('sign-in', await signInRules(email, headers), now)
}

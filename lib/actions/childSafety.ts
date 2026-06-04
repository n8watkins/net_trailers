'use server'

/**
 * Server actions for managing Child Safety Mode
 *
 * SECURITY: Server actions bypass proxy.ts and must implement their own CSRF protection.
 * All state-changing server actions must validate origin using validateServerActionOrigin().
 */

import { headers } from 'next/headers'
import { setChildSafetyModeCookie } from '../childSafetyCookieServer'
import { validateServerActionOrigin } from '../csrfProtection'

/**
 * Toggle child safety mode
 * @param enabled - Whether to enable child safety mode
 * @throws Error if CSRF validation fails
 */
export async function toggleChildSafetyAction(enabled: boolean): Promise<void> {
    // CSRF protection - server actions don't go through proxy.ts
    const headersList = await headers()
    if (!validateServerActionOrigin(headersList)) {
        throw new Error('CSRF validation failed')
    }

    await setChildSafetyModeCookie(enabled)
}

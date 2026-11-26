'use server'

/**
 * Server actions for managing Child Safety Mode
 *
 * SECURITY: Server actions bypass proxy.ts and must implement their own CSRF protection.
 * All state-changing server actions must validate origin using validateServerActionOrigin().
 */

import { headers } from 'next/headers'
import { syncChildSafetyCookie } from '../childSafetyServer'
import { validateServerActionOrigin } from '../csrfProtection'

/**
 * Bring this browser's Child Safety cookie (what the server filters by once
 * the visitor signs out) in line with the signed-in account's stored setting.
 * It takes no value: the setting is read from the database, so nobody can call
 * it to switch filtering off (lib/childSafetyServer.ts). Before, it took the
 * value from the caller, so any visitor could clear a guest's mode with it.
 * @throws Error if CSRF validation fails
 */
export async function syncChildSafetyAction(): Promise<boolean> {
    // CSRF protection - server actions don't go through proxy.ts
    const headersList = await headers()
    if (!validateServerActionOrigin(headersList)) {
        throw new Error('CSRF validation failed')
    }

    return syncChildSafetyCookie()
}

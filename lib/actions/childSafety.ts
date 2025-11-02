'use server'

/**
 * Server actions for managing Child Safety Mode
 */

import { setChildSafetyModeCookie } from '../childSafetyCookie'

/**
 * Toggle child safety mode
 * @param enabled - Whether to enable child safety mode
 */
export async function toggleChildSafetyAction(enabled: boolean): Promise<void> {
    await setChildSafetyModeCookie(enabled)
}

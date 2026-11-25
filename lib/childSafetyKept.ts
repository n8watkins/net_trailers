/**
 * The answer the server gives when a save asked to turn a PIN-locked Child
 * Safety Mode off without a fresh PIN (lib/childSafetyLock.ts): the rest of the
 * save went through, the mode stayed on. Shared by the route and the client.
 */

/** The field `PUT /api/user/preferences` sets to true when it kept the mode on. */
export const CHILD_SAFETY_KEPT_FIELD = 'childSafetyKept'

/**
 * Thrown by the user store's updatePreferences when the user turned Child
 * Safety Mode off and the server kept it on, so the screen can put the switch
 * back and ask for the PIN again.
 */
export class ChildSafetyKeptError extends Error {
    constructor() {
        super('Child Safety Mode is still on: enter your PIN again to turn it off.')
        this.name = 'ChildSafetyKeptError'
    }
}

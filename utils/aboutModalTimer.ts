/**
 * About Modal Timer Utility
 * Manages automatic display of the About modal every 24 hours
 */

const ABOUT_MODAL_KEY = 'nettrailer_about_modal_last_shown'
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

/**
 * Check if 24 hours have passed since the About modal was last shown
 * @returns true if the modal should be shown, false otherwise
 */
export const shouldShowAboutModal = (): boolean => {
    if (typeof window === 'undefined') return false

    const lastShown = localStorage.getItem(ABOUT_MODAL_KEY)

    if (!lastShown) {
        // Never shown before, show it
        return true
    }

    const lastShownTime = parseInt(lastShown, 10)
    const currentTime = Date.now()
    const timeSinceLastShown = currentTime - lastShownTime

    return timeSinceLastShown >= TWENTY_FOUR_HOURS
}

/**
 * Mark the About modal as shown at the current time
 */
export const markAboutModalShown = (): void => {
    if (typeof window === 'undefined') return

    localStorage.setItem(ABOUT_MODAL_KEY, Date.now().toString())
}

/**
 * Reset the timer (for testing purposes)
 */
export const resetAboutModalTimer = (): void => {
    if (typeof window === 'undefined') return

    localStorage.removeItem(ABOUT_MODAL_KEY)
}

/**
 * Get the time remaining until the next auto-show (in milliseconds)
 * @returns milliseconds until next show, or 0 if should show now
 */
export const getTimeUntilNextShow = (): number => {
    if (typeof window === 'undefined') return 0

    const lastShown = localStorage.getItem(ABOUT_MODAL_KEY)

    if (!lastShown) {
        return 0 // Should show immediately
    }

    const lastShownTime = parseInt(lastShown, 10)
    const currentTime = Date.now()
    const timeSinceLastShown = currentTime - lastShownTime
    const timeRemaining = TWENTY_FOUR_HOURS - timeSinceLastShown

    return timeRemaining > 0 ? timeRemaining : 0
}

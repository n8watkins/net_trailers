/**
 * Detect common in-app browser webviews (Gmail, Facebook, Instagram, etc.).
 *
 * These embedded webviews are where OAuth often gets blocked and where
 * magic-link sign-in lands the session in the webview instead of the user's
 * real browser — so we warn the user to open the page in their default browser
 * before signing in. SSR-safe (returns false when navigator is unavailable).
 */

// Tokens that identify problematic in-app browsers / webviews.
const IN_APP_PATTERNS =
    /FBAN|FBAV|FB_IAB|Instagram|Line\/|Twitter|TwitterAndroid|Snapchat|LinkedInApp|Pinterest|MicroMessenger|GSA\/|; wv\)/i

export function isInAppBrowser(userAgent?: string): boolean {
    const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '')
    if (!ua) return false
    return IN_APP_PATTERNS.test(ua)
}

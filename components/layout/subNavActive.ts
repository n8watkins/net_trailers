/**
 * Whether a tab of the header's sub-navigation (Profile, Watch History, ...,
 * Settings) is the current one: its own page or any page under it. Every
 * /settings/... page lights Settings, every /collections/... page lights
 * Collections, /profile/polls lights Profile.
 */
export function isSubNavItemActive(href: string, pathname: string | null): boolean {
    if (!pathname) return false
    return pathname === href || pathname.startsWith(`${href}/`)
}

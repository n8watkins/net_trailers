import { isSubNavItemActive } from '../../../components/layout/subNavActive'

describe('isSubNavItemActive', () => {
    it('lights Settings on every settings page, not only Preferences', () => {
        for (const path of [
            '/settings',
            '/settings/preferences',
            '/settings/collections',
            '/settings/account',
        ]) {
            expect(isSubNavItemActive('/settings', path)).toBe(true)
        }
    })

    it('lights a tab for its own page and the pages under it only', () => {
        expect(isSubNavItemActive('/collections', '/collections/abc')).toBe(true)
        expect(isSubNavItemActive('/profile', '/profile/polls')).toBe(true)
        expect(isSubNavItemActive('/profile', '/profiles')).toBe(false)
        expect(isSubNavItemActive('/settings', '/')).toBe(false)
        expect(isSubNavItemActive('/settings', null)).toBe(false)
    })
})

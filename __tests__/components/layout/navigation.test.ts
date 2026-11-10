import fs from 'fs'
import path from 'path'
import {
    DESKTOP_START_NAV,
    PRIMARY_NAV,
    isNavItemActive,
    getNavItem,
} from '../../../components/layout/navigation'

describe('primary navigation', () => {
    it('lists the phone menu in the agreed order', () => {
        expect(PRIMARY_NAV.map((item) => item.label)).toEqual([
            'Home',
            'Genres',
            'Search',
            'Community',
            'Collections',
            'My Ratings',
            'Surprise Me!',
        ])
    })

    it('keeps desktop order: Home, Genres, Surprise Me after the logo', () => {
        expect(DESKTOP_START_NAV.map((item) => item.id)).toEqual(['home', 'genres', 'surprise'])
    })

    it('puts every profile-menu item in the desktop My Profile menu', () => {
        const profileMenu = fs.readFileSync(
            path.join(__dirname, '../../../components/content/ProfileDropdown.tsx'),
            'utf8'
        )
        for (const item of PRIMARY_NAV.filter((entry) => entry.desktop === 'profile-menu')) {
            expect(profileMenu).toContain(`href="${item.href}"`)
        }
    })

    it('marks the current page', () => {
        expect(isNavItemActive(getNavItem('home'), '/')).toBe(true)
        expect(isNavItemActive(getNavItem('home'), '/search')).toBe(false)
        expect(isNavItemActive(getNavItem('community'), '/community/polls')).toBe(true)
        expect(isNavItemActive(getNavItem('collections'), '/collections/watch-later')).toBe(true)
    })
})

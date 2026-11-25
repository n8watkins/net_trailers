import {
    buildTourSteps,
    getPanePosition,
    TOTAL_TOUR_STEPS,
    TOUR,
    type TourEnvironment,
} from '../../constants/tourSteps'

const desktopUser: TourEnvironment = { isGuest: false, canHover: true, hasShortcuts: true }
const phoneGuest: TourEnvironment = { isGuest: true, canHover: false, hasShortcuts: false }

const byId = (env: TourEnvironment, id: string) => buildTourSteps(env).find((s) => s.id === id)!

describe('tour steps', () => {
    it('has the same steps, in the same order, for every visitor', () => {
        const ids = buildTourSteps(desktopUser).map((s) => s.id)
        expect(buildTourSteps(phoneGuest).map((s) => s.id)).toEqual(ids)
        expect(ids).toHaveLength(TOTAL_TOUR_STEPS)
        expect(ids[0]).toBe('welcome')
        expect(ids[ids.length - 1]).toBe('complete')
    })

    it('mentions shortcuts and hover only where they work', () => {
        for (const step of buildTourSteps(phoneGuest)) {
            expect(step.description).not.toMatch(/Alt\+|hover/i)
        }
        expect(byId(desktopUser, 'search-basic').description).toMatch(/Alt\+\//)
        expect(byId(desktopUser, 'browse-quick-actions').description).toMatch(/hover/i)
        // Nothing promises a shortcut that opens the tour (Alt+T opens Help)
        for (const step of buildTourSteps(desktopUser)) {
            expect(step.description).not.toMatch(/Alt\+T/)
        }
    })

    it('does not ask for clicks the tour overlay blocks', () => {
        for (const env of [desktopUser, phoneGuest]) {
            for (const step of buildTourSteps(env)) {
                if (/\b(click|tap|hover)\b/i.test(step.description)) {
                    expect(step.description).toMatch(/after the tour/i)
                }
            }
        }
    })

    it('points phones at the visible search button and guests at their menu', () => {
        expect(byId(phoneGuest, 'search-basic').targets).toContain(
            'header button[aria-label="Search"]'
        )
        expect(byId(phoneGuest, 'search-filters').targets).toContain(
            'header button[aria-label="Search"]'
        )
        expect(byId(phoneGuest, 'hub-avatar').targets).toEqual([
            'header button[aria-label="User menu"]',
        ])
        expect(byId(desktopUser, 'hub-avatar').targets).toEqual(['[data-tour="avatar-button"]'])
        expect(byId(phoneGuest, 'hub-avatar').description).toMatch(/sign in/i)
    })

    it('says where to take the tour again, truthfully for guests', () => {
        expect(byId(phoneGuest, 'complete').description).toMatch(/About this project/)
        expect(byId(phoneGuest, 'complete').description).not.toMatch(/Help/)
        expect(byId(desktopUser, 'complete').description).toMatch(/Help & tutorial/)
    })

    it('maps a global step to its feature and pane', () => {
        expect(getPanePosition(0).isWelcome).toBe(true)
        expect(getPanePosition(TOTAL_TOUR_STEPS - 1).isComplete).toBe(true)
        expect(getPanePosition(2)).toEqual({
            featureIndex: 0,
            paneIndexInFeature: 1,
            isWelcome: false,
            isComplete: false,
        })
        expect(TOUR.features[0].panes).toHaveLength(2)
    })
})

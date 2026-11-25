import { act, fireEvent, render, screen, within } from '@testing-library/react'
import TutorialModal, { DETAIL_FADE_MS } from '../../../components/modals/TutorialModal'
import { LayoutProvider } from '../../../contexts/LayoutContext'
import { HELP_CATEGORIES, HELP_TILES } from '../../../constants/helpContent'

let isGuest = false
const openAuthModal = jest.fn()
const openModal = jest.fn()

jest.mock('../../../hooks/useAuthStatus', () => ({
    useAuthStatus: () => ({ isGuest, isAuthenticated: !isGuest, isInitialized: true }),
}))
jest.mock('../../../hooks/useChildSafety', () => ({
    useChildSafety: () => ({ isEnabled: false }),
}))
jest.mock('../../../hooks/useToast', () => ({
    useToast: () => ({ showError: jest.fn() }),
}))
jest.mock('../../../stores/sessionStore', () => ({
    useSessionStore: (select: (state: { getUserId: () => string }) => unknown) =>
        select({ getUserId: () => 'user-1' }),
}))
jest.mock('../../../stores/modalStore', () => ({
    useModalStore: (select: (state: object) => unknown) => select({ openAuthModal, openModal }),
}))

function renderHelp(props: Partial<React.ComponentProps<typeof TutorialModal>> = {}) {
    const onClose = jest.fn()
    const onStartTour = jest.fn()
    const onOpenAboutModal = jest.fn()
    const onOpenKeyboardShortcuts = jest.fn()
    const utils = render(
        <LayoutProvider value={{ onOpenAboutModal, onOpenKeyboardShortcuts }}>
            <TutorialModal
                isOpen
                onClose={onClose}
                onStartTour={onStartTour}
                onOpenWelcome={jest.fn()}
                {...props}
            />
        </LayoutProvider>
    )
    return { onClose, onStartTour, onOpenAboutModal, onOpenKeyboardShortcuts, ...utils }
}

const tile = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) })
const detail = () => screen.getByTestId('help-detail')

// jsdom reports touch support; take it away so the window sees a keyboard device
let touchOwner: object | null = null
let touchDescriptor: PropertyDescriptor | undefined
beforeAll(() => {
    let owner: object | null = window
    while (owner && !Object.prototype.hasOwnProperty.call(owner, 'ontouchstart')) {
        owner = Object.getPrototypeOf(owner)
    }
    if (owner) {
        touchOwner = owner
        touchDescriptor = Object.getOwnPropertyDescriptor(owner, 'ontouchstart')
        delete (owner as Record<string, unknown>).ontouchstart
    }
})
afterAll(() => {
    if (touchOwner && touchDescriptor) {
        Object.defineProperty(touchOwner, 'ontouchstart', touchDescriptor)
    }
})

beforeEach(() => {
    isGuest = false
    jest.clearAllMocks()
})

describe('TutorialModal (Help)', () => {
    it('renders nothing when closed', () => {
        render(<TutorialModal isOpen={false} onClose={jest.fn()} />)
        expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('is a labelled modal dialog that takes focus', () => {
        renderHelp()
        const dialog = screen.getByRole('dialog', { name: /NetTrailers\s*Help/ })
        expect(dialog.getAttribute('aria-modal')).toBe('true')
        expect(document.activeElement).toBe(dialog)
    })

    it('shows the four headings, each over its tiles, with no tabs and no emoji', () => {
        renderHelp()
        expect(screen.queryByRole('tab')).toBeNull()
        for (const category of HELP_CATEGORIES) {
            const group = screen.getByRole('group', { name: category.title })
            const names = within(group)
                .getAllByRole('button')
                .map((b) => b.getAttribute('data-help-tile'))
            expect(names).toEqual(category.tiles.map((t) => t.id))
        }
        expect(HELP_CATEGORIES.map((c) => c.title)).toEqual([
            'Search',
            'Your library',
            'Community',
            'Profile',
        ])
        const text = screen.getByRole('dialog').textContent ?? ''
        expect(text).not.toMatch(/\p{Extended_Pictographic}/u)
        expect(text).not.toMatch(/Portfolio project showcasing|Unlock the Full Experience/)
    })

    it('selecting a tile fades its line in and points the link at it', () => {
        jest.useFakeTimers()
        try {
            renderHelp()
            expect(tile('Search').getAttribute('aria-pressed')).toBe('true')
            fireEvent.click(tile('Watch history'))
            expect(tile('Watch history').getAttribute('aria-pressed')).toBe('true')
            expect(tile('Search').getAttribute('aria-pressed')).toBe('false')
            // The old line is still fading out, but the link already follows the new tile
            expect(detail().textContent).toMatch(/header|people/i)
            expect(within(detail()).getByRole('link', { name: /Open/ }).getAttribute('href')).toBe(
                '/history'
            )
            act(() => {
                jest.advanceTimersByTime(DETAIL_FADE_MS)
            })
            expect(detail().textContent).toMatch(/Every title you have opened/)
            const open = within(detail()).getByRole('link', { name: /Open/ })
            expect(open.getAttribute('href')).toBe('/history')
        } finally {
            jest.useRealTimers()
        }
    })

    it('every page link goes to a real route and closes the window', () => {
        jest.useFakeTimers()
        try {
            const { onClose } = renderHelp()
            const expected: Record<string, string> = {
                like: '/ratings',
                'watch-later': '/collections/watch-later',
                collections: '/collections',
                history: '/history',
                rankings: '/community/rankings',
                forums: '/community/threads',
                'public-profile': '/users/user-1',
                'child-safety': '/settings/preferences',
            }
            for (const [id, href] of Object.entries(expected)) {
                const name = HELP_TILES.find((t) => t.id === id)!.name
                fireEvent.click(tile(name))
                act(() => {
                    jest.advanceTimersByTime(DETAIL_FADE_MS)
                })
                const open = within(detail()).getByRole('link', { name: /Open/ })
                expect(open.getAttribute('href')).toBe(href)
            }
            fireEvent.click(within(detail()).getByRole('link', { name: /Open/ }))
            expect(onClose).toHaveBeenCalledTimes(1)
        } finally {
            jest.useRealTimers()
        }
    })

    it('guests see every tile; only the public profile is locked and offers Sign in', () => {
        isGuest = true
        jest.useFakeTimers()
        try {
            const { onClose } = renderHelp()
            expect(screen.getAllByRole('button', { name: /needs an account/ })).toHaveLength(1)
            expect(tile('Public profile').textContent).toMatch(/needs an account/)
            fireEvent.click(tile('Public profile'))
            act(() => {
                jest.advanceTimersByTime(DETAIL_FADE_MS)
            })
            expect(within(detail()).queryByRole('link')).toBeNull()
            fireEvent.click(within(detail()).getByRole('button', { name: /Sign in/ }))
            expect(onClose).toHaveBeenCalled()
            expect(openAuthModal).toHaveBeenCalledWith('signin')
        } finally {
            jest.useRealTimers()
        }
    })

    it('guests get the guest wording where it differs', () => {
        isGuest = true
        jest.useFakeTimers()
        try {
            renderHelp()
            fireEvent.click(tile('Watch later'))
            act(() => {
                jest.advanceTimersByTime(DETAIL_FADE_MS)
            })
            expect(detail().textContent).toMatch(/kept on this device/)
            expect(within(detail()).getByRole('link', { name: /Open/ })).toBeTruthy()
        } finally {
            jest.useRealTimers()
        }
    })

    it('Start tour closes the window, then starts the tour (for guests too)', () => {
        isGuest = true
        const calls: string[] = []
        const onClose = jest.fn(() => calls.push('close'))
        const onStartTour = jest.fn(() => calls.push('tour'))
        renderHelp({ onClose, onStartTour })
        fireEvent.click(screen.getByRole('button', { name: 'Start tour' }))
        expect(calls).toEqual(['close', 'tour'])
    })

    it('switches instantly when the visitor asks for reduced motion', () => {
        const matchMedia = window.matchMedia
        window.matchMedia = jest.fn().mockImplementation((query: string) => ({
            matches: query.includes('reduce'),
            media: query,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
        })) as unknown as typeof window.matchMedia
        try {
            renderHelp()
            fireEvent.click(tile('Rankings'))
            expect(detail().textContent).toMatch(/Rank your top 10/)
        } finally {
            window.matchMedia = matchMedia
        }
    })

    it('tiles work from the keyboard: arrows move, Home and End jump', () => {
        renderHelp()
        const tiles = screen.getAllByRole('button').filter((b) => b.hasAttribute('data-help-tile'))
        tiles[0].focus()
        fireEvent.keyDown(tiles[0], { key: 'ArrowRight' })
        expect(document.activeElement).toBe(tiles[1])
        fireEvent.keyDown(tiles[1], { key: 'ArrowLeft' })
        expect(document.activeElement).toBe(tiles[0])
        fireEvent.keyDown(tiles[0], { key: 'ArrowUp' })
        expect(document.activeElement).toBe(tiles[tiles.length - 1])
        fireEvent.keyDown(tiles[tiles.length - 1], { key: 'Home' })
        expect(document.activeElement).toBe(tiles[0])
        fireEvent.keyDown(tiles[0], { key: 'End' })
        expect(document.activeElement).toBe(tiles[tiles.length - 1])
    })

    it('closes on Escape and from the close button', () => {
        const { onClose } = renderHelp()
        fireEvent.keyDown(document, { key: 'Escape' })
        fireEvent.click(screen.getByRole('button', { name: 'Close help' }))
        expect(onClose).toHaveBeenCalledTimes(2)
    })

    it('traps Tab inside the dialog in both directions', () => {
        renderHelp()
        const close = screen.getByRole('button', { name: 'Close help' })
        const last = screen.getByRole('button', { name: 'Shortcuts' })
        last.focus()
        fireEvent.keyDown(document, { key: 'Tab' })
        expect(document.activeElement).toBe(close)
        close.focus()
        fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
        expect(document.activeElement).toBe(last)
    })

    it('About this project closes Help and opens About', () => {
        const { onClose, onOpenAboutModal } = renderHelp()
        fireEvent.click(screen.getByRole('button', { name: 'About this project' }))
        expect(onClose).toHaveBeenCalled()
        expect(onOpenAboutModal).toHaveBeenCalled()
    })

    it('hides Shortcuts on touch or narrow screens and shows it with a keyboard', () => {
        renderHelp()
        // jsdom is 1024 wide with no touch: a keyboard device
        expect(screen.getByRole('button', { name: 'Shortcuts' })).toBeTruthy()
        act(() => {
            Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 })
            window.dispatchEvent(new Event('resize'))
        })
        expect(screen.queryByRole('button', { name: 'Shortcuts' })).toBeNull()
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 })
    })
})

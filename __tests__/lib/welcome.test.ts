import {
    WELCOME_SEEN_KEY,
    hasSeenWelcome,
    isWelcomeSuppressedPath,
    markWelcomeSeen,
} from '../../lib/welcome'

describe('first-visit welcome', () => {
    it('shows once: unseen until marked, then seen', () => {
        const store = new Map<string, string>()
        const storage = {
            getItem: (k: string) => store.get(k) ?? null,
            setItem: (k: string, v: string) => void store.set(k, v),
        }
        expect(hasSeenWelcome(storage)).toBe(false)
        markWelcomeSeen(storage)
        expect(store.has(WELCOME_SEEN_KEY)).toBe(true)
        expect(hasSeenWelcome(storage)).toBe(true)
    })

    it('never nags when storage is blocked', () => {
        const blocked = {
            getItem: () => {
                throw new Error('blocked')
            },
            setItem: () => {
                throw new Error('blocked')
            },
        }
        expect(hasSeenWelcome(blocked)).toBe(true)
        expect(() => markWelcomeSeen(blocked)).not.toThrow()
        expect(hasSeenWelcome(null)).toBe(true)
    })

    it('stays out of the way on sign-in, legal and shared pages', () => {
        expect(isWelcomeSuppressedPath('/')).toBe(false)
        expect(isWelcomeSuppressedPath('/search')).toBe(false)
        expect(isWelcomeSuppressedPath('/auth/verify-email')).toBe(true)
        expect(isWelcomeSuppressedPath('/privacy')).toBe(true)
        expect(isWelcomeSuppressedPath('/shared/abc')).toBe(true)
    })
})

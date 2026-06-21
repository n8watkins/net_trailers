import '@testing-library/jest-dom'

// Mock next/navigation (App Router)
jest.mock('next/navigation', () => ({
    useRouter() {
        return {
            push: jest.fn(),
            replace: jest.fn(),
            prefetch: jest.fn().mockResolvedValue(undefined),
            back: jest.fn(),
            forward: jest.fn(),
            refresh: jest.fn(),
        }
    },
    usePathname() {
        return '/'
    },
    useSearchParams() {
        return new URLSearchParams()
    },
    useParams() {
        return {}
    },
}))

// Mock Auth.js client hooks (default: signed out)
jest.mock('next-auth/react', () => ({
    __esModule: true,
    useSession: () => ({ data: null, status: 'unauthenticated' }),
    signIn: jest.fn(),
    signOut: jest.fn(),
    SessionProvider: ({ children }) => children,
}))

// Environment variables for the Turso + Auth.js stack
// (in-memory libSQL so importing the db client never throws in tests)
process.env.TURSO_DATABASE_URL = 'file::memory:'
process.env.AUTH_SECRET = 'test-auth-secret'
process.env.AUTH_GITHUB_ID = 'test-github-id'
process.env.AUTH_GITHUB_SECRET = 'test-github-secret'
process.env.ADMIN_GITHUB_LOGIN = 'test-admin'
process.env.TMDB_API_KEY = 'test-tmdb-api-key'
process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}))

// Mock matchMedia (only in jsdom environment)
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: jest.fn(), // deprecated
            removeListener: jest.fn(), // deprecated
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
        })),
    })
}

import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
    interface Session {
        user: {
            id: string
            githubLogin?: string | null
            isAdmin?: boolean
        } & DefaultSession['user']
    }

    interface User {
        githubLogin?: string | null
    }
}

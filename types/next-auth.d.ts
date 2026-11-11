import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
    interface Session {
        user: {
            id: string
            isAdmin?: boolean
            /** When this session was created (epoch ms); null for older sessions. */
            signedInAt?: number | null
        } & DefaultSession['user']
    }
}

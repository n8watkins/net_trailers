import type { Metadata } from 'next'
import { auth } from '@/auth'
import SettingsFrame from './_components/SettingsFrame'

export const metadata: Metadata = {
    title: 'Settings - NetTrailers',
}

/**
 * Reads the session on the server for the settings pages only, so a hard load
 * renders the whole frame (title, menu, the section's heading) at once and the
 * browser does not wait for GET /api/auth/session to learn who is visiting.
 *
 * Without a session cookie this costs nothing (Auth.js answers null without a
 * database read), and the page is the same for every signed-out visitor, which
 * is what lets the Worker keep it in its edge cache (worker/edgeCache.ts). A
 * request with a session cookie is never served from that cache.
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
    const session = await auth()
    return <SettingsFrame initialSession={session ?? null}>{children}</SettingsFrame>
}

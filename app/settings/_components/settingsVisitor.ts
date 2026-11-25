'use client'

import { createContext, useContext } from 'react'

/**
 * Whether the settings visitor is signed in, known from the first server
 * render (app/settings/layout.tsx reads the session) and kept current by
 * SettingsFrame. Panels use it to lay out guest or account content before the
 * client session store has started, so nothing appears late and pushes the
 * rest down (the guest banner, the account-only controls).
 */
export interface SettingsVisitor {
    signedIn: boolean
    /** Name, email and picture of the signed-in visitor, for the account panel. */
    account: { name: string | null; email: string | null; image: string | null } | null
}

export const SettingsVisitorContext = createContext<SettingsVisitor>({
    signedIn: false,
    account: null,
})

export function useSettingsVisitor() {
    return useContext(SettingsVisitorContext)
}

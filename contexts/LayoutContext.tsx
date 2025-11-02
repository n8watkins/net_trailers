'use client'

import { createContext, useContext } from 'react'

interface LayoutContextType {
    onOpenAboutModal?: () => void
    onOpenTutorial?: () => void
    onOpenKeyboardShortcuts?: () => void
}

const LayoutContext = createContext<LayoutContextType>({})

export const useLayoutContext = () => useContext(LayoutContext)

export const LayoutProvider = LayoutContext.Provider

import { create } from 'zustand'

// UI store state interface
export interface UIStoreState {
    // Auth mode for login/register toggle
    authMode: 'login' | 'register' | 'guest'

    // Demo messaging visibility
    showDemoMessage: boolean

    // Content loading success flag
    contentLoadedSuccessfully: boolean
}

// UI store actions interface
export interface UIStoreActions {
    setAuthMode: (mode: 'login' | 'register' | 'guest') => void
    setShowDemoMessage: (show: boolean) => void
    setContentLoadedSuccessfully: (loaded: boolean) => void
}

export type UIStore = UIStoreState & UIStoreActions

export const useUIStore = create<UIStore>((set) => ({
    // Initial state
    authMode: 'login',
    showDemoMessage: true,
    contentLoadedSuccessfully: false,

    // Actions
    setAuthMode: (mode: 'login' | 'register' | 'guest') => {
        set({ authMode: mode })
    },

    setShowDemoMessage: (show: boolean) => {
        set({ showDemoMessage: show })
    },

    setContentLoadedSuccessfully: (loaded: boolean) => {
        set({ contentLoadedSuccessfully: loaded })
    },
}))

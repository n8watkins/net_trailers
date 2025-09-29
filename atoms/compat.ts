/**
 * Compatibility shim for Recoil to Zustand migration
 * This provides a temporary bridge to get the app working while migration continues
 */

import { useAppStore } from '../stores/appStore'
import { useSessionStore } from '../stores/sessionStore'
import { useSessionData } from '../hooks/useSessionData'

// Modal state compatibility
export const modalState = null // Placeholder for type checking

export const useRecoilState = (atom: any) => {
    if (atom === modalState) {
        const { modal, openModal, closeModal } = useAppStore()
        return [
            modal.isOpen,
            (value: boolean) => (value ? openModal(modal.content || ({} as any)) : closeModal()),
        ]
    }
    // Add other atom mappings as needed
    throw new Error(`Unmapped atom in compatibility shim: ${atom}`)
}

export const useRecoilValue = (atom: any) => {
    const [value] = useRecoilState(atom)
    return value
}

// Common atom exports for compatibility
export const movieState = null
export const autoPlayWithSoundState = null
export const loadingState = null
export const listModalState = null
export const searchState = null
export const userSessionState = null
export const sessionTypeState = null
export const activeSessionIdState = null

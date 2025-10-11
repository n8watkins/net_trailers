import { atom } from 'recoil'

export interface AuthModalState {
    isOpen: boolean
    mode: 'signin' | 'signup'
}

export const authModalState = atom<AuthModalState>({
    key: 'authModalState_v1',
    default: {
        isOpen: false,
        mode: 'signin',
    },
})

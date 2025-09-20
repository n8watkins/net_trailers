import { atom } from 'recoil'

export interface AppError {
    id: string
    type: 'auth' | 'api' | 'network' | 'validation'
    message: string
    details?: string
    timestamp: number
    dismissed?: boolean
}

export const errorsState = atom<AppError[]>({
    key: 'errorsState_v2',
    default: [],
})

export const loadingState = atom<boolean>({
    key: 'loadingState_v2',
    default: false,
})

export const globalErrorState = atom<string | null>({
    key: 'globalErrorState_v2',
    default: null,
})
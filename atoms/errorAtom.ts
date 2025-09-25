import { atom } from 'recoil'

export const loadingState = atom<boolean>({
    key: 'loadingState_v2',
    default: false,
})

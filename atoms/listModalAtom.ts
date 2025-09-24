import { atom } from 'recoil'
import { Content } from '../typings'

export interface ListModalState {
    isOpen: boolean
    content: Content | null
}

export const listModalState = atom<ListModalState>({
    key: 'listModalState_v1',
    default: {
        isOpen: false,
        content: null,
    },
})

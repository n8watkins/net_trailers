import { DocumentData } from 'firebase/firestore'
import { atom } from 'recoil'
import { Content } from '../typings'

export const modalState = atom({
    key: 'modalState',
    default: false,
})

// Renamed to contentState but keeping movieState key for backward compatibility
export const movieState = atom<Content | DocumentData | null>({
    key: 'movieState',
    default: null,
})

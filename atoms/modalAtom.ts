import { DocumentData } from 'firebase/firestore'
import { atom } from 'recoil'
import { Content } from '../typings'

export const modalState = atom({
    key: 'modalState_v2',
    default: false,
})

// Renamed to contentState but keeping movieState key for backward compatibility
export const movieState = atom<Content | DocumentData | null>({
    key: 'movieState_v2',
    default: null,
})

// Track whether to start video with sound enabled
export const autoPlayWithSoundState = atom({
    key: 'autoPlayWithSoundState_v2',
    default: false,
})

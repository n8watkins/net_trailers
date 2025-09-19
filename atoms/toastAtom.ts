import { atom } from 'recoil'
import { ToastMessage } from '../components/Toast'

export const toastsState = atom<ToastMessage[]>({
    key: 'toastsState',
    default: []
})
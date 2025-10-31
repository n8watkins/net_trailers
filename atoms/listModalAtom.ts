/**
 * List modal state atom - re-exported from compat layer
 * Backed by Zustand stores, not Recoil
 */
import { Content } from '../typings'

export interface ListModalState {
    isOpen: boolean
    content: Content | null
}

export { listModalState } from './compat'

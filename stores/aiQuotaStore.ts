import { create } from 'zustand'

/** Mirrors lib/aiQuota.ts AiQuota (client side). */
export interface AiQuotaView {
    remaining: number
    limit: number
    exhausted: 'visitor' | 'global' | null
    resetsAt: string
}

interface AiQuotaStore {
    quota: AiQuotaView | null
    /** Load the visitor's quota (spends nothing). Hidden if the lookup fails. */
    refresh: () => Promise<void>
    /** Update from a quota object returned by an AI route. */
    setQuota: (quota: AiQuotaView | null | undefined) => void
}

export const useAiQuotaStore = create<AiQuotaStore>((set) => ({
    quota: null,
    refresh: async () => {
        try {
            const response = await fetch('/api/ai/quota', { cache: 'no-store' })
            set({ quota: response.ok ? ((await response.json()) as AiQuotaView) : null })
        } catch {
            set({ quota: null })
        }
    },
    setQuota: (quota) => {
        if (quota && typeof quota.remaining === 'number') {
            set({
                quota: {
                    remaining: quota.remaining,
                    limit: quota.limit,
                    exhausted: quota.exhausted,
                    resetsAt: quota.resetsAt,
                },
            })
        }
    },
}))

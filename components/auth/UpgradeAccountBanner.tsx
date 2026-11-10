import { useModalStore } from '../../stores/modalStore'

/**
 * One-line sign-in prompt shown to guests above settings sections.
 */
export function UpgradeAccountBanner() {
    const openAuthModal = useModalStore((state) => state.openAuthModal)

    return (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3">
            <p className="text-sm text-gray-300">
                Browsing as a guest. Sign in to sync your settings across devices.
            </p>
            <button
                type="button"
                onClick={() => openAuthModal('signin')}
                className="shrink-0 rounded-md bg-amber-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400"
            >
                Sign in
            </button>
        </div>
    )
}

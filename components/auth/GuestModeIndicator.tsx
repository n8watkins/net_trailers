import { useAuthStatus } from '../../hooks/useAuthStatus'
import { useModalStore } from '../../stores/modalStore'

/**
 * Plain "Sign in" button shown in the navbar while browsing as a guest
 */
export function GuestModeIndicator() {
    const { isGuest } = useAuthStatus()
    const openAuthModal = useModalStore((state) => state.openAuthModal)

    // Only render if user is a guest
    if (!isGuest) {
        return null
    }

    return (
        <button
            type="button"
            onClick={() => openAuthModal('signin')}
            className="whitespace-nowrap rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
            Sign in
        </button>
    )
}

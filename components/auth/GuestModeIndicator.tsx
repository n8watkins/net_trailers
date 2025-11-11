import { UserCircleIcon, SparklesIcon } from '@heroicons/react/24/solid'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import { useAppStore } from '../../stores/appStore'

/**
 * Guest Mode indicator with flashy sign-in CTA
 * Displays in navbar when browsing as a guest
 */
export function GuestModeIndicator() {
    const { isGuest } = useAuthStatus()
    const openAuthModal = useAppStore((state) => state.openAuthModal)

    // Only render if user is a guest
    if (!isGuest) {
        return null
    }

    const handleSignIn = () => {
        openAuthModal('signin')
    }

    return (
        <button
            onClick={handleSignIn}
            className="flex flex-col items-center justify-center px-4 py-2.5 bg-gradient-to-br from-[#1a0a0a] via-[#200505] to-[#1a0a0a] border-2 border-red-600/60 hover:border-red-500 hover:bg-gradient-to-br hover:from-[#250a0a] hover:via-[#2a0808] hover:to-[#250a0a] rounded-lg transition-all duration-200 shadow-lg hover:shadow-red-500/30 group"
            aria-label="Sign in to unlock more features"
        >
            {/* Top line: Guest Mode with avatar */}
            <div className="flex items-center space-x-2 mb-1">
                <UserCircleIcon className="w-5 h-5 text-red-400" />
                <span className="text-base font-bold text-gray-100 whitespace-nowrap">
                    Guest Mode
                </span>
            </div>

            {/* Bottom line: CTA with sparkles */}
            <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-red-400 group-hover:text-red-300 transition-colors whitespace-nowrap">
                    Sign in to do more!
                </span>
                <SparklesIcon className="w-3.5 h-3.5 text-yellow-400 group-hover:scale-110 transition-transform flex-shrink-0" />
            </div>
        </button>
    )
}

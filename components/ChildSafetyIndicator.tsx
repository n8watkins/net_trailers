import { ShieldCheckIcon } from '@heroicons/react/24/solid'
import { useChildSafety } from '../hooks/useChildSafety'
import { useAuthStatus } from '../hooks/useAuthStatus'
import { useRecoilState } from 'recoil'
import { authModalState } from '../atoms/authModalAtom'

/**
 * Visual indicator that displays when Child Safety Mode is active
 * Shows as a subtle badge in the navbar
 *
 * ADVANCED FEATURE: Requires authentication
 * - For authenticated users: Indicates Child Safety Mode is active
 * - For guests: Clicking shows auth modal to sign up for this feature
 *
 * FUTURE FEATURE TODO:
 * - Add PIN protection to prevent children from disabling Child Safety Mode
 * - Implement PIN creation/change functionality in settings
 * - Store PIN securely (hashed) in user preferences
 * - Require PIN to turn off Child Safety Mode or change settings
 */
export function ChildSafetyIndicator() {
    const { isEnabled, isLoading } = useChildSafety()
    const { isGuest } = useAuthStatus()
    const [authModal, setAuthModal] = useRecoilState(authModalState)

    // Don't render if loading or disabled
    if (isLoading || !isEnabled) {
        return null
    }

    const handleClick = () => {
        // If user is a guest, show auth modal to sign up
        if (isGuest) {
            setAuthModal({ isOpen: true, mode: 'signup' })
        }
        // If authenticated, do nothing (just visual indicator)
        // In the future, this could open settings or PIN protection
    }

    return (
        <button
            onClick={handleClick}
            className="flex items-center space-x-2 px-4 py-2 bg-[#141414] border border-[#454545] rounded-md hover:border-[#666666] transition-colors cursor-pointer"
            title={
                isGuest
                    ? 'Child Safety Mode - Sign up to enable this feature'
                    : 'Child Safety Mode is active'
            }
        >
            <ShieldCheckIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="text-sm font-medium text-[#e5e5e5] whitespace-nowrap">Child Safe</span>
        </button>
    )
}

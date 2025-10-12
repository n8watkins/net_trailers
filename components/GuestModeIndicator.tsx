import { UserCircleIcon } from '@heroicons/react/24/solid'
import { useAuthStatus } from '../hooks/useAuthStatus'

/**
 * Visual indicator that displays when browsing in Guest Mode
 * Shows as a subtle badge in the navbar
 */
export function GuestModeIndicator() {
    const { isGuest } = useAuthStatus()

    // Only render if user is a guest
    if (!isGuest) {
        return null
    }

    return (
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-[#141414] border border-[#454545] rounded-md hover:border-[#666666] transition-colors">
            <UserCircleIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span className="text-xs font-medium text-[#e5e5e5] whitespace-nowrap">Guest</span>
        </div>
    )
}

import { ShieldCheckIcon } from '@heroicons/react/24/solid'
import { useChildSafety } from '../hooks/useChildSafety'

/**
 * Visual indicator that displays when Child Safety Mode is active
 * Shows as a subtle badge in the navbar next to the avatar
 */
export function ChildSafetyIndicator() {
    const { isEnabled, isLoading } = useChildSafety()

    // Don't render if loading or disabled
    if (isLoading || !isEnabled) {
        return null
    }

    return (
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-[#141414] border border-[#454545] rounded-md hover:border-[#666666] transition-colors">
            <ShieldCheckIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-xs font-medium text-[#e5e5e5] whitespace-nowrap">Child Safe</span>
        </div>
    )
}

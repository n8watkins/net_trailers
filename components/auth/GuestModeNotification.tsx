import { UserCircleIcon } from '@heroicons/react/24/outline'
import { useAppStore } from '../../stores/appStore'

interface GuestModeNotificationProps {
    onOpenTutorial?: () => void
    align?: 'left' | 'center'
}

/**
 * Reusable guest mode notification banner
 * Displays notification with limitations info and account creation prompt
 * Includes both Sign In and Sign Up buttons
 */
export function GuestModeNotification({
    onOpenTutorial,
    align = 'center',
}: GuestModeNotificationProps) {
    const { openAuthModal } = useAppStore()

    const handleLimitationsClick = () => {
        if (onOpenTutorial) {
            onOpenTutorial()
        }
    }

    const handleCreateAccountClick = () => {
        openAuthModal('signup')
    }

    return (
        <div className="mb-8">
            <div
                className={`w-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg p-4 ${
                    align === 'center' ? 'max-w-3xl mx-auto' : ''
                }`}
            >
                <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <UserCircleIcon className="w-5 h-5 text-blue-400 flex-shrink-0" />
                            <h3 className="text-white font-semibold text-sm">Guest Mode</h3>
                        </div>
                        <p className="text-white text-base">
                            Using NetTrailers as a guest has{' '}
                            <button
                                onClick={handleLimitationsClick}
                                className="text-blue-400 underline hover:text-blue-300 transition-colors font-medium"
                            >
                                limitations
                            </button>
                            . To unlock more features and access your data across devices{' '}
                            <button
                                onClick={handleCreateAccountClick}
                                className="text-blue-400 underline hover:text-blue-300 transition-colors font-medium"
                            >
                                create an account
                            </button>
                            ! ✨
                        </p>
                    </div>
                    <div className="flex items-center">
                        <button
                            onClick={() => openAuthModal('signin')}
                            className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-sm font-medium rounded-md transition-colors whitespace-nowrap shadow-lg"
                        >
                            Sign In
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

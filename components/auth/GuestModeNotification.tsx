import { UserCircleIcon } from '@heroicons/react/24/outline'
import { useModalStore } from '../../stores/modalStore'
import { useLayoutContext } from '../../contexts/LayoutContext'

interface GuestModeNotificationProps {
    /** Opens Help & tutorial; defaults to the site layout's Help window. */
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
    const { openAuthModal } = useModalStore()
    const layout = useLayoutContext()
    const openHelp = onOpenTutorial ?? layout.onOpenTutorial

    const handleCreateAccountClick = () => {
        openAuthModal('signup')
    }

    const linkClass =
        'text-brand-400 underline underline-offset-2 hover:text-brand-300 transition-colors font-medium rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400'

    return (
        <div className="mb-8">
            <div
                className={`w-full bg-gradient-to-r from-brand-950/60 to-zinc-900/60 border border-brand-500/30 rounded-lg p-4 ${
                    align === 'center' ? 'max-w-3xl mx-auto' : ''
                }`}
            >
                <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <UserCircleIcon className="w-5 h-5 text-brand-400 flex-shrink-0" />
                            <h3 className="text-white font-semibold text-sm">Guest Mode</h3>
                        </div>
                        <p className="text-white text-base">
                            Using NetTrailers as a guest has{' '}
                            {openHelp ? (
                                <button type="button" onClick={openHelp} className={linkClass}>
                                    limitations
                                </button>
                            ) : (
                                'limitations'
                            )}
                            . To unlock more features and access your data across devices{' '}
                            <button
                                type="button"
                                onClick={handleCreateAccountClick}
                                className={linkClass}
                            >
                                create an account
                            </button>
                            .
                        </p>
                    </div>
                    <div className="flex items-center">
                        <button
                            type="button"
                            onClick={() => openAuthModal('signin')}
                            className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold rounded-md transition-colors whitespace-nowrap shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                        >
                            Sign In
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

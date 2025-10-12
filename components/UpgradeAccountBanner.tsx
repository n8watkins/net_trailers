import { SparklesIcon, RocketLaunchIcon } from '@heroicons/react/24/solid'
import { useRecoilState } from 'recoil'
import { authModalState } from '../atoms/authModalAtom'

interface UpgradeAccountBannerProps {
    onOpenTutorial?: () => void
}

export function UpgradeAccountBanner({ onOpenTutorial }: UpgradeAccountBannerProps) {
    const [authModal, setAuthModal] = useRecoilState(authModalState)

    const handleCreateAccount = () => {
        setAuthModal({ isOpen: true, mode: 'signup' })
    }

    const handleAdditionalFeaturesClick = () => {
        if (onOpenTutorial) {
            onOpenTutorial()
        }
    }

    return (
        <div className="mb-6 relative overflow-hidden">
            <div className="bg-gradient-to-br from-blue-950/40 via-blue-900/30 to-black/40 border border-blue-600/40 rounded-xl p-6 shadow-lg shadow-blue-900/20">
                {/* Background glow effect */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-600/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-800/20 rounded-full blur-3xl"></div>

                <div className="relative flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center shadow-lg">
                            <RocketLaunchIcon className="w-6 h-6 text-white" />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600">
                                Upgrade to Full Account
                            </h3>
                            <SparklesIcon className="w-5 h-5 text-yellow-400 animate-pulse" />
                        </div>
                        <p className="text-white text-base mb-4 leading-relaxed">
                            Create an account to{' '}
                            <span className="font-semibold text-blue-300">
                                sync your data across devices
                            </span>{' '}
                            and unlock{' '}
                            <button
                                onClick={handleAdditionalFeaturesClick}
                                className="font-semibold text-blue-400 underline hover:text-blue-300 transition-colors"
                            >
                                additional features
                            </button>{' '}
                            like <span className="font-semibold text-cyan-300">custom lists</span>{' '}
                            and <span className="font-semibold text-sky-300">data export</span>!
                        </p>

                        {/* Button */}
                        <button
                            onClick={handleCreateAccount}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-105"
                        >
                            Create Account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

import React from 'react'
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import useAuth from '../../hooks/useAuth'
import { isInAppBrowser } from '../../utils/isInAppBrowser'

interface AuthModalProps {
    isOpen: boolean
    onClose: () => void
    initialMode?: 'signin' | 'signup'
}

/**
 * Authentication modal. Sign in with GitHub OAuth or a passwordless email magic
 * link (Auth.js). Guests can keep using the app without signing in; signing in
 * syncs their data to the cloud.
 */
const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const { user, loading, signInWithGitHub, signInWithEmail, logOut } = useAuth()
    const [isWorking, setIsWorking] = React.useState(false)
    const [email, setEmail] = React.useState('')
    const [emailSent, setEmailSent] = React.useState(false)
    const [emailError, setEmailError] = React.useState<string | null>(null)
    // Detect in-app browsers (Gmail/Facebook/Instagram webviews) where OAuth can
    // be blocked and magic links open in the wrong browser. Set on the client to
    // avoid hydration mismatch.
    const [inApp, setInApp] = React.useState(false)
    React.useEffect(() => setInApp(isInAppBrowser()), [])

    const handleSignIn = async () => {
        setIsWorking(true)
        try {
            await signInWithGitHub()
            onClose()
        } finally {
            setIsWorking(false)
        }
    }

    const handleEmailSignIn = async (e: React.FormEvent) => {
        e.preventDefault()
        const trimmed = email.trim()
        if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
            setEmailError('Please enter a valid email address')
            return
        }
        setEmailError(null)
        setIsWorking(true)
        try {
            await signInWithEmail(trimmed)
            setEmailSent(true)
        } catch {
            setEmailError('Could not send the sign-in link. Please try again.')
        } finally {
            setIsWorking(false)
        }
    }

    const handleLogout = async () => {
        setIsWorking(true)
        try {
            await logOut()
            onClose()
        } finally {
            setIsWorking(false)
        }
    }

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-auth flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-[#181818] rounded-lg max-w-md w-full p-6 border border-gray-600/50 relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                    aria-label="Close"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>

                {user ? (
                    <div className="text-center">
                        <div className="w-20 h-20 mx-auto mb-4 bg-red-600 rounded-full flex items-center justify-center overflow-hidden">
                            {user.photoURL ? (
                                <img
                                    src={user.photoURL}
                                    alt={user.displayName ?? 'avatar'}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-white text-2xl font-bold">
                                    {(user.displayName ?? user.email ?? '?')
                                        .charAt(0)
                                        .toUpperCase()}
                                </span>
                            )}
                        </div>
                        <h2 className="text-white text-xl font-semibold mb-2">Welcome back!</h2>
                        <p className="text-gray-300 mb-6">{user.displayName ?? user.email}</p>
                        <button
                            onClick={handleLogout}
                            disabled={isWorking}
                            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-3 rounded-md font-medium transition-colors"
                        >
                            Sign Out
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="text-center mb-6">
                            <h2 className="text-white text-2xl font-bold mb-2">Sign In</h2>
                            <p className="text-gray-300">
                                Save your watchlists, rankings, and preferences to the cloud.
                            </p>
                        </div>

                        {inApp && (
                            <div className="mb-5 flex gap-2 p-3 bg-amber-500/15 border border-amber-500/40 rounded-md">
                                <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                <p className="text-amber-200 text-sm">
                                    You&apos;re in an in-app browser. For sign-in to work, open this
                                    page in your default browser (Safari/Chrome) — use the menu
                                    (&hellip;) and choose{' '}
                                    <span className="font-semibold">Open in browser</span>.
                                </p>
                            </div>
                        )}

                        {emailSent ? (
                            <div className="p-4 bg-green-600/20 border border-green-600/50 rounded-md text-center">
                                <p className="text-green-400 font-medium mb-1">Check your inbox</p>
                                <p className="text-gray-300 text-sm">
                                    We sent a sign-in link to{' '}
                                    <span className="text-white">{email}</span>. Open it in{' '}
                                    <span className="text-white">this browser</span> to finish
                                    signing in (the link signs you in wherever you open it).
                                </p>
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={handleSignIn}
                                    disabled={isWorking || loading}
                                    className="w-full bg-white hover:bg-gray-100 disabled:bg-gray-400 text-black py-3 rounded-md font-medium transition-colors flex items-center justify-center space-x-2"
                                >
                                    <svg
                                        className="w-5 h-5"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.2 3.44 9.61 8.21 11.17.6.11.82-.25.82-.56v-2.13c-3.34.71-4.04-1.61-4.04-1.61-.55-1.36-1.34-1.72-1.34-1.72-1.09-.73.08-.72.08-.72 1.2.08 1.84 1.21 1.84 1.21 1.07 1.8 2.81 1.28 3.5.98.11-.76.42-1.28.76-1.57-2.67-.3-5.47-1.31-5.47-5.83 0-1.29.47-2.34 1.23-3.17-.12-.3-.53-1.52.12-3.16 0 0 1-.32 3.3 1.21a11.5 11.5 0 0 1 6 0c2.28-1.53 3.29-1.21 3.29-1.21.65 1.64.24 2.86.12 3.16.77.83 1.23 1.88 1.23 3.17 0 4.53-2.81 5.53-5.49 5.82.43.37.81 1.1.81 2.22v3.29c0 .31.22.68.83.56A12.05 12.05 0 0 0 24 12.29C24 5.78 18.63.5 12 .5z" />
                                    </svg>
                                    <span>Continue with GitHub</span>
                                </button>

                                <div className="relative my-5">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-700" />
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-2 bg-[#181818] text-gray-500">or</span>
                                    </div>
                                </div>

                                <form onSubmit={handleEmailSignIn} className="space-y-3">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        autoComplete="email"
                                        className="w-full px-4 py-3 bg-gray-800 text-white rounded-md border border-gray-700 focus:border-red-500 focus:outline-none"
                                    />
                                    {emailError && (
                                        <p className="text-red-400 text-sm">{emailError}</p>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={isWorking || loading}
                                        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-3 rounded-md font-medium transition-colors"
                                    >
                                        Email me a sign-in link
                                    </button>
                                </form>

                                <p className="text-center text-gray-500 text-sm mt-6">
                                    You can keep browsing as a guest — your data stays in this
                                    browser until you sign in.
                                </p>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

export default AuthModal

import React, { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { SubmitHandler, useForm } from 'react-hook-form'
import useAuth from '../hooks/useAuth'

interface AuthModalProps {
    isOpen: boolean
    onClose: () => void
    initialMode?: 'signin' | 'signup'
}

interface FormInputs {
    email: string
    password: string
    confirmPassword?: string
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'signin' }) => {
    const [isSignUp, setIsSignUp] = useState(initialMode === 'signup')
    const [isLoading, setIsLoading] = useState(false)
    const [showForgotPassword, setShowForgotPassword] = useState(false)

    const {
        signIn,
        signUp,
        signInWithGoogle,
        logOut,
        user,
        error,
        loading,
        resetPass,
        passResetSuccess,
        attemptPassReset,
        setAttemptPassReset,
    } = useAuth()

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        watch,
    } = useForm<FormInputs>()

    const password = watch('password')

    const onSubmit: SubmitHandler<FormInputs> = async (data) => {
        setIsLoading(true)
        try {
            if (showForgotPassword) {
                await handleForgotPassword(data.email)
            } else if (isSignUp) {
                await signUp(data.email, data.password)
            } else {
                await signIn(data.email, data.password)
            }
            reset()
            if (!showForgotPassword) {
                onClose()
            }
        } catch (err) {
            console.error('Auth error:', err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleGoogleSignIn = async () => {
        setIsLoading(true)
        try {
            await signInWithGoogle()
            onClose()
        } catch (err) {
            console.error('Google auth error:', err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleLogout = async () => {
        await logOut()
        onClose()
    }

    const handleForgotPassword = async (email: string) => {
        if (!email) {
            return
        }
        setIsLoading(true)
        try {
            await resetPass(email)
        } catch (err) {
            console.error('Password reset error:', err)
        } finally {
            setIsLoading(false)
        }
    }

    const toggleMode = () => {
        setIsSignUp(!isSignUp)
        setShowForgotPassword(false)
        reset()
    }

    const toggleForgotPassword = () => {
        setShowForgotPassword(!showForgotPassword)
        reset()
    }

    // Reset to initial mode when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setIsSignUp(initialMode === 'signup')
            setShowForgotPassword(false)
            reset()
        }
    }, [isOpen, initialMode, reset])

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-[#181818] rounded-lg max-w-md w-full p-6 border border-gray-600/50 relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>

                {/* User Profile Section (if logged in) */}
                {user ? (
                    <div className="text-center">
                        <div className="w-20 h-20 mx-auto mb-4 bg-red-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-2xl font-bold">
                                {user.email?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <h2 className="text-white text-xl font-semibold mb-2">Welcome back!</h2>
                        <p className="text-gray-300 mb-6">{user.email}</p>
                        <button
                            onClick={handleLogout}
                            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-md font-medium transition-colors"
                        >
                            Sign Out
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="text-center mb-6">
                            <h2 className="text-white text-2xl font-bold mb-2">
                                {showForgotPassword
                                    ? 'Reset Password'
                                    : isSignUp
                                      ? 'Create Account'
                                      : 'Sign In'}
                            </h2>
                            <p className="text-gray-300">
                                {showForgotPassword
                                    ? 'Enter your email to receive a password reset link'
                                    : isSignUp
                                      ? 'Join NetTrailer to save your favorites'
                                      : 'Welcome back to NetTrailer'}
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mb-6">
                            {/* Email */}
                            <div>
                                <input
                                    {...register('email', {
                                        required: 'Email is required',
                                        pattern: {
                                            value: /^\S+@\S+$/i,
                                            message: 'Please enter a valid email',
                                        },
                                    })}
                                    type="email"
                                    placeholder="Email address"
                                    className="w-full px-4 py-3 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-red-500 focus:outline-none"
                                />
                                {errors.email && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {errors.email.message}
                                    </p>
                                )}
                            </div>

                            {/* Password (hidden in forgot password mode) */}
                            {!showForgotPassword && (
                                <div>
                                    <input
                                        {...register('password', {
                                            required: 'Password is required',
                                            minLength: {
                                                value: 6,
                                                message: 'Password must be at least 6 characters',
                                            },
                                        })}
                                        type="password"
                                        placeholder="Password"
                                        className="w-full px-4 py-3 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-red-500 focus:outline-none"
                                    />
                                    {errors.password && (
                                        <p className="text-red-500 text-sm mt-1">
                                            {errors.password.message}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Confirm Password (Sign Up only) */}
                            {isSignUp && !showForgotPassword && (
                                <div>
                                    <input
                                        {...register('confirmPassword', {
                                            required: 'Please confirm your password',
                                            validate: (value) =>
                                                value === password || 'Passwords do not match',
                                        })}
                                        type="password"
                                        placeholder="Confirm password"
                                        className="w-full px-4 py-3 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-red-500 focus:outline-none"
                                    />
                                    {errors.confirmPassword && (
                                        <p className="text-red-500 text-sm mt-1">
                                            {errors.confirmPassword.message}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Forgot Password Link (only show in sign in mode) */}
                            {!isSignUp && !showForgotPassword && (
                                <div className="text-right">
                                    <button
                                        type="button"
                                        onClick={toggleForgotPassword}
                                        className="text-red-500 hover:text-red-400 text-sm font-medium"
                                    >
                                        Forgot your password?
                                    </button>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading || loading}
                                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-3 rounded-md font-medium transition-colors"
                            >
                                {isLoading || loading
                                    ? 'Please wait...'
                                    : showForgotPassword
                                      ? 'Send Reset Email'
                                      : isSignUp
                                        ? 'Create Account'
                                        : 'Sign In'}
                            </button>
                        </form>

                        {/* Google Sign In (hidden in forgot password mode) */}
                        {!showForgotPassword && (
                            <div className="mb-6">
                                <div className="relative mb-4">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-600"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-2 bg-[#181818] text-gray-400">or</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleGoogleSignIn}
                                    disabled={isLoading || loading}
                                    className="w-full bg-white hover:bg-gray-100 text-black py-3 rounded-md font-medium transition-colors flex items-center justify-center space-x-2"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path
                                            fill="#4285F4"
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        />
                                        <path
                                            fill="#34A853"
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        />
                                        <path
                                            fill="#FBBC05"
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        />
                                        <path
                                            fill="#EA4335"
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        />
                                    </svg>
                                    <span>Continue with Google</span>
                                </button>
                            </div>
                        )}

                        {/* Toggle Mode / Back Button */}
                        <div className="text-center">
                            {showForgotPassword ? (
                                <p className="text-gray-400">
                                    Remember your password?{' '}
                                    <button
                                        onClick={toggleForgotPassword}
                                        className="text-red-500 hover:text-red-400 font-medium"
                                    >
                                        Back to Sign In
                                    </button>
                                </p>
                            ) : (
                                <p className="text-gray-400">
                                    {isSignUp
                                        ? 'Already have an account?'
                                        : "Don't have an account?"}{' '}
                                    <button
                                        onClick={toggleMode}
                                        className="text-red-500 hover:text-red-400 font-medium"
                                    >
                                        {isSignUp ? 'Sign In' : 'Create Account'}
                                    </button>
                                </p>
                            )}
                        </div>

                        {/* Success Message for Password Reset */}
                        {passResetSuccess && showForgotPassword && (
                            <div className="mt-4 p-3 bg-green-600/20 border border-green-600/50 rounded-md">
                                <p className="text-green-400 text-sm">
                                    Password reset email sent! Check your inbox and follow the
                                    instructions to reset your password.
                                </p>
                            </div>
                        )}

                        {/* Error Display */}
                        {error && (
                            <div className="mt-4 p-3 bg-red-600/20 border border-red-600/50 rounded-md">
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

export default AuthModal

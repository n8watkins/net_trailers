import Head from 'next/head'
import Image from 'next/image'
import React, { useEffect } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'
import useAuth from '../hooks/useAuth'
import { useRouter } from 'next/router'
import useUserData from '../hooks/useUserData'
import { useState } from 'react'
import dynamic from 'next/dynamic'

// Lazy load heavy components for faster initial load
const PortfolioBanner = dynamic(() => import('../components/PortfolioBanner'), {
    ssr: false, // Don't server-side render this component
    loading: () => null, // No loading component for faster perceived performance
})

interface Inputs {
    email: string
    password: string
}

function Login() {
    const router = useRouter()
    const { startGuestSession } = useUserData()

    const [login, setLogin] = React.useState(false)

    const {
        error,
        loading,
        logOut,
        signIn,
        signInWithGoogle,
        signUp,
        user,
        resetPass,
        passResetSuccess,
        attemptPassReset,
        setAttemptPassReset,
    } = useAuth()

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<Inputs>()

    const onSubmit: SubmitHandler<Inputs> = async ({ email, password }) => {
        if (login) {
            signIn(email, password)
        } else {
            signUp(email, password)
        }
    }

    const [isChecked, setIsChecked] = React.useState(false)

    const handleChecked = () => {
        setIsChecked(!isChecked)
    }

    const handlePasswordReset = () => {
        router.push('/reset')
        setAttemptPassReset(true)
    }

    const handleGuestLogin = () => {
        startGuestSession()
        router.push('/')
    }

    return (
        <div className="absolute w-screen 2xl:h-[48.8vw] h-screen bg-gradient-to-br  from-black/70 to-black/20 ">
            <Head>
                <title>NetTrailer - Movie Discovery Platform</title>
                <meta name="description" content="Browse trending movies, watch trailers, and manage your watchlist with NetTrailer's secure streaming platform" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <Image
                src="https://rb.gy/p2hphi"
                alt="background"
                fill
                className="absolute  -z-10 !hidden    sm:!inline"
                style={{ objectFit: 'cover' }}
                priority
            />
            <Image
                src="https://rb.gy/ulxxee"
                className="absolute left-4 top-4 cursor-pointer object-contain md:left-10 md:top-6"
                width={200}
                height={200}
                alt="Netflix Logo"
                priority
            />

            {/* NetTrailer Banner - Outside the form */}
            <div className="flex justify-center mt-8 sm:mt-16 mb-6">
                <PortfolioBanner />
            </div>

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col bg-black/90 rounded-md max-w-lg mx-4 sm:mx-auto px-2 sm:px-4 py-6 sm:py-8 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
            >
                <div className="flex flex-col px-4 sm:px-8 lg:px-10 space-y-4">

                    <div className="flex items-center">
                        <h1 className="text-2xl sm:text-3xl font-semibold flex-shrink-0 w-24 sm:w-32">
                            {login ? 'Sign In' : 'Sign Up'}
                        </h1>
                        <div className="flex-1 flex justify-center">
                            <span className="text-gray-400 text-sm lg:text-base">or</span>
                        </div>
                        <button
                            type="button"
                            className="bg-gray-700 hover:bg-gray-600 text-white rounded-md py-3 px-8 text-base font-medium transition-colors flex-shrink-0"
                            onClick={handleGuestLogin}
                        >
                            Continue as Guest
                        </button>
                    </div>

                    <div className="relative">
                        <input
                            type="email"
                            id="email"
                            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent peer"
                            placeholder=" "
                            {...register('email', { required: true })}
                        />
                        <label
                            htmlFor="email"
                            className="absolute text-gray-400 duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] left-4 peer-focus:text-red-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4"
                        >
                            Email or phone number
                        </label>
                        {errors.email && (
                            <p className="p-1 text-[13px] font-sans font-base text-orange-500">
                                Please enter a valid email
                            </p>
                        )}
                    </div>
                    <div className="relative">
                        <input
                            type="password"
                            id="password"
                            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent peer"
                            placeholder=" "
                            {...register('password', { required: true })}
                        />
                        <label
                            htmlFor="password"
                            className="absolute text-gray-400 duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] left-4 peer-focus:text-red-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4"
                        >
                            Password
                        </label>
                        {errors.password && (
                            <p className="p-1 text-[13px] font-sans font-base text-orange-500">
                                Please enter a valid password
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-red-600 hover:bg-red-700 text-white rounded-md py-2.5 text-sm font-semibold transition-colors"
                    >
                        {login ? 'Sign In' : 'Sign Up'}
                    </button>

                    {/* Form options above social sign-in */}
                    <div className="flex justify-between text-[#b3b3b3] text-sm lg:text-base">
                        <div className="flex space-x-2 items-center">
                            <input
                                type="checkbox"
                                id="rememberMe"
                                className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:outline-none"
                                checked={isChecked}
                                onChange={() => handleChecked()}
                            />
                            <label className="cursor-pointer" onClick={() => handleChecked()}>
                                Remember me
                            </label>
                        </div>
                        <span
                            className="cursor-pointer hover:underline"
                            onClick={() => handlePasswordReset()}
                        >
                            Forgot email or password?
                        </span>
                    </div>

                    <div className="text-left text-sm lg:text-base">
                        <span className="text-gray-400">
                            {login ? 'New to NetTrailer?' : 'Already have an account?'} {' '}
                        </span>
                        <button
                            className="text-white hover:underline cursor-pointer"
                            onClick={() => login ? router.push('/signup') : setLogin(!login)}
                            type="button"
                        >
                            {login ? 'Sign up now.' : 'Sign in here.'}
                        </button>
                    </div>

                    {/* Social Authentication */}
                    <div className="flex flex-col space-y-3 py-3 border-t border-gray-600/50">
                        <div className="text-center text-sm lg:text-base text-gray-400 mb-2">or</div>

                        <div className="grid grid-cols-3 gap-3">
                            <button
                                type="button"
                                className="bg-white hover:bg-gray-100 text-gray-900 rounded-md py-3 px-4 font-medium transition-colors flex items-center justify-center space-x-2"
                                onClick={signInWithGoogle}
                                disabled={loading}
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                                <span className="text-sm">Google</span>
                            </button>

                            <button
                                type="button"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-md py-3 px-4 font-medium transition-colors flex items-center justify-center space-x-2"
                                onClick={signInWithDiscord}
                                disabled={loading}
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                                </svg>
                                <span className="text-sm">Discord</span>
                            </button>

                            <button
                                type="button"
                                className="bg-black hover:bg-gray-900 text-white rounded-md py-3 px-4 font-medium transition-colors flex items-center justify-center border border-gray-600"
                                onClick={signInWithTwitter}
                                disabled={loading}
                            >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}

export default Login

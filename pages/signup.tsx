import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { useRouter } from 'next/router'

function SignUp() {
    const router = useRouter()
    const [email, setEmail] = React.useState('')

    const handleGetStarted = () => {
        router.push('/login')
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <Head>
                <title>NetTrailer - Sign Up</title>
                <meta name="description" content="Join NetTrailer to browse movies, watch trailers, and manage your watchlist" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            {/* Hero Section */}
            <div className="relative min-h-screen flex flex-col">
                {/* Header */}
                <header className="relative z-20 flex items-center justify-between p-4 md:p-8">
                    <img
                        src="https://rb.gy/ulxxee"
                        alt="NetTrailer Logo"
                        className="h-8 md:h-12 cursor-pointer"
                        onClick={() => router.push('/')}
                    />
                    <Link href="/login" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors">
                        Sign In
                    </Link>
                </header>

                {/* Background Image */}
                <Image
                    src="https://rb.gy/p2hphi"
                    alt="background"
                    fill
                    className="-z-10 opacity-50"
                    style={{ objectFit: 'cover' }}
                    priority
                />

                {/* Hero Content */}
                <div className="flex-1 flex flex-col justify-center items-center text-center px-4 py-16">
                    <div className="max-w-4xl mx-auto">
                        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                            Unlimited movies, trailers, and more
                        </h1>
                        <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                            Discover trending movies, watch trailers, and manage your watchlist with NetTrailer&apos;s secure platform.
                        </p>

                        {/* Email Signup Form */}
                        <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
                            <div className="relative flex-1">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-black/70 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    placeholder="Email address"
                                />
                            </div>
                            <button
                                onClick={handleGetStarted}
                                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md font-semibold transition-colors whitespace-nowrap"
                            >
                                Get Started
                            </button>
                        </div>

                        <p className="text-sm text-gray-400 mt-4">
                            Ready to watch? Enter your email to create your NetTrailer account.
                        </p>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="bg-black border-t border-gray-800">
                {/* Feature 1 */}
                <div className="py-16 px-4">
                    <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center">
                        <div className="text-center md:text-left">
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">
                                Watch everywhere
                            </h2>
                            <p className="text-lg text-gray-300">
                                Stream unlimited movies and trailers on your phone, tablet, laptop, and TV.
                            </p>
                        </div>
                        <div className="flex justify-center">
                            <div className="relative w-64 h-48 bg-gradient-to-br from-red-900/30 to-gray-900/30 rounded-lg flex items-center justify-center border border-red-600/20">
                                <span className="text-6xl">📱</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Feature 2 */}
                <div className="py-16 px-4 bg-gray-900/50">
                    <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center">
                        <div className="flex justify-center order-2 md:order-1">
                            <div className="relative w-64 h-48 bg-gradient-to-br from-red-900/30 to-gray-900/30 rounded-lg flex items-center justify-center border border-red-600/20">
                                <span className="text-6xl">🎬</span>
                            </div>
                        </div>
                        <div className="text-center md:text-left order-1 md:order-2">
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">
                                Discover trending content
                            </h2>
                            <p className="text-lg text-gray-300">
                                Browse the latest movies, watch trailers, and get personalized recommendations.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Feature 3 */}
                <div className="py-16 px-4">
                    <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center">
                        <div className="text-center md:text-left">
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">
                                Secure & reliable
                            </h2>
                            <p className="text-lg text-gray-300">
                                Your data is protected with enterprise-grade security and Firebase authentication.
                            </p>
                        </div>
                        <div className="flex justify-center">
                            <div className="relative w-64 h-48 bg-gradient-to-br from-red-900/30 to-gray-900/30 rounded-lg flex items-center justify-center border border-red-600/20">
                                <span className="text-6xl">🔐</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer CTA */}
            <div className="bg-gray-900 py-16 px-4 text-center border-t border-gray-800">
                <div className="max-w-2xl mx-auto">
                    <h3 className="text-2xl md:text-3xl font-bold mb-4">
                        Ready to start watching?
                    </h3>
                    <p className="text-gray-300 mb-8">
                        Join millions of users discovering movies with NetTrailer.
                    </p>
                    <button
                        onClick={handleGetStarted}
                        className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-md font-semibold text-lg transition-colors"
                    >
                        Get Started Now
                    </button>
                    <p className="text-sm text-gray-500 mt-4">
                        Already have an account?{' '}
                        <Link href="/login" className="text-red-500 hover:underline">
                            Sign in here
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default SignUp
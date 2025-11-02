import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
    title: 'Page Not Found - NetTrailer',
    description: 'This page could not be found.',
}

export default function NotFound() {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute top-10 left-10 text-6xl">🎬</div>
                <div className="absolute top-32 right-20 text-4xl">🍿</div>
                <div className="absolute bottom-32 left-16 text-5xl">📺</div>
                <div className="absolute bottom-20 right-32 text-3xl">🎭</div>
                <div className="absolute top-1/2 left-1/4 text-4xl">🎪</div>
                <div className="absolute top-1/3 right-1/3 text-5xl">🎨</div>
            </div>

            {/* Main content */}
            <div className="text-center z-10 max-w-2xl px-4">
                {/* Large 404 */}
                <div className="mb-8">
                    <h1 className="text-8xl md:text-9xl font-bold text-white mb-4 tracking-wider">
                        404
                    </h1>
                    <div className="w-32 h-1 bg-red-600 mx-auto mb-8"></div>
                </div>

                {/* Error message */}
                <div className="mb-8">
                    <h2 className="text-2xl md:text-3xl font-semibold text-white mb-4">
                        Lost in the void?
                    </h2>
                    <p className="text-gray-300 text-lg mb-6 max-w-lg mx-auto">
                        Looks like this page took a detour to another dimension. Don&apos;t worry,
                        we&apos;ll get you back to the good stuff.
                    </p>
                </div>

                {/* Action buttons */}
                <div className="space-y-6">
                    <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
                        <p className="text-gray-300 mb-4">What would you like to do?</p>
                    </div>

                    <div className="flex justify-center">
                        <Link
                            href="/"
                            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                        >
                            🏠 Go to Home
                        </Link>
                    </div>
                </div>

                {/* Fun message */}
                <div className="mt-12 text-gray-500 text-sm">
                    <p>🎭 Meanwhile, somewhere in the NetTrailer universe...</p>
                    <p className="mt-2 italic">
                        &quot;The page you&apos;re looking for is probably binge-watching something
                        else.&quot;
                    </p>
                </div>
            </div>
        </div>
    )
}

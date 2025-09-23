import { NextPageContext } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'

interface ErrorProps {
    statusCode?: number
    hasGetInitialPropsRun?: boolean
    err?: Error
}

function Error({ statusCode, hasGetInitialPropsRun, err }: ErrorProps) {
    const router = useRouter()

    const handleGoHome = () => {
        router.push('/')
    }

    const handleRefresh = () => {
        window.location.reload()
    }

    const getErrorMessage = () => {
        if (statusCode === 404) {
            return {
                title: 'Page Not Found',
                message: 'The page you are looking for does not exist.',
                emoji: '🔍'
            }
        } else if (statusCode === 500) {
            return {
                title: 'Server Error',
                message: 'An internal server error occurred.',
                emoji: '⚠️'
            }
        } else if (statusCode) {
            return {
                title: `Error ${statusCode}`,
                message: 'An error occurred on the server.',
                emoji: '😵'
            }
        } else {
            return {
                title: 'Client Error',
                message: 'An error occurred in the browser.',
                emoji: '💥'
            }
        }
    }

    const { title, message, emoji } = getErrorMessage()

    return (
        <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
            <Head>
                <title>{title} - NetTrailer</title>
                <meta name="description" content={message} />
            </Head>

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
                {/* Error Code */}
                <div className="mb-8">
                    <div className="text-6xl mb-4">{emoji}</div>
                    {statusCode && (
                        <h1 className="text-8xl md:text-9xl font-bold text-white mb-4 tracking-wider">
                            {statusCode}
                        </h1>
                    )}
                    <div className="w-32 h-1 bg-red-600 mx-auto mb-8"></div>
                </div>

                {/* Error message */}
                <div className="mb-8">
                    <h2 className="text-2xl md:text-3xl font-semibold text-white mb-4">
                        {title}
                    </h2>
                    <p className="text-gray-300 text-lg mb-6 max-w-lg mx-auto">
                        {message}
                    </p>
                    {err && process.env.NODE_ENV === 'development' && (
                        <details className="text-left bg-gray-900/50 p-4 rounded-lg mb-6">
                            <summary className="text-gray-400 cursor-pointer">Error Details (Development)</summary>
                            <pre className="text-red-400 text-xs mt-2 overflow-auto">
                                {err.stack}
                            </pre>
                        </details>
                    )}
                </div>

                {/* Action buttons */}
                <div className="space-y-6">
                    <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
                        <p className="text-gray-300 mb-4">
                            What would you like to do?
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={handleGoHome}
                            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                        >
                            🏠 Go to Home
                        </button>

                        <button
                            onClick={handleRefresh}
                            className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg border border-gray-600"
                        >
                            🔄 Refresh Page
                        </button>
                    </div>
                </div>

                {/* Fun message */}
                <div className="mt-12 text-gray-500 text-sm">
                    <p>🎭 Meanwhile, somewhere in the NetTrailer universe...</p>
                    <p className="mt-2 italic">
                        {statusCode === 404
                            ? '"The content you\'re looking for is probably binge-watching something else."'
                            : '"Even Netflix has buffering issues sometimes."'
                        }
                    </p>
                </div>
            </div>

            {/* Floating elements animation */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-red-500 rounded-full animate-ping opacity-75"></div>
                <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-white rounded-full animate-pulse"></div>
                <div className="absolute top-1/2 right-1/3 w-1.5 h-1.5 bg-red-400 rounded-full animate-bounce"></div>
            </div>

            {/* CSS for custom animations */}
            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }

                .animate-float {
                    animation: float 3s ease-in-out infinite;
                }
            `}</style>
        </div>
    )
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
    const statusCode = res ? res.statusCode : err ? err.statusCode : 404
    return { statusCode }
}

export default Error
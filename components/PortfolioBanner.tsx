export default function PortfolioBanner() {
    return (
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center space-x-3">
                <span className="text-2xl">🎬</span>
                <div className="text-center">
                    <h2 className="text-lg font-semibold text-blue-400">
                        NetTrailer Portfolio Demo
                    </h2>
                    <p className="text-sm text-gray-300 mt-1">
                        Showcasing Next.js • TypeScript • Firebase • TMDB API
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        Try the features below or continue as guest to explore!
                    </p>
                </div>
            </div>
        </div>
    )
}
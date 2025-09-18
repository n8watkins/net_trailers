import React from 'react'

interface Props {
    message?: string
}

const NetflixLoader: React.FC<Props> = ({ message = "Loading your movies..." }) => {
    return (
        <div className="min-h-screen bg-[#141414] flex items-center justify-center">
            <div className="text-center">
                {/* Loading message */}
                <h2 className="text-white text-xl font-medium mb-8">
                    {message}
                </h2>

                {/* Animated dots only */}
                <div className="flex justify-center space-x-2">
                    <div className="w-4 h-4 bg-[#e50914] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-4 h-4 bg-[#e50914] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-4 h-4 bg-[#e50914] rounded-full animate-bounce"></div>
                </div>
            </div>
        </div>
    )
}

export default NetflixLoader
import React from 'react'
import { LockClosedIcon } from '@heroicons/react/24/solid'

interface GuestSignInPromptProps {
    onSignIn: () => void
}

function GuestSignInPrompt({ onSignIn }: GuestSignInPromptProps) {
    return (
        <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
            <div className="flex items-center space-x-3 mb-2">
                <LockClosedIcon className="w-5 h-5 text-gray-400" />
                <h3 className="text-white font-medium">Custom Lists</h3>
            </div>
            <p className="text-gray-400 text-sm mb-3">
                Sign in to create and manage your own custom watchlists
            </p>
            <button
                onClick={onSignIn}
                className="w-full px-4 py-2 bg-white text-black rounded-lg font-medium transition-all duration-200 hover:bg-gray-200"
            >
                Sign In to Create Lists
            </button>
        </div>
    )
}

export default GuestSignInPrompt

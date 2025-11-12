import React from 'react'
import { PlusIcon, RectangleStackIcon } from '@heroicons/react/24/solid'
import GuestSignInPrompt from './GuestSignInPrompt'

interface CreateListSectionProps {
    isGuest: boolean
    onSignIn: () => void
    onNewCollection: () => void
}

function CreateListSection({ isGuest, onSignIn, onNewCollection }: CreateListSectionProps) {
    return (
        <div className="mt-4 pt-4 border-t border-gray-700">
            {isGuest ? (
                <GuestSignInPrompt onSignIn={onSignIn} />
            ) : (
                <button
                    onClick={onNewCollection}
                    className="w-full flex items-center justify-center space-x-2 p-3 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600 hover:border-gray-400 rounded-lg transition-all duration-200"
                >
                    <PlusIcon className="w-5 h-5 text-white" />
                    <RectangleStackIcon className="w-5 h-5 text-white" />
                    <span className="text-white font-medium">New Collection</span>
                </button>
            )}
        </div>
    )
}

export default CreateListSection

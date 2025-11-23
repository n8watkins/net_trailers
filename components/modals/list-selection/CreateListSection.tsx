import React from 'react'
import { PlusIcon, RectangleStackIcon } from '@heroicons/react/24/solid'
import GuestSignInPrompt from './GuestSignInPrompt'

interface CreateListSectionProps {
    isGuest: boolean
    onSignIn: () => void
    onNewCollection: () => void
    position?: 'top' | 'bottom'
}

function CreateListSection({
    isGuest,
    onSignIn,
    onNewCollection,
    position = 'top',
}: CreateListSectionProps) {
    const isTop = position === 'top'

    return (
        <div
            className={
                isTop ? 'mb-4 pb-4 border-b border-gray-700' : 'mt-4 pt-4 border-t border-gray-700'
            }
        >
            {isGuest ? (
                <GuestSignInPrompt onSignIn={onSignIn} />
            ) : (
                <button
                    onClick={onNewCollection}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-200"
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

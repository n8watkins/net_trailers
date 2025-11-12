import React from 'react'

function EmptyStateMessage() {
    return (
        <div className="mb-4 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
            <p className="text-gray-300 text-sm text-center">
                You haven&apos;t created any custom lists yet.
                <br />
                <span className="text-gray-400">
                    Create a list to organize your favorite content!
                </span>
            </p>
        </div>
    )
}

export default EmptyStateMessage

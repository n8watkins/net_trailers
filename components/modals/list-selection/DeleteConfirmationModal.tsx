import React from 'react'
import { UserList } from '../../../types/userLists'

interface DeleteConfirmationModalProps {
    deletingList: UserList | null
    deleteConfirmationInput: string
    setDeleteConfirmationInput: (input: string) => void
    confirmDeleteList: () => void
    cancelDeleteList: () => void
}

function DeleteConfirmationModal({
    deletingList,
    deleteConfirmationInput,
    setDeleteConfirmationInput,
    confirmDeleteList,
    cancelDeleteList,
}: DeleteConfirmationModalProps) {
    if (!deletingList) return null

    return (
        <div className="fixed inset-0 z-[56000] flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={cancelDeleteList}
            />
            <div className="relative bg-[#141414] rounded-lg p-6 max-w-sm mx-4">
                <h3 className="text-lg font-semibold text-white mb-3">Delete List</h3>
                <p className="text-gray-300 mb-4">
                    Are you sure you want to delete &ldquo;{deletingList.name}&rdquo;? This action
                    cannot be undone.
                </p>
                <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">
                        Type <span className="text-white font-semibold">{deletingList.name}</span>{' '}
                        to confirm:
                    </label>
                    <input
                        type="text"
                        value={deleteConfirmationInput}
                        onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                        placeholder={deletingList.name}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        autoFocus
                        onKeyDown={(e) => {
                            if (
                                e.key === 'Enter' &&
                                deleteConfirmationInput === deletingList.name
                            ) {
                                confirmDeleteList()
                            } else if (e.key === 'Escape') {
                                cancelDeleteList()
                            }
                        }}
                    />
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={confirmDeleteList}
                        disabled={deleteConfirmationInput !== deletingList.name}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium transition-all duration-200 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Delete
                    </button>
                    <button
                        onClick={cancelDeleteList}
                        className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg font-medium transition-all duration-200 hover:bg-gray-600"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    )
}

export default DeleteConfirmationModal

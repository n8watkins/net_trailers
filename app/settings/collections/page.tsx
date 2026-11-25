'use client'

import React, { useState } from 'react'
import useUserData from '../../../hooks/useUserData'
import { useToast } from '../../../hooks/useToast'
import { UserList } from '../../../types/collections'
import CollectionEditorModal from '../../../components/modals/CollectionEditorModal'
import CollectionList from '../../../components/collections/CollectionList'
import {
    HOME_HIDDEN_LABEL,
    HOME_SHOWN_LABEL,
    homeVisibilityUpdate,
} from '../../../components/collections/collectionMeta'
import { createDefaultCollectionsForUser } from '../../../constants/systemCollections'

/**
 * Settings > Collections: the same list as /collections (CollectionList), with a
 * "Shown on home" switch and an Edit button on each card.
 */
export default function CollectionsSettingsPage() {
    const { getAllLists, updateList } = useUserData()
    const { showSuccess, showError } = useToast()
    const allLists = getAllLists()

    const [editingCollection, setEditingCollection] = useState<UserList | null>(null)

    const handleToggleHome = async (collection: UserList, shown: boolean) => {
        try {
            await updateList(collection.id, homeVisibilityUpdate(shown))
            showSuccess(
                `${collection.name}: ${shown ? HOME_SHOWN_LABEL.toLowerCase() : HOME_HIDDEN_LABEL.toLowerCase()}`
            )
        } catch (error) {
            console.error('Failed to toggle collection:', error)
            showError('Failed to update collection')
        }
    }

    // Puts the built-in genre collections back to their default settings
    const handleResetToDefaults = async () => {
        try {
            for (const defaultCol of createDefaultCollectionsForUser()) {
                if (!allLists.some((c) => c.id === defaultCol.id)) continue
                await updateList(defaultCol.id, {
                    name: defaultCol.name,
                    ...homeVisibilityUpdate(defaultCol.enabled),
                    order: defaultCol.order,
                    genres: defaultCol.genres,
                    genreLogic: defaultCol.genreLogic,
                    mediaType: defaultCol.mediaType,
                })
            }
            showSuccess('Built-in collections reset')
        } catch (error) {
            console.error('Failed to reset to defaults:', error)
            showError('Failed to reset collection settings')
        }
    }

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h1 className="mb-2 text-2xl font-bold text-white md:text-3xl">Collections</h1>
                    <p className="text-gray-400">
                        Choose which collections are shown on home, and edit them.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleResetToDefaults}
                    className="inline-flex h-10 shrink-0 items-center self-start rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-gray-100 transition-colors hover:border-zinc-500 hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                >
                    Reset to defaults
                </button>
            </div>

            {allLists.length === 0 ? (
                <p className="py-12 text-center text-gray-400">No collections yet.</p>
            ) : (
                <CollectionList
                    collections={allLists}
                    onToggleHome={handleToggleHome}
                    onEdit={setEditingCollection}
                    voiceSourceId="settings-collections-search"
                    narrow
                />
            )}

            {editingCollection && (
                <CollectionEditorModal
                    collection={editingCollection}
                    isOpen={true}
                    onClose={() => setEditingCollection(null)}
                />
            )}
        </div>
    )
}

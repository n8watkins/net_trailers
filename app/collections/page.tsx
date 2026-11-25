'use client'

import useUserData from '../../hooks/useUserData'
import SubPageLayout from '../../components/layout/SubPageLayout'
import PageHeader from '../../components/layout/PageHeader'
import PageEmptyState, { emptyStateActionClass } from '../../components/layout/PageEmptyState'
import { RectangleStackIcon, PlusIcon } from '@heroicons/react/24/solid'
import PageLoader from '../../components/common/PageLoader'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import CollectionList from '../../components/collections/CollectionList'
import { useModalStore } from '../../stores/modalStore'

const Collections = () => {
    const { getAllLists } = useUserData()
    const { isLoading } = useAuthStatus()
    const openCollectionBuilderModal = useModalStore((state) => state.openCollectionBuilderModal)

    // The same list Settings > Collections shows: Watch Later plus every collection
    const allLists = getAllLists()

    return (
        <SubPageLayout hideHeader>
            <div className="space-y-6">
                <PageHeader
                    title="Collections"
                    icon={<RectangleStackIcon />}
                    actions={
                        <button
                            type="button"
                            onClick={() => openCollectionBuilderModal()}
                            className="inline-flex h-9 items-center gap-2 rounded-full bg-brand-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-400"
                        >
                            <PlusIcon className="h-4 w-4" />
                            New collection
                        </button>
                    }
                />

                {isLoading && (
                    <div className="py-16">
                        <PageLoader inline={true} message="Loading collections..." />
                    </div>
                )}

                {!isLoading && allLists.length === 0 && (
                    <PageEmptyState
                        icon={<RectangleStackIcon />}
                        title="No collections yet"
                        description="Group titles you want to keep together, by hand or with AI."
                        action={
                            <button
                                type="button"
                                onClick={() => openCollectionBuilderModal()}
                                className={emptyStateActionClass}
                            >
                                Create a collection
                            </button>
                        }
                    />
                )}

                {!isLoading && allLists.length > 0 && (
                    <CollectionList collections={allLists} voiceSourceId="collections-search" />
                )}
            </div>
        </SubPageLayout>
    )
}

export default Collections

import Link from '@/components/common/Link'
import { PencilIcon } from '@heroicons/react/24/outline'
import { SparklesIcon } from '@heroicons/react/24/solid'
import { UserList } from '../../types/collections'
import { getCollectionPath } from '../../utils/slugify'
import CollectionIcon from './CollectionIcon'
import Switch from './Switch'
import {
    HOME_HIDDEN_LABEL,
    HOME_SHOWN_LABEL,
    contentsLabel,
    hasHomeSetting,
    hexToRgba,
    isShownOnHome,
} from './collectionMeta'

interface CollectionBrowseCardProps {
    collection: UserList
    /** Settings: adds the "Shown on home" switch and an Edit button. */
    onToggleHome?: (collection: UserList, shown: boolean) => void
    onEdit?: (collection: UserList) => void
}

/**
 * The one collection card, used by /collections and Settings > Collections.
 * The whole card opens the collection; Settings adds its controls in the footer.
 */
export default function CollectionBrowseCard({
    collection,
    onToggleHome,
    onEdit,
}: CollectionBrowseCardProps) {
    const listColor = collection.color || '#71717a'
    const href = getCollectionPath(collection)
    const shown = isShownOnHome(collection)
    const homeSetting = hasHomeSetting(collection)
    const canEdit = !!onEdit && homeSetting && collection.canEdit !== false

    return (
        <article
            data-testid="collection-card"
            data-collection-id={collection.id}
            className="group relative flex h-full flex-col rounded-xl border bg-zinc-900/60 p-4 transition-colors hover:bg-zinc-900"
            style={{ borderColor: hexToRgba(listColor, 0.3) }}
        >
            <div className="mb-3 flex items-start justify-between gap-3">
                <span className="flex items-center gap-2">
                    <CollectionIcon collection={collection} />
                    {collection.collectionType === 'ai-generated' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800/80 px-2 py-0.5 text-xs font-medium text-gray-200">
                            <SparklesIcon className="h-3 w-3 text-brand-400" aria-hidden="true" />
                            AI
                        </span>
                    )}
                </span>
                {(onToggleHome || onEdit) && (
                    <span className="relative z-10 -mr-1.5 flex items-center gap-1">
                        {onToggleHome && homeSetting && (
                            <Switch
                                size="sm"
                                checked={shown}
                                label={`Show ${collection.name} on home`}
                                onChange={(next) => onToggleHome(collection, next)}
                            />
                        )}
                        {canEdit && (
                            <button
                                type="button"
                                onClick={() => onEdit(collection)}
                                aria-label={`Edit ${collection.name}`}
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-zinc-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                            >
                                <PencilIcon className="h-4 w-4" aria-hidden="true" />
                            </button>
                        )}
                    </span>
                )}
            </div>

            <h3 className="mb-1 line-clamp-2 text-lg font-bold text-white">
                <Link
                    href={href}
                    className="rounded outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-brand-400 group-hover:text-brand-300"
                >
                    {collection.name}
                </Link>
            </h3>

            {collection.description && (
                <p className="mb-3 line-clamp-2 text-sm text-gray-400">{collection.description}</p>
            )}

            <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-zinc-800 pt-3 text-sm">
                <span className="text-gray-300">{contentsLabel(collection)}</span>
                {homeSetting && (
                    <span
                        data-testid="home-status"
                        className={`inline-flex items-center gap-1.5 ${shown ? 'text-gray-300' : 'text-gray-500'}`}
                    >
                        <span
                            aria-hidden="true"
                            className={`h-1.5 w-1.5 rounded-full ${shown ? 'bg-brand-500' : 'bg-zinc-600'}`}
                        />
                        {shown ? HOME_SHOWN_LABEL : HOME_HIDDEN_LABEL}
                    </span>
                )}
            </div>
        </article>
    )
}

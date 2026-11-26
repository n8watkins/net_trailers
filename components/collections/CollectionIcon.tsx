import { BookmarkIcon, FilmIcon, RectangleStackIcon, SparklesIcon } from '@heroicons/react/24/solid'
import type { UserList } from '../../types/collections'
import { hexToRgba, isWatchLater } from './collectionMeta'

type IconSize = 'sm' | 'md' | 'lg'

const BOX: Record<IconSize, string> = {
    sm: 'h-6 w-6 rounded-md text-sm',
    md: 'h-11 w-11 rounded-lg text-2xl',
    lg: 'h-14 w-14 rounded-xl text-3xl sm:h-16 sm:w-16 sm:text-4xl',
}

const GLYPH: Record<IconSize, string> = {
    sm: 'h-3.5 w-3.5',
    md: 'h-6 w-6',
    lg: 'h-7 w-7 sm:h-8 sm:w-8',
}

/**
 * The one icon a collection has everywhere: the bookmark for Watch Later (whatever emoji an
 * account may have stored for it), else its emoji if it has one, else an icon for its kind.
 */
export function CollectionGlyph({
    collection,
    className,
}: {
    collection: Pick<UserList, 'emoji' | 'collectionType'> & Partial<Pick<UserList, 'id'>>
    className: string
}) {
    if (collection.id !== undefined && isWatchLater({ id: collection.id })) {
        return <BookmarkIcon aria-hidden="true" className={`${className} text-gray-100`} />
    }
    if (collection.emoji) {
        return (
            <span aria-hidden="true" className="leading-none">
                {collection.emoji}
            </span>
        )
    }
    const Icon =
        collection.collectionType === 'tmdb-genre'
            ? FilmIcon
            : collection.collectionType === 'ai-generated'
              ? SparklesIcon
              : RectangleStackIcon
    return <Icon aria-hidden="true" className={`${className} text-gray-100`} />
}

/** The collection's icon in a tile tinted with the collection's colour. */
export default function CollectionIcon({
    collection,
    size = 'md',
    bare = false,
}: {
    collection: Pick<UserList, 'emoji' | 'collectionType' | 'color'> & Partial<Pick<UserList, 'id'>>
    size?: IconSize
    /** Without the tinted tile, for use inside chips. */
    bare?: boolean
}) {
    if (bare) return <CollectionGlyph collection={collection} className={GLYPH[size]} />
    const color = collection.color || '#71717a'
    return (
        <span
            data-testid="collection-icon"
            className={`inline-flex shrink-0 items-center justify-center border ${BOX[size]}`}
            style={{
                backgroundColor: hexToRgba(color, 0.15),
                borderColor: hexToRgba(color, 0.4),
            }}
        >
            <CollectionGlyph collection={collection} className={GLYPH[size]} />
        </span>
    )
}

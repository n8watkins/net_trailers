import Link from 'next/link'
import { UserList } from '../../types/collections'
import { getCollectionPath } from '../../utils/slugify'
import { EyeIcon, SparklesIcon, FilmIcon } from '@heroicons/react/24/solid'

interface CollectionBrowseCardProps {
    collection: UserList
}

export default function CollectionBrowseCard({ collection }: CollectionBrowseCardProps) {
    const listColor = collection.color || '#6b7280'
    const href = getCollectionPath(collection)

    // Helper to convert hex to rgba
    const hexToRgba = (hex: string, opacity: number): string => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        if (result) {
            const r = parseInt(result[1], 16)
            const g = parseInt(result[2], 16)
            const b = parseInt(result[3], 16)
            return `rgba(${r}, ${g}, ${b}, ${opacity})`
        }
        return `rgba(107, 114, 128, ${opacity})`
    }

    // Get collection icon
    const getIcon = () => {
        if (collection.emoji) {
            return <span className="text-2xl">{collection.emoji}</span>
        }
        return <EyeIcon className="w-6 h-6 text-white" />
    }

    // Get collection type badge
    const getTypeBadge = () => {
        if (collection.collectionType === 'ai-generated') {
            return (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full text-xs font-medium">
                    <SparklesIcon className="w-3 h-3" />
                    <span>AI</span>
                </div>
            )
        }
        return null
    }

    return (
        <Link href={href} className="block group">
            <div
                className="relative bg-zinc-900/60 backdrop-blur-lg border-2 rounded-xl p-5 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/10 h-full"
                style={{
                    borderColor: hexToRgba(listColor, 0.5),
                }}
            >
                {/* Colored glow on hover */}
                <div
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300 -z-10"
                    style={{
                        backgroundColor: listColor,
                    }}
                />

                {/* Header with icon and badge */}
                <div className="flex items-start justify-between mb-3">
                    <div
                        className="flex items-center justify-center w-12 h-12 rounded-lg"
                        style={{
                            backgroundColor: hexToRgba(listColor, 0.2),
                            borderColor: listColor,
                            borderWidth: '2px',
                        }}
                    >
                        {getIcon()}
                    </div>
                    {getTypeBadge()}
                </div>

                {/* Collection name */}
                <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
                    {collection.name}
                </h3>

                {/* Description */}
                {collection.description && (
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                        {collection.description}
                    </p>
                )}

                {/* Footer with item count */}
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-zinc-800/50">
                    <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                        <FilmIcon className="w-4 h-4" />
                        <span>{collection.items.length} items</span>
                    </div>
                </div>
            </div>
        </Link>
    )
}

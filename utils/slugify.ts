/**
 * Converts a string to a URL-safe slug
 * @param text - The text to convert to a slug
 * @returns URL-safe slug (lowercase, hyphenated, alphanumeric)
 */
export function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove non-word chars (except spaces and hyphens)
        .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
        .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

/**
 * Converts a collection name to a URL slug
 * Removes emojis and special characters
 */
export function collectionNameToSlug(name: string): string {
    // Remove emojis and other special unicode characters
    const cleanName = name.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim()
    return slugify(cleanName)
}

/**
 * Special route mappings for specific collection IDs
 */
export const COLLECTION_ROUTE_MAP: Record<string, string> = {
    'default-watchlist': 'watchlist',
}

/**
 * Get the URL route for a collection
 * @param collection - Collection with id and name
 * @returns URL route (without leading slash)
 */
export function getCollectionRoute(collection: { id: string; name: string }): string {
    // Check for special route mappings first
    if (COLLECTION_ROUTE_MAP[collection.id]) {
        return COLLECTION_ROUTE_MAP[collection.id]
    }

    // For all other collections, use slug-based routing
    return collectionNameToSlug(collection.name)
}

/**
 * Get the full URL path for a collection
 * @param collection - Collection with id and name
 * @returns Full URL path with leading slash
 */
export function getCollectionPath(collection: { id: string; name: string }): string {
    return `/${getCollectionRoute(collection)}`
}

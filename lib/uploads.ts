/**
 * Uploaded images (forum and thread pictures, avatars), kept in the R2 bucket
 * bound as UPLOADS (wrangler.jsonc) and served by the Worker at
 * `/uploads/<userId>/<uuid>.<ext>` (worker/uploads.ts). Replaced Vercel Blob.
 *
 * The app stores the site-relative path, so links keep working when the domain
 * changes. Uploads are served from the site's own origin, so only raster
 * formats are accepted: an SVG could carry script.
 */

/** Accepted types and the extension each is stored under. */
export const UPLOAD_TYPES: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
}

export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024

export const UPLOAD_PREFIX = '/uploads/'

/** The R2 key and public path for a new upload by this user. */
export function newUploadKey(userId: string, type: string): { key: string; path: string } {
    const ext = UPLOAD_TYPES[type]
    if (!ext) throw new Error(`Unsupported upload type: ${type}`)
    const key = `uploads/${userId}/${crypto.randomUUID()}.${ext}`
    return { key, path: `/${key}` }
}

/**
 * The R2 key for an upload URL the user may delete, or null when it isn't
 * one of their uploads. Accepts the stored path or a full URL on any origin;
 * only the pathname counts, so a crafted query string can't pass.
 */
export function ownedUploadKey(url: string, userId: string): string | null {
    let pathname: string
    try {
        pathname = new URL(url, 'https://uploads.invalid').pathname
    } catch {
        return null
    }
    const prefix = `${UPLOAD_PREFIX}${userId}/`
    if (!pathname.startsWith(prefix)) return null
    const name = pathname.slice(prefix.length)
    // One file name, no traversal or nested folders.
    if (!/^[A-Za-z0-9-]+\.[a-z0-9]+$/.test(name)) return null
    return pathname.slice(1)
}

/** The part of the R2 bucket binding that removing a user's uploads needs. */
export interface UploadBucket {
    list(options: { prefix: string; cursor?: string; limit?: number }): Promise<{
        objects: { key: string }[]
        truncated: boolean
        cursor?: string
    }>
    delete(keys: string | string[]): Promise<void>
}

/**
 * The R2 prefix holding every upload of this user. The trailing slash keeps
 * user "ab" from matching user "abc"; an id that could escape its folder is
 * refused rather than turned into a prefix.
 */
export function userUploadPrefix(userId: string): string {
    if (!/^[A-Za-z0-9_-]+$/.test(userId)) throw new Error('Unexpected user id for uploads')
    return `uploads/${userId}/`
}

/**
 * Delete every upload of this user, a page of at most 1,000 keys at a time
 * (R2's limit for both list and delete), and return how many were deleted.
 * Any failure is thrown, never skipped, so the caller can stop and retry.
 */
export async function deleteUserUploads(bucket: UploadBucket, userId: string): Promise<number> {
    const prefix = userUploadPrefix(userId)
    let deleted = 0
    let cursor: string | undefined
    do {
        const page = await bucket.list({ prefix, cursor, limit: 1000 })
        // R2 only returns keys under the prefix; checked again so no other key is ever deleted.
        const keys = page.objects.map((o) => o.key).filter((key) => key.startsWith(prefix))
        if (keys.length > 0) {
            await bucket.delete(keys)
            deleted += keys.length
        }
        if (page.truncated && !page.cursor) throw new Error('R2 listing was cut short')
        cursor = page.truncated ? page.cursor : undefined
    } while (cursor)
    return deleted
}

/** Whether a stored image URL is an upload of ours (and so deletable). */
export function isUploadUrl(url: string): boolean {
    return url.startsWith(UPLOAD_PREFIX)
}

/**
 * The site paths of this user's own uploads among `urls` (at most `max`),
 * for images attached to posts. Anything else (other users' uploads, outside
 * URLs that would load from a third party for every viewer) is dropped.
 */
export function ownUploads(urls: unknown, userId: string, max = 4): string[] {
    if (!Array.isArray(urls)) return []
    return urls
        .filter((u): u is string => typeof u === 'string')
        .map((u) => ownedUploadKey(u, userId))
        .filter((key): key is string => key !== null)
        .map((key) => `/${key}`)
        .slice(0, max)
}

/** Outside hosts an avatar may come from (photos from the retired GitHub sign-in, generated defaults). */
const AVATAR_HOSTS = new Set(['avatars.githubusercontent.com', 'api.dicebear.com'])

/**
 * The URL to store for a new avatar, or null when it is not allowed: one of
 * the user's own uploads (stored as the site path) or an https URL on a known
 * avatar host.
 */
export function allowedAvatarUrl(url: string, userId: string): string | null {
    const own = ownedUploadKey(url, userId)
    if (own) return `/${own}`
    try {
        const parsed = new URL(url)
        if (parsed.protocol === 'https:' && AVATAR_HOSTS.has(parsed.hostname)) return parsed.href
    } catch {
        // Not an absolute URL.
    }
    return null
}

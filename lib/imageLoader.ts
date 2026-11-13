/**
 * next/image's loader (next.config.js images.loaderFile).
 *
 * TMDB images go straight to image.tmdb.org at TMDB's own size closest above
 * the width the browser asks for, so the Worker never fetches or resizes
 * them: TMDB's CDN already serves every size, cached for a year. next/image
 * still writes the srcset from each image's `sizes` (or its width), and keeps
 * its lazy loading, so each slot gets the right file.
 *
 * Everything else (uploads, avatars) keeps Next's own optimizer at /_next/image.
 */

/** image.tmdb.org/t/p/<size>/<file>: the file part, whatever size the caller wrote. */
const TMDB_IMAGE = /^https:\/\/image\.tmdb\.org\/t\/p\/[a-z0-9]+(\/[^/?#]+)$/i

/**
 * Widths TMDB serves for any image (checked for posters, backdrops and
 * profiles). Wider asks get w1280, the size the banner always used: TMDB's
 * `original` can be 4K and several megabytes.
 */
export const TMDB_WIDTHS = [92, 154, 185, 300, 342, 500, 780, 1280] as const

/** next.config.js images.qualities: the optimizer refuses any other value. */
const QUALITIES = [25, 50, 75, 100]

export interface ImageLoaderProps {
    src: string
    width: number
    quality?: number
}

export function tmdbWidth(width: number): number {
    return TMDB_WIDTHS.find((w) => w >= width) ?? TMDB_WIDTHS[TMDB_WIDTHS.length - 1]
}

function closestQuality(quality: number): number {
    return QUALITIES.reduce((best, q) =>
        Math.abs(q - quality) < Math.abs(best - quality) ? q : best
    )
}

export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
    const tmdb = TMDB_IMAGE.exec(src)
    if (tmdb) return `https://image.tmdb.org/t/p/w${tmdbWidth(width)}${tmdb[1]}`
    return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${closestQuality(quality ?? 75)}`
}

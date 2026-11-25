import type { AdvancedFilters, UpdateListRequest, UserList } from '../../../types/collections'
import type { Content } from '../../../typings'
import { homeVisibilityUpdate, isShownOnHome } from '../collectionMeta'

/**
 * The collection editor's draft. Nothing is written until Save: the editor
 * keeps every change here, compares it with the collection it opened with,
 * and turns the difference into one update.
 */
export interface EditorForm {
    name: string
    /** Empty means the collection's default icon (see CollectionIcon). */
    emoji: string
    color: string
    shownOnHome: boolean
    showOnPublicProfile: boolean
    autoFill: boolean
    movies: boolean
    tv: boolean
    genres: string[]
    advancedFilters: AdvancedFilters
    /** Titles the owner added in this session, saved on Save. */
    added: Content[]
    /** Ids of titles the owner took out in this session, removed on Save. */
    removed: number[]
}

export const DEFAULT_COLLECTION_COLOR = '#71717a'

export function formFromCollection(collection: UserList): EditorForm {
    const mediaType = collection.mediaType || 'both'
    const genres = collection.genres || []
    return {
        name: collection.name,
        emoji: collection.emoji || '',
        color: collection.color || DEFAULT_COLLECTION_COLOR,
        shownOnHome: isShownOnHome(collection),
        showOnPublicProfile: collection.showOnPublicProfile ?? true,
        autoFill: genres.length > 0 && (collection.canGenerateMore ?? true),
        movies: mediaType === 'movie' || mediaType === 'both',
        tv: mediaType === 'tv' || mediaType === 'both',
        genres,
        advancedFilters: collection.advancedFilters || {},
        added: [],
        removed: [],
    }
}

function normalized(form: EditorForm) {
    return {
        ...form,
        name: form.name.trim(),
        added: form.added.map((c) => c.id),
        removed: [...form.removed].sort((a, b) => a - b),
        // Empty filter values are the same as no filter
        advancedFilters: Object.fromEntries(
            Object.entries(form.advancedFilters).filter(
                ([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0)
            )
        ),
    }
}

export function isDirty(initial: EditorForm, current: EditorForm): boolean {
    return JSON.stringify(normalized(initial)) !== JSON.stringify(normalized(current))
}

export function mediaTypeOf(form: Pick<EditorForm, 'movies' | 'tv'>): 'movie' | 'tv' | 'both' {
    if (form.movies && !form.tv) return 'movie'
    if (form.tv && !form.movies) return 'tv'
    return 'both'
}

/** Returns an error message, or null when the draft can be saved. */
export function validate(form: EditorForm): string | null {
    if (!form.name.trim()) return 'Give the collection a name'
    if (form.autoFill && form.genres.length === 0) return 'Pick at least one genre to auto-fill'
    if (form.shownOnHome && !form.movies && !form.tv) {
        return 'Turn on Movies or TV shows to show it on home'
    }
    return null
}

/** The metadata update for Save; titles are added and removed separately. */
export function buildUpdate(
    form: EditorForm,
    opts: { limited: boolean }
): Omit<UpdateListRequest, 'id'> {
    const home = homeVisibilityUpdate(form.shownOnHome)
    if (opts.limited) {
        // Collections that cannot be edited (canEdit: false) only show or hide
        return { ...home, showOnPublicProfile: form.showOnPublicProfile }
    }
    const autoFill = form.autoFill && form.genres.length > 0
    return {
        name: form.name.trim(),
        emoji: form.emoji || undefined,
        color: form.color,
        ...home,
        showOnPublicProfile: form.showOnPublicProfile,
        genres: form.genres,
        // Auto-fill matches any of the genres; a fixed list matches all of them
        genreLogic: autoFill ? 'OR' : 'AND',
        mediaType: mediaTypeOf(form),
        canGenerateMore: autoFill,
        advancedFilters: form.advancedFilters,
    }
}

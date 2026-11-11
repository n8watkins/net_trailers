/** Subject lines for the emails whose subject depends on their content. */

export interface DigestInteraction {
    type: 'comment' | 'like'
    rankingId: string
    rankingTitle: string
    commenterName?: string
    commentText?: string
    commentId?: string
    isReply?: boolean
    parentCommentText?: string
    likerNames?: string[]
}

/** Header-safe: one line, trimmed, cut at a word with "..." when long. */
export function oneLine(value: string, max: number): string {
    const text = value.replace(/\s+/g, ' ').trim()
    if (text.length <= max) return text
    const cut = text.lastIndexOf(' ', max)
    return `${text.slice(0, cut > 0 ? cut : max).replace(/[\s,.;:-]+$/, '')}...`
}

export function plural(n: number, one: string, many = `${one}s`): string {
    return `${n} ${n === 1 ? one : many}`
}

/** "A", "A and B", "A, B and C", "A, B and 2 others". */
export function nameList(list: string[]): string {
    const names = [...new Set(list.filter(Boolean))]
    if (names.length === 0) return 'Someone'
    if (names.length === 1) return names[0]
    if (names.length <= 3) return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
    const rest = names.length - 2
    return `${names[0]}, ${names[1]} and ${rest} ${rest === 1 ? 'other' : 'others'}`
}

/** The weekly social digest: names the people and the ranking. */
export function digestSubject(interactions: DigestInteraction[]): string {
    const comments = interactions.filter((i) => i.type === 'comment')
    const likes = interactions.filter((i) => i.type === 'like')
    const likers = likes.flatMap((i) => i.likerNames ?? [])
    const titles = (list: DigestInteraction[]) => [...new Set(list.map((i) => i.rankingTitle))]
    if (comments.length) {
        const where = titles(comments)
        const place = where.length === 1 ? `"${oneLine(where[0], 60)}"` : 'your rankings'
        let subject = `${nameList(comments.map((c) => c.commenterName ?? ''))} commented on ${place}`
        if (likers.length) subject += `, plus ${plural(likers.length, 'like')}`
        return subject
    }
    if (likers.length) {
        const where = titles(likes)
        const place = where.length === 1 ? `"${oneLine(where[0], 60)}"` : 'your rankings'
        return `${nameList(likers)} liked ${place}`
    }
    return 'New activity on your NetTrailers rankings'
}

interface Titled {
    title?: string
    name?: string
}

/** The weekly trending email: the top movie, the top show and the rest. */
export function trendingSubject(movies: Titled[], tvShows: Titled[]): string {
    const title = (c: Titled) => oneLine(c.title ?? c.name ?? '', 50)
    const total = movies.length + tvShows.length
    const lead = [movies[0], tvShows[0]].filter(Boolean)
    const picks = lead.length === 2 ? lead : [...movies, ...tvShows].slice(0, 2)
    if (picks.length === 0) return 'Trending this week on NetTrailers'
    const names = picks.map(title).join(', ')
    if (picks.length === 1) return `Trending this week: ${names}`
    const rest = total - picks.length
    if (rest <= 0) return `Trending this week: ${picks.map(title).join(' and ')}`
    return `Trending this week: ${names} and ${rest} more`
}

/**
 * Reads CHANGELOG.md, which release-kit writes (npm run release, or the weekly
 * release train). Never edit that file by hand; see RELEASING.md.
 *
 * Two kinds of entry live in it:
 * - release-kit releases, newest first:
 *     ## 1.7.0 - 2026-12-01
 *     An optional summary paragraph.
 *     ### New
 *     - Plain sentence ([#12](https://github.com/owner/repo/pull/12))
 * - the hand-written notes from before release-kit, below them, in the Keep a
 *   Changelog style: "## [1.6.0] - 2025-01-14 - Title" (or "[Unreleased]"),
 *   with "###" sections, "####" sub-headings, paragraphs and nested lists.
 *
 * Anything else ("## Statistics", tables, the Keep a Changelog preamble) is
 * left out.
 */

export interface ChangelogListItem {
    text: string
    children: ChangelogListItem[]
}

export type ChangelogBlock =
    | { type: 'paragraph'; text: string }
    | { type: 'heading'; text: string }
    | { type: 'list'; items: ChangelogListItem[] }

export interface ChangelogSection {
    heading: string
    blocks: ChangelogBlock[]
}

export interface ChangelogEntry {
    /** 'release' for a release-kit section, 'legacy' for the hand-written notes */
    kind: 'release' | 'legacy'
    /** x.y.z, or null for a hand-written "[Unreleased]" block */
    version: string | null
    /** YYYY-MM-DD */
    date: string
    /** The hand-written notes' title; release-kit sections have none */
    title: string | null
    /** Paragraphs before the first "###" (release-kit's --summary) */
    intro: ChangelogBlock[]
    sections: ChangelogSection[]
    /** The element id the page uses for links: v1.7.0, or notes-2025-12-03 */
    anchor: string
}

export interface Changelog {
    /** release-kit releases, newest first */
    releases: ChangelogEntry[]
    /** The hand-written notes from before release-kit, in file order */
    legacy: ChangelogEntry[]
}

export interface ChangelogStats {
    /** The newest numbered version, release-kit's first */
    latestVersion: string | null
    /** Its date, YYYY-MM-DD */
    latestDate: string | null
    /** Every numbered release, release-kit's and the hand-written ones */
    releaseCount: number
}

const RELEASE_HEADING = /^## (\d+\.\d+\.\d+) - (\d{4}-\d{2}-\d{2})\s*$/
const LEGACY_HEADING = /^## \[([^\]]+)\] - (\d{4}-\d{2}-\d{2})(?: - (.+?))?\s*$/
const LIST_ITEM = /^(\s*)[-*] (.*)$/
const MONTHS =
    'January|February|March|April|May|June|July|August|September|October|November|December'
/** "Added (December 3, 2025)" -> "Added": the entry already shows its date */
const HEADING_DATE = new RegExp(`\\s*\\((?:${MONTHS})(?: \\d{1,2},)? \\d{4}\\)$`)
/** The Keep a Changelog preamble that sits under release-kit's sections */
const PREAMBLE = [/^All notable changes to /, /^The format is based on \[Keep a Changelog\]/]

/**
 * The list being built in the current section, with the item at each indent
 * level, so a deeper bullet becomes a child of the one above it.
 */
interface OpenList {
    block: { type: 'list'; items: ChangelogListItem[] }
    stack: { indent: number; item: ChangelogListItem }[]
}

export function parseChangelog(markdown: string): Changelog {
    const releases: ChangelogEntry[] = []
    const legacy: ChangelogEntry[] = []

    let entry: ChangelogEntry | null = null
    let section: ChangelogSection | null = null
    let list: OpenList | null = null
    let paragraph: string[] = []
    let inFence = false

    const target = (): ChangelogBlock[] | null => {
        if (!entry) return null
        if (section) return section.blocks
        return entry.intro
    }

    const flushParagraph = () => {
        if (!paragraph.length) return
        const text = paragraph.join(' ').trim()
        paragraph = []
        if (!text || !entry) return
        if (PREAMBLE.some((re) => re.test(text))) return
        // release-kit writes paragraphs only as the summary, before the first
        // section; anything after belongs to the file, not to this release.
        if (entry.kind === 'release' && section) return
        target()?.push({ type: 'paragraph', text })
    }

    const closeBlocks = () => {
        flushParagraph()
        list = null
    }

    const startEntry = (next: ChangelogEntry | null) => {
        closeBlocks()
        section = null
        entry = next
        if (!next) return
        if (next.kind === 'release') releases.push(next)
        else legacy.push(next)
    }

    for (const raw of markdown.replace(/\r\n?/g, '\n').split('\n')) {
        const line = raw.replace(/\s+$/, '')

        if (/^\s*```/.test(line)) {
            closeBlocks()
            inFence = !inFence
            continue
        }
        if (inFence) continue

        if (line.startsWith('## ')) {
            const release = RELEASE_HEADING.exec(line)
            const old = release ? null : LEGACY_HEADING.exec(line)
            if (release) {
                startEntry({
                    kind: 'release',
                    version: release[1],
                    date: release[2],
                    title: null,
                    intro: [],
                    sections: [],
                    anchor: `v${release[1]}`,
                })
            } else if (old) {
                const label = old[1].trim()
                const version = /^\d+\.\d+\.\d+$/.test(label) ? label : null
                startEntry({
                    kind: 'legacy',
                    version,
                    date: old[2],
                    title: old[3]?.trim() || null,
                    intro: [],
                    sections: [],
                    anchor: version ? `v${version}` : `notes-${old[2]}`,
                })
            } else {
                // "## Statistics", "## Upgrade Notes": not a release
                startEntry(null)
            }
            continue
        }

        if (line.startsWith('# ')) {
            closeBlocks()
            continue
        }
        if (!entry) continue
        const current = entry as ChangelogEntry

        if (line.startsWith('### ')) {
            closeBlocks()
            section = { heading: line.slice(4).trim().replace(HEADING_DATE, ''), blocks: [] }
            current.sections.push(section)
            continue
        }

        if (/^#{4,6} /.test(line)) {
            closeBlocks()
            if (current.kind === 'release' && section) continue
            target()?.push({ type: 'heading', text: line.replace(/^#+ /, '').trim() })
            continue
        }

        if (!line.trim()) {
            flushParagraph()
            continue
        }

        // Horizontal rules and tables are layout, not notes
        if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line) || /^\s*\|/.test(line)) {
            closeBlocks()
            continue
        }

        const bullet = LIST_ITEM.exec(line)
        if (bullet) {
            flushParagraph()
            const indent = bullet[1].replace(/\t/g, '    ').length
            const item: ChangelogListItem = { text: bullet[2].trim(), children: [] }
            if (!list) {
                const block = { type: 'list' as const, items: [] as ChangelogListItem[] }
                target()?.push(block)
                list = { block, stack: [] }
            }
            const open: OpenList = list
            while (open.stack.length && open.stack[open.stack.length - 1].indent >= indent) {
                open.stack.pop()
            }
            const parent = open.stack[open.stack.length - 1]
            if (parent) parent.item.children.push(item)
            else open.block.items.push(item)
            open.stack.push({ indent, item })
            continue
        }

        // An indented line under a bullet continues it
        const openList: OpenList | null = list
        if (openList && /^\s+\S/.test(line) && openList.stack.length) {
            const last = openList.stack[openList.stack.length - 1].item
            last.text = `${last.text} ${line.trim()}`
            continue
        }

        list = null
        paragraph.push(line.trim())
    }
    closeBlocks()

    return { releases, legacy }
}

/** The page's header numbers, from the parsed file: nothing is typed by hand. */
export function changelogStats({ releases, legacy }: Changelog): ChangelogStats {
    const numbered = [...releases, ...legacy.filter((entry) => entry.version !== null)]
    const latest = numbered[0] ?? null
    return {
        latestVersion: latest?.version ?? null,
        latestDate: latest?.date ?? null,
        releaseCount: numbered.length,
    }
}

/** "2025-12-03" -> "December 3, 2025", the same in every time zone */
export function formatChangelogDate(date: string): string {
    const [year, month, day] = date.split('-').map(Number)
    if (!year || !month || !day) return date
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, day)))
}

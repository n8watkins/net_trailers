import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
    changelogStats,
    formatChangelogDate,
    parseChangelog,
} from '../../../app/changelog/parseChangelog'

/**
 * What CHANGELOG.md looks like after release-kit's releases: its sections
 * (release.mjs writes "# Changelog", then "## x.y.z - YYYY-MM-DD", an optional
 * --summary paragraph and the notes from notes.mjs renderNotes) on top of the
 * hand-written file it found, Keep a Changelog preamble included.
 */
const RELEASE_KIT_CHANGELOG = `# Changelog

## 1.8.0 - 2027-01-04

### New

- A watch party mode for collections ([#80](https://github.com/n8watkins/net_trailers/pull/80))

### Fixed

- Trailers resume where you left them ([#81](https://github.com/n8watkins/net_trailers/pull/81))
- The \`Esc\` key closes the search box again

## 1.7.1 - 2026-12-08

_Maintenance release: no user-facing changes._

## 1.7.0 - 2026-12-01

A year of work since the last notes.

### New

- NetTrailers runs on Cloudflare Workers, ready to leave Vercel ([#11](https://github.com/n8watkins/net_trailers/pull/11))

### Safer

- Remove two leftover debug pages from the public site ([#56](https://github.com/n8watkins/net_trailers/pull/56))

### Faster

- Prefetch pages on hover, touch or focus instead of on sight ([#55](https://github.com/n8watkins/net_trailers/pull/55))

### Reverted

- Keep Google Analytics (per request)

All notable changes to NetTrailer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2025-12-03 - Production Ready: Email System & Security Hardening

### Added (December 3, 2025)

- **Production Deployment Documentation**
    - Created comprehensive DEPLOYMENT.md guide (300+ lines)
    - Step-by-step Vercel deployment instructions
        - Deeper still
- **Email System Administration** (Admin Portal)
    - Full admin email composer

### User Interface (November 2025)

#### State Management

- **Zustand** with 18 focused stores

**Stores:**

- appStore, sessionStore

## [1.6.0] - 2025-01-14 - Email Notification System

### Added

- Email notifications
  continued on the next line

\`\`\`bash
## not a heading
- not a bullet
\`\`\`

---

## Version History Summary

| Version    | Release Date |
| ---------- | ------------ |
| **v1.6.0** | 2025-01-14   |

## Statistics

- **Total Commits**: 1,240+
`

describe('parseChangelog with a release-kit changelog', () => {
    const changelog = parseChangelog(RELEASE_KIT_CHANGELOG)

    it('reads release-kit releases newest first, with their dates', () => {
        expect(changelog.releases.map((r) => [r.version, r.date, r.kind])).toEqual([
            ['1.8.0', '2027-01-04', 'release'],
            ['1.7.1', '2026-12-08', 'release'],
            ['1.7.0', '2026-12-01', 'release'],
        ])
        expect(changelog.releases.map((r) => r.anchor)).toEqual(['v1.8.0', 'v1.7.1', 'v1.7.0'])
    })

    it("keeps release-kit's headings and notes, links included", () => {
        const [latest] = changelog.releases
        expect(latest.title).toBeNull()
        expect(latest.sections.map((s) => s.heading)).toEqual(['New', 'Fixed'])
        expect(latest.sections[1].blocks).toEqual([
            {
                type: 'list',
                items: [
                    {
                        text: 'Trailers resume where you left them ([#81](https://github.com/n8watkins/net_trailers/pull/81))',
                        children: [],
                    },
                    {
                        text: 'The `Esc` key closes the search box again',
                        children: [],
                    },
                ],
            },
        ])
    })

    it('reads the --summary and the maintenance line as the intro', () => {
        expect(changelog.releases[1].intro).toEqual([
            { type: 'paragraph', text: '_Maintenance release: no user-facing changes._' },
        ])
        expect(changelog.releases[1].sections).toEqual([])
        expect(changelog.releases[2].intro).toEqual([
            { type: 'paragraph', text: 'A year of work since the last notes.' },
        ])
        expect(changelog.releases[2].sections.map((s) => s.heading)).toEqual([
            'New',
            'Safer',
            'Faster',
            'Reverted',
        ])
    })

    it('leaves the Keep a Changelog preamble out of the release above it', () => {
        const oldest = changelog.releases[2]
        const reverted = oldest.sections[oldest.sections.length - 1]
        expect(reverted.blocks).toEqual([
            {
                type: 'list',
                items: [{ text: 'Keep Google Analytics (per request)', children: [] }],
            },
        ])
        expect(JSON.stringify(changelog)).not.toContain('All notable changes')
        expect(JSON.stringify(changelog)).not.toContain('Keep a Changelog')
    })

    it('reads the hand-written notes below as earlier entries, Unreleased by its date', () => {
        expect(changelog.legacy.map((e) => [e.version, e.date, e.title, e.anchor, e.kind])).toEqual(
            [
                [
                    null,
                    '2025-12-03',
                    'Production Ready: Email System & Security Hardening',
                    'notes-2025-12-03',
                    'legacy',
                ],
                ['1.6.0', '2025-01-14', 'Email Notification System', 'v1.6.0', 'legacy'],
            ]
        )
    })

    it('keeps nested bullets as nested lists', () => {
        const added = changelog.legacy[0].sections[0]
        expect(added.heading).toBe('Added')
        expect(added.blocks).toEqual([
            {
                type: 'list',
                items: [
                    {
                        text: '**Production Deployment Documentation**',
                        children: [
                            {
                                text: 'Created comprehensive DEPLOYMENT.md guide (300+ lines)',
                                children: [],
                            },
                            {
                                text: 'Step-by-step Vercel deployment instructions',
                                children: [{ text: 'Deeper still', children: [] }],
                            },
                        ],
                    },
                    {
                        text: '**Email System Administration** (Admin Portal)',
                        children: [{ text: 'Full admin email composer', children: [] }],
                    },
                ],
            },
        ])
    })

    it('keeps sub-headings and paragraphs inside hand-written sections', () => {
        const ui = changelog.legacy[0].sections[1]
        expect(ui.heading).toBe('User Interface')
        expect(ui.blocks.map((b) => b.type)).toEqual(['heading', 'list', 'paragraph', 'list'])
        expect(ui.blocks[0]).toEqual({ type: 'heading', text: 'State Management' })
        expect(ui.blocks[2]).toEqual({ type: 'paragraph', text: '**Stores:**' })
    })

    it('joins a wrapped bullet and skips code blocks, rules, tables and summary sections', () => {
        const v160 = changelog.legacy[1]
        expect(v160.sections).toEqual([
            {
                heading: 'Added',
                blocks: [
                    {
                        type: 'list',
                        items: [
                            {
                                text: 'Email notifications continued on the next line',
                                children: [],
                            },
                        ],
                    },
                ],
            },
        ])
        expect(JSON.stringify(changelog)).not.toContain('not a bullet')
        expect(JSON.stringify(changelog)).not.toContain('Total Commits')
    })

    it('computes the header numbers from the entries', () => {
        expect(changelogStats(changelog)).toEqual({
            latestVersion: '1.8.0',
            latestDate: '2027-01-04',
            releaseCount: 4,
        })
    })
})

describe('changelogStats before the first release-kit release', () => {
    it('falls back to the newest hand-written version, skipping Unreleased blocks', () => {
        const changelog = parseChangelog(
            '# Changelog\n\n## [Unreleased] - 2025-12-03 - Later\n\n### Added\n\n- x\n\n## [1.6.0] - 2025-01-14 - Email\n\n### Added\n\n- y\n'
        )
        expect(changelog.releases).toEqual([])
        expect(changelogStats(changelog)).toEqual({
            latestVersion: '1.6.0',
            latestDate: '2025-01-14',
            releaseCount: 1,
        })
    })

    it('has no numbers for an empty file', () => {
        expect(changelogStats(parseChangelog('# Changelog\n'))).toEqual({
            latestVersion: null,
            latestDate: null,
            releaseCount: 0,
        })
    })
})

describe('the real CHANGELOG.md', () => {
    const changelog = parseChangelog(readFileSync(join(process.cwd(), 'CHANGELOG.md'), 'utf8'))

    it('parses every entry with a date and at least one section', () => {
        const entries = [...changelog.releases, ...changelog.legacy]
        expect(entries.length).toBeGreaterThan(0)
        for (const entry of entries) {
            expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
            expect(entry.sections.length + entry.intro.length).toBeGreaterThan(0)
        }
        expect(changelogStats(changelog).latestVersion).toMatch(/^\d+\.\d+\.\d+$/)
    })

    it('matches the version in package.json once release-kit has released', () => {
        const { version } = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'))
        if (changelog.releases.length > 0) {
            expect(changelog.releases[0].version).toBe(version)
        } else {
            expect(changelogStats(changelog).latestVersion).toBe(version)
        }
    })
})

describe('formatChangelogDate', () => {
    it('writes the date out the same in every time zone', () => {
        expect(formatChangelogDate('2025-12-03')).toBe('December 3, 2025')
        expect(formatChangelogDate('2026-01-01')).toBe('January 1, 2026')
    })

    it('returns anything else unchanged', () => {
        expect(formatChangelogDate('soon')).toBe('soon')
    })
})

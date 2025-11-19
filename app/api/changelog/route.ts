import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface ChangelogVersion {
    version: string
    date: string
    title: string
    sections: Record<string, string[]>
    isUnreleased: boolean
}

/**
 * Simple and robust CHANGELOG.md parser
 */
function parseChangelog(content: string): ChangelogVersion[] {
    const versions: ChangelogVersion[] = []
    const lines = content.split('\n')

    let currentVersion: ChangelogVersion | null = null
    let currentSection: string | null = null

    for (const line of lines) {
        // Match version header: ## [Version] - Date - Title
        if (line.startsWith('## [')) {
            // Save previous version
            if (currentVersion) {
                versions.push(currentVersion)
            }

            // Parse version line
            const match = line.match(/^##\s+\[(.+?)\]\s+-\s+(.+?)\s+-\s+(.+)$/)
            if (match) {
                currentVersion = {
                    version: match[1].trim(),
                    date: match[2].trim(),
                    title: match[3].trim(),
                    sections: {},
                    isUnreleased: match[1].trim().toLowerCase() === 'unreleased',
                }
                currentSection = null
            }
            continue
        }

        // Match section header: ### SectionName
        if (line.startsWith('### ') && currentVersion) {
            currentSection = line.substring(4).trim()
            if (!currentVersion.sections[currentSection]) {
                currentVersion.sections[currentSection] = []
            }
            continue
        }

        // Match list item: - Item or    - Sub-item
        if (line.trim().startsWith('-') && currentVersion && currentSection) {
            const item = line.trim().substring(1).trim()
            if (item) {
                // Check if this is a continuation/sub-item (indented)
                if (
                    line.startsWith('    -') &&
                    currentVersion.sections[currentSection].length > 0
                ) {
                    // Append to last item
                    const lastIndex = currentVersion.sections[currentSection].length - 1
                    currentVersion.sections[currentSection][lastIndex] += ' ' + item
                } else {
                    // New item
                    currentVersion.sections[currentSection].push(item)
                }
            }
            continue
        }
    }

    // Add last version
    if (currentVersion) {
        versions.push(currentVersion)
    }

    return versions
}

export async function GET() {
    try {
        const changelogPath = path.join(process.cwd(), 'CHANGELOG.md')

        // Check if file exists
        if (!fs.existsSync(changelogPath)) {
            return NextResponse.json({ error: 'CHANGELOG.md not found' }, { status: 404 })
        }

        // Read file
        const content = fs.readFileSync(changelogPath, 'utf-8')

        // Parse changelog
        const versions = parseChangelog(content)

        return NextResponse.json(
            {
                versions,
                lastUpdated: new Date().toISOString(),
            },
            {
                headers: {
                    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
                },
            }
        )
    } catch (error) {
        console.error('Error reading changelog:', error)
        return NextResponse.json({ error: 'Failed to read changelog' }, { status: 500 })
    }
}

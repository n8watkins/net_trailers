import type { Metadata } from 'next'
import Link from 'next/link'
import fs from 'fs'
import path from 'path'

export const metadata: Metadata = {
    title: 'Changelog - NetTrailer',
    description:
        'NetTrailer version history and changelog - Track all updates, features, and improvements to the platform',
    keywords: ['changelog', 'updates', 'version', 'history', 'releases'],
}

export default function ChangelogPage() {
    // Read changelog from file
    const changelogPath = path.join(process.cwd(), 'CHANGELOG.md')
    const changelogContent = fs.existsSync(changelogPath)
        ? fs.readFileSync(changelogPath, 'utf8')
        : '# Changelog\n\nChangelog not found.'

    // Parse markdown into sections
    const sections = parseChangelog(changelogContent)

    return (
        <div className="relative min-h-screen bg-gradient-to-b from-gray-900/10 to-[#0a0a0a]">
            <main className="relative pl-4 pb-24 lg:space-y-24 lg:pl-16 mt-20">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-white mb-4">Changelog</h1>
                        <p className="text-gray-300 text-lg">
                            Track all updates, features, and improvements to NetTrailer
                        </p>
                    </div>

                    {/* Version Summary Table */}
                    <div className="mb-12 bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                        <h2 className="text-2xl font-semibold text-white mb-4">Version History</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-gray-700">
                                        <th className="pb-3 text-gray-400 font-medium">Version</th>
                                        <th className="pb-3 text-gray-400 font-medium">Date</th>
                                        <th className="pb-3 text-gray-400 font-medium">
                                            Key Features
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-300">
                                    <tr className="border-b border-gray-700/50">
                                        <td className="py-3 font-mono text-green-400">v1.6.0</td>
                                        <td className="py-3">2025-01-14</td>
                                        <td className="py-3">Email Notification System</td>
                                    </tr>
                                    <tr className="border-b border-gray-700/50">
                                        <td className="py-3 font-mono text-green-400">v1.5.0</td>
                                        <td className="py-3">2025-01-13</td>
                                        <td className="py-3">
                                            Performance Optimizations & Image Compression
                                        </td>
                                    </tr>
                                    <tr className="border-b border-gray-700/50">
                                        <td className="py-3 font-mono text-green-400">v1.4.0</td>
                                        <td className="py-3">2025-01-10</td>
                                        <td className="py-3">Forum & Discussion System</td>
                                    </tr>
                                    <tr className="border-b border-gray-700/50">
                                        <td className="py-3 font-mono text-green-400">v1.3.0</td>
                                        <td className="py-3">2025-01-05</td>
                                        <td className="py-3">Rankings & Community Features</td>
                                    </tr>
                                    <tr className="border-b border-gray-700/50">
                                        <td className="py-3 font-mono text-green-400">v1.2.0</td>
                                        <td className="py-3">2024-12-20</td>
                                        <td className="py-3">Smart Search & AI Features</td>
                                    </tr>
                                    <tr className="border-b border-gray-700/50">
                                        <td className="py-3 font-mono text-green-400">v1.1.0</td>
                                        <td className="py-3">2024-12-01</td>
                                        <td className="py-3">Custom Collections System</td>
                                    </tr>
                                    <tr>
                                        <td className="py-3 font-mono text-blue-400">v1.0.0</td>
                                        <td className="py-3">2024-11-01</td>
                                        <td className="py-3">Initial Production Release</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Project Statistics */}
                    <div className="mb-12 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 text-center">
                            <div className="text-3xl font-bold text-green-400 mb-1">931+</div>
                            <div className="text-sm text-gray-400">Total Commits</div>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 text-center">
                            <div className="text-3xl font-bold text-blue-400 mb-1">13</div>
                            <div className="text-sm text-gray-400">Major Features</div>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 text-center">
                            <div className="text-3xl font-bold text-purple-400 mb-1">35+</div>
                            <div className="text-sm text-gray-400">API Routes</div>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 text-center">
                            <div className="text-3xl font-bold text-orange-400 mb-1">50k+</div>
                            <div className="text-sm text-gray-400">Lines of Code</div>
                        </div>
                    </div>

                    {/* Detailed Changelog Sections */}
                    <div className="space-y-8">
                        {sections.map((section, index) => (
                            <div
                                key={index}
                                id={section.id}
                                className="bg-gray-800/30 rounded-lg p-6 border border-gray-700/50"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-2xl font-semibold text-white">
                                        {section.title}
                                    </h2>
                                    {section.version && (
                                        <span className="text-sm font-mono px-3 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                                            {section.version}
                                        </span>
                                    )}
                                </div>
                                <div
                                    className="prose prose-invert prose-gray max-w-none"
                                    dangerouslySetInnerHTML={{ __html: section.content }}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Footer Links */}
                    <div className="mt-12 text-center space-y-4">
                        <p className="text-gray-400">
                            For detailed commit history, see{' '}
                            <code className="text-sm bg-gray-800 px-2 py-1 rounded">git log</code>
                        </p>
                        <div className="flex justify-center gap-4">
                            <Link
                                href="/"
                                className="text-netflix-red hover:text-red-500 transition-colors"
                            >
                                ← Back to Home
                            </Link>
                            <Link
                                href="/settings"
                                className="text-netflix-red hover:text-red-500 transition-colors"
                            >
                                Settings →
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

interface ChangelogSection {
    id: string
    version: string | null
    title: string
    content: string
}

function parseChangelog(markdown: string): ChangelogSection[] {
    const sections: ChangelogSection[] = []
    const lines = markdown.split('\n')
    let currentSection: ChangelogSection | null = null
    let currentContent: string[] = []

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        // Check for version heading (## [1.6.0] - 2025-01-14 - Email Notification System)
        const versionMatch = line.match(/^## \[([0-9.]+)\] - (.+)/)
        if (versionMatch) {
            // Save previous section
            if (currentSection) {
                currentSection.content = formatContent(currentContent.join('\n'))
                sections.push(currentSection)
            }

            // Start new section
            const version = versionMatch[1]
            const title = versionMatch[2]
            currentSection = {
                id: `v${version}`,
                version: `v${version}`,
                title: title,
                content: '',
            }
            currentContent = []
            continue
        }

        // Check for other major headings
        const headingMatch = line.match(/^## (.+)/)
        if (headingMatch && !versionMatch) {
            // Save previous section
            if (currentSection) {
                currentSection.content = formatContent(currentContent.join('\n'))
                sections.push(currentSection)
            }

            // Start new section
            const title = headingMatch[1]
            currentSection = {
                id: title.toLowerCase().replace(/\s+/g, '-'),
                version: null,
                title: title,
                content: '',
            }
            currentContent = []
            continue
        }

        // Add content to current section
        if (currentSection && line !== '---') {
            currentContent.push(line)
        }
    }

    // Save last section
    if (currentSection) {
        currentSection.content = formatContent(currentContent.join('\n'))
        sections.push(currentSection)
    }

    return sections
}

function formatContent(markdown: string): string {
    // Basic markdown to HTML conversion
    let html = markdown

    // Headings
    html = html.replace(
        /^### (.+)$/gm,
        '<h3 class="text-xl font-semibold text-white mt-6 mb-3">$1</h3>'
    )
    html = html.replace(
        /^#### (.+)$/gm,
        '<h4 class="text-lg font-semibold text-gray-200 mt-4 mb-2">$1</h4>'
    )

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')

    // Lists
    html = html.replace(/^- (.+)$/gm, '<li class="ml-4 text-gray-300">$1</li>')
    html = html.replace(
        /(<li.*<\/li>\n?)+/gs,
        '<ul class="list-disc list-inside space-y-1 mb-4">$&</ul>'
    )

    // Code blocks
    html = html.replace(
        /`([^`]+)`/g,
        '<code class="text-sm bg-gray-700 px-2 py-1 rounded text-green-400">$1</code>'
    )

    // Paragraphs
    html = html.replace(/^([^<\n].+)$/gm, '<p class="text-gray-300 mb-3">$1</p>')

    // Tables
    html = html.replace(/\|(.+)\|/g, (match) => {
        const cells = match
            .split('|')
            .filter((cell) => cell.trim())
            .map((cell) => `<td class="px-4 py-2 border-b border-gray-700">${cell.trim()}</td>`)
        return `<tr>${cells.join('')}</tr>`
    })
    html = html.replace(
        /(<tr>.*<\/tr>\n?)+/gs,
        '<table class="w-full text-left mb-4"><tbody>$&</tbody></table>'
    )

    return html
}

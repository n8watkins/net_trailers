'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
    DocumentTextIcon,
    AcademicCapIcon,
    InformationCircleIcon,
    ChevronDownIcon,
    ChevronUpIcon,
} from '@heroicons/react/24/outline'
import SubPageLayout from '@/components/layout/SubPageLayout'
import AboutModal from '@/components/modals/AboutModal'
import TutorialModal from '@/components/modals/TutorialModal'

interface ChangelogVersion {
    version: string
    date: string
    title: string
    sections: Record<string, string[]>
    isUnreleased?: boolean
}

export default function ChangelogPage() {
    const [showAbout, setShowAbout] = useState(false)
    const [showTutorial, setShowTutorial] = useState(false)
    const [versions, setVersions] = useState<ChangelogVersion[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set())

    // Fetch changelog data
    useEffect(() => {
        fetch('/api/changelog')
            .then((res) => res.json())
            .then((data) => {
                setVersions(data.versions || [])
                setLoading(false)
                // Expand the first version by default (Unreleased or latest)
                if (data.versions && data.versions.length > 0) {
                    setExpandedVersions(new Set([data.versions[0].version]))
                }
            })
            .catch((err) => {
                console.error('Failed to load changelog:', err)
                setError('Failed to load changelog')
                setLoading(false)
            })
    }, [])

    const updateUrlHash = useCallback((hash?: string) => {
        if (typeof window === 'undefined') return
        const basePath = `${window.location.pathname}${window.location.search || ''}`
        window.history.pushState(null, '', hash ? `${basePath}#${hash}` : basePath)
    }, [])

    const toggleVersion = (version: string) => {
        setExpandedVersions((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(version)) {
                newSet.delete(version)
                if (typeof window !== 'undefined' && window.location.hash === `#v${version}`) {
                    updateUrlHash()
                }
            } else {
                newSet.add(version)
                updateUrlHash(`v${version}`)
            }
            return newSet
        })
    }

    // Handle URL hash on mount
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.slice(1)
            if (hash.startsWith('v')) {
                const version = hash.slice(1)
                setExpandedVersions((prev) => {
                    const newSet = new Set(prev)
                    newSet.add(version)
                    return newSet
                })
                setTimeout(() => {
                    const element = document.getElementById(hash)
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                }, 100)
            }
        }

        handleHashChange()
        window.addEventListener('hashchange', handleHashChange)
        return () => window.removeEventListener('hashchange', handleHashChange)
    }, [])

    const expandAll = () => {
        setExpandedVersions(new Set(versions.map((v) => v.version)))
    }

    const collapseAll = () => {
        setExpandedVersions(new Set())
    }

    // Count releases (excluding Unreleased)
    const releaseCount = versions.filter((v) => !v.isUnreleased).length

    // Get latest version (first non-unreleased)
    const latestVersion = versions.find((v) => !v.isUnreleased)

    return (
        <>
            <SubPageLayout
                title="Changelog"
                icon={<DocumentTextIcon className="w-8 h-8" />}
                iconColor="text-blue-400"
                description="Version history and release notes for NetTrailer"
            >
                <div className="max-w-5xl mx-auto space-y-8">
                    {/* Loading State */}
                    {loading && (
                        <div className="text-center py-12">
                            <div className="text-gray-400">Loading changelog...</div>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="text-center py-12">
                            <div className="text-red-400">{error}</div>
                        </div>
                    )}

                    {/* Content */}
                    {!loading && !error && (
                        <>
                            {/* Quick Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                <StatCard number="933+" label="Commits" color="green" />
                                <StatCard
                                    number={`v${latestVersion?.version || 'N/A'}`}
                                    label="Current Version"
                                    color="blue"
                                />
                                <StatCard
                                    number={releaseCount.toString()}
                                    label="Total Releases"
                                    color="purple"
                                />
                                <StatCard number="4 mos" label="Development" color="orange" />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-4 mb-8">
                                <button
                                    onClick={() => setShowTutorial(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                                >
                                    <AcademicCapIcon className="w-5 h-5" />
                                    <span>View Tutorial</span>
                                </button>
                                <button
                                    onClick={() => setShowAbout(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/30 hover:bg-purple-500/30 transition-colors"
                                >
                                    <InformationCircleIcon className="w-5 h-5" />
                                    <span>About NetTrailer</span>
                                </button>
                                <a
                                    href="https://github.com/n8watkins/net_trailers"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 text-gray-300 rounded-lg border border-gray-600/50 hover:bg-gray-700 transition-colors"
                                >
                                    <svg
                                        className="w-5 h-5"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    <span>View on GitHub</span>
                                </a>
                                <a
                                    href="https://github.com/n8watkins/net_trailers/issues"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg border border-orange-500/30 hover:bg-orange-500/30 transition-colors"
                                >
                                    <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                        />
                                    </svg>
                                    <span>Report Issue</span>
                                </a>
                            </div>

                            {/* Expand/Collapse Controls */}
                            {versions.length > 0 && (
                                <div className="flex gap-3 mb-6">
                                    <button
                                        onClick={expandAll}
                                        className="text-sm px-3 py-1.5 bg-green-500/20 text-green-400 rounded border border-green-500/30 hover:bg-green-500/30 transition-colors"
                                    >
                                        Expand All
                                    </button>
                                    <button
                                        onClick={collapseAll}
                                        className="text-sm px-3 py-1.5 bg-red-500/20 text-red-400 rounded border border-red-500/30 hover:bg-red-500/30 transition-colors"
                                    >
                                        Collapse All
                                    </button>
                                </div>
                            )}

                            {/* Version Releases */}
                            <div className="space-y-6">
                                {versions.map((version, index) => (
                                    <VersionRelease
                                        key={version.version}
                                        version={version}
                                        isExpanded={expandedVersions.has(version.version)}
                                        onToggle={() => toggleVersion(version.version)}
                                        isFirst={index === 0}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </SubPageLayout>

            <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
            <TutorialModal isOpen={showTutorial} onClose={() => setShowTutorial(false)} />
        </>
    )
}

// Component definitions
function StatCard({
    number,
    label,
    color,
}: {
    number: string
    label: string
    color: 'green' | 'blue' | 'purple' | 'orange'
}) {
    const colorClasses = {
        green: 'text-green-400 border-green-500/30',
        blue: 'text-blue-400 border-blue-500/30',
        purple: 'text-purple-400 border-purple-500/30',
        orange: 'text-orange-400 border-orange-500/30',
    }

    return (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 text-center">
            <div
                className={`text-2xl md:text-3xl font-bold mb-1 ${colorClasses[color].split(' ')[0]}`}
            >
                {number}
            </div>
            <div className="text-xs md:text-sm text-gray-400">{label}</div>
        </div>
    )
}

function VersionRelease({
    version,
    isExpanded,
    onToggle,
    isFirst,
}: {
    version: ChangelogVersion
    isExpanded: boolean
    onToggle: () => void
    isFirst: boolean
}) {
    const versionColor = version.isUnreleased
        ? 'text-orange-400 border-orange-500'
        : 'text-green-400 border-green-500'

    // Render markdown-style text with bold formatting
    const renderText = (text: string) => {
        const parts = text.split(/(\*\*[^*]+\*\*)/)
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return (
                    <strong key={i} className="text-white font-semibold">
                        {part.slice(2, -2)}
                    </strong>
                )
            }
            return <span key={i}>{part}</span>
        })
    }

    return (
        <div className="relative" id={`v${version.version}`}>
            <button
                onClick={onToggle}
                className="w-full text-left group transition-all hover:bg-gray-800/20 rounded-lg p-4 -m-4"
                aria-expanded={isExpanded}
            >
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                            <div
                                className={`text-4xl font-bold font-mono ${versionColor.split(' ')[0]}`}
                            >
                                {version.isUnreleased ? 'Unreleased' : `v${version.version}`}
                            </div>
                            {isFirst && !version.isUnreleased && (
                                <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-semibold rounded-full border border-red-500/30">
                                    Latest
                                </span>
                            )}
                            {version.isUnreleased && (
                                <span className="px-3 py-1 bg-orange-500/20 text-orange-400 text-xs font-semibold rounded-full border border-orange-500/30">
                                    Upcoming
                                </span>
                            )}
                        </div>
                        <div className="text-gray-400 text-sm mb-2">{version.date}</div>
                        <h2 className="text-2xl md:text-3xl font-bold text-white">
                            {version.title}
                        </h2>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                        {isExpanded ? (
                            <ChevronUpIcon className="w-8 h-8 text-gray-400 group-hover:text-white transition-colors" />
                        ) : (
                            <ChevronDownIcon className="w-8 h-8 text-gray-400 group-hover:text-white transition-colors" />
                        )}
                    </div>
                </div>
            </button>

            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded ? 'max-h-[5000px] opacity-100 mt-6' : 'max-h-0 opacity-0'
                }`}
            >
                <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700/50">
                    {Object.entries(version.sections).map(([sectionName, items]) => {
                        // Skip text sections (handled separately)
                        if (sectionName.endsWith('_text')) return null

                        return (
                            <div key={sectionName} className="mb-6 last:mb-0">
                                <h4 className="text-white font-semibold mb-3">{sectionName}</h4>
                                {Array.isArray(items) && items.length > 0 && (
                                    <ul className="space-y-2 text-gray-300 list-disc list-inside">
                                        {items.map((item, i) => (
                                            <li key={i}>{renderText(item)}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

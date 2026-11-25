'use client'

import { useEffect } from 'react'
import {
    AcademicCapIcon,
    ChevronDownIcon,
    DocumentTextIcon,
    InformationCircleIcon,
} from '@heroicons/react/24/outline'
import SubPageLayout from '@/components/layout/SubPageLayout'
import { useLayoutContext } from '@/contexts/LayoutContext'
import ChangelogInline from './ChangelogInline'
import {
    formatChangelogDate,
    type Changelog,
    type ChangelogBlock,
    type ChangelogEntry,
    type ChangelogListItem,
    type ChangelogStats,
} from './parseChangelog'

const REPO_URL = 'https://github.com/n8watkins/net_trailers'

const focusRing =
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black'
const actionClass = `inline-flex h-9 items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-gray-300 transition-colors hover:border-zinc-500 hover:text-white ${focusRing}`

interface ChangelogViewProps {
    changelog: Changelog
    stats: ChangelogStats
}

export default function ChangelogView({ changelog, stats }: ChangelogViewProps) {
    // The same Help and About windows as the header, footer and shortcuts
    // (ClientLayout), so they offer the tour here too.
    const { onOpenTutorial, onOpenAboutModal } = useLayoutContext()
    const { releases, legacy } = changelog

    useOpenLinkedEntry()

    return (
        <SubPageLayout
            title="Changelog"
            icon={<DocumentTextIcon />}
            iconColor="text-brand-400"
            titleActions={
                <>
                    {onOpenTutorial && (
                        <button type="button" onClick={onOpenTutorial} className={actionClass}>
                            <AcademicCapIcon className="h-4 w-4 text-brand-400" />
                            Help & tutorial
                        </button>
                    )}
                    {onOpenAboutModal && (
                        <button type="button" onClick={onOpenAboutModal} className={actionClass}>
                            <InformationCircleIcon className="h-4 w-4 text-brand-400" />
                            About this project
                        </button>
                    )}
                </>
            }
        >
            <div className="max-w-4xl space-y-10">
                <div className="space-y-3">
                    {stats.latestVersion && (
                        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                            <Stat label="Latest" value={`v${stats.latestVersion}`} />
                            {stats.latestDate && (
                                <Stat
                                    label="Released"
                                    value={formatChangelogDate(stats.latestDate)}
                                />
                            )}
                            <Stat label="Releases" value={String(stats.releaseCount)} />
                        </dl>
                    )}
                    <p className="max-w-2xl text-gray-400">
                        What changed in each release, written from its commits when it ships.{' '}
                        <a
                            href={`${REPO_URL}/releases`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`rounded font-medium text-brand-400 hover:text-brand-300 ${focusRing}`}
                        >
                            Releases on GitHub
                        </a>
                        {' · '}
                        <a
                            href={`${REPO_URL}/issues`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`rounded font-medium text-brand-400 hover:text-brand-300 ${focusRing}`}
                        >
                            Report an issue
                        </a>
                    </p>
                </div>

                {releases.length > 0 && (
                    <div className="space-y-6">
                        {releases.map((entry, index) => (
                            <article
                                key={entry.anchor}
                                id={entry.anchor}
                                className="scroll-mt-40 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6"
                            >
                                <header className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                    <h2 className="text-2xl font-bold text-white">
                                        v{entry.version}
                                    </h2>
                                    {index === 0 && (
                                        <span className="rounded-full border border-brand-500/40 bg-brand-500/10 px-2.5 py-0.5 text-xs font-semibold text-brand-300">
                                            Latest
                                        </span>
                                    )}
                                    <time dateTime={entry.date} className="text-sm text-gray-400">
                                        {formatChangelogDate(entry.date)}
                                    </time>
                                </header>
                                <EntryBody entry={entry} />
                            </article>
                        ))}
                    </div>
                )}

                {legacy.length > 0 && (
                    <section aria-labelledby="earlier-notes" className="space-y-4">
                        <div>
                            <h2 id="earlier-notes" className="text-xl font-semibold text-white">
                                Earlier notes
                            </h2>
                            <p className="mt-1 text-sm text-gray-400">
                                Written by hand before releases were generated from commits.
                            </p>
                        </div>
                        <div className="space-y-3">
                            {legacy.map((entry, index) => (
                                <details
                                    key={`${entry.anchor}-${index}`}
                                    id={entry.anchor}
                                    open={releases.length === 0 && index === 0}
                                    className="group scroll-mt-40 rounded-2xl border border-zinc-800 bg-zinc-900/40"
                                >
                                    <summary
                                        className={`flex cursor-pointer list-none items-start gap-3 rounded-2xl p-4 sm:p-5 [&::-webkit-details-marker]:hidden ${focusRing}`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                                {entry.version && (
                                                    <span className="text-lg font-bold text-white">
                                                        v{entry.version}
                                                    </span>
                                                )}
                                                <time
                                                    dateTime={entry.date}
                                                    className="text-sm text-gray-400"
                                                >
                                                    {formatChangelogDate(entry.date)}
                                                </time>
                                            </div>
                                            {entry.title && (
                                                <p className="mt-1 font-semibold text-gray-200">
                                                    {entry.title}
                                                </p>
                                            )}
                                        </div>
                                        <ChevronDownIcon
                                            className="mt-1 h-5 w-5 shrink-0 text-gray-400 transition-transform group-open:rotate-180"
                                            aria-hidden="true"
                                        />
                                    </summary>
                                    <div className="border-t border-zinc-800 px-4 pb-5 pt-4 sm:px-5">
                                        <EntryBody entry={entry} />
                                    </div>
                                </details>
                            ))}
                        </div>
                    </section>
                )}

                {releases.length === 0 && legacy.length === 0 && (
                    <p className="text-gray-400">No releases yet.</p>
                )}
            </div>
        </SubPageLayout>
    )
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-baseline gap-2">
            <dt className="text-gray-400">{label}</dt>
            <dd className="font-semibold text-white">{value}</dd>
        </div>
    )
}

function EntryBody({ entry }: { entry: ChangelogEntry }) {
    return (
        <div className="space-y-5 text-[15px] leading-relaxed text-gray-300">
            {entry.intro.length > 0 && <Blocks blocks={entry.intro} />}
            {entry.sections.map((section, i) => (
                <div key={`${section.heading}-${i}`}>
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-gray-400">
                        {section.heading}
                    </h3>
                    <Blocks blocks={section.blocks} />
                </div>
            ))}
        </div>
    )
}

function Blocks({ blocks }: { blocks: ChangelogBlock[] }) {
    return (
        <div className="space-y-3">
            {blocks.map((block, i) => {
                if (block.type === 'heading') {
                    return (
                        <h4 key={i} className="pt-1 font-semibold text-white">
                            <ChangelogInline text={block.text} />
                        </h4>
                    )
                }
                if (block.type === 'paragraph') {
                    return (
                        <p key={i}>
                            <ChangelogInline text={block.text} />
                        </p>
                    )
                }
                return <List key={i} items={block.items} depth={0} />
            })}
        </div>
    )
}

function List({ items, depth }: { items: ChangelogListItem[]; depth: number }) {
    return (
        <ul
            className={`space-y-1.5 pl-5 ${
                depth === 0
                    ? 'list-disc marker:text-brand-400'
                    : 'mt-1.5 list-[circle] marker:text-gray-500'
            }`}
        >
            {items.map((item, i) => (
                <li key={i} className="pl-1">
                    <ChangelogInline text={item.text} />
                    {item.children.length > 0 && <List items={item.children} depth={depth + 1} />}
                </li>
            ))}
        </ul>
    )
}

/** A link to #v1.4.0 opens that entry's notes and scrolls to it. */
function useOpenLinkedEntry() {
    useEffect(() => {
        const open = () => {
            const id = decodeURIComponent(window.location.hash.slice(1))
            if (!id) return
            const target = document.getElementById(id)
            if (!target) return
            if (target instanceof HTMLDetailsElement) target.open = true
            target.scrollIntoView?.({ block: 'start' })
        }
        open()
        window.addEventListener('hashchange', open)
        return () => window.removeEventListener('hashchange', open)
    }, [])
}

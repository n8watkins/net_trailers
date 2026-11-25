'use client'

import type { ComponentType } from 'react'
import Image from 'next/image'
import {
    ArrowTopRightOnSquareIcon,
    ComputerDesktopIcon,
    FingerPrintIcon,
    KeyIcon,
    LockClosedIcon,
    ServerIcon,
} from '@heroicons/react/24/outline'
import SubPageLayout from '@/components/layout/SubPageLayout'
import {
    SECURITY_DOC_URL,
    SECURITY_INTRO,
    SECURITY_ISSUES_URL,
    SECURITY_SECTIONS,
    type SecurityIcon,
} from './content'

const ICONS: Record<SecurityIcon, ComponentType<{ className?: string }>> = {
    signin: FingerPrintIcon,
    data: LockClosedIcon,
    limits: ServerIcon,
    browser: ComputerDesktopIcon,
    child: KeyIcon,
}

const linkClass =
    'inline-flex min-h-11 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black'

export default function SecurityPage() {
    return (
        <SubPageLayout
            title="NetTrailers security"
            icon={
                <Image
                    src="/nettrailers-mark.svg"
                    width={28}
                    height={28}
                    alt=""
                    unoptimized
                    className="h-7 w-7"
                />
            }
            description={SECURITY_INTRO}
        >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {SECURITY_SECTIONS.map((section) => {
                    const Icon = ICONS[section.icon]
                    return (
                        <section
                            key={section.id}
                            aria-labelledby={`security-${section.id}`}
                            className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6"
                        >
                            <div className="mb-4 flex items-center gap-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
                                    <Icon className="h-5 w-5" aria-hidden="true" />
                                </span>
                                <h2
                                    id={`security-${section.id}`}
                                    className="text-lg font-semibold text-white"
                                >
                                    {section.title}
                                </h2>
                            </div>
                            <ul className="space-y-3">
                                {section.claims.map((claim) => (
                                    <li
                                        key={claim.text}
                                        className="flex gap-3 text-[15px] leading-snug text-gray-300"
                                    >
                                        <span
                                            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500"
                                            aria-hidden="true"
                                        />
                                        <span>{claim.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )
                })}

                <section
                    aria-labelledby="security-more"
                    className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6"
                >
                    <h2 id="security-more" className="mb-2 text-lg font-semibold text-white">
                        More detail
                    </h2>
                    <p className="text-[15px] leading-snug text-gray-300">
                        The full write-up lives next to the code. If you find a problem, open an
                        issue and leave out anything that would help someone exploit it.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <a
                            href={SECURITY_DOC_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${linkClass} bg-brand-500 text-white hover:bg-brand-400`}
                        >
                            Read SECURITY.md
                            <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                        </a>
                        <a
                            href={SECURITY_ISSUES_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${linkClass} border border-zinc-700 text-gray-100 hover:border-brand-500/60 hover:bg-zinc-900`}
                        >
                            Report a problem
                            <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                        </a>
                    </div>
                </section>
            </div>
        </SubPageLayout>
    )
}

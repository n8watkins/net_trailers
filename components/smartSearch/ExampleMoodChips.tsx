'use client'

import Link from '@/components/common/Link'
import { EXAMPLE_MOODS } from '../../constants/exampleMoods'

interface ExampleMoodChipsProps {
    className?: string
    /** Lead-in text before the chips. */
    label?: string
}

/**
 * Ready-made moods with saved results: a click opens them instantly and never
 * spends AI quota (constants/exampleMoods.ts).
 */
export default function ExampleMoodChips({
    className = '',
    label = 'Or try an example:',
}: ExampleMoodChipsProps) {
    return (
        // Phones: one swipeable line, so the hero keeps its height; wraps on wider screens
        <div
            className={`-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 ${className}`}
        >
            <span className="hidden shrink-0 text-xs text-gray-300 sm:inline sm:text-sm">
                {label}
            </span>
            {EXAMPLE_MOODS.map((mood) => (
                <Link
                    key={mood.id}
                    href={`/smartsearch?example=${mood.id}`}
                    className="shrink-0 whitespace-nowrap rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs text-gray-100 backdrop-blur-sm transition-colors hover:border-amber-400/60 hover:text-white sm:text-sm"
                >
                    <span aria-hidden="true" className="mr-1">
                        {mood.emoji}
                    </span>
                    {mood.label}
                </Link>
            ))}
        </div>
    )
}

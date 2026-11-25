'use client'

import { SparklesIcon, WrenchScrewdriverIcon, XMarkIcon } from '@heroicons/react/24/outline'

export const BUILDER_TITLE_ID = 'collection-builder-title'

const focusRing =
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0f]'

/**
 * Header of the Collection Builder, shared by the Smart and Traditional modes:
 * title, the mode switch (real icons, not emoji) and the close button.
 */
export default function BuilderHeader({
    mode,
    onModeChange,
    onClose,
    subtitle,
}: {
    mode: 'smart' | 'traditional'
    onModeChange?: (mode: 'smart' | 'traditional') => void
    onClose: () => void
    subtitle: string
}) {
    const options = [
        { value: 'smart' as const, label: 'Smart', Icon: SparklesIcon },
        { value: 'traditional' as const, label: 'Traditional', Icon: WrenchScrewdriverIcon },
    ]
    return (
        <div className="flex flex-wrap items-start gap-3 border-b border-zinc-800 px-5 pb-4 pt-5 sm:px-6">
            <div className="min-w-0 flex-1">
                <h2 id={BUILDER_TITLE_ID} className="text-xl font-bold text-white">
                    New collection
                </h2>
                <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
            </div>
            <button
                type="button"
                onClick={onClose}
                aria-label="Close collection builder"
                className={`order-2 -mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white sm:order-3 ${focusRing}`}
            >
                <XMarkIcon className="h-6 w-6" />
            </button>
            {onModeChange && (
                <div
                    role="radiogroup"
                    aria-label="How to build it"
                    className="order-3 flex w-full gap-1 rounded-lg border border-zinc-700 bg-zinc-900 p-1 sm:order-2 sm:w-auto"
                >
                    {options.map(({ value, label, Icon }) => {
                        const selected = mode === value
                        return (
                            <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => onModeChange(value)}
                                className={`inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors sm:flex-none ${focusRing} ${
                                    selected
                                        ? 'bg-brand-500 text-white'
                                        : 'text-gray-300 hover:bg-zinc-800 hover:text-white'
                                }`}
                            >
                                <Icon className="h-4 w-4" aria-hidden="true" />
                                {label}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

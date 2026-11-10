import type { ReactNode } from 'react'

interface PageEmptyStateProps {
    icon?: ReactNode
    title: string
    description?: ReactNode
    /** The one thing to do next (a button or link) */
    action?: ReactNode
}

/** The empty state shown on account pages while a list has nothing in it. */
export default function PageEmptyState({ icon, title, description, action }: PageEmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center sm:py-20">
            {icon && (
                <div
                    className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-amber-400 [&>svg]:h-8 [&>svg]:w-8"
                    aria-hidden="true"
                >
                    {icon}
                </div>
            )}
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            {description && <p className="mt-2 max-w-md text-gray-400">{description}</p>}
            {action && <div className="mt-6">{action}</div>}
        </div>
    )
}

/** Primary call to action style shared by empty states. */
export const emptyStateActionClass =
    'inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300'

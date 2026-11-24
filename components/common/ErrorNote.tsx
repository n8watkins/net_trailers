import type { ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'

/**
 * A form or inline error: a leading icon in a bordered red panel, so it stands
 * apart from red links and from brand-red buttons.
 */
export default function ErrorNote({
    children,
    className = '',
    id,
}: {
    children: ReactNode
    className?: string
    id?: string
}) {
    return (
        <p
            id={id}
            role="alert"
            className={`flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200 ${className}`.trim()}
        >
            <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-red-400" />
            <span className="min-w-0">{children}</span>
        </p>
    )
}

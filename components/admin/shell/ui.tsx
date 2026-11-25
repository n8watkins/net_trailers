import { Inbox, LoaderCircle } from 'lucide-react'
import { DANGER_BUTTON_CLASS } from '@/components/common/DangerButton'

/** The shared pieces every admin page is built from (server- and client-safe). */

export function cx(...parts: (string | false | null | undefined)[]): string {
    return parts.filter(Boolean).join(' ')
}

export const CARD = 'rounded-xl border border-white/10 bg-[#141414]'

export function Panel({
    title,
    actions,
    children,
    className,
}: {
    title?: React.ReactNode
    actions?: React.ReactNode
    children: React.ReactNode
    className?: string
}) {
    return (
        <section className={cx(CARD, 'flex min-w-0 flex-col p-4 sm:p-5', className)}>
            {(title || actions) && (
                <div className="mb-3 flex items-center justify-between gap-3">
                    {title && <h2 className="text-sm font-semibold text-white">{title}</h2>}
                    {actions}
                </div>
            )}
            {children}
        </section>
    )
}

export function Loading({ label = 'Loading' }: { label?: string }) {
    return (
        <div
            role="status"
            className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400"
        >
            <LoaderCircle aria-hidden className="size-4 animate-spin text-brand-400" />
            {label}
        </div>
    )
}

export function Empty({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-gray-400">
            <Inbox aria-hidden className="size-6 text-gray-600" />
            {children}
        </div>
    )
}

export { default as ErrorNote } from '@/components/common/ErrorNote'

export const BUTTON = {
    primary:
        'inline-flex min-h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-brand-500 px-3.5 text-sm font-semibold text-white hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300',
    secondary:
        'inline-flex min-h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-white/15 bg-white/5 px-3.5 text-sm font-medium text-gray-100 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
    danger: `${DANGER_BUTTON_CLASS} min-h-9 whitespace-nowrap px-3.5 text-sm`,
}

import { Inbox, LoaderCircle } from 'lucide-react'

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
            <LoaderCircle aria-hidden className="size-4 animate-spin text-amber-400" />
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

export function ErrorNote({ children }: { children: React.ReactNode }) {
    return (
        <p
            role="alert"
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
        >
            {children}
        </p>
    )
}

export const BUTTON = {
    primary:
        'inline-flex min-h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-amber-500 px-3.5 text-sm font-semibold text-black hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300',
    secondary:
        'inline-flex min-h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-white/15 bg-white/5 px-3.5 text-sm font-medium text-gray-100 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400',
    danger: 'inline-flex min-h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-red-600 px-3.5 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300',
}

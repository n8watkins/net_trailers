'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { signOut } from 'next-auth/react'
import { ShieldAlert, ShieldCheck } from 'lucide-react'

import { BUTTON } from './shell/ui'

/**
 * The admin's guard rails for dangerous actions: one confirm dialog that
 * restates what will happen and shows whether the sign-in is fresh enough
 * (lib/admin/guard.ts, 15 minutes), and the "sign in again" dialog shown when
 * the server answers `reauth_required` anyway.
 */

/** The same window the server enforces (lib/admin/guard.ts FRESH_SIGN_IN_MS). */
const FRESH_SIGN_IN_MS = 15 * 60 * 1000

const SignedInAt = createContext<number | null>(null)

/** Set once by app/admin/layout.tsx from the server session. */
export function AdminSessionProvider({
    signedInAt,
    children,
}: {
    signedInAt: number | null
    children: React.ReactNode
}) {
    return <SignedInAt.Provider value={signedInAt}>{children}</SignedInAt.Provider>
}

/** Minutes left on the fresh sign-in (0 when stale), rechecked every 15 s. */
function useFreshMinutesLeft(): number {
    const signedInAt = useContext(SignedInAt)
    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 15_000)
        return () => clearInterval(timer)
    }, [])
    if (!signedInAt) return 0
    return Math.max(0, Math.floor((signedInAt + FRESH_SIGN_IN_MS - now) / 60_000))
}

export type AdminPostResult<T> =
    { ok: true; data: T } | { ok: false; reauth: boolean; error: string }

/** POST JSON to an admin route; a stale sign-in comes back as `reauth: true`. */
export async function adminPost<T = Record<string, unknown>>(
    url: string,
    body: unknown
): Promise<AdminPostResult<T>> {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
        const data = await response.json().catch(() => ({}))
        if (response.ok) return { ok: true, data: data as T }
        return {
            ok: false,
            reauth: data?.code === 'reauth_required',
            error: typeof data?.error === 'string' ? data.error : 'The request failed',
        }
    } catch {
        return { ok: false, reauth: false, error: 'The request failed' }
    }
}

/** A modal: Escape and the backdrop close it, focus moves in and returns, Tab stays inside. */
function Backdrop({
    children,
    label,
    onClose,
}: {
    children: React.ReactNode
    label: string
    onClose?: () => void
}) {
    const box = useRef<HTMLDivElement>(null)
    const close = useRef(onClose)
    useEffect(() => {
        close.current = onClose
    }, [onClose])
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null
        box.current?.querySelector<HTMLElement>('[data-autofocus],button')?.focus()
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') close.current?.()
            if (event.key === 'Tab' && box.current) {
                const items = box.current.querySelectorAll<HTMLElement>('button,a,input')
                const first = items[0]
                const last = items[items.length - 1]
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault()
                    last?.focus()
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault()
                    first?.focus()
                }
            }
        }
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('keydown', onKey)
            previous?.focus?.()
        }
    }, [])
    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/75" onClick={onClose} aria-hidden />
            <div
                ref={box}
                role="dialog"
                aria-modal="true"
                aria-label={label}
                className="relative w-full max-w-md rounded-xl border border-white/10 bg-[#161616] p-5 shadow-2xl sm:p-6"
            >
                {children}
            </div>
        </div>
    )
}

function FreshNote({ minutes }: { minutes: number }) {
    return minutes > 0 ? (
        <p className="mb-5 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-200">
            <ShieldCheck aria-hidden className="size-4 shrink-0" />
            Fresh sign-in: {minutes} more minute{minutes === 1 ? '' : 's'} to act.
        </p>
    ) : (
        <p className="mb-5 flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-[13px] text-amber-200">
            <ShieldAlert aria-hidden className="size-4 shrink-0" />
            This needs a sign-in from the last 15 minutes. Sign in again first.
        </p>
    )
}

/**
 * The one confirm step for anything that emails people or runs a job.
 * `children` says exactly what will happen; with a stale sign-in the confirm
 * button becomes "Sign in again".
 */
export function ConfirmDialog({
    title,
    children,
    confirmLabel,
    danger = false,
    busy = false,
    onConfirm,
    onCancel,
}: {
    title: string
    children: React.ReactNode
    confirmLabel: string
    danger?: boolean
    busy?: boolean
    onConfirm: () => void
    onCancel: () => void
}) {
    const minutes = useFreshMinutesLeft()
    return (
        <Backdrop label={title} onClose={busy ? undefined : onCancel}>
            <h3 className="mb-3 text-lg font-semibold text-white">{title}</h3>
            <div className="mb-4 space-y-2 text-sm text-gray-300">{children}</div>
            <FreshNote minutes={minutes} />
            <div className="flex flex-wrap justify-end gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={busy}
                    className={BUTTON.secondary}
                >
                    Cancel
                </button>
                {minutes > 0 ? (
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={busy}
                        className={danger ? BUTTON.danger : BUTTON.primary}
                    >
                        {busy ? 'Working...' : confirmLabel}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => signOut({ redirectTo: '/' })}
                        className={BUTTON.primary}
                    >
                        Sign out and sign in again
                    </button>
                )}
            </div>
        </Backdrop>
    )
}

export function ReauthDialog({ onClose }: { onClose: () => void }) {
    return (
        <Backdrop label="Sign in again" onClose={onClose}>
            <h3 className="mb-3 text-lg font-semibold text-white">Sign in again</h3>
            <p className="mb-6 text-sm text-gray-300">
                Sending email and running jobs need a sign-in from the last 15 minutes. Sign out,
                sign in again with a new email link, then come back to the admin.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={onClose} className={BUTTON.secondary}>
                    Not now
                </button>
                <button
                    type="button"
                    onClick={() => signOut({ redirectTo: '/' })}
                    className={BUTTON.primary}
                >
                    Sign out and sign in again
                </button>
            </div>
        </Backdrop>
    )
}

/** State for the sign-in-again dialog: `needReauth()` opens it, render `dialog`. */
export function useReauthDialog() {
    const [open, setOpen] = useState(false)
    const needReauth = useCallback(() => setOpen(true), [])
    const close = useCallback(() => setOpen(false), [])
    const dialog = open ? <ReauthDialog onClose={close} /> : null
    return { needReauth, dialog }
}

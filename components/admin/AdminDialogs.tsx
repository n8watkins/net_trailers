'use client'

import { useCallback, useState } from 'react'
import { signOut } from 'next-auth/react'

/**
 * The admin page's two guard rails for dangerous actions: a confirm dialog
 * that restates what will happen, and the "sign in again" dialog shown when
 * the server answers `reauth_required` (lib/admin/guard.ts).
 */

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

function Backdrop({ children, label }: { children: React.ReactNode; label: string }) {
    return (
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-modal="true"
            aria-label={label}
        >
            <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-800 p-6 shadow-xl">
                {children}
            </div>
        </div>
    )
}

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
    return (
        <Backdrop label={title}>
            <h3 className="mb-3 text-lg font-semibold text-white">{title}</h3>
            <div className="mb-6 space-y-2 text-sm text-gray-300">{children}</div>
            <div className="flex justify-end gap-3">
                <button
                    onClick={onCancel}
                    disabled={busy}
                    className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700 disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    disabled={busy}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                        danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                    {busy ? 'Working...' : confirmLabel}
                </button>
            </div>
        </Backdrop>
    )
}

export function ReauthDialog({ onClose }: { onClose: () => void }) {
    return (
        <Backdrop label="Sign in again">
            <h3 className="mb-3 text-lg font-semibold text-white">Sign in again</h3>
            <p className="mb-6 text-sm text-gray-300">
                Sending email and running jobs need a sign-in from the last 15 minutes. Sign out,
                sign in again with a new email link, then come back to the admin page.
            </p>
            <div className="flex justify-end gap-3">
                <button
                    onClick={onClose}
                    className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700"
                >
                    Not now
                </button>
                <button
                    onClick={() => signOut({ redirectTo: '/' })}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
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
    const dialog = open ? <ReauthDialog onClose={() => setOpen(false)} /> : null
    return { needReauth, dialog }
}

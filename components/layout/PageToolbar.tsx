'use client'

import { useEffect, useRef, useState } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { ChevronDownIcon, Cog6ToothIcon } from '@heroicons/react/24/solid'
import { MagnifyingGlassIcon, MicrophoneIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { useToast } from '../../hooks/useToast'
import { useEscapeKey } from '../../hooks/useEscapeKey'

/** Shared toolbar pieces for account pages: filter pills, list search, Manage menu. */

export function FilterPills<T extends string>({
    label,
    options,
    value,
    onChange,
}: {
    label: string
    options: { value: T; label: ReactNode }[]
    value: T
    onChange: (value: T) => void
}) {
    return (
        <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-2">
            {options.map((option) => {
                const selected = option.value === value
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onChange(option.value)}
                        className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                            selected
                                ? 'border-amber-500 bg-amber-500 text-zinc-950'
                                : 'border-zinc-700 bg-zinc-900 text-gray-300 hover:border-zinc-500 hover:text-white'
                        }`}
                    >
                        {option.label}
                    </button>
                )
            })}
        </div>
    )
}

export function ListSearchInput({
    value,
    onChange,
    placeholder,
    voiceSourceId,
}: {
    value: string
    onChange: (value: string) => void
    placeholder: string
    voiceSourceId: string
}) {
    const { showError } = useToast()
    const [isMounted, setIsMounted] = useState(false)
    const { isListening, isSupported, startListening, stopListening } = useVoiceInput({
        onResult: onChange,
        onError: (error) => showError(error),
        sourceId: voiceSourceId,
    })

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const showVoice = isMounted && isSupported

    return (
        <div className="relative w-full max-w-xl">
            <MagnifyingGlassIcon
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
            />
            <input
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                aria-label={placeholder.replace(/\.+$/, '')}
                className={`h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-10 text-base text-white placeholder-gray-500 transition-colors hover:border-zinc-500 focus:border-amber-500 focus:outline-none sm:text-sm ${
                    showVoice ? 'pr-20' : 'pr-10'
                } [&::-webkit-search-cancel-button]:hidden`}
            />
            <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center">
                {value && (
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        aria-label="Clear search"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:text-white"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                )}
                {showVoice && (
                    <button
                        type="button"
                        onClick={async () => (isListening ? stopListening() : startListening())}
                        aria-label={isListening ? 'Stop listening' : 'Search by voice'}
                        className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                            isListening
                                ? 'animate-pulse bg-amber-500 text-zinc-950'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <MicrophoneIcon className="h-5 w-5" />
                    </button>
                )}
            </div>
        </div>
    )
}

export interface ManageMenuItem {
    label: string
    icon: ComponentType<{ className?: string }>
    onSelect: () => void
    danger?: boolean
}

export function ManageMenu({ items }: { items: ManageMenuItem[] }) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    useEscapeKey(open, () => setOpen(false))

    useEffect(() => {
        if (!open) return
        const onPointerDown = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', onPointerDown)
        return () => document.removeEventListener('mousedown', onPointerDown)
    }, [open])

    if (items.length === 0) return null

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-gray-300 transition-colors hover:border-zinc-500 hover:text-white"
            >
                <Cog6ToothIcon className="h-4 w-4 text-gray-400" />
                Manage
                <ChevronDownIcon
                    className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>
            {open && (
                <div
                    role="menu"
                    className="absolute right-0 top-full z-50 mt-2 min-w-[200px] overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
                >
                    {items.map((item) => {
                        const Icon = item.icon
                        return (
                            <button
                                key={item.label}
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    setOpen(false)
                                    item.onSelect()
                                }}
                                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-white transition-colors hover:bg-zinc-800"
                            >
                                <Icon
                                    className={`h-5 w-5 shrink-0 ${item.danger ? 'text-red-400' : 'text-gray-400'}`}
                                />
                                {item.label}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

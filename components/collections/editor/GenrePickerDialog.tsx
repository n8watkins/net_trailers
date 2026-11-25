'use client'

import { useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { GenrePills } from '../GenrePills'
import { useEscapeKey } from '../../../hooks/useEscapeKey'
import { useFocusTrap } from '../../../hooks/useFocusTrap'

const focusRing =
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0f]'

/** Genre picker opened from the collection editor; changes go into the editor's draft. */
export default function GenrePickerDialog({
    isOpen,
    selectedGenres,
    onChange,
    mediaType,
    childSafeMode,
    onClose,
}: {
    isOpen: boolean
    selectedGenres: string[]
    onChange: (genres: string[]) => void
    mediaType: 'movie' | 'tv' | 'both'
    childSafeMode: boolean
    onClose: () => void
}) {
    const ref = useRef<HTMLDivElement>(null)
    const titleId = useId()
    useEscapeKey(isOpen, onClose)
    useFocusTrap(ref, isOpen)

    if (!isOpen || typeof document === 'undefined') return null

    return createPortal(
        <div className="fixed inset-0 z-modal-editor-inner flex items-end justify-center sm:items-center sm:p-4">
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                aria-hidden="true"
                onClick={onClose}
            />
            <div
                ref={ref}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className="relative flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-zinc-700 bg-[#0d0d0f] shadow-2xl outline-none sm:max-w-2xl sm:rounded-2xl"
            >
                <div className="flex items-start gap-3 border-b border-zinc-800 px-5 pb-4 pt-5 sm:px-6">
                    <div className="min-w-0 flex-1">
                        <h2 id={titleId} className="text-xl font-bold text-white">
                            Genres
                        </h2>
                        <p className="mt-1 text-sm text-gray-400">
                            Pick up to 3. The first you pick matters most.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close genres"
                        className={`-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white ${focusRing}`}
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
                    <GenrePills
                        selectedGenres={selectedGenres}
                        onChange={onChange}
                        mediaType={mediaType}
                        childSafeMode={childSafeMode}
                    />
                </div>
                <div className="flex justify-end border-t border-zinc-800 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className={`inline-flex h-10 items-center rounded-lg bg-brand-500 px-5 text-sm font-semibold text-white hover:bg-brand-400 ${focusRing}`}
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

'use client'

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import {
    XMarkIcon,
    MagnifyingGlassIcon,
    FilmIcon,
    TvIcon,
    PencilIcon,
    EyeSlashIcon,
    TrashIcon,
} from '@heroicons/react/24/outline'
import { DeleteConfirmationModal } from './DeleteConfirmationModal'
import { UserList } from '../../types/collections'
import { Content, getTitle, getYear } from '../../typings'
import useUserData from '../../hooks/useUserData'
import { useToast } from '../../hooks/useToast'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import IconPickerModal from './IconPickerModal'
import ColorPickerModal from './ColorPickerModal'
import InlineSearchBar from './InlineSearchBar'
import { AdvancedFiltersModal } from './AdvancedFiltersModal'
import { getUnifiedGenresByMediaType } from '../../constants/unifiedGenres'
import { useChildSafety } from '../../hooks/useChildSafety'
import CollectionIcon from '../collections/CollectionIcon'
import Switch from '../collections/Switch'
import GenrePickerDialog from '../collections/editor/GenrePickerDialog'
import {
    AUTO_FILL_SWITCH_LABEL,
    HOME_HIDDEN_LABEL,
    HOME_SHOWN_LABEL,
    contentsLabel,
    isBuiltInCollection,
} from '../collections/collectionMeta'
import {
    EditorForm,
    buildUpdate,
    formFromCollection,
    isDirty,
    mediaTypeOf,
    validate,
} from '../collections/editor/editorForm'

interface CollectionEditorModalProps {
    collection: UserList | null
    isOpen: boolean
    onClose: () => void
}

const focusRing =
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0f]'
const sectionTitle = 'text-xs font-semibold uppercase tracking-[0.12em] text-gray-400'
const card = 'rounded-xl border border-zinc-800 bg-zinc-900/60 p-4'
const secondaryButton = `inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-zinc-700 px-4 text-sm font-medium text-gray-100 transition-colors hover:border-zinc-500 hover:bg-zinc-900 ${focusRing}`
const smallButton = `inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-zinc-700 px-3 text-sm text-gray-200 transition-colors hover:border-zinc-500 hover:text-white ${focusRing}`
const primaryButton = `inline-flex h-10 items-center justify-center rounded-lg bg-brand-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-brand-500 ${focusRing}`

/**
 * Edit a collection. One saving model: changes stay in a draft until Save.
 * Cancel, the close button, Escape and a click outside all do the same thing:
 * close straight away when nothing changed, otherwise ask before discarding.
 */
export default function CollectionEditorModal({
    collection,
    isOpen,
    onClose,
}: CollectionEditorModalProps) {
    const { isEnabled: isChildSafetyEnabled } = useChildSafety()
    const { updateList, addToList, removeFromList, deleteList } = useUserData()
    const { showSuccess, showError } = useToast()
    const ids = useId()
    const titleId = `${ids}-title`
    const dialogRef = useRef<HTMLDivElement>(null)
    const keepEditingRef = useRef<HTMLButtonElement>(null)

    const [initial, setInitial] = useState<EditorForm | null>(null)
    const [form, setForm] = useState<EditorForm | null>(null)
    const [confirmDiscard, setConfirmDiscard] = useState(false)
    const [saving, setSaving] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [titleFilter, setTitleFilter] = useState('')
    const [showIconPicker, setShowIconPicker] = useState(false)
    const [showColorPicker, setShowColorPicker] = useState(false)
    const [showGenreDialog, setShowGenreDialog] = useState(false)
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)

    useEffect(() => setMounted(true), [])

    // Start a fresh draft each time the editor opens on a collection
    const collectionId = collection?.id
    useEffect(() => {
        if (!collection || !isOpen) {
            setForm(null)
            setInitial(null)
            return
        }
        const start = formFromCollection(collection)
        setInitial(start)
        setForm(start)
        setConfirmDiscard(false)
        setTitleFilter('')
        // Only on open or when it switches to another collection, not on every store update
    }, [collectionId, isOpen])

    const dirty = !!form && !!initial && isDirty(initial, form)
    const open = isOpen && !!collection && !!form

    const requestClose = useCallback(() => {
        if (saving) return
        if (dirty) setConfirmDiscard(true)
        else onClose()
    }, [dirty, onClose, saving])

    // Escape: back out of the discard question first, otherwise the same as Cancel
    useEscapeKey(open && !showDeleteModal, () => {
        if (confirmDiscard) setConfirmDiscard(false)
        else requestClose()
    })
    useFocusTrap(dialogRef, open, {
        paused: showGenreDialog || showAdvancedFilters || showDeleteModal,
    })

    useEffect(() => {
        if (confirmDiscard) keepEditingRef.current?.focus()
    }, [confirmDiscard])

    // Lock the page behind
    useEffect(() => {
        if (!open) return
        const previous = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = previous
        }
    }, [open])

    // Leaving the page (reload, closing the tab, typing an address) asks first
    useEffect(() => {
        if (!open || !dirty) return
        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault()
            event.returnValue = ''
        }
        window.addEventListener('beforeunload', onBeforeUnload)
        return () => window.removeEventListener('beforeunload', onBeforeUnload)
    }, [open, dirty])

    const genreNames = useMemo(() => {
        const map = new Map<string, string>()
        getUnifiedGenresByMediaType('both', isChildSafetyEnabled).forEach((g) =>
            map.set(g.id, g.name)
        )
        return map
    }, [isChildSafetyEnabled])

    if (!open || !mounted || !collection || !form) return null

    const limited = collection.canEdit === false
    const builtIn = isBuiltInCollection(collection)
    const update = (patch: Partial<EditorForm>) =>
        setForm((prev) => (prev ? { ...prev, ...patch } : prev))
    const draftCollection = {
        ...collection,
        emoji: form.emoji || undefined,
        color: form.color,
        name: form.name,
    }

    const removed = new Set(form.removed)
    const titles = [...collection.items, ...form.added].filter((item) => !removed.has(item.id))
    const visibleTitles = titleFilter.trim()
        ? titles.filter((item) =>
              getTitle(item).toLowerCase().includes(titleFilter.trim().toLowerCase())
          )
        : titles

    const save = async (overrides: Partial<EditorForm> = {}) => {
        const draft = { ...form, ...overrides }
        const problem = validate(draft)
        if (problem) {
            showError(problem)
            return
        }
        setSaving(true)
        try {
            await updateList(collection.id, buildUpdate(draft, { limited }))
            if (!limited) {
                const removedIds = new Set(draft.removed)
                for (const item of draft.added) {
                    if (!removedIds.has(item.id)) await addToList(collection.id, item)
                }
                const addedIds = new Set(draft.added.map((item) => item.id))
                for (const id of draft.removed) {
                    if (!addedIds.has(id)) await removeFromList(collection.id, id)
                }
            }
            showSuccess('Saved', `"${draft.name.trim()}" is up to date`)
            onClose()
        } catch (error) {
            console.error('Save collection error:', error)
            showError(
                'Could not save the collection',
                error instanceof Error ? error.message : undefined
            )
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteConfirm = async () => {
        try {
            await deleteList(collection.id)
            showSuccess('Collection deleted', `"${collection.name}" has been removed`)
            setShowDeleteModal(false)
            onClose()
        } catch (error) {
            console.error('Delete collection error:', error)
            showError(
                'Failed to delete collection',
                error instanceof Error ? error.message : undefined
            )
            throw error
        }
    }

    const setMedia = (patch: Partial<Pick<EditorForm, 'movies' | 'tv'>>) => {
        const next = { ...form, ...patch }
        // A collection with neither movies nor TV has nothing to show on home
        update({ ...patch, shownOnHome: next.movies || next.tv ? form.shownOnHome : false })
    }

    const setGenres = (genres: string[]) =>
        update({ genres, autoFill: genres.length === 0 ? false : form.autoFill })

    const filters = form.advancedFilters
    const filterSummary = [
        names(filters.withCast).length ? `Actors: ${names(filters.withCast).join(', ')}` : null,
        names(filters.withDirector).length
            ? `Directors: ${names(filters.withDirector).join(', ')}`
            : null,
        filters.yearMin || filters.yearMax
            ? `Years ${filters.yearMin || 1900} to ${filters.yearMax || new Date().getFullYear()}`
            : null,
        filters.ratingMin !== undefined || filters.ratingMax !== undefined
            ? `Rating ${filters.ratingMin ?? 0} to ${filters.ratingMax ?? 10}`
            : null,
    ].filter(Boolean) as string[]

    const editor = (
        <div className="fixed inset-0 z-modal-editor flex items-end justify-center sm:items-center sm:p-4">
            <div
                className="absolute inset-0 bg-black/75 backdrop-blur-sm"
                aria-hidden="true"
                data-testid="collection-editor-backdrop"
                onClick={requestClose}
            />
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                data-testid="collection-editor"
                className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-zinc-700 bg-[#0d0d0f] shadow-2xl outline-none sm:max-w-3xl sm:rounded-2xl"
            >
                {/* Header: which collection, and the way out */}
                <div className="flex items-start gap-3 border-b border-zinc-800 px-5 pb-4 pt-5 sm:px-6">
                    <CollectionIcon collection={draftCollection} />
                    <div className="min-w-0 flex-1">
                        <h2
                            id={titleId}
                            className="break-words text-xl font-bold leading-tight text-white"
                        >
                            {form.name.trim() || 'Untitled collection'}
                        </h2>
                        <p className="mt-1 text-sm text-gray-400">
                            Edit collection · {contentsLabel(collection)} ·{' '}
                            {form.shownOnHome ? HOME_SHOWN_LABEL : HOME_HIDDEN_LABEL}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={requestClose}
                        aria-label="Close editor"
                        className={`-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white ${focusRing}`}
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Body: the only part that scrolls */}
                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
                    {!limited && (
                        <section aria-labelledby={`${ids}-look`} className="space-y-3">
                            <h3 id={`${ids}-look`} className={sectionTitle}>
                                Name and look
                            </h3>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowIconPicker(true)}
                                        aria-label="Choose an icon"
                                        className={`flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-2xl hover:border-zinc-500 ${focusRing}`}
                                    >
                                        <CollectionIcon
                                            collection={draftCollection}
                                            size="md"
                                            bare
                                        />
                                    </button>
                                    <IconPickerModal
                                        isOpen={showIconPicker}
                                        selectedIcon={form.emoji}
                                        onSelectIcon={(emoji) => {
                                            update({ emoji })
                                            setShowIconPicker(false)
                                        }}
                                        onClose={() => setShowIconPicker(false)}
                                    />
                                </div>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowColorPicker(true)}
                                        aria-label="Choose a colour"
                                        className={`flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 p-2 hover:border-zinc-500 ${focusRing}`}
                                    >
                                        <span
                                            className="h-full w-full rounded-md"
                                            style={{ backgroundColor: form.color }}
                                        />
                                    </button>
                                    <ColorPickerModal
                                        isOpen={showColorPicker}
                                        selectedColor={form.color}
                                        onSelectColor={(color) => {
                                            update({ color })
                                            setShowColorPicker(false)
                                        }}
                                        onClose={() => setShowColorPicker(false)}
                                    />
                                </div>
                                <input
                                    type="text"
                                    aria-label="Collection name"
                                    placeholder="Collection name"
                                    value={form.name}
                                    maxLength={80}
                                    onChange={(e) => update({ name: e.target.value })}
                                    className="h-11 min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-white placeholder-gray-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                />
                            </div>
                        </section>
                    )}

                    <section aria-labelledby={`${ids}-where`} className="space-y-3">
                        <h3 id={`${ids}-where`} className={sectionTitle}>
                            Where it shows
                        </h3>
                        <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900/60">
                            <SwitchRow
                                label="Show on home"
                                hint={
                                    form.movies || form.tv || limited
                                        ? 'A row on the home page.'
                                        : 'Turn on Movies or TV shows first.'
                                }
                                checked={form.shownOnHome}
                                disabled={!limited && !form.movies && !form.tv}
                                onChange={(shownOnHome) => update({ shownOnHome })}
                            />
                            <SwitchRow
                                label="Show on public profile"
                                hint="Visible to people who open your profile."
                                checked={form.showOnPublicProfile}
                                onChange={(showOnPublicProfile) => update({ showOnPublicProfile })}
                            />
                            {!limited && (
                                <SwitchRow
                                    label={AUTO_FILL_SWITCH_LABEL}
                                    hint={
                                        form.genres.length > 0
                                            ? 'After your titles, keep adding titles from its genres.'
                                            : 'Pick a genre first.'
                                    }
                                    checked={form.autoFill}
                                    disabled={form.genres.length === 0}
                                    onChange={(autoFill) => update({ autoFill })}
                                />
                            )}
                        </ul>
                    </section>

                    {!limited && (
                        <section aria-labelledby={`${ids}-what`} className="space-y-3">
                            <h3 id={`${ids}-what`} className={sectionTitle}>
                                What it includes
                            </h3>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div className={card}>
                                    <h4 className="mb-3 font-semibold text-white">Media type</h4>
                                    <div className="space-y-3">
                                        <MediaRow
                                            icon={<FilmIcon className="h-4 w-4" />}
                                            label="Movies"
                                            checked={form.movies}
                                            onChange={(movies) => setMedia({ movies })}
                                        />
                                        <MediaRow
                                            icon={<TvIcon className="h-4 w-4" />}
                                            label="TV shows"
                                            checked={form.tv}
                                            onChange={(tv) => setMedia({ tv })}
                                        />
                                    </div>
                                </div>

                                <div className={card}>
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <h4 className="font-semibold text-white">Genres</h4>
                                        <button
                                            type="button"
                                            onClick={() => setShowGenreDialog(true)}
                                            className={smallButton}
                                        >
                                            <PencilIcon className="h-4 w-4" aria-hidden="true" />
                                            Edit
                                            <span className="sr-only"> genres</span>
                                        </button>
                                    </div>
                                    <ul className="flex flex-wrap gap-2">
                                        {form.genres.length === 0 ? (
                                            <li className="rounded-full border border-zinc-700 px-3 py-1 text-sm text-gray-400">
                                                All genres
                                            </li>
                                        ) : (
                                            form.genres.map((id) => {
                                                const name = genreNames.get(id) || id
                                                return (
                                                    <li
                                                        key={id}
                                                        className="inline-flex items-center gap-1 rounded-full border border-brand-500/50 bg-brand-500/15 py-1 pl-3 pr-1 text-sm text-white"
                                                    >
                                                        {name}
                                                        <button
                                                            type="button"
                                                            aria-label={`Remove ${name}`}
                                                            onClick={() =>
                                                                setGenres(
                                                                    form.genres.filter(
                                                                        (g) => g !== id
                                                                    )
                                                                )
                                                            }
                                                            className="flex h-6 w-6 items-center justify-center rounded-full text-gray-300 hover:bg-white/10 hover:text-white"
                                                        >
                                                            <XMarkIcon
                                                                className="h-4 w-4"
                                                                aria-hidden="true"
                                                            />
                                                        </button>
                                                    </li>
                                                )
                                            })
                                        )}
                                    </ul>
                                </div>

                                <div className={`${card} md:col-span-2`}>
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <h4 className="font-semibold text-white">
                                            Cast, years and rating
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={() => setShowAdvancedFilters(true)}
                                            className={smallButton}
                                        >
                                            <PencilIcon className="h-4 w-4" aria-hidden="true" />
                                            Edit
                                            <span className="sr-only"> filters</span>
                                        </button>
                                    </div>
                                    {filterSummary.length > 0 ? (
                                        <ul className="space-y-1 text-sm text-gray-300">
                                            {filterSummary.map((line) => (
                                                <li key={line}>{line}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-gray-500">
                                            Any cast, any year, any rating.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    {!limited && (
                        <section aria-labelledby={`${ids}-titles`} className="space-y-3">
                            <h3 id={`${ids}-titles`} className={sectionTitle}>
                                Titles ({titles.length})
                            </h3>
                            <InlineSearchBar
                                onAddContent={(item: Content) => {
                                    if (form.removed.includes(item.id)) {
                                        update({
                                            removed: form.removed.filter((id) => id !== item.id),
                                        })
                                    } else {
                                        update({ added: [...form.added, item] })
                                    }
                                }}
                                existingContentIds={titles.map((c) => c.id)}
                                placeholder="Search to add movies or TV shows..."
                            />
                            {titles.length > 6 && (
                                <div className="relative sm:max-w-xs">
                                    <MagnifyingGlassIcon
                                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                                        aria-hidden="true"
                                    />
                                    <input
                                        type="text"
                                        aria-label="Filter titles"
                                        placeholder="Filter titles..."
                                        value={titleFilter}
                                        onChange={(e) => setTitleFilter(e.target.value)}
                                        className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                    />
                                </div>
                            )}
                            {titles.length === 0 ? (
                                <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-gray-400">
                                    {collection.collectionType === 'tmdb-genre'
                                        ? 'This collection fills itself from its genres. Titles you add here show first.'
                                        : 'No titles yet. Search above to add some.'}
                                </p>
                            ) : (
                                <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                                    {visibleTitles.map((item) => (
                                        <li
                                            key={item.id}
                                            className="relative overflow-hidden rounded-lg bg-zinc-900"
                                        >
                                            <div className="relative aspect-[2/3]">
                                                {item.poster_path ? (
                                                    <Image
                                                        src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
                                                        alt={getTitle(item)}
                                                        fill
                                                        className="object-cover"
                                                        sizes="(max-width: 640px) 33vw, 20vw"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center p-2 text-center text-xs text-gray-400">
                                                        {getTitle(item)}
                                                    </div>
                                                )}
                                            </div>
                                            <p className="truncate px-2 pt-1.5 text-xs font-medium text-gray-200">
                                                {getTitle(item)}
                                            </p>
                                            <p className="px-2 pb-1.5 text-[11px] text-gray-500">
                                                {getYear(item)}
                                            </p>
                                            <button
                                                type="button"
                                                aria-label={`Remove ${getTitle(item)}`}
                                                onClick={() => {
                                                    if (form.added.some((a) => a.id === item.id)) {
                                                        update({
                                                            added: form.added.filter(
                                                                (a) => a.id !== item.id
                                                            ),
                                                        })
                                                    } else {
                                                        update({
                                                            removed: [...form.removed, item.id],
                                                        })
                                                    }
                                                }}
                                                className={`absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/75 text-white hover:bg-brand-500 ${focusRing}`}
                                            >
                                                <XMarkIcon className="h-4 w-4" aria-hidden="true" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    )}
                </div>

                {/* Footer: one way to keep changes, one way to drop them */}
                <div
                    data-testid="collection-editor-footer"
                    className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6"
                >
                    {confirmDiscard ? (
                        <>
                            <p role="alert" className="text-sm font-medium text-white">
                                Discard unsaved changes?
                            </p>
                            <div className="ml-auto flex gap-2">
                                <button
                                    ref={keepEditingRef}
                                    type="button"
                                    onClick={() => setConfirmDiscard(false)}
                                    className={secondaryButton}
                                >
                                    Keep editing
                                </button>
                                <button type="button" onClick={onClose} className={primaryButton}>
                                    Discard
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                {builtIn
                                    ? form.shownOnHome &&
                                      initial?.shownOnHome && (
                                          <button
                                              type="button"
                                              onClick={() => save({ shownOnHome: false })}
                                              disabled={saving}
                                              className={`${secondaryButton} px-3`}
                                          >
                                              <EyeSlashIcon
                                                  className="h-4 w-4"
                                                  aria-hidden="true"
                                              />
                                              Hide from home
                                          </button>
                                      )
                                    : collection.canDelete !== false && (
                                          <button
                                              type="button"
                                              onClick={() => setShowDeleteModal(true)}
                                              className={`inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-red-300 transition-colors hover:bg-red-950/50 hover:text-red-200 ${focusRing}`}
                                          >
                                              <TrashIcon className="h-4 w-4" aria-hidden="true" />
                                              Delete
                                          </button>
                                      )}
                            </div>
                            <div className="ml-auto flex gap-2">
                                <button
                                    type="button"
                                    onClick={requestClose}
                                    className={secondaryButton}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => save()}
                                    disabled={!dirty || saving}
                                    className={primaryButton}
                                >
                                    {saving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )

    return (
        <>
            {createPortal(editor, document.body)}
            <GenrePickerDialog
                isOpen={showGenreDialog}
                selectedGenres={form.genres}
                onChange={setGenres}
                mediaType={mediaTypeOf(form)}
                childSafeMode={isChildSafetyEnabled}
                onClose={() => setShowGenreDialog(false)}
            />
            <AdvancedFiltersModal
                isOpen={showAdvancedFilters}
                filters={form.advancedFilters}
                onChange={(advancedFilters) => update({ advancedFilters })}
                onClose={() => setShowAdvancedFilters(false)}
            />
            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteConfirm}
                itemName={collection.name}
                emoji={collection.emoji}
                isSystemItem={false}
                zIndexLayer="MODAL_EDITOR_DELETE"
            />
        </>
    )
}

/** Older saves wrote a single director as a string instead of a list. */
function names(value: unknown): string[] {
    if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string')
    return typeof value === 'string' && value ? [value] : []
}

function SwitchRow({
    label,
    hint,
    checked,
    disabled,
    onChange,
}: {
    label: string
    hint: string
    checked: boolean
    disabled?: boolean
    onChange: (next: boolean) => void
}) {
    return (
        <li className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-gray-400">{hint}</p>
            </div>
            <Switch label={label} checked={checked} disabled={disabled} onChange={onChange} />
        </li>
    )
}

function MediaRow({
    icon,
    label,
    checked,
    onChange,
}: {
    icon: React.ReactNode
    label: string
    checked: boolean
    onChange: (next: boolean) => void
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-medium text-white">
                <span className="text-gray-400" aria-hidden="true">
                    {icon}
                </span>
                {label}
            </span>
            <Switch size="sm" label={label} checked={checked} onChange={onChange} />
        </div>
    )
}

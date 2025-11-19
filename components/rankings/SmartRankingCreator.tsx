'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Content } from '@/typings'
import { UserList } from '@/types/userLists'
import {
    RankedItem,
    RANKING_CONSTRAINTS,
    CreateRankingRequest,
    UpdateRankingRequest,
} from '@/types/rankings'
import { useSessionStore } from '@/stores/sessionStore'
import { useAuthStore } from '@/stores/authStore'
import { useGuestStore } from '@/stores/guestStore'
import { useToast } from '@/hooks/useToast'
import { useRankingStore } from '@/stores/rankingStore'
import { useSessionData } from '@/hooks/useSessionData'
import { filterDislikedContent } from '@/utils/contentFilter'
import { auth, db } from '@/firebase'
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore'
import { SmartInput } from '@/components/common/SmartInput'
import SubPageLayout from '@/components/layout/SubPageLayout'
import {
    SparklesIcon,
    ArrowPathIcon,
    XMarkIcon,
    PlusIcon,
    ArrowsUpDownIcon,
    FolderOpenIcon,
    TrophyIcon,
} from '@heroicons/react/24/outline'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Image from 'next/image'

interface SmartRankingCreatorProps {
    onSwitchToTraditional?: () => void
}

// Sortable Item Component
function SortableItem({
    item,
    index,
    itemNote,
    totalItems,
    onNoteChange,
    onRemove,
    onRankChange,
}: {
    item: Content
    index: number
    itemNote: string
    totalItems: number
    onNoteChange: (value: string) => void
    onRemove: () => void
    onRankChange: (newRank: number) => void
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: item.id.toString(),
    })
    const [editingRank, setEditingRank] = useState(false)
    const [rankInput, setRankInput] = useState(String(index + 1))

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    const handleRankSubmit = () => {
        const newRank = parseInt(rankInput, 10)
        if (!isNaN(newRank) && newRank >= 1 && newRank <= totalItems) {
            onRankChange(newRank)
            setEditingRank(false)
        } else {
            // Reset to current rank if invalid
            setRankInput(String(index + 1))
            setEditingRank(false)
        }
    }

    const handleRankKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleRankSubmit()
        } else if (e.key === 'Escape') {
            setRankInput(String(index + 1))
            setEditingRank(false)
        }
    }

    // Update rank input when index changes
    useEffect(() => {
        setRankInput(String(index + 1))
    }, [index])

    return (
        <div ref={setNodeRef} style={style} className={`bg-zinc-900 rounded-lg p-4`}>
            <div className="flex gap-4">
                {/* Drag handle */}
                <div
                    {...attributes}
                    {...listeners}
                    className="flex items-center cursor-grab active:cursor-grabbing"
                >
                    <ArrowsUpDownIcon className="w-5 h-5 text-gray-500" />
                </div>

                {/* Editable Position */}
                <div className="flex items-center">
                    {editingRank ? (
                        <input
                            type="number"
                            value={rankInput}
                            onChange={(e) => setRankInput(e.target.value)}
                            onBlur={handleRankSubmit}
                            onKeyDown={handleRankKeyDown}
                            min={1}
                            max={totalItems}
                            className="w-12 bg-zinc-800 border border-yellow-500 rounded px-2 py-1 text-center text-yellow-500 font-bold focus:outline-none"
                            autoFocus
                        />
                    ) : (
                        <button
                            onClick={() => setEditingRank(true)}
                            className="text-2xl font-bold text-yellow-500 hover:text-yellow-400 transition-colors"
                        >
                            #{index + 1}
                        </button>
                    )}
                </div>

                {/* Wider Poster */}
                {item.poster_path && (
                    <Image
                        src={`https://image.tmdb.org/t/p/w154${item.poster_path}`}
                        alt={getContentTitle(item)}
                        width={77}
                        height={115}
                        className="rounded"
                    />
                )}

                {/* Content Info */}
                <div className="flex-1 min-w-0">
                    <h3 className="font-medium mb-1 truncate">{getContentTitle(item)}</h3>
                    <p className="text-sm text-gray-400 mb-2">
                        {getContentYear(item)} • ⭐ {item.vote_average?.toFixed(1) || 'N/A'}
                    </p>
                </div>

                {/* Side Note (Smaller) */}
                <div className="w-48 flex-shrink-0">
                    <textarea
                        value={itemNote}
                        onChange={(e) => onNoteChange(e.target.value)}
                        placeholder="Note..."
                        maxLength={200}
                        className="w-full h-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 resize-none"
                    />
                </div>

                {/* Remove button */}
                <button
                    onClick={onRemove}
                    className="text-gray-400 hover:text-red-500 transition-colors self-start"
                >
                    <XMarkIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    )
}

// Utility to get title from content
const getContentTitle = (content: Content): string => {
    return 'title' in content ? content.title : content.name
}

// Utility to get year from content
const getContentYear = (content: Content): string => {
    const date = 'release_date' in content ? content.release_date : content.first_air_date
    return date?.split('-')[0] || 'N/A'
}

export default function SmartRankingCreator({ onSwitchToTraditional }: SmartRankingCreatorProps) {
    const router = useRouter()
    const { sessionType, activeSessionId } = useSessionStore()
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()
    const authCollections = useAuthStore((state) => state.userCreatedWatchlists)
    const guestCollections = useGuestStore((state) => state.userCreatedWatchlists)
    const { createRanking, updateRanking } = useRankingStore()
    const { showSuccess, showError } = useToast()
    const { hiddenMovies } = useSessionData()

    // Get collections based on session type
    const collections = sessionType === 'authenticated' ? authCollections : guestCollections

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // Step tracking
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)

    // Step 1: Smart Query
    const [query, setQuery] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showImportModal, setShowImportModal] = useState(false)

    // Step 2: Content Selection & Ordering
    const [selectedItems, setSelectedItems] = useState<Content[]>([])
    const [itemNotes, setItemNotes] = useState<Record<number, string>>({})
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Content[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Step 3: Name & Share
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [isPublic, setIsPublic] = useState(true)
    const [tags, setTags] = useState<string[]>([])

    // Draft auto-save
    const [lastSearchQuery, setLastSearchQuery] = useState('')
    const draftSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Track content IDs for filtering duplicates/removed items
    const [originalContentIds, setOriginalContentIds] = useState<Set<number>>(new Set())
    const [manuallyAddedIds, setManuallyAddedIds] = useState<Set<number>>(new Set())
    const [removedContentIds, setRemovedContentIds] = useState<Set<number>>(new Set())

    // Generate random query using Gemini
    const handleSurpriseMe = async () => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/surprise-query')
            const data = await response.json()
            if (data.query) {
                setQuery(data.query)
                // Auto-submit
                await handleSmartSearch(data.query)
            }
        } catch (error) {
            showError('Failed to generate surprise query')
        } finally {
            setIsLoading(false)
        }
    }

    // Smart search using Gemini
    const handleSmartSearch = async (searchQuery?: string) => {
        const q = searchQuery || query
        if (!q.trim()) return

        setIsLoading(true)
        try {
            // Get Firebase auth token
            const currentUser = auth.currentUser
            if (!currentUser) {
                throw new Error('You must be logged in to use AI search')
            }

            const token = await currentUser.getIdToken()

            const response = await fetch('/api/generate-row', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ query: q }),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || 'Failed to generate content')
            }

            const data = await response.json()

            // Convert to Content format
            const content: Content[] = data.movies.map((movie: any) => ({
                id: movie.tmdbId,
                title: movie.title,
                release_date: movie.year ? `${movie.year}-01-01` : '',
                poster_path: movie.posterPath,
                vote_average: movie.rating,
                media_type: data.mediaType === 'tv' ? 'tv' : 'movie',
                overview: movie.reason || '',
            }))

            // Filter out hidden content from AI suggestions
            const filteredContent = filterDislikedContent(content, hiddenMovies)

            setSelectedItems(filteredContent)
            setTitle(data.rowName || q)
            setLastSearchQuery(q) // Save query for display and draft

            // Track original content IDs
            const contentIds = new Set(filteredContent.map((item) => item.id))
            setOriginalContentIds(contentIds)
            setManuallyAddedIds(new Set())
            setRemovedContentIds(new Set())

            setCurrentStep(2)
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Failed to generate ranking content'
            showError(message)
        } finally {
            setIsLoading(false)
        }
    }

    // Import from collection
    const handleImportCollection = (collection: UserList) => {
        setSelectedItems(collection.items)
        setTitle(collection.name)
        setDescription(collection.description || '')
        setShowImportModal(false)
        setCurrentStep(2)
    }

    // Drag and drop reordering
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (!over || active.id === over.id) return

        setSelectedItems((items) => {
            const oldIndex = items.findIndex((item) => item.id.toString() === active.id)
            const newIndex = items.findIndex((item) => item.id.toString() === over.id)

            return arrayMove(items, oldIndex, newIndex)
        })
    }

    // Remove item from ranking
    const handleRemoveItem = (contentId: number) => {
        setSelectedItems(selectedItems.filter((item) => item.id !== contentId))
        const newNotes = { ...itemNotes }
        delete newNotes[contentId]
        setItemNotes(newNotes)

        // Track removed item
        setRemovedContentIds((prev) => new Set(prev).add(contentId))
    }

    // Change item rank by typing number
    const handleRankChange = (contentId: number, newRank: number) => {
        const currentIndex = selectedItems.findIndex((item) => item.id === contentId)
        if (currentIndex === -1) return

        const newIndex = newRank - 1 // Convert rank to index
        if (newIndex < 0 || newIndex >= selectedItems.length) return

        setSelectedItems(arrayMove(selectedItems, currentIndex, newIndex))
    }

    // Search for content to add (debounced 300ms)
    const handleContentSearch = useCallback(
        (query: string) => {
            // Clear existing timeout
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current)
            }

            if (!query.trim()) {
                setSearchResults([])
                setIsSearching(false)
                return
            }

            setIsSearching(true)

            // Set new timeout
            searchTimeoutRef.current = setTimeout(async () => {
                try {
                    const response = await fetch(
                        `/api/search?query=${encodeURIComponent(query)}&page=1`
                    )
                    const data = await response.json()
                    setSearchResults(data.results || [])
                } catch (error) {
                    showError('Search failed')
                } finally {
                    setIsSearching(false)
                }
            }, 300)
        },
        [showError]
    )

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current)
            }
        }
    }, [])

    // Get more AI suggestions (filtered)
    const handleGetMoreSuggestions = async () => {
        if (!lastSearchQuery) {
            showError('No query to get more suggestions from')
            return
        }

        setIsLoading(true)
        try {
            const currentUser = auth.currentUser
            if (!currentUser) {
                throw new Error('You must be logged in to use AI search')
            }

            const token = await currentUser.getIdToken()

            // Get current content IDs
            const currentIds = new Set(selectedItems.map((item) => item.id))
            const excludeIds = new Set([...currentIds, ...removedContentIds])

            const response = await fetch('/api/generate-row', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    query: lastSearchQuery,
                    excludeIds: Array.from(excludeIds), // Send IDs to exclude
                }),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || 'Failed to generate more suggestions')
            }

            const data = await response.json()

            // Convert to Content format
            const newContent: Content[] = data.movies
                .map((movie: any) => ({
                    id: movie.tmdbId,
                    title: movie.title,
                    release_date: movie.year ? `${movie.year}-01-01` : '',
                    poster_path: movie.posterPath,
                    vote_average: movie.rating,
                    media_type: data.mediaType === 'tv' ? 'tv' : 'movie',
                    overview: movie.reason || '',
                }))
                // Filter out duplicates and removed items on client side as well
                .filter((item: Content) => !excludeIds.has(item.id))

            if (newContent.length === 0) {
                showError('No new suggestions found. Try adding items manually.')
                return
            }

            // Add to selected items
            setSelectedItems([...selectedItems, ...newContent])
            showSuccess(`Added ${newContent.length} new suggestions!`, 'AI generated more content')
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Failed to get more suggestions'
            showError(message)
        } finally {
            setIsLoading(false)
        }
    }

    // Add item from search
    const handleAddItem = (content: Content) => {
        if (selectedItems.find((item) => item.id === content.id)) {
            showError('Item already in ranking')
            return
        }
        setSelectedItems([...selectedItems, content])
        setSearchQuery('')
        setSearchResults([])

        // Track manually added item (if not originally suggested)
        if (!originalContentIds.has(content.id)) {
            setManuallyAddedIds((prev) => new Set(prev).add(content.id))
        }
        // Remove from removed list if re-adding
        setRemovedContentIds((prev) => {
            const newSet = new Set(prev)
            newSet.delete(content.id)
            return newSet
        })
    }

    // Save draft to Firebase (debounced)
    const saveDraft = useCallback(() => {
        if (!userId) return

        if (draftSaveTimeoutRef.current) {
            clearTimeout(draftSaveTimeoutRef.current)
        }

        draftSaveTimeoutRef.current = setTimeout(async () => {
            const draft = {
                query: lastSearchQuery,
                selectedItems,
                itemNotes,
                title,
                description,
                isPublic,
                currentStep,
                savedAt: Date.now(),
            }
            try {
                const draftRef = doc(db, 'users', userId, 'drafts', 'ranking_draft')
                await setDoc(draftRef, draft)
            } catch (error) {
                console.error('Failed to save draft:', error)
            }
        }, 3000) // Save after 3 seconds of inactivity (longer to reduce Firebase writes)
    }, [
        lastSearchQuery,
        selectedItems,
        itemNotes,
        title,
        description,
        isPublic,
        currentStep,
        userId,
    ])

    // Load draft from Firebase
    const loadDraft = useCallback(async () => {
        if (!userId) return false

        try {
            const draftRef = doc(db, 'users', userId, 'drafts', 'ranking_draft')
            const draftSnap = await getDoc(draftRef)

            if (draftSnap.exists()) {
                const draft = draftSnap.data()
                // Only load if saved within last 7 days
                const age = Date.now() - draft.savedAt
                if (age < 7 * 24 * 60 * 60 * 1000) {
                    setLastSearchQuery(draft.query || '')
                    setSelectedItems(draft.selectedItems || [])
                    setItemNotes(draft.itemNotes || {})
                    setTitle(draft.title || '')
                    setDescription(draft.description || '')
                    setIsPublic(draft.isPublic ?? true)
                    setCurrentStep(draft.currentStep || 1)
                    return true
                }
            }
        } catch (error) {
            console.error('Failed to load draft:', error)
        }
        return false
    }, [userId])

    // Clear draft from Firebase
    const clearDraft = useCallback(async () => {
        if (!userId) return

        try {
            const draftRef = doc(db, 'users', userId, 'drafts', 'ranking_draft')
            await deleteDoc(draftRef)
        } catch (error) {
            console.error('Failed to clear draft:', error)
        }
    }, [userId])

    // Load draft on mount
    useEffect(() => {
        loadDraft()
    }, [loadDraft])

    // Auto-save draft when state changes
    useEffect(() => {
        if (currentStep > 1 || selectedItems.length > 0 || title.trim()) {
            saveDraft()
        }
    }, [
        currentStep,
        selectedItems,
        itemNotes,
        title,
        description,
        isPublic,
        lastSearchQuery,
        saveDraft,
    ])

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (draftSaveTimeoutRef.current) {
                clearTimeout(draftSaveTimeoutRef.current)
            }
        }
    }, [])

    // Create ranking
    const handleCreate = async () => {
        if (!title.trim()) {
            showError('Please enter a title')
            return
        }

        if (selectedItems.length < RANKING_CONSTRAINTS.MIN_ITEM_COUNT) {
            showError(`Please add at least ${RANKING_CONSTRAINTS.MIN_ITEM_COUNT} items`)
            return
        }

        // Get current user info from Firebase Auth
        const currentUser = auth.currentUser
        if (!currentUser) {
            showError('You must be logged in to create a ranking')
            return
        }

        const username = currentUser.displayName || 'Unknown User'
        const avatarUrl = currentUser.photoURL || undefined

        setIsLoading(true)
        try {
            const rankedItems: RankedItem[] = selectedItems.map((content, index) => ({
                position: index + 1,
                content,
                note: itemNotes[content.id],
                addedAt: Date.now(),
            }))

            const createRequest: CreateRankingRequest = {
                title: title.trim(),
                itemCount: selectedItems.length,
                isPublic,
            }

            if (description.trim()) {
                createRequest.description = description.trim()
            }

            const rankingId = await createRanking(userId, username, avatarUrl, createRequest)

            if (rankingId) {
                // Update with ranked items
                const updateRequest: UpdateRankingRequest = {
                    id: rankingId,
                    rankedItems,
                }
                await updateRanking(userId, updateRequest)
                clearDraft() // Clear draft after successful creation
                showSuccess('Ranking created!')
                router.push(`/rankings/${rankingId}`)
            }
        } catch (error) {
            showError('Failed to create ranking')
        } finally {
            setIsLoading(false)
        }
    }

    const stepTitle =
        currentStep === 1
            ? 'Smart Ranking Creator'
            : currentStep === 2
              ? 'Order & Customize'
              : 'Name & Share'
    const stepDescription =
        currentStep === 1
            ? 'Ask AI for an exhaustive list or import a collection'
            : currentStep === 2
              ? 'Arrange items and add your notes'
              : 'Give your ranking a title and publish'

    return (
        <SubPageLayout
            title={stepTitle}
            icon={<TrophyIcon className="w-8 h-8" />}
            iconColor="text-yellow-500"
            description={stepDescription}
            titleActions={
                onSwitchToTraditional ? (
                    <button
                        onClick={onSwitchToTraditional}
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        Switch to Traditional
                    </button>
                ) : undefined
            }
        >
            <div className="max-w-5xl mx-auto">
                {/* Step 1: Smart Query */}
                {currentStep === 1 && (
                    <div className="space-y-8">
                        {/* Import Collection Button */}
                        <div className="flex justify-end">
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                            >
                                <FolderOpenIcon className="w-5 h-5" />
                                Import Collection
                            </button>
                        </div>

                        {/* Hero-style Smart Input */}
                        <div className="text-center space-y-6 py-8">
                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold">What do you want to rank?</h2>
                                <p className="text-gray-400">
                                    Ask AI for comprehensive lists: franchises, filmographies,
                                    genres, or concepts
                                </p>
                            </div>

                            <div className="max-w-2xl mx-auto">
                                <SmartInput
                                    value={query}
                                    onChange={setQuery}
                                    onSubmit={() => handleSmartSearch()}
                                    isActive={true}
                                    showTypewriter={true}
                                    size="large"
                                    variant="transparent"
                                    shimmer="wave"
                                    showSurpriseMe={true}
                                    onSurpriseMe={handleSurpriseMe}
                                    surpriseIcon="dice"
                                    surpriseQueryType="ranking"
                                    placeholder="e.g., All James Bond movies, Paul Thomas Anderson filmography, Best heist films..."
                                />
                            </div>

                            {isLoading && (
                                <div className="flex items-center justify-center gap-2 text-yellow-500">
                                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                    <span>Generating ranking...</span>
                                </div>
                            )}
                        </div>

                        {/* Examples */}
                        <div className="max-w-2xl mx-auto">
                            <p className="text-xs text-gray-500 mb-3 text-center">
                                Try these examples:
                            </p>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {[
                                    'All Christopher Nolan films',
                                    'Leonardo DiCaprio movies',
                                    'Star Wars universe',
                                    'Marvel Cinematic Universe',
                                    'Studio Ghibli films',
                                ].map((example) => (
                                    <button
                                        key={example}
                                        onClick={() => {
                                            setQuery(example)
                                            handleSmartSearch(example)
                                        }}
                                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-full text-xs transition-colors"
                                    >
                                        {example}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Order & Customize */}
                {currentStep === 2 && (
                    <div className="space-y-6">
                        {/* Search query display */}
                        {lastSearchQuery && (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <SparklesIcon className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-400 mb-1">
                                            AI generated from:
                                        </p>
                                        <p className="font-medium">{lastSearchQuery}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Header with count */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold">
                                    {selectedItems.length} Items in Ranking
                                </h2>
                                <p className="text-sm text-gray-400">
                                    Drag to reorder, click to add notes, or remove items
                                </p>
                                {selectedItems.length < RANKING_CONSTRAINTS.MIN_ITEM_COUNT && (
                                    <p className="text-sm text-red-400 mt-1">
                                        ⚠️ Add at least {RANKING_CONSTRAINTS.MIN_ITEM_COUNT} items
                                        to continue
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentStep(1)}
                                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => setCurrentStep(3)}
                                    disabled={
                                        selectedItems.length < RANKING_CONSTRAINTS.MIN_ITEM_COUNT
                                    }
                                    className="px-4 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400 disabled:bg-zinc-800 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                                >
                                    Continue
                                </button>
                            </div>
                        </div>

                        {/* AI Suggestions and Manual Search */}
                        <div className="bg-zinc-900 rounded-lg p-4 space-y-4">
                            {/* Get More Suggestions Button */}
                            {lastSearchQuery && (
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleGetMoreSuggestions}
                                        disabled={isLoading}
                                        className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400 disabled:bg-zinc-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <SparklesIcon className="w-5 h-5" />
                                        Get More AI Suggestions
                                    </button>
                                    <p className="text-xs text-gray-500">
                                        AI will suggest more items based on your original query
                                    </p>
                                </div>
                            )}

                            {/* Manual Search */}
                            <div className="border-t border-zinc-800 pt-4">
                                <p className="text-sm text-gray-400 mb-3">
                                    Or search to add items manually
                                </p>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value)
                                            handleContentSearch(e.target.value)
                                        }}
                                        placeholder="Search for movies or TV shows..."
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                                    />
                                    {isSearching && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <ArrowPathIcon className="w-5 h-5 animate-spin text-yellow-500" />
                                        </div>
                                    )}
                                </div>
                                {searchResults.length > 0 && (
                                    <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                                        {searchResults.slice(0, 5).map((result) => (
                                            <button
                                                key={result.id}
                                                onClick={() => handleAddItem(result)}
                                                className="w-full flex items-center gap-3 p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                                            >
                                                {result.poster_path && (
                                                    <Image
                                                        src={`https://image.tmdb.org/t/p/w92${result.poster_path}`}
                                                        alt={getContentTitle(result)}
                                                        width={32}
                                                        height={48}
                                                        className="rounded"
                                                    />
                                                )}
                                                <div className="text-left flex-1">
                                                    <p className="font-medium text-sm">
                                                        {getContentTitle(result)}
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        {getContentYear(result)}
                                                    </p>
                                                </div>
                                                <PlusIcon className="w-5 h-5 text-yellow-500" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Drag and drop list */}
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={selectedItems.map((item) => item.id.toString())}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-3">
                                    {selectedItems.map((item, index) => (
                                        <SortableItem
                                            key={item.id}
                                            item={item}
                                            index={index}
                                            itemNote={itemNotes[item.id] || ''}
                                            totalItems={selectedItems.length}
                                            onNoteChange={(value) =>
                                                setItemNotes({
                                                    ...itemNotes,
                                                    [item.id]: value,
                                                })
                                            }
                                            onRemove={() => handleRemoveItem(item.id)}
                                            onRankChange={(newRank) =>
                                                handleRankChange(item.id, newRank)
                                            }
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>
                )}

                {/* Step 3: Name & Share */}
                {currentStep === 3 && (
                    <div className="max-w-2xl mx-auto space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold">Name Your Ranking</h2>
                            <button
                                onClick={() => setCurrentStep(2)}
                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                            >
                                Back
                            </button>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Title *
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., My Definitive Bond Ranking"
                                maxLength={RANKING_CONSTRAINTS.MAX_TITLE_LENGTH}
                                className={`w-full bg-zinc-800 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none ${
                                    !title.trim() ||
                                    title.length < RANKING_CONSTRAINTS.MIN_TITLE_LENGTH
                                        ? 'border-red-500 focus:border-red-400'
                                        : 'border-zinc-700 focus:border-yellow-500'
                                }`}
                            />
                            <div className="flex items-center justify-between mt-1">
                                <div>
                                    {!title.trim() && (
                                        <p className="text-xs text-red-400">Title is required</p>
                                    )}
                                    {title.trim() &&
                                        title.length < RANKING_CONSTRAINTS.MIN_TITLE_LENGTH && (
                                            <p className="text-xs text-red-400">
                                                Title must be at least{' '}
                                                {RANKING_CONSTRAINTS.MIN_TITLE_LENGTH} characters
                                            </p>
                                        )}
                                </div>
                                <p className="text-xs text-gray-500">
                                    {title.length}/{RANKING_CONSTRAINTS.MAX_TITLE_LENGTH}
                                </p>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Description (optional)
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Add context about your ranking..."
                                maxLength={RANKING_CONSTRAINTS.MAX_DESCRIPTION_LENGTH}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 resize-none"
                                rows={4}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {description.length}/{RANKING_CONSTRAINTS.MAX_DESCRIPTION_LENGTH}
                            </p>
                        </div>

                        {/* Visibility */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-3">
                                Visibility
                            </label>
                            <div className="space-y-2">
                                <label className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-700 transition-colors">
                                    <input
                                        type="radio"
                                        checked={isPublic}
                                        onChange={() => setIsPublic(true)}
                                        className="w-4 h-4"
                                    />
                                    <div>
                                        <p className="font-medium">Public</p>
                                        <p className="text-sm text-gray-400">
                                            Anyone can see and comment on this ranking
                                        </p>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-700 transition-colors">
                                    <input
                                        type="radio"
                                        checked={!isPublic}
                                        onChange={() => setIsPublic(false)}
                                        className="w-4 h-4"
                                    />
                                    <div>
                                        <p className="font-medium">Private</p>
                                        <p className="text-sm text-gray-400">
                                            Only you can see this ranking
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Create button */}
                        <button
                            onClick={handleCreate}
                            disabled={
                                !title.trim() ||
                                title.length < RANKING_CONSTRAINTS.MIN_TITLE_LENGTH ||
                                isLoading
                            }
                            className="w-full px-6 py-3 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400 disabled:bg-zinc-800 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? 'Creating...' : 'Create Ranking'}
                        </button>
                    </div>
                )}

                {/* Import Collection Modal */}
                {showImportModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-zinc-900 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                                <h3 className="text-xl font-bold">Import Collection</h3>
                                <button
                                    onClick={() => setShowImportModal(false)}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto max-h-[60vh]">
                                {collections.filter((col) => col.items && col.items.length >= 3)
                                    .length === 0 ? (
                                    <p className="text-center text-gray-400 py-8">
                                        No collections with 3+ items found.
                                        <br />
                                        Create a collection first!
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {collections
                                            .filter((col) => col.items && col.items.length >= 3)
                                            .map((collection) => (
                                                <button
                                                    key={collection.id}
                                                    onClick={() =>
                                                        handleImportCollection(collection)
                                                    }
                                                    className="w-full p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-left"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {collection.emoji && (
                                                            <span className="text-2xl">
                                                                {collection.emoji}
                                                            </span>
                                                        )}
                                                        <div className="flex-1">
                                                            <h4 className="font-medium">
                                                                {collection.name}
                                                            </h4>
                                                            <p className="text-sm text-gray-400">
                                                                {collection.items?.length || 0}{' '}
                                                                items
                                                            </p>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </SubPageLayout>
    )
}

'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useModalStore } from '../../stores/modalStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useSmartSearchStore } from '../../stores/smartSearchStore'
import { useToast } from '../../hooks/useToast'
import {
    XMarkIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    SparklesIcon,
    MagnifyingGlassIcon,
    QuestionMarkCircleIcon,
    FilmIcon,
    TvIcon,
    PencilIcon,
    CheckIcon,
    MicrophoneIcon,
} from '@heroicons/react/24/outline'
import IconPickerModal from './IconPickerModal'
import ColorPickerModal from './ColorPickerModal'
import InlineSearchBar from './InlineSearchBar'
import useUserData from '../../hooks/useUserData'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import Image from 'next/image'
import { Content, getTitle, getYear, isMovie } from '../../typings'
import { authenticatedFetch, AuthRequiredError } from '@/lib/authenticatedFetch'
import { inferMediaTypeFromContent, inferTopGenresFromContent } from '@/utils/collectionGenreUtils'
import { GenrePills } from '../collections/GenrePills'
import { getUnifiedGenresByMediaType } from '../../constants/unifiedGenres'
import { useChildSafety } from '../../hooks/useChildSafety'

const ITEMS_PER_PAGE = 10 // 2 rows x 5 columns

// Simplified content card for modal display
function SimpleContentCard({
    content,
    onRemove,
    isNew = false,
}: {
    content: Content
    onRemove: (e: React.MouseEvent) => void
    isNew?: boolean
}) {
    const [imageLoaded, setImageLoaded] = useState(false)

    return (
        <div className={`relative group cursor-pointer ${isNew ? 'animate-new-item' : ''}`}>
            {/* Remove Button - Center Top with white circle and black X */}
            <button
                onClick={onRemove}
                onMouseEnter={(e) => e.stopPropagation()}
                onMouseLeave={(e) => e.stopPropagation()}
                className="
                    absolute top-2 left-1/2 -translate-x-1/2 z-50
                    w-10 h-10 min-w-[44px] min-h-[44px] rounded-full
                    bg-white shadow-lg
                    border-2 border-black
                    opacity-100 sm:opacity-0 sm:group-hover:opacity-100
                    transition-all duration-200
                    hover:scale-110
                    flex items-center justify-center
                "
                aria-label="Remove from collection"
            >
                <XMarkIcon className="h-6 w-6 text-black" />
            </button>

            {/* Poster Image */}
            <div className="relative aspect-[2/3] bg-gray-800 rounded-md overflow-hidden">
                {!imageLoaded && (
                    <div className="w-full h-full bg-gray-800 animate-pulse flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-gray-600 border-t-red-600 rounded-full animate-spin"></div>
                    </div>
                )}

                {content.poster_path && (
                    <Image
                        src={`https://image.tmdb.org/t/p/w342${content.poster_path}`}
                        alt={getTitle(content)}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, 150px"
                        onLoad={() => setImageLoaded(true)}
                    />
                )}
            </div>

            {/* Rating Badge */}
            {content.vote_average > 0 && imageLoaded && (
                <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm rounded-full px-2 py-1 z-10">
                    <div className="flex items-center gap-1">
                        <span className="text-yellow-400 text-xs">⭐</span>
                        <span className="text-white text-xs font-medium">
                            {content.vote_average.toFixed(1)}
                        </span>
                    </div>
                </div>
            )}

            {/* Media Type Pill */}
            {imageLoaded && (
                <div className="absolute top-2 right-2 z-10">
                    <span
                        className={`px-2 py-0.5 text-xs rounded-full backdrop-blur-sm font-bold ${
                            isMovie(content)
                                ? 'bg-white/90 text-black'
                                : 'bg-black/90 text-white border border-white/50'
                        }`}
                    >
                        {isMovie(content) ? 'Movie' : 'TV'}
                    </span>
                </div>
            )}

            {/* Title on Hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                <div className="absolute bottom-0 left-0 right-0 p-2">
                    <p className="text-white text-xs font-medium line-clamp-2">
                        {getTitle(content)}
                    </p>
                </div>
            </div>
        </div>
    )
}

export default function CollectionCreatorModal() {
    const router = useRouter()
    const { isEnabled: isChildSafetyEnabled } = useChildSafety()
    const {
        collectionCreatorModal,
        closeCollectionCreatorModal,
        setCollectionCreatorName,
        addToCollectionCreator,
        removeFromCollectionCreator,
    } = useModalStore()
    const getUserId = useSessionStore((state) => state.getUserId)
    const { createList, addToList } = useUserData()
    const { showSuccess, showError } = useToast()
    const {
        query,
        mode,
        mediaType: smartSearchMediaType,
        addResults,
        addToConversation,
    } = useSmartSearchStore()

    // Genre lookup
    const GENRE_LOOKUP = useMemo(() => {
        const map = new Map<string, string>()
        const allGenres = getUnifiedGenresByMediaType('both', isChildSafetyEnabled)
        allGenres.forEach((genre) => {
            map.set(genre.id, genre.name)
        })
        return map
    }, [isChildSafetyEnabled])

    const [selectedEmoji, setSelectedEmoji] = useState('📺')
    const [selectedColor, setSelectedColor] = useState('#3b82f6') // blue-500
    const [showIconPicker, setShowIconPicker] = useState(false)
    const [showColorPicker, setShowColorPicker] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [currentPage, setCurrentPage] = useState(0)
    const [searchFilter, setSearchFilter] = useState('')
    const [displayAsRow, setDisplayAsRow] = useState(true)
    const [enableInfiniteContent, setEnableInfiniteContent] = useState(false)
    const [showInfiniteTooltip, setShowInfiniteTooltip] = useState(false)
    const [showGenreModal, setShowGenreModal] = useState(false)
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [editedName, setEditedName] = useState('')

    // Media type states (independent toggles)
    const [isMovieEnabled, setIsMovieEnabled] = useState(true)
    const [isTVEnabled, setIsTVEnabled] = useState(true)
    const [mediaType, setMediaType] = useState<'movie' | 'tv' | 'both'>('both')
    const [highlightMediaType, setHighlightMediaType] = useState(false)

    // Genre selection
    const [selectedGenres, setSelectedGenres] = useState<string[]>([])
    const [genreLogic, setGenreLogic] = useState<'AND' | 'OR'>('AND')

    // Track newly added items for animation
    const [newlyAddedIds, setNewlyAddedIds] = useState<Set<number>>(new Set())

    // Ref for title edit container (click outside to save)
    const titleEditRef = useRef<HTMLDivElement>(null)

    // Voice input for filter
    const {
        isListening: isFilterListening,
        isSupported: isVoiceSupported,
        transcript: filterTranscript,
        startListening: startFilterListening,
        stopListening: stopFilterListening,
    } = useVoiceInput({
        onResult: (finalTranscript) => {
            setSearchFilter(finalTranscript)
            setCurrentPage(0)
        },
        onError: (error) => {
            showError('Voice input error', error)
        },
    })

    // Initialize emoji/color from modal state when modal opens (AI-suggested values)
    // Falls back to defaults when no AI suggestions are provided
    useEffect(() => {
        if (collectionCreatorModal.isOpen) {
            setSelectedEmoji(collectionCreatorModal.emoji || '📺')
            setSelectedColor(collectionCreatorModal.color || '#3b82f6')
            setEditedName(collectionCreatorModal.name || '')
            // Infer genres from content
            const inferredGenres = inferTopGenresFromContent(collectionCreatorModal.content, 2)
            setSelectedGenres(inferredGenres)

            // Use Gemini's mediaType from smart search store if available, otherwise infer
            const geminiMediaType = smartSearchMediaType
            if (geminiMediaType === 'movie') {
                setMediaType('movie')
                setIsMovieEnabled(true)
                setIsTVEnabled(false)
            } else if (geminiMediaType === 'tv') {
                setMediaType('tv')
                setIsMovieEnabled(false)
                setIsTVEnabled(true)
            } else {
                // Fallback to inferring from content if Gemini didn't specify
                const inferredMediaType = inferMediaTypeFromContent(
                    collectionCreatorModal.content,
                    'both'
                )
                setMediaType(inferredMediaType)
                setIsMovieEnabled(inferredMediaType === 'movie' || inferredMediaType === 'both')
                setIsTVEnabled(inferredMediaType === 'tv' || inferredMediaType === 'both')
            }

            setEnableInfiniteContent(inferredGenres.length > 0)
        }
    }, [
        collectionCreatorModal.isOpen,
        collectionCreatorModal.emoji,
        collectionCreatorModal.color,
        collectionCreatorModal.content,
        collectionCreatorModal.name,
        smartSearchMediaType,
    ])

    // Sync mediaType with individual enabled states
    useEffect(() => {
        if (isMovieEnabled && isTVEnabled) {
            setMediaType('both')
        } else if (isMovieEnabled) {
            setMediaType('movie')
        } else if (isTVEnabled) {
            setMediaType('tv')
        } else {
            setMediaType('both')
        }
    }, [isMovieEnabled, isTVEnabled])

    // Auto-disable display on page when both media types are disabled
    useEffect(() => {
        if (!isMovieEnabled && !isTVEnabled && displayAsRow) {
            setDisplayAsRow(false)
        }
    }, [isMovieEnabled, isTVEnabled, displayAsRow])

    // Auto-set genre logic based on infinite content toggle
    useEffect(() => {
        if (enableInfiniteContent) {
            setGenreLogic('OR')
        } else {
            setGenreLogic('AND')
        }
    }, [enableInfiniteContent])

    // Disable infinite content if no genres selected
    useEffect(() => {
        if (enableInfiniteContent && selectedGenres.length === 0) {
            setEnableInfiniteContent(false)
        }
    }, [enableInfiniteContent, selectedGenres.length])

    // Clear animation after it plays (1.5 seconds)
    useEffect(() => {
        if (newlyAddedIds.size > 0) {
            const timer = setTimeout(() => {
                setNewlyAddedIds(new Set())
            }, 1500)
            return () => clearTimeout(timer)
        }
    }, [newlyAddedIds])

    // Show live transcript while listening for filter
    useEffect(() => {
        if (isFilterListening && filterTranscript) {
            setSearchFilter(filterTranscript)
        }
    }, [filterTranscript, isFilterListening])

    // Click outside title edit to save
    useEffect(() => {
        if (!isEditingTitle) return

        const handleClickOutside = (event: MouseEvent) => {
            if (titleEditRef.current && !titleEditRef.current.contains(event.target as Node)) {
                handleSaveTitleEdit()
            }
        }

        // Small delay to prevent immediate trigger
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside)
        }, 100)

        return () => {
            clearTimeout(timeoutId)
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isEditingTitle, editedName])

    // Filter content based on search
    const filteredContent = useMemo(() => {
        if (!searchFilter.trim()) return collectionCreatorModal.content

        const searchLower = searchFilter.toLowerCase().trim()
        return collectionCreatorModal.content.filter((item) => {
            const title = getTitle(item).toLowerCase()
            return title.includes(searchLower)
        })
    }, [collectionCreatorModal.content, searchFilter])

    const totalPages = Math.ceil(filteredContent.length / ITEMS_PER_PAGE)
    const startIndex = currentPage * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    const currentItems = filteredContent.slice(startIndex, endIndex)

    // Fill empty slots to maintain grid height (2 rows x 4 columns = 8 slots)
    const emptySlots = ITEMS_PER_PAGE - currentItems.length
    const fillerItems = Array(emptySlots).fill(null)

    const hasMediaTypeEnabled = isMovieEnabled || isTVEnabled

    const selectedGenreNames = selectedGenres.map((id) => GENRE_LOOKUP.get(id) || `Genre ${id}`)

    const handleClose = () => {
        closeCollectionCreatorModal()
        setSelectedEmoji('📺')
        setSelectedColor('#3b82f6')
        setShowIconPicker(false)
        setShowColorPicker(false)
        setCurrentPage(0)
        setSearchFilter('')
        setDisplayAsRow(true)
        setEnableInfiniteContent(false)
        setSelectedGenres([])
        setIsMovieEnabled(true)
        setIsTVEnabled(true)
        setHighlightMediaType(false)
        setIsEditingTitle(false)
        setEditedName('')
        setNewlyAddedIds(new Set())
    }

    const handleSaveTitleEdit = () => {
        setCollectionCreatorName(editedName)
        setIsEditingTitle(false)
    }

    // Wrapper to add content with animation and auto-navigate to last page
    const handleAddContent = (content: Content) => {
        addToCollectionCreator(content)
        // Track the new item for animation
        setNewlyAddedIds((prev) => new Set([...prev, content.id]))
        // Navigate to the last page to show the new item
        // Need to calculate new total after adding
        const newTotal = collectionCreatorModal.content.length + 1
        const newTotalPages = Math.ceil(newTotal / ITEMS_PER_PAGE)
        setCurrentPage(newTotalPages - 1)
        // Clear search filter so user can see the new item
        setSearchFilter('')
    }

    const handleCreate = async () => {
        const userId = getUserId()

        if (!userId) {
            showError('Please sign in to create collections')
            return
        }

        if (!collectionCreatorModal.name.trim()) {
            showError('Please enter a collection name')
            return
        }

        if (enableInfiniteContent && selectedGenres.length === 0) {
            showError('Add at least one genre', 'Infinite content requires genre filters')
            return
        }

        setIsCreating(true)

        try {
            const infiniteEnabled = enableInfiniteContent && selectedGenres.length > 0

            // Create the list using useUserData hook
            const newListResult = createList({
                name: collectionCreatorModal.name.trim(),
                emoji: selectedEmoji,
                color: selectedColor,
                displayAsRow,
                collectionType: 'ai-generated', // This is from smart search
                originalQuery: query, // Store the original search query
                canGenerateMore: infiniteEnabled,
                autoUpdateEnabled: false, // AI-generated collections don't auto-update
                updateFrequency: 'never',
                genres: selectedGenres,
                genreLogic,
                mediaType,
                advancedFilters: {
                    contentIds: collectionCreatorModal.content.map((item) => item.id),
                },
            })

            // Handle both sync and async returns
            const listId = typeof newListResult === 'string' ? newListResult : await newListResult

            // Add all content items to the list and wait for completion
            await Promise.all(
                collectionCreatorModal.content.map((contentItem) => addToList(listId, contentItem))
            )

            showSuccess(
                'Collection saved!',
                `"${collectionCreatorModal.name}" with ${collectionCreatorModal.content.length} titles`
            )

            handleClose()

            // Navigate to collections page
            router.push('/collections')
        } catch (error: any) {
            // Error already shown to user via toast
            showError('Failed to create collection', error.message)
        } finally {
            setIsCreating(false)
        }
    }

    const handleAskForMore = async () => {
        // Use query from store, or fallback to collection name
        const searchQuery = query || collectionCreatorModal.name
        console.log('Generate More clicked, query:', searchQuery, 'mode:', mode)

        if (!searchQuery) {
            showError('No search query', 'Unable to generate more suggestions without a query')
            return
        }

        setIsLoadingMore(true)

        try {
            const state = useSmartSearchStore.getState()
            console.log('Smart search state:', {
                query: state.query,
                results: state.results.length,
            })

            // Create list of existing movies with title and year for better context
            // Use collection content (which may have been modified) rather than smart search results
            const existingMovies = collectionCreatorModal.content.map((r) => ({
                title: getTitle(r),
                year: getYear(r),
            }))

            const response = await authenticatedFetch('/api/ai-suggestions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: searchQuery,
                    mode: mode || 'suggestions',
                    conversationHistory: state.conversationHistory,
                    existingMovies,
                }),
            })

            if (!response.ok) {
                // Try to get error details from response
                let errorData: any = {}
                try {
                    errorData = await response.json()
                } catch {
                    // Response might not be JSON
                }

                const errorMessage =
                    errorData.error || errorData.message || `Server error (${response.status})`

                if (response.status === 429) {
                    showError(
                        'AI limit reached',
                        errorData.error || 'Daily Gemini limit reached. Please try again tomorrow.'
                    )
                    throw new Error('AI limit reached')
                }
                if (response.status === 401) {
                    showError('Session expired', 'Please sign in again to continue.')
                    throw new Error('Authentication required')
                }
                if (response.status === 400) {
                    showError('Invalid request', errorMessage)
                    throw new Error(errorMessage)
                }
                if (response.status === 500) {
                    showError('Server error', errorMessage)
                    throw new Error(errorMessage)
                }
                if (response.status === 503) {
                    showError(
                        'AI service unavailable',
                        'The AI service is temporarily unavailable. Please try again later.'
                    )
                    throw new Error('AI service unavailable')
                }

                showError('Request failed', errorMessage)
                throw new Error(errorMessage)
            }

            const data = await response.json()

            // Validate response structure
            if (!data || !Array.isArray(data.results)) {
                console.error('Invalid API response structure:', data)
                showError('Invalid response', 'The AI returned an unexpected response format')
                throw new Error('Invalid response format')
            }

            console.log('AI suggestions received:', {
                resultCount: data.results.length,
                mediaType: data.mediaType,
                generatedName: data.generatedName,
            })

            // Create a Set of existing titles (normalized) for duplicate checking
            // Use collection content for duplicate checking
            const existingTitlesSet = new Set(
                collectionCreatorModal.content.map((r) => {
                    const title = getTitle(r).toLowerCase().trim()
                    const year = getYear(r).trim()
                    return `${title}::${year}`
                })
            )

            // Filter out duplicates from new results
            const uniqueNewResults = data.results.filter((newItem: any) => {
                const title = getTitle(newItem).toLowerCase().trim()
                const year = getYear(newItem).trim()
                const key = `${title}::${year}`
                return !existingTitlesSet.has(key)
            })

            if (uniqueNewResults.length > 0) {
                addResults(uniqueNewResults)
                addToConversation({
                    role: 'user',
                    content: 'Show me more similar titles',
                })
                addToConversation({
                    role: 'assistant',
                    content: `Added ${uniqueNewResults.length} more suggestions`,
                })

                // Update media type toggles based on Gemini's response
                if (data.mediaType === 'movie') {
                    setIsMovieEnabled(true)
                    setIsTVEnabled(false)
                } else if (data.mediaType === 'tv') {
                    setIsMovieEnabled(false)
                    setIsTVEnabled(true)
                }
                // If 'both' or undefined, keep current toggle states

                // Add new results to the collection creator modal
                const newIds: number[] = []
                uniqueNewResults.forEach((item: Content) => {
                    // Check if not already in collection
                    if (!collectionCreatorModal.content.some((c) => c.id === item.id)) {
                        addToCollectionCreator(item)
                        newIds.push(item.id)
                    }
                })

                // Track new items for animation
                if (newIds.length > 0) {
                    setNewlyAddedIds((prev) => new Set([...prev, ...newIds]))
                    // Navigate to the last page to show the new items
                    const newTotal = collectionCreatorModal.content.length + newIds.length
                    const newTotalPages = Math.ceil(newTotal / ITEMS_PER_PAGE)
                    setCurrentPage(newTotalPages - 1)
                    // Clear search filter
                    setSearchFilter('')
                }

                showSuccess('Added more suggestions', `Found ${uniqueNewResults.length} new titles`)
            } else {
                showError('No new suggestions found', 'All returned titles were duplicates')
            }
        } catch (error) {
            console.error('Generate More error:', error)

            const isDev = process.env.NODE_ENV === 'development'
            const errorDetails = error instanceof Error ? error.message : String(error)
            const errorStack = error instanceof Error ? error.stack : undefined

            // In development, show full error details
            if (isDev) {
                showError(
                    'Generate More Failed',
                    `${errorDetails}${errorStack ? `\n\nStack: ${errorStack.split('\n').slice(0, 3).join('\n')}` : ''}`
                )
            } else {
                // Production error handling
                if (error instanceof AuthRequiredError) {
                    showError('Please sign in', 'Smart Search requires a Net Trailers account.')
                } else if (error instanceof TypeError && error.message.includes('fetch')) {
                    showError(
                        'Network error',
                        'Unable to connect to the server. Please check your internet connection.'
                    )
                } else if (error instanceof Error) {
                    const knownErrors = [
                        'AI limit reached',
                        'Authentication required',
                        'AI service unavailable',
                    ]
                    if (!knownErrors.some((known) => error.message.includes(known))) {
                        if (
                            !error.message.includes('Server error') &&
                            !error.message.includes('Invalid request')
                        ) {
                            showError('Failed to get more suggestions', error.message)
                        }
                    }
                } else {
                    showError('Failed to get more suggestions', 'An unexpected error occurred')
                }
            }
        } finally {
            setIsLoadingMore(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && collectionCreatorModal.name.trim()) {
            handleCreate()
        } else if (e.key === 'Escape') {
            handleClose()
        }
    }

    const handlePrevPage = () => {
        setCurrentPage((prev) => Math.max(0, prev - 1))
    }

    const handleNextPage = () => {
        setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
    }

    const handleRemoveContent = (e: React.MouseEvent, contentId: number) => {
        e.stopPropagation()
        removeFromCollectionCreator(contentId)

        // If this was the last item, close the modal
        if (collectionCreatorModal.content.length === 1) {
            handleClose()
            showError('Collection is empty', 'Add some content to create a collection')
            return
        }

        // If we removed the last item on the current page and it's not the first page, go back one page
        if (currentItems.length === 1 && currentPage > 0) {
            setCurrentPage(currentPage - 1)
        }
    }

    const handleMediaTypeToggle = (type: 'movie' | 'tv') => {
        if (type === 'movie') {
            setIsMovieEnabled(!isMovieEnabled)
        } else {
            setIsTVEnabled(!isTVEnabled)
        }
    }

    const handleDisplayOnPageToggle = () => {
        if (!isMovieEnabled && !isTVEnabled) {
            setHighlightMediaType(true)
            showError(
                'Enable a media type first',
                'You must select Movies or TV Shows before displaying this collection on the page'
            )
            setTimeout(() => setHighlightMediaType(false), 2000)
            return
        }
        setDisplayAsRow(!displayAsRow)
    }

    const handleToggleInfinite = () => {
        if (!enableInfiniteContent && selectedGenres.length === 0) {
            showError('Add at least one genre', 'Select genres before enabling infinite content.')
            return
        }
        setEnableInfiniteContent((prev) => !prev)
    }

    const handleFilterVoiceToggle = async () => {
        if (isFilterListening) {
            stopFilterListening()
        } else {
            await startFilterListening()
        }
    }

    if (!collectionCreatorModal.isOpen) return null

    return (
        <div className="fixed inset-0 z-modal-nested flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

            {/* Modal */}
            <div className="relative bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-lg shadow-2xl w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-2 sm:mx-4 max-h-[90vh] overflow-hidden flex flex-col border border-gray-700">
                {/* Close button - top right */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-8 z-10 p-2 rounded-full bg-gray-800/80 text-gray-300 hover:text-white hover:bg-gray-700 transition-all"
                >
                    <XMarkIcon className="w-7 h-7" />
                </button>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col overflow-y-auto modal-scrollbar-blue">
                    <div className="space-y-6 flex flex-col flex-1 min-h-0">
                        {/* Smart Search Style Title */}
                        <div className="relative flex justify-center min-h-[100px] items-center flex-shrink-0">
                            {isEditingTitle ? (
                                <div
                                    ref={titleEditRef}
                                    className="flex items-center gap-4 p-4 rounded-2xl w-full max-w-2xl"
                                    style={{
                                        backgroundColor: `${selectedColor}15`,
                                        border: `2px solid ${selectedColor}50`,
                                    }}
                                >
                                    {/* Emoji picker button */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowIconPicker(!showIconPicker)}
                                            className="text-4xl flex items-center justify-center w-14 h-14 rounded-xl hover:scale-105 transition-transform hover:bg-white/10"
                                        >
                                            {selectedEmoji}
                                        </button>
                                        <IconPickerModal
                                            isOpen={showIconPicker}
                                            selectedIcon={selectedEmoji}
                                            onSelectIcon={(icon) => {
                                                setSelectedEmoji(icon)
                                                setShowIconPicker(false)
                                            }}
                                            onClose={() => setShowIconPicker(false)}
                                        />
                                    </div>

                                    {/* Color picker button */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowColorPicker(!showColorPicker)}
                                            className="w-8 h-8 rounded-lg hover:scale-110 transition-transform border-2 border-white/30"
                                            style={{ backgroundColor: selectedColor }}
                                            title="Change color"
                                        />
                                        <ColorPickerModal
                                            isOpen={showColorPicker}
                                            selectedColor={selectedColor}
                                            onSelectColor={(c) => {
                                                setSelectedColor(c)
                                                setShowColorPicker(false)
                                            }}
                                            onClose={() => setShowColorPicker(false)}
                                        />
                                    </div>

                                    {/* Name input */}
                                    <input
                                        type="text"
                                        value={editedName}
                                        onChange={(e) => setEditedName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveTitleEdit()
                                            if (e.key === 'Escape') {
                                                setEditedName(collectionCreatorModal.name)
                                                setIsEditingTitle(false)
                                            }
                                        }}
                                        autoFocus
                                        className="px-3 py-2 rounded-md flex-1 bg-white/10 text-white text-2xl font-bold border-2 focus:outline-none"
                                        style={{ borderColor: selectedColor }}
                                        placeholder="Collection name"
                                    />

                                    {/* Save button */}
                                    <button
                                        onClick={handleSaveTitleEdit}
                                        className="p-2 rounded-md text-white hover:opacity-80 transition-colors"
                                        style={{ backgroundColor: selectedColor }}
                                    >
                                        <CheckIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            ) : (
                                <div
                                    className="inline-flex items-center justify-center gap-4 p-4 rounded-2xl cursor-pointer transition-all hover:bg-opacity-20"
                                    style={{
                                        backgroundColor: `${selectedColor}10`,
                                        border: `2px solid ${selectedColor}40`,
                                    }}
                                    onClick={() => {
                                        setEditedName(collectionCreatorModal.name)
                                        setIsEditingTitle(true)
                                    }}
                                >
                                    {/* Emoji */}
                                    <span className="text-4xl">{selectedEmoji}</span>
                                    {/* Title */}
                                    <h1 className="text-2xl font-bold text-white">
                                        {collectionCreatorModal.name || 'Untitled Collection'}
                                    </h1>
                                    {/* Pencil icon - always visible */}
                                    <PencilIcon className="h-5 w-5 text-gray-400" />
                                </div>
                            )}
                        </div>

                        {/* Three Column Layout (1/3 each) */}
                        <div className="grid grid-cols-3 gap-5 min-h-[140px] flex-shrink-0">
                            {/* Column 1 - Search bars */}
                            <div className="flex flex-col justify-between h-full gap-3">
                                {/* Add Content Search Bar - Top */}
                                <div>
                                    <InlineSearchBar
                                        onAddContent={handleAddContent}
                                        existingContentIds={collectionCreatorModal.content.map(
                                            (c) => c.id
                                        )}
                                        placeholder="Add Movies or TV Shows"
                                    />
                                </div>

                                {/* Collection Content heading and Filter - Bottom */}
                                <div className="space-y-3 mt-auto">
                                    <h3 className="text-lg font-semibold text-white">
                                        Collection Content ({collectionCreatorModal.content.length}{' '}
                                        titles)
                                    </h3>

                                    {/* Filter input */}
                                    <div className="relative">
                                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Filter titles..."
                                            value={searchFilter}
                                            onChange={(e) => {
                                                setSearchFilter(e.target.value)
                                                setCurrentPage(0)
                                            }}
                                            className="w-full h-12 pl-12 pr-20 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                            {/* Listening Indicator */}
                                            {isFilterListening && (
                                                <span className="text-xs text-blue-400 mr-1 animate-pulse font-medium">
                                                    Listening...
                                                </span>
                                            )}
                                            {/* Voice Input Button */}
                                            {isVoiceSupported && (
                                                <button
                                                    onClick={handleFilterVoiceToggle}
                                                    className={`transition-all duration-200 ${
                                                        isFilterListening
                                                            ? 'text-blue-500'
                                                            : 'text-gray-400 hover:text-white'
                                                    }`}
                                                    title={
                                                        isFilterListening
                                                            ? 'Stop voice input'
                                                            : 'Start voice input'
                                                    }
                                                    aria-label={
                                                        isFilterListening
                                                            ? 'Stop voice input'
                                                            : 'Start voice input'
                                                    }
                                                >
                                                    <div className="relative">
                                                        {/* Animated pulsing rings when listening */}
                                                        {isFilterListening && (
                                                            <>
                                                                <span className="absolute inset-0 rounded-full bg-blue-500/40 animate-ping" />
                                                                <span
                                                                    className="absolute inset-0 rounded-full bg-blue-500/30 animate-pulse"
                                                                    style={{
                                                                        animationDuration: '1s',
                                                                    }}
                                                                />
                                                            </>
                                                        )}
                                                        <MicrophoneIcon
                                                            className={`h-5 w-5 relative z-10 transition-all ${
                                                                isFilterListening
                                                                    ? 'scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]'
                                                                    : ''
                                                            }`}
                                                        />
                                                    </div>
                                                </button>
                                            )}
                                            {/* Clear Button */}
                                            {searchFilter && !isFilterListening && (
                                                <button
                                                    onClick={() => {
                                                        setSearchFilter('')
                                                        setCurrentPage(0)
                                                    }}
                                                    className="text-gray-400 hover:text-white transition-colors"
                                                >
                                                    <XMarkIcon className="h-5 w-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Column 2 - Infinite Content + Genres */}
                            <div className="flex flex-col gap-3 h-full">
                                {/* Infinite Content Toggle */}
                                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                                    <div className="relative flex items-center justify-between">
                                        <label className="text-base font-medium text-white flex items-center gap-2">
                                            <span>♾️</span>
                                            Infinite Content
                                            <button
                                                type="button"
                                                onMouseEnter={() => setShowInfiniteTooltip(true)}
                                                onMouseLeave={() => setShowInfiniteTooltip(false)}
                                                onClick={() =>
                                                    setShowInfiniteTooltip(!showInfiniteTooltip)
                                                }
                                                className="text-gray-400 hover:text-white relative"
                                            >
                                                <QuestionMarkCircleIcon className="w-5 h-5" />
                                                {showInfiniteTooltip && (
                                                    <div className="absolute z-10 top-full left-0 mt-2 p-2 bg-gray-900 border border-gray-700 rounded-md shadow-xl whitespace-normal w-48">
                                                        <p className="text-sm text-gray-300">
                                                            After your curated titles, show more
                                                            similar content based on genres
                                                        </p>
                                                    </div>
                                                )}
                                            </button>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleToggleInfinite}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                enableInfiniteContent ? 'bg-red-600' : 'bg-gray-600'
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    enableInfiniteContent
                                                        ? 'translate-x-6'
                                                        : 'translate-x-1'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                </div>

                                {/* Genres */}
                                <div className="flex-1 bg-gray-800/50 rounded-lg border border-gray-700 p-4 flex items-center">
                                    <div className="flex items-center justify-between gap-3 w-full">
                                        <div className="flex flex-wrap gap-2 flex-1">
                                            {selectedGenres.length === 0 ? (
                                                <span className="px-3 py-1 text-sm font-bold rounded-full bg-red-600 text-white">
                                                    All Genres
                                                </span>
                                            ) : (
                                                selectedGenres.map((genreId, index) => (
                                                    <span
                                                        key={`${genreId}-${index}`}
                                                        className="relative group/genre px-3 py-1 text-sm font-bold rounded-full bg-red-600 text-white cursor-default select-none"
                                                    >
                                                        {GENRE_LOOKUP.get(genreId) || genreId}
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setSelectedGenres((prev) =>
                                                                    prev.filter(
                                                                        (id) => id !== genreId
                                                                    )
                                                                )
                                                            }
                                                            className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center opacity-0 group-hover/genre:opacity-100 transition-opacity hover:bg-gray-200"
                                                            title="Remove genre"
                                                        >
                                                            <XMarkIcon className="w-3 h-3 text-black" />
                                                        </button>
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowGenreModal(true)}
                                            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                                            title="Edit genres"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Column 3 - Display on Page + Media Type */}
                            <div className="flex flex-col gap-3 h-full">
                                {/* Display on Page Toggle */}
                                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <label className="text-base font-medium text-white flex items-center gap-2">
                                            <span>🏠</span>
                                            Display on Page
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleDisplayOnPageToggle}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                displayAsRow ? 'bg-green-600' : 'bg-gray-600'
                                            } ${!hasMediaTypeEnabled ? 'opacity-50 cursor-pointer' : ''}`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    displayAsRow ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                </div>

                                {/* Media Type Selection */}
                                <div
                                    className={`flex-1 bg-gray-800/50 rounded-lg border p-4 transition-all duration-500 flex items-center ${
                                        highlightMediaType
                                            ? 'border-yellow-500 bg-yellow-500/20'
                                            : 'border-gray-700'
                                    }`}
                                >
                                    <div className="flex items-center justify-center gap-6 w-full">
                                        {/* Movies Toggle */}
                                        <div className="flex items-center gap-3">
                                            <label className="text-base text-white flex items-center gap-2">
                                                <FilmIcon className="w-5 h-5" />
                                                Movies
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => handleMediaTypeToggle('movie')}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                    isMovieEnabled ? 'bg-red-600' : 'bg-gray-600'
                                                }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                        isMovieEnabled
                                                            ? 'translate-x-6'
                                                            : 'translate-x-1'
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                        {/* TV Toggle */}
                                        <div className="flex items-center gap-3">
                                            <label className="text-base text-white flex items-center gap-2">
                                                <TvIcon className="w-5 h-5" />
                                                TV
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => handleMediaTypeToggle('tv')}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                    isTVEnabled ? 'bg-red-600' : 'bg-gray-600'
                                                }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                        isTVEnabled
                                                            ? 'translate-x-6'
                                                            : 'translate-x-1'
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Content Cards Container */}
                        <div className="flex-1 min-h-0 overflow-y-auto modal-scrollbar-blue rounded-lg">
                            {/* Content Cards Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 p-1">
                                {currentItems.map((item) => (
                                    <div key={item.id}>
                                        <SimpleContentCard
                                            content={item}
                                            onRemove={(e) => handleRemoveContent(e, item.id)}
                                            isNew={newlyAddedIds.has(item.id)}
                                        />
                                    </div>
                                ))}
                                {/* Filler items to maintain grid height */}
                                {fillerItems.map((_, index) => (
                                    <div
                                        key={`filler-${index}`}
                                        className="opacity-0 pointer-events-none"
                                    >
                                        <div className="w-full aspect-[2/3] bg-transparent"></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4 flex-shrink-0">
                                <button
                                    onClick={handlePrevPage}
                                    disabled={currentPage === 0}
                                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-500 rounded-lg hover:from-red-500 hover:to-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                                >
                                    <ChevronLeftIcon className="w-5 h-5" />
                                    Previous
                                </button>
                                <span className="text-sm text-gray-300 font-medium">
                                    Page {currentPage + 1} of {totalPages}
                                </span>
                                <button
                                    onClick={handleNextPage}
                                    disabled={currentPage === totalPages - 1}
                                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 rounded-lg hover:from-red-400 hover:to-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                                >
                                    Next
                                    <ChevronRightIcon className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer with Action Buttons */}
                <div className="p-6 border-t border-gray-700">
                    <div className="flex justify-between items-center">
                        <button
                            onClick={handleClose}
                            className="px-6 py-3 bg-gray-700 text-white rounded-lg font-semibold transition-all duration-200 hover:bg-gray-600"
                        >
                            Cancel
                        </button>
                        <div className="flex items-center gap-4">
                            {/* Generate More Button */}
                            <button
                                onClick={handleAskForMore}
                                disabled={isLoadingMore}
                                className="flex items-center gap-2 px-4 py-3 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            >
                                <SparklesIcon
                                    className={`h-5 w-5 ${isLoadingMore ? 'animate-pulse' : ''}`}
                                />
                                {isLoadingMore ? 'Generating...' : 'Generate More'}
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!collectionCreatorModal.name.trim() || isCreating}
                                className="flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold transition-all duration-200 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isCreating ? 'Creating...' : 'Create Collection'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Genre Modal */}
            {showGenreModal && (
                <div className="fixed inset-0 z-modal-editor-inner overflow-y-auto">
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-modal-editor bg-black/80 backdrop-blur-sm pointer-events-none" />

                    {/* Modal */}
                    <div
                        className="relative min-h-screen flex items-center justify-center p-4 z-modal-editor-inner"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setShowGenreModal(false)
                            }
                        }}
                    >
                        <div
                            className="relative z-modal-editor-inner bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-lg shadow-2xl max-w-4xl w-full border border-gray-700"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-700">
                                <div>
                                    <h3 className="text-xl font-bold text-white">
                                        Edit Genre Collections
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setShowGenreModal(false)}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
                                {/* Genre Pills */}
                                <div>
                                    <div className="mb-3">
                                        <div className="flex items-baseline justify-between mb-2">
                                            <p className="text-sm font-medium text-gray-300">
                                                Genres{' '}
                                                {selectedGenres.length === 0
                                                    ? '(Any)'
                                                    : `(${selectedGenres.length})`}
                                            </p>
                                            <p className="text-xs text-gray-400">Select up to 3</p>
                                        </div>
                                        <p className="text-xs text-gray-400">
                                            Click order determines priority (1 = most important, 3 =
                                            least important)
                                        </p>
                                    </div>
                                    <GenrePills
                                        selectedGenres={selectedGenres}
                                        onChange={setSelectedGenres}
                                        mediaType={mediaType}
                                        childSafeMode={isChildSafetyEnabled}
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-gray-700">
                                <p className="text-base text-gray-300 mb-4 text-center">
                                    Note: Genres can be used for infinite content generation
                                </p>
                                <div className="flex items-center justify-center">
                                    <button
                                        onClick={() => setShowGenreModal(false)}
                                        className="px-16 py-2.5 bg-blue-600 text-white rounded-lg font-medium transition-all duration-200 hover:bg-blue-700"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

'use client'

import React, { useMemo, useState, useCallback } from 'react'
import {
    SparklesIcon,
    FireIcon,
    StarIcon,
    ArrowsUpDownIcon,
    ChevronUpIcon,
    ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { useSessionStore } from '../../stores/sessionStore'
import { useAuthStore } from '../../stores/authStore'
import { useGuestStore } from '../../stores/guestStore'
import { useToast } from '../../hooks/useToast'
import { SystemRecommendation, SystemRecommendationId } from '../../types/recommendations'

/**
 * Get icon for a system recommendation
 */
function getRecommendationIcon(id: SystemRecommendationId) {
    switch (id) {
        case 'trending':
            return FireIcon
        case 'top-rated':
            return StarIcon
        case 'recommended-for-you':
            return SparklesIcon
        default:
            return SparklesIcon
    }
}

/**
 * Get description for a system recommendation
 */
function getRecommendationDescription(id: SystemRecommendationId): string {
    switch (id) {
        case 'trending':
            return 'Popular content trending this week on TMDB'
        case 'top-rated':
            return 'Highest rated content on TMDB'
        case 'recommended-for-you':
            return 'Personalized suggestions based on your interactions'
        default:
            return 'System recommendation row'
    }
}

/**
 * Recommendations Settings Section
 *
 * Allows users to enable/disable and reorder system recommendation rows
 * (Trending, Top Rated, Recommended For You)
 */
const RecommendationsSection: React.FC = () => {
    const { showSuccess } = useToast()
    const sessionType = useSessionStore((state) => state.sessionType)

    // Get system recommendations from appropriate store
    const authSystemRecommendations = useAuthStore((state) => state.systemRecommendations)
    const guestSystemRecommendations = useGuestStore((state) => state.systemRecommendations)
    const systemRecommendations =
        sessionType === 'authenticated' ? authSystemRecommendations : guestSystemRecommendations

    // Get update functions
    const authUpdateRecommendation = useAuthStore((state) => state.updateSystemRecommendation)
    const guestUpdateRecommendation = useGuestStore((state) => state.updateSystemRecommendation)
    const updateRecommendation =
        sessionType === 'authenticated' ? authUpdateRecommendation : guestUpdateRecommendation

    const authReorderRecommendations = useAuthStore((state) => state.reorderSystemRecommendations)
    const guestReorderRecommendations = useGuestStore((state) => state.reorderSystemRecommendations)
    const reorderRecommendations =
        sessionType === 'authenticated' ? authReorderRecommendations : guestReorderRecommendations

    // Sort recommendations by order
    const sortedRecommendations = useMemo(() => {
        return [...systemRecommendations].sort((a, b) => a.order - b.order)
    }, [systemRecommendations])

    // Track which item is being dragged (for visual feedback)
    const [draggingId, setDraggingId] = useState<string | null>(null)

    // Handle toggle enable/disable
    const handleToggle = useCallback(
        async (id: SystemRecommendationId, currentEnabled: boolean) => {
            await updateRecommendation(id, { enabled: !currentEnabled })
            const rec = systemRecommendations.find((r) => r.id === id)
            const name = rec?.name || id
            showSuccess(`${name} ${!currentEnabled ? 'enabled' : 'disabled'}`)
        },
        [updateRecommendation, systemRecommendations, showSuccess]
    )

    // Handle move up
    const handleMoveUp = useCallback(
        async (index: number) => {
            if (index === 0) return
            const newOrder = sortedRecommendations.map((r) => r.id)
            ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
            await reorderRecommendations(newOrder)
            showSuccess('Order updated')
        },
        [sortedRecommendations, reorderRecommendations, showSuccess]
    )

    // Handle move down
    const handleMoveDown = useCallback(
        async (index: number) => {
            if (index === sortedRecommendations.length - 1) return
            const newOrder = sortedRecommendations.map((r) => r.id)
            ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
            await reorderRecommendations(newOrder)
            showSuccess('Order updated')
        },
        [sortedRecommendations, reorderRecommendations, showSuccess]
    )

    // Drag and drop handlers
    const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
        setDraggingId(id)
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', id)
    }, [])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }, [])

    const handleDrop = useCallback(
        async (e: React.DragEvent, targetIndex: number) => {
            e.preventDefault()
            const draggedId = e.dataTransfer.getData('text/plain')
            const draggedIndex = sortedRecommendations.findIndex((r) => r.id === draggedId)

            if (draggedIndex === -1 || draggedIndex === targetIndex) {
                setDraggingId(null)
                return
            }

            const newOrder = sortedRecommendations.map((r) => r.id)
            const [removed] = newOrder.splice(draggedIndex, 1)
            newOrder.splice(targetIndex, 0, removed)

            await reorderRecommendations(newOrder)
            setDraggingId(null)
            showSuccess('Order updated')
        },
        [sortedRecommendations, reorderRecommendations, showSuccess]
    )

    const handleDragEnd = useCallback(() => {
        setDraggingId(null)
    }, [])

    return (
        <div className="p-6">
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">System Recommendations</h2>
                <p className="text-[#b3b3b3] text-sm">
                    Manage the recommendation rows that appear on your homepage. These rows show
                    content from TMDB based on different criteria.
                </p>
            </div>

            {/* Recommendations List */}
            <div className="space-y-3">
                {sortedRecommendations.map((rec, index) => {
                    const Icon = getRecommendationIcon(rec.id)
                    const description = getRecommendationDescription(rec.id)
                    const isDragging = draggingId === rec.id

                    return (
                        <div
                            key={rec.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, rec.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`
                                flex items-center gap-4 p-4 rounded-lg border transition-all
                                ${isDragging ? 'opacity-50 border-red-500 bg-[#1a1a1a]' : 'border-[#313131] bg-[#0a0a0a] hover:bg-[#1a1a1a]'}
                                ${rec.enabled ? '' : 'opacity-60'}
                                cursor-grab active:cursor-grabbing
                            `}
                        >
                            {/* Drag Handle */}
                            <div className="flex-shrink-0 text-[#666] hover:text-[#999] cursor-grab">
                                <ArrowsUpDownIcon className="w-5 h-5" />
                            </div>

                            {/* Icon */}
                            <div
                                className={`flex-shrink-0 p-2 rounded-lg ${rec.enabled ? 'bg-red-600/20 text-red-500' : 'bg-[#313131] text-[#666]'}`}
                            >
                                <Icon className="w-5 h-5" />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3
                                        className={`font-medium ${rec.enabled ? 'text-white' : 'text-[#999]'}`}
                                    >
                                        {rec.emoji && <span className="mr-1">{rec.emoji}</span>}
                                        {rec.name}
                                    </h3>
                                    <span className="text-xs px-2 py-0.5 rounded bg-[#313131] text-[#999]">
                                        #{index + 1}
                                    </span>
                                </div>
                                <p className="text-sm text-[#666] mt-0.5">{description}</p>
                            </div>

                            {/* Reorder Buttons */}
                            <div className="flex flex-col gap-1">
                                <button
                                    onClick={() => handleMoveUp(index)}
                                    disabled={index === 0}
                                    className={`p-1 rounded ${index === 0 ? 'text-[#444] cursor-not-allowed' : 'text-[#999] hover:text-white hover:bg-[#313131]'}`}
                                    title="Move up"
                                >
                                    <ChevronUpIcon className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleMoveDown(index)}
                                    disabled={index === sortedRecommendations.length - 1}
                                    className={`p-1 rounded ${index === sortedRecommendations.length - 1 ? 'text-[#444] cursor-not-allowed' : 'text-[#999] hover:text-white hover:bg-[#313131]'}`}
                                    title="Move down"
                                >
                                    <ChevronDownIcon className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Toggle Switch */}
                            <button
                                onClick={() => handleToggle(rec.id, rec.enabled)}
                                className={`
                                    relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
                                    transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#0a0a0a]
                                    ${rec.enabled ? 'bg-red-600' : 'bg-[#313131]'}
                                `}
                                role="switch"
                                aria-checked={rec.enabled}
                            >
                                <span
                                    className={`
                                        pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                                        transition duration-200 ease-in-out
                                        ${rec.enabled ? 'translate-x-5' : 'translate-x-0'}
                                    `}
                                />
                            </button>
                        </div>
                    )
                })}
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 rounded-lg bg-[#1a1a1a] border border-[#313131]">
                <h4 className="text-sm font-medium text-white mb-2">About Recommendation Rows</h4>
                <ul className="text-sm text-[#999] space-y-1">
                    <li>
                        <strong>Trending:</strong> Shows popular content from the past week
                    </li>
                    <li>
                        <strong>Top Rated:</strong> Shows highest-rated content of all time
                    </li>
                    <li>
                        <strong>Recommended For You:</strong> Personalized based on your watchlist
                        and interactions
                    </li>
                </ul>
                <p className="text-xs text-[#666] mt-3">
                    Tip: Drag rows to reorder them, or use the arrow buttons for precise control.
                </p>
            </div>
        </div>
    )
}

export default RecommendationsSection

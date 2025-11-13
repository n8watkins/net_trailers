/**
 * CreatePollModal Component
 *
 * Modal for creating new polls
 * Note: Polls cannot be edited after creation
 */

'use client'

import { useState } from 'react'
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { FORUM_CATEGORIES } from '@/utils/forumCategories'
import { ForumCategory } from '@/types/forum'

interface CreatePollModalProps {
    isOpen: boolean
    onClose: () => void
    onCreate: (
        question: string,
        options: string[],
        category: ForumCategory,
        description?: string,
        isMultipleChoice?: boolean,
        expiresInDays?: number
    ) => void
}

export function CreatePollModal({ isOpen, onClose, onCreate }: CreatePollModalProps) {
    const [question, setQuestion] = useState('')
    const [description, setDescription] = useState('')
    const [category, setCategory] = useState<ForumCategory>('general')
    const [options, setOptions] = useState(['', ''])
    const [isMultipleChoice, setIsMultipleChoice] = useState(false)
    const [hasExpiration, setHasExpiration] = useState(false)
    const [expirationDays, setExpirationDays] = useState(7)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const addOption = () => {
        if (options.length < 10) {
            setOptions([...options, ''])
        }
    }

    const removeOption = (index: number) => {
        if (options.length > 2) {
            setOptions(options.filter((_, i) => i !== index))
        }
    }

    const updateOption = (index: number, value: string) => {
        const newOptions = [...options]
        newOptions[index] = value
        setOptions(newOptions)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const validOptions = options.filter((opt) => opt.trim().length > 0)
        if (!question.trim() || validOptions.length < 2) return

        setIsSubmitting(true)
        try {
            await onCreate(
                question,
                validOptions,
                category,
                description || undefined,
                isMultipleChoice,
                hasExpiration ? expirationDays : undefined
            )
            handleClose()
        } catch (error) {
            console.error('Failed to create poll:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        setQuestion('')
        setDescription('')
        setCategory('general')
        setOptions(['', ''])
        setIsMultipleChoice(false)
        setHasExpiration(false)
        setExpirationDays(7)
        onClose()
    }

    if (!isOpen) return null

    const validOptions = options.filter((opt) => opt.trim().length > 0)
    const canSubmit = question.trim() && validOptions.length >= 2

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="relative bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Create New Poll</h2>
                        <p className="text-sm text-gray-400 mt-1">
                            Note: Polls cannot be edited after creation
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <XMarkIcon className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                {/* Form */}
                <form
                    onSubmit={handleSubmit}
                    className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]"
                >
                    {/* Question */}
                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                            Poll Question *
                        </label>
                        <input
                            type="text"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="What do you want to ask?"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                            maxLength={200}
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                            Description (optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add context or details about your poll..."
                            rows={2}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                            maxLength={500}
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                            Category *
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {FORUM_CATEGORIES.filter((cat) => cat.id !== 'announcements').map(
                                (cat) => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setCategory(cat.id)}
                                        className={`p-3 rounded-lg border-2 transition-all ${
                                            category === cat.id
                                                ? 'border-pink-500 bg-pink-500/10'
                                                : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50'
                                        }`}
                                    >
                                        <div className="text-2xl mb-1">{cat.icon}</div>
                                        <div
                                            className={`text-sm font-semibold ${category === cat.id ? cat.color : 'text-gray-400'}`}
                                        >
                                            {cat.name}
                                        </div>
                                    </button>
                                )
                            )}
                        </div>
                    </div>

                    {/* Options */}
                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                            Poll Options * (min 2, max 10)
                        </label>
                        <div className="space-y-2">
                            {options.map((option, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={option}
                                        onChange={(e) => updateOption(index, e.target.value)}
                                        placeholder={`Option ${index + 1}`}
                                        className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                        maxLength={100}
                                    />
                                    {options.length > 2 && (
                                        <button
                                            type="button"
                                            onClick={() => removeOption(index)}
                                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {options.length < 10 && (
                                <button
                                    type="button"
                                    onClick={addOption}
                                    className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-gray-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    Add Option
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Settings */}
                    <div className="space-y-3">
                        <label className="block text-sm font-semibold text-white">Settings</label>

                        {/* Multiple choice */}
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isMultipleChoice}
                                onChange={(e) => setIsMultipleChoice(e.target.checked)}
                                className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-pink-500 focus:ring-2 focus:ring-pink-500"
                            />
                            <div>
                                <div className="text-white">Allow multiple selections</div>
                                <div className="text-xs text-gray-400">
                                    Users can vote for more than one option
                                </div>
                            </div>
                        </label>

                        {/* Expiration */}
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={hasExpiration}
                                onChange={(e) => setHasExpiration(e.target.checked)}
                                className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-pink-500 focus:ring-2 focus:ring-pink-500"
                            />
                            <div className="flex-1">
                                <div className="text-white">Set expiration date</div>
                                {hasExpiration && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-sm text-gray-400">Expires in:</span>
                                        <input
                                            type="number"
                                            value={expirationDays}
                                            onChange={(e) =>
                                                setExpirationDays(
                                                    Math.max(1, parseInt(e.target.value) || 1)
                                                )
                                            }
                                            min="1"
                                            max="365"
                                            className="w-20 px-3 py-1 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        />
                                        <span className="text-sm text-gray-400">days</span>
                                    </div>
                                )}
                            </div>
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !canSubmit}
                            className="flex-1 px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Poll'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

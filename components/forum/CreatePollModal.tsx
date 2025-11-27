/**
 * CreatePollModal Component
 *
 * Modal for creating new polls
 * Polls can be edited within 5 minutes of creation (resets votes)
 */

'use client'

import { useState } from 'react'
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { FORUM_CATEGORIES } from '@/utils/forumCategories'
import { ForumCategory } from '@/types/forum'

interface CreatePollModalProps {
    isOpen: boolean
    onClose: () => void
    onCreate: (question: string, options: string[], category: ForumCategory) => void
}

export function CreatePollModal({ isOpen, onClose, onCreate }: CreatePollModalProps) {
    const [question, setQuestion] = useState('')
    const [category, setCategory] = useState<ForumCategory>('general')
    const [options, setOptions] = useState(['', ''])
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
            await onCreate(question, validOptions, category)
            handleClose()
        } catch (error) {
            console.error('Failed to create poll:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        setQuestion('')
        setCategory('general')
        setOptions(['', ''])
        onClose()
    }

    if (!isOpen) return null

    const validOptions = options.filter((opt) => opt.trim().length > 0)
    const canSubmit = question.trim() && validOptions.length >= 2

    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="relative bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                    <h2 className="text-2xl font-bold text-white">Create New Poll</h2>
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

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                            Category
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {FORUM_CATEGORIES.filter((cat) => cat.id !== 'announcements').map(
                                (cat) => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setCategory(cat.id)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                                            category === cat.id
                                                ? 'bg-pink-500 text-white'
                                                : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700 hover:text-white'
                                        }`}
                                    >
                                        <span>{cat.icon}</span>
                                        <span>{cat.name}</span>
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

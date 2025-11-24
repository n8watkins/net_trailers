/**
 * CreateThreadModal Component
 *
 * Modal for creating new discussion threads
 * Clean, professional design with form validation
 */

'use client'

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { FORUM_CATEGORIES } from '@/utils/forumCategories'
import { ForumCategory } from '@/types/forum'
import ImageUpload from './ImageUpload'

interface CreateThreadModalProps {
    isOpen: boolean
    onClose: () => void
    onCreate: (
        title: string,
        content: string,
        category: ForumCategory,
        tags: string[],
        images?: string[]
    ) => void
}

export function CreateThreadModal({ isOpen, onClose, onCreate }: CreateThreadModalProps) {
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [category, setCategory] = useState<ForumCategory>('general')
    const [tagsInput, setTagsInput] = useState('')
    const [imageUrls, setImageUrls] = useState<string[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim() || !content.trim()) return

        setIsSubmitting(true)
        try {
            const tags = tagsInput
                .split(',')
                .map((tag) => tag.trim())
                .filter((tag) => tag.length > 0)
            await onCreate(title, content, category, tags, imageUrls)
            handleClose()
        } catch (error) {
            console.error('Failed to create thread:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        setTitle('')
        setContent('')
        setCategory('general')
        setTagsInput('')
        setImageUrls([])
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="relative bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                    <h2 className="text-2xl font-bold text-white">Create New Thread</h2>
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
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                            Title *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="What's on your mind?"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            maxLength={200}
                            required
                        />
                        <div className="mt-1 text-xs text-gray-500 text-right">
                            {title.length}/200
                        </div>
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
                                                ? 'border-blue-500 bg-blue-500/10'
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

                    {/* Content */}
                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                            Content *
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Share your thoughts, ask questions, or start a discussion..."
                            rows={8}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            maxLength={5000}
                            required
                        />
                        <div className="mt-1 text-xs text-gray-500 text-right">
                            {content.length}/5000
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                            Tags (optional)
                        </label>
                        <input
                            type="text"
                            value={tagsInput}
                            onChange={(e) => setTagsInput(e.target.value)}
                            placeholder="e.g. sci-fi, thriller, discussion (comma separated)"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="mt-1 text-xs text-gray-400">
                            Separate tags with commas. Max 5 tags.
                        </div>
                    </div>

                    {/* Images */}
                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                            Images (optional)
                        </label>
                        <ImageUpload
                            maxImages={4}
                            onImagesChange={setImageUrls}
                            storagePath="forum/threads"
                            disabled={isSubmitting}
                        />
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
                            disabled={isSubmitting || !title.trim() || !content.trim()}
                            className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Thread'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

'use client'

import React from 'react'
import { ClockIcon, BellIcon } from '@heroicons/react/24/outline'

interface AutoUpdateSettingsProps {
    autoUpdateEnabled: boolean
    updateFrequency: 'daily' | 'weekly' | 'never'
    onChange: (settings: {
        autoUpdateEnabled?: boolean
        updateFrequency?: 'daily' | 'weekly' | 'never'
    }) => void
}

/**
 * AutoUpdateSettings Component
 *
 * UI controls for enabling auto-updates on collections.
 * Allows users to:
 * - Toggle auto-update on/off
 * - Select update frequency (daily, weekly, never)
 */
export function AutoUpdateSettings({
    autoUpdateEnabled,
    updateFrequency,
    onChange,
}: AutoUpdateSettingsProps) {
    return (
        <div className="border border-gray-700 rounded-lg overflow-hidden bg-[#1a1a1a]">
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start gap-3">
                    <BellIcon className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white">Auto-Update Settings</h3>
                        <p className="text-gray-400 text-sm mt-1">
                            Automatically check TMDB for new content matching your collection
                            criteria
                        </p>
                    </div>
                </div>

                {/* Enable Auto-Update Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                    <div className="flex-1">
                        <label
                            htmlFor="auto-update-toggle"
                            className="text-white font-medium block mb-1"
                        >
                            Enable Auto-Updates
                        </label>
                        <p className="text-gray-400 text-sm">
                            Get notified when new content is discovered
                        </p>
                    </div>
                    <button
                        id="auto-update-toggle"
                        type="button"
                        onClick={() => onChange({ autoUpdateEnabled: !autoUpdateEnabled })}
                        className={`
                            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                            ${autoUpdateEnabled ? 'bg-blue-600' : 'bg-gray-600'}
                        `}
                    >
                        <span className="sr-only">Enable auto-updates</span>
                        <span
                            className={`
                                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                ${autoUpdateEnabled ? 'translate-x-6' : 'translate-x-1'}
                            `}
                        />
                    </button>
                </div>

                {/* Update Frequency */}
                {autoUpdateEnabled && (
                    <div className="space-y-3 transition-all duration-300">
                        <div className="flex items-center gap-2 text-white font-medium">
                            <ClockIcon className="w-5 h-5 text-blue-400" />
                            <label htmlFor="update-frequency">Update Frequency</label>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => onChange({ updateFrequency: 'daily' })}
                                className={`
                                    px-4 py-3 rounded-lg font-medium transition-all
                                    ${
                                        updateFrequency === 'daily'
                                            ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }
                                `}
                            >
                                Daily
                            </button>
                            <button
                                type="button"
                                onClick={() => onChange({ updateFrequency: 'weekly' })}
                                className={`
                                    px-4 py-3 rounded-lg font-medium transition-all
                                    ${
                                        updateFrequency === 'weekly'
                                            ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }
                                `}
                            >
                                Weekly
                            </button>
                            <button
                                type="button"
                                onClick={() => onChange({ updateFrequency: 'never' })}
                                className={`
                                    px-4 py-3 rounded-lg font-medium transition-all
                                    ${
                                        updateFrequency === 'never'
                                            ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }
                                `}
                            >
                                Never
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">
                            We'll check TMDB{' '}
                            {updateFrequency === 'daily'
                                ? 'every day'
                                : updateFrequency === 'weekly'
                                  ? 'every week'
                                  : 'only manually'}{' '}
                            for new matches
                        </p>
                    </div>
                )}

                {/* Info Box */}
                <div className="p-4 bg-blue-600/10 border border-blue-500/30 rounded-lg">
                    <p className="text-blue-200 text-sm">
                        <strong>How it works:</strong> Our system will periodically check TMDB for
                        new content that matches your collection's genre, year, rating, and other
                        criteria. When new items are found, they'll be added to your collection and
                        you'll receive a notification.
                    </p>
                </div>
            </div>
        </div>
    )
}

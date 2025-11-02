'use client'

import React from 'react'
import { UpgradeAccountBanner } from '../auth/UpgradeAccountBanner'

// Memoized Preferences Controls Component - Only re-renders when props actually change
interface PreferencesControlsProps {
    childSafetyMode: boolean
    autoMute: boolean
    defaultVolume: number
    preferencesChanged: boolean
    isGuest: boolean
    onChildSafetyModeChange: (checked: boolean) => void
    onAutoMuteChange: (checked: boolean) => void
    onDefaultVolumeChange: (volume: number) => void
    onSave: () => void
    onShowChildSafetyModal: () => void
    onMarkInteracted: () => void
    onClearInteracted: () => void
    userInteractedRef: React.RefObject<boolean>
}

const PreferencesControls = React.memo<PreferencesControlsProps>(
    ({
        childSafetyMode,
        autoMute,
        defaultVolume,
        preferencesChanged,
        isGuest,
        onChildSafetyModeChange,
        onAutoMuteChange,
        onDefaultVolumeChange,
        onSave,
        onShowChildSafetyModal,
        onMarkInteracted,
        onClearInteracted,
        userInteractedRef,
    }) => {
        return (
            <div className="space-y-8">
                {/* Content & Privacy Section */}
                <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                        Content & Privacy
                    </h3>
                    <div className="space-y-6 bg-[#0a0a0a] rounded-lg border border-[#313131] p-6">
                        {/* Child Safety Mode Toggle */}
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-[#e5e5e5] mb-1">
                                    Child Safety Mode
                                </label>
                                <p className="text-sm text-[#b3b3b3] mb-2">
                                    Shows only family-friendly content from curated genres
                                </p>
                                <p className="text-xs text-[#999]">
                                    Movies: Animation, Family • TV: Kids, Family, Comedy, Sci-Fi &
                                    Fantasy, Action & Adventure • Hides Crime, Drama, Horror
                                </p>
                            </div>
                            <label
                                className="relative inline-flex items-center cursor-pointer ml-4"
                                onPointerDown={onMarkInteracted}
                                onPointerUp={onClearInteracted}
                                onKeyDown={(e) => {
                                    // Only mark interaction for Space/Enter keys
                                    if (e.key === ' ' || e.key === 'Enter') {
                                        onMarkInteracted()
                                    }
                                }}
                                onKeyUp={onClearInteracted}
                            >
                                <input
                                    type="checkbox"
                                    checked={childSafetyMode}
                                    onChange={(e) => {
                                        // Only react to guest modal when it's truly user-triggered
                                        if (isGuest && userInteractedRef.current) {
                                            onShowChildSafetyModal()
                                            // Do NOT flip the setting for guests
                                            return
                                        }
                                        onChildSafetyModeChange(e.target.checked)
                                    }}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Playback Settings Section */}
                <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                        Playback Settings
                    </h3>
                    <div className="space-y-6 bg-[#0a0a0a] rounded-lg border border-[#313131] p-6">
                        {/* Auto-mute Toggle */}
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-[#e5e5e5] mb-1">
                                    Auto-mute Trailers
                                </label>
                                <p className="text-sm text-[#b3b3b3]">
                                    Start trailers muted when opening details
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer ml-4">
                                <input
                                    type="checkbox"
                                    checked={autoMute}
                                    onChange={(e) => onAutoMuteChange(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                            </label>
                        </div>

                        {/* Default Volume Slider */}
                        <div className="pt-4 border-t border-[#313131]">
                            <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                                Default Volume
                            </label>
                            <p className="text-sm text-[#b3b3b3] mb-3">
                                Set the initial volume level for trailers
                            </p>
                            <div className="flex items-center space-x-4">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    value={defaultVolume}
                                    onChange={(e) =>
                                        onDefaultVolumeChange(parseInt(e.target.value))
                                    }
                                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-red-600 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                                />
                                <span className="text-sm text-[#e5e5e5] min-w-[3rem] text-right">
                                    {defaultVolume}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                    <button
                        onClick={onSave}
                        disabled={!preferencesChanged}
                        className={`px-6 py-2.5 rounded-md font-medium transition-all duration-200 focus:outline-none ${
                            preferencesChanged
                                ? 'bg-red-600 text-white hover:bg-red-700 cursor-pointer'
                                : 'bg-[#1a1a1a] text-[#666666] cursor-not-allowed border border-[#313131]'
                        }`}
                    >
                        Save Preferences
                    </button>
                </div>
            </div>
        )
    }
)

PreferencesControls.displayName = 'PreferencesControls'

interface PreferencesSectionProps {
    isGuest: boolean
    isInitializing: boolean
    childSafetyMode: boolean
    autoMute: boolean
    defaultVolume: number
    preferencesChanged: boolean
    onChildSafetyModeChange: (checked: boolean) => void
    onAutoMuteChange: (checked: boolean) => void
    onDefaultVolumeChange: (volume: number) => void
    onSave: () => void
    onShowChildSafetyModal: () => void
    onMarkInteracted: () => void
    onClearInteracted: () => void
    userInteractedRef: React.RefObject<boolean>
}

const PreferencesSection: React.FC<PreferencesSectionProps> = ({
    isGuest,
    isInitializing,
    childSafetyMode,
    autoMute,
    defaultVolume,
    preferencesChanged,
    onChildSafetyModeChange,
    onAutoMuteChange,
    onDefaultVolumeChange,
    onSave,
    onShowChildSafetyModal,
    onMarkInteracted,
    onClearInteracted,
    userInteractedRef,
}) => {
    return (
        <div className="p-8">
            {/* Upgrade Banner for Guests */}
            {isGuest && <UpgradeAccountBanner />}

            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Preferences</h2>
                <p className="text-[#b3b3b3]">
                    Customize your content filtering and playback experience
                </p>
            </div>

            {/* Only render preferences controls after data is loaded */}
            {isInitializing ? (
                <div className="space-y-8 animate-pulse">
                    <div>
                        <div className="h-6 bg-[#313131] rounded w-48 mb-4"></div>
                        <div className="bg-[#0a0a0a] rounded-lg border border-[#313131] p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="h-4 bg-[#313131] rounded w-40 mb-2"></div>
                                    <div className="h-3 bg-[#313131] rounded w-64"></div>
                                </div>
                                <div className="w-11 h-6 bg-[#313131] rounded-full ml-4"></div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <PreferencesControls
                    childSafetyMode={childSafetyMode}
                    autoMute={autoMute}
                    defaultVolume={defaultVolume}
                    preferencesChanged={preferencesChanged}
                    isGuest={isGuest}
                    onChildSafetyModeChange={onChildSafetyModeChange}
                    onAutoMuteChange={onAutoMuteChange}
                    onDefaultVolumeChange={onDefaultVolumeChange}
                    onSave={onSave}
                    onShowChildSafetyModal={onShowChildSafetyModal}
                    onMarkInteracted={onMarkInteracted}
                    onClearInteracted={onClearInteracted}
                    userInteractedRef={userInteractedRef}
                />
            )}
        </div>
    )
}

export default PreferencesSection

'use client'

import React from 'react'
import { LockClosedIcon, LockOpenIcon, KeyIcon } from '@heroicons/react/24/outline'
import { UpgradeAccountBanner } from '../auth/UpgradeAccountBanner'

// Memoized Preferences Controls Component - Only re-renders when props actually change
interface PreferencesControlsProps {
    childSafetyMode: boolean
    autoMute: boolean
    defaultVolume: number
    preferencesChanged: boolean
    isGuest: boolean
    hasPIN: boolean
    pinEnabled: boolean
    onChildSafetyModeChange: (checked: boolean) => void
    onAutoMuteChange: (checked: boolean) => void
    onDefaultVolumeChange: (volume: number) => void
    onSave: () => void
    onShowChildSafetyModal: () => void
    onSetupPIN: () => void
    onChangePIN: () => void
    onRemovePIN: () => void
}

const PreferencesControls = React.memo<PreferencesControlsProps>(
    ({
        childSafetyMode,
        autoMute,
        defaultVolume,
        preferencesChanged,
        isGuest,
        hasPIN,
        pinEnabled,
        onChildSafetyModeChange,
        onAutoMuteChange,
        onDefaultVolumeChange,
        onSave,
        onShowChildSafetyModal,
        onSetupPIN,
        onChangePIN,
        onRemovePIN,
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
                                <div className="flex items-center gap-2 mb-1">
                                    <label className="block text-sm font-medium text-[#e5e5e5]">
                                        Child Safety Mode
                                    </label>
                                    {hasPIN && pinEnabled && (
                                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600/20">
                                            <LockClosedIcon className="h-3 w-3 text-red-500" />
                                            <span className="text-xs text-red-500 font-medium">
                                                PIN Protected
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-sm text-[#b3b3b3] mb-2">
                                    Shows only family-friendly content from curated genres
                                </p>
                                <p className="text-xs text-[#999]">
                                    Movies: Animation, Family • TV: Kids, Family, Comedy, Sci-Fi &
                                    Fantasy, Action & Adventure • Hides Crime, Drama, Horror
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer ml-4">
                                <input
                                    type="checkbox"
                                    checked={childSafetyMode}
                                    onChange={(e) => onChildSafetyModeChange(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                            </label>
                        </div>

                        {/* PIN Protection Settings - Only show for authenticated users with Child Safety ON */}
                        {!isGuest && childSafetyMode && (
                            <div className="pt-6 border-t border-[#313131]">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h4 className="text-sm font-medium text-[#e5e5e5] mb-1 flex items-center gap-2">
                                            <KeyIcon className="h-4 w-4 text-blue-500" />
                                            PIN Protection
                                        </h4>
                                        <p className="text-xs text-[#b3b3b3]">
                                            {hasPIN
                                                ? 'Prevent unauthorized changes to Child Safety Mode with a PIN'
                                                : 'Set up a PIN to prevent children from disabling Child Safety Mode'}
                                        </p>
                                    </div>
                                </div>

                                {/* PIN Status & Actions */}
                                <div className="flex items-center gap-3">
                                    {!hasPIN ? (
                                        <button
                                            onClick={onSetupPIN}
                                            className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
                                        >
                                            <LockClosedIcon className="h-4 w-4" />
                                            Set Up PIN Protection
                                        </button>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#141414] border border-[#313131]">
                                                {pinEnabled ? (
                                                    <LockClosedIcon className="h-4 w-4 text-green-500" />
                                                ) : (
                                                    <LockOpenIcon className="h-4 w-4 text-gray-500" />
                                                )}
                                                <span className="text-sm text-[#e5e5e5]">
                                                    {pinEnabled ? 'PIN Active' : 'PIN Inactive'}
                                                </span>
                                            </div>
                                            <button
                                                onClick={onChangePIN}
                                                className="px-4 py-2 rounded-md bg-[#141414] border border-[#454545] text-white text-sm font-medium hover:bg-[#1a1a1a] transition"
                                            >
                                                Change PIN
                                            </button>
                                            <button
                                                onClick={onRemovePIN}
                                                className="px-4 py-2 rounded-md bg-[#141414] border border-[#454545] text-red-500 text-sm font-medium hover:bg-[#1a1a1a] transition"
                                            >
                                                Remove PIN
                                            </button>
                                        </>
                                    )}
                                </div>

                                {/* PIN Info */}
                                {!hasPIN && (
                                    <div className="mt-4 rounded-md bg-blue-600/10 px-4 py-3">
                                        <p className="text-xs text-blue-400">
                                            <strong>💡 Recommended:</strong> Set up PIN protection
                                            to prevent children from disabling Child Safety Mode.
                                            You'll need to enter your PIN to turn off content
                                            filtering.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
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
    hasPIN: boolean
    pinEnabled: boolean
    onChildSafetyModeChange: (checked: boolean) => void
    onAutoMuteChange: (checked: boolean) => void
    onDefaultVolumeChange: (volume: number) => void
    onSave: () => void
    onShowChildSafetyModal: () => void
    onSetupPIN: () => void
    onChangePIN: () => void
    onRemovePIN: () => void
}

const PreferencesSection: React.FC<PreferencesSectionProps> = ({
    isGuest,
    isInitializing,
    childSafetyMode,
    autoMute,
    defaultVolume,
    preferencesChanged,
    hasPIN,
    pinEnabled,
    onChildSafetyModeChange,
    onAutoMuteChange,
    onDefaultVolumeChange,
    onSave,
    onShowChildSafetyModal,
    onSetupPIN,
    onChangePIN,
    onRemovePIN,
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
                    hasPIN={hasPIN}
                    pinEnabled={pinEnabled}
                    onChildSafetyModeChange={onChildSafetyModeChange}
                    onAutoMuteChange={onAutoMuteChange}
                    onDefaultVolumeChange={onDefaultVolumeChange}
                    onSave={onSave}
                    onShowChildSafetyModal={onShowChildSafetyModal}
                    onSetupPIN={onSetupPIN}
                    onChangePIN={onChangePIN}
                    onRemovePIN={onRemovePIN}
                />
            )}
        </div>
    )
}

export default PreferencesSection

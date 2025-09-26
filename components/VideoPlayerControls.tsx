import React from 'react'
import {
    SpeakerWaveIcon,
    SpeakerXMarkIcon,
    ArrowsPointingOutIcon,
    ArrowsPointingInIcon,
    ArrowTopRightOnSquareIcon,
    EyeIcon,
    EyeSlashIcon,
} from '@heroicons/react/24/solid'
import ToolTipMod from './ToolTipMod'

interface VideoPlayerControlsProps {
    trailer: string
    muted: boolean
    fullScreen: boolean
    isHidden?: boolean
    onMuteToggle: () => void
    onFullscreenClick: () => void
    onVisibilityToggle?: () => void
    currentMovieTitle?: string
}

export default function VideoPlayerControls({
    trailer,
    muted,
    fullScreen,
    isHidden = false,
    onMuteToggle,
    onFullscreenClick,
    onVisibilityToggle,
    currentMovieTitle = '',
}: VideoPlayerControlsProps) {
    if (!trailer) return null

    return (
        <div className="absolute bottom-4 left-4 right-4 z-30">
            <div className="flex justify-between items-center">
                {/* Left side buttons */}
                <div className="flex gap-2 sm:gap-4 items-center">
                    {/* Show/Hide Content Button */}
                    {onVisibilityToggle && (
                        <ToolTipMod title={isHidden ? 'Show Content' : 'Hide Content'}>
                            <button
                                className="p-2 sm:p-3 rounded-full border-2 border-white/30 bg-black/20 hover:bg-black/50 hover:border-white text-white"
                                onClick={onVisibilityToggle}
                            >
                                {isHidden ? (
                                    <EyeSlashIcon className="h-4 w-4 sm:h-6 sm:w-6 text-red-500" />
                                ) : (
                                    <EyeIcon className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                                )}
                            </button>
                        </ToolTipMod>
                    )}

                    {/* Volume/Mute Button */}
                    <ToolTipMod title={muted ? 'Unmute' : 'Mute'}>
                        <button
                            className="p-2 sm:p-3 rounded-full border-2 border-white/30 bg-black/20 hover:bg-black/50 hover:border-white text-white"
                            onClick={onMuteToggle}
                        >
                            {muted ? (
                                <SpeakerXMarkIcon className="h-4 w-4 sm:h-6 sm:w-6" />
                            ) : (
                                <SpeakerWaveIcon className="h-4 w-4 sm:h-6 sm:w-6" />
                            )}
                        </button>
                    </ToolTipMod>
                </div>

                {/* Right side buttons */}
                <div className="flex gap-2 sm:gap-4 items-center">
                    {/* YouTube Link Button */}
                    <ToolTipMod title="Watch on YouTube">
                        <button
                            className="p-2 sm:p-3 rounded-full border-2 border-white/30 bg-black/20 hover:bg-black/50 hover:border-white text-white"
                            onClick={() =>
                                window.open(`https://www.youtube.com/watch?v=${trailer}`, '_blank')
                            }
                        >
                            <ArrowTopRightOnSquareIcon className="h-4 w-4 sm:h-6 sm:w-6" />
                        </button>
                    </ToolTipMod>

                    {/* Fullscreen Button */}
                    <ToolTipMod title={fullScreen ? 'Exit Fullscreen' : 'Fullscreen'}>
                        <button
                            className="p-2 sm:p-3 rounded-full border-2 border-white/30 bg-black/20 hover:bg-black/50 hover:border-white text-white"
                            onClick={onFullscreenClick}
                        >
                            {fullScreen ? (
                                <ArrowsPointingInIcon className="h-4 w-4 sm:h-6 sm:w-6" />
                            ) : (
                                <ArrowsPointingOutIcon className="h-4 w-4 sm:h-6 sm:w-6" />
                            )}
                        </button>
                    </ToolTipMod>
                </div>
            </div>
        </div>
    )
}

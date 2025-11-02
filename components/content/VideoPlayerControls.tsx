import React from 'react'
import {
    SpeakerWaveIcon,
    SpeakerXMarkIcon,
    ArrowsPointingOutIcon,
    ArrowsPointingInIcon,
    ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/solid'
import ToolTipMod from '../common/ToolTipMod'

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
    isHidden: _isHidden = false,
    onMuteToggle,
    onFullscreenClick,
    onVisibilityToggle: _onVisibilityToggle,
    currentMovieTitle: _currentMovieTitle = '',
}: VideoPlayerControlsProps) {
    if (!trailer) return null

    return (
        <div className="absolute top-4 right-4 z-30">
            <div className="flex flex-wrap gap-4 sm:gap-8 items-center justify-between">
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
    )
}

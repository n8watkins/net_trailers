'use client'

import React from 'react'
import {
    SpeakerWaveIcon,
    SpeakerXMarkIcon,
    ArrowTopRightOnSquareIcon,
    ArrowsPointingOutIcon,
    ArrowsPointingInIcon,
} from '@heroicons/react/24/solid'
import ToolTipMod from '../../common/ToolTipMod'
import VolumeSlider from '../../common/VolumeSlider'

interface VideoControlsProps {
    trailer: string
    muted: boolean
    volume: number
    fullScreen: boolean
    showVolumeSlider: boolean
    onToggleMute: () => void
    onVolumeChange: (volume: number) => void
    onToggleFullscreen: () => void
    onShowVolumeSlider: (show: boolean) => void
    volumeButtonRef: React.RefObject<HTMLDivElement | null>
    volumeSliderRef: React.RefObject<HTMLDivElement | null>
}

function VideoControls({
    trailer,
    muted,
    volume,
    fullScreen,
    showVolumeSlider,
    onToggleMute,
    onVolumeChange,
    onToggleFullscreen,
    onShowVolumeSlider,
    volumeButtonRef,
    volumeSliderRef,
}: VideoControlsProps) {
    return (
        <div className="flex gap-2 sm:gap-4 items-center">
            {/* Volume/Mute Button with Slider */}
            <div
                ref={volumeButtonRef}
                className="relative z-10"
                onMouseEnter={() => onShowVolumeSlider(true)}
                onMouseLeave={() => onShowVolumeSlider(false)}
            >
                {/* Custom Vertical Volume Slider - Behind button at bottom */}
                {showVolumeSlider && (
                    <div
                        ref={volumeSliderRef}
                        className="absolute bottom-full left-1/2 transform -translate-x-1/2 z-0"
                        style={{ marginBottom: '-26px' }}
                        onMouseEnter={() => onShowVolumeSlider(true)}
                        onMouseLeave={() => onShowVolumeSlider(false)}
                    >
                        {/* Larger transparent hover area - extends down behind button */}
                        <div className="flex flex-col items-center px-8 pt-4 pb-6">
                            <VolumeSlider volume={volume} onChange={onVolumeChange} />
                        </div>
                    </div>
                )}

                <ToolTipMod title={showVolumeSlider ? '' : muted ? 'Unmute' : 'Mute'}>
                    <button
                        className={`group relative z-20 p-2 sm:p-3 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-full border-2 text-white transition-colors ${
                            showVolumeSlider
                                ? 'border-white bg-[#1a1a1a]'
                                : 'border-white/30 bg-[#141414] hover:bg-[#1a1a1a] hover:border-white'
                        }`}
                        onClick={(e) => {
                            onToggleMute()
                            // Toggle volume slider on click for touch devices
                            onShowVolumeSlider(!showVolumeSlider)
                        }}
                        onMouseEnter={() => onShowVolumeSlider(true)}
                        onMouseLeave={() => onShowVolumeSlider(false)}
                    >
                        {muted ? (
                            <SpeakerXMarkIcon className="h-4 w-4 sm:h-6 sm:w-6 text-white/70 group-hover:text-white transition-colors" />
                        ) : (
                            <SpeakerWaveIcon className="h-4 w-4 sm:h-6 sm:w-6 text-white/70 group-hover:text-white transition-colors" />
                        )}
                    </button>
                </ToolTipMod>
            </div>

            {/* YouTube Link Button */}
            <ToolTipMod title="Watch on YouTube">
                <button
                    className="group p-2 sm:p-3 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-full border-2 border-white/30 bg-black/20 hover:bg-black/50 hover:border-white text-white transition-colors"
                    onClick={() =>
                        window.open(`https://www.youtube.com/watch?v=${trailer}`, '_blank')
                    }
                >
                    <ArrowTopRightOnSquareIcon className="h-4 w-4 sm:h-6 sm:w-6 text-white/70 group-hover:text-white transition-colors" />
                </button>
            </ToolTipMod>

            {/* Fullscreen Button */}
            <ToolTipMod title={fullScreen ? 'Exit Fullscreen' : 'Fullscreen'}>
                <button
                    className="group p-2 sm:p-3 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-full border-2 border-white/30 bg-black/20 hover:bg-black/50 hover:border-white text-white transition-colors"
                    onClick={onToggleFullscreen}
                >
                    {fullScreen ? (
                        <ArrowsPointingInIcon className="h-4 w-4 sm:h-6 sm:w-6 text-white/70 group-hover:text-white transition-colors" />
                    ) : (
                        <ArrowsPointingOutIcon className="h-4 w-4 sm:h-6 sm:w-6 text-white/70 group-hover:text-white transition-colors" />
                    )}
                </button>
            </ToolTipMod>
        </div>
    )
}

export default VideoControls

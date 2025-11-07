'use client'

import SmartSearchInput from './SmartSearchInput'

/**
 * HeroSearchOverlay - Centered search overlay for hero section
 *
 * This component sits on top of the hero/banner section, providing a
 * centered AI-powered search bar that's independent of the hero content
 */
export default function HeroSearchOverlay() {
    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="w-full max-w-3xl px-4 sm:px-6 md:px-8 pointer-events-auto">
                <SmartSearchInput />
            </div>
        </div>
    )
}

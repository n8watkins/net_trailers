/**
 * ContentGridSpacer Component
 *
 * Invisible spacer elements that maintain consistent gaps on partial rows
 * when using flexbox with justify-between. These zero-height elements
 * ensure the last row items align properly with the grid above.
 *
 * Usage: Place at the end of a flex container with justify-between
 */

import React from 'react'

interface ContentGridSpacerProps {
    /** Number of spacer elements to render (default: 8) */
    count?: number
}

export default function ContentGridSpacer({ count = 8 }: ContentGridSpacerProps) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={`spacer-${i}`}
                    className="w-[120px] xs:w-[140px] sm:w-[160px] md:w-[180px] lg:w-[200px] xl:w-[220px] h-0"
                    aria-hidden="true"
                />
            ))}
        </>
    )
}

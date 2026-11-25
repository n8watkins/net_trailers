import React from 'react'

/**
 * A grid of normal-size ContentCards. The columns are exactly as wide as the
 * cards at each breakpoint (components/common/ContentCard.tsx), so the last
 * row lines up with the rows above without spacer elements. On phones the
 * columns sit together in the middle with a small gap; from `sm` up the spare
 * width spreads between them, so the outer cards line up with the page title.
 */
export default function ContentGrid({ children }: { children: React.ReactNode }) {
    return (
        <div
            data-testid="content-grid"
            className="grid justify-center sm:justify-between gap-x-4 sm:gap-x-8 md:gap-x-10 lg:gap-x-12 gap-y-3 sm:gap-y-4 md:gap-y-5
                       grid-cols-[repeat(auto-fill,120px)] xs:grid-cols-[repeat(auto-fill,140px)] sm:grid-cols-[repeat(auto-fill,160px)]
                       md:grid-cols-[repeat(auto-fill,180px)] lg:grid-cols-[repeat(auto-fill,200px)] xl:grid-cols-[repeat(auto-fill,220px)]"
        >
            {children}
        </div>
    )
}

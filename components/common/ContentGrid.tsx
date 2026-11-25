import React from 'react'

/**
 * A grid of normal-size ContentCards, given `fluid` (components/common/ContentCard.tsx).
 *
 * Phones: two equal columns across the content width with a 16 px gap, the
 * cards filling them, so the outer edges line up with the page title and the
 * right gutter. From `sm` up the columns are exactly as wide as the cards at
 * each breakpoint and the spare width spreads between them; the last row lines
 * up with the rows above without spacer elements.
 */
export default function ContentGrid({ children }: { children: React.ReactNode }) {
    return (
        <div
            data-testid="content-grid"
            className="grid grid-cols-2 gap-x-4 gap-y-3 sm:justify-between sm:gap-x-8 md:gap-x-10 lg:gap-x-12 sm:gap-y-4 md:gap-y-5
                       sm:grid-cols-[repeat(auto-fill,160px)] md:grid-cols-[repeat(auto-fill,180px)]
                       lg:grid-cols-[repeat(auto-fill,200px)] xl:grid-cols-[repeat(auto-fill,220px)]"
        >
            {children}
        </div>
    )
}

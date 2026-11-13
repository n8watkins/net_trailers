import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import Link from '@/components/common/Link'

const prefetch = jest.fn()
jest.mock('next/navigation', () => ({
    useRouter: () => ({ prefetch, push: jest.fn() }),
}))

// What next/link was given, without its own router machinery.
const nextLinkProps: Record<string, unknown>[] = []
jest.mock('next/link', () => ({
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    default: require('react').forwardRef(function MockLink(
        props: Record<string, unknown>,
        ref: React.Ref<HTMLAnchorElement>
    ) {
        nextLinkProps.push(props)
        const { href, prefetch: _prefetch, ...rest } = props
        return <a ref={ref} href={String(href)} {...rest} />
    }),
}))

describe('Link', () => {
    beforeEach(() => {
        prefetch.mockClear()
        nextLinkProps.length = 0
    })

    it('never prefetches on sight, only when the visitor hovers, touches or focuses it', () => {
        render(<Link href="/smartsearch?example=x">Mood</Link>)
        expect(nextLinkProps[0].prefetch).toBe(false)
        expect(prefetch).not.toHaveBeenCalled()
        const link = screen.getByText('Mood')
        fireEvent.mouseEnter(link)
        fireEvent.touchStart(link)
        fireEvent.focus(link)
        expect(prefetch).toHaveBeenCalledTimes(3)
        expect(prefetch).toHaveBeenCalledWith('/smartsearch?example=x')
    })

    it("keeps the caller's own handlers and an explicit prefetch choice", () => {
        const onMouseEnter = jest.fn()
        render(
            <>
                <Link href="/search" onMouseEnter={onMouseEnter}>
                    Search
                </Link>
                <Link href="/terms" prefetch>
                    Terms
                </Link>
            </>
        )
        fireEvent.mouseEnter(screen.getByText('Search'))
        expect(onMouseEnter).toHaveBeenCalled()
        expect(nextLinkProps.find((p) => p.href === '/terms')?.prefetch).toBe(true)
    })

    it('does not prefetch other sites', () => {
        render(<Link href="https://example.com/">Out</Link>)
        fireEvent.mouseEnter(screen.getByText('Out'))
        expect(prefetch).not.toHaveBeenCalled()
    })
})

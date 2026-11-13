import React from 'react'
import { act, render } from '@testing-library/react'
import Banner from '@/components/layout/Banner'
import type { Content } from '@/typings'

jest.mock('@/components/smartSearch/SmartSearchInput', () => ({
    __esModule: true,
    default: () => null,
}))

// A plain <img> that counts how often each backdrop is mounted (a remount is a new request).
const mounts: Record<string, number> = {}
jest.mock('next/image', () => ({
    __esModule: true,
    default: function MockImage(props: { src: string; alt: string; className?: string }) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { useEffect } = require('react')
        useEffect(() => {
            mounts[props.src] = (mounts[props.src] ?? 0) + 1
        }, [props.src])
        return <img src={props.src} alt={props.alt} className={props.className} />
    },
}))

const movie = (id: number): Content =>
    ({
        id,
        media_type: 'movie',
        title: `Movie ${id}`,
        backdrop_path: `/backdrop-${id}.jpg`,
        poster_path: `/poster-${id}.jpg`,
        overview: 'An overview.',
        release_date: '2024-01-01',
    }) as unknown as Content

const backdropCount = () =>
    Object.entries(mounts).filter(([src]) => src.includes('backdrop')).length

function setHidden(hidden: boolean) {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
    document.dispatchEvent(new Event('visibilitychange'))
}

describe('Banner', () => {
    beforeEach(() => {
        jest.useFakeTimers()
        for (const key of Object.keys(mounts)) delete mounts[key]
        setHidden(false)
    })
    afterEach(() => jest.useRealTimers())

    it('loads each backdrop once however many times the slides rotate', () => {
        const { container } = render(<Banner trending={[movie(1), movie(2), movie(3)]} />)
        const inPage = () => container.querySelectorAll('img[src*="backdrop"]').length
        // The first slide and the next one (preloaded)
        expect(backdropCount()).toBe(2)
        expect(inPage()).toBe(2)
        for (let i = 0; i < 12; i++) {
            act(() => {
                jest.advanceTimersByTime(8700)
            })
        }
        expect(backdropCount()).toBe(3)
        // Every backdrop shown stays in the page, so rotating back needs no request
        expect(inPage()).toBe(3)
        for (const [src, count] of Object.entries(mounts)) {
            if (src.includes('backdrop')) expect(count).toBe(1)
        }
    })

    it('stops rotating while the tab is hidden and resumes when it is shown', () => {
        const { container } = render(<Banner trending={[movie(1), movie(2), movie(3)]} />)
        const heading = () => container.querySelector('h1')?.textContent
        expect(heading()).toBe('Movie 1')
        act(() => setHidden(true))
        act(() => {
            jest.advanceTimersByTime(60_000)
        })
        expect(heading()).toBe('Movie 1')
        act(() => setHidden(false))
        act(() => {
            jest.advanceTimersByTime(8700)
        })
        expect(heading()).toBe('Movie 2')
    })
})

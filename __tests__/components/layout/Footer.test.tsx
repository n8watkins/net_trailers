import { render, screen, within } from '@testing-library/react'
import Footer from '@/components/layout/Footer'

jest.mock('next/navigation', () => ({
    useRouter: () => ({ prefetch: jest.fn(), push: jest.fn() }),
}))

function renderFooter() {
    return render(
        <Footer
            showAboutModal={false}
            onOpenAboutModal={jest.fn()}
            onCloseAboutModal={jest.fn()}
            onOpenTutorial={jest.fn()}
            onOpenWelcome={jest.fn()}
        />
    )
}

describe('Footer', () => {
    it('credits Nate at n8builds.dev with the icon and the computed year', () => {
        renderFooter()
        const link = screen.getByRole('link', { name: /Built by Nate at n8builds\.dev/ })
        expect(link.getAttribute('href')).toBe('https://n8builds.dev')
        expect(link.querySelector('img')?.getAttribute('src')).toContain('n8builds-mark')
        expect(screen.getByText(`© ${new Date().getFullYear()} Nathan Watkins`)).toBeTruthy()
    })

    it('carries the TMDB logo and the attribution line TMDB asks for', () => {
        const { container } = renderFooter()
        const credit = within(screen.getByTestId('tmdb-credit'))
        expect(
            credit.getByText(
                'This product uses the TMDB API but is not endorsed or certified by TMDB.'
            )
        ).toBeTruthy()
        expect(credit.getByRole('link', { name: /TMDB/ }).getAttribute('href')).toBe(
            'https://www.themoviedb.org/'
        )
        expect(container.querySelector('img[src="/brand/tmdb-logo.svg"]')).toBeTruthy()
    })

    it('gives every footer link a 40 px tap target', () => {
        renderFooter()
        const footer = screen.getByRole('contentinfo')
        const targets = within(footer)
            .getAllByRole('link')
            .concat(within(footer).getAllByRole('button'))
        expect(targets.length).toBeGreaterThan(10)
        for (const el of targets) {
            expect(`${el.className}`).toMatch(/min-h-10|h-10/)
        }
    })
})

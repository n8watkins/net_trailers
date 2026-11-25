import { render, screen } from '@testing-library/react'
import N8buildsLink from '@/components/common/N8buildsLink'

describe('N8buildsLink', () => {
    it('is the n8builds icon beside the text, opening n8builds.dev in a new tab', () => {
        const { container } = render(<N8buildsLink />)
        const link = screen.getByRole('link', { name: /n8builds\.dev/ })
        expect(link.getAttribute('href')).toBe('https://n8builds.dev')
        expect(link.getAttribute('target')).toBe('_blank')
        expect(link.getAttribute('rel')).toContain('noopener')
        const icon = container.querySelector('img')
        expect(icon?.getAttribute('src')).toContain('n8builds-mark')
        expect(icon?.getAttribute('alt')).toBe('')
    })

    it('takes custom text, a larger tap target and a focus ring', () => {
        render(<N8buildsLink tapTarget>Built by Nate at n8builds.dev</N8buildsLink>)
        const link = screen.getByRole('link', { name: /Built by Nate at n8builds\.dev/ })
        expect(link.className).toContain('min-h-10')
        expect(link.className).toContain('focus-visible:ring-2')
    })
})

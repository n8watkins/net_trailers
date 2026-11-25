import { fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import ChangelogView from '../../../app/changelog/ChangelogView'
import { changelogStats, parseChangelog } from '../../../app/changelog/parseChangelog'
import { LayoutProvider } from '../../../contexts/LayoutContext'

// The real layout brings the whole header (stores, auth); the page's own
// content is what is under test here.
jest.mock('../../../components/layout/SubPageLayout', () => ({
    __esModule: true,
    default: ({
        title,
        titleActions,
        children,
    }: {
        title: ReactNode
        titleActions: ReactNode
        children: ReactNode
    }) => (
        <div>
            <h1>{title}</h1>
            <div data-testid="actions">{titleActions}</div>
            {children}
        </div>
    ),
}))

const MARKDOWN = `# Changelog

## 1.7.0 - 2026-12-01

A year of work since the last notes.

### New

- Sign in with your email ([#42](https://github.com/n8watkins/net_trailers/pull/42))

### Fixed

- The \`Esc\` key closes search

All notable changes to NetTrailer will be documented in this file.

## [Unreleased] - 2025-12-03 - Production Ready

### Added (December 3, 2025)

- **Docs**
    - Nested one
    - Nested two

## [1.6.0] - 2025-01-14 - Email Notification System

### Added

- Email notifications
`

function renderView(markdown = MARKDOWN, layout = {}) {
    const changelog = parseChangelog(markdown)
    return render(
        <LayoutProvider value={layout}>
            <ChangelogView changelog={changelog} stats={changelogStats(changelog)} />
        </LayoutProvider>
    )
}

describe('ChangelogView', () => {
    it('shows release-kit releases with the numbers from the file', () => {
        renderView()
        expect(screen.getByRole('heading', { level: 2, name: 'v1.7.0' })).toBeInTheDocument()
        expect(screen.getByText('Latest', { selector: 'span' })).toBeInTheDocument()
        const stats = screen.getByText('Releases', { selector: 'dt' }).closest('dl') as HTMLElement
        expect(within(stats).getByText('v1.7.0')).toBeInTheDocument()
        expect(within(stats).getByText('December 1, 2026')).toBeInTheDocument()
        expect(within(stats).getByText('2')).toBeInTheDocument()
        expect(screen.getByText('A year of work since the last notes.')).toBeInTheDocument()
        const link = screen.getByRole('link', { name: '#42' })
        expect(link).toHaveAttribute('href', 'https://github.com/n8watkins/net_trailers/pull/42')
        expect(screen.getByText('Esc', { selector: 'code' })).toBeInTheDocument()
    })

    it('never labels anything Unreleased or shows the old typed-in numbers', () => {
        const { container } = renderView()
        expect(container.textContent).not.toMatch(/Unreleased|Upcoming|933\+|4 mos/)
        expect(container.textContent).not.toContain('All notable changes')
    })

    it('keeps nested bullets as nested lists in the earlier notes', () => {
        renderView()
        const entry = document.getElementById('notes-2025-12-03') as HTMLDetailsElement
        expect(entry.tagName).toBe('DETAILS')
        expect(entry.open).toBe(false)
        expect(within(entry).getByText('Production Ready')).toBeInTheDocument()
        expect(within(entry).getByText('December 3, 2025')).toBeInTheDocument()
        expect(within(entry).getByRole('heading', { level: 3, name: 'Added' })).toBeInTheDocument()
        const docs = within(entry).getByText('Docs').closest('li') as HTMLElement
        const nested = within(docs).getByRole('list')
        expect(
            within(nested)
                .getAllByRole('listitem')
                .map((li) => li.textContent)
        ).toEqual(['Nested one', 'Nested two'])
    })

    it('opens the newest hand-written entry while release-kit has not released yet', () => {
        renderView(MARKDOWN.replace(/## 1\.7\.0[\s\S]*?(?=## \[Unreleased\])/, ''))
        expect(screen.queryByText('Latest', { selector: 'span' })).not.toBeInTheDocument()
        expect((document.getElementById('notes-2025-12-03') as HTMLDetailsElement).open).toBe(true)
        expect((document.getElementById('v1.6.0') as HTMLDetailsElement).open).toBe(false)
    })

    it('opens the Help and About windows the rest of the site uses', () => {
        const onOpenTutorial = jest.fn()
        const onOpenAboutModal = jest.fn()
        renderView(MARKDOWN, { onOpenTutorial, onOpenAboutModal })
        fireEvent.click(screen.getByRole('button', { name: 'Help & tutorial' }))
        fireEvent.click(screen.getByRole('button', { name: 'About this project' }))
        expect(onOpenTutorial).toHaveBeenCalledTimes(1)
        expect(onOpenAboutModal).toHaveBeenCalledTimes(1)
    })

    it('opens the entry a link points at', () => {
        window.location.hash = '#v1.6.0'
        renderView()
        expect((document.getElementById('v1.6.0') as HTMLDetailsElement).open).toBe(true)
        window.location.hash = ''
    })
})

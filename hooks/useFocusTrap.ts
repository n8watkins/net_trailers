import { useEffect, type RefObject } from 'react'

const FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Focusable elements inside `root` that are actually rendered, so a section
 * collapsed with display:none (the phone's "Under the hood") is skipped.
 * Environments without checkVisibility (jsdom) keep every candidate.
 */
export function focusableWithin(root: HTMLElement): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) =>
            !el.closest('[hidden]') &&
            (typeof el.checkVisibility !== 'function' || el.checkVisibility())
    )
}

/**
 * Keep Tab and Shift+Tab inside a dialog while it is open, move focus into it
 * on open, and give focus back to whatever had it before on close.
 *
 * The container itself should have tabIndex={-1} so it can take the first focus
 * without lighting up a ring on a button.
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, isOpen: boolean): void {
    useEffect(() => {
        if (!isOpen) return
        const container = containerRef.current
        if (!container) return

        const previous =
            document.activeElement instanceof HTMLElement ? document.activeElement : null
        container.focus({ preventScroll: true })

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Tab') return
            const items = focusableWithin(container)
            if (items.length === 0) {
                event.preventDefault()
                container.focus()
                return
            }
            const first = items[0]
            const last = items[items.length - 1]
            const active = document.activeElement
            const inside = active instanceof Node && container.contains(active)
            if (event.shiftKey && (active === first || active === container || !inside)) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && (active === last || !inside)) {
                event.preventDefault()
                first.focus()
            }
        }

        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.removeEventListener('keydown', onKeyDown)
            if (previous && previous.isConnected) previous.focus({ preventScroll: true })
        }
    }, [containerRef, isOpen])
}

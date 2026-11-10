import { useEffect, useRef } from 'react'

/**
 * Stack of open Escape layers. Only the most recently opened layer reacts to
 * Escape, so a picker opened on top of an editor closes on its own first.
 */
const escapeLayers: symbol[] = []

/**
 * Close a modal, dialog or overlay when the user presses Escape.
 *
 * @param isOpen - whether the layer is currently shown
 * @param onEscape - called when Escape is pressed while this layer is the top one
 */
export function useEscapeKey(isOpen: boolean, onEscape: () => void): void {
    const onEscapeRef = useRef(onEscape)

    useEffect(() => {
        onEscapeRef.current = onEscape
    }, [onEscape])

    useEffect(() => {
        if (!isOpen) return

        const layer = Symbol('escape-layer')
        escapeLayers.push(layer)

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return
            if (escapeLayers[escapeLayers.length - 1] !== layer) return
            event.preventDefault()
            onEscapeRef.current()
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            const index = escapeLayers.indexOf(layer)
            if (index !== -1) escapeLayers.splice(index, 1)
        }
    }, [isOpen])
}

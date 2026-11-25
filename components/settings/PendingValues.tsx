import React from 'react'

/**
 * While a settings panel waits for the visitor's saved values, it shows its
 * real layout (headings, labels, descriptions) with every switch and slider
 * greyed and pulsing, and nothing can be pressed. When the values arrive the
 * controls take them in place, so nothing moves and no switch flips by itself
 * from a default to the saved value.
 */
const PENDING = [
    // switches: the track goes grey and loses its knob
    '[&_label>input.peer+div]:animate-pulse',
    '[&_label>input.peer+div]:!bg-zinc-700',
    '[&_label>input.peer+div]:after:opacity-0',
    // sliders
    '[&_input[type=range]]:animate-pulse',
    '[&_input[type=range]]:opacity-40',
    // counts and other values marked data-pending-value: a grey bar in their place
    '[&_[data-pending-value]]:animate-pulse',
    '[&_[data-pending-value]]:w-fit',
    '[&_[data-pending-value]]:min-w-[2ch]',
    '[&_[data-pending-value]]:rounded',
    '[&_[data-pending-value]]:bg-zinc-700',
    '[&_[data-pending-value]]:!text-transparent',
].join(' ')

export default function PendingValues({
    pending,
    children,
}: {
    pending: boolean
    children: React.ReactNode
}) {
    return (
        <div
            aria-busy={pending || undefined}
            inert={pending || undefined}
            data-settings-pending={pending || undefined}
            className={pending ? PENDING : undefined}
        >
            {children}
        </div>
    )
}

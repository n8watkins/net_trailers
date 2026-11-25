'use client'

/**
 * The one on/off switch for collection settings: brand red when on, zinc when
 * off, everywhere (it used to be green, blue or red depending on the row).
 */
export default function Switch({
    checked,
    onChange,
    label,
    disabled = false,
    size = 'md',
}: {
    checked: boolean
    onChange: (next: boolean) => void
    /** Accessible name; the visible label sits next to the switch. */
    label: string
    disabled?: boolean
    size?: 'sm' | 'md'
}) {
    const track = size === 'sm' ? 'h-5 w-9' : 'h-6 w-11'
    const knob = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
    const on = size === 'sm' ? 'translate-x-[18px]' : 'translate-x-6'
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0f] disabled:cursor-not-allowed disabled:opacity-50 ${track} ${
                checked ? 'bg-brand-500' : 'bg-zinc-700'
            }`}
        >
            <span
                aria-hidden="true"
                className={`inline-block transform rounded-full bg-white shadow transition-transform ${knob} ${
                    checked ? on : 'translate-x-1'
                }`}
            />
        </button>
    )
}

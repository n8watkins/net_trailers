import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'

/**
 * The one look for a destructive action.
 *
 * Brand buttons are solid red (#e50914), so a solid red danger button is
 * indistinguishable from them. A danger action is outlined instead (dark fill,
 * red border and text), always carries an icon and always names its verb, so it
 * reads as destructive without relying on hue.
 */
export const DANGER_BUTTON_CLASS =
    'inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/60 bg-red-950/40 font-semibold text-red-300 transition-colors hover:border-red-400 hover:bg-red-950/70 hover:text-red-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:cursor-not-allowed disabled:opacity-50'

interface DangerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    /** The icon: a trash can for deleting, a warning triangle for other risky actions. */
    icon?: 'trash' | 'warning'
    children: ReactNode
}

export default function DangerButton({
    icon = 'trash',
    className = '',
    children,
    type = 'button',
    ...props
}: DangerButtonProps) {
    const Icon = icon === 'trash' ? Trash2 : AlertTriangle
    return (
        <button type={type} className={`${DANGER_BUTTON_CLASS} ${className}`.trim()} {...props}>
            <Icon aria-hidden className="size-4 shrink-0" />
            {children}
        </button>
    )
}

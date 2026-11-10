import type { ReactNode } from 'react'

interface PageHeaderProps {
    /** Page title, shown at 32px */
    title: ReactNode
    /** Optional 28px icon before the title */
    icon?: ReactNode
    /** Tailwind text color for the icon */
    iconColor?: string
    /** Buttons on the right of the title (e.g. Manage); wrap below it on phones */
    actions?: ReactNode
    /** Toolbar under the title: filters, search. Pass nothing while the list is empty. */
    children?: ReactNode
}

/**
 * The one header used by every account page (Ratings, History, Collections,
 * Rankings, Notifications, Settings): a 32px title, no subtitle, the page's
 * actions on the right and its toolbar underneath.
 */
export default function PageHeader({
    title,
    icon,
    iconColor = 'text-amber-400',
    actions,
    children,
}: PageHeaderProps) {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                <div className="flex min-w-0 items-center gap-3">
                    {icon && (
                        <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center [&>svg]:h-7 [&>svg]:w-7 ${iconColor}`}
                            aria-hidden="true"
                        >
                            {icon}
                        </span>
                    )}
                    <h1 className="truncate text-[2rem] font-bold leading-10 text-white">
                        {title}
                    </h1>
                </div>
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
            {children}
        </div>
    )
}

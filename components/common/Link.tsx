'use client'

/**
 * next/link that prefetches a page when the visitor shows intent (hover,
 * touch or keyboard focus) rather than whenever the link scrolls into view.
 *
 * In production Next prefetches every link in the viewport, and each prefetch
 * is a Worker request that renders the page's RSC payload (billed CPU time):
 * the header, the footer and every card on a page asked for their pages on
 * each view, whether or not anyone clicked. Prefetching on intent keeps
 * navigation quick for people and costs nothing for links nobody follows.
 * A link that sets `prefetch` itself keeps Next's own behaviour.
 */
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { forwardRef, type ComponentProps } from 'react'

type LinkProps = ComponentProps<typeof NextLink>

const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(props, ref) {
    const router = useRouter()
    const { href, prefetch, onMouseEnter, onTouchStart, onFocus, ...rest } = props
    if (prefetch !== undefined) return <NextLink ref={ref} {...props} />

    const warm = () => {
        if (typeof href === 'string' && href.startsWith('/') && !href.startsWith('//')) {
            router.prefetch(href)
        }
    }
    return (
        <NextLink
            ref={ref}
            href={href}
            prefetch={false}
            onMouseEnter={(event) => {
                warm()
                onMouseEnter?.(event)
            }}
            onTouchStart={(event) => {
                warm()
                onTouchStart?.(event)
            }}
            onFocus={(event) => {
                warm()
                onFocus?.(event)
            }}
            {...rest}
        />
    )
})

export default Link

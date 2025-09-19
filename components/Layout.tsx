import React, { useEffect, useRef, useState } from 'react'
import Footer from './Footer'

interface LayoutProps {
    children: React.ReactNode
}

function Layout({ children }: LayoutProps) {
    const [showFooter, setShowFooter] = useState(false)
    const sentinelRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const sentinel = sentinelRef.current
        if (!sentinel) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                setShowFooter(entry.isIntersecting)
            },
            {
                threshold: 1.0,
                rootMargin: '0px'
            }
        )

        observer.observe(sentinel)

        return () => {
            observer.disconnect()
        }
    }, [])

    return (
        <div className="relative min-h-screen">
            <div className="pb-20">
                {children}
            </div>
            <div ref={sentinelRef} className="h-1" />
            <div className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ${
                showFooter ? 'translate-y-0' : 'translate-y-full'
            }`}>
                <Footer />
            </div>
        </div>
    )
}

export default Layout
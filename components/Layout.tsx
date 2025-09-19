import React from 'react'
import Footer from './Footer'

interface LayoutProps {
    children: React.ReactNode
}

function Layout({ children }: LayoutProps) {
    return (
        <div className="relative min-h-screen">
            <div className="pb-80">
                {children}
            </div>
            <div className="fixed bottom-0 left-0 right-0 z-40">
                <Footer />
            </div>
        </div>
    )
}

export default Layout
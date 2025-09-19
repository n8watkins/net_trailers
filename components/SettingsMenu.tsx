import React, { useState, useRef, useEffect } from 'react'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import {
    UserIcon,
    ArrowRightOnRectangleIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline'
import useAuth from '../hooks/useAuth'
import { useRouter } from 'next/router'

const SettingsMenu: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false)
    const [showProjectModal, setShowProjectModal] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const { logOut, user } = useAuth()
    const router = useRouter()

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleLogout = () => {
        setIsOpen(false)
        logOut()
        router.push('/login')
    }

    const handleProjectInfo = () => {
        setIsOpen(false)
        setShowProjectModal(true)
    }

    const menuItems = [
        {
            icon: InformationCircleIcon,
            label: 'About This Project',
            onClick: handleProjectInfo,
            showChevron: true
        }
    ]

    return (
        <div className="relative" ref={menuRef}>
            {/* Profile Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center rounded hover:opacity-80 transition-opacity duration-200"
                aria-label="Profile Menu"
            >
                <img
                    src="https://occ-0-3997-3996.1.nflxso.net/dnm/api/v6/K6hjPJd6cR6FpVELC5Pd6ovHRSk/AAAABX5_zNxCZOEGlSGykILrWVH75fVZe_-5H9HlAXtJoNs6AK8FTjyMG-llwgLJXGA8RUwxotwOOHMh3ovdrXFpq9-J4CBmFKA.png?r=1d4"
                    alt="User Profile"
                    width={32}
                    height={32}
                    className="rounded h-8 w-8 cursor-pointer"
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-black/95 backdrop-blur-md border border-gray-600/50 rounded-lg shadow-2xl z-50 overflow-hidden">
                    {/* User Info Section */}
                    <div className="px-4 py-3 border-b border-gray-600/50">
                        <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                user ? 'bg-red-600' : 'bg-gray-600'
                            }`}>
                                <UserIcon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-white text-sm font-medium">
                                    {user?.email || 'Guest User'}
                                </p>
                                <p className="text-gray-400 text-xs">
                                    {user ? 'Signed In' : 'Browsing as Guest'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                        {menuItems.map((item, index) => (
                            <button
                                key={index}
                                onClick={item.onClick}
                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700/50 transition-colors duration-200 text-left"
                            >
                                <div className="flex items-center space-x-3">
                                    <item.icon className="h-5 w-5 text-gray-300" />
                                    <span className="text-white text-sm">{item.label}</span>
                                </div>

                                {item.isToggle ? (
                                    <div className={`w-10 h-5 rounded-full transition-colors duration-200 ${
                                        item.isActive ? 'bg-red-600' : 'bg-gray-600'
                                    }`}>
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 mt-0.5 ${
                                            item.isActive ? 'translate-x-5' : 'translate-x-0.5'
                                        }`} />
                                    </div>
                                ) : item.showChevron ? (
                                    <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                                ) : null}
                            </button>
                        ))}
                    </div>

                    {/* Logout Section */}
                    <div className="border-t border-gray-600/50">
                        <button
                            onClick={handleLogout}
                            className="w-full px-4 py-3 flex items-center space-x-3 hover:bg-red-600/20 transition-colors duration-200 text-left"
                        >
                            <ArrowRightOnRectangleIcon className="h-5 w-5 text-red-400" />
                            <span className="text-red-400 text-sm font-medium">Sign Out</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Project Info Modal */}
            {showProjectModal && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    onClick={() => setShowProjectModal(false)}
                >
                    <div
                        className="bg-[#181818] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-600/50"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-600/50 flex items-center justify-between">
                            <h2 className="text-white text-2xl font-bold">NetTrailer - Portfolio Project</h2>
                            <button
                                onClick={() => setShowProjectModal(false)}
                                className="text-gray-400 hover:text-white transition-colors duration-200 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="px-6 py-4 space-y-6">
                            {/* Project Purpose */}
                            <div>
                                <h3 className="text-white text-lg font-semibold mb-3">🎬 Project Purpose</h3>
                                <p className="text-gray-300 leading-relaxed">
                                    NetTrailer is a Netflix-inspired streaming platform showcase that demonstrates advanced
                                    React development, modern UI/UX design, and full-stack web development capabilities.
                                    This project features real movie data, user authentication, responsive design, and
                                    sophisticated state management - all built with industry-standard technologies.
                                </p>
                            </div>

                            {/* Tech Stack */}
                            <div>
                                <h3 className="text-white text-lg font-semibold mb-3 flex items-center space-x-2">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 3.95-.36.1-.74.15-1.13.15-.27 0-.54-.03-.8-.08.54 1.69 2.11 2.95 4 2.98-1.46 1.16-3.31 1.84-5.33 1.84-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                                    </svg>
                                    <span>Tech Stack</span>
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {[
                                        {
                                            name: 'Next.js 15',
                                            icon: <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M11.214.103c-.31.004-.621.01-.931.023-1.58.063-3.225.364-4.666.967a11.959 11.959 0 00-3.528 2.336A11.96 11.96 0 00.467 6.957 11.959 11.959 0 000 12c0 6.627 5.373 12 12 12 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12zM5.514 6.132c.36-.36.85-.606 1.393-.77-.093.294-.186.588-.278.882-.294-.113-.588-.226-.878-.357a6.984 6.984 0 01-.237.245zm.382 1.146a32.194 32.194 0 00-.65 1.84 27.287 27.287 0 00-.385-.062c.067-.595.16-1.186.278-1.773a7.62 7.62 0 01.757-.005zM4.7 9.665c.031-.53.083-1.058.15-1.58a26.036 26.036 0 01.582.1 31.408 31.408 0 00-.593 1.676c-.047-.065-.094-.13-.139-.196zm8.3 6.335V8c1.657 0 3.001 1.344 3.001 3s-1.344 3-3.001 3z"/></svg>
                                        },
                                        {
                                            name: 'React 18',
                                            icon: <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M14.23 12.004a2.236 2.236 0 01-2.235 2.236 2.236 2.236 0 112.235-2.236zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38-.318-.184-.688-.277-1.092-.278zm-.005 1.09v.006c.225 0 .406.044.558.127.666.382.955 1.835.73 3.704-.054.46-.142.945-.25 1.44a23.476 23.476 0 00-3.107-.534A23.892 23.892 0 0012.769 4.7c1.592-1.48 3.087-2.292 4.105-2.295zm-9.77.02c1.012 0 2.514.808 4.11 2.28-.686.72-1.37 1.537-2.02 2.442a22.73 22.73 0 00-3.113.538 15.02 15.02 0 01-.254-1.42c-.23-1.868.054-3.32.714-3.707.19-.09.4-.127.563-.132zm4.882 3.05c.455.468.91.992 1.36 1.564-.44-.02-.89-.034-1.36-.034-.47 0-.92.014-1.36.034.44-.572.895-1.096 1.36-1.564zM12 8.1c.74 0 1.477.034 2.202.093.406.582.802 1.203 1.183 1.86.372.64.71 1.29 1.018 1.946-.308.655-.646 1.31-1.013 1.95-.38.66-.773 1.288-1.18 1.87a25.64 25.64 0 01-4.412.005 26.64 26.64 0 01-1.186-1.86c-.372-.64-.71-1.29-1.018-1.946a25.17 25.17 0 011.013-1.954c.38-.66.773-1.286 1.18-1.868A25.245 25.245 0 0112 8.098zm-3.635.254c-.24.377-.48.763-.704 1.16-.225.39-.435.782-.635 1.174-.265-.656-.49-1.31-.676-1.947.64-.15 1.315-.283 2.015-.386zm7.26 0c.695.103 1.365.23 2.006.387-.18.632-.405 1.282-.66 1.933a25.952 25.952 0 00-1.345-2.32zm3.063.675c.484.15.944.317 1.375.498 1.732.74 2.852 1.708 2.852 2.476-.005 1.05-1.672 2.116-4.208 2.904-.39.122-.803.234-1.21.335-.28-.76-.568-1.54-.882-2.335.3-.718.565-1.47.795-2.252a4.617 4.617 0 00.28.018zm-14.646.68c.268.778.548 1.52.84 2.233-.29.718-.555 1.47-.785 2.252-.507-.101-.917-.207-1.24-.33-1.732-.74-2.852-1.706-2.852-2.474 0-.768 1.12-1.734 2.852-2.474.42-.18.88-.342 1.353-.49.232.78.498 1.524.832 2.282zm-.077 2.045c.263.657.48 1.31.676 1.948-.64.157-1.316.29-2.016.39a25.819 25.819 0 011.341-2.338zm9.68 0c.239.378.48.765.704 1.160.225.39.435.783.634 1.177.265-.657.49-1.312.676-1.948-.64-.157-1.316-.29-2.016-.39zm-4.47 2.72c.44.02.89.034 1.36.034.47 0 .92-.014 1.36-.034-.44.572-.895 1.095-1.36 1.563-.455-.468-.91-.991-1.36-1.563z"/></svg>
                                        },
                                        {
                                            name: 'TypeScript',
                                            icon: <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.213.776.213 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 0 1-1.012 1.085 4.38 4.38 0 0 1-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 0 1-1.84-.164 5.544 5.544 0 0 1-1.512-.493v-2.63a5.033 5.033 0 0 0 3.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 0 0-.074-1.089 2.12 2.12 0 0 0-.537-.5 5.597 5.597 0 0 0-.807-.444 27.72 27.72 0 0 0-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 0 1 1.47-.629 7.536 7.536 0 0 1 1.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z"/></svg>
                                        },
                                        {
                                            name: 'Tailwind CSS',
                                            icon: <svg className="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12.001,4.8c-3.2,0-5.2,1.6-6,4.8c1.2-1.6,2.6-2.2,4.2-1.8c0.913,0.228,1.565,0.89,2.288,1.624 C13.666,10.618,15.027,12,18.001,12c3.2,0,5.2-1.6,6-4.8c-1.2,1.6-2.6,2.2-4.2,1.8c-0.913-0.228-1.565-0.89-2.288-1.624 C16.337,6.182,14.976,4.8,12.001,4.8z M6.001,12c-3.2,0-5.2,1.6-6,4.8c1.2-1.6,2.6-2.2,4.2-1.8c0.913,0.228,1.565,0.89,2.288,1.624 c1.177,1.194,2.538,2.576,5.512,2.576c3.2,0,5.2-1.6,6-4.8c-1.2,1.6-2.6,2.2-4.2,1.8c-0.913-0.228-1.565-0.89-2.288-1.624 C10.337,13.382,8.976,12,6.001,12z"/></svg>
                                        },
                                        {
                                            name: 'Firebase',
                                            icon: <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 24 24"><path d="M5.821 4.91l3.139 2.848L6.646 4.327c-.426-.777-1.403-.69-1.714.097L5.821 4.91zm13.567 10.39L15.949 3.977c-.426-.777-1.403-.69-1.714.097l-3.139 2.848 8.292 8.378zM4.327 6.646L7.958 18.7c.213.778 1.403.778 1.616 0l3.631-12.054L4.327 6.646z"/><path d="M3.33 15.7L6.27 6.65c.285-.926 1.514-.926 1.799 0L10.01 15.7H3.33zm10.74 0L16.07 8.1c.285-.926 1.514-.926 1.799 0l2.01 7.6H14.07z"/></svg>
                                        },
                                        {
                                            name: 'Recoil',
                                            icon: <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                                        },
                                        {
                                            name: 'TMDB API',
                                            icon: <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M7 7v10l5.5-5L7 7z"/></svg>
                                        },
                                        {
                                            name: 'Vercel',
                                            icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 22.525H0l12-21.05 12 21.05z"/></svg>
                                        },
                                        {
                                            name: 'ESLint',
                                            icon: <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l8.485 4.242v11.516L12 22 3.515 17.758V6.242L12 2z"/></svg>
                                        },
                                        {
                                            name: 'Sentry',
                                            icon: <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 7.568a1 1 0 11-1.415 1.415l-4.25 4.25-2.104-2.104a1 1 0 10-1.414 1.414l2.81 2.81a1 1 0 001.415 0l4.958-4.958z"/></svg>
                                        }
                                    ].map((tech) => (
                                        <div key={tech.name} className="bg-gray-700/50 px-3 py-2 rounded-lg flex items-center space-x-2">
                                            {tech.icon}
                                            <span className="text-gray-200 text-sm">{tech.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Features */}
                            <div>
                                <h3 className="text-white text-lg font-semibold mb-3">✨ Key Features</h3>
                                <ul className="text-gray-300 space-y-2">
                                    <li>• Real-time movie/TV show data from TMDB API</li>
                                    <li>• User authentication with multiple providers</li>
                                    <li>• Responsive carousel with auto-advance and manual navigation</li>
                                    <li>• Advanced search with debouncing and URL sync</li>
                                    <li>• Favorites system with persistent storage</li>
                                    <li>• Netflix-style modal player with trailer integration</li>
                                </ul>
                            </div>

                            {/* Social Links */}
                            <div>
                                <h3 className="text-white text-lg font-semibold mb-3">🔗 Connect & Explore</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <button
                                        onClick={() => window.open('https://github.com/yourusername', '_blank')}
                                        className="bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-lg transition-colors duration-200 text-left flex items-center space-x-3"
                                    >
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                                        </svg>
                                        <div>
                                            <div className="text-white font-medium">GitHub</div>
                                            <div className="text-gray-400 text-sm">View source code & projects</div>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => window.open('https://your-portfolio.com', '_blank')}
                                        className="bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-lg transition-colors duration-200 text-left flex items-center space-x-3"
                                    >
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V9a2 2 0 11-4 0V6m0 0V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V9a2 2 0 11-4 0V6m0 0V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V9a2 2 0 11-4 0V6m0 0V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2" />
                                        </svg>
                                        <div>
                                            <div className="text-white font-medium">Portfolio</div>
                                            <div className="text-gray-400 text-sm">See all my work</div>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => window.open('https://linkedin.com/in/yourprofile', '_blank')}
                                        className="bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-lg transition-colors duration-200 text-left flex items-center space-x-3"
                                    >
                                        <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                        </svg>
                                        <div>
                                            <div className="text-white font-medium">LinkedIn</div>
                                            <div className="text-gray-400 text-sm">Professional network</div>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => window.open('https://x.com/yourusername', '_blank')}
                                        className="bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-lg transition-colors duration-200 text-left flex items-center space-x-3"
                                    >
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                        </svg>
                                        <div>
                                            <div className="text-white font-medium">X (Twitter)</div>
                                            <div className="text-gray-400 text-sm">Follow for updates</div>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="text-center pt-4 border-t border-gray-600/50">
                                <p className="text-gray-400 text-sm">
                                    Built with ❤️ to showcase modern web development skills
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default SettingsMenu
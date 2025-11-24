'use client'

import { redirect } from 'next/navigation'
import Link from 'next/link'

export default function DocsIndexPage() {
    // Only available in development
    if (process.env.NODE_ENV !== 'development') {
        redirect('/')
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            <div className="max-w-4xl mx-auto px-4 py-16">
                <h1 className="text-4xl font-bold mb-4">Documentation</h1>
                <p className="text-gray-400 mb-8">
                    Development documentation for NetTrailer. Only available in development mode.
                </p>

                <div className="grid gap-4">
                    <Link
                        href="/docs/debugger-console"
                        className="block p-6 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 hover:bg-zinc-800/50 transition-all group"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">
                                    Debugger Console
                                </h2>
                                <p className="text-gray-400 mt-1">
                                    Comprehensive documentation for all debug toggles and tools
                                </p>
                            </div>
                            <span className="text-gray-500 group-hover:text-blue-400 transition-colors">
                                &rarr;
                            </span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className="px-2 py-1 text-xs bg-orange-600/20 text-orange-400 rounded">
                                Firebase & Data
                            </span>
                            <span className="px-2 py-1 text-xs bg-blue-600/20 text-blue-400 rounded">
                                UI & Interaction
                            </span>
                            <span className="px-2 py-1 text-xs bg-purple-600/20 text-purple-400 rounded">
                                Features & Tools
                            </span>
                            <span className="px-2 py-1 text-xs bg-emerald-600/20 text-emerald-400 rounded">
                                Data Actions
                            </span>
                        </div>
                    </Link>
                </div>

                <div className="mt-12 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                    <p className="text-sm text-gray-500">
                        <strong className="text-gray-400">Tip:</strong> Press{' '}
                        <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs">Alt</kbd> +{' '}
                        <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs">Shift</kbd> +{' '}
                        <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs">D</kbd> to toggle the
                        debug console directly from any page.
                    </p>
                </div>
            </div>
        </div>
    )
}

'use client'

import React, { useState } from 'react'
import { ShareIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import ManageSharesModal from '../sharing/ManageSharesModal'

interface DataSummary {
    watchlistCount: number
    likedCount: number
    hiddenCount: number
    listsCount: number
    watchHistoryCount: number
    totalItems: number
    isEmpty: boolean
    accountCreated?: Date
}

interface ShareSectionProps {
    isGuest: boolean
    dataSummary: DataSummary
    onExportData: () => void
}

const ShareSection: React.FC<ShareSectionProps> = ({ isGuest, dataSummary, onExportData }) => {
    const [isManageSharesOpen, setIsManageSharesOpen] = useState(false)

    return (
        <div className="p-8">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Share & Export</h2>
                <p className="text-[#b3b3b3]">
                    {isGuest
                        ? 'Export your data to keep a backup of your collections and preferences.'
                        : 'Share your collections with others or export your data.'}
                </p>
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {!isGuest && (
                        <div className="bg-[#0a0a0a] rounded-xl p-6 border border-[#313131]">
                            <ShareIcon className="w-8 h-8 text-blue-500 mb-4" />
                            <h3 className="text-lg font-semibold text-white mb-2">
                                Share Collections
                            </h3>
                            <p className="text-[#b3b3b3] mb-4">
                                Generate shareable links for your Watch Later and custom
                                collections.
                            </p>
                            <button
                                onClick={() => setIsManageSharesOpen(true)}
                                className="bannerButton bg-blue-600 text-white hover:bg-blue-700"
                            >
                                Manage Sharing
                            </button>
                        </div>
                    )}

                    <div
                        className={`bg-[#0a0a0a] rounded-xl p-6 border border-[#313131] ${isGuest ? 'md:col-span-2' : ''}`}
                    >
                        <ArrowDownTrayIcon className="w-8 h-8 text-green-500 mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">Export Data</h3>
                        <p className="text-[#b3b3b3] mb-4">
                            Download your collections, watch history, ratings, and preferences as
                            CSV.
                        </p>

                        {/* Data Summary */}
                        <div className="mb-4 p-4 bg-[#141414] rounded-lg border border-[#313131]">
                            <p className="text-[#e5e5e5] text-sm mb-2">Your data includes:</p>
                            <ul className="text-[#b3b3b3] text-sm space-y-1">
                                <li>• {dataSummary.watchlistCount} Watch Later items</li>
                                <li>• {dataSummary.likedCount} liked items</li>
                                <li>• {dataSummary.hiddenCount} hidden items</li>
                                <li>• {dataSummary.watchHistoryCount} watch history entries</li>
                                {!isGuest && <li>• {dataSummary.listsCount} custom collections</li>}
                            </ul>
                        </div>

                        <button
                            onClick={onExportData}
                            disabled={dataSummary.isEmpty}
                            className={`bannerButton ${
                                dataSummary.isEmpty
                                    ? 'bg-gray-600 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700'
                            } text-white`}
                        >
                            {dataSummary.isEmpty ? 'No Data to Export' : 'Export Data (CSV)'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Manage Shares Modal */}
            <ManageSharesModal
                isOpen={isManageSharesOpen}
                onClose={() => setIsManageSharesOpen(false)}
            />
        </div>
    )
}

export default ShareSection

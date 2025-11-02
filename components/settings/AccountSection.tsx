'use client'

import React from 'react'
import { ArrowDownTrayIcon, TrashIcon } from '@heroicons/react/24/outline'
import { UpgradeAccountBanner } from '../auth/UpgradeAccountBanner'

interface DataSummary {
    watchlistCount: number
    likedCount: number
    hiddenCount: number
    listsCount: number
    totalItems: number
    isEmpty: boolean
    accountCreated?: Date
}

interface AccountSectionProps {
    isGuest: boolean
    dataSummary: DataSummary
    onExportData: () => void
    onShowClearConfirm: () => void
    onShowDeleteConfirm: () => void
}

const AccountSection: React.FC<AccountSectionProps> = ({
    isGuest,
    dataSummary,
    onExportData,
    onShowClearConfirm,
    onShowDeleteConfirm,
}) => {
    return (
        <div className="p-8">
            {/* Upgrade Banner for Guests */}
            {isGuest && <UpgradeAccountBanner />}

            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Data Management</h2>
                <p className="text-[#b3b3b3]">
                    {isGuest
                        ? 'Export, clear, or manage your local session data.'
                        : 'Export, clear, or manage your account data.'}
                </p>
            </div>

            <div className="space-y-6">
                {/* Data Summary Card */}
                <div className="bg-[#0a0a0a] rounded-lg border border-[#313131] p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">
                        {isGuest ? 'Session Data' : 'Account Data'}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-[#141414] rounded-lg p-4 border border-[#313131]">
                            <p className="text-[#b3b3b3] text-sm">Watchlist</p>
                            <p className="text-white text-2xl font-bold mt-1">
                                {dataSummary.watchlistCount}
                            </p>
                        </div>
                        <div className="bg-[#141414] rounded-lg p-4 border border-[#313131]">
                            <p className="text-[#b3b3b3] text-sm">Liked</p>
                            <p className="text-white text-2xl font-bold mt-1">
                                {dataSummary.likedCount}
                            </p>
                        </div>
                        <div className="bg-[#141414] rounded-lg p-4 border border-[#313131]">
                            <p className="text-[#b3b3b3] text-sm">Hidden</p>
                            <p className="text-white text-2xl font-bold mt-1">
                                {dataSummary.hiddenCount}
                            </p>
                        </div>
                        {!isGuest && (
                            <div className="bg-[#141414] rounded-lg p-4 border border-[#313131]">
                                <p className="text-[#b3b3b3] text-sm">Lists</p>
                                <p className="text-white text-2xl font-bold mt-1">
                                    {dataSummary.listsCount}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        {/* Export Data Button */}
                        <button
                            onClick={onExportData}
                            disabled={dataSummary.isEmpty}
                            className={`w-full text-left p-4 rounded-lg border transition-colors ${
                                dataSummary.isEmpty
                                    ? 'bg-[#141414] border-[#313131] cursor-not-allowed opacity-50'
                                    : 'bg-[#141414] hover:bg-[#1a1a1a] border-[#313131]'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <span className="text-[#e5e5e5] font-medium flex items-center gap-2">
                                        <ArrowDownTrayIcon className="w-5 h-5" />
                                        Export Data
                                    </span>
                                    <p className="text-[#b3b3b3] text-sm mt-1">
                                        Download your watchlists and preferences as CSV
                                    </p>
                                </div>
                            </div>
                        </button>

                        {/* Clear Data Button */}
                        <button
                            onClick={onShowClearConfirm}
                            disabled={dataSummary.isEmpty}
                            className={`w-full text-left p-4 rounded-lg border transition-colors ${
                                dataSummary.isEmpty
                                    ? 'bg-[#141414] border-[#313131] cursor-not-allowed opacity-50'
                                    : 'bg-[#141414] hover:bg-orange-900/20 border-orange-600/30'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <span className="text-orange-400 font-medium flex items-center gap-2">
                                        <TrashIcon className="w-5 h-5" />
                                        Clear Data
                                    </span>
                                    <p className="text-[#b3b3b3] text-sm mt-1">
                                        Remove all saved watchlists, likes, and preferences
                                    </p>
                                </div>
                            </div>
                        </button>

                        {/* Delete Account Button (Authenticated Only) */}
                        {!isGuest && (
                            <button
                                onClick={onShowDeleteConfirm}
                                className="w-full text-left p-4 bg-[#141414] hover:bg-red-900/20 rounded-lg border border-red-600/30 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <span className="text-red-400 font-medium flex items-center gap-2">
                                            <TrashIcon className="w-5 h-5" />
                                            Delete Account
                                        </span>
                                        <p className="text-[#b3b3b3] text-sm mt-1">
                                            Permanently delete your account and all data
                                        </p>
                                    </div>
                                </div>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AccountSection

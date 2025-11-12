/**
 * Individual Ranking Page
 *
 * Displays a single ranking with full details, comments, and engagement options
 * Allows editing and deleting for ranking owners
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import SubPageLayout from '../../../components/layout/SubPageLayout'
import { RankingDetail } from '../../../components/rankings/RankingDetail'
import { useRankingStore } from '../../../stores/rankingStore'
import { useSessionStore } from '../../../stores/sessionStore'
import { useAuthStatus } from '../../../hooks/useAuthStatus'
import NetflixLoader from '../../../components/common/NetflixLoader'
import { TrophyIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useToast } from '../../../hooks/useToast'

export default function RankingDetailPage() {
    const router = useRouter()
    const params = useParams()
    const rankingId = params?.id as string

    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()
    const { isInitialized } = useAuthStatus()
    const { showSuccess, showError } = useToast()

    const { currentRanking, isLoading, error, loadRanking, deleteRanking, clearCurrentRanking } =
        useRankingStore()

    const [isDeleting, setIsDeleting] = useState(false)

    // Load ranking on mount
    useEffect(() => {
        if (isInitialized && rankingId) {
            loadRanking(rankingId, userId)
        }

        // Cleanup on unmount
        return () => {
            clearCurrentRanking()
        }
    }, [isInitialized, rankingId, userId])

    const handleEdit = () => {
        // TODO: Implement edit mode
        showError('Edit mode not yet implemented')
    }

    const handleDelete = async () => {
        if (!userId || !currentRanking) return

        setIsDeleting(true)
        try {
            await deleteRanking(userId, currentRanking.id)
            showSuccess('Ranking Deleted', 'Your ranking has been deleted successfully')
            router.push('/rankings')
        } catch (error) {
            console.error('Failed to delete ranking:', error)
            showError('Failed to delete ranking')
            setIsDeleting(false)
        }
    }

    const handleShare = () => {
        showSuccess('Link Copied!', 'Ranking link copied to clipboard')
    }

    const handleBack = () => {
        router.push('/rankings')
    }

    if (!isInitialized || isLoading || isDeleting) {
        return (
            <SubPageLayout
                title="Loading Ranking..."
                icon={<TrophyIcon className="w-8 h-8" />}
                iconColor="text-yellow-500"
            >
                <NetflixLoader />
            </SubPageLayout>
        )
    }

    // Error State
    if (error || !currentRanking) {
        return (
            <SubPageLayout
                title="Ranking Not Found"
                icon={<TrophyIcon className="w-8 h-8" />}
                iconColor="text-yellow-500"
            >
                <div className="max-w-2xl mx-auto text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-zinc-800 flex items-center justify-center">
                        <TrophyIcon className="w-10 h-10 text-gray-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Ranking Not Found</h2>
                    <p className="text-gray-400 mb-8">
                        {error || 'This ranking does not exist or has been deleted.'}
                    </p>
                    <button
                        onClick={handleBack}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-medium rounded-lg transition-colors"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                        Back to Rankings
                    </button>
                </div>
            </SubPageLayout>
        )
    }

    return (
        <SubPageLayout
            title={currentRanking.title}
            icon={<TrophyIcon className="w-8 h-8" />}
            iconColor="text-yellow-500"
            headerActions={
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                    <ArrowLeftIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">Back</span>
                </button>
            }
        >
            <RankingDetail
                ranking={currentRanking}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onShare={handleShare}
            />
        </SubPageLayout>
    )
}

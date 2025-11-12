/**
 * Edit Ranking Page
 *
 * Allows users to edit their existing rankings
 * Reuses the RankingCreator component in edit mode
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import SubPageLayout from '../../../../components/layout/SubPageLayout'
import { RankingCreator } from '../../../../components/rankings/RankingCreator'
import { useRankingStore } from '../../../../stores/rankingStore'
import { useSessionStore } from '../../../../stores/sessionStore'
import { useAuthStatus } from '../../../../hooks/useAuthStatus'
import NetflixLoader from '../../../../components/common/NetflixLoader'
import { TrophyIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useToast } from '../../../../hooks/useToast'

export default function EditRankingPage() {
    const router = useRouter()
    const params = useParams()
    const rankingId = params?.id as string

    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()
    const { isInitialized } = useAuthStatus()
    const { showError } = useToast()

    const { currentRanking, isLoading, error, loadRanking, clearCurrentRanking } = useRankingStore()

    const [isOwner, setIsOwner] = useState<boolean | null>(null)

    // Load ranking on mount
    useEffect(() => {
        if (isInitialized && rankingId && userId) {
            loadRanking(rankingId, userId)
        }

        // Cleanup on unmount
        return () => {
            clearCurrentRanking()
        }
    }, [isInitialized, rankingId, userId])

    // Check ownership
    useEffect(() => {
        if (currentRanking && userId) {
            const owner = currentRanking.userId === userId
            setIsOwner(owner)

            if (!owner) {
                showError('You do not have permission to edit this ranking')
                router.push(`/rankings/${rankingId}`)
            }
        }
    }, [currentRanking, userId, rankingId, router, showError])

    const handleBack = () => {
        router.push(`/rankings/${rankingId}`)
    }

    const handleComplete = (updatedRankingId: string) => {
        router.push(`/rankings/${updatedRankingId}`)
    }

    if (!isInitialized || isLoading || isOwner === null) {
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
                        onClick={() => router.push('/rankings')}
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
            title="Edit Ranking"
            icon={<TrophyIcon className="w-8 h-8" />}
            iconColor="text-yellow-500"
            headerActions={
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                    <ArrowLeftIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">Cancel</span>
                </button>
            }
        >
            <RankingCreator
                existingRanking={currentRanking}
                onComplete={handleComplete}
                onCancel={handleBack}
            />
        </SubPageLayout>
    )
}

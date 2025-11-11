/**
 * Create New Ranking Page
 *
 * 3-step wizard for creating a new ranking
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SubPageLayout from '../../../components/layout/SubPageLayout'
import { RankingCreator } from '../../../components/rankings/RankingCreator'
import { useAuthStatus } from '../../../hooks/useAuthStatus'
import { GuestModeNotification } from '../../../components/auth/GuestModeNotification'
import NetflixLoader from '../../../components/common/NetflixLoader'
import { TrophyIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useToast } from '../../../hooks/useToast'

export default function NewRankingPage() {
    const router = useRouter()
    const { isGuest, isInitialized, isLoading } = useAuthStatus()
    const { showSuccess } = useToast()

    // Redirect guests to rankings page
    useEffect(() => {
        if (isInitialized && isGuest) {
            router.push('/rankings')
        }
    }, [isInitialized, isGuest, router])

    const handleComplete = (rankingId: string) => {
        showSuccess('Ranking Created', 'Your ranking has been created successfully!')
        router.push(`/rankings/${rankingId}`)
    }

    const handleCancel = () => {
        router.push('/rankings')
    }

    if (!isInitialized || isLoading) {
        return (
            <SubPageLayout
                title="Create Ranking"
                icon={<TrophyIcon className="w-8 h-8" />}
                iconColor="text-yellow-500"
            >
                <NetflixLoader />
            </SubPageLayout>
        )
    }

    // Show guest notification if guest somehow reaches this page
    if (isGuest) {
        return (
            <SubPageLayout
                title="Create Ranking"
                icon={<TrophyIcon className="w-8 h-8" />}
                iconColor="text-yellow-500"
            >
                <GuestModeNotification />
                <div className="mt-6 text-center">
                    <button
                        onClick={() => router.push('/rankings')}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                        Back to Rankings
                    </button>
                </div>
            </SubPageLayout>
        )
    }

    return <RankingCreator onComplete={handleComplete} onCancel={handleCancel} />
}

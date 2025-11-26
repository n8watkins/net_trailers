'use client'

import { useState, useEffect, useCallback, useMemo, Suspense, useRef } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Header from '../../../components/layout/Header'
import Modal from '../../../components/modals/Modal'
import ContentCard from '../../../components/common/ContentCard'
import ContentGridSpacer from '../../../components/common/ContentGridSpacer'
import NetflixLoader from '../../../components/common/NetflixLoader'
import Image from 'next/image'
import { Content } from '../../../typings'
import { useSessionData } from '../../../hooks/useSessionData'
import { filterDislikedContent } from '../../../utils/contentFilter'
import { useChildSafety } from '../../../hooks/useChildSafety'
import { UNIFIED_GENRES, getUnifiedGenreFromTMDBId, UnifiedGenre } from '../../../constants/unifiedGenres'

interface PersonCreditsResponse {
    id: number
    cast: Content[]
    crew: Content[]
    combined: Content[]
    total_results: number
}

interface PersonDetails {
    id: number
    name: string
    profile_path: string | null
    known_for_department: string
    biography: string
    birthday: string | null
    deathday: string | null
    place_of_birth: string | null
    imdb_id: string | null
}

type RoleFilter = 'all' | 'acting' | 'directing' | 'writing' | 'production' | 'other_crew'

function PersonPageContent() {
    const params = useParams<{ id: string }>()
    const searchParams = useSearchParams()
    const router = useRouter()
    const personId = params?.id
    const sessionData = useSessionData()
    const [credits, setCredits] = useState<Content[]>([])
    const [castCredits, setCastCredits] = useState<Content[]>([])
    const [crewCredits, setCrewCredits] = useState<Content[]>([])
    const [personDetails, setPersonDetails] = useState<PersonDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { isEnabled: childSafetyEnabled, isLoading: isChildSafetyLoading } = useChildSafety()

    // Get initial role and genre from URL (will be cleaned up after)
    const urlRole = searchParams?.get('role') as RoleFilter | null
    const urlGenre = searchParams?.get('genre')
    const validRoles: RoleFilter[] = ['all', 'acting', 'directing', 'writing', 'production', 'other_crew']
    const initialRole = urlRole && validRoles.includes(urlRole) ? urlRole : 'all'
    const initialGenre = urlGenre || 'all'
    const hasCleanedUrl = useRef(false)

    // Filter states
    const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'movie' | 'tv'>('all')
    const [roleFilter, setRoleFilter] = useState<RoleFilter>(initialRole)
    const [genreFilter, setGenreFilter] = useState<string>(initialGenre)

    // Clean up URL after reading the role and genre params (remove query params from URL)
    useEffect(() => {
        if ((urlRole || urlGenre) && !hasCleanedUrl.current && personId) {
            hasCleanedUrl.current = true
            router.replace(`/person/${personId}`, { scroll: false })
        }
    }, [urlRole, urlGenre, personId, router])

    // Helper type for jobs array
    type JobEntry = { job?: string; department?: string }

    // Helper function to check if any job matches a role
    const hasRole = (item: Content, checkFn: (job: string, department: string) => boolean): boolean => {
        const jobs = (item as Content & { jobs?: JobEntry[] }).jobs || []
        // Check the jobs array first (comprehensive)
        if (jobs.length > 0) {
            return jobs.some((j) => {
                const job = j.job?.toLowerCase() || ''
                const department = j.department?.toLowerCase() || ''
                return checkFn(job, department)
            })
        }
        // Fallback to single job/department fields for backward compatibility
        const job = (item as Content & { job?: string }).job?.toLowerCase() || ''
        const department = (item as Content & { department?: string }).department?.toLowerCase() || ''
        return checkFn(job, department)
    }

    // Determine unique roles this person has
    const personRoles = useMemo(() => {
        const roles = new Set<string>()

        // Show acting if they have any cast credits
        if (castCredits.length > 0) {
            roles.add('acting')
        }

        for (const credit of crewCredits) {
            if (hasRole(credit, (job, dept) => dept === 'directing' || job.includes('director'))) {
                roles.add('directing')
            }
            if (hasRole(credit, (job, dept) => dept === 'writing' || job.includes('writer') || job.includes('screenplay'))) {
                roles.add('writing')
            }
            if (hasRole(credit, (job, dept) => dept === 'production' || job.includes('producer'))) {
                roles.add('production')
            }
            // Check for other crew roles
            const jobs = (credit as Content & { jobs?: JobEntry[] }).jobs || []
            const job = (credit as Content & { job?: string }).job?.toLowerCase() || ''
            const department = (credit as Content & { department?: string }).department?.toLowerCase() || ''
            const hasOtherJob = jobs.length > 0
                ? jobs.some((j) => {
                    const jJob = j.job?.toLowerCase() || ''
                    const jDept = j.department?.toLowerCase() || ''
                    const isDirecting = jDept === 'directing' || jJob.includes('director')
                    const isWriting = jDept === 'writing' || jJob.includes('writer') || jJob.includes('screenplay')
                    const isProduction = jDept === 'production' || jJob.includes('producer')
                    return !isDirecting && !isWriting && !isProduction && (jDept || jJob)
                })
                : (!hasRole(credit, (j, d) => d === 'directing' || j.includes('director')) &&
                   !hasRole(credit, (j, d) => d === 'writing' || j.includes('writer') || j.includes('screenplay')) &&
                   !hasRole(credit, (j, d) => d === 'production' || j.includes('producer')) &&
                   (department || job))
            if (hasOtherJob) {
                roles.add('other_crew')
            }
        }

        return Array.from(roles)
    }, [castCredits, crewCredits])

    // Determine unique genres from this person's content
    const personGenres = useMemo(() => {
        const genreSet = new Set<string>()

        for (const item of credits) {
            // Get genre_ids from the content item
            const genreIds = (item as Content & { genre_ids?: number[] }).genre_ids || []
            const mediaType = item.media_type === 'tv' ? 'tv' : 'movie'
            for (const tmdbGenreId of genreIds) {
                // Find the unified genre for this TMDB ID based on media type
                const unifiedGenre = getUnifiedGenreFromTMDBId(tmdbGenreId, mediaType)
                if (unifiedGenre) {
                    genreSet.add(unifiedGenre.id)
                }
            }
        }

        // Return sorted array of unified genres that this person has content in
        return Array.from(genreSet)
            .map(id => UNIFIED_GENRES.find(g => g.id === id))
            .filter((g): g is UnifiedGenre => g !== undefined)
            .sort((a, b) => a.name.localeCompare(b.name))
    }, [credits])

    const contentToRender = useMemo(() => {
        // Filter out disliked content
        let filtered = filterDislikedContent(credits, sessionData.hiddenMovies)

        // Apply media type filter
        if (mediaTypeFilter !== 'all') {
            filtered = filtered.filter((item) => item.media_type === mediaTypeFilter)
        }

        // Apply role filter using hasRole helper that checks the jobs array
        if (roleFilter === 'acting') {
            filtered = filtered.filter((item) => 'character' in item && item.character)
        } else if (roleFilter === 'directing') {
            filtered = filtered.filter((item) => hasRole(item, (job, dept) => dept === 'directing' || job.includes('director')))
        } else if (roleFilter === 'writing') {
            filtered = filtered.filter((item) => hasRole(item, (job, dept) => dept === 'writing' || job.includes('writer') || job.includes('screenplay')))
        } else if (roleFilter === 'production') {
            filtered = filtered.filter((item) => hasRole(item, (job, dept) => dept === 'production' || job.includes('producer')))
        } else if (roleFilter === 'other_crew') {
            filtered = filtered.filter((item) => {
                const isActing = 'character' in item && item.character
                const isDirecting = hasRole(item, (job, dept) => dept === 'directing' || job.includes('director'))
                const isWriting = hasRole(item, (job, dept) => dept === 'writing' || job.includes('writer') || job.includes('screenplay'))
                const isProduction = hasRole(item, (job, dept) => dept === 'production' || job.includes('producer'))
                // Check if has any job
                const jobs = (item as Content & { jobs?: JobEntry[] }).jobs || []
                const job = (item as Content & { job?: string }).job?.toLowerCase() || ''
                const department = (item as Content & { department?: string }).department?.toLowerCase() || ''
                const hasAnyJob = jobs.length > 0 || department || job
                return !isActing && !isDirecting && !isWriting && !isProduction && hasAnyJob
            })
        }

        // Apply genre filter
        if (genreFilter !== 'all') {
            const selectedGenre = UNIFIED_GENRES.find(g => g.id === genreFilter)
            if (selectedGenre) {
                // Get all TMDB IDs for this unified genre (both movie and TV)
                const tmdbIds = [...selectedGenre.movieIds, ...selectedGenre.tvIds]
                filtered = filtered.filter((item) => {
                    const genreIds = (item as Content & { genre_ids?: number[] }).genre_ids || []
                    return genreIds.some(gid => tmdbIds.includes(gid))
                })
            }
        }

        return filtered
    }, [credits, sessionData.hiddenMovies, mediaTypeFilter, roleFilter, genreFilter])

    // Load person credits
    const loadPersonCredits = useCallback(async () => {
        if (!personId) return
        // Wait for child safety preference to load before fetching
        // This prevents briefly showing unfiltered content to protected users
        if (isChildSafetyLoading) return

        setLoading(true)
        setError(null)

        try {
            // Fetch person credits and details in parallel
            const [creditsResponse, personResponse] = await Promise.all([
                fetch(`/api/people/${personId}/credits?childSafetyMode=${childSafetyEnabled}`),
                fetch(`/api/people/${personId}`)
            ])

            if (!creditsResponse.ok) {
                throw new Error(`Failed to fetch person credits: ${creditsResponse.status}`)
            }

            const creditsData: PersonCreditsResponse = await creditsResponse.json()
            setCredits(creditsData.combined || [])
            setCastCredits(creditsData.cast || [])
            setCrewCredits(creditsData.crew || [])

            // Set person details
            if (personResponse.ok) {
                const personData: PersonDetails = await personResponse.json()
                setPersonDetails(personData)
            }
        } catch (err) {
            console.error('Error loading person credits:', err)
            setError(err instanceof Error ? err.message : 'Failed to load person credits')
        } finally {
            setLoading(false)
        }
    }, [personId, childSafetyEnabled, isChildSafetyLoading])

    useEffect(() => {
        if (personId) {
            loadPersonCredits()
        }
    }, [personId, loadPersonCredits])

    if (loading) {
        return <NetflixLoader message="Loading filmography..." />
    }

    if (error) {
        return (
            <div className="relative min-h-screen bg-gradient-to-b">
                <Header />
                <main className="relative pl-4 pb-16 lg:space-y-24 lg:pl-16">
                    <div className="flex items-center justify-center h-96">
                        <div className="text-center">
                            <div className="text-6xl mb-4">😵</div>
                            <h2 className="text-2xl font-semibold text-white mb-2">
                                Something went wrong
                            </h2>
                            <p className="text-gray-400 mb-4">{error}</p>
                        </div>
                    </div>
                </main>
            </div>
        )
    }

    // Helper to get role label
    const getRoleLabel = (role: string): string => {
        switch (role) {
            case 'acting': return 'Actor'
            case 'directing': return 'Director'
            case 'writing': return 'Writer'
            case 'production': return 'Producer'
            case 'other_crew': return 'Crew'
            default: return role
        }
    }

    // Helper to get role filter label
    const getRoleFilterLabel = (role: RoleFilter): string => {
        switch (role) {
            case 'all': return 'All Roles'
            case 'acting': return 'Acting'
            case 'directing': return 'Directing'
            case 'writing': return 'Writing'
            case 'production': return 'Producing'
            case 'other_crew': return 'Other Crew'
            default: return role
        }
    }

    const personImage = personDetails?.profile_path
        ? `https://image.tmdb.org/t/p/w185${personDetails.profile_path}`
        : null

    return (
        <div className="relative min-h-screen bg-gradient-to-b">
            <Header />

            <main className="relative px-2 sm:px-4 md:px-8 lg:px-16 pb-8 sm:pb-12 md:pb-16">
                <div className="flex flex-col space-y-4 sm:space-y-6 md:space-y-8 pt-24 sm:pt-28 md:pt-32 lg:pt-36 pb-8 sm:pb-12 md:pb-16 lg:pb-20">
                    {/* Header Section with Person Info */}
                    <div className="flex items-end gap-4 sm:gap-6">
                        {/* Person Image */}
                        {personImage && (
                            <div className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full overflow-hidden ring-2 ring-red-500 flex-shrink-0">
                                <Image
                                    src={personImage}
                                    alt={personDetails?.name || 'Person'}
                                    fill
                                    style={{ objectFit: 'cover' }}
                                    sizes="(max-width: 640px) 96px, (max-width: 768px) 128px, 160px"
                                />
                            </div>
                        )}

                        {/* Person Info */}
                        <div className="space-y-1.5">
                            <h1 className="text-xl font-bold text-white sm:text-2xl md:text-3xl">
                                {personDetails?.name || 'Unknown'}
                            </h1>

                            {/* Roles badges */}
                            {personRoles.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {personRoles.map((role) => (
                                        <span
                                            key={role}
                                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700/80 text-gray-200"
                                        >
                                            {getRoleLabel(role)}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <p className="text-gray-400 text-sm">
                                {contentToRender.length}{' '}
                                {contentToRender.length === 1 ? 'title' : 'titles'}
                            </p>

                            {/* IMDB Link */}
                            {personDetails?.imdb_id && (
                                <a
                                    href={`https://www.imdb.com/name/${personDetails.imdb_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1 mt-1 text-sm font-medium text-black bg-yellow-400 hover:bg-yellow-300 rounded transition-colors"
                                >
                                    <span className="font-bold">IMDb</span>
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-3 sm:gap-4">
                        {/* Media Type Filter */}
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            <button
                                onClick={() => setMediaTypeFilter('all')}
                                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                    mediaTypeFilter === 'all'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setMediaTypeFilter('movie')}
                                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                    mediaTypeFilter === 'movie'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                                Movies
                            </button>
                            <button
                                onClick={() => setMediaTypeFilter('tv')}
                                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                    mediaTypeFilter === 'tv'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                                TV Shows
                            </button>
                        </div>

                        {/* Divider */}
                        <div className="hidden sm:block w-px bg-gray-700 self-stretch" />

                        {/* Role Filter - only show roles this person has */}
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            <button
                                onClick={() => setRoleFilter('all')}
                                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                    roleFilter === 'all'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                                All Roles
                            </button>
                            {personRoles.includes('acting') && (
                                <button
                                    onClick={() => setRoleFilter('acting')}
                                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                        roleFilter === 'acting'
                                            ? 'bg-red-600 text-white'
                                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}
                                >
                                    {getRoleFilterLabel('acting')}
                                </button>
                            )}
                            {personRoles.includes('directing') && (
                                <button
                                    onClick={() => setRoleFilter('directing')}
                                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                        roleFilter === 'directing'
                                            ? 'bg-red-600 text-white'
                                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}
                                >
                                    {getRoleFilterLabel('directing')}
                                </button>
                            )}
                            {personRoles.includes('writing') && (
                                <button
                                    onClick={() => setRoleFilter('writing')}
                                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                        roleFilter === 'writing'
                                            ? 'bg-red-600 text-white'
                                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}
                                >
                                    {getRoleFilterLabel('writing')}
                                </button>
                            )}
                            {personRoles.includes('production') && (
                                <button
                                    onClick={() => setRoleFilter('production')}
                                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                        roleFilter === 'production'
                                            ? 'bg-red-600 text-white'
                                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}
                                >
                                    {getRoleFilterLabel('production')}
                                </button>
                            )}
                            {personRoles.includes('other_crew') && (
                                <button
                                    onClick={() => setRoleFilter('other_crew')}
                                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                        roleFilter === 'other_crew'
                                            ? 'bg-red-600 text-white'
                                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}
                                >
                                    {getRoleFilterLabel('other_crew')}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Genre Filter */}
                    {personGenres.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            <button
                                onClick={() => setGenreFilter('all')}
                                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                    genreFilter === 'all'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                                All Genres
                            </button>
                            {personGenres.map((genre) => (
                                <button
                                    key={genre.id}
                                    onClick={() => setGenreFilter(genre.id)}
                                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                        genreFilter === genre.id
                                            ? 'bg-red-600 text-white'
                                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}
                                >
                                    {genre.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Content Section */}
                    {contentToRender.length > 0 ? (
                        <div className="space-y-8">
                            {/* Flex Layout */}
                            <div className="flex flex-wrap justify-between gap-x-6 sm:gap-x-8 md:gap-x-10 lg:gap-x-12 gap-y-3 sm:gap-y-4 md:gap-y-5 [&>*]:flex-none">
                                {contentToRender.map((item) => (
                                    <div
                                        key={`${item.media_type || 'unknown'}-${item.id}`}
                                        className="overflow-visible"
                                    >
                                        <ContentCard content={item} />
                                    </div>
                                ))}
                                <ContentGridSpacer />
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="text-6xl mb-4">🔍</div>
                            <h2 className="text-2xl font-semibold text-white mb-2">
                                No content found
                            </h2>
                            <p className="text-gray-400">Try adjusting your filters.</p>
                        </div>
                    )}
                </div>
            </main>

            <Modal />
        </div>
    )
}

export default function PersonPage() {
    return (
        <Suspense fallback={<NetflixLoader message="Loading person..." />}>
            <PersonPageContent />
        </Suspense>
    )
}

import React from 'react'
import Image from 'next/image'
import { TrendingPerson } from '../../typings'

interface PersonSearchResultItemProps {
    person: TrendingPerson
    index: number
    isSelected: boolean
    onClick: (person: TrendingPerson) => void
    onRef?: (el: HTMLDivElement | null) => void
}

export default function PersonSearchResultItem({
    person,
    index,
    isSelected,
    onClick,
    onRef,
}: PersonSearchResultItemProps) {
    // Get friendly department label (Actor instead of Acting, etc.)
    const getDepartmentLabel = (department: string) => {
        switch (department?.toLowerCase()) {
            case 'acting':
                return 'Actor'
            case 'directing':
                return 'Director'
            case 'writing':
                return 'Writer'
            case 'production':
                return 'Producer'
            case 'crew':
                return 'Crew'
            case 'sound':
                return 'Sound'
            case 'camera':
                return 'Camera'
            case 'art':
                return 'Art'
            case 'costume & make-up':
                return 'Costume & Make-Up'
            case 'visual effects':
                return 'VFX'
            default:
                return department || 'Unknown'
        }
    }

    return (
        <div
            key={`person-${person.id}-${index}`}
            ref={onRef}
            className={`flex items-center rounded-lg p-3 cursor-pointer group border transition-all duration-300 ease-in-out ${
                isSelected
                    ? 'bg-red-600/30 border-red-500/50 shadow-lg shadow-red-500/20'
                    : 'bg-gray-700/30 border-transparent hover:bg-gray-600/30 hover:border-gray-500/30'
            }`}
            onClick={() => onClick(person)}
        >
            {/* Profile Image */}
            <div className="flex-shrink-0 w-12 h-12 relative rounded-full overflow-hidden bg-gray-600">
                {person.profile_path ? (
                    <Image
                        src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                        alt={person.name}
                        fill
                        sizes="48px"
                        className="object-cover group-hover:scale-105 transition-transform duration-200 select-none"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-gray-700 to-gray-900">
                        {person.gender === 1 ? '👩' : '👨'}
                    </div>
                )}
            </div>

            {/* Person Details */}
            <div className="flex-1 ml-3 min-w-0">
                {/* Name */}
                <h4 className="text-white font-medium text-sm truncate group-hover:text-red-400 transition-colors">
                    {person.name}
                </h4>
                {/* Department Badge */}
                <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-600 text-white inline-block mt-1">
                    {getDepartmentLabel(person.known_for_department)}
                </span>
            </div>
        </div>
    )
}

/**
 * Forum Categories Configuration
 */

import { CategoryInfo, ForumCategory } from '@/types/forum'

export const FORUM_CATEGORIES: CategoryInfo[] = [
    {
        id: 'general',
        name: 'General',
        description: 'General discussions about movies and TV',
        icon: '💬',
        color: 'text-gray-400',
    },
    {
        id: 'movies',
        name: 'Movies',
        description: 'Discuss your favorite films',
        icon: '🎬',
        color: 'text-blue-400',
    },
    {
        id: 'tv-shows',
        name: 'TV Shows',
        description: 'Talk about TV series and episodes',
        icon: '📺',
        color: 'text-purple-400',
    },
    {
        id: 'recommendations',
        name: 'Recommendations',
        description: 'Get and share recommendations',
        icon: '⭐',
        color: 'text-yellow-400',
    },
    {
        id: 'rankings',
        name: 'Rankings',
        description: 'Discuss and debate rankings',
        icon: '🏆',
        color: 'text-orange-400',
    },
    {
        id: 'announcements',
        name: 'Announcements',
        description: 'Official announcements and news',
        icon: '📢',
        color: 'text-red-400',
    },
]

export function getCategoryInfo(category: ForumCategory): CategoryInfo | undefined {
    return FORUM_CATEGORIES.find((c) => c.id === category)
}

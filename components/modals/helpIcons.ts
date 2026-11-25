import type { ComponentType, SVGProps } from 'react'
import {
    BookmarkIcon,
    ChatBubbleLeftRightIcon,
    ClockIcon,
    GiftIcon,
    HandThumbUpIcon,
    MagnifyingGlassIcon,
    MicrophoneIcon,
    RectangleStackIcon,
    ShieldCheckIcon,
    SparklesIcon,
    TrophyIcon,
    UserCircleIcon,
} from '@heroicons/react/24/outline'
import type { HelpIconName } from '../../constants/helpContent'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

/**
 * One Heroicons outline icon per Help tile, the set the rest of the app uses
 * (the header's Collections, My Ratings and Community items use the same ones).
 */
export const HELP_ICONS: Record<HelpIconName, Icon> = {
    search: MagnifyingGlassIcon,
    mood: SparklesIcon,
    voice: MicrophoneIcon,
    surprise: GiftIcon,
    like: HandThumbUpIcon,
    'watch-later': BookmarkIcon,
    collections: RectangleStackIcon,
    history: ClockIcon,
    rankings: TrophyIcon,
    forums: ChatBubbleLeftRightIcon,
    profile: UserCircleIcon,
    'child-safety': ShieldCheckIcon,
}

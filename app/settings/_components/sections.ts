/**
 * The settings sections, in menu order. Shared by the menu (SettingsFrame) and
 * each section's tab title (metadata), so the two never disagree.
 */
export type SettingsSectionId =
    | 'profile'
    | 'account-management'
    | 'preferences'
    | 'notifications'
    | 'recommendations'
    | 'collections'
    | 'share'
    | 'account'

export interface SettingsSection {
    id: SettingsSectionId
    path: `/settings/${SettingsSectionId}`
    title: string
    description: string
    priority: 'low' | 'medium' | 'high' | 'danger'
    /** Shown only to signed-in visitors */
    authenticatedOnly?: boolean
}

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
    {
        id: 'profile',
        path: '/settings/profile',
        title: 'Profile',
        description: 'Manage your profile and privacy settings',
        priority: 'medium',
        authenticatedOnly: true,
    },
    {
        id: 'account-management',
        path: '/settings/account-management',
        title: 'Account Management',
        description: 'Your sign-in email, and signing out',
        priority: 'high',
        authenticatedOnly: true,
    },
    {
        id: 'preferences',
        path: '/settings/preferences',
        title: 'Preferences',
        description: 'Content filters and playback settings',
        priority: 'low',
    },
    {
        id: 'notifications',
        path: '/settings/notifications',
        title: 'Notifications',
        description: 'Manage notification preferences',
        priority: 'low',
    },
    {
        id: 'recommendations',
        path: '/settings/recommendations',
        title: 'Recommendations',
        description: 'Manage Trending, Top Rated, and For You rows',
        priority: 'low',
    },
    {
        id: 'collections',
        path: '/settings/collections',
        title: 'Collections',
        description: 'Manage and organize your collections',
        priority: 'low',
    },
    {
        id: 'share',
        path: '/settings/share',
        title: 'Share & Export',
        description: 'Share your lists or export data',
        priority: 'low',
        authenticatedOnly: true,
    },
    {
        id: 'account',
        path: '/settings/account',
        title: 'Data Management',
        description: 'Export, clear, or manage your data',
        priority: 'danger',
    },
]

/** The section `/settings` shows beside the menu on wide screens. */
export const DEFAULT_SECTION: SettingsSectionId = 'preferences'

/** The browser tab title of a settings section, e.g. "Preferences - Settings - NetTrailers". */
export function sectionTitle(id: SettingsSectionId): string {
    const section = SETTINGS_SECTIONS.find((s) => s.id === id)
    return `${section?.title ?? 'Settings'} - Settings - NetTrailers`
}

import { create } from 'zustand'

// Onboarding store state interface
export interface OnboardingStoreState {
    // Welcome screen tracking
    hasSeenWelcomeScreen: boolean

    // Tour completion tracking
    hasCompletedTour: boolean
    hasSkippedTour: boolean
    currentTourStep: number

    // Tooltip tracking (which tooltips have been shown)
    tooltipsShown: Record<string, boolean>

    // Achievement tracking
    achievements: string[]

    // Last updated timestamp
    lastUpdated: number | null
}

// Onboarding store actions interface
export interface OnboardingStoreActions {
    // Welcome screen actions
    markWelcomeScreenSeen: () => void

    // Tour actions
    completeTour: () => void
    skipTour: () => void
    setCurrentTourStep: (step: number) => void
    resetTour: () => void

    // Tooltip actions
    markTooltipShown: (tooltipId: string) => void
    hasShownTooltip: (tooltipId: string) => boolean

    // Achievement actions
    addAchievement: (achievementId: string) => void
    hasAchievement: (achievementId: string) => boolean

    // Utility actions
    resetOnboarding: () => void
    loadOnboardingState: (state: Partial<OnboardingStoreState>) => void
}

export type OnboardingStore = OnboardingStoreState & OnboardingStoreActions

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
    // Initial state
    hasSeenWelcomeScreen: false,
    hasCompletedTour: false,
    hasSkippedTour: false,
    currentTourStep: 0,
    tooltipsShown: {},
    achievements: [],
    lastUpdated: null,

    // Welcome Screen Actions
    markWelcomeScreenSeen: () => {
        set({
            hasSeenWelcomeScreen: true,
            lastUpdated: Date.now(),
        })
    },

    // Tour Actions
    completeTour: () => {
        set({
            hasCompletedTour: true,
            currentTourStep: 0,
            lastUpdated: Date.now(),
        })
    },

    skipTour: () => {
        set({
            hasSkippedTour: true,
            currentTourStep: 0,
            lastUpdated: Date.now(),
        })
    },

    setCurrentTourStep: (step: number) => {
        set({
            currentTourStep: step,
            lastUpdated: Date.now(),
        })
    },

    resetTour: () => {
        set({
            hasCompletedTour: false,
            hasSkippedTour: false,
            currentTourStep: 0,
            lastUpdated: Date.now(),
        })
    },

    // Tooltip Actions
    markTooltipShown: (tooltipId: string) => {
        const state = get()
        set({
            tooltipsShown: {
                ...state.tooltipsShown,
                [tooltipId]: true,
            },
            lastUpdated: Date.now(),
        })
    },

    hasShownTooltip: (tooltipId: string) => {
        const state = get()
        return state.tooltipsShown[tooltipId] === true
    },

    // Achievement Actions
    addAchievement: (achievementId: string) => {
        const state = get()
        if (!state.achievements.includes(achievementId)) {
            set({
                achievements: [...state.achievements, achievementId],
                lastUpdated: Date.now(),
            })
        }
    },

    hasAchievement: (achievementId: string) => {
        const state = get()
        return state.achievements.includes(achievementId)
    },

    // Utility Actions
    resetOnboarding: () => {
        set({
            hasSeenWelcomeScreen: false,
            hasCompletedTour: false,
            hasSkippedTour: false,
            currentTourStep: 0,
            tooltipsShown: {},
            achievements: [],
            lastUpdated: Date.now(),
        })
    },

    loadOnboardingState: (state: Partial<OnboardingStoreState>) => {
        set({
            ...state,
            lastUpdated: Date.now(),
        })
    },
}))

const FIRST_VISIT_KEY = 'net_trailer_first_visit'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

export interface FirstVisitData {
    hasVisited: boolean
    timestamp: number
}

export const getFirstVisitStatus = (): { isFirstVisit: boolean; shouldShowModal: boolean } => {
    if (typeof window === 'undefined') {
        return { isFirstVisit: true, shouldShowModal: false }
    }

    try {
        const stored = localStorage.getItem(FIRST_VISIT_KEY)

        if (!stored) {
            return { isFirstVisit: true, shouldShowModal: true }
        }

        const data: FirstVisitData = JSON.parse(stored)
        const now = Date.now()
        const timeDifference = now - data.timestamp

        if (timeDifference > CACHE_DURATION) {
            return { isFirstVisit: true, shouldShowModal: true }
        }

        return { isFirstVisit: false, shouldShowModal: false }
    } catch (error) {
        console.error('Error reading first visit data:', error)
        return { isFirstVisit: true, shouldShowModal: true }
    }
}

export const markAsVisited = (): void => {
    if (typeof window === 'undefined') return

    try {
        const data: FirstVisitData = {
            hasVisited: true,
            timestamp: Date.now()
        }
        localStorage.setItem(FIRST_VISIT_KEY, JSON.stringify(data))
    } catch (error) {
        console.error('Error storing first visit data:', error)
    }
}

export const resetFirstVisitStatus = (): void => {
    if (typeof window === 'undefined') return

    try {
        localStorage.removeItem(FIRST_VISIT_KEY)
    } catch (error) {
        console.error('Error resetting first visit data:', error)
    }
}
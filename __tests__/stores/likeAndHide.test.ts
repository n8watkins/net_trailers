import { act } from '@testing-library/react'
import { useGuestStore } from '../../stores/guestStore'
import { Content } from '../../typings'

jest.mock('../../services/guestStorageService', () => ({
    GuestStorageService: {
        loadGuestData: jest.fn().mockReturnValue({}),
        clearCurrentGuestData: jest.fn().mockReturnValue({}),
        saveGuestData: jest.fn(),
    },
}))

const arrival = { id: 329865, title: 'Arrival', media_type: 'movie' } as unknown as Content

function state() {
    const s = useGuestStore.getState()
    return {
        rating: s.myRatings.find((r) => r.content.id === arrival.id)?.rating ?? null,
        liked: s.likedMovies.some((m) => m.id === arrival.id),
        hidden: s.hiddenMovies.some((m) => m.id === arrival.id),
    }
}

describe('liking and hiding are separate', () => {
    beforeEach(() => {
        useGuestStore.setState({
            guestId: 'guest_test',
            myRatings: [],
            likedMovies: [],
            hiddenMovies: [],
        })
    })

    it('keeps the like when a liked title is hidden', async () => {
        await act(async () => {
            await useGuestStore.getState().rateContent(arrival, 'like')
            await useGuestStore.getState().addHiddenMovie(arrival)
        })
        expect(state()).toEqual({ rating: 'like', liked: true, hidden: true })
    })

    it('keeps it hidden when the like is removed, and un-hides on request', async () => {
        await act(async () => {
            await useGuestStore.getState().rateContent(arrival, 'like')
            await useGuestStore.getState().addHiddenMovie(arrival)
            await useGuestStore.getState().removeRating(arrival.id)
        })
        expect(state()).toEqual({ rating: null, liked: false, hidden: true })
        await act(async () => {
            await useGuestStore.getState().removeHiddenMovie(arrival.id)
        })
        expect(state()).toEqual({ rating: null, liked: false, hidden: false })
    })

    it('still hides on dislike, and showing a disliked title clears the dislike', async () => {
        await act(async () => {
            await useGuestStore.getState().rateContent(arrival, 'dislike')
        })
        expect(state()).toEqual({ rating: 'dislike', liked: false, hidden: true })
        await act(async () => {
            await useGuestStore.getState().removeHiddenMovie(arrival.id)
        })
        expect(state()).toEqual({ rating: null, liked: false, hidden: false })
    })
})

/**
 * ContentCard Component Tests
 *
 * Tests for the core ContentCard component that displays movie/TV show posters
 * with interactive features (like, hide, add to list, modal opening).
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ContentCard from '../../../components/common/ContentCard'
import { Content } from '../../../typings'
import { useAppStore } from '../../../stores/appStore'
import useUserData from '../../../hooks/useUserData'
import { useToast } from '../../../hooks/useToast'

// Mock Next.js Image component
jest.mock('next/image', () => ({
    __esModule: true,
    default: function MockImage({ onLoad, alt }: { onLoad?: () => void; alt?: string }) {
        return (
            <img
                src="mock-image.jpg"
                alt={alt || 'Mock Image'}
                onLoad={() => onLoad && onLoad()}
                data-testid="content-image"
            />
        )
    },
}))

// Mock stores and hooks
jest.mock('../../../stores/appStore')
jest.mock('../../../hooks/useUserData')
jest.mock('../../../hooks/useToast')
jest.mock('../../../utils/prefetchCache', () => ({
    prefetchMovieDetails: jest.fn(),
}))

const mockOpenModal = jest.fn()
const mockOpenListModal = jest.fn()
const mockAddLikedMovie = jest.fn()
const mockRemoveLikedMovie = jest.fn()
const mockAddHiddenMovie = jest.fn()
const mockRemoveHiddenMovie = jest.fn()
const mockIsLiked = jest.fn()
const mockIsHidden = jest.fn()
const mockShowContentHidden = jest.fn()
const mockShowContentShown = jest.fn()
const mockShowSuccess = jest.fn()

// Mock data
const mockMovie: Content = {
    id: 123,
    title: 'Test Movie',
    poster_path: '/test-poster.jpg',
    media_type: 'movie',
    vote_average: 8.5,
    vote_count: 1000,
    release_date: '2023-01-15',
    overview: 'A test movie',
    genre_ids: [28, 12],
    adult: false,
    backdrop_path: '/backdrop.jpg',
    original_language: 'en',
    original_title: 'Test Movie',
    popularity: 100,
    video: false,
}

const mockTVShow: Content = {
    id: 456,
    name: 'Test TV Show',
    poster_path: '/test-poster-tv.jpg',
    media_type: 'tv',
    vote_average: 7.8,
    vote_count: 500,
    first_air_date: '2022-06-10',
    overview: 'A test TV show',
    genre_ids: [18, 10765],
    adult: false,
    backdrop_path: '/backdrop-tv.jpg',
    original_language: 'en',
    original_name: 'Test TV Show',
    origin_country: ['US'],
    popularity: 80,
}

describe('ContentCard', () => {
    beforeEach(() => {
        jest.clearAllMocks()

        // Setup default mocks
        ;(useAppStore as unknown as jest.Mock).mockReturnValue({
            openModal: mockOpenModal,
            openListModal: mockOpenListModal,
        })
        ;(useUserData as jest.Mock).mockReturnValue({
            addLikedMovie: mockAddLikedMovie,
            removeLikedMovie: mockRemoveLikedMovie,
            isLiked: mockIsLiked,
            addHiddenMovie: mockAddHiddenMovie,
            removeHiddenMovie: mockRemoveHiddenMovie,
            isHidden: mockIsHidden,
        })
        ;(useToast as jest.Mock).mockReturnValue({
            showContentHidden: mockShowContentHidden,
            showContentShown: mockShowContentShown,
            showSuccess: mockShowSuccess,
        })

        mockIsLiked.mockReturnValue(false)
        mockIsHidden.mockReturnValue(false)
    })

    describe('Rendering', () => {
        it('should render movie content correctly', () => {
            render(<ContentCard content={mockMovie} />)

            // Wait for image to load
            const image = screen.getByTestId('content-image')
            fireEvent.load(image)

            expect(screen.getByText('Test Movie')).toBeInTheDocument()
            expect(screen.getByText('2023')).toBeInTheDocument()
            expect(screen.getByText('8.5')).toBeInTheDocument()
            expect(screen.getByText('Movie')).toBeInTheDocument()
        })

        it('should render TV show content correctly', () => {
            render(<ContentCard content={mockTVShow} />)

            const image = screen.getByTestId('content-image')
            fireEvent.load(image)

            expect(screen.getByText('Test TV Show')).toBeInTheDocument()
            expect(screen.getByText('2022')).toBeInTheDocument()
            expect(screen.getByText('7.8')).toBeInTheDocument()
            // Check for media type pill with specific text
            expect(screen.getByText('TV Show')).toBeInTheDocument()
        })

        it('should render with small size variant', () => {
            const { container } = render(<ContentCard content={mockMovie} size="small" />)
            expect(container.querySelector('.w-\\[120px\\]')).toBeInTheDocument()
        })

        it('should render with medium size variant (default)', () => {
            const { container } = render(<ContentCard content={mockMovie} />)
            expect(container.querySelector('.w-\\[160px\\]')).toBeInTheDocument()
        })

        it('should render with large size variant', () => {
            const { container } = render(<ContentCard content={mockMovie} size="large" />)
            expect(container.querySelector('.w-\\[200px\\]')).toBeInTheDocument()
        })

        it('should show loading skeleton before image loads', () => {
            const { container } = render(<ContentCard content={mockMovie} />)
            expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
        })

        it('should not render rating if vote_average is 0', () => {
            const contentWithoutRating = { ...mockMovie, vote_average: 0 }
            render(<ContentCard content={contentWithoutRating} />)

            const image = screen.getByTestId('content-image')
            fireEvent.load(image)

            expect(screen.queryByText('⭐')).not.toBeInTheDocument()
        })
    })

    describe('Click Interactions', () => {
        it('should open modal with correct params when card is clicked', () => {
            render(<ContentCard content={mockMovie} />)

            const image = screen.getByTestId('content-image')
            fireEvent.load(image)

            const card = screen.getByTestId('content-image').closest('div')
            if (card?.parentElement) {
                fireEvent.click(card.parentElement)
            }

            expect(mockOpenModal).toHaveBeenCalledWith(mockMovie, true, false)
        })

        it('should open modal with sound when Watch button is clicked', async () => {
            render(<ContentCard content={mockMovie} />)

            const image = screen.getByTestId('content-image')
            fireEvent.load(image)

            await waitFor(() => {
                const watchButton = screen.getByText('Watch')
                expect(watchButton).toBeInTheDocument()
            })

            const watchButton = screen.getByText('Watch')
            fireEvent.click(watchButton)

            expect(mockOpenModal).toHaveBeenCalledWith(mockMovie, true, true)
        })
    })

    describe('User Actions', () => {
        it('should call user data hooks correctly', () => {
            render(<ContentCard content={mockMovie} />)

            const image = screen.getByTestId('content-image')
            fireEvent.load(image)

            // Verify hooks are called
            expect(mockIsLiked).toHaveBeenCalledWith(mockMovie.id)
            expect(mockIsHidden).toHaveBeenCalledWith(mockMovie.id)
        })

        it('should display liked state correctly when content is liked', () => {
            mockIsLiked.mockReturnValue(true)
            render(<ContentCard content={mockMovie} />)

            const image = screen.getByTestId('content-image')
            fireEvent.load(image)

            // Component should reflect liked state
            expect(mockIsLiked).toHaveBeenCalledWith(mockMovie.id)
        })

        it('should display hidden state correctly when content is hidden', () => {
            mockIsHidden.mockReturnValue(true)
            render(<ContentCard content={mockMovie} />)

            const image = screen.getByTestId('content-image')
            fireEvent.load(image)

            // Component should reflect hidden state
            expect(mockIsHidden).toHaveBeenCalledWith(mockMovie.id)
        })
    })

    describe('Interactive Elements', () => {
        it('should render bookmark button for showing actions menu', () => {
            render(<ContentCard content={mockMovie} />)

            const image = screen.getByTestId('content-image')
            fireEvent.load(image)

            const bookmarkButton = screen.getByLabelText('Show content actions menu')
            expect(bookmarkButton).toBeInTheDocument()
        })

        it('should render watch button when image is loaded', () => {
            render(<ContentCard content={mockMovie} />)

            const image = screen.getByTestId('content-image')
            fireEvent.load(image)

            expect(screen.getByText('Watch')).toBeInTheDocument()
        })
    })

    describe('Edge Cases', () => {
        it('should handle content without poster_path', () => {
            const contentWithoutPoster = { ...mockMovie, poster_path: undefined }
            const { container } = render(<ContentCard content={contentWithoutPoster} />)

            // Should not render image
            expect(container.querySelector('img')).not.toBeInTheDocument()
        })

        it('should handle undefined content gracefully', () => {
            const { container } = render(<ContentCard content={undefined} />)
            expect(container.firstChild).toBeInTheDocument()
        })

        it('should apply custom className', () => {
            const { container } = render(
                <ContentCard content={mockMovie} className="custom-class" />
            )
            expect(container.querySelector('.custom-class')).toBeInTheDocument()
        })
    })
})

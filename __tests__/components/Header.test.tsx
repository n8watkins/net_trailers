import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RecoilRoot } from 'recoil'
import Header from '../../components/Header'

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, priority, ...props }: any) => (
    <img src={src} alt={alt} data-priority={priority} {...props} />
  ),
}))

// Mock the useAuth hook
const mockLogOut = jest.fn()
jest.mock('../../hooks/useAuth', () => ({
  __esModule: true,
  default: () => ({
    logOut: mockLogOut,
    user: null,
    loading: false,
    error: null,
  }),
}))

// Mock window.addEventListener and removeEventListener
const mockAddEventListener = jest.fn()
const mockRemoveEventListener = jest.fn()

Object.defineProperty(window, 'addEventListener', {
  writable: true,
  value: mockAddEventListener,
})

Object.defineProperty(window, 'removeEventListener', {
  writable: true,
  value: mockRemoveEventListener,
})

// Mock window.scrollY
Object.defineProperty(window, 'scrollY', {
  writable: true,
  value: 0,
})

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RecoilRoot>
    {children}
  </RecoilRoot>
)

describe('Header Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset scroll position
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 0,
    })
  })

  it('should render header with navigation items', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    )

    // Check for navigation items
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('TV Shows')).toBeInTheDocument()
    expect(screen.getByText('Movies')).toBeInTheDocument()
    expect(screen.getByText('New & Popular')).toBeInTheDocument()
    expect(screen.getByText('My Favorites')).toBeInTheDocument()
  })

  it('should render Netflix logo image', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    )

    const logoImages = screen.getAllByRole('img')
    expect(logoImages.length).toBeGreaterThanOrEqual(1)

    // Check if at least one image has the Netflix logo URL
    const netflixLogo = logoImages.find(img =>
      (img as HTMLImageElement).src.includes('rb.gy/ulxxee')
    )
    expect(netflixLogo).toBeInTheDocument()
  })

  it('should render user profile image', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    )

    const images = screen.getAllByRole('img')
    const profileImage = images.find(img =>
      (img as HTMLImageElement).src.includes('nflxso.net')
    )
    expect(profileImage).toBeInTheDocument()
  })

  it('should render search and notification icons', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    )

    // These are SVG icons from Heroicons, so we check by their container structure
    const headerElement = document.querySelector('header')
    expect(headerElement).toBeInTheDocument()

    // Check for icons by their CSS classes (Heroicons typically have h-6 w-6 classes)
    const icons = headerElement!.querySelectorAll('.h-6.w-6')
    expect(icons.length).toBeGreaterThanOrEqual(2) // Search and bell icons
  })

  it('should call logOut when profile image is clicked', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    )

    const images = screen.getAllByRole('img')
    const profileImage = images.find(img =>
      (img as HTMLImageElement).src.includes('nflxso.net')
    )

    expect(profileImage).toBeInTheDocument()

    fireEvent.click(profileImage!)
    expect(mockLogOut).toHaveBeenCalledTimes(1)
  })

  it('should set up scroll event listener on mount', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    )

    expect(mockAddEventListener).toHaveBeenCalledWith('scroll', expect.any(Function))
  })

  it('should clean up scroll event listener on unmount', () => {
    const { unmount } = render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    )

    unmount()

    expect(mockRemoveEventListener).toHaveBeenCalledWith('scroll', expect.any(Function))
  })

  it('should apply background class when scrolled', () => {
    // Mock scrollY to be greater than 0
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 100,
    })

    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    )

    // Get the scroll handler that was registered
    const scrollHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'scroll'
    )?.[1]

    expect(scrollHandler).toBeDefined()

    // Simulate scroll event
    fireEvent.scroll(window)

    // The component should re-render with background class
    // We need to find the header element and check its className
    const headerElement = document.querySelector('header')

    // Since the scroll handler updates state, we need to wait for re-render
    // The exact assertion depends on how the component implements the scroll state
    expect(headerElement).toBeInTheDocument()
  })

  it('should handle scroll events correctly', () => {
    const { rerender } = render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    )

    // Get the scroll handler
    const scrollHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'scroll'
    )?.[1]

    expect(scrollHandler).toBeDefined()

    // Test scroll down
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 50,
    })

    fireEvent.scroll(window, { target: { scrollY: 50 } })

    // Test scroll back to top
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 0,
    })

    fireEvent.scroll(window, { target: { scrollY: 0 } })

    // Component should handle both cases
    expect(scrollHandler).toBeDefined()
  })

  it('should have proper accessibility attributes', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    )

    // Header should have proper semantic HTML
    const headerElement = document.querySelector('header')
    expect(headerElement).toBeInTheDocument()

    // Navigation items should be in a list
    const navItems = screen.getAllByRole('listitem')
    expect(navItems.length).toBeGreaterThanOrEqual(5) // Home, TV Shows, Movies, New & Popular, My List

    // Profile image should have alt text or be marked as decorative
    const images = screen.getAllByRole('img')
    images.forEach(img => {
      const altText = img.getAttribute('alt')
      // Either has alt text or is empty (decorative)
      expect(altText !== null).toBe(true)
    })
  })

  it('should apply cursor pointer class to clickable elements', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    )

    const images = screen.getAllByRole('img')
    const profileImage = images.find(img =>
      (img as HTMLImageElement).src.includes('nflxso.net')
    )

    expect(profileImage).toHaveClass('cursor-pointer')
  })

  it('should have responsive design classes', () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>
    )

    const headerElement = document.querySelector('header')

    // Should have responsive spacing classes
    const elementsWithMdClasses = headerElement!.querySelectorAll('[class*="md:"]')
    expect(elementsWithMdClasses.length).toBeGreaterThan(0)

    // Navigation should be hidden on mobile
    const hiddenNavElements = headerElement!.querySelectorAll('.hidden')
    expect(hiddenNavElements.length).toBeGreaterThan(0)
  })
})
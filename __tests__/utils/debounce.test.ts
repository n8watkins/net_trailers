/**
 * Tests for useDebounce hook
 *
 * Verifies that the debounce utility properly delays value updates
 * and handles rapid changes correctly.
 */

import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '../../utils/debounce'

// Use fake timers for precise control over time
jest.useFakeTimers()

describe('useDebounce Hook', () => {
    afterEach(() => {
        jest.clearAllTimers()
    })

    it('should return the initial value immediately', () => {
        const { result } = renderHook(() => useDebounce('initial', 500))

        expect(result.current).toBe('initial')
    })

    it('should debounce value changes', () => {
        const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
            initialProps: { value: 'initial', delay: 500 },
        })

        expect(result.current).toBe('initial')

        // Update to new value
        rerender({ value: 'updated', delay: 500 })

        // Value should not update immediately
        expect(result.current).toBe('initial')

        // Fast-forward time by delay
        act(() => {
            jest.advanceTimersByTime(500)
        })

        // Now value should be updated
        expect(result.current).toBe('updated')
    })

    it('should cancel previous timeout on rapid changes', () => {
        const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
            initialProps: { value: 'first', delay: 500 },
        })

        // Rapid changes
        rerender({ value: 'second', delay: 500 })
        act(() => {
            jest.advanceTimersByTime(200)
        })

        rerender({ value: 'third', delay: 500 })
        act(() => {
            jest.advanceTimersByTime(200)
        })

        rerender({ value: 'fourth', delay: 500 })

        // Value should still be 'first' (original)
        expect(result.current).toBe('first')

        // Complete the timeout
        act(() => {
            jest.advanceTimersByTime(500)
        })

        // Should skip to the last value
        expect(result.current).toBe('fourth')
    })

    it('should handle different delay values', () => {
        const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
            initialProps: { value: 'initial', delay: 1000 },
        })

        rerender({ value: 'updated', delay: 1000 })

        // 500ms is not enough with 1000ms delay
        act(() => {
            jest.advanceTimersByTime(500)
        })
        expect(result.current).toBe('initial')

        // Complete the 1000ms delay
        act(() => {
            jest.advanceTimersByTime(500)
        })
        expect(result.current).toBe('updated')
    })

    it('should work with different value types', () => {
        // Test with numbers
        const { result: numberResult, rerender: numberRerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            {
                initialProps: { value: 0, delay: 300 },
            }
        )

        numberRerender({ value: 42, delay: 300 })
        act(() => {
            jest.advanceTimersByTime(300)
        })
        expect(numberResult.current).toBe(42)

        // Test with objects
        const { result: objectResult, rerender: objectRerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            {
                initialProps: { value: { count: 0 }, delay: 300 },
            }
        )

        objectRerender({ value: { count: 5 }, delay: 300 })
        act(() => {
            jest.advanceTimersByTime(300)
        })
        expect(objectResult.current).toEqual({ count: 5 })

        // Test with arrays
        const { result: arrayResult, rerender: arrayRerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            {
                initialProps: { value: [1, 2, 3], delay: 300 },
            }
        )

        arrayRerender({ value: [4, 5, 6], delay: 300 })
        act(() => {
            jest.advanceTimersByTime(300)
        })
        expect(arrayResult.current).toEqual([4, 5, 6])
    })

    it('should handle zero delay', () => {
        const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
            initialProps: { value: 'initial', delay: 0 },
        })

        rerender({ value: 'updated', delay: 0 })

        // With 0 delay, should update on next tick
        act(() => {
            jest.advanceTimersByTime(0)
        })

        expect(result.current).toBe('updated')
    })

    it('should cleanup timeout on unmount', () => {
        const { rerender, unmount } = renderHook(({ value, delay }) => useDebounce(value, delay), {
            initialProps: { value: 'initial', delay: 500 },
        })

        rerender({ value: 'updated', delay: 500 })

        // Unmount before timeout completes
        unmount()

        // Advance timers - should not cause errors
        act(() => {
            jest.advanceTimersByTime(500)
        })

        // No assertions needed - test passes if no errors thrown
    })

    it('should handle search query use case (300ms delay)', () => {
        const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
            initialProps: { value: '', delay: 300 },
        })

        // Simulate user typing "hello"
        rerender({ value: 'h', delay: 300 })
        act(() => {
            jest.advanceTimersByTime(100)
        })

        rerender({ value: 'he', delay: 300 })
        act(() => {
            jest.advanceTimersByTime(100)
        })

        rerender({ value: 'hel', delay: 300 })
        act(() => {
            jest.advanceTimersByTime(100)
        })

        rerender({ value: 'hell', delay: 300 })
        act(() => {
            jest.advanceTimersByTime(100)
        })

        rerender({ value: 'hello', delay: 300 })

        // Should still show empty (hasn't waited 300ms since last change)
        expect(result.current).toBe('')

        // Complete the 300ms delay
        act(() => {
            jest.advanceTimersByTime(300)
        })

        // Now should show the final value
        expect(result.current).toBe('hello')
    })

    it('should handle delay changes', () => {
        const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
            initialProps: { value: 'initial', delay: 500 },
        })

        // Change value and delay
        rerender({ value: 'updated', delay: 1000 })

        // Original delay wouldn't be enough
        act(() => {
            jest.advanceTimersByTime(500)
        })
        expect(result.current).toBe('initial')

        // New delay completes
        act(() => {
            jest.advanceTimersByTime(500)
        })
        expect(result.current).toBe('updated')
    })

    it('should handle multiple consecutive updates correctly', () => {
        const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
            initialProps: { value: '1', delay: 500 },
        })

        // First update cycle
        rerender({ value: '2', delay: 500 })
        act(() => {
            jest.advanceTimersByTime(500)
        })
        expect(result.current).toBe('2')

        // Second update cycle
        rerender({ value: '3', delay: 500 })
        act(() => {
            jest.advanceTimersByTime(500)
        })
        expect(result.current).toBe('3')

        // Third update cycle
        rerender({ value: '4', delay: 500 })
        act(() => {
            jest.advanceTimersByTime(500)
        })
        expect(result.current).toBe('4')
    })
})

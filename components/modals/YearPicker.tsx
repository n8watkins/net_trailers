'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDownIcon, ChevronLeftIcon } from '@heroicons/react/24/outline'

interface YearPickerProps {
    value: number | undefined
    onChange: (year: number | undefined) => void
    label: string
    placeholder: string
    minYear?: number
    maxYear?: number
}

export function YearPicker({
    value,
    onChange,
    label,
    placeholder,
    minYear = 1880,
    maxYear = new Date().getFullYear(),
}: YearPickerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [view, setView] = useState<'century' | 'decade' | 'year'>('century')
    const [selectedCentury, setSelectedCentury] = useState<number | null>(null)
    const [selectedDecade, setSelectedDecade] = useState<number | null>(null)
    const [inputValue, setInputValue] = useState(value?.toString() || '')
    const [mounted, setMounted] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })

    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    useEffect(() => {
        setInputValue(value?.toString() || '')
    }, [value])

    // Update dropdown position when opened
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const updatePosition = () => {
                const rect = containerRef.current!.getBoundingClientRect()
                setDropdownPosition({
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                })
            }
            updatePosition()
            window.addEventListener('scroll', updatePosition, true)
            window.addEventListener('resize', updatePosition)
            return () => {
                window.removeEventListener('scroll', updatePosition, true)
                window.removeEventListener('resize', updatePosition)
            }
        }
    }, [isOpen])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false)
                resetView()
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    const resetView = () => {
        setView('century')
        setSelectedCentury(null)
        setSelectedDecade(null)
    }

    // Generate centuries (1900s, 2000s)
    const centuries = []
    const startCentury = Math.floor(minYear / 100) * 100
    const endCentury = Math.floor(maxYear / 100) * 100
    for (let century = startCentury; century <= endCentury; century += 100) {
        centuries.push(century)
    }

    // Generate decades for selected century (1900, 1910, 1920, etc.)
    const getDecades = (century: number) => {
        const decades = []
        for (let decade = century; decade < century + 100; decade += 10) {
            if (decade >= minYear && decade <= maxYear) {
                decades.push(decade)
            }
        }
        return decades
    }

    // Generate years for selected decade (1990, 1991, 1992, etc.)
    const getYears = (decade: number) => {
        const years = []
        for (let year = decade; year < decade + 10; year++) {
            if (year >= minYear && year <= maxYear) {
                years.push(year)
            }
        }
        return years
    }

    const handleCenturyClick = (century: number) => {
        setSelectedCentury(century)
        setView('decade')
    }

    const handleDecadeClick = (decade: number) => {
        setSelectedDecade(decade)
        setView('year')
    }

    const handleYearClick = (year: number) => {
        onChange(year)
        setInputValue(year.toString())
        setIsOpen(false)
        resetView()
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setInputValue(val)

        if (val === '') {
            onChange(undefined)
        } else {
            const num = parseInt(val)
            if (!isNaN(num) && num >= minYear && num <= maxYear) {
                onChange(num)
            }
        }
    }

    const handleBack = () => {
        if (view === 'year') {
            setView('decade')
            setSelectedDecade(null)
        } else if (view === 'decade') {
            setView('century')
            setSelectedCentury(null)
        }
    }

    const getDropdownTitle = () => {
        if (view === 'century') return 'Select Century'
        if (view === 'decade' && selectedCentury) {
            return `${selectedCentury}s - Select Decade`
        }
        if (view === 'year' && selectedDecade) {
            return `${selectedDecade}s - Select Year`
        }
        return 'Select Year'
    }

    const dropdownContent = isOpen && mounted && typeof window !== 'undefined' && (
        <div
            ref={dropdownRef}
            className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-[100001] flex flex-col transition-opacity duration-150 opacity-0 animate-[fadeIn_0.15s_ease-out_forwards]"
            style={{
                bottom: `${window.innerHeight - dropdownPosition.top + 8}px`, // Position bottom of dropdown 8px above input
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`,
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 bg-gray-900 rounded-t-lg">
                {view !== 'century' && (
                    <button
                        onClick={handleBack}
                        className="text-gray-400 hover:text-white transition-all duration-200 hover:scale-110"
                    >
                        <ChevronLeftIcon className="w-4 h-4" />
                    </button>
                )}
                <span className="text-xs text-gray-400 font-medium flex-1 text-center transition-all duration-200">
                    {getDropdownTitle()}
                </span>
                {view !== 'century' && <div className="w-4" />}
            </div>

            {/* Content */}
            <div className="p-2">
                {/* Century view */}
                {view === 'century' && (
                    <div className="grid grid-cols-3 gap-2">
                        {centuries.map((century) => (
                            <button
                                key={century}
                                onClick={() => handleCenturyClick(century)}
                                className="px-3 py-2 text-sm text-white bg-gray-700 hover:bg-gray-600 hover:scale-105 rounded-lg transition-all duration-150 font-medium"
                            >
                                {century}s
                            </button>
                        ))}
                    </div>
                )}

                {/* Decade view */}
                {view === 'decade' && selectedCentury !== null && (
                    <div className="grid grid-cols-3 gap-2">
                        {getDecades(selectedCentury).map((decade) => (
                            <button
                                key={decade}
                                onClick={() => handleDecadeClick(decade)}
                                className="px-3 py-2 text-sm text-white bg-gray-700 hover:bg-gray-600 hover:scale-105 rounded-lg transition-all duration-150 font-medium"
                            >
                                {decade}s
                            </button>
                        ))}
                    </div>
                )}

                {/* Year view */}
                {view === 'year' && selectedDecade !== null && (
                    <div className="grid grid-cols-3 gap-2">
                        {getYears(selectedDecade).map((year) => (
                            <button
                                key={year}
                                onClick={() => handleYearClick(year)}
                                className={`px-3 py-2 text-sm rounded-lg transition-all duration-150 font-medium hover:scale-105 ${
                                    value === year
                                        ? 'bg-red-600 text-white'
                                        : 'bg-gray-700 text-white hover:bg-gray-600'
                                }`}
                            >
                                {year}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )

    return (
        <div className="relative" ref={containerRef}>
            <label className="text-xs text-gray-400 mb-1.5 block">{label}</label>
            <div className="flex gap-2">
                {/* Input field */}
                <input
                    type="number"
                    min={minYear}
                    max={maxYear}
                    placeholder={placeholder}
                    value={inputValue}
                    onChange={handleInputChange}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />

                {/* Dropdown toggle button */}
                <button
                    type="button"
                    onClick={() => {
                        setIsOpen(!isOpen)
                        if (!isOpen) resetView()
                    }}
                    className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
                >
                    <ChevronDownIcon
                        className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                </button>
            </div>

            {/* Dropdown menu (portaled) */}
            {dropdownContent && createPortal(dropdownContent, document.body)}
        </div>
    )
}

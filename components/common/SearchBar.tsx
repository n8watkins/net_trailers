/**
 * SearchBar - Standardized search input
 * Consistent styling and behavior across all pages
 */

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

interface SearchBarProps {
    /** Current search query value */
    value: string
    /** Callback when search value changes */
    onChange: (value: string) => void
    /** Placeholder text */
    placeholder?: string
    /** Focus ring color theme */
    focusColor?: 'purple' | 'green' | 'blue' | 'gray'
}

export default function SearchBar({
    value,
    onChange,
    placeholder = 'Search...',
    focusColor = 'purple',
}: SearchBarProps) {
    const focusColorClasses = {
        purple: 'focus:ring-purple-500',
        green: 'focus:ring-green-500',
        blue: 'focus:ring-blue-500',
        gray: 'focus:ring-gray-400',
    }

    return (
        <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
                type="text"
                placeholder={placeholder}
                className={`w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 ${focusColorClasses[focusColor]} focus:border-transparent transition-all duration-200`}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    )
}

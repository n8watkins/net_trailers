import React from 'react'

interface ToggleSwitchProps {
    enabled: boolean
    onToggle: () => void
    title: string
    activeColor?: 'blue' | 'green' | 'red'
    size?: 'small' | 'medium'
}

export default function ToggleSwitch({
    enabled,
    onToggle,
    title,
    activeColor = 'blue',
    size = 'medium',
}: ToggleSwitchProps) {
    const sizeClasses = size === 'small' ? 'h-5 w-9' : 'h-6 w-11'
    const dotSizeClasses = size === 'small' ? 'h-4 w-4' : 'h-5 w-5'
    const translateClasses = size === 'small' ? 'translate-x-4' : 'translate-x-5'

    const colorClasses = {
        blue: 'bg-blue-600',
        green: 'bg-green-600',
        red: 'bg-red-600',
    }

    return (
        <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">{title}</span>
            <button
                type="button"
                onClick={onToggle}
                className={`${sizeClasses} relative inline-flex flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                    enabled ? colorClasses[activeColor] : 'bg-gray-600'
                }`}
                role="switch"
                aria-checked={enabled}
            >
                <span
                    className={`${dotSizeClasses} ${
                        enabled ? translateClasses : 'translate-x-0'
                    } pointer-events-none inline-block transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
            </button>
        </div>
    )
}

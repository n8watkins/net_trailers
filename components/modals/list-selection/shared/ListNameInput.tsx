import React, { KeyboardEvent } from 'react'

interface ListNameInputProps {
    value: string
    onChange: (value: string) => void
    onSave: () => void
    onCancel: () => void
    placeholder?: string
    autoFocus?: boolean
    size?: 'small' | 'large'
}

export default function ListNameInput({
    value,
    onChange,
    onSave,
    onCancel,
    placeholder = 'List name',
    autoFocus = false,
    size = 'large',
}: ListNameInputProps) {
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            onSave()
        } else if (e.key === 'Escape') {
            e.preventDefault()
            onCancel()
        }
    }

    const sizeClasses = size === 'small' ? 'text-sm px-3 py-1.5' : 'text-base px-4 py-2'

    return (
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={`${sizeClasses} w-full bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors duration-200`}
        />
    )
}

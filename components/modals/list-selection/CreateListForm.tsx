import React from 'react'
import IconPickerButton from './shared/IconPickerButton'
import ColorPickerButton from './shared/ColorPickerButton'
import ListNameInput from './shared/ListNameInput'

interface CreateListFormProps {
    formState: {
        name: string
        emoji: string
        color: string
    }
    onUpdateState: (updates: Partial<CreateListFormProps['formState']>) => void
    onCreate: () => void
    onCancel: () => void
}

export default function CreateListForm({
    formState,
    onUpdateState,
    onCreate,
    onCancel,
}: CreateListFormProps) {
    return (
        <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3">Create New Collection</h3>

            <div className="flex items-center gap-3 mb-4">
                {/* Icon Picker */}
                <IconPickerButton
                    selectedIcon={formState.emoji}
                    onSelectIcon={(emoji) => onUpdateState({ emoji })}
                    size="large"
                />

                {/* Color Picker */}
                <ColorPickerButton
                    selectedColor={formState.color}
                    onSelectColor={(color) => onUpdateState({ color })}
                    size="large"
                />

                {/* Name Input */}
                <div className="flex-1">
                    <ListNameInput
                        value={formState.name}
                        onChange={(name) => onUpdateState({ name })}
                        onSave={onCreate}
                        onCancel={onCancel}
                        placeholder="Collection name"
                        autoFocus
                        size="large"
                    />
                </div>
            </div>

            <div className="flex justify-end gap-2">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200"
                >
                    Cancel
                </button>
                <button
                    onClick={onCreate}
                    disabled={!formState.name.trim()}
                    className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
                >
                    Create Collection
                </button>
            </div>
        </div>
    )
}

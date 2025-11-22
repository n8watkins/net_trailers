import React from 'react'
import { UserList } from '../../../types/collections'
import IconPickerButton from './shared/IconPickerButton'
import ColorPickerButton from './shared/ColorPickerButton'
import ListNameInput from './shared/ListNameInput'
import ToggleSwitch from './shared/ToggleSwitch'
import EditActionButtons from './shared/EditActionButtons'

interface InlineListEditorProps {
    list: UserList
    editingState: {
        name: string
        emoji: string
        color: string
        isPublic: boolean
        displayAsRow: boolean
    }
    onUpdateState: (updates: Partial<InlineListEditorProps['editingState']>) => void
    onSave: (listId: string, originalName: string) => void
    onCancel: () => void
    hexToRgba: (hex: string, opacity: number) => string
}

export default function InlineListEditor({
    list,
    editingState,
    onUpdateState,
    onSave,
    onCancel,
    hexToRgba,
}: InlineListEditorProps) {
    const currentColor = editingState.color || list.color || '#6b7280'

    return (
        <div
            className="w-full p-4 rounded-lg border-l-[6px] border-t border-r border-b transition-all duration-200"
            style={{
                borderLeftColor: currentColor,
                borderTopColor: hexToRgba(currentColor, 0.5),
                borderRightColor: hexToRgba(currentColor, 0.5),
                borderBottomColor: hexToRgba(currentColor, 0.5),
                backgroundColor: hexToRgba(currentColor, 0.2),
            }}
        >
            <div className="flex items-center space-x-2">
                {/* Icon Picker */}
                <IconPickerButton
                    selectedIcon={editingState.emoji}
                    onSelectIcon={(emoji) => onUpdateState({ emoji })}
                    size="small"
                    className="w-8 h-8 text-lg"
                />

                {/* Color Picker */}
                <ColorPickerButton
                    selectedColor={currentColor}
                    onSelectColor={(color) => onUpdateState({ color })}
                    size="small"
                    className="w-8 h-8"
                />

                {/* Name Input */}
                <div className="flex-1">
                    <ListNameInput
                        value={editingState.name}
                        onChange={(name) => onUpdateState({ name })}
                        onSave={() => onSave(list.id, list.name)}
                        onCancel={onCancel}
                        placeholder="List name"
                        autoFocus
                        size="small"
                    />
                </div>

                {/* Save/Cancel Buttons */}
                <EditActionButtons
                    onSave={() => onSave(list.id, list.name)}
                    onCancel={onCancel}
                    size="small"
                />
            </div>

            {/* Toggles */}
            <div className="mt-3 space-y-2">
                <ToggleSwitch
                    enabled={editingState.displayAsRow}
                    onToggle={() => onUpdateState({ displayAsRow: !editingState.displayAsRow })}
                    title="Display as Row"
                    activeColor="blue"
                    size="small"
                />

                <ToggleSwitch
                    enabled={editingState.isPublic}
                    onToggle={() => onUpdateState({ isPublic: !editingState.isPublic })}
                    title="Public"
                    activeColor="green"
                    size="small"
                />
            </div>
        </div>
    )
}

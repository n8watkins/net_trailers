'use client'

import { useState, useEffect, useRef } from 'react'
import { XMarkIcon, LockClosedIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useChildSafetyPINStore } from '../../stores/childSafetyStore'
import { useSessionStore } from '../../stores/sessionStore'
import { PIN_CONSTRAINTS } from '../../types/childSafety'
import { useToast } from '../../hooks/useToast'

interface ChildSafetyPINModalProps {
    /** Modal mode: 'create', 'verify', or 'change' */
    mode: 'create' | 'verify' | 'change'

    /** Whether modal is open */
    isOpen: boolean

    /** Callback when modal closes */
    onClose: () => void

    /** Callback on successful verification (verify mode only) */
    onVerified?: () => void

    /** Custom title override */
    title?: string

    /** Custom description override */
    description?: string
}

/**
 * ChildSafetyPINModal Component
 *
 * Unified modal for PIN creation, verification, and changes.
 * Features:
 * - 4-6 digit numeric PIN input with dots
 * - Real-time validation
 * - Rate limiting display
 * - Accessible keyboard navigation
 */
export default function ChildSafetyPINModal({
    mode,
    isOpen,
    onClose,
    onVerified,
    title,
    description,
}: ChildSafetyPINModalProps) {
    const [pin, setPin] = useState('')
    const [confirmPin, setConfirmPin] = useState('')
    const [oldPin, setOldPin] = useState('')
    const [showOldPin, setShowOldPin] = useState(false)
    const [showPin, setShowPin] = useState(false)
    const [showConfirmPin, setShowConfirmPin] = useState(false)

    const pinInputRef = useRef<HTMLInputElement>(null)

    const { verifyPIN, createPIN, updatePIN, isLoading, error } = useChildSafetyPINStore()
    const getUserId = useSessionStore((state) => state.getUserId)
    const sessionType = useSessionStore((state) => state.sessionType)
    const { showSuccess, showError } = useToast()

    const isGuest = sessionType === 'guest'
    const userId = getUserId()

    // Focus PIN input when modal opens
    useEffect(() => {
        if (isOpen && pinInputRef.current) {
            setTimeout(() => pinInputRef.current?.focus(), 100)
        }
    }, [isOpen])

    // Reset form when modal closes or mode changes
    useEffect(() => {
        if (!isOpen) {
            setPin('')
            setConfirmPin('')
            setOldPin('')
            setShowPin(false)
            setShowConfirmPin(false)
            setShowOldPin(false)
        }
    }, [isOpen, mode])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!userId) {
            showError('User not found', 'Please sign in to continue')
            return
        }

        try {
            if (mode === 'verify') {
                // Verify existing PIN
                const success = await verifyPIN(userId, pin, isGuest)
                if (success) {
                    showSuccess('PIN Verified')
                    onVerified?.()
                    onClose()
                }
            } else if (mode === 'create') {
                // Create new PIN
                if (pin !== confirmPin) {
                    showError('PINs do not match', 'Please make sure both PINs are identical')
                    return
                }
                await createPIN(userId, pin, isGuest)
                showSuccess('PIN Created', 'Your Child Safety Mode is now protected')
                onClose()
            } else if (mode === 'change') {
                // Change existing PIN
                if (pin !== confirmPin) {
                    showError('PINs do not match', 'Please make sure both new PINs are identical')
                    return
                }
                await updatePIN(userId, oldPin, pin, isGuest)
                showSuccess('PIN Updated', 'Your PIN has been changed successfully')
                onClose()
            }
        } catch (error) {
            // Error already handled by store and displayed in UI
            console.error('PIN operation error:', error)
        }
    }

    const handlePinChange = (value: string, setter: (val: string) => void) => {
        // Only allow numbers
        const numbers = value.replace(/\D/g, '')
        // Limit to max length
        const limited = numbers.slice(0, PIN_CONSTRAINTS.MAX_LENGTH)
        setter(limited)
    }

    const isPinValid = (pinValue: string) => {
        return (
            pinValue.length >= PIN_CONSTRAINTS.MIN_LENGTH &&
            pinValue.length <= PIN_CONSTRAINTS.MAX_LENGTH
        )
    }

    const canSubmit = () => {
        if (mode === 'verify') {
            return isPinValid(pin)
        } else if (mode === 'create') {
            return isPinValid(pin) && pin === confirmPin
        } else if (mode === 'change') {
            return isPinValid(oldPin) && isPinValid(pin) && pin === confirmPin && pin !== oldPin
        }
        return false
    }

    if (!isOpen) return null

    const defaultTitles = {
        create: 'Create PIN',
        verify: 'Enter PIN',
        change: 'Change PIN',
    }

    const defaultDescriptions = {
        create: `Create a ${PIN_CONSTRAINTS.MIN_LENGTH}-${PIN_CONSTRAINTS.MAX_LENGTH} digit PIN to protect Child Safety Mode`,
        verify: 'Enter your PIN to continue',
        change: 'Enter your current PIN and choose a new one',
    }

    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70" onClick={onClose} />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-md rounded-lg bg-[#181818] p-8 shadow-xl">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-full bg-red-600/20 p-2">
                            <LockClosedIcon className="h-6 w-6 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">
                            {title || defaultTitles[mode]}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white transition"
                        aria-label="Close modal"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <p className="mb-6 text-sm text-gray-400">
                    {description || defaultDescriptions[mode]}
                </p>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Old PIN (change mode only) */}
                    {mode === 'change' && (
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-300">
                                Current PIN
                            </label>
                            <div className="relative">
                                <input
                                    type={showOldPin ? 'text' : 'password'}
                                    value={oldPin}
                                    onChange={(e) => handlePinChange(e.target.value, setOldPin)}
                                    className="w-full rounded-md bg-[#333] px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"
                                    placeholder="Enter current PIN"
                                    inputMode="numeric"
                                    pattern="\d*"
                                    maxLength={PIN_CONSTRAINTS.MAX_LENGTH}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowOldPin(!showOldPin)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 hover:text-white"
                                >
                                    {showOldPin ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* PIN Input */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                            {mode === 'change' ? 'New PIN' : 'PIN'}
                        </label>
                        <div className="relative">
                            <input
                                ref={pinInputRef}
                                type={showPin ? 'text' : 'password'}
                                value={pin}
                                onChange={(e) => handlePinChange(e.target.value, setPin)}
                                className="w-full rounded-md bg-[#333] px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"
                                placeholder={`${PIN_CONSTRAINTS.MIN_LENGTH}-${PIN_CONSTRAINTS.MAX_LENGTH} digits`}
                                inputMode="numeric"
                                pattern="\d*"
                                maxLength={PIN_CONSTRAINTS.MAX_LENGTH}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPin(!showPin)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 hover:text-white"
                            >
                                {showPin ? 'Hide' : 'Show'}
                            </button>
                        </div>
                        {pin.length > 0 && !isPinValid(pin) && (
                            <p className="mt-1 text-xs text-red-500">
                                PIN must be {PIN_CONSTRAINTS.MIN_LENGTH}-
                                {PIN_CONSTRAINTS.MAX_LENGTH} digits
                            </p>
                        )}
                    </div>

                    {/* Confirm PIN (create and change modes) */}
                    {(mode === 'create' || mode === 'change') && (
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-300">
                                Confirm {mode === 'change' ? 'New ' : ''}PIN
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPin ? 'text' : 'password'}
                                    value={confirmPin}
                                    onChange={(e) => handlePinChange(e.target.value, setConfirmPin)}
                                    className="w-full rounded-md bg-[#333] px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"
                                    placeholder="Re-enter PIN"
                                    inputMode="numeric"
                                    pattern="\d*"
                                    maxLength={PIN_CONSTRAINTS.MAX_LENGTH}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPin(!showConfirmPin)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 hover:text-white"
                                >
                                    {showConfirmPin ? 'Hide' : 'Show'}
                                </button>
                            </div>
                            {confirmPin.length > 0 && pin !== confirmPin && (
                                <p className="mt-1 text-xs text-red-500">PINs do not match</p>
                            )}
                            {mode === 'change' && pin.length > 0 && pin === oldPin && (
                                <p className="mt-1 text-xs text-yellow-500">
                                    New PIN must be different from current PIN
                                </p>
                            )}
                        </div>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className="rounded-md bg-red-600/20 px-4 py-3 text-sm text-red-500">
                            {error}
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-md bg-white/10 px-4 py-3 font-medium text-white hover:bg-white/20 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!canSubmit() || isLoading}
                            className="flex-1 rounded-md bg-red-600 px-4 py-3 font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 transition flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <CheckIcon className="h-5 w-5" />
                                    <span>
                                        {mode === 'verify'
                                            ? 'Verify'
                                            : mode === 'create'
                                              ? 'Create PIN'
                                              : 'Change PIN'}
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Help Text */}
                <div className="mt-6 rounded-md bg-blue-600/10 px-4 py-3 text-sm text-blue-400">
                    <p className="font-medium mb-1">💡 Tip</p>
                    <p className="text-xs">
                        {mode === 'create'
                            ? 'Choose a PIN that is easy for you to remember but hard for children to guess.'
                            : mode === 'verify'
                              ? 'This PIN protects your Child Safety Mode settings from unauthorized changes.'
                              : 'Make sure to remember your new PIN. You will need it to change Child Safety Mode settings.'}
                    </p>
                </div>
            </div>
        </div>
    )
}

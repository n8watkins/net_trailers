import { useRecoilState } from 'recoil'
import { errorsState, AppError } from '../atoms/errorAtom'
import { XMarkIcon, ExclamationTriangleIcon, InformationCircleIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { useEffect } from 'react'

export default function ErrorToast() {
    const [errors, setErrors] = useRecoilState(errorsState)

    const dismissError = (errorId: string) => {
        setErrors(prev => prev.filter(error => error.id !== errorId))
    }

    const getErrorIcon = (type: AppError['type'], message: string) => {
        // Check if it's a success message (positive auth message)
        if (type === 'auth' && (message.includes('sent') || message.includes('success') || message.includes('Success'))) {
            return <CheckCircleIcon className="h-6 w-6 text-green-500" />
        }

        switch (type) {
            case 'auth':
                return <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
            case 'api':
                return <InformationCircleIcon className="h-6 w-6 text-blue-500" />
            case 'network':
                return <ExclamationCircleIcon className="h-6 w-6 text-orange-500" />
            case 'validation':
                return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />
            default:
                return <InformationCircleIcon className="h-6 w-6 text-gray-500" />
        }
    }

    const getErrorStyles = (type: AppError['type'], message: string) => {
        const baseStyles = "pointer-events-auto max-w-md rounded-lg p-4 shadow-lg transition-all duration-300 transform translate-x-0 opacity-100"

        // Success styling for positive auth messages
        if (type === 'auth' && (message.includes('sent') || message.includes('success') || message.includes('Success'))) {
            return `${baseStyles} bg-green-50 border border-green-200 dark:bg-green-900 dark:border-green-700`
        }

        switch (type) {
            case 'auth':
                return `${baseStyles} bg-red-50 border border-red-200 dark:bg-red-900 dark:border-red-700`
            case 'api':
                return `${baseStyles} bg-blue-50 border border-blue-200 dark:bg-blue-900 dark:border-blue-700`
            case 'network':
                return `${baseStyles} bg-orange-50 border border-orange-200 dark:bg-orange-900 dark:border-orange-700`
            case 'validation':
                return `${baseStyles} bg-yellow-50 border border-yellow-200 dark:bg-yellow-900 dark:border-yellow-700`
            default:
                return `${baseStyles} bg-gray-50 border border-gray-200 dark:bg-gray-900 dark:border-gray-700`
        }
    }

    const getTextColor = (type: AppError['type'], message: string) => {
        // Success text color
        if (type === 'auth' && (message.includes('sent') || message.includes('success') || message.includes('Success'))) {
            return 'text-green-900 dark:text-green-100'
        }

        switch (type) {
            case 'auth':
                return 'text-red-900 dark:text-red-100'
            case 'api':
                return 'text-blue-900 dark:text-blue-100'
            case 'network':
                return 'text-orange-900 dark:text-orange-100'
            case 'validation':
                return 'text-yellow-900 dark:text-yellow-100'
            default:
                return 'text-gray-900 dark:text-gray-100'
        }
    }

    return (
        <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-end justify-start p-4 space-y-2">
            {errors.map((error, index) => (
                <div
                    key={error.id}
                    className={getErrorStyles(error.type, error.message)}
                    style={{
                        animation: 'slideInRight 0.3s ease-out, fadeOut 0.3s ease-in 4.7s forwards'
                    }}
                >
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            {getErrorIcon(error.type, error.message)}
                        </div>
                        <div className="ml-3 flex-1">
                            <p className={`text-sm font-medium ${getTextColor(error.type, error.message)}`}>
                                {error.message}
                            </p>
                            {error.details && (
                                <p className={`mt-1 text-xs opacity-70 ${getTextColor(error.type, error.message)}`}>
                                    {error.details}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => dismissError(error.id)}
                            className={`ml-4 flex-shrink-0 rounded-md bg-transparent p-1 hover:bg-black/10 dark:hover:bg-white/10 ${getTextColor(error.type, error.message)}`}
                        >
                            <XMarkIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            ))}

            <style jsx>{`
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                @keyframes fadeOut {
                    from {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                }
            `}</style>
        </div>
    )
}
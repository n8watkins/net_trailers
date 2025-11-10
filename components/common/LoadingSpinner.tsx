/**
 * LoadingSpinner - Standardized loading state
 * Consistent across all pages that need loading indication
 */

interface LoadingSpinnerProps {
    /** Spinner color (default: purple) */
    color?: 'purple' | 'green' | 'blue' | 'gray'
    /** Size of the spinner */
    size?: 'sm' | 'md' | 'lg'
}

export default function LoadingSpinner({ color = 'purple', size = 'lg' }: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: 'h-8 w-8 border-3',
        md: 'h-10 w-10 border-3',
        lg: 'h-12 w-12 border-4',
    }

    const colorClasses = {
        purple: 'border-purple-600',
        green: 'border-green-600',
        blue: 'border-blue-600',
        gray: 'border-gray-600',
    }

    return (
        <div className="flex items-center justify-center py-20">
            <div
                className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin rounded-full border-t-transparent`}
            ></div>
        </div>
    )
}

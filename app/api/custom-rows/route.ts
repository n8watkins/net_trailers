import { NextRequest, NextResponse } from 'next/server'
import { CustomRowsFirestore } from '../../../utils/firestore/customRows'
import {
    CustomRowFormData,
    CUSTOM_ROW_CONSTRAINTS,
    CustomRowValidationError,
} from '../../../types/customRows'

/**
 * Helper to extract userId from request headers
 *
 * The userId is sent from the client in the X-User-ID header.
 * For authenticated users: Firebase UID
 * For guest users: Guest ID from localStorage
 */
function getUserIdFromRequest(request: NextRequest): string | null {
    return request.headers.get('X-User-ID') || null
}

/**
 * Validate custom row form data
 *
 * @param data - Form data to validate
 * @returns Validation error or null if valid
 */
function validateCustomRowData(data: CustomRowFormData): CustomRowValidationError | null {
    // Validate name length
    if (data.name.length < CUSTOM_ROW_CONSTRAINTS.MIN_NAME_LENGTH) {
        return 'NAME_TOO_SHORT'
    }
    if (data.name.length > CUSTOM_ROW_CONSTRAINTS.MAX_NAME_LENGTH) {
        return 'NAME_TOO_LONG'
    }

    // Validate genres count
    if (data.genres.length < CUSTOM_ROW_CONSTRAINTS.MIN_GENRES_PER_ROW) {
        return 'MIN_GENRES_REQUIRED'
    }
    if (data.genres.length > CUSTOM_ROW_CONSTRAINTS.MAX_GENRES_PER_ROW) {
        return 'MAX_GENRES_EXCEEDED'
    }

    // Validate genreLogic
    if (data.genreLogic !== 'AND' && data.genreLogic !== 'OR') {
        return 'INVALID_GENRE_LOGIC'
    }

    // Validate mediaType
    if (data.mediaType !== 'movie' && data.mediaType !== 'tv') {
        return 'INVALID_MEDIA_TYPE'
    }

    // Validate at least one display page is selected
    if (!data.displayOn.main && !data.displayOn.movies && !data.displayOn.tvShows) {
        return 'NO_DISPLAY_PAGES'
    }

    return null
}

/**
 * GET /api/custom-rows
 *
 * Get all custom rows for the authenticated user.
 *
 * Headers:
 *   X-User-ID: string (required) - Firebase UID or Guest ID
 *
 * Response: { rows: CustomRow[] }
 */
export async function GET(request: NextRequest) {
    try {
        const userId = getUserIdFromRequest(request)

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'User ID is required' },
                { status: 401 }
            )
        }

        const rows = await CustomRowsFirestore.getUserCustomRows(userId)

        return NextResponse.json({ rows }, { status: 200 })
    } catch (error) {
        console.error('[Custom Rows API] GET error:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                message:
                    process.env.NODE_ENV === 'development'
                        ? (error as Error).message
                        : 'Failed to fetch custom rows',
            },
            { status: 500 }
        )
    }
}

/**
 * POST /api/custom-rows
 *
 * Create a new custom row.
 *
 * Headers:
 *   X-User-ID: string (required) - Firebase UID or Guest ID
 *
 * Body: CustomRowFormData
 *
 * Response: { success: boolean, rowId: string, row: CustomRow }
 */
export async function POST(request: NextRequest) {
    try {
        const userId = getUserIdFromRequest(request)

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'User ID is required' },
                { status: 401 }
            )
        }

        const body: CustomRowFormData = await request.json()

        // Validate form data
        const validationError = validateCustomRowData(body)
        if (validationError) {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    validationError,
                    message: getValidationErrorMessage(validationError),
                },
                { status: 400 }
            )
        }

        // Create the custom row
        const row = await CustomRowsFirestore.createCustomRow(userId, body)

        return NextResponse.json(
            {
                success: true,
                rowId: row.id,
                row,
            },
            { status: 201 }
        )
    } catch (error) {
        console.error('[Custom Rows API] POST error:', error)

        // Handle specific error cases
        const errorMessage = (error as Error).message

        if (errorMessage.includes('Cannot create more than')) {
            return NextResponse.json(
                {
                    error: 'Max rows exceeded',
                    message: `You can only create up to ${CUSTOM_ROW_CONSTRAINTS.MAX_ROWS_PER_USER} custom rows`,
                    validationError: 'MAX_ROWS_EXCEEDED',
                },
                { status: 400 }
            )
        }

        return NextResponse.json(
            {
                error: 'Internal server error',
                message:
                    process.env.NODE_ENV === 'development'
                        ? errorMessage
                        : 'Failed to create custom row',
            },
            { status: 500 }
        )
    }
}

/**
 * Get user-friendly error message for validation errors
 */
function getValidationErrorMessage(error: CustomRowValidationError): string {
    switch (error) {
        case 'MAX_ROWS_EXCEEDED':
            return `Maximum ${CUSTOM_ROW_CONSTRAINTS.MAX_ROWS_PER_USER} rows allowed`
        case 'MAX_GENRES_EXCEEDED':
            return `Maximum ${CUSTOM_ROW_CONSTRAINTS.MAX_GENRES_PER_ROW} genres allowed`
        case 'MIN_GENRES_REQUIRED':
            return `At least ${CUSTOM_ROW_CONSTRAINTS.MIN_GENRES_PER_ROW} genre required`
        case 'NAME_TOO_SHORT':
            return `Name must be at least ${CUSTOM_ROW_CONSTRAINTS.MIN_NAME_LENGTH} characters`
        case 'NAME_TOO_LONG':
            return `Name must be at most ${CUSTOM_ROW_CONSTRAINTS.MAX_NAME_LENGTH} characters`
        case 'NO_DISPLAY_PAGES':
            return 'At least one display page must be selected'
        case 'INVALID_GENRE_LOGIC':
            return 'Genre logic must be AND or OR'
        case 'INVALID_MEDIA_TYPE':
            return 'Media type must be movie or tv'
        default:
            return 'Validation failed'
    }
}

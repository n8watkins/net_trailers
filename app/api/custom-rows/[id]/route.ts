import { NextRequest, NextResponse } from 'next/server'
import { CustomRowsFirestore } from '../../../../utils/firestore/customRows'
import { CustomRowFormData, CUSTOM_ROW_CONSTRAINTS } from '../../../../types/customRows'

/**
 * Helper to extract userId from request headers
 */
function getUserIdFromRequest(request: NextRequest): string | null {
    return request.headers.get('X-User-ID') || null
}

/**
 * PUT /api/custom-rows/[id]
 *
 * Update an existing custom row.
 *
 * Headers:
 *   X-User-ID: string (required) - Firebase UID or Guest ID
 *
 * Body: Partial<CustomRowFormData>
 *
 * Response: { success: boolean, row: CustomRow }
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: rowId } = await params
        const userId = getUserIdFromRequest(request)

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'User ID is required' },
                { status: 401 }
            )
        }

        const updates: Partial<CustomRowFormData> = await request.json()

        // Validate updates if provided
        if (updates.name !== undefined) {
            if (
                updates.name.length < CUSTOM_ROW_CONSTRAINTS.MIN_NAME_LENGTH ||
                updates.name.length > CUSTOM_ROW_CONSTRAINTS.MAX_NAME_LENGTH
            ) {
                return NextResponse.json(
                    {
                        error: 'Validation failed',
                        message: `Name must be ${CUSTOM_ROW_CONSTRAINTS.MIN_NAME_LENGTH}-${CUSTOM_ROW_CONSTRAINTS.MAX_NAME_LENGTH} characters`,
                    },
                    { status: 400 }
                )
            }
        }

        if (updates.genres !== undefined) {
            if (
                updates.genres.length < CUSTOM_ROW_CONSTRAINTS.MIN_GENRES_PER_ROW ||
                updates.genres.length > CUSTOM_ROW_CONSTRAINTS.MAX_GENRES_PER_ROW
            ) {
                return NextResponse.json(
                    {
                        error: 'Validation failed',
                        message: `Genres must be ${CUSTOM_ROW_CONSTRAINTS.MIN_GENRES_PER_ROW}-${CUSTOM_ROW_CONSTRAINTS.MAX_GENRES_PER_ROW} items`,
                    },
                    { status: 400 }
                )
            }
        }

        // Update the row
        const updatedRow = await CustomRowsFirestore.updateCustomRow(userId, rowId, updates)

        return NextResponse.json(
            {
                success: true,
                row: updatedRow,
            },
            { status: 200 }
        )
    } catch (error) {
        console.error('[Custom Rows API] PUT error:', error)

        const errorMessage = (error as Error).message

        // Handle specific errors
        if (errorMessage.includes('not found')) {
            return NextResponse.json({ error: 'Not found', message: errorMessage }, { status: 404 })
        }

        if (errorMessage.includes('Unauthorized')) {
            return NextResponse.json(
                { error: 'Unauthorized', message: errorMessage },
                { status: 403 }
            )
        }

        return NextResponse.json(
            {
                error: 'Internal server error',
                message:
                    process.env.NODE_ENV === 'development'
                        ? errorMessage
                        : 'Failed to update custom row',
            },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/custom-rows/[id]
 *
 * Delete a custom row.
 *
 * Headers:
 *   X-User-ID: string (required) - Firebase UID or Guest ID
 *
 * Response: { success: boolean, message: string }
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: rowId } = await params
        const userId = getUserIdFromRequest(request)

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'User ID is required' },
                { status: 401 }
            )
        }

        // Delete the row
        await CustomRowsFirestore.deleteCustomRow(userId, rowId)

        return NextResponse.json(
            {
                success: true,
                message: 'Custom row deleted successfully',
            },
            { status: 200 }
        )
    } catch (error) {
        console.error('[Custom Rows API] DELETE error:', error)

        const errorMessage = (error as Error).message

        // Handle specific errors
        if (errorMessage.includes('not found')) {
            return NextResponse.json({ error: 'Not found', message: errorMessage }, { status: 404 })
        }

        if (errorMessage.includes('Unauthorized')) {
            return NextResponse.json(
                { error: 'Unauthorized', message: errorMessage },
                { status: 403 }
            )
        }

        return NextResponse.json(
            {
                error: 'Internal server error',
                message:
                    process.env.NODE_ENV === 'development'
                        ? errorMessage
                        : 'Failed to delete custom row',
            },
            { status: 500 }
        )
    }
}

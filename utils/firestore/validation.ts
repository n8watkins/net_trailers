/**
 * Input validation utilities for Firestore operations
 */

import { ValidationError } from './errors'
import {
    CreateRankingRequest,
    UpdateRankingRequest,
    RANKING_CONSTRAINTS,
} from '../../types/rankings'
import { UpdateProfileRequest, PROFILE_CONSTRAINTS } from '../../types/profile'

/**
 * Sanitize text input by removing potential XSS vectors
 *
 * Note: This function provides basic sanitization by trimming whitespace.
 * React automatically escapes text content when rendering, providing XSS protection.
 * For user-generated HTML content (not used here), use a library like DOMPurify.
 */
export function sanitizeText(text: string): string {
    // React handles XSS prevention by automatically escaping text content
    // We only need to trim whitespace and normalize line breaks
    return text.trim().replace(/\r\n/g, '\n')
}

/**
 * Validate ranking creation request
 */
export function validateRankingCreation(request: CreateRankingRequest): void {
    // Title validation
    if (!request.title || request.title.trim().length === 0) {
        throw new ValidationError('Title is required')
    }

    const titleLength = request.title.trim().length
    if (titleLength < RANKING_CONSTRAINTS.MIN_TITLE_LENGTH) {
        throw new ValidationError(
            `Title must be at least ${RANKING_CONSTRAINTS.MIN_TITLE_LENGTH} characters`
        )
    }

    if (titleLength > RANKING_CONSTRAINTS.MAX_TITLE_LENGTH) {
        throw new ValidationError(
            `Title must be less than ${RANKING_CONSTRAINTS.MAX_TITLE_LENGTH} characters`
        )
    }

    // Description validation
    if (request.description) {
        const descLength = request.description.trim().length
        if (descLength > RANKING_CONSTRAINTS.MAX_DESCRIPTION_LENGTH) {
            throw new ValidationError(
                `Description must be less than ${RANKING_CONSTRAINTS.MAX_DESCRIPTION_LENGTH} characters`
            )
        }
    }

    // Item count validation
    if (
        request.itemCount < RANKING_CONSTRAINTS.MIN_ITEM_COUNT ||
        request.itemCount > RANKING_CONSTRAINTS.MAX_ITEM_COUNT
    ) {
        throw new ValidationError(
            `Item count must be between ${RANKING_CONSTRAINTS.MIN_ITEM_COUNT} and ${RANKING_CONSTRAINTS.MAX_ITEM_COUNT}`
        )
    }

    // Tags validation
    if (request.tags && request.tags.length > RANKING_CONSTRAINTS.MAX_TAGS) {
        throw new ValidationError(`Maximum ${RANKING_CONSTRAINTS.MAX_TAGS} tags allowed`)
    }

    if (request.tags) {
        request.tags.forEach((tag) => {
            if (tag.length > RANKING_CONSTRAINTS.MAX_TAG_LENGTH) {
                throw new ValidationError(
                    `Tag "${tag}" exceeds maximum length of ${RANKING_CONSTRAINTS.MAX_TAG_LENGTH} characters`
                )
            }
        })
    }
}

/**
 * Validate ranking update request
 */
export function validateRankingUpdate(request: UpdateRankingRequest): void {
    // Title validation (if provided)
    if (request.title !== undefined) {
        if (!request.title || request.title.trim().length === 0) {
            throw new ValidationError('Title cannot be empty')
        }

        const titleLength = request.title.trim().length
        if (titleLength < RANKING_CONSTRAINTS.MIN_TITLE_LENGTH) {
            throw new ValidationError(
                `Title must be at least ${RANKING_CONSTRAINTS.MIN_TITLE_LENGTH} characters`
            )
        }

        if (titleLength > RANKING_CONSTRAINTS.MAX_TITLE_LENGTH) {
            throw new ValidationError(
                `Title must be less than ${RANKING_CONSTRAINTS.MAX_TITLE_LENGTH} characters`
            )
        }
    }

    // Description validation (if provided)
    if (request.description !== undefined) {
        const descLength = request.description.trim().length
        if (descLength > RANKING_CONSTRAINTS.MAX_DESCRIPTION_LENGTH) {
            throw new ValidationError(
                `Description must be less than ${RANKING_CONSTRAINTS.MAX_DESCRIPTION_LENGTH} characters`
            )
        }
    }

    // Tags validation (if provided)
    if (request.tags) {
        if (request.tags.length > RANKING_CONSTRAINTS.MAX_TAGS) {
            throw new ValidationError(`Maximum ${RANKING_CONSTRAINTS.MAX_TAGS} tags allowed`)
        }

        request.tags.forEach((tag) => {
            if (tag.length > RANKING_CONSTRAINTS.MAX_TAG_LENGTH) {
                throw new ValidationError(
                    `Tag "${tag}" exceeds maximum length of ${RANKING_CONSTRAINTS.MAX_TAG_LENGTH} characters`
                )
            }
        })
    }

    // Ranked items validation (if provided)
    if (request.rankedItems) {
        if (request.rankedItems.length > RANKING_CONSTRAINTS.MAX_ITEM_COUNT) {
            throw new ValidationError(
                `Cannot have more than ${RANKING_CONSTRAINTS.MAX_ITEM_COUNT} items`
            )
        }
    }
}

/**
 * Validate comment text
 */
export function validateCommentText(text: string): void {
    if (!text || text.trim().length === 0) {
        throw new ValidationError('Comment text is required')
    }

    const textLength = text.trim().length
    if (textLength > RANKING_CONSTRAINTS.MAX_COMMENT_LENGTH) {
        throw new ValidationError(
            `Comment must be less than ${RANKING_CONSTRAINTS.MAX_COMMENT_LENGTH} characters`
        )
    }
}

/**
 * Validate profile update request
 */
export function validateProfileUpdate(request: UpdateProfileRequest): void {
    // Description validation (if provided)
    if (request.description !== undefined) {
        const descLength = request.description.trim().length
        if (descLength > PROFILE_CONSTRAINTS.MAX_DESCRIPTION_LENGTH) {
            throw new ValidationError(
                `Description must be less than ${PROFILE_CONSTRAINTS.MAX_DESCRIPTION_LENGTH} characters`
            )
        }
    }

    // Favorite genres validation (if provided)
    if (request.favoriteGenres) {
        if (request.favoriteGenres.length > 10) {
            throw new ValidationError('Maximum 10 favorite genres allowed')
        }
    }
}

/**
 * Validate user ID format
 */
export function validateUserId(userId: string): void {
    if (!userId || userId.trim().length === 0) {
        throw new ValidationError('User ID is required')
    }

    // Check for reasonable length (Firebase UIDs are 28 chars, but allow flexibility)
    if (userId.length > 128) {
        throw new ValidationError('User ID is invalid')
    }
}

/**
 * Validate ranking ID format
 */
export function validateRankingId(rankingId: string): void {
    if (!rankingId || rankingId.trim().length === 0) {
        throw new ValidationError('Ranking ID is required')
    }

    // nanoid(12) generates 12-character IDs
    if (rankingId.length < 10 || rankingId.length > 20) {
        throw new ValidationError('Ranking ID is invalid')
    }
}

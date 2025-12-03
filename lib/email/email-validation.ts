import { EmailTemplate } from '@/components/admin/EmailComposer'

interface EmailValidationParams {
    template: EmailTemplate
    subject?: string
    customMessage?: string
    customHtmlContent?: string
}

interface ValidationResult {
    valid: boolean
    error?: string
}

// Maximum lengths for email content to prevent DoS and storage abuse
const MAX_SUBJECT_LENGTH = 200
const MAX_MESSAGE_LENGTH = 10000
const MAX_HTML_LENGTH = 50000

/**
 * Validates email template parameters
 * Centralized validation logic used by both send and preview endpoints
 * Includes length validation to prevent DoS attacks via large payloads
 */
export function validateEmailTemplate(params: EmailValidationParams): ValidationResult {
    const { template, subject, customMessage, customHtmlContent } = params

    // Validate subject length
    if (subject && subject.length > MAX_SUBJECT_LENGTH) {
        return {
            valid: false,
            error: `Subject too long (max ${MAX_SUBJECT_LENGTH} characters)`,
        }
    }

    // Validate custom message length
    if (customMessage && customMessage.length > MAX_MESSAGE_LENGTH) {
        return {
            valid: false,
            error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)`,
        }
    }

    // Validate HTML content length
    if (customHtmlContent && customHtmlContent.length > MAX_HTML_LENGTH) {
        return {
            valid: false,
            error: `HTML content too long (max ${MAX_HTML_LENGTH} characters)`,
        }
    }

    if (template === 'announcement') {
        if (!subject || !customMessage) {
            return {
                valid: false,
                error: 'Subject and message are required for announcement emails',
            }
        }
    }

    if (template === 'custom') {
        if (!subject || !customHtmlContent) {
            return {
                valid: false,
                error: 'Subject and customHtmlContent are required for custom emails',
            }
        }
    }

    return { valid: true }
}

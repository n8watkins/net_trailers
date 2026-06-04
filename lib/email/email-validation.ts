import { EmailTemplate } from '@/components/admin/EmailComposer'
import type { Config } from 'dompurify'

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
 * DOMPurify sanitization configuration for custom HTML emails
 * Used by both send and preview endpoints to prevent XSS attacks
 */
export const CUSTOM_HTML_SANITIZATION_CONFIG: Config = {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href', 'title'], // Only allow href and title attributes
    ALLOWED_URI_REGEXP: /^https:\/\//, // HTTPS only, no HTTP
    FORBID_ATTR: ['style', 'class', 'id', 'onclick', 'onerror'], // Block inline styles/scripts
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    ALLOW_DATA_ATTR: false,
}

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

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

/**
 * Validates email template parameters
 * Centralized validation logic used by both send and preview endpoints
 */
export function validateEmailTemplate(params: EmailValidationParams): ValidationResult {
    const { template, subject, customMessage, customHtmlContent } = params

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

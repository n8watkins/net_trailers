import { EmailTemplate } from '@/components/admin/EmailComposer'

export interface EmailTemplateMetadata {
    id: EmailTemplate
    name: string
    description: string
    icon: string
}

/**
 * Centralized email template configuration
 * Single source of truth for template metadata used across components
 */
export const EMAIL_TEMPLATES: EmailTemplateMetadata[] = [
    {
        id: 'trending',
        name: 'Trending Content',
        description: 'Weekly trending movies and TV shows from watchlists',
        icon: '📈',
    },
    {
        id: 'social',
        name: 'Social Digest',
        description: 'Batched comments and likes on rankings',
        icon: '💬',
    },
    {
        id: 'announcement',
        name: 'Announcement',
        description: 'System announcements or important updates',
        icon: '📢',
    },
    {
        id: 'custom',
        name: 'Custom Email',
        description: 'Fully custom email with rich text editor',
        icon: '✉️',
    },
]

/**
 * Get template metadata by template ID
 */
export function getTemplateMetadata(templateId: string): EmailTemplateMetadata | null {
    return EMAIL_TEMPLATES.find((t) => t.id === templateId) || null
}

/**
 * Get template emoji by template ID
 */
export function getTemplateEmoji(templateId: string): string {
    return getTemplateMetadata(templateId)?.icon || '📧'
}

/**
 * Get template name by template ID
 */
export function getTemplateName(templateId: string): string {
    return getTemplateMetadata(templateId)?.name || templateId
}

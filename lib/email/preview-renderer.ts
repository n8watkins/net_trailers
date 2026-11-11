/**
 * Email Preview Renderer
 *
 * Renders the same templates the real sends use, to HTML for the admin preview.
 */

import type { Content } from '../../typings'
import type { DigestInteraction } from './subjects'
import { announcementEmail, customEmail, socialDigestEmail, trendingEmail } from './templates'

const PREVIEW_TOKEN = 'preview-token'

export async function renderTrendingPreview(params: {
    userName: string
    movies: Content[]
    tvShows: Content[]
}): Promise<string> {
    return (await trendingEmail({ ...params, unsubscribeToken: PREVIEW_TOKEN })).html
}

export async function renderSocialPreview(params: {
    userName: string
    interactions: DigestInteraction[]
}): Promise<string> {
    return (await socialDigestEmail({ ...params, unsubscribeToken: PREVIEW_TOKEN })).html
}

export async function renderAnnouncementPreview(params: {
    userName: string
    subject: string
    message: string
}): Promise<string> {
    return (await announcementEmail({ ...params, unsubscribeToken: PREVIEW_TOKEN })).html
}

export async function renderCustomPreview(params: {
    userName: string
    subject: string
    htmlContent: string
}): Promise<string> {
    return (await customEmail({ ...params, unsubscribeToken: PREVIEW_TOKEN })).html
}

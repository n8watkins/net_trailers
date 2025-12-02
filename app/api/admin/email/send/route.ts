import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '../../../../../lib/auth-middleware'
import { getAdminDb } from '../../../../../lib/firebase-admin'
import { EmailService } from '../../../../../lib/email/email-service'

/**
 * POST /api/admin/email/send
 *
 * Send emails to selected users with chosen template (ADMIN ONLY)
 * Requires authentication
 */
async function handleSendEmail(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
        // ADMIN ONLY: Check if user is admin
        const ADMIN_UID = process.env.NEXT_PUBLIC_ADMIN_UID
        if (!ADMIN_UID || userId !== ADMIN_UID) {
            console.error('[AdminEmailSend] User is not admin:', userId)
            return NextResponse.json(
                { error: 'Forbidden - Admin access required' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const {
            template,
            userIds,
            subject,
            customMessage,
            customHtmlContent,
        }: {
            template: 'trending' | 'social' | 'announcement' | 'custom'
            userIds: string[]
            subject?: string
            customMessage?: string
            customHtmlContent?: string
        } = body

        if (!template || !userIds || userIds.length === 0) {
            return NextResponse.json(
                { error: 'Missing required fields: template, userIds' },
                { status: 400 }
            )
        }

        if (template === 'announcement' && (!subject || !customMessage)) {
            return NextResponse.json(
                { error: 'Subject and message are required for announcement emails' },
                { status: 400 }
            )
        }

        if (template === 'custom' && (!subject || !customHtmlContent)) {
            return NextResponse.json(
                { error: 'Subject and customHtmlContent are required for custom emails' },
                { status: 400 }
            )
        }

        console.log(`📧 [AdminEmailSend] Sending ${template} emails to ${userIds.length} user(s)`)

        let emailsSent = 0
        const errors: string[] = []

        const db = getAdminDb()

        // Fetch user data from Firestore
        const userPromises = userIds.map(async (uid) => {
            try {
                const userDoc = await db.collection('users').doc(uid).get()
                if (!userDoc.exists) {
                    console.warn(`[AdminEmailSend] User not found: ${uid}`)
                    errors.push(`User not found: ${uid}`)
                    return null
                }

                const userData = userDoc.data()
                return {
                    userId: uid,
                    email: userData?.email,
                    displayName: userData?.displayName,
                    emailNotifications: userData?.emailNotifications,
                }
            } catch (error) {
                console.error(`[AdminEmailSend] Error fetching user ${uid}:`, error)
                errors.push(`Error fetching user: ${uid}`)
                return null
            }
        })

        const users = (await Promise.all(userPromises)).filter((u) => u !== null)

        // Send emails based on template
        switch (template) {
            case 'trending': {
                // Send trending content emails
                for (const user of users) {
                    try {
                        if (!user.email) {
                            errors.push(`Missing email for user: ${user.userId}`)
                            continue
                        }

                        // Check if user has opted in to trending emails
                        if (user.emailNotifications?.trending !== true) {
                            console.log(
                                `[AdminEmailSend] User ${user.userId} has not opted in to trending emails, skipping`
                            )
                            errors.push(`User ${user.email} has not opted in to trending emails`)
                            continue
                        }

                        // Fetch trending content for this user (simplified for manual send)
                        // In a real scenario, you'd fetch actual trending data from their watchlist
                        const movies: any[] = [] // Placeholder
                        const tvShows: any[] = [] // Placeholder

                        await EmailService.sendTrendingContent({
                            to: user.email,
                            userName: user.displayName || 'there',
                            movies,
                            tvShows,
                        })

                        emailsSent++
                        console.log(`[AdminEmailSend] Sent trending email to ${user.email}`)
                    } catch (error) {
                        console.error(
                            `[AdminEmailSend] Failed to send trending email to ${user.email}:`,
                            error
                        )
                        errors.push(
                            `Failed to send to ${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`
                        )
                    }
                }
                break
            }

            case 'social': {
                // Send social digest emails
                for (const user of users) {
                    try {
                        if (!user.email) {
                            errors.push(`Missing email for user: ${user.userId}`)
                            continue
                        }

                        // Check if user has opted in to social emails
                        if (user.emailNotifications?.social !== true) {
                            console.log(
                                `[AdminEmailSend] User ${user.userId} has not opted in to social emails, skipping`
                            )
                            errors.push(`User ${user.email} has not opted in to social emails`)
                            continue
                        }

                        // Fetch social notifications for this user (simplified for manual send)
                        const interactions: any[] = [] // Placeholder

                        await EmailService.sendSocialDigest({
                            to: user.email,
                            userName: user.displayName || 'there',
                            interactions,
                        })

                        emailsSent++
                        console.log(`[AdminEmailSend] Sent social digest to ${user.email}`)
                    } catch (error) {
                        console.error(
                            `[AdminEmailSend] Failed to send social digest to ${user.email}:`,
                            error
                        )
                        errors.push(
                            `Failed to send to ${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`
                        )
                    }
                }
                break
            }

            case 'announcement': {
                // Send announcement emails
                for (const user of users) {
                    try {
                        if (!user.email) {
                            errors.push(`Missing email for user: ${user.userId}`)
                            continue
                        }

                        await EmailService.sendAnnouncement({
                            to: user.email,
                            userName: user.displayName || 'there',
                            subject: subject!,
                            message: customMessage!,
                        })

                        emailsSent++
                        console.log(`[AdminEmailSend] Sent announcement to ${user.email}`)
                    } catch (error) {
                        console.error(
                            `[AdminEmailSend] Failed to send announcement to ${user.email}:`,
                            error
                        )
                        errors.push(
                            `Failed to send to ${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`
                        )
                    }
                }
                break
            }

            case 'custom': {
                // Send custom emails
                for (const user of users) {
                    try {
                        if (!user.email) {
                            errors.push(`Missing email for user: ${user.userId}`)
                            continue
                        }

                        await EmailService.sendCustomEmail({
                            to: user.email,
                            userName: user.displayName || 'there',
                            subject: subject!,
                            htmlContent: customHtmlContent!,
                        })

                        emailsSent++
                        console.log(`[AdminEmailSend] Sent custom email to ${user.email}`)
                    } catch (error) {
                        console.error(
                            `[AdminEmailSend] Failed to send custom email to ${user.email}:`,
                            error
                        )
                        errors.push(
                            `Failed to send to ${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`
                        )
                    }
                }
                break
            }

            default:
                return NextResponse.json({ error: 'Invalid template type' }, { status: 400 })
        }

        console.log(`📧 [AdminEmailSend] Completed: ${emailsSent} sent, ${errors.length} errors`)

        // Create email history record
        try {
            const historyRecord = {
                template,
                subject: subject || `${template} email`,
                recipientCount: userIds.length,
                successCount: emailsSent,
                failureCount: errors.length,
                recipients: users.map((u) => ({
                    userId: u.userId,
                    email: u.email || '',
                    displayName: u.displayName,
                })),
                errors: errors.length > 0 ? errors : [],
                sentBy: userId,
                sentAt: Date.now(),
                metadata: {
                    customMessage: customMessage || null,
                    customHtmlContent: customHtmlContent || null,
                },
            }

            await db.collection('admin_emails').add(historyRecord)
            console.log(`📧 [AdminEmailSend] History record created`)
        } catch (historyError) {
            console.error('[AdminEmailSend] Failed to create history record:', historyError)
            // Don't fail the request if history fails
        }

        return NextResponse.json({
            success: true,
            emailsSent,
            totalUsers: userIds.length,
            errors: errors.length > 0 ? errors : undefined,
        })
    } catch (error) {
        console.error('[AdminEmailSend] Error:', error)
        return NextResponse.json(
            {
                error: 'Failed to send emails',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

export const POST = withAuth(handleSendEmail)

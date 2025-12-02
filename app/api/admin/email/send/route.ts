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
        }: {
            template: 'trending' | 'social' | 'announcement' | 'custom'
            userIds: string[]
            subject?: string
            customMessage?: string
        } = body

        if (!template || !userIds || userIds.length === 0) {
            return NextResponse.json(
                { error: 'Missing required fields: template, userIds' },
                { status: 400 }
            )
        }

        if (template === 'announcement' && !subject) {
            return NextResponse.json(
                { error: 'Subject is required for announcement emails' },
                { status: 400 }
            )
        }

        if (template === 'custom' && (!subject || !customMessage)) {
            return NextResponse.json(
                { error: 'Subject and customMessage are required for custom emails' },
                { status: 400 }
            )
        }

        console.log(
            `📧 [AdminEmailSend] Sending ${template} emails to ${userIds.length} user(s)`
        )

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
                            errors.push(
                                `User ${user.email} has not opted in to trending emails`
                            )
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

            case 'announcement':
            case 'custom': {
                // For now, send individual emails for announcement and custom types
                // TODO: Create proper React email templates for these
                for (const user of users) {
                    try {
                        if (!user.email) {
                            errors.push(`Missing email for user: ${user.userId}`)
                            continue
                        }

                        // Use Resend directly for simple HTML emails
                        // (This is a simplified implementation - ideally create proper React templates)
                        console.log(
                            `[AdminEmailSend] ${template} emails not yet implemented with React templates`
                        )
                        errors.push(
                            `${template} emails require React template implementation (see Phase 3 of plan)`
                        )
                        break // Exit after first user to avoid duplicate errors
                    } catch (error) {
                        console.error(
                            `[AdminEmailSend] Failed to send ${template} email to ${user.email}:`,
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

        console.log(
            `📧 [AdminEmailSend] Completed: ${emailsSent} sent, ${errors.length} errors`
        )

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

# Net Trailers - TODO List

## Email Notifications Setup (Resend)

### Setup Required

- [ ] Sign up for Resend account at [resend.com](https://resend.com)
- [ ] Generate API key from Resend dashboard
- [ ] Add `RESEND_API_KEY` to `.env.local` file
- [ ] Test the pilot email functionality in settings

### Domain Configuration (Optional - For Production)

- [ ] Verify your custom domain in Resend dashboard
- [ ] Update `RESEND_SENDER_EMAIL` in `.env.local` from `onboarding@resend.dev` to your verified domain
- [ ] Test email delivery with custom domain

### Email Template Integration (NEW - 11 Templates Created)

**✅ Completed:**

- [x] Base email template with NetTrailer branding
- [x] Auth emails: password reset, email verification, email change
- [x] Notification emails: collection updates, new releases, ranking comments/likes
- [x] Social emails: collection sharing
- [x] Engagement emails: weekly digest, trending content
- [x] EmailService class for centralized sending logic
- [x] Updated send-pilot API route to use EmailService

**🚧 Integration Work Needed:**

- [ ] Create `/api/auth/send-password-reset` API route
- [ ] Create `/api/auth/send-email-verification` API route
- [ ] Create `/api/auth/verify-email/[token]` handler page
- [ ] Create `/auth/reset-password` page with token validation
- [ ] Update `useAuth` hook to use custom email flow instead of Firebase defaults
- [x] Integrate collection update emails into `/api/cron/update-collections`
- [ ] Integrate new release emails (watchlist monitoring)
- [x] Integrate ranking comment emails into `utils/firestore/rankingComments.ts`
- [ ] Integrate ranking like emails (daily batch) - **Requires separate cron job**
- [ ] Add email notification preferences to Settings UI
- [ ] Create unsubscribe token system and handler
- [ ] Add weekly digest cron job (optional)

**📝 Notes on Ranking Like Emails:**
Ranking like notifications should be batched to avoid spamming users. Implement as:

1. Create `/api/cron/send-like-digests` route (run daily at 6 PM)
2. Query Firestore `ranking_likes` collection for likes added in past 24 hours
3. Group likes by ranking, then by ranking owner
4. Send one email per user with all their rankings' new likes
5. Use `EmailService.sendRankingLike()` with aggregated data
6. Track last run time to avoid duplicate sends

### Testing Checklist

- [ ] Test email with authenticated user account
- [ ] Verify email arrives in inbox (check spam folder)
- [ ] Verify all trending content displays correctly
- [ ] Test with no trending content available
- [ ] Test error handling when TMDB API is unavailable
- [ ] Test error handling when Resend API fails
- [ ] Test all 11 email templates render correctly
- [ ] Test email rendering across different email clients (Gmail, Outlook, Apple Mail)
- [ ] Test password reset flow end-to-end
- [ ] Test email verification flow end-to-end
- [ ] Test collection update notifications
- [ ] Test ranking notifications

### Email Template Files

Located in `/lib/email/templates/`:

- `base-email.tsx` - Reusable base with NetTrailer branding
- `password-reset.tsx` - Password reset with expiring link
- `email-verification.tsx` - Email verification for new accounts
- `email-change.tsx` - Email change confirmation
- `collection-update.tsx` - Auto-updating collection notifications
- `new-release.tsx` - Watchlist release notifications
- `ranking-comment.tsx` - Comment/reply notifications
- `ranking-like.tsx` - Like notifications (batched)
- `collection-share.tsx` - Shared collection emails
- `weekly-digest.tsx` - Weekly activity summary
- `trending-content.tsx` - Demo/test email
- `index.ts` - Template exports
- `/lib/email/email-service.ts` - Unified EmailService class

## Notes

- Email functionality is currently a pilot/demo feature for portfolio showcase
- The template fetches real-time trending data from TMDB API
- Email design matches the app's dark theme and branding
- Users can toggle email notifications and send test emails from Settings > Notifications

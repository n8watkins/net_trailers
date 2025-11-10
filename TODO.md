# Net Trailers - TODO List

## Email Notifications Setup (Resend)

### Setup Required
- [ ] Sign up for Resend account at [resend.com](https://resend.com)
- [ ] Generate API key from Resend dashboard
- [ ] Add `RESEND_API_KEY` to `.env.local` file
- [ ] Test the pilot email functionality in settings

### Domain Configuration (Optional - For Production)
- [ ] Verify your custom domain in Resend dashboard
- [ ] Update the `from` field in `/app/api/email/send-pilot/route.ts` from `onboarding@resend.dev` to your verified domain
- [ ] Test email delivery with custom domain

### Email Template Improvements (Optional)
- [ ] Consider adding inline images for movie posters
- [ ] Add "View on Net Trailers" CTA button that links to the app
- [ ] Add unsubscribe link to email footer
- [ ] Test email rendering across different email clients (Gmail, Outlook, Apple Mail)

### Testing Checklist
- [ ] Test email with authenticated user account
- [ ] Verify email arrives in inbox (check spam folder)
- [ ] Verify all trending content displays correctly
- [ ] Test with no trending content available
- [ ] Test error handling when TMDB API is unavailable
- [ ] Test error handling when Resend API fails

### Future Enhancements
- [ ] Schedule automated weekly emails for users who opt-in
- [ ] Add personalized recommendations based on user's watchlist
- [ ] Include new releases from user's favorite genres
- [ ] Add collection update notifications
- [ ] Track email open rates and click-through rates in Resend dashboard

## Notes
- Email functionality is currently a pilot/demo feature for portfolio showcase
- The template fetches real-time trending data from TMDB API
- Email design matches the app's dark theme and branding
- Users can toggle email notifications and send test emails from Settings > Notifications

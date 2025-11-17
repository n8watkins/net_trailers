# Portfolio Implementation TODO

**Status:** In Progress
**Last Updated:** 2025-01-17
**Related Plan:** [PORTFOLIO-IMPLEMENTATION-PLAN.md](./PORTFOLIO-IMPLEMENTATION-PLAN.md)

This document tracks remaining tasks to complete the portfolio admin panel and trending notifications implementation for production deployment.

---

## ✅ Completed

- [x] Simplify accountLimits.ts (removed IP tracking)
- [x] Build admin dashboard UI at `/admin`
- [x] Create admin API routes (trending-stats, reset-demo)
- [x] Implement trending notification cron job
- [x] Create trending comparison utility
- [x] Update vercel.json with trending cron schedule
- [x] Update Firestore security rules
- [x] Create historical trending seeding utility
- [x] Update AuthModal with account stats display
- [x] Install lucide-react for admin icons
- [x] Set admin UID in local .env.local (`BHhkBGx80DRfGaAzn7RVM4dqRgP2`)

---

## 🔨 Local Development Remaining

### High Priority

- [ ] **Test Admin Dashboard Locally**
    - Navigate to http://localhost:3000/admin
    - Verify all stats load correctly
    - Test "Check Trending Now" button
    - Test "Trigger Demo" button
    - Test "Reset to 5 Accounts" button
    - Verify authorization works (only your UID can access)

- [ ] **Test Account Limiting**
    - Open signup modal
    - Verify account stats display shows correctly
    - Try creating a test account
    - Verify account count increments

- [ ] **Test Trending Notifications**
    - Add some content to your watchlist
    - Manually trigger trending check from admin panel
    - Verify notifications appear in notification bell
    - Check Firestore console for notification documents

### Medium Priority

- [ ] **Deploy Firestore Security Rules**

    ```bash
    firebase deploy --only firestore:rules
    ```

    - Verify rules deployed successfully
    - Test that `/system/stats` is readable but not writable from client
    - Test that `/signupLog` follows proper access rules

- [ ] **Initialize System Collections in Firestore**
    - Manually create `/system/stats` document with:
        ```json
        {
            "totalAccounts": 0,
            "signupsToday": 0,
            "lastSignup": null
        }
        ```
    - Manually create `/system/trending` document with:
        ```json
        {
            "lastRun": null,
            "totalNotifications": 0,
            "moviesSnapshot": [],
            "tvSnapshot": []
        }
        ```

### Low Priority

- [ ] **Test Error Handling**
    - Test admin panel with network offline
    - Test with invalid admin token
    - Test trending check with TMDB API error
    - Verify error messages display correctly

---

## 🚀 Production Deployment (Vercel)

### Required Before Deployment

- [ ] **Add Environment Variables to Vercel**
    - Go to: Vercel Dashboard → Project → Settings → Environment Variables
    - Add the following (copy from local .env.local):
        - `NEXT_PUBLIC_MAX_TOTAL_ACCOUNTS` = `50`
        - `NEXT_PUBLIC_ADMIN_UID` = `BHhkBGx80DRfGaAzn7RVM4dqRgP2`
        - `NEXT_PUBLIC_ADMIN_TOKEN` = `5b38eaf0345a878f1b42386e1b3e9006c4c53519eea6464f23ed290862f89595`
        - `CRON_SECRET` = `b6d0d827470b7a046afec3735c03b7b25c536de36b0c566810af26d903fdfcfd`
    - **IMPORTANT:** These should be marked as "Production" environment
    - Regenerate tokens for production (don't use the same ones as local)

- [ ] **Generate Production Tokens**

    ```bash
    # Generate new admin token for production
    openssl rand -hex 32

    # Generate new cron secret for production
    openssl rand -hex 32
    ```

    - Update Vercel environment variables with new tokens
    - **DO NOT** commit production tokens to git

- [ ] **Verify Firebase Admin SDK Credentials**
    - Ensure `FIREBASE_ADMIN_CLIENT_EMAIL` is in Vercel
    - Ensure `FIREBASE_ADMIN_PRIVATE_KEY` is in Vercel
    - These should already be set from previous deployments

- [ ] **Configure Vercel Cron Jobs**
    - Vercel will automatically read `vercel.json` cron configuration
    - Verify cron jobs are enabled in project settings
    - Check that `/api/cron/update-trending` is listed

### Post-Deployment Testing

- [ ] **Test Admin Panel in Production**
    - Navigate to `https://your-domain.vercel.app/admin`
    - Verify authorization works
    - Test all buttons and features
    - Check that stats load correctly

- [ ] **Verify Cron Job Execution**
    - Wait for next cron run (every 6 hours: 0:00, 6:00, 12:00, 18:00 UTC)
    - Check Vercel logs for cron execution
    - Verify notifications were created in Firestore
    - Or manually trigger via: `curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.vercel.app/api/cron/update-trending`

- [ ] **Monitor Firebase Usage**
    - Check Firebase Console → Usage
    - Verify staying within free tier limits
    - Monitor Firestore reads/writes
    - Monitor Authentication usage

- [ ] **Test Account Limiting in Production**
    - Create a test account
    - Verify account count increments
    - Verify signup modal shows correct stats
    - Test that 51st account is blocked

---

## 📧 Optional: Resend Email Integration

**Status:** Not yet implemented
**Priority:** Low (trending notifications currently use in-app notifications only)

### Setup Tasks

- [ ] **Get Resend API Key**
    - Sign up at https://resend.com
    - Verify your domain OR use `onboarding@resend.dev` for testing
    - Generate API key from dashboard
    - Add to `.env.local`: `RESEND_API_KEY=re_xxxxxxxxxxxxx`

- [ ] **Add to Vercel Environment Variables**
    - Add `RESEND_API_KEY` to Vercel production environment
    - Mark as "Production" only

- [ ] **Implement Email Notifications for Trending**
    - Modify `/api/cron/update-trending/route.ts`
    - Add email sending logic using existing `lib/email/email-service.ts`
    - Create email template for trending notifications
    - Add user preference for email notifications
    - Test email delivery

- [ ] **Update Notification Preferences**
    - Add "Email me about trending content" toggle in settings
    - Store preference in Firestore user document
    - Respect preference in cron job

### Email Templates Needed

- [ ] **Trending Notification Email**
    - Subject: "🔥 [Title] is trending this week!"
    - Body: Include poster image, title, description, link to app
    - CTA: "View on NetTrailer"
    - Unsubscribe link

---

## 🧪 Integration Testing

### Before Considering "Complete"

- [ ] **End-to-End Flow Test**
    1. Create new user account
    2. Add content to watchlist
    3. Trigger trending check (demo mode)
    4. Verify notification appears
    5. Click notification to view content
    6. Verify modal opens correctly

- [ ] **Admin Demo Flow Test** (for recruiters)
    1. Show signup modal with account counter
    2. Navigate to `/admin` dashboard
    3. Show system stats
    4. Click "Trigger Demo" button
    5. Switch to user account
    6. Show notification bell with new notification
    7. Explain architecture and cost control

- [ ] **Performance Testing**
    - Test admin dashboard load time
    - Test trending check with 50 users
    - Verify no memory leaks
    - Check bundle size impact
    - Test mobile responsiveness

---

## 📚 Documentation Updates

- [ ] **Update CLAUDE.md**
    - Add admin panel documentation
    - Document trending notifications system
    - Add environment variable requirements
    - Document admin authorization
    - Add deployment checklist reference

- [ ] **Update README.md** (if exists)
    - Add admin panel feature
    - Add trending notifications feature
    - Update environment variables section
    - Add deployment instructions

- [ ] **Create Admin User Guide**
    - How to access admin panel
    - How to interpret stats
    - How to trigger manual trending checks
    - How to reset demo accounts
    - Troubleshooting common issues

---

## 🐛 Known Issues / Future Improvements

### Known Issues

- None currently identified

### Future Improvements

- [ ] Add admin user management UI
- [ ] Add trending notification frequency preferences
- [ ] Add email digest for trending items
- [ ] Add analytics dashboard (view trending stats over time)
- [ ] Add ability to manually send notifications
- [ ] Add notification templates customization
- [ ] Add webhook support for trending alerts
- [ ] Add Slack/Discord integration for admin alerts

---

## 📊 Success Criteria

The implementation is considered complete when:

- ✅ Admin panel loads and displays stats correctly
- ✅ Account limiting prevents 51st signup
- ✅ Trending cron runs every 6 hours without errors
- ✅ Notifications appear when watchlist items trend
- ✅ Demo mode reliably shows feature to recruiters
- ✅ All features work in production on Vercel
- ✅ Firestore usage stays within free tier
- ✅ TMDB API usage is efficient and respectful
- ✅ Documentation is updated and accurate

---

## 🔗 Related Documentation

- [PORTFOLIO-IMPLEMENTATION-PLAN.md](./PORTFOLIO-IMPLEMENTATION-PLAN.md) - Original implementation plan
- [COST-SUMMARY.md](./COST-SUMMARY.md) - Cost analysis ($0/month proof)
- [MASTER-PLAN.md](./MASTER-PLAN.md) - Comprehensive trending notification design
- [CLAUDE.md](../CLAUDE.md) - Main project documentation

---

**Note:** This TODO list is actively maintained. Mark items as complete with `[x]` as you finish them. Add new items as they're discovered during testing and deployment.

# 📋 Project Task Consolidation

## 🚨 CRITICAL GLARING ISSUES (External Dependencies)
> **Status**: Remaining from original 16 glaring issues - require external account access

### Issue #1: Exposed API Keys (TMDB)
**Original Priority**: CRITICAL
**Status**: Requires external action
**Steps to complete:**
1. Go to [TMDB Website](https://www.themoviedb.org/)
2. Create account or login
3. Go to Settings → API
4. Request an API key (free)
5. Copy the API key to `.env.local`:
   ```
   TMDB_API_KEY=your_actual_tmdb_api_key_here
   ```

### Issue #6: Insecure Firebase Configuration
**Original Priority**: CRITICAL
**Status**: Requires external action
**Priority**: HIGH - Previous keys were exposed in source code
**Timeline**: Before any public deployment

**Steps to complete:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `netflix-clone-15862`
3. Go to Project Settings (gear icon)
4. Navigate to "General" tab
5. Scroll down to "Your apps" section
6. Delete the current web app configuration
7. Create a new web app with a new name
8. Copy the NEW configuration values to `.env.local`:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=NEW_API_KEY_HERE
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=NEW_DOMAIN_HERE
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=NEW_PROJECT_ID_HERE
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=NEW_BUCKET_HERE
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=NEW_SENDER_ID_HERE
   NEXT_PUBLIC_FIREBASE_APP_ID=NEW_APP_ID_HERE
   ```

**Why this matters:**
- Old keys were committed to git history
- Anyone with repository access could access your Firebase project
- Regenerating ensures only authorized access

### 2. Get TMDB API Key
**Priority**: REQUIRED - Application won't work without it
**Timeline**: Now

**Steps to complete:**
1. Go to [TMDB Website](https://www.themoviedb.org/)
2. Create account or login
3. Go to Settings → API
4. Request an API key (free)
5. Copy the API key to `.env.local`:
   ```
   TMDB_API_KEY=your_actual_tmdb_api_key_here
   ```

**Current status:** Placeholder value needs replacement

### 3. Update Firestore Security Rules
**Priority**: HIGH - Database is currently open
**Timeline**: After regenerating Firebase keys

**Steps to complete:**
1. Go to Firebase Console → Firestore Database
2. Go to "Rules" tab
3. Replace existing rules with:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Users can only access their own data
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }

       // Watchlists are user-specific
       match /watchlists/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }

       // Public read-only data (if needed later)
       match /public/{document=**} {
         allow read: if true;
         allow write: if false;
       }
     }
   }
   ```
4. Click "Publish"

## 📋 RECOMMENDED SECURITY TASKS

### 4. Enable Firebase Authentication Methods
**Priority**: MEDIUM
**Timeline**: When adding authentication features

**Steps:**
1. Firebase Console → Authentication
2. Sign-in method tab
3. Enable desired methods:
   - Email/Password (already configured)
   - Google (recommended)
   - GitHub (optional)

### 5. Setup Firebase Hosting (Optional)
**Priority**: LOW
**Timeline**: For production deployment

**Benefits:**
- Free SSL certificates
- Global CDN
- Easy deployment integration

### 6. Environment Variable Security Audit
**Priority**: MEDIUM
**Timeline**: Before production

**Checklist:**
- [ ] No secrets in `.env.example`
- [ ] `.env.local` in `.gitignore`
- [ ] Production environment variables configured
- [ ] No hardcoded values remaining in source code

### 7. Update Branding Assets ✅ COMPLETED
**Priority**: MEDIUM - Important for portfolio presentation
**Timeline**: Before showing to potential employers/clients

**Status**: ✅ **COMPLETED** - NetTrailer branding implemented

**Completed Updates:**
- ✅ App title changed to "NetTrailer"
- ✅ Meta descriptions updated across all pages
- ✅ Favicon updated from Netflix to NetTrailer
- ✅ All page titles updated with NetTrailer branding
- ✅ Professional tech stack display with proper icons
- ✅ Netflix references removed from UI text

### 8. Implement Sentry Bug Reporting 🆕
**Priority**: MEDIUM - Enhance user experience with error reporting
**Timeline**: After core functionality is stable

**Benefits:**
- Real-time error monitoring and alerting
- User feedback collection for bugs
- Performance monitoring
- Error analytics and debugging insights
- Professional error handling

**Steps to complete:**
1. **Create Sentry Account**
   - Go to [Sentry.io](https://sentry.io/)
   - Create free account (generous free tier)
   - Create new project for "NetTrailer"
   - Select "Next.js" as platform

2. **Install Sentry SDK**
   ```bash
   npm install @sentry/nextjs @sentry/tracing
   ```

3. **Configure Sentry**
   - Add to `.env.local`:
     ```
     NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
     SENTRY_ORG=your_org_name
     SENTRY_PROJECT=nettrailer
     SENTRY_AUTH_TOKEN=your_auth_token
     ```

4. **Setup Configuration Files**
   - Create `sentry.client.config.js`
   - Create `sentry.server.config.js`
   - Create `sentry.edge.config.js`
   - Update `next.config.js` with Sentry plugin

5. **Add User Feedback Widget**
   - Implement feedback button in UI
   - Allow users to report bugs with screenshots
   - Collect user contact info (optional)

6. **Configure Error Boundaries**
   - Wrap components with Sentry error boundaries
   - Custom error pages with reporting options
   - Graceful error handling

**Example Implementation:**
```javascript
// Basic error capture
import * as Sentry from "@sentry/nextjs";

// Capture exceptions
Sentry.captureException(error);

// User feedback
Sentry.showReportDialog({
  eventId: Sentry.captureException(error),
});
```

**Free Tier Includes:**
- 5,000 errors/month
- 10,000 performance units/month
- 1 team member
- Email alerts
- 30-day error retention

---

## ✅ COMPLETION CHECKLIST

- [ ] Firebase keys regenerated and updated
- [ ] TMDB API key obtained and configured
- [ ] Firestore security rules updated
- [ ] Application tested with new credentials
- [ ] Old Firebase app deleted from console
- [x] Net Trailer branding assets created and implemented
- [x] App title and metadata updated
- [x] Portfolio-ready presentation achieved
- [ ] Sentry bug reporting system implemented
- [ ] Error monitoring and user feedback configured
- [ ] Git history cleaned (optional - advanced)

---

## 🔒 SECURITY NOTES

**Important:**
- Never commit actual API keys to git
- Always use environment variables for secrets
- Regenerate any keys that were previously exposed
- Test thoroughly after updating credentials

**Git History:** The old Firebase keys are still in git history. For maximum security, consider:
1. Using `git filter-branch` to remove from history (advanced)
2. Or simply ensure old keys are deactivated in Firebase console
# 🔐 External Tasks - Security & API Configuration

## 🚨 URGENT SECURITY TASKS (Do Before Public Deployment)

### 1. Regenerate Firebase Keys
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

### 7. Update Branding Assets
**Priority**: MEDIUM - Important for portfolio presentation
**Timeline**: Before showing to potential employers/clients

**Current Issue:**
- App currently uses Netflix branding/logos
- May confuse viewers about what this project represents
- Could raise copyright concerns

**Assets to replace:**
1. **Logo/Icon** (`/public/netflix.png` and favicon)
   - Create or find "Net Trailer" logo
   - Update in `pages/index.tsx:44` and `pages/_document.tsx`
   - Consider: Film reel, play button, or cinema-themed icon

2. **App Title/Naming**
   - Current: "Netflix" in browser tab
   - Change to: "Net Trailer" or "NetTrailer"
   - Update `NEXT_PUBLIC_APP_NAME` in `.env.local`

3. **Color Scheme (Optional)**
   - Netflix red: `#E50914`
   - Consider: Different primary color to distinguish
   - Suggestions: Blue (#1E40AF), Purple (#7C3AED), Teal (#0D9488)

4. **Header/Navigation**
   - Update logo in `components/Header.tsx`
   - Consider adding "A Portfolio Project" subtitle

**Quick Branding Ideas:**
- **Net Trailer** - plays on "Netflix" but clearly different
- **CineStream** - cinema + streaming
- **ReelWatch** - film reel + watching
- **TrailerHub** - focus on movie trailers/previews

**Free Resources for Assets:**
- Icons: https://heroicons.com/ (already using)
- Logos: https://www.canva.com/ (free tier)
- Colors: https://tailwindcss.com/docs/customizing-colors

---

## ✅ COMPLETION CHECKLIST

- [ ] Firebase keys regenerated and updated
- [ ] TMDB API key obtained and configured
- [ ] Firestore security rules updated
- [ ] Application tested with new credentials
- [ ] Old Firebase app deleted from console
- [ ] Net Trailer branding assets created and implemented
- [ ] App title and metadata updated
- [ ] Portfolio-ready presentation achieved
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
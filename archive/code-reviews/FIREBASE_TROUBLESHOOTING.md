# Firebase Authentication Troubleshooting Guide

## Current Issue

Users are seeing "You're browsing as a guest" even when logged in, indicating the authentication state isn't properly syncing between Firebase and the app's session management.

## What You Need to Check in Firebase Console

### 1. Firebase Console - Authentication

Go to: https://console.firebase.google.com/

Check:

- **Authentication** tab → **Users**
    - Do you see your logged-in users listed here?
    - Are the user IDs (UIDs) showing up?
    - Check the "Created" and "Last Sign In" timestamps

### 2. Firebase Console - Firestore Database

Check:

- **Firestore Database** → **Data**
    - Look for a `users` collection
    - Each user should have a document with their UID as the document ID
    - Inside each user document, look for:
        - `preferences` object
        - `watchlist` array
        - `ratings` array
        - `userLists` object

### 3. Firebase Project Settings

Check:

- **Project Settings** → **General**
    - Verify the Project ID matches your `.env.local`
    - Check the Web API Key matches

## Debug Steps in the App

### Step 1: Click the Debug Button

1. Go to the Watchlists page
2. Click the purple "🐛 Debug Auth State" button
3. Open browser console (F12)
4. Look for these logs:

```
=== AUTHENTICATION DEBUG ===
1. Firebase User: [should show user object or null]
2. Session Type: [should show 'authenticated' if logged in]
3. Is Guest: [should be false if logged in]
4. Is Authenticated: [should be true if logged in]
5. Active Session ID: [should match Firebase UID]
```

### Step 2: Check Firebase Connection

Look for these logs in console:

```
🔥 Firebase Auth Hook Initializing...
🔥 Firebase Config: {apiKey: 'Set', authDomain: 'Set', projectId: 'Set'}
🔥🔥🔥 Firebase onAuthStateChanged fired!
🔥 User: [user object]
```

## Common Issues and Fixes

### Issue 1: Firebase Config Missing

If you see `Missing` for any Firebase config:

- Check your `.env.local` file has all these:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### Issue 2: Firebase User is null but you're logged in

This means Firebase isn't detecting your authentication:

1. Check browser cookies - Firebase auth uses cookies/localStorage
2. Try logging out and logging back in
3. Check if authentication is enabled in Firebase Console

### Issue 3: Firebase User exists but Session is still 'guest'

This is the current issue - the session manager isn't updating when Firebase detects auth:

- The session reinitialization logic may not be triggering
- Check the console for: `🔄 Initializing/Switching session...`

## What Data Should Be Where

### In Browser Console (when logged in):

- `user` object should have: `uid`, `email`, `emailVerified`
- `sessionType` should be: `'authenticated'`
- `isGuest` should be: `false`
- `activeSessionId` should match the Firebase `uid`

### In Firebase Console:

1. **Authentication → Users**: Your user account should be listed
2. **Firestore → users → [your-uid]**: Should have your preferences document

### In Browser LocalStorage:

- `nettrailer_guest_id`: Guest session ID (can exist even when logged in)
- Firebase auth tokens (handled automatically by Firebase SDK)

## Quick Test Sequence

1. **Log out completely**
    - Click avatar → Sign Out
    - Check console for: `🎭 User signed out or not authenticated`

2. **Log back in**
    - Use email/password or Google sign-in
    - Check console for: `✅ User is authenticated: [your-email]`
    - Check for: `🔄 Initializing/Switching session...`

3. **Refresh the page**
    - Session should persist
    - Should NOT see guest message if logged in

## If Nothing Works

The issue might be:

1. **Firebase project mismatch** - Using wrong project credentials
2. **Domain not authorized** - Check Firebase Console → Authentication → Settings → Authorized domains
3. **Firestore rules** - Check if read/write is allowed for authenticated users
4. **Browser blocking cookies** - Try incognito mode or different browser

## Next Steps

Based on what you find:

1. If Firebase shows no users → Authentication isn't working at Firebase level
2. If Firebase shows users but app shows guest → Session management issue (our current problem)
3. If everything looks correct → Could be a race condition or timing issue

Let me know what you see in the Firebase Console and browser console logs!

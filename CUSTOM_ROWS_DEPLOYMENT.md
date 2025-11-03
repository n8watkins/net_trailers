# Custom Rows - Firebase Deployment Guide

## Current Status

✅ **Code Implementation**: Complete
✅ **Firestore Rules**: Already updated in `firestore.rules`
❌ **Rules Deployed**: NOT YET - **YOU NEED TO DEPLOY THESE TO FIREBASE**

## The Problem

The custom rows feature is throwing a **"Missing or insufficient permissions"** error because:

1. The Firestore security rules in your Firebase project are outdated
2. They don't include the `customRows` field in the user document structure
3. The local `firestore.rules` file HAS been updated, but hasn't been deployed to Firebase yet

## The Solution

You need to **deploy the updated Firestore rules** to your Firebase project.

### Option 1: Deploy via Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `netflix-clone-15862`
3. Navigate to **Firestore Database** → **Rules**
4. Copy the contents of `firestore.rules` from this project
5. Paste it into the Firebase Console rules editor
6. Click **Publish**

### Option 2: Deploy via Firebase CLI

```bash
# Install Firebase CLI if you haven't already
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (if not done)
firebase init firestore
# Select: Use existing project
# Select: netflix-clone-15862
# Accept default firestore.rules location

# Deploy the rules
firebase deploy --only firestore:rules
```

## What's in the Updated Rules?

The `firestore.rules` file already includes `customRows` support:

```javascript
function isValidUserData(data) {
  return data.keys().hasAll(['watchlist', 'ratings', 'userLists', 'customRows', 'lastActive'])
         && data.watchlist is list
         && data.ratings is list
         && data.userLists is map
         && data.customRows is map  // ← This was added
         && data.lastActive is number;
}
```

## Testing After Deployment

Once you deploy the rules, test the feature:

### 1. Start the Dev Server

```bash
npm run dev
```

### 2. Test in Browser

1. Navigate to `http://localhost:3002/rows` (or whatever port the dev server uses)
2. Sign in with your account
3. Click "Create Row"
4. Fill out the form:
    - **Name**: "Action Movies"
    - **Genres**: Select one or more (e.g., Action, Adventure)
    - **Genre Logic**: AND or OR
    - **Media Type**: Movie, TV, or Both
    - **Enabled**: Checked
5. Click "Create"

If successful, you should see:

- ✅ Success toast notification
- ✅ New row appears in the list
- ✅ Row is saved to Firestore at `/users/{yourUserId}/customRows/{rowId}`

### 3. Verify in Firestore

1. Go to Firebase Console → Firestore Database
2. Navigate to `users` collection → Your user document
3. You should see a `customRows` map field with your row data

## Do You Need to Reset Firebase Data?

**Short answer: NO** - You don't need to reset anything.

The Firestore rules update is backwards compatible:

- Existing user documents without `customRows` will continue to work
- New user documents will be created with `customRows: {}`
- The code handles both cases gracefully

However, if you want to ensure all users have the new structure, you could:

1. **Do nothing** (recommended) - The code will add `customRows: {}` when needed
2. **Migrate existing users** - Run a script to add `customRows: {}` to all existing user docs
3. **Reset everything** - Delete all user data and start fresh (NOT recommended for production)

## What Happens If Rules Aren't Deployed?

Without deploying the rules, you'll see these errors:

- ❌ "Missing or insufficient permissions" in console
- ❌ "Failed to load custom rows" on home page
- ❌ Cannot create, read, update, or delete custom rows
- ❌ API routes will return 500 errors

## Summary

**YOU MUST DEPLOY THE FIRESTORE RULES FOR CUSTOM ROWS TO WORK!**

The quickest way:

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Go to Firestore Database → Rules
3. Copy/paste the contents of `firestore.rules`
4. Click Publish
5. Test at `/rows` in your app

That's it! 🎉

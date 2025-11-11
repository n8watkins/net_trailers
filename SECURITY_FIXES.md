# Security Fixes - Critical Authentication Vulnerabilities

## Date: 2025-11-10

## Summary

Fixed critical authentication bypass vulnerabilities in API routes that allowed unauthorized access to user data through header spoofing. Implemented proper server-side authentication using Firebase Admin SDK.

## Vulnerabilities Fixed

### 1. **CRITICAL** - Header Spoofing in API Routes

**Affected Files:**

- `app/api/collections/duplicate/route.ts`
- `app/api/shares/create/route.ts`
- `app/api/shares/[shareId]/route.ts` (DELETE endpoint)

**Issue:**
Routes trusted the `x-user-id` header without verification, allowing any attacker to:

- Forge user identity by sending arbitrary user IDs
- Duplicate collections to any user's account
- Create/delete share links on behalf of any user
- Full read/write access to Firestore user data

**Fix:**

- Installed Firebase Admin SDK (`firebase-admin`)
- Created server-side Firebase Admin configuration (`lib/firebase-admin.ts`)
- Created authentication middleware (`lib/auth-middleware.ts`) that:
    - Verifies Firebase ID tokens using Admin SDK
    - Validates tokens server-side (cannot be spoofed)
    - Returns 401 for missing/invalid tokens
    - Provides `withAuth()` HOF for route protection
- Updated all vulnerable routes to use `withAuth()` wrapper
- Changed from trusting headers to verifying `Authorization: Bearer <token>` headers

### 2. **CRITICAL** - Client SDK Used on Server

**Issue:**
API routes imported the client Firebase SDK (`firebase.ts`) which:

- Only initializes the browser SDK with public keys
- Has no authentication context on the server
- Caused "Missing or insufficient permissions" errors
- Could not satisfy Firestore security rules requiring `request.auth.uid`

**Fix:**

- Routes now use Firebase Admin SDK (`getAdminDb()`) from `lib/firebase-admin.ts`
- Admin SDK runs with service account privileges
- Properly authenticated Firestore access
- Server-side operations now work correctly with Firestore rules

### 3. **HIGH** - Firestore Schema Mismatch

**Affected File:**

- `utils/firestore/shares.ts`

**Issue:**
Sharing utilities referenced `/users/{userId}/collections/{collectionId}` subcollection, but collections are actually stored in the `userCreatedWatchlists` array on the user document. This caused:

- "Collection not found" errors for all sharing operations
- Sharing feature completely non-functional

**Fix:**

- Replaced `getUserCollectionDocRef()` function with:
    - `getUserCollection()` - fetches collection from `userCreatedWatchlists` array
    - `updateUserCollection()` - updates collection in the array
- Updated all references throughout the file to use new functions
- Sharing now correctly accesses the actual collection storage location

### 4. **MEDIUM** - Non-functional Cron Job

**Affected File:**

- `app/api/cron/update-collections/route.ts`

**Issue:**
`getAllUserIds()` function returned empty array `[]`, causing:

- No users processed
- No collections updated
- No notifications created
- False sense of coverage

**Fix:**

- Implemented proper user enumeration using Firebase Admin SDK
- Queries Firestore `/users` collection
- Checks each user for custom rows subcollection
- Returns actual user IDs for processing
- Added error handling and logging

## Changes Made

### New Files Created

1. **lib/firebase-admin.ts**
    - Firebase Admin SDK initialization
    - Safe for hot module reloading
    - `getAdminAuth()` - returns Admin Auth instance
    - `getAdminDb()` - returns Admin Firestore instance
    - `verifyIdToken()` - validates Firebase ID tokens

2. **lib/auth-middleware.ts**
    - Authentication middleware for API routes
    - `verifyAuthentication()` - validates request auth
    - `withAuth()` - HOF to wrap route handlers with auth
    - Returns 401 for invalid/missing tokens
    - Handles token expiration gracefully

### Files Modified

1. **app/api/collections/duplicate/route.ts**
    - Wrapped with `withAuth()` middleware
    - Uses Firebase Admin SDK for Firestore access
    - Receives validated `userId` from middleware
    - Added missing UserList fields (`displayAsRow`, `order`, `enabled`)

2. **app/api/shares/create/route.ts**
    - Wrapped with `withAuth()` middleware
    - Receives validated `userId` from middleware
    - Removed header-based authentication

3. **app/api/shares/[shareId]/route.ts**
    - DELETE endpoint wrapped with `withAuth()` middleware
    - GET endpoint remains public (view shared collections)
    - Receives validated `userId` from middleware

4. **utils/firestore/shares.ts**
    - Replaced `getUserCollectionDocRef()` with new helper functions
    - `getUserCollection()` - reads from `userCreatedWatchlists` array
    - `updateUserCollection()` - updates array in user document
    - All share operations now use correct schema
    - Fixed type errors (changed `null` to `undefined`)

5. **app/api/cron/update-collections/route.ts**
    - Implemented `getAllUserIds()` with Firebase Admin SDK
    - Queries actual Firestore data
    - Returns list of users with custom rows
    - Added error handling per user

## Authentication Flow (After Fix)

### Client Side:

1. User authenticates with Firebase Auth
2. Client obtains ID token: `await auth.currentUser.getIdToken()`
3. Client sends requests with `Authorization: Bearer <token>` header

### Server Side:

1. API route wrapped with `withAuth(handler)`
2. Middleware extracts token from Authorization header
3. Middleware calls `verifyIdToken()` using Firebase Admin SDK
4. Admin SDK validates token signature and expiration
5. If valid: calls handler with verified `userId`
6. If invalid: returns 401 error response

## Security Improvements

✅ **No more header spoofing** - Headers are verified cryptographically
✅ **Server-side token validation** - Uses Admin SDK, cannot be bypassed
✅ **Proper Firestore authentication** - Admin SDK has authenticated context
✅ **Type safety** - Middleware provides type-safe user ID
✅ **Error handling** - Clear messages for expired/invalid tokens
✅ **Firestore rules work** - Admin SDK satisfies security rules
✅ **Sharing functional** - Accesses correct data schema
✅ **Cron job functional** - Processes actual users

## Client Updates Required

⚠️ **IMPORTANT**: Client code must be updated to send Firebase ID tokens in Authorization headers.

### Example Client Update:

```typescript
// Before (INSECURE - vulnerable to spoofing)
await fetch('/api/collections/duplicate', {
    method: 'POST',
    headers: {
        'x-user-id': userId, // ❌ Can be forged
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, items }),
})

// After (SECURE - verified token)
import { auth } from '@/firebase'

const idToken = await auth.currentUser?.getIdToken()
await fetch('/api/collections/duplicate', {
    method: 'POST',
    headers: {
        Authorization: `Bearer ${idToken}`, // ✅ Cryptographically verified
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, items }),
})
```

## Production Deployment Notes

### Environment Variables Required:

For production, add service account credentials:

```env
# Existing (already configured)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id

# New (for Admin SDK in production)
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@project-id.iam.gserviceaccount.com
```

### How to Get Service Account Credentials:

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Download JSON file
4. Extract `private_key` and `client_email` to environment variables
5. **IMPORTANT**: Replace literal `\n` in private key with actual newlines

### Alternative (Recommended):

Use Google Cloud Application Default Credentials:

- No environment variables needed
- Automatic in Cloud Run, App Engine, GCE
- For local dev: `gcloud auth application-default login`

## Testing Recommendations

1. **Authentication Tests:**
    - ✅ Test requests without Authorization header (should get 401)
    - ✅ Test requests with invalid token (should get 401)
    - ✅ Test requests with expired token (should get 401)
    - ✅ Test requests with valid token (should succeed)

2. **Authorization Tests:**
    - ✅ Test user A cannot access user B's collections
    - ✅ Test user cannot delete other user's shares
    - ✅ Test duplicate creates collection for correct user

3. **Sharing Tests:**
    - ✅ Test creating share link
    - ✅ Test viewing shared collection (public)
    - ✅ Test duplicating shared collection (requires auth)
    - ✅ Test deleting own share
    - ✅ Test cannot delete other user's share

4. **Cron Job Tests:**
    - ✅ Test manual trigger with valid secret
    - ✅ Test returns list of users processed
    - ✅ Test creates notifications correctly

## References

- Firebase Admin SDK: https://firebase.google.com/docs/admin/setup
- Firebase Auth Tokens: https://firebase.google.com/docs/auth/admin/verify-id-tokens
- Next.js API Routes: https://nextjs.org/docs/app/building-your-application/routing/route-handlers

## Impact

**Before:** Any malicious actor could access/modify any user's data by forging headers.

**After:** Only authenticated users with valid Firebase tokens can access their own data.

**Risk Level:** CRITICAL → MITIGATED

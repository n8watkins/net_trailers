# Test User Credentials

## Automated Test User Creation

Run this command to create a test user:

```bash
npx tsx scripts/create-test-user.ts
```

This will create a test user with the following credentials:

```
Email:    test@nettrailer.dev
Password: TestPassword123!
```

**⚠️ IMPORTANT:** These credentials are for **LOCAL TESTING ONLY**. Do NOT use in production!

---

## Manual Testing Workflow

### Step 1: Create Test User

```bash
# Run the script to create/verify test user
npx tsx scripts/create-test-user.ts

# Output should show:
# ✅ Test user created successfully!
# Email:    test@nettrailer.dev
# Password: TestPassword123!
```

### Step 2: Test Authenticated User (Firebase Persistence)

1. **Open browser:** http://localhost:3000
2. **Sign in:**
    - Click "Sign In" button
    - Enter email: `test@nettrailer.dev`
    - Enter password: `TestPassword123!`
    - Click "Sign In"
3. **Create custom list:**
    - Click "My Lists" in header
    - Click "Create New List"
    - Name: "Test Auth List 🔥"
    - Save
4. **Add content:**
    - Browse movies/shows
    - Click on a movie
    - Add to "Test Auth List 🔥"
5. **Open DevTools Console (F12)** and watch for:
    ```
    🔥 [Firebase Tracker] saveUserData-createList - AuthStore - [userId]
    🔥 [Firebase Tracker] saveUserData-addToList - AuthStore - [userId]
    ✅ [AuthStore] Saved to Firestore
    ```
6. **Refresh page (F5)**
7. **Verify:** Navigate to "My Lists" → "Test Auth List 🔥"
8. **Expected:** ✅ List and content still there

### Step 3: Test Guest User (localStorage Persistence)

1. **Log out:**
    - Click user menu
    - Click "Sign Out"
2. **Create custom list as guest:**
    - Click "My Lists" in header
    - Click "Create New List"
    - Name: "Guest Test List 👤"
    - Save
3. **Add content:**
    - Browse movies/shows
    - Click on a movie
    - Add to "Guest Test List 👤"
4. **Open DevTools Console (F12)** and watch for:
    ```
    📋 [GuestStore] Created list: Guest Test List 👤
    📝 [GuestStore] Added to list: ...
    ```
5. **Check localStorage:**
    - DevTools → Application → Local Storage → http://localhost:3000
    - Look for key: `nettrailer_guest_data_guest_[timestamp]`
6. **Refresh page (F5)**
7. **Verify:** Navigate to "My Lists" → "Guest Test List 👤"
8. **Expected:** ✅ List and content still there

### Step 4: Verify Session Isolation

1. **As guest:** You should only see "Guest Test List 👤"
2. **Sign in** with test credentials
3. **As authenticated:** You should only see "Test Auth List 🔥" (NOT the guest list)
4. **Sign out**
5. **As guest again:** You should see "Guest Test List 👤" again

**This confirms:**

- ✅ Auth data goes to Firebase
- ✅ Guest data goes to localStorage
- ✅ The two are properly isolated

---

## Verify Test User Exists

To check if the test user already exists:

```bash
npx tsx scripts/create-test-user.ts verify
```

---

## Clean Up Test Data

### Delete Test User Data from Firebase

```bash
# Via Firebase Console:
# 1. Go to https://console.firebase.google.com
# 2. Select your project: netflix-clone-15862
# 3. Go to Firestore Database
# 4. Find and delete: users/[test-user-id]
```

### Delete Test User Account

```bash
# Via Firebase Console:
# 1. Go to Authentication
# 2. Find user: test@nettrailer.dev
# 3. Delete user
```

Or run the script again to recreate:

```bash
npx tsx scripts/create-test-user.ts
```

---

## Troubleshooting

### "Email already in use"

The test user already exists. The script will automatically try to sign in instead.

### "Wrong password"

If you changed the password manually, either:

1. Delete the user from Firebase Console
2. Run the script again
3. Or update the `TEST_USER.password` in `scripts/create-test-user.ts`

### "Firebase not initialized"

Make sure your `.env.local` file has the Firebase configuration:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
```

---

## Security Notes

⚠️ **These credentials are for LOCAL DEVELOPMENT ONLY!**

- Do NOT commit real user credentials to git
- Do NOT use these credentials in production
- Do NOT share these credentials publicly
- The `.env.local` file should NOT be committed

For production testing, use:

- Temporary test accounts
- Firebase Test Lab
- Automated E2E tests with ephemeral credentials

# Testing Guide - Schema Migration & Auth-Gated Features

**Test Date**: 2025-10-10
**Dev Server**: http://localhost:3000
**Status**: Ready for manual testing

---

## Recent Changes Summary

### 1. **UI Improvements** ✅

- ✅ Removed description field from list creation (not in schema)
- ✅ Renamed "Manage Lists" → "My Lists"
- ✅ Cleaned up ListSelectionModal UI/UX

### 2. **Authentication Gating** ✅

- ✅ Custom list creation now requires authentication
- ✅ Guest users see "Sign In to Create Lists" prompt with lock icon
- ✅ Clicking prompt redirects to `/login`

### 3. **Default Watchlist for All Users** ✅

- ✅ Added virtual "Watchlist" that appears for both guests and authenticated users
- ✅ Virtual watchlist wraps `defaultWatchlist` array as a `UserList` with ID `default-watchlist`
- ✅ Default watchlist cannot be edited or deleted (no edit/delete buttons)
- ✅ Operations route correctly:
    - Default watchlist → `addToWatchlist()` / `removeFromWatchlist()`
    - Custom lists → `addToList()` / `removeFromList()`

### 4. **Consistency Fixes** ✅

- ✅ `useUserData.getAllLists()` now returns `[defaultWatchlist, ...customLists]`
- ✅ `useListsReadOnly.getAllLists()` already had this behavior
- ✅ All components (ListSelectionModal, Modal, watchlists page) now consistent

---

## Testing Checklist

### Phase 1: Guest Mode Testing (Current Phase)

#### 1.1 Guest Mode - Default Watchlist

- [ ] Open app in guest mode (no authentication)
- [ ] Click "Add to List" button on any content card
- [ ] Verify modal shows "Add to Lists" title
- [ ] Verify default "Watchlist" appears in the list with 📺 emoji
- [ ] Verify item count shows correctly
- [ ] Click Watchlist to add content
- [ ] Verify checkmark appears when content is added
- [ ] Verify toast notification appears: "Added to Watchlist"
- [ ] Click again to remove content
- [ ] Verify checkmark disappears
- [ ] Verify toast notification: "Removed from Watchlist"
- [ ] Close and reopen modal - verify state persists

#### 1.2 Guest Mode - Auth Gating

- [ ] Still in guest mode, scroll down in list modal
- [ ] Verify "Custom Lists" section appears with lock icon 🔒
- [ ] Verify text: "Sign in to create and manage your own custom watchlists"
- [ ] Verify "Sign In to Create Lists" button is visible
- [ ] Click "Sign In to Create Lists" button
- [ ] Verify auth modal opens (does NOT redirect to /login page)
- [ ] Verify auth modal opens in "Create Account" mode (signup)
- [ ] Close auth modal - verify guest mode still active

#### 1.3 Guest Mode - My Lists Management View

- [ ] Click "My Lists" in header/navigation
- [ ] Verify "My Lists" modal opens
- [ ] Verify default "Watchlist" appears with item count
- [ ] Verify NO edit/delete buttons appear for Watchlist
- [ ] If no custom lists exist yet, verify message:
    - "You haven't created any custom lists yet."
    - "Create a list to organize your favorite content!"
- [ ] Verify "Custom Lists" section with lock icon appears at bottom
- [ ] Verify cannot create custom lists as guest

---

### Phase 2: Authentication Testing

#### 2.1 Sign Up Flow

- [ ] Click "Sign In to Create Lists" button (opens auth modal)
- [ ] Verify modal is in "Create Account" mode
- [ ] Enter new email (e.g., `testuser+[timestamp]@example.com`)
- [ ] Enter password (min 6 characters)
- [ ] Enter confirm password (must match)
- [ ] Click "Create Account"
- [ ] Verify modal closes and user is authenticated
- [ ] Verify auth status shown in header (user email or profile icon)

#### 2.2 Sign In Flow

- [ ] Sign out (if signed in)
- [ ] Click avatar dropdown and select "Sign In"
- [ ] Verify auth modal opens in "Sign In" mode
- [ ] Use test credentials:
    - Email: `test@nettrailer.dev`
    - Password: `TestPassword123!`
- [ ] Click "Sign In"
- [ ] Verify modal closes and user is authenticated
- [ ] Verify auth status shown in header

#### 2.3 Session Persistence

- [ ] Sign in as test user
- [ ] Refresh page (F5)
- [ ] Verify still signed in
- [ ] Close browser tab, reopen app
- [ ] Verify still signed in
- [ ] (This uses Firebase's default `browserLocalPersistence`)

---

### Phase 3: Authenticated User - Custom Lists

#### 3.1 Create Custom List

- [ ] Sign in as authenticated user
- [ ] Click "Add to List" on any content
- [ ] Verify modal shows both:
    - Default "Watchlist" (📺)
    - "Create New List" button (no lock icon!)
- [ ] Click "Create New List"
- [ ] Verify emoji selector button appears (default 🎬)
- [ ] Click emoji button → verify emoji picker modal opens
- [ ] Select a different emoji (e.g., 🍿)
- [ ] Enter list name: "Action Movies"
- [ ] Press Enter or click "Create"
- [ ] Verify new list appears in modal immediately
- [ ] Verify new list has chosen emoji and name

#### 3.2 Add Content to Custom List

- [ ] With modal still open, click custom list to add content
- [ ] Verify checkmark appears
- [ ] Verify toast: "Added to Action Movies"
- [ ] Close modal
- [ ] Open "My Lists" view
- [ ] Verify "Action Movies" shows 1 item count
- [ ] Verify default Watchlist also shown (if it has items)

#### 3.3 Edit Custom List

- [ ] Open "My Lists" modal
- [ ] Verify "Action Movies" has edit (✏️) and delete (🗑️) buttons
- [ ] Verify default Watchlist has NO edit/delete buttons
- [ ] Click edit button on "Action Movies"
- [ ] Verify form opens with current name and emoji
- [ ] Change name to "Epic Action Films"
- [ ] Change emoji to 💥
- [ ] Press Enter or click "Update"
- [ ] Verify list updates immediately
- [ ] Verify item count preserved

#### 3.4 Delete Custom List

- [ ] Open "My Lists" modal
- [ ] Click delete button (🗑️) on "Epic Action Films"
- [ ] Verify delete confirmation modal appears:
    - Title: "Delete List"
    - Message: "Are you sure you want to delete [list name]? This action cannot be undone."
    - Two buttons: "Delete" (red) and "Cancel"
- [ ] Click "Cancel"
- [ ] Verify modal closes, list still exists
- [ ] Click delete button again
- [ ] Click "Delete" (red button)
- [ ] Verify list removed immediately
- [ ] Verify no errors in console

#### 3.5 Multiple Custom Lists

- [ ] Create 3 different lists:
    - "Sci-Fi Favorites" 🚀
    - "Comedy Gold" 😂
    - "Horror Night" 🎃
- [ ] Add different content to each list
- [ ] Verify all lists appear in "My Lists" modal
- [ ] Verify all lists appear in "Add to Lists" modal
- [ ] Verify default "Watchlist" always appears first

---

### Phase 4: Content Management

#### 4.1 Like/Unlike Content

- [ ] Click thumbs-up (👍) on content card
- [ ] Verify toast: "Added to Liked Movies"
- [ ] Verify button state changes (filled/highlighted)
- [ ] Click again to unlike
- [ ] Verify toast: "Removed from Liked Movies"
- [ ] Go to `/liked` page
- [ ] Verify content appears/disappears correctly

#### 4.2 Hide/Unhide Content

- [ ] Click thumbs-down (👎) on content card
- [ ] Verify toast: "Added to Hidden Movies"
- [ ] Verify content disappears from current view
- [ ] Go to `/hidden` page
- [ ] Verify content appears there
- [ ] Click eye icon to unhide
- [ ] Verify toast: "Removed from Hidden Movies"
- [ ] Verify content disappears from hidden page

#### 4.3 Add to Watchlist (Default)

- [ ] Click watchlist button (eye icon) on content card
- [ ] Verify toast: "Added to Watchlist"
- [ ] Click "Add to List" button
- [ ] Verify default "Watchlist" shows checkmark
- [ ] Click default Watchlist in modal to remove
- [ ] Verify checkmark disappears
- [ ] Verify toast: "Removed from Watchlist"

---

### Phase 5: Data Persistence

#### 5.1 Guest Data Persistence

- [ ] Sign out to enter guest mode
- [ ] Add 3 items to default Watchlist
- [ ] Like 2 movies
- [ ] Hide 1 movie
- [ ] Refresh page
- [ ] Verify all data persists in localStorage
- [ ] Close browser, reopen app
- [ ] Verify data still there

#### 5.2 Authenticated Data Persistence

- [ ] Sign in as test user
- [ ] Create a custom list "Test Persistence"
- [ ] Add 2 items to it
- [ ] Add 3 items to default Watchlist
- [ ] Like 2 movies
- [ ] Refresh page
- [ ] Verify all data persists (from Firestore)
- [ ] Sign out and sign back in
- [ ] Verify all data still there

#### 5.3 Session Isolation

- [ ] Sign in as test user
- [ ] Note all data (watchlist, custom lists, liked items)
- [ ] Sign out → switch to guest mode
- [ ] Verify guest sees EMPTY data (no user data)
- [ ] Add items as guest
- [ ] Sign in as test user again
- [ ] Verify user data restored (guest data NOT merged)
- [ ] Sign out
- [ ] Verify guest data still separate and intact

---

### Phase 6: Pages & Navigation

#### 6.1 Watchlists Page (`/watchlists`)

- [ ] Navigate to `/watchlists`
- [ ] Verify default "Watchlist" appears in sidebar
- [ ] Verify all custom lists appear in sidebar
- [ ] Click on default Watchlist
- [ ] Verify content loads
- [ ] Click on custom list
- [ ] Verify content loads
- [ ] Verify empty state message if list is empty:
    - "Your [list name] is empty"
    - "Add some content to get started!"

#### 6.2 Liked Movies Page (`/liked`)

- [ ] Navigate to `/liked`
- [ ] Verify all liked movies appear
- [ ] Verify can unlike from this page
- [ ] Verify empty state if no liked movies

#### 6.3 Hidden Movies Page (`/hidden`)

- [ ] Navigate to `/hidden`
- [ ] Verify all hidden movies appear
- [ ] Verify can unhide from this page (eye icon)
- [ ] Verify empty state if no hidden movies

---

### Phase 7: Account Management

#### 7.1 CSV Export

- [ ] Go to account settings page
- [ ] Click "Export Data" or CSV export button
- [ ] Verify CSV file downloads
- [ ] Open CSV file
- [ ] Verify contains:
    - Default Watchlist items
    - Custom lists with their items
    - Liked movies
    - Hidden movies
- [ ] Verify correct formatting and data

#### 7.2 Clear Account Data (Guest)

- [ ] Sign out to guest mode
- [ ] Add some data (watchlist, liked items)
- [ ] Go to account settings
- [ ] Click "Clear All Data"
- [ ] Verify confirmation dialog
- [ ] Confirm clear
- [ ] Verify all data removed
- [ ] Verify localStorage cleared

#### 7.3 Clear Account Data (Authenticated)

- [ ] Sign in as test user
- [ ] Go to account settings
- [ ] Click "Clear All Data"
- [ ] Verify confirmation dialog
- [ ] Confirm clear
- [ ] Verify all data cleared from Firestore
- [ ] Sign out and sign back in
- [ ] Verify data is empty (cleared)

---

## Known Issues & Limitations

### Current Limitations:

1. **Default Watchlist Cannot Be Renamed** - By design, it's always called "Watchlist"
2. **Default Watchlist Cannot Be Deleted** - It's a core feature, always present
3. **Custom Lists Require Authentication** - Guests only have access to default Watchlist
4. **No List Reordering** - Lists appear in creation order (after default Watchlist)
5. **No List Sharing** - `isPublic` field exists but sharing not implemented yet

### Expected Behavior:

- Recoil "Duplicate atom key" warnings in dev console are **normal** (hot module replacement)
- Firebase auth persists across page refreshes (by design)
- Guest data is isolated from authenticated user data (no auto-migration)
- Default watchlist always appears first in all list views

---

## Test User Credentials

For testing authenticated features, use:

- **Email**: `test@nettrailer.dev`
- **Password**: `TestPassword123!`
- **User ID**: (check console or Firebase Console after login)

**Firebase Console Links**:

- Authentication: https://console.firebase.google.com/u/0/project/netflix-clone-15862/authentication/users
- Firestore: https://console.firebase.google.com/u/0/project/netflix-clone-15862/firestore/databases/-default-/data/~2Fusers

---

## Reporting Issues

If you find issues during testing, please note:

1. **What were you doing?** (steps to reproduce)
2. **What did you expect?** (expected behavior)
3. **What happened instead?** (actual behavior)
4. **Any error messages?** (console errors, toasts)
5. **Session type?** (guest or authenticated)
6. **Browser?** (Chrome, Firefox, Safari, etc.)

---

## Next Steps After Testing

After completing manual testing:

1. ✅ Mark completed todo items
2. 📝 Document any bugs found
3. 🔧 Fix any critical issues
4. ✅ Verify fixes work
5. 🚀 Deploy to production (if all tests pass)

---

**Happy Testing! 🎉**

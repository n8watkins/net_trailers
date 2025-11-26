# NetTrailers Feature Roadmap 2025

> **Created**: November 9, 2025
> **Status**: Planning Phase
> **Goal**: Systematically implement notification, sharing, and safety features

---

## 🎯 Approved Features Overview

| Feature                          | Priority | Estimated Effort | Dependencies                |
| -------------------------------- | -------- | ---------------- | --------------------------- |
| PIN Protection for Child Safety  | HIGH     | 2-3 days         | None                        |
| Collection Sharing System        | HIGH     | 3-4 days         | None                        |
| Notification Infrastructure (UI) | HIGH     | 2 days           | None                        |
| Email Notifications              | MEDIUM   | 3-4 days         | Notification Infrastructure |
| Auto-Updating Collections        | MEDIUM   | 2-3 days         | Email/Notification System   |
| PWA Implementation               | LOW      | 4-6 hours        | None (independent)          |
| Personalized Recommendations     | RESEARCH | TBD              | Data collection phase       |

**Total Estimated Time**: 3-4 weeks for core features

---

## 📅 Implementation Phases

### **PHASE 1: PIN Protection for Child Safety Mode**

**Priority**: HIGH | **Effort**: 2-3 days | **Dependencies**: None

#### Current State

- Child Safety Mode exists (`components/content/ChildSafetyIndicator.tsx`)
- Can be toggled on/off by anyone (including children)
- TODO already documented at line 14-18

#### Implementation Plan

**1.1 Data Model** (4 hours)

```typescript
// types/childSafety.ts
interface ChildSafetyPIN {
    hash: string // bcrypt hash of PIN (never store plaintext)
    createdAt: number // Timestamp
    lastChangedAt: number // Timestamp
    enabled: boolean // Whether PIN protection is active
}

// Firestore: /users/{userId}/settings/childSafety
// localStorage: nettrailer_guest_child_safety_pin_{guestId}
```

**1.2 Backend/Firestore** (6 hours)

- Create `utils/firestore/childSafetyPIN.ts`
    - `createPIN(userId: string, pin: string): Promise<void>`
    - `verifyPIN(userId: string, pin: string): Promise<boolean>`
    - `updatePIN(userId: string, oldPin: string, newPin: string): Promise<void>`
    - `removePIN(userId: string, pin: string): Promise<void>`
    - Use bcrypt for hashing (install: `npm install bcryptjs @types/bcryptjs`)

**1.3 UI Components** (8 hours)

- Create `components/settings/ChildSafetyPINModal.tsx`
    - PIN creation flow (new users)
    - PIN verification flow (before toggling off)
    - PIN change flow (settings)
    - 4-6 digit numeric PIN input with dots
    - "Forgot PIN?" flow (require account email verification)

- Update `components/content/ChildSafetyIndicator.tsx`
    - Check for PIN before allowing toggle OFF
    - Show lock icon if PIN is enabled
    - "Set up PIN" prompt if Child Safety is ON but no PIN set

- Update `components/settings/ChildSafetySection.tsx`
    - Add "Change PIN" button
    - Add "Remove PIN Protection" button
    - Show PIN status (enabled/disabled)

**1.4 Store Integration** (2 hours)

- Add to `stores/sessionStore.ts` or create `stores/childSafetyStore.ts`:
    ```typescript
    interface ChildSafetyStore {
        isPINEnabled: boolean
        isPINVerified: boolean // Session-based, resets on page load
        verifyPIN: (pin: string) => Promise<boolean>
        requirePIN: () => void // Shows verification modal
    }
    ```

**1.5 Security Considerations**

- ✅ Use bcrypt with 10+ rounds for hashing
- ✅ Never store plaintext PINs
- ✅ Session-based verification (resets on browser close)
- ✅ Rate limiting: Max 5 attempts per minute
- ✅ Email notification on PIN changes
- ✅ Clear verification state on logout

**Deliverables**:

- [ ] PIN creation modal with validation
- [ ] PIN verification flow before disabling Child Safety
- [ ] PIN change/removal in settings
- [ ] Firestore integration with bcrypt hashing
- [ ] Guest mode support (localStorage)
- [ ] Unit tests for PIN verification logic

---

### **PHASE 2: Collection Sharing System**

**Priority**: HIGH | **Effort**: 3-4 days | **Dependencies**: None

#### Current State

- UI exists: `components/settings/ShareSection.tsx:36-48`
- "Manage Sharing" button is non-functional placeholder
- Collections (watchlists) exist in Firestore

#### Implementation Plan

**2.1 Data Model** (4 hours)

```typescript
// types/sharing.ts
interface ShareableLink {
    id: string // Unique share ID (nanoid or uuid)
    collectionId: string // Collection being shared
    userId: string // Owner user ID
    createdAt: number // Timestamp
    expiresAt: number | null // Null = never expires
    isActive: boolean // Can be deactivated without deleting
    viewCount: number // Track how many times viewed
    allowDuplicates: boolean // Allow viewers to copy to their lists
}

interface ShareSettings {
    visibility: 'private' | 'public' | 'link-only' // Default: 'private'
    allowComments: boolean // Future feature
    showOwnerName: boolean // Show/hide creator
}

// Firestore structure:
// /shares/{shareId} -> ShareableLink
// /users/{userId}/collections/{collectionId} -> add shareSettings field
```

**2.2 Backend API Routes** (8 hours)
Create `/app/api/shares/` routes:

- `POST /api/shares/create`

    ```typescript
    // Request: { collectionId, expiresIn?: number, settings: ShareSettings }
    // Response: { shareId, shareUrl }
    ```

- `GET /api/shares/[shareId]`

    ```typescript
    // Public endpoint - no auth required
    // Returns collection data if link is valid
    // Increments viewCount
    ```

- `DELETE /api/shares/[shareId]`

    ```typescript
    // Deactivate share link (requires owner auth)
    ```

- `GET /api/shares/user/[userId]`
    ```typescript
    // List all shares for a user (requires auth)
    ```

**2.3 Firestore Functions** (6 hours)

- Create `utils/firestore/shares.ts`
    - `createShareLink(userId, collectionId, options): Promise<ShareableLink>`
    - `getShareByID(shareId): Promise<ShareableLink | null>`
    - `deactivateShare(shareId, userId): Promise<void>`
    - `getUserShares(userId): Promise<ShareableLink[]>`
    - `incrementViewCount(shareId): Promise<void>`

**2.4 UI Components** (10 hours)

**ShareModal.tsx** (new component)

- Create/manage share links for a collection
- Copy link button with toast confirmation
- Expiration options: Never, 7 days, 30 days, 90 days
- Toggle active/inactive
- View count display
- Delete share link button

**SharedCollectionView.tsx** (new page)

- Public page at `/shared/[shareId]`
- Display collection content (read-only)
- "Add to My Collections" button (requires auth)
- Show owner name if settings allow
- Increment view count on load

**Update existing components**:

- `components/settings/ShareSection.tsx`: Wire up "Manage Sharing" button
- `components/collections/CollectionCard.tsx`: Add share icon/button
- `components/collections/CollectionModal.tsx`: Add share button in modal

**2.5 URL Sharing** (2 hours)

- Generate shareable URLs: `https://nettrailers.com/shared/{shareId}`
- Open Graph meta tags for rich link previews:
    ```html
    <meta property="og:title" content="Check out my {collectionName} collection" />
    <meta property="og:image" content="{first collection item poster}" />
    <meta property="og:description" content="{collection.length} titles" />
    ```

**2.6 Security Considerations**

- ✅ Validate shareId format (prevent injection)
- ✅ Check link expiration before serving content
- ✅ Rate limit view increments (prevent spam)
- ✅ Only owner can delete/deactivate links
- ✅ Sanitize collection data before public display

**Deliverables**:

- [ ] Share link generation API
- [ ] ShareModal component with expiration options
- [ ] Public shared collection view page
- [ ] Copy link functionality with toast
- [ ] View count tracking
- [ ] "Add to My Collections" feature for viewers
- [ ] Open Graph meta tags for link previews

---

### **PHASE 3: Notification Infrastructure (UI)**

**Priority**: HIGH | **Effort**: 2 days | **Dependencies**: None

#### Goal

Build in-app notification center (top-right bell icon) before adding email/push notifications.

#### Implementation Plan

**3.1 Data Model** (3 hours)

```typescript
// types/notifications.ts
type NotificationType =
    | 'collection_update' // New content added to followed collection
    | 'new_release' // Movie/show from watchlist released
    | 'share_activity' // Someone viewed your shared link
    | 'system' // App updates, announcements

interface Notification {
    id: string
    userId: string
    type: NotificationType
    title: string
    message: string
    contentId?: number // TMDB ID if related to content
    collectionId?: string // If related to a collection
    actionUrl?: string // Deep link (e.g., /collections/{id})
    imageUrl?: string // Poster image for visual appeal
    isRead: boolean
    createdAt: number
    expiresAt?: number // Auto-delete old notifications
}

// Firestore: /users/{userId}/notifications/{notificationId}
```

**3.2 Firestore Functions** (4 hours)

- Create `utils/firestore/notifications.ts`
    - `createNotification(userId, notification): Promise<void>`
    - `getUnreadNotifications(userId): Promise<Notification[]>`
    - `getAllNotifications(userId, limit?): Promise<Notification[]>`
    - `markAsRead(userId, notificationId): Promise<void>`
    - `markAllAsRead(userId): Promise<void>`
    - `deleteNotification(userId, notificationId): Promise<void>`
    - `deleteOldNotifications(userId, olderThan): Promise<void>` // Cleanup

**3.3 Zustand Store** (3 hours)

- Create `stores/notificationStore.ts`

    ```typescript
    interface NotificationStore {
        notifications: Notification[]
        unreadCount: number
        isLoading: boolean
        isPanelOpen: boolean

        // Actions
        loadNotifications: () => Promise<void>
        markAsRead: (id: string) => Promise<void>
        markAllAsRead: () => Promise<void>
        deleteNotification: (id: string) => Promise<void>
        togglePanel: () => void

        // Real-time subscription
        subscribeToNotifications: (userId: string) => () => void
    }
    ```

**3.4 UI Components** (6 hours)

**NotificationBell.tsx** (Header component)

- Bell icon in top-right header
- Red badge showing unread count
- Click to toggle notification panel
- Animate bell on new notification

**NotificationPanel.tsx** (Dropdown panel)

- Slide-down panel from bell icon
- List of notifications (most recent first)
- Mark as read on click
- "Mark all as read" button
- Delete individual notifications
- Empty state: "No notifications"
- Loading skeleton while fetching

**NotificationItem.tsx** (Individual notification)

- Icon based on type (sparkle for new release, users for share)
- Poster thumbnail if contentId exists
- Title + message
- Timestamp (relative: "2 hours ago")
- Click to navigate to actionUrl
- Unread indicator (blue dot or bold text)

**3.5 Real-time Updates** (3 hours)

- Use Firestore `onSnapshot` for real-time notifications
- Subscribe when user logs in
- Unsubscribe on logout
- Show toast when new notification arrives (optional, non-intrusive)

**Deliverables**:

- [ ] NotificationBell component in header
- [ ] NotificationPanel dropdown UI
- [ ] Firestore real-time subscription
- [ ] Mark as read/unread functionality
- [ ] Delete notifications
- [ ] Unread count badge
- [ ] Empty state and loading states

---

### **PHASE 4: Email Notifications**

**Priority**: MEDIUM | **Effort**: 3-4 days | **Dependencies**: Phase 3 (Notification Infrastructure)

#### Implementation Plan

**4.1 Email Service Selection** (Research: 2 hours)
**Options**:

1. **SendGrid** (Recommended)
    - Free tier: 100 emails/day
    - Easy Next.js integration
    - Template system
    - Good deliverability

2. **Resend** (Modern alternative)
    - Free tier: 3,000 emails/month
    - Built for developers
    - React Email integration
    - Simpler API

3. **Firebase Functions + Nodemailer**
    - Use existing Firebase
    - More complex setup
    - Cheaper at scale

**Recommendation**: Start with **Resend** for ease of use, switch to SendGrid if you need more volume.

**4.2 Setup Resend** (2 hours)

```bash
npm install resend
```

- Get API key from resend.com
- Verify domain (nettrailers.com) or use resend test domain
- Create email templates folder: `/emails/`

**4.3 Email Templates with React Email** (8 hours)

```bash
npm install @react-email/components
```

Create email templates (reusable React components):

**emails/CollectionUpdateEmail.tsx**

```tsx
// New content added to followed collection
// Shows: Collection name, new items added (with posters), CTA to view
```

**emails/NewReleaseEmail.tsx**

```tsx
// Content from watchlist now released
// Shows: Movie/show poster, title, release date, CTA to watch trailer
```

**emails/ShareActivityEmail.tsx**

```tsx
// Weekly digest of share link views
// Shows: Share link stats, view count, CTA to manage shares
```

**emails/WelcomeEmail.tsx**

```tsx
// Onboarding email when user signs up
// Shows: NetTrailers features, CTA to create first collection
```

**4.4 API Routes** (4 hours)
Create `/app/api/notifications/email/` routes:

- `POST /api/notifications/email/send`
    ```typescript
    // Internal API for sending emails
    // Called by backend cron jobs or triggers
    ```

**4.5 Email Preferences** (6 hours)

- Add to `types/shared.ts`:

    ```typescript
    interface EmailPreferences {
        enabled: boolean // Master toggle
        collectionUpdates: boolean // New content in followed collections
        newReleases: boolean // Watchlist items released
        shareActivity: boolean // Share link views (weekly digest)
        systemAnnouncements: boolean // App updates
        frequency: 'instant' | 'daily' | 'weekly' // Digest frequency
    }
    ```

- Update `components/settings/NotificationSettings.tsx`:
    - Email preferences section
    - Toggle for each notification type
    - Frequency selector
    - "Send test email" button

**4.6 Trigger System** (6 hours)
**Option A: Firebase Cloud Functions** (Recommended if using Firebase)

- Trigger on Firestore writes
- Send email when notification is created
- Respect user's email preferences

**Option B: Next.js API Routes + Cron Jobs**

- Use Vercel Cron Jobs (free tier available)
- Check for new releases daily
- Check for collection updates hourly
- Send digest emails based on user frequency

**4.7 Unsubscribe Flow** (3 hours)

- Add unsubscribe link to all emails
- Create `/unsubscribe/[token]` page
- One-click unsubscribe (no login required)
- Allow re-subscription from settings

**Deliverables**:

- [ ] Resend integration
- [ ] 4 email templates (React Email components)
- [ ] Email preferences in settings
- [ ] Send email API route
- [ ] Trigger system (cron or cloud functions)
- [ ] Unsubscribe flow
- [ ] Test email functionality

---

### **PHASE 5: Auto-Updating Collections with Notifications**

**Priority**: MEDIUM | **Effort**: 2-3 days | **Dependencies**: Phase 3 & 4

#### Goal

Collections can be "followed" and automatically notify users when new matching content is added.

#### Implementation Plan

**5.1 Data Model Updates** (2 hours)

```typescript
// Update existing CustomRow interface
interface CustomRow {
    // ... existing fields
    isFollowed?: boolean // User is subscribed to updates
    lastCheckedAt?: number // Last time we checked TMDB for new content
    autoUpdateEnabled: boolean // Owner setting: allow auto-updates
    updateFrequency: 'daily' | 'weekly' | 'never' // How often to check
}

// New tracking collection
interface CollectionUpdate {
    id: string
    collectionId: string
    userId: string // Collection owner
    newContentIds: number[] // TMDB IDs of new matches
    checkedAt: number
    notificationSent: boolean
}

// Firestore: /collectionUpdates/{updateId}
```

**5.2 TMDB Content Discovery** (8 hours)

- Create `utils/tmdb/contentDiscovery.ts`
    - `checkForNewContent(collection: CustomRow): Promise<number[]>`
        - Query TMDB discover API with collection's genre filters
        - Filter by release date > lastCheckedAt
        - Return new content IDs that match criteria

    - `addContentToCollection(collectionId, contentIds): Promise<void>`
        - Append new content IDs to advancedFilters.contentIds
        - Update lastCheckedAt timestamp

**5.3 Background Job System** (10 hours)
**Option A: Vercel Cron Jobs** (Simpler, free tier limits)

- Create `/app/api/cron/update-collections/route.ts`
- Runs daily at 2 AM UTC
- Queries all collections where `autoUpdateEnabled = true`
- Checks TMDB for new matches
- Creates notifications + sends emails

**Option B: Firebase Cloud Functions** (More robust)

- Scheduled function runs daily
- Better for scale (no Vercel timeout limits)
- Can batch process large numbers of collections

**Implementation**:

```typescript
// /app/api/cron/update-collections/route.ts
export async function GET(request: NextRequest) {
    // Verify cron secret to prevent unauthorized calls
    if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all auto-updating collections
    const collections = await getAutoUpdateCollections()

    for (const collection of collections) {
        const newContentIds = await checkForNewContent(collection)

        if (newContentIds.length > 0) {
            // Add content to collection
            await addContentToCollection(collection.id, newContentIds)

            // Create notification for owner
            await createNotification(collection.userId, {
                type: 'collection_update',
                title: `${newContentIds.length} new titles in "${collection.name}"`,
                message: 'Your collection has been updated with new matching content',
                collectionId: collection.id,
                actionUrl: `/collections/${collection.id}`,
            })

            // Send email if user has email notifications enabled
            const userPrefs = await getEmailPreferences(collection.userId)
            if (userPrefs.collectionUpdates && userPrefs.enabled) {
                await sendCollectionUpdateEmail(collection.userId, collection, newContentIds)
            }
        }
    }

    return NextResponse.json({ success: true, processed: collections.length })
}
```

**5.4 UI Updates** (4 hours)

- Add "Auto-Update" toggle to collection creation/edit modal
- Add "Follow Collection" button for viewing shared collections
- Show "Updated X hours ago" badge on auto-updating collections
- Settings page: List followed collections with unfollow option

**5.5 Notification Triggers** (3 hours)

- Integrate with Phase 3 notification system
- Create in-app notification when collection updates
- Badge on collection card showing "X new items"
- Click notification to see new additions highlighted

**Deliverables**:

- [ ] Auto-update toggle in collection settings
- [ ] Cron job for daily TMDB content checks
- [ ] Add new matching content to collections
- [ ] Generate notifications for updates
- [ ] Email integration for collection updates
- [ ] "Follow Collection" feature for shared lists
- [ ] UI indicators for recently updated collections

---

### **PHASE 6: PWA Implementation (Optional)**

**Priority**: LOW | **Effort**: 4-6 hours | **Dependencies**: None (can do anytime)

#### What You Get

- Install button in browser → users add to home screen
- Offline access to cached data
- Faster load times (service worker caching)
- App-like experience (no browser UI)

#### Implementation Plan

**6.1 Web App Manifest** (30 minutes)
Create `/public/manifest.json`:

```json
{
    "name": "NetTrailers",
    "short_name": "NetTrailers",
    "description": "Discover and organize movie & TV trailers",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#141414",
    "theme_color": "#E50914",
    "orientation": "portrait-primary",
    "icons": [
        {
            "src": "/icons/icon-192x192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any maskable"
        },
        {
            "src": "/icons/icon-512x512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any maskable"
        }
    ]
}
```

**6.2 App Icons** (1 hour)

- Create 192x192 and 512x512 PNG icons
- Use NetTrailers logo with background
- Tool: Use Figma or realfavicongenerator.net

**6.3 Link Manifest in HTML** (5 minutes)
Update `app/layout.tsx`:

```tsx
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#E50914" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

**6.4 Service Worker** (3 hours)
Create `/public/sw.js`:

```javascript
// Cache static assets
// Cache TMDB images
// Provide offline fallback page
// Strategy: Network first, fall back to cache
```

Register in `app/layout.tsx`:

```typescript
useEffect(() => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
    }
}, [])
```

**6.5 Install Prompt** (1 hour)
Create `components/utility/InstallPrompt.tsx`:

- Detect if app is installable
- Show custom "Install App" banner (dismissible)
- Handle beforeinstallprompt event
- Track installation analytics

**6.6 Offline Page** (30 minutes)
Create `/offline.html`:

- Friendly "You're offline" message
- Show cached collections if available
- Retry button

**Deliverables**:

- [ ] manifest.json with app metadata
- [ ] App icons (192x192, 512x512)
- [ ] Service worker for offline caching
- [ ] Install prompt UI
- [ ] Offline fallback page
- [ ] Testing on mobile devices

---

### **PHASE 7: Personalized Recommendations (Research Phase)**

**Priority**: RESEARCH | **Effort**: TBD | **Dependencies**: User interaction data

#### Challenge

No watch history = no personalization data. Need to collect user signals first.

#### Proposed Approach: Lightweight Recommendation Engine

**7.1 Data Collection (Foundation)** (1 week)
Start tracking user interactions:

```typescript
interface UserInteraction {
    userId: string
    contentId: number
    interactionType: 'view_modal' | 'add_to_watchlist' | 'like' | 'play_trailer'
    genreIds: number[]
    timestamp: number
    durationSeconds?: number // How long they watched trailer
}

// Firestore: /users/{userId}/interactions/{interactionId}
```

Track these events:

- Opening content modal (view)
- Adding to watchlist (strong signal)
- Removing from watchlist (negative signal)
- Playing trailer (medium signal)
- Trailer watch duration (engagement metric)

**7.2 Simple Recommendation Algorithm** (After 2-4 weeks of data)
**Approach**: Genre-based collaborative filtering

```typescript
// Pseudo-code algorithm
function getRecommendations(userId: string): Content[] {
    // 1. Get user's interaction history
    const interactions = await getUserInteractions(userId)

    // 2. Extract genre preferences (weighted by interaction type)
    const genreScores = {
        // Example: {28: 15, 12: 10, 878: 8}  // Action=15, Adventure=10, SciFi=8
    }
    interactions.forEach((interaction) => {
        const weight = getInteractionWeight(interaction.type) // like=3, view=1, etc.
        interaction.genreIds.forEach((genreId) => {
            genreScores[genreId] = (genreScores[genreId] || 0) + weight
        })
    })

    // 3. Get top genres
    const topGenres = getTopGenres(genreScores, 3) // Top 3 genres

    // 4. Query TMDB discover API for highly-rated content in those genres
    const recommendations = await fetchContentByGenres(topGenres, {
        minRating: 7.0,
        sortBy: 'popularity.desc',
        excludeIds: interactions.map((i) => i.contentId), // Don't recommend what they've seen
    })

    return recommendations
}
```

**7.3 Advanced Options (Long-term)**

- **Matrix Factorization**: If you get 10,000+ users with interaction data
- **TMDB Similar Content API**: Use TMDB's `/movie/{id}/similar` endpoint
- **Hybrid Approach**: Combine genre preferences + TMDB similar + trending

**7.4 UI Integration** (After algorithm is ready)

- New row: "Recommended For You"
- Replaces generic "Trending" on home page
- Refreshes weekly based on latest interactions

**Immediate Next Step**: Implement 7.1 (Data Collection) during Phase 3-5, so you have data ready when you're ready to build recommendations.

**Deliverables** (Phase 7.1 only for now):

- [ ] UserInteraction data model
- [ ] Track modal views in ContentModal
- [ ] Track watchlist additions
- [ ] Track trailer plays in video player
- [ ] Firestore write for each interaction
- [ ] Privacy settings: "Improve recommendations" toggle

---

## 🗓️ Recommended Implementation Order

### **Sprint 1** (Week 1): Security & Sharing

1. **Phase 1**: PIN Protection (2-3 days)
2. **Phase 2**: Collection Sharing (3-4 days)

**Why first**: High user value, security is important, sharing drives growth.

---

### **Sprint 2** (Week 2): Notification Infrastructure

3. **Phase 3**: In-app Notifications (2 days)
4. **Phase 7.1**: Start data collection for recommendations (1 day)
5. **Phase 6**: PWA basics (if time allows, 4-6 hours)

**Why second**: Foundation for email, quick wins with PWA.

---

### **Sprint 3** (Week 3): Email & Auto-Updates

6. **Phase 4**: Email Notifications (3-4 days)
7. **Phase 5**: Auto-Updating Collections (2-3 days)

**Why third**: Builds on notification infrastructure, high engagement feature.

---

### **Future Sprints**:

8. **Phase 7.2+**: Personalized Recommendations (after collecting 2-4 weeks of interaction data)

---

## 📊 Success Metrics

### Phase 1 (PIN Protection)

- % of users with Child Safety Mode who enable PIN
- PIN verification success rate
- Reduction in accidental Child Safety Mode toggles

### Phase 2 (Sharing)

- Number of share links created per user
- Share link click-through rate
- % of shared links that convert to new user signups
- "Add to My Collections" conversion rate

### Phase 3 (Notifications)

- Notification open rate
- Mark-as-read rate
- Notification click-through to action

### Phase 4 (Email)

- Email open rate (target: 20-30%)
- Email click-through rate (target: 5-10%)
- Unsubscribe rate (target: <2%)

### Phase 5 (Auto-Updates)

- % of collections with auto-update enabled
- Average new content added per collection per week
- User engagement with "new content" notifications

### Phase 6 (PWA)

- Install rate (% of users who install)
- Offline usage metrics
- App launch frequency (installed users)

### Phase 7 (Recommendations)

- Recommendation row engagement vs trending row
- Recommendation click-through rate
- Personalized content added to watchlists

---

## 🛠️ Technical Dependencies & Setup

### New NPM Packages Required

```bash
# Phase 1: PIN Protection
npm install bcryptjs @types/bcryptjs

# Phase 4: Email Notifications
npm install resend @react-email/components

# Phase 7: Recommendations (future)
npm install ml-matrix  # If doing matrix factorization
```

### Environment Variables

```env
# Phase 4: Email
RESEND_API_KEY=re_xxxxxxxxxxxx

# Phase 5: Cron Jobs
CRON_SECRET=your_secret_key_here

# Phase 7: Analytics (optional)
ANALYTICS_API_KEY=xxx
```

### Firestore Security Rules Updates

```javascript
// Phase 1: PIN access
match /users/{userId}/settings/childSafety {
  allow read, write: if request.auth.uid == userId;
}

// Phase 2: Share links (public read)
match /shares/{shareId} {
  allow read: if true;  // Public
  allow write: if request.auth.uid == resource.data.userId;  // Owner only
}

// Phase 3: Notifications
match /users/{userId}/notifications/{notificationId} {
  allow read, write: if request.auth.uid == userId;
}

// Phase 7: Interactions
match /users/{userId}/interactions/{interactionId} {
  allow read, write: if request.auth.uid == userId;
}
```

---

## 🚀 Quick Start: Which Phase First?

**If you want to start NOW**, I recommend:

### **Option A: Quick Win** (4-6 hours)

→ **Phase 6: PWA** - Independent, fast, impressive "install app" feature

### **Option B: High User Value** (2-3 days)

→ **Phase 1: PIN Protection** - Security feature users will appreciate, TODO already exists

### **Option C: Growth Feature** (3-4 days)

→ **Phase 2: Collection Sharing** - UI already exists, drives user acquisition

**My recommendation**: Start with **Phase 1 (PIN Protection)**, it's well-scoped, has immediate security value, and builds confidence for the notification work.

---

## 📝 Notes & Considerations

### Scaling Considerations

- **Email limits**: Resend free tier = 3,000/month. If you exceed, upgrade ($20/mo for 50k emails)
- **Firestore reads**: Notification subscriptions cost reads. Use pagination (load 20 at a time)
- **TMDB API limits**: 40 req/second. Auto-update cron should batch requests with delays
- **Cron job limits**: Vercel free tier = 1 cron per day. Upgrade if you need hourly checks

### Privacy & GDPR

- ✅ Email preferences with easy unsubscribe
- ✅ "Improve recommendations" toggle for data collection
- ✅ Data export includes interactions (add to existing CSV export)
- ✅ Data deletion removes interactions + notifications

### Testing Strategy

- Unit tests for PIN verification logic (bcrypt)
- Integration tests for email sending
- E2E tests for share link flows
- Manual testing on mobile for PWA

---

**Ready to start?** Let me know which phase you want to tackle first, and I'll begin implementation!

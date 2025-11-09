# Notification System

## Overview

The Notification System provides in-app notifications for users to stay informed about collection updates, new releases, share activity, and system announcements. The system uses Firestore for real-time updates and supports auto-expiration and cleanup of old notifications.

**Status**: ✅ Implemented (Phase 3 - Feature Roadmap 2025)

**Implementation Date**: January 2025

## Features

### Core Capabilities

1. **Real-time Notifications**
    - Live updates via Firestore onSnapshot
    - Instant delivery to all active sessions
    - Automatic syncing across devices

2. **Notification Types**
    - `collection_update` - New content added to followed collections
    - `new_release` - Movies/shows from watchlist released
    - `share_activity` - Someone viewed your shared link
    - `system` - App updates and announcements

3. **Smart Management**
    - Auto-expiration (30 days default)
    - Auto-cleanup (removes notifications older than 60 days)
    - Unread count tracking
    - Mark as read on interaction

4. **User Actions**
    - Mark individual notification as read
    - Mark all as read (batch operation)
    - Delete individual notification
    - Clear all notifications (with confirmation)
    - Click notification to navigate to related content

## Architecture

### Data Model

**Firestore Location**: `/users/{userId}/notifications/{notificationId}`

```typescript
interface Notification {
    id: string // nanoid(12)
    userId: string // Owner ID
    type: NotificationType // collection_update | new_release | share_activity | system
    title: string // Short title
    message: string // Detailed message
    contentId?: number // TMDB content ID (if applicable)
    collectionId?: string // Collection ID (if applicable)
    shareId?: string // Share ID (if applicable)
    actionUrl?: string // Deep link (e.g., /collections/{id})
    imageUrl?: string // Poster image URL
    isRead: boolean // Read status
    createdAt: number // Timestamp
    expiresAt?: number // Expiration timestamp
}
```

### Components

#### NotificationBell (`components/notifications/NotificationBell.tsx`)

- Bell icon in header with unread badge
- Shows solid blue icon when unread notifications present
- Pulse animation for new notifications
- Badge displays count (max 99+)
- Toggles NotificationPanel on click
- Hidden for guest users

**Props**: None (uses stores)

**Key Features**:

- Real-time subscription to notifications
- Auto-cleanup on unmount
- Accessible with ARIA labels

#### NotificationPanel (`components/notifications/NotificationPanel.tsx`)

- Dropdown panel showing all notifications
- Max height with scrolling (max-h-96)
- Click outside to close
- Escape key to close
- Empty state message

**Actions**:

- Mark all as read
- Clear all (with confirmation)

**States**:

- Loading spinner
- Empty state ("You're all caught up!")
- List of notifications

#### NotificationItem (`components/notifications/NotificationItem.tsx`)

- Individual notification display
- Type-specific icons and colors
- Relative timestamp ("5m ago", "2h ago", "3d ago")
- Delete button (visible on hover)
- Unread indicator (blue left border)
- Click to mark as read and navigate

**Visual Design**:

- Unread: blue background tint, white text, blue indicator
- Read: gray background, dimmed text
- Delete: X button appears on hover

### State Management

#### notificationStore (`stores/notificationStore.ts`)

Zustand store for notification state with real-time Firestore sync.

**State**:

```typescript
{
    notifications: Notification[]
    unreadCount: number
    isLoading: boolean
    isPanelOpen: boolean
    stats: NotificationStats | null
    error: string | null
    unsubscribe: (() => void) | null
}
```

**Actions**:

- `loadNotifications(userId)` - Load all notifications
- `loadUnreadNotifications(userId)` - Load only unread
- `loadStats(userId)` - Load statistics
- `createNotification(userId, request)` - Create new notification
- `markNotificationAsRead(userId, notificationId)` - Mark single as read
- `markAllNotificationsAsRead(userId)` - Mark all as read
- `deleteNotification(userId, notificationId)` - Delete single
- `deleteAllNotifications(userId)` - Delete all
- `togglePanel()` / `openPanel()` / `closePanel()` - Panel control
- `subscribe(userId)` - Start real-time subscription
- `unsubscribeFromNotifications()` - Stop subscription
- `clearNotifications()` - Clear local state

**Real-time Subscription**:

- Automatically subscribes when userId changes
- Unsubscribes on component unmount
- Handles errors gracefully
- Updates unread count automatically

### Firestore Utilities

#### notifications.ts (`utils/firestore/notifications.ts`)

**CRUD Operations**:

- `createNotification(userId, request)` - Create new notification
- `getAllNotifications(userId, limit?)` - Fetch all (sorted by createdAt desc)
- `getUnreadNotifications(userId)` - Fetch only unread
- `markAsRead(userId, notificationId)` - Mark single as read
- `markAllAsRead(userId)` - Mark all as read (parallel)
- `deleteNotification(userId, notificationId)` - Delete single
- `deleteAllNotifications(userId)` - Delete all (parallel)
- `cleanupOldNotifications(userId, olderThanDays?)` - Auto-cleanup

**Statistics**:

- `getNotificationStats(userId)` - Calculate statistics
    - Total count
    - Unread count
    - Counts by type
    - Most recent notification

**Real-time Subscription**:

- `subscribeToNotifications(userId, onUpdate)` - Subscribe with callback
- Returns unsubscribe function
- Handles errors with empty array fallback

**Auto-cleanup**:

- Triggered on notification create (async, non-blocking)
- Removes expired notifications
- Removes notifications older than threshold (60 days)
- Prevents unlimited data growth

## Usage Examples

### Creating a Notification

```typescript
import { createNotification } from '@/utils/firestore/notifications'

// Example: Notify when someone views your shared collection
await createNotification(shareOwnerId, {
    type: 'share_activity',
    title: 'New View on Shared Collection',
    message: `Someone viewed your shared collection "${collectionName}"`,
    collectionId: collection.id,
    shareId: share.id,
    actionUrl: `/collections/${collection.id}`,
    imageUrl: collection.coverImageUrl,
    expiresIn: 30, // Days until expiration (default: 30)
})
```

### Integration Example (Collection Sharing)

```typescript
// When a share is viewed, notify the owner
import { incrementViewCount } from '@/utils/firestore/shares'
import { createNotification } from '@/utils/firestore/notifications'

const handleViewShare = async (shareId: string) => {
    const shareData = await incrementViewCount(shareId)

    // Create notification for share owner
    await createNotification(shareData.share.userId, {
        type: 'share_activity',
        title: 'Collection Shared',
        message: `Your collection "${shareData.share.collectionName}" was viewed`,
        shareId: shareId,
        collectionId: shareData.share.collectionId,
        actionUrl: `/shared/${shareId}`,
    })
}
```

### Using the Store

```typescript
import { useNotificationStore } from '@/stores/notificationStore'
import { useSessionStore } from '@/stores/sessionStore'

function MyComponent() {
    const { userId } = useSessionStore()
    const {
        notifications,
        unreadCount,
        markNotificationAsRead,
        subscribe
    } = useNotificationStore()

    useEffect(() => {
        if (userId) {
            subscribe(userId) // Start real-time updates
        }

        return () => {
            unsubscribeFromNotifications() // Cleanup
        }
    }, [userId])

    return (
        <div>
            <h2>You have {unreadCount} unread notifications</h2>
            {notifications.map(notification => (
                <div
                    key={notification.id}
                    onClick={() => markNotificationAsRead(userId, notification.id)}
                >
                    {notification.title}
                </div>
            ))}
        </div>
    )
}
```

## Constraints and Limits

```typescript
export const NOTIFICATION_CONSTRAINTS = {
    MAX_NOTIFICATIONS: 100, // Maximum per user (soft limit)
    DEFAULT_EXPIRATION_DAYS: 30, // Default expiration
    FETCH_LIMIT: 50, // Query limit
    CLEANUP_THRESHOLD_DAYS: 60, // Auto-cleanup threshold
}
```

## Visual Design

### Icon Colors by Type

| Type                | Icon          | Color                    | Background       |
| ------------------- | ------------- | ------------------------ | ---------------- |
| `collection_update` | SparklesIcon  | Purple (text-purple-500) | bg-purple-600/20 |
| `new_release`       | FilmIcon      | Blue (text-blue-500)     | bg-blue-600/20   |
| `share_activity`    | UserGroupIcon | Green (text-green-500)   | bg-green-600/20  |
| `system`            | BellIcon      | Gray (text-gray-500)     | bg-gray-600/20   |

### Notification States

**Unread**:

- Blue background tint (bg-blue-900/10)
- White text (text-white)
- Blue left border indicator (w-1 bg-blue-500)

**Read**:

- Transparent background
- Gray text (text-gray-300 / text-gray-400)
- No indicator

### Animation

**Bell Icon**:

- Pulse animation on unread notifications
- Scale up on hover (group-hover:scale-110)
- Transition from outline to solid when unread

**Panel**:

- Slide-in animation (implied by absolute positioning)
- Border and shadow (border-gray-700, shadow-2xl)

## Accessibility

- **ARIA Labels**: Bell button has descriptive label with unread count
- **ARIA Expanded**: Panel open state communicated to screen readers
- **Keyboard Support**: Escape key closes panel
- **Focus Management**: Click outside to close
- **Semantic HTML**: time element with dateTime attribute
- **Visual Indicators**: Color, text, and icons all convey state

## Security Considerations

1. **User Isolation**: Notifications stored per user (`/users/{userId}/notifications`)
2. **Firestore Security Rules**: Only authenticated users can read/write their own notifications
3. **No Cross-user Access**: Each user can only access their own notifications
4. **Input Validation**: All requests validated before Firestore operations
5. **Error Handling**: Graceful fallbacks prevent data leaks

### Recommended Firestore Security Rules

```javascript
// /users/{userId}/notifications/{notificationId}
match /users/{userId}/notifications/{notificationId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

## Performance Optimizations

1. **Real-time Subscription**: Only subscribes when user is active
2. **Query Limits**: Fetch max 50 notifications at a time
3. **Auto-cleanup**: Removes old data to prevent unbounded growth
4. **Optimistic Updates**: Local state updates immediately, syncs async
5. **Parallel Operations**: Batch operations use Promise.all()
6. **Indexed Queries**: Firestore queries use createdAt for sorting

## Future Enhancements

### Notification Preferences (Planned)

- Per-type notification settings
- Email digest (daily/weekly)
- Push notifications (browser/mobile)
- Do not disturb mode

### Advanced Features (Planned)

- Notification grouping (e.g., "3 people viewed your share")
- Rich media notifications (video thumbnails, trailers)
- Actionable notifications (e.g., "Add to Watchlist" button)
- Notification history archive
- Search/filter notifications

## Testing

### Manual Testing Checklist

- [ ] Notification bell appears in header (authenticated users only)
- [ ] Bell shows unread count badge
- [ ] Bell pulse animation when unread notifications present
- [ ] Panel opens/closes on bell click
- [ ] Panel closes on click outside
- [ ] Panel closes on Escape key
- [ ] Notifications display with correct icons/colors
- [ ] Timestamp shows relative time ("5m ago")
- [ ] Mark as read on notification click
- [ ] Navigation works when clicking notification with actionUrl
- [ ] Delete button appears on hover
- [ ] Delete removes notification
- [ ] Mark all as read works
- [ ] Clear all shows confirmation and works
- [ ] Real-time updates (test with multiple browser tabs)
- [ ] Guest users don't see bell

### Integration Testing

1. **Create Test Notification**:

```typescript
await createNotification(userId, {
    type: 'system',
    title: 'Test Notification',
    message: 'This is a test notification',
})
```

2. **Verify Real-time Update**: Notification appears instantly in open panels

3. **Verify Expiration**: Create notification with short expiration, verify auto-delete

4. **Verify Cleanup**: Create old notifications, trigger cleanup, verify deletion

## Files Modified/Created

### New Files (Phase 3)

1. `types/notifications.ts` (183 lines) - Data model and types
2. `utils/firestore/notifications.ts` (358 lines) - Firestore utilities
3. `stores/notificationStore.ts` (368 lines) - Zustand store
4. `components/notifications/NotificationBell.tsx` (85 lines) - Bell icon
5. `components/notifications/NotificationPanel.tsx` (170 lines) - Dropdown panel
6. `components/notifications/NotificationItem.tsx` (162 lines) - Notification item

### Modified Files

1. `components/layout/Header.tsx` - Added notification bell integration

### Documentation

1. `docs/current/NOTIFICATION_SYSTEM.md` - This file

**Total**: 6 new files, 1 modified file, ~1,326 lines of code

## Related Features

- **Collection Sharing** (Phase 2): Triggers share_activity notifications
- **Watchlists** (Existing): Can trigger new_release notifications (future)
- **Collections** (Existing): Can trigger collection_update notifications (future)

## Support

For questions or issues with the notification system:

1. Check Firestore security rules are properly configured
2. Verify user is authenticated (notifications require auth)
3. Check browser console for errors
4. Verify Firestore indexes exist for queries

## Changelog

**January 2025 - v1.0.0 (Phase 3)**

- ✅ Initial implementation
- ✅ Real-time notifications with Firestore onSnapshot
- ✅ Four notification types (collection_update, new_release, share_activity, system)
- ✅ Auto-expiration and cleanup
- ✅ Full UI with bell, panel, and item components
- ✅ Mark as read/unread functionality
- ✅ Delete individual/all notifications
- ✅ Integrated into header

---

**Last Updated**: January 2025
**Phase**: 3 - Notification Infrastructure UI
**Status**: Complete

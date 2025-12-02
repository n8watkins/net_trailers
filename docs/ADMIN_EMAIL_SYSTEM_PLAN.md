# Admin Email Management System - Implementation Plan

## Executive Summary

This document outlines a comprehensive plan to add manual email management and preview capabilities to the `/admin` panel, building on the existing cron jobs management system.

---

## Code Review Findings

### Current Email Infrastructure

**Email Service** (`lib/email/email-service.ts`):

- ✅ Unified EmailService class with static methods
- ✅ 5 email templates: Password Reset, Email Verification, Email Change, Trending Content, Social Digest
- ✅ Resend API integration with React component rendering
- ✅ Batch sending capability with rate limiting (10 emails/second, 1s delay between batches)
- ✅ Graceful degradation when Resend API key not configured

**Email Templates** (`lib/email/templates/`):

- ✅ All templates are React components (TSX)
- ✅ BaseEmail wrapper component for consistent branding
- ✅ Netflix-inspired styling (dark theme, red accents)
- ✅ Responsive table-based layouts for email client compatibility
- ✅ Unsubscribe links integrated
- ✅ Direct rendering via Resend's `react` parameter (no HTML conversion needed)

**User Data Structure** (Firestore `/users/{userId}`):

```typescript
{
  email: string,
  displayName?: string,
  notifications: {
    email: boolean,              // Master email toggle
    types: {
      trending_update: boolean,   // Trending content emails
      social_interactions: boolean, // Comment/like digests
      collection_update: boolean  // New content in collections
    }
  }
}
```

**User Filtering Capabilities**:

- `/api/admin/users` - Lists all Firebase Auth users (pagination supported)
- Cron jobs iterate Firestore `/users` collection
- Current filtering: by notification preferences only
- No advanced segmentation (signup date, activity, etc.)

**Existing Manual Email Triggers**:

- `/api/email/send-pilot` - Sends trending email (admin-only, single recipient)
- `/api/email/test-weekly-digest` - Triggers trending cron (admin-only mode)
- `/api/email/test-social-interactions` - Creates fake interactions + sends digest

**Preview Capabilities**:

- ❌ No email preview functionality currently exists
- ✅ Templates are React components (can be rendered to HTML)
- ✅ Resend API has no native preview endpoint
- Need to build custom preview renderer

---

## Proposed Implementation

### Phase 1: Email Composer & User Selection

#### 1.1 - Email Composer Component

**File**: `components/admin/EmailComposer.tsx`

**Features**:

- Template selection dropdown (Trending, Social Digest, Custom Announcement)
- Recipient selection:
    - "All Users" - Send to all eligible users
    - "Test (Admin Only)" - Send to admin for testing
    - "Custom Selection" - Multi-select user list
    - "Filter by Preferences" - Auto-filter by notification opt-ins
- Subject line input (for custom emails)
- Rich text editor for custom email body (optional)
- Preview button → Opens preview modal
- Send button → Confirms and sends

**Technical Details**:

```tsx
interface EmailComposerProps {
    // Initial template to load (optional)
    initialTemplate?: 'trending' | 'social' | 'custom'
}

interface EmailComposerState {
    template: EmailTemplate
    recipients: RecipientSelection
    subject: string
    customContent?: string
    sending: boolean
    previewOpen: boolean
}
```

#### 1.2 - User Selection Component

**File**: `components/admin/UserSelector.tsx`

**Features**:

- Search/filter users by email, name
- Display user notification preferences (badges)
- Checkbox selection (multi-select)
- "Select All" / "Select None" buttons
- Filter shortcuts:
    - "Trending Opt-ins Only"
    - "Social Opt-ins Only"
    - "All Email Enabled"
    - "Recently Active (30 days)"
    - "New Signups (7 days)"
- Show recipient count in real-time
- Preview selected users list

**Technical Details**:

```tsx
interface UserSelectorProps {
    onSelectionChange: (users: SelectedUser[]) => void
    filterType?: 'trending' | 'social' | 'all'
}

interface SelectedUser {
    uid: string
    email: string
    displayName: string
    preferences: UserNotificationPreferences
}
```

#### 1.3 - New Admin API Endpoints

**Endpoint**: `POST /api/admin/email/send`

- Validates admin authentication
- Accepts: template type, recipients array, custom content
- Validates recipient opt-ins based on template type
- Sends via EmailService.batchSend()
- Returns: emailsSent, skipped, errors

```typescript
interface SendEmailRequest {
    template: 'trending' | 'social' | 'custom'
    recipients: 'all' | 'admin' | string[] // user IDs
    subject?: string // For custom emails
    customContent?: string // For custom emails
    filterByPreferences?: boolean // Auto-filter by opt-ins
}

interface SendEmailResponse {
    success: boolean
    emailsSent: number
    skipped: number
    errors: string[]
    details: {
        sent: string[] // user emails
        skipped: Array<{
            email: string
            reason: string
        }>
    }
}
```

**Endpoint**: `GET /api/admin/users/filtered`

- Extends existing `/api/admin/users`
- Add query params:
    - `?filter=trending` - Users with trending emails enabled
    - `?filter=social` - Users with social emails enabled
    - `?filter=all_email` - Users with any email enabled
    - `?recentDays=30` - Active in last N days
    - `?newSignups=7` - Signed up in last N days

---

### Phase 2: Email Preview System

#### 2.1 - Preview Modal Component

**File**: `components/admin/EmailPreviewModal.tsx`

**Features**:

- Full-screen modal overlay
- Desktop/Mobile view toggle
- Live preview of selected template
- Sample data injection (uses admin's data or mock data)
- "Send Test to Me" button
- "Close" and "Proceed to Send" buttons

**Technical Details**:

```tsx
interface EmailPreviewModalProps {
    template: EmailTemplate
    sampleData: EmailTemplateData
    onClose: () => void
    onSendTest: () => void
    onProceedToSend: () => void
}
```

#### 2.2 - Email Preview Renderer

**File**: `lib/email/preview-renderer.ts`

**Purpose**: Render React email components to HTML for preview

**Technical Approach**:

- Use `@react-email/render` package (same as Resend uses internally)
- Render template component to HTML string
- Inject sample data based on template type
- Return HTML for iframe rendering in modal

```typescript
import { render } from '@react-email/render'
import { TrendingContentEmail, SocialDigestEmail } from './templates'

export async function renderEmailPreview(
    template: EmailTemplate,
    sampleData: any
): Promise<string> {
    let component: React.ReactElement

    switch (template.type) {
        case 'trending':
            component = TrendingContentEmail({
                userName: sampleData.userName,
                movies: sampleData.movies,
                tvShows: sampleData.tvShows,
            })
            break
        case 'social':
            component = SocialDigestEmail({
                userName: sampleData.userName,
                interactions: sampleData.interactions,
            })
            break
    }

    return render(component)
}
```

#### 2.3 - Preview API Endpoint

**Endpoint**: `POST /api/admin/email/preview`

- Validates admin authentication
- Accepts: template type, sample data (optional)
- Renders template to HTML using preview-renderer
- Returns HTML string for iframe rendering

```typescript
interface PreviewEmailRequest {
    template: 'trending' | 'social' | 'custom'
    sampleData?: any
}

interface PreviewEmailResponse {
    html: string
    subject: string
}
```

---

### Phase 3: Admin Panel Integration

#### 3.1 - Email Management Panel

**File**: `components/admin/EmailManagementPanel.tsx`

**Structure**:

```
┌─────────────────────────────────────────────────┐
│ Email Management                                 │
├─────────────────────────────────────────────────┤
│                                                  │
│ [Overview Section] - Collapsible                │
│   - Total users: 50                             │
│   - Email enabled: 35                           │
│   - Trending opt-ins: 20                        │
│   - Social opt-ins: 15                          │
│   - Last email sent: 2 hours ago                │
│                                                  │
│ [Quick Send Section] - Collapsible              │
│   ┌──────────────────────────────────────┐     │
│   │ Template: [Trending Content ▼]       │     │
│   │ Recipients: [All Users ▼]            │     │
│   │ [Preview] [Send to All]              │     │
│   └──────────────────────────────────────┘     │
│                                                  │
│ [Custom Email Section] - Collapsible            │
│   - Create custom announcement emails           │
│   - Rich text editor                            │
│   - User selection interface                    │
│   - Preview + Send                              │
│                                                  │
│ [Email History Section] - Collapsible           │
│   - Recent 10 sent emails                       │
│   - Template type, recipients, timestamp        │
│   - Success/failure status                      │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Integration with Admin Page**:

- Add after Cron Jobs Management section
- Before System Logs section
- Consistent styling with existing panels

#### 3.2 - Update Admin Dashboard

**File**: `app/admin/page.tsx`

**Changes**:

```tsx
import EmailManagementPanel from '@/components/admin/EmailManagementPanel'

// Add after CronJobsPanel
;<div className="mt-8">
    <EmailManagementPanel />
</div>
```

---

### Phase 4: Custom Email Template

#### 4.1 - Announcement Email Template

**File**: `lib/email/templates/announcement.tsx`

**Purpose**: Generic template for admin-created custom emails

**Features**:

- Flexible content area (supports HTML/Markdown)
- Optional hero image
- CTA button (optional)
- Consistent Net Trailers branding
- Unsubscribe link

```tsx
interface AnnouncementEmailProps {
    userName: string
    subject: string
    content: string // HTML or Markdown
    heroImage?: string
    ctaButton?: {
        text: string
        url: string
    }
    unsubscribeToken?: string
}
```

#### 4.2 - Rich Text Editor Integration

**Component**: `components/admin/RichTextEditor.tsx`

**Library Options**:

- Option 1: `@tiptap/react` (recommended - modern, React-first)
- Option 2: `react-quill` (stable, widely used)
- Option 3: `slate-react` (highly customizable)

**Features**:

- Bold, italic, underline
- Headings (H1, H2, H3)
- Lists (ordered, unordered)
- Links
- Images (upload or URL)
- Preview mode

---

### Phase 5: Email History & Analytics

#### 5.1 - Email History Storage

**Firestore Collection**: `/admin_emails/{emailId}`

**Schema**:

```typescript
interface EmailHistoryEntry {
    id: string
    template: 'trending' | 'social' | 'custom'
    subject: string
    sentBy: string // Admin UID
    sentAt: number // Timestamp
    recipientCount: number
    successCount: number
    failureCount: number
    recipients: string[] // User IDs (for audit trail)
    errors?: Array<{
        email: string
        error: string
    }>
}
```

#### 5.2 - Email History Component

**File**: `components/admin/EmailHistory.tsx`

**Features**:

- Table view of recent emails
- Columns: Template, Subject, Recipients, Sent At, Status
- Filter by template type
- Click row to see details (recipients, errors)
- Export to CSV

---

## Implementation Phases & Timeline

### Phase 1: Core Email Composer (Days 1-2)

- [ ] EmailComposer component
- [ ] UserSelector component
- [ ] POST `/api/admin/email/send` endpoint
- [ ] GET `/api/admin/users/filtered` endpoint
- [ ] Basic UI integration in admin panel

**Deliverable**: Ability to send trending/social emails to selected users

### Phase 2: Email Preview (Day 3)

- [ ] Install `@react-email/render` package
- [ ] EmailPreviewModal component
- [ ] preview-renderer utility
- [ ] POST `/api/admin/email/preview` endpoint
- [ ] Integrate preview button in EmailComposer

**Deliverable**: Full email preview before sending

### Phase 3: Custom Emails (Day 4)

- [ ] Announcement email template
- [ ] RichTextEditor component (TipTap integration)
- [ ] Custom email section in EmailComposer
- [ ] Update send endpoint to handle custom template

**Deliverable**: Create and send custom announcement emails

### Phase 4: Email History (Day 5)

- [ ] Firestore collection setup
- [ ] EmailHistory component
- [ ] Save email history after send
- [ ] Display in admin panel

**Deliverable**: Track and review sent emails

### Phase 5: Polish & Documentation (Day 6)

- [ ] Error handling and loading states
- [ ] Toast notifications for all actions
- [ ] Admin panel documentation update
- [ ] Testing with multiple user scenarios
- [ ] Update docs/ADMIN_EMAIL_SYSTEM.md

**Deliverable**: Production-ready email management system

---

## Technical Considerations

### Security

1. **Authentication**
    - All endpoints require admin validation
    - Use existing `validateAdminRequest` middleware
    - Never expose user IDs or emails in client logs

2. **Authorization**
    - Only admins can send emails
    - Respect user notification preferences
    - Include unsubscribe links in all emails

3. **Input Validation**
    - Sanitize custom email content (prevent XSS)
    - Validate email template parameters
    - Limit recipient count (e.g., max 100 users per send)

4. **Rate Limiting**
    - Use existing EmailService.batchSend() rate limiting
    - Add cooldown between sends (e.g., 1 email blast per 5 minutes)
    - Store last send timestamp in admin state

### Performance

1. **Batch Processing**
    - Send emails in batches of 10 (current EmailService limit)
    - 1-second delay between batches
    - Show progress indicator during send

2. **User Filtering**
    - Index Firestore queries (email, notifications.email)
    - Paginate user lists (100 per page)
    - Cache user list for 5 minutes

3. **Preview Rendering**
    - Cache rendered HTML for 30 seconds
    - Use React.memo for preview components
    - Debounce preview updates (500ms)

### User Experience

1. **Confirmation Dialogs**
    - Confirm before sending to "All Users"
    - Show recipient count in confirmation
    - Preview email before sending

2. **Progress Feedback**
    - Loading spinner during send
    - Progress bar for batch sends
    - Toast notification on completion
    - Detailed result summary

3. **Error Handling**
    - User-friendly error messages
    - Retry failed emails option
    - Export failed recipients list

---

## Dependencies

### New Packages to Install

```json
{
    "@react-email/render": "^1.0.0", // For email preview rendering
    "@tiptap/react": "^2.1.13", // Rich text editor
    "@tiptap/starter-kit": "^2.1.13", // TipTap basic extensions
    "@tiptap/extension-link": "^2.1.13" // TipTap link support
}
```

### Existing Dependencies (No Changes)

- `resend` - Already configured
- `lucide-react` - Icons
- `firebase-admin` - User management

---

## API Reference

### POST /api/admin/email/send

Send emails to selected users

**Request**:

```typescript
{
  template: 'trending' | 'social' | 'custom',
  recipients: 'all' | 'admin' | string[],
  subject?: string,
  customContent?: string,
  filterByPreferences?: boolean
}
```

**Response**:

```typescript
{
  success: true,
  emailsSent: 25,
  skipped: 5,
  errors: [],
  details: {
    sent: ["user1@example.com", ...],
    skipped: [
      { email: "user2@example.com", reason: "Email not enabled" }
    ]
  }
}
```

### POST /api/admin/email/preview

Generate HTML preview of email template

**Request**:

```typescript
{
  template: 'trending' | 'social' | 'custom',
  sampleData?: {
    userName?: string,
    movies?: Content[],
    tvShows?: Content[],
    interactions?: Interaction[]
  }
}
```

**Response**:

```typescript
{
  html: "<html>...</html>",
  subject: "Trending This Week - Net Trailers"
}
```

### GET /api/admin/users/filtered

Get filtered user list

**Query Params**:

- `filter` - 'trending' | 'social' | 'all_email'
- `recentDays` - Number (activity filter)
- `newSignups` - Number (signup date filter)
- `pageSize` - Number (default 100)
- `pageToken` - String (pagination)

**Response**:

```typescript
{
  users: [
    {
      uid: string,
      email: string,
      displayName: string,
      preferences: {
        email: boolean,
        trending_update: boolean,
        social_interactions: boolean
      },
      createdAt: string,
      lastActive?: number
    }
  ],
  nextPageToken?: string,
  totalCount: number
}
```

---

## File Structure

```
components/admin/
├── EmailManagementPanel.tsx      # Main container
├── EmailComposer.tsx              # Email composition UI
├── UserSelector.tsx               # User selection/filtering
├── EmailPreviewModal.tsx          # Preview modal
├── EmailHistory.tsx               # Sent emails history
└── RichTextEditor.tsx             # Custom email editor

lib/email/
├── email-service.ts               # [EXISTING] Core email sending
├── preview-renderer.ts            # [NEW] Preview HTML rendering
└── templates/
    ├── announcement.tsx           # [NEW] Custom email template
    ├── trending-content.tsx       # [EXISTING]
    ├── social-digest.tsx          # [EXISTING]
    └── base-email.tsx             # [EXISTING]

app/api/admin/email/
├── send/route.ts                  # Send email endpoint
└── preview/route.ts               # Preview email endpoint

app/api/admin/users/
├── route.ts                       # [EXISTING] Get users
└── filtered/route.ts              # [NEW] Get filtered users

docs/
├── CRON_JOBS.md                   # [EXISTING]
└── ADMIN_EMAIL_SYSTEM.md          # [NEW] Email system docs
```

---

## Success Criteria

✅ **Must Have**:

- Send trending/social emails to all users or selected subset
- Preview emails before sending (desktop view)
- User selection with opt-in filtering
- Email history tracking
- Admin-only access with proper authentication

✅ **Nice to Have**:

- Custom announcement emails with rich text editor
- Mobile preview toggle
- Export email history to CSV
- Scheduled email sends (future enhancement)
- Email template customization (future enhancement)

✅ **Performance**:

- Send 100 emails in < 30 seconds
- Preview loads in < 2 seconds
- User list loads in < 3 seconds

✅ **User Experience**:

- Clear confirmation dialogs before sending
- Real-time progress indicators
- Detailed success/failure reporting
- Intuitive UI matching existing admin style

---

## Future Enhancements (Post-MVP)

1. **Email Analytics**
    - Open rates (via tracking pixels)
    - Click rates (via tracked links)
    - Unsubscribe rates
    - Bounce rates

2. **Advanced Segmentation**
    - Filter by genre preferences
    - Filter by watchlist size
    - Filter by collection count
    - Custom user segments

3. **Scheduled Sends**
    - Schedule email for future date/time
    - Recurring emails (weekly, monthly)
    - Queue management

4. **A/B Testing**
    - Multiple subject lines
    - Multiple email templates
    - Automatic winner selection

5. **Email Templates Library**
    - Multiple trending templates
    - Seasonal templates (holidays)
    - New feature announcements
    - Re-engagement campaigns

6. **Unsubscribe Management**
    - Granular unsubscribe preferences
    - Re-subscribe campaigns
    - Preference center

---

## Risks & Mitigation

### Risk 1: Resend API Rate Limits

**Mitigation**: Implement rate limiting, batch sending, monitor Resend dashboard

### Risk 2: Accidental Mass Emails

**Mitigation**: Confirmation dialogs, "All Users" warning, test mode default

### Risk 3: User Privacy Concerns

**Mitigation**: Respect opt-ins, include unsubscribe links, GDPR compliance

### Risk 4: Email Deliverability

**Mitigation**: Follow email best practices, SPF/DKIM records, monitor bounce rates

### Risk 5: Performance with Large User Base

**Mitigation**: Pagination, batching, background jobs for 1000+ recipients

---

## Questions for Clarification

1. **Email Volume**: What's the expected max users? (impacts batching strategy)

2. **Custom Emails**: Should custom emails support attachments? File uploads?

3. **Scheduling**: Is scheduled sending required for MVP or later?

4. **Analytics**: Should we track open/click rates from day 1?

5. **Templates**: Need custom HTML/CSS editing or pre-built templates only?

6. **Approval Process**: Should emails require a second admin approval before sending?

7. **Testing**: Should there be a "test send" to a test email list before production send?

---

## Summary

This implementation plan provides a comprehensive, production-ready email management system for the admin panel that:

- ✅ Builds on existing email infrastructure
- ✅ Integrates seamlessly with current admin UI patterns
- ✅ Respects user privacy and notification preferences
- ✅ Provides powerful preview and testing capabilities
- ✅ Maintains security and performance standards
- ✅ Offers clear path for future enhancements

**Estimated Development Time**: 5-6 days for MVP
**Complexity**: Medium-High (email rendering, user filtering, rich preview)
**Value**: High (enables targeted user communication, testing, announcements)

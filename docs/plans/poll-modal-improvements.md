# Poll Creation Modal Improvements Plan

## Overview

Simplify the poll creation experience and add time-limited editing with hide/delete functionality.

## Current State Analysis

**CreatePollModal.tsx** (294 lines):

- Category buttons in 2-3 column grid with large padding (`p-3`)
- Description textarea (optional, 500 chars max)
- Multiple choice toggle checkbox
- Expiration date with days selector (1-365)
- 2-10 poll options

**Existing functionality**:

- Delete polls: Works (owner only)
- Edit polls: Not implemented (header says "Polls cannot be edited after creation")
- Hide polls: Not implemented

---

## Requested Changes

| #   | Change                        | Impact                                  |
| --- | ----------------------------- | --------------------------------------- |
| 1   | Compact category selection    | UI only                                 |
| 2   | Remove description field      | Type + UI + Store                       |
| 3   | Remove multiple choice option | Type + UI + Store                       |
| 4   | Remove expiration date option | Type + UI + Store                       |
| 5   | 5-minute edit window          | New feature (Store + Rules + UI)        |
| 6   | Hide/unhide polls             | New feature (Type + Store + Rules + UI) |

---

## Implementation Plan

### Phase 1: Simplify Poll Type & Creation Modal

#### 1.1 Update Poll Type Definition

**File**: `types/forum.ts`

Remove from Poll interface:

- `description?: string`
- `expiresAt?: Timestamp`
- `isMultipleChoice: boolean`
- `allowAddOptions: boolean` (already unused)

Result: Polls are always single-choice, never expire, no description.

#### 1.2 Compact Category Selection

**File**: `components/forum/CreatePollModal.tsx`

Current (lines 150-178):

```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
    {/* Large buttons with icon + label + p-3 padding */}
</div>
```

Change to horizontal pill/chip layout:

```tsx
<div className="flex flex-wrap gap-2">
    {categories.map((cat) => (
        <button className="px-3 py-1.5 rounded-full text-sm ...">
            {cat.icon} {cat.name}
        </button>
    ))}
</div>
```

This gives compact inline pills instead of large grid buttons.

#### 1.3 Remove Description Field

**File**: `components/forum/CreatePollModal.tsx`

Delete lines 135-148 (description textarea section).
Remove `description` state variable and related logic.

#### 1.4 Remove Multiple Choice Option

**File**: `components/forum/CreatePollModal.tsx`

Delete lines 224-238 (multiple choice checkbox section).
Remove `isMultipleChoice` state - always false.

#### 1.5 Remove Expiration Date Option

**File**: `components/forum/CreatePollModal.tsx`

Delete lines 240-269 (expiration checkbox and days input).
Remove `hasExpiration` and `expirationDays` state variables.

#### 1.6 Update createPoll Function

**File**: `stores/forumStore.ts`

Simplify function signature:

```typescript
createPoll: async (
    userId: string,
    userName: string,
    userAvatar: string | undefined,
    question: string,
    options: string[],
    category: ForumCategory
    // Remove: description, isMultipleChoice, expiresInDays
) => { ... }
```

Set hardcoded values:

- `isMultipleChoice: false`
- `expiresAt: null` (or omit entirely)
- No description field

---

### Phase 2: Add Hide/Unhide Functionality

#### 2.1 Add Hidden Field to Poll Type

**File**: `types/forum.ts`

Add to Poll interface:

```typescript
isHidden?: boolean  // undefined or false = visible
```

#### 2.2 Add Store Functions

**File**: `stores/forumStore.ts`

```typescript
hidePoll: async (userId: string, pollId: string) => {
    // Verify ownership
    // Update poll: { isHidden: true }
    // Update local state
}

unhidePoll: async (userId: string, pollId: string) => {
    // Verify ownership
    // Update poll: { isHidden: false }
    // Update local state
}
```

#### 2.3 Update Firestore Rules

**File**: `firestore.rules`

Allow owner to update `isHidden` field (in addition to existing permissions).

#### 2.4 Filter Hidden Polls from Public Lists

**File**: `stores/forumStore.ts`

In `loadPolls` and `loadMorePolls`:

- Add `.where('isHidden', '!=', true)` to queries
- OR filter client-side after fetching

Note: Owner should still see their own hidden polls on their profile.

#### 2.5 Add Hide/Unhide UI

**File**: `app/community/polls/[id]/page.tsx`

Add toggle button for owner:

```tsx
{
    isOwner && (
        <button onClick={poll.isHidden ? handleUnhide : handleHide}>
            {poll.isHidden ? <EyeIcon /> : <EyeSlashIcon />}
            {poll.isHidden ? 'Show' : 'Hide'}
        </button>
    )
}
```

---

### Phase 3: Implement 5-Minute Edit Window

#### 3.1 Add Edit Capability to Store

**File**: `stores/forumStore.ts`

```typescript
updatePoll: async (
    userId: string,
    pollId: string,
    updates: { question?: string; options?: string[]; category?: ForumCategory }
) => {
    // 1. Verify ownership
    // 2. Check if poll was created within last 5 minutes
    // 3. Reset all votes (delete from poll_votes collection)
    // 4. Reset vote counts on all options to 0
    // 5. Update poll with new data
    // 6. Update local state
}

canEditPoll: (poll: Poll) => boolean
// Returns true if:
//   - createdAt is within last 5 minutes
// Note: Votes don't block editing - they get reset
```

#### 3.2 Add Firestore Security Rules

**File**: `firestore.rules`

```
// Allow full update only if:
// 1. User is owner
// 2. Poll created within last 5 minutes (300000ms)
allow update: if isOwner(resource.data.userId)
    && resource.data.createdAt.toMillis() > request.time.toMillis() - 300000
    && isValidPollData(request.resource.data);

// OR allow vote count updates (existing rule)
// OR allow isHidden toggle
```

**Note**: When editing, the store function will:

1. Delete all documents in `poll_votes` where `pollId` matches
2. Reset `totalVotes` to 0 and all `option.votes` to 0

#### 3.3 Add Edit Mode UI

**File**: `app/community/polls/[id]/page.tsx`

When within edit window and no votes:

- Show "Edit" button next to Delete button
- Clicking opens inline edit mode or edit modal
- Shows countdown: "Editable for X:XX more"
- After 5 min or first vote: Edit button disappears

#### 3.4 Create Edit Poll Modal (or inline editing)

**File**: `components/forum/EditPollModal.tsx` (new file)

Simplified version of CreatePollModal:

- Question input
- Category selection (compact)
- Options (can add/remove/edit)
- Save/Cancel buttons

---

## File Changes Summary

| File                                   | Changes                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| `types/forum.ts`                       | Remove description, expiresAt, isMultipleChoice, allowAddOptions; Add isHidden |
| `components/forum/CreatePollModal.tsx` | Compact categories, remove description/multiselect/expiration                  |
| `stores/forumStore.ts`                 | Simplify createPoll, add updatePoll, hidePoll, unhidePoll, canEditPoll         |
| `firestore.rules`                      | Add 5-min edit window rule, isHidden update rule                               |
| `app/community/polls/[id]/page.tsx`    | Add edit button (conditional), hide/unhide buttons                             |
| `components/forum/EditPollModal.tsx`   | New file for editing polls                                                     |
| `components/forum/PollCard.tsx`        | Handle isHidden display (if showing on owner's profile)                        |

---

## Implementation Order

1. **Phase 1.2**: Compact category selection (quick visual win)
2. **Phase 1.3-1.5**: Remove unused fields from UI
3. **Phase 1.6 + 1.1**: Update store and types (clean up backend)
4. **Phase 2.1-2.5**: Add hide/unhide functionality
5. **Phase 3.1-3.4**: Add 5-minute edit window

---

## Testing Checklist

- [ ] Create poll with compact category UI
- [ ] Verify no description, multi-choice, or expiration options
- [ ] Edit poll within 5 minutes (success)
- [ ] Attempt edit after 5 minutes (should fail)
- [ ] Attempt edit after receiving votes (should fail)
- [ ] Hide poll - verify not visible in public lists
- [ ] Unhide poll - verify visible again
- [ ] Delete poll - verify removed
- [ ] Firestore rules block unauthorized edits

---

## Migration Note

Existing polls in Firestore may have:

- `description` field
- `expiresAt` field
- `isMultipleChoice: true`

These should still display correctly (backward compatible).
New polls simply won't have these fields or will have default values.

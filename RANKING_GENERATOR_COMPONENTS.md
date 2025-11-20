# Ranking Generator - Component Details & Adaptation Guide

## Component Reuse Strategy

The ranking generator feature can leverage existing components with minimal modifications. This document shows what to reuse and how to adapt it.

---

## 1. CONTENT DISPLAY

### Source: ContentCard (`components/common/ContentCard.tsx`)

**Current Use**: Display movies/TV shows with interaction options

**Existing Features**:

- Lazy image loading with prefetch on hover
- Context menu: like, hide, add to watchlist
- Type-safe Content handling
- Modal opening for details

**Adaptation for Rankings**:

```typescript
interface RankingItemCardProps {
    content: Content
    rank: number          // Add ranking position
    score: number         // Add score display
    onScoreChange?: (score: number) => void  // For editing
    draggable?: boolean   // For reordering
    size?: 'small' | 'medium' | 'large'
}

// Add score badge overlay
<div className="absolute bottom-2 right-2 bg-yellow-500 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
    {rank}
</div>

// Add score input when editing
{onScoreChange && (
    <ScoreSlider value={score} onChange={onScoreChange} />
)}
```

**Advantages**:

- Already handles both movies and TV shows
- Built-in hover animations
- Integrated toast notifications
- No additional dependencies needed

---

## 2. LIST MANAGEMENT UI

### Source: ListSelectionModal (`components/modals/ListSelectionModal.tsx`)

**Current Use**: Create, edit, delete collections inline

**Current Features**:

- Create new list dialog
- Inline editing with icon/color picker
- Confirmation dialogs for deletion
- List creation validation

**Adaptation for Rankings**:

```typescript
// Reuse most of the modal structure
interface RankingCreationModalProps {
    isOpen: boolean
    onClose: () => void
    onCreateRanking: (data: RankingData) => Promise<void>
}

// Reuse these handlers directly
const handleCreateRanking = async (name: string, emoji: string, color: string) => {
    // Exact same pattern as createList
    const rankingId = await createRanking({
        name: sanitizeText(name),
        emoji: isValidEmoji(emoji) ? emoji : undefined,
        color: /^#[0-9A-Fa-f]{6}$/.test(color) ? color : undefined,
    })
}

// Reuse icon picker
<IconPickerModal
    isOpen={showIconPicker}
    onSelect={setSelectedEmoji}
    onClose={() => setShowIconPicker(false)}
/>

// Reuse color picker
<ColorPickerModal
    isOpen={showColorPicker}
    onSelect={setSelectedColor}
    onClose={() => setShowColorPicker(false)}
/>
```

**File to Copy From**:

- `/components/modals/IconPickerModal.tsx` - Icon selection
- `/components/modals/ColorPickerModal.tsx` - Color selection
- `/components/modals/ConfirmationModal.tsx` - Deletion confirmation

---

## 3. CREATION WIZARD

### Source: CustomRowWizard (`components/customRows/CustomRowWizard.tsx`)

**Current Use**: Multi-step collection creation

**Current Structure**:

1. **Step 1**: Basic info (name, emoji, color)
2. **Step 2**: Advanced filters (optional)
3. **Step 3**: Preview
4. **Step 4**: Confirmation

**Adaptation for Rankings**:

```typescript
// Keep steps 1 & 4, modify 2 & 3

// STEP 1 - Exact copy
interface WizardStep1Props {
    name: string
    emoji: string
    color: string
    description?: string
    onChange: (field, value) => void
}

// STEP 2 - Replace with scoring options
interface WizardStep2Props {
    scoringMethod: 'manual' | 'interaction-based' | 'popularity-based'
    onMethodChange: (method) => void
    // Show explanation of each method
}

// STEP 3 - Show items to rank
interface WizardStep3Props {
    items: Content[]
    scores: Record<number, number> // contentId -> score
    onScoresChange: (scores) => void
}

// STEP 4 - Exact copy
interface WizardStep4Props {
    name: string
    emoji: string
    color: string
    itemCount: number
    onConfirm: () => void
}
```

**Reusable Patterns**:

- Step navigation logic (useReducer or useState)
- Form validation approach
- Content preview rendering
- Confirmation flow

---

## 4. DRAG-AND-DROP REORDERING

### Source: SortableCustomRowCard (`components/customRows/SortableCustomRowCard.tsx`)

**Current Use**: Reorder custom rows via drag-and-drop

**Dependencies Already Installed**:

```json
{
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2"
}
```

**Implementation Pattern** (Copy directly):

{% raw %}

```typescript
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SortableRankingItemProps {
    item: RankedContent
    onEdit: (item) => void
    onDelete: (item) => void
}

export function SortableRankingItem({ item, onEdit, onDelete }: SortableRankingItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.content.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div ref={setNodeRef} style={style}>
            <RankingItemCard
                item={item}
                onEdit={onEdit}
                onDelete={onDelete}
                dragHandleProps={{ ref: setActivatorNodeRef, ...attributes, ...listeners }}
            />
        </div>
    )
}
```

{% endraw %}

**Parent DndContext Setup**:

```typescript
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

export function RankingItemsList({ items, onReorder }: Props) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor)
    )

    const handleDragEnd = (event) => {
        const { active, over } = event
        if (active.id === over.id) return

        const oldIndex = items.findIndex(i => i.content.id === active.id)
        const newIndex = items.findIndex(i => i.content.id === over.id)

        // Reorder and update
        const newItems = arrayMove(items, oldIndex, newIndex)
        onReorder(newItems)
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={items} strategy={verticalListSortingStrategy}>
                {items.map(item => (
                    <SortableRankingItem key={item.content.id} item={item} />
                ))}
            </SortableContext>
        </DndContext>
    )
}
```

**No Additional Dependencies Needed** - @dnd-kit is already installed!

---

## 5. NOTIFICATION SYSTEM

### Source: useToast (`hooks/useToast.ts`)

**Current API**:

```typescript
const {
    showSuccess,
    showError,
    showWatchlistAdd,
    showWatchlistRemove,
    showContentHidden,
    showContentShown,
} = useToast()
```

**Usage for Rankings**:

```typescript
// Creation
showSuccess('Ranking Created', `"${rankingName}" added to your rankings`)

// Item added
showSuccess('Item Added', `${getTitle(content)} ranked #${newRank}`)

// Item reordered
showSuccess('Item Moved', `${getTitle(content)} moved to rank #${newRank}`)

// Updated
showSuccess('Ranking Updated', 'Changes saved successfully')

// Deleted
showSuccess('Ranking Deleted', `"${rankingName}" removed`)

// Shared
showSuccess('Ranking Shared', 'Share link copied to clipboard')

// Errors
showError('Invalid Input', 'Ranking name is required (3-50 characters)')
showError('Already Ranked', `${getTitle(content)} is already in this ranking`)
showError('Rank Out of Range', 'Rank must be between 1 and ${maxRank}`)
showError('Failed to Save', 'Could not save ranking to server')
```

**No Changes Needed** - Toast system works universally!

---

## 6. MODAL SYSTEM

### Source: appStore (`stores/appStore.ts`)

**Current API**:

```typescript
const { openModal, openListModal, closeModal } = useAppStore()
```

**Adaptation for Rankings**:

```typescript
// In appStore, add ranking modal state
export interface AppState {
    // ... existing state
    rankingModal: {
        isOpen: boolean
        rankingId?: string
        mode: 'create' | 'edit' | 'view'
    }
}

export interface AppActions {
    // ... existing actions
    openRankingModal: (rankingId?: string, mode?: 'create' | 'edit' | 'view') => void
    closeRankingModal: () => void
}

// Usage in components
const { openRankingModal, closeRankingModal } = useAppStore()

// Open for editing
openRankingModal(rankingId, 'edit')

// Open for creation
openRankingModal(undefined, 'create')

// Close
closeRankingModal()
```

---

## 7. DATA VALIDATION

### Source: UserListsService (`services/userListsService.ts`)

**Sanitization Patterns** (Copy directly):

```typescript
import DOMPurify from 'isomorphic-dompurify'

// 1. Sanitize text input
private static sanitizeText(text: string): string {
    return DOMPurify.sanitize(text.trim(), {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
    })
}

// 2. Validate emoji
private static isValidEmoji(emoji: string): boolean {
    if (emoji.length > 10) return false
    const dangerousCharsRegex = /[<>"'/\\{}();=&|$`]/
    if (dangerousCharsRegex.test(emoji)) return false
    for (let i = 0; i < emoji.length; i++) {
        const charCode = emoji.charCodeAt(i)
        if ((charCode >= 0 && charCode <= 31) || charCode === 127) {
            return false
        }
    }
    const alphanumericRegex = /[a-zA-Z0-9]/
    if (alphanumericRegex.test(emoji)) return false
    return true
}

// 3. Validate color (hex only)
const sanitizedColor = /^#[0-9A-Fa-f]{6}$/.test(color) ? color : undefined

// Use in RankingsService
class RankingsService {
    static createRanking<T extends StateWithRankings>(state: T, request: CreateRankingRequest): T {
        const sanitizedName = this.sanitizeText(request.name)
        const sanitizedEmoji = request.emoji && this.isValidEmoji(request.emoji) ? request.emoji : undefined
        const sanitizedColor = /^#[0-9A-Fa-f]{6}$/.test(request.color) ? request.color : undefined

        // ... rest of logic
    }
}
```

**For Ranking-specific Validation**:

```typescript
// Create /schemas/rankingSchema.ts
import { z } from 'zod'

export const rankingNameSchema = z
    .string()
    .min(3, { message: 'Name must be at least 3 characters' })
    .max(50, { message: 'Name must be at most 50 characters' })
    .trim()

export const scoreSchema = z
    .number()
    .min(1, { message: 'Score must be at least 1' })
    .max(100, { message: 'Score must be at most 100' })
    .int()

export const createRankingSchema = z.object({
    name: rankingNameSchema,
    emoji: z.string().optional(),
    color: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
    description: z.string().max(200).optional(),
})
```

---

## 8. INTERACTION TRACKING

### Source: useInteractionTracking (`hooks/useInteractionTracking.ts`)

**Current Pattern** (Copy & Extend):

```typescript
import { createInteractionFromContent } from '@/utils/firestore/interactions'

// Existing tracking
const addToWatchlist = (content: Content) => {
    logInteraction(
        userId,
        createInteractionFromContent(content, 'add_to_watchlist', {
            source: 'ranking', // Track where interaction came from
        })
    )
}

// For rankings, add new interaction types
type RankingInteractionType =
    | 'ranking_created'
    | 'ranking_updated'
    | 'item_ranked'
    | 'ranking_item_reordered'
    | 'ranking_shared'
    | 'ranking_viewed'
    | 'ranking_deleted'

// Track ranking creation
const trackRankingCreated = async (ranking: Ranking) => {
    await logInteraction(userId, {
        contentId: 0, // Not content-specific
        mediaType: 'movie', // Dummy
        interactionType: 'ranking_created' as any,
        genreIds: [],
        source: 'ranking',
        collectionId: ranking.id,
    })
}

// Track item ranked
const trackItemRanked = async (ranking: Ranking, content: Content, score: number) => {
    await logInteraction(userId, {
        contentId: content.id,
        mediaType: content.media_type,
        interactionType: 'item_ranked' as any,
        genreIds: content.genre_ids,
        source: 'ranking',
        collectionId: ranking.id,
    })
}
```

---

## 9. SHARING INTEGRATION

### Source: shares.ts (`utils/firestore/shares.ts`)

**Current API** (Reuse directly):

```typescript
export async function createShare(
    userId: string,
    request: CreateShareRequest
): Promise<CreateShareResponse>

export async function validateShare(shareId: string): Promise<ShareValidationResult>

export async function recordShareView(shareId: string): Promise<void>
```

**For Rankings** (Minimal changes):

```typescript
// Extend CreateShareRequest to accept rankingId
interface CreateShareRequest {
    collectionId?: string
    rankingId?: string // Add this
    // ... rest
}

// Usage
const shareRanking = async (userId: string, rankingId: string) => {
    const response = await createShare(userId, {
        rankingId,
        expiresIn: '30days',
        settings: {
            visibility: 'link-only',
            showOwnerName: true,
            allowComments: false,
        },
    })

    return response.shareUrl
}
```

---

## Component File Structure Recommendation

```
components/rankings/
├── RankingItemCard.tsx              # Single ranked item (adapted ContentCard)
├── SortableRankingItem.tsx          # Draggable item (from SortableCustomRowCard)
├── RankingList.tsx                  # Grid of ranking cards
├── RankingBuilderModal.tsx          # Creation wizard (adapted CollectionBuilderModal)
├── RankingDetailModal.tsx           # View/edit ranking (new)
├── RankingShareDialog.tsx           # Sharing UI (adapted from existing modals)
├── RankingScoringMethodSelector.tsx # Choose scoring algorithm (new)
├── RankingItemsListEditor.tsx       # Edit ranking items with reordering (new)
└── RankingAnalytics.tsx             # Stats/analytics (new)

hooks/
├── useRankings.ts                   # Main ranking data hook (like useUserData)
├── useRankingScoring.ts             # Scoring algorithms (new)

services/
├── rankingsService.ts               # CRUD operations (like userListsService)

types/
├── rankings.ts                      # Ranking types (new)

utils/firestore/
├── rankings.ts                      # Firestore operations (new)

schemas/
├── rankingSchema.ts                 # Zod validation (new)
```

---

## Implementation Priority

1. **High Priority** (Core functionality):
    - RankingItemCard (ContentCard variant)
    - SortableRankingItem (@dnd-kit integration)
    - RankingsService (CRUD logic)
    - useRankings hook

2. **Medium Priority** (User features):
    - RankingBuilderModal
    - RankingDetailModal
    - Scoring algorithms

3. **Low Priority** (Nice-to-have):
    - RankingAnalytics
    - Advanced sharing options
    - Social features

---

## Testing Strategy

Each component inherits test patterns from its source:

```
ContentCard → RankingItemCard (same test patterns)
SortableCustomRowCard → SortableRankingItem (reuse drag tests)
ListSelectionModal → RankingCreationModal (reuse validation tests)
UserListsService → RankingsService (reuse CRUD tests)
```

Recommended test coverage:

- Unit: RankingsService, scoring algorithms
- Integration: Firestore persistence, store updates
- Component: Modal flows, drag-and-drop
- E2E: Create → edit → share → view flow

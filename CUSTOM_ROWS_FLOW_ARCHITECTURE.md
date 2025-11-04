# Custom Rows Creation Flow - Architecture Document

## Overview

Multi-step wizard for creating custom rows with preview, advanced features, and authentication gating.

## Feature Gating Strategy

### Guest Users (Free Tier)

- ❌ AI Name Generation
- ❌ Advanced Filters
- ✅ Basic genre selection
- ✅ Media type selection
- ✅ Genre logic (AND/OR)
- ✅ Limited to 1 custom row

### Authenticated Users (Premium Tier)

- ✅ AI Name Generation
- ✅ Advanced Filters (all options)
- ✅ Content Preview
- ✅ Up to 10 custom rows

## Multi-Step Form Flow

```
Step 1: Basic Setup
├─ Media Type Selection (Movies/TV/Both)
├─ Genre Selection (Pills)
└─ Genre Logic (AND/OR if >1 genre)
    │
    ├─ [Quick Create] → Skip to Step 4
    └─ [Use Advanced Features] → Step 2 (Auth Required)

Step 2: Advanced Filters (Auth Required)
├─ Year Range
├─ Rating Range
├─ Popularity Scale
├─ Vote Count Scale
├─ Cast Members
└─ Director
    │
    └─ [Continue] → Step 3

Step 3: Name & Preview
├─ Manual Name Input
├─ [AI Generate Name] (Auth Required)
└─ [Preview Content] → Shows 5-10 sample results
    │
    └─ [Create Row] → Step 4

Step 4: Confirmation
├─ Success Message
├─ Preview of Created Row
└─ [View on Homepage] or [Create Another]
```

## Backend API Endpoints

### 1. Preview Content

**Endpoint**: `POST /api/custom-rows/preview`

**Purpose**: Generate preview of content that would appear in the custom row

**Request**:

```typescript
{
  genres: number[]
  genreLogic: 'AND' | 'OR'
  mediaType: 'movie' | 'tv' | 'both'
  advancedFilters?: AdvancedFilters
  limit?: number // Default: 10
}
```

**Response**:

```typescript
{
  results: Content[] // Array of movies/TV shows
  total_results: number
  sample_count: number
  filters_applied: {
    genres: string[] // Genre names
    year_range?: string
    rating_range?: string
    popularity?: string
    vote_count?: string
    cast?: string[]
    director?: string
  }
}
```

**Implementation**:

- Call TMDB Discover API with all filters
- Map advanced filter indices to actual values (popularity, vote count)
- Apply child safety filtering
- Return sample results for preview

### 2. Generate Row Name (Auth Required)

**Endpoint**: `POST /api/generate-row-name`

**Purpose**: Generate creative AI name for custom row

**Request**:

```typescript
{
  genres: number[]
  genreLogic: 'AND' | 'OR'
  mediaType: 'movie' | 'tv' | 'both'
  advancedFilters?: AdvancedFilters
}
```

**Response**:

```typescript
{
  name: string // AI-generated name (max 50 chars)
  alternatives?: string[] // Optional: 2-3 alternative names
}
```

**Implementation**:

- Use Claude/OpenAI API
- Provide context about filters
- Generate creative, fun names
- Fallback to generic names if API fails

### 3. Create Custom Row (Auth Required for Advanced)

**Endpoint**: `POST /api/custom-rows`

**Request**:

```typescript
{
  name: string
  genres: number[]
  genreLogic: 'AND' | 'OR'
  mediaType: 'movie' | 'tv' | 'both'
  enabled: boolean
  advancedFilters?: AdvancedFilters // Only if authenticated
}
```

**Validation**:

- Check if user is authenticated for advanced filters
- Validate max rows limit (1 for guest, 10 for auth)
- Validate name length (3-50 chars)
- Validate genre count (1-5)

### 4. Get Custom Row Content

**Endpoint**: `GET /api/custom-rows/:rowId/content`

**Purpose**: Fetch actual content for a custom row

**Implementation**:

- Read row config from Firestore
- Apply all filters to TMDB Discover API
- Map advanced filter values
- Apply child safety
- Cache results (5 minutes)

## Frontend Components Architecture

### New Components

#### 1. `CustomRowWizard.tsx`

Main wizard component managing multi-step flow

**State**:

```typescript
{
  currentStep: 1 | 2 | 3 | 4
  formData: CustomRowFormData
  previewResults: Content[]
  isPreviewLoading: boolean
  canUseAdvanced: boolean // Based on auth status
}
```

**Methods**:

- `goToStep(step: number)`
- `nextStep()`
- `prevStep()`
- `handleQuickCreate()` - Skip advanced, go straight to name/create
- `handleUseAdvanced()` - Progress to advanced filters (auth check)
- `handlePreview()` - Fetch preview content
- `handleCreate()` - Create the row

#### 2. `WizardStep1Basic.tsx`

Basic setup: Media type, genres, genre logic

**Features**:

- Genre pills (reuse existing component)
- Media type selector
- Genre logic selector
- Two action buttons:
    - "Quick Create" → Skip to Step 3
    - "Use Advanced Features" → Step 2 (with auth gate)

#### 3. `WizardStep2Advanced.tsx`

Advanced filters (authenticated users only)

**Features**:

- All advanced filters from `AdvancedFiltersSection`
- Premium badge/indicator
- "Back" and "Continue" buttons

#### 4. `WizardStep3NamePreview.tsx`

Name input, AI generation, and preview

**Features**:

- Name input field
- AI Generate button (auth required)
- Preview button → Shows `ContentPreviewModal`
- Display current filter summary
- "Back" and "Create Row" buttons

#### 5. `WizardStep4Confirmation.tsx`

Success screen with preview of created row

**Features**:

- Success message with animation
- Preview of row content (5 items)
- Actions: "View on Homepage" or "Create Another"

#### 6. `ContentPreviewModal.tsx`

Modal showing preview of content that would appear in row

**Features**:

- Grid/carousel of 5-10 content cards
- Filter summary at top
- Total results count
- "Looks Good" and "Adjust Filters" buttons

#### 7. `PremiumFeatureGate.tsx`

Reusable component for gating premium features

**Features**:

- Show lock icon for guests
- Tooltip: "Sign in to unlock advanced features"
- Click → Open sign-in modal
- Wrap buttons/sections to gate them

## State Management

### Update `customRowsStore.ts`

Add preview state:

```typescript
interface CustomRowsState {
    // ... existing state
    previewContent: Map<string, Content[]> // cacheKey -> results
    previewLoading: boolean
}

interface CustomRowsActions {
    // ... existing actions
    setPreviewContent: (cacheKey: string, content: Content[]) => void
    clearPreviewContent: () => void
    setPreviewLoading: (loading: boolean) => void
}
```

## UI/UX Flow Examples

### Quick Create Flow (Guest or Auth)

1. Select media type → Select genres → Click "Quick Create"
2. Enter name manually
3. Click "Create Row"
4. See confirmation screen

### Advanced Create Flow (Auth Only)

1. Select media type → Select genres → Click "Use Advanced Features"
2. Set year range, ratings, popularity, etc.
3. Enter name or click "AI Generate"
4. Click "Preview Content" to see what would show up
5. Adjust filters if needed
6. Click "Create Row"
7. See confirmation with actual row preview

### Guest Attempting Advanced (Feature Gate)

1. Select media type → Select genres → Click "Use Advanced Features"
2. See modal: "Sign in to unlock advanced features"
    - "Sign In" button → Opens auth modal
    - "Continue with Basic" → Goes to Step 3 without advanced
    - "Cancel" → Stay on Step 1

## Advanced Filter Mapping (Backend)

### Popularity Scale → TMDB Values

```typescript
const POPULARITY_MAPPING = {
    0: { min: 0, max: null }, // Any
    1: { min: 10, max: 50 }, // Low
    2: { min: 50, max: 100 }, // Medium
    3: { min: 100, max: 200 }, // High
    4: { min: 200, max: null }, // Very High
}
```

### Vote Count Scale → TMDB Values

```typescript
const VOTE_COUNT_MAPPING = {
    0: 0, // Any
    1: 100, // Few (100+)
    2: 1000, // Some (1K+)
    3: 5000, // Many (5K+)
    4: 10000, // Tons (10K+)
}
```

### TMDB Discover API Parameters

```typescript
{
  with_genres: string,              // Comma-separated genre IDs
  'vote_average.gte': number,       // ratingMin
  'vote_average.lte': number,       // ratingMax
  'primary_release_date.gte': string, // yearMin (YYYY-01-01)
  'primary_release_date.lte': string, // yearMax (YYYY-12-31)
  'vote_count.gte': number,         // voteCount mapping
  'popularity.gte': number,         // popularity mapping (min)
  'popularity.lte': number,         // popularity mapping (max)
  with_cast: string,                // Comma-separated person IDs
  with_crew: string,                // Person ID for director
}
```

## Caching Strategy

### Preview Content Cache

- Cache key: `preview_${mediaType}_${genreIds}_${filterHash}`
- TTL: 5 minutes
- Store in Zustand (client-side only)
- Clear on form changes

### Created Row Content Cache

- Cache key: `row_${rowId}_page_${page}`
- TTL: 5 minutes
- Store in cacheStore (existing)

## Error Handling

### Backend Errors

- TMDB API rate limit → Show user-friendly message
- AI name generation failure → Fallback to generic name
- Invalid filters → Validation errors with helpful messages

### Frontend Errors

- Preview loading timeout → Show retry button
- Auth required → Show feature gate modal
- Max rows exceeded → Show upgrade message

## Analytics Events

Track user behavior:

- `custom_row_wizard_started`
- `custom_row_step_completed` (step: 1-4)
- `custom_row_quick_create_clicked`
- `custom_row_advanced_clicked`
- `custom_row_preview_clicked`
- `custom_row_ai_name_generated`
- `custom_row_created` (hasAdvancedFilters: boolean)
- `premium_feature_gate_shown` (feature: string)

## Implementation Phases

### Phase 1: Frontend Wizard (Current)

- [ ] Create wizard shell component
- [ ] Implement step navigation
- [ ] Build Step 1: Basic setup
- [ ] Build Step 3: Name/Preview (without preview functionality)
- [ ] Build Step 4: Confirmation
- [ ] Add feature gate components

### Phase 2: Backend Integration

- [ ] Implement preview API endpoint
- [ ] Implement advanced filter mapping
- [ ] Update create endpoint with validation
- [ ] Add authentication middleware

### Phase 3: Advanced Features

- [ ] Build Step 2: Advanced filters
- [ ] Implement content preview modal
- [ ] Integrate AI name generation
- [ ] Add preview functionality to Step 3

### Phase 4: Polish

- [ ] Add animations and transitions
- [ ] Implement analytics tracking
- [ ] Add error boundaries
- [ ] Performance optimization
- [ ] Testing

## Next Steps

1. Start with Phase 1: Create wizard components
2. Implement step navigation and basic flow
3. Add feature gating for premium features
4. Build out each step component
5. Then move to backend integration

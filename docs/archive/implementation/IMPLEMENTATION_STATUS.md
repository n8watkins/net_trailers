# Custom Rows Wizard - Implementation Status

## ✅ Completed

### Architecture & Design

- [x] Created comprehensive architecture document (`CUSTOM_ROWS_FLOW_ARCHITECTURE.md`)
- [x] Designed multi-step wizard flow
- [x] Defined feature gating strategy (guests vs auth users)
- [x] Mapped advanced filters to TMDB API parameters
- [x] Planned backend API endpoints

### Frontend Components

- [x] **PremiumFeatureGate.tsx** - Component for gating premium features
    - Lock overlay with blur effect
    - "Sign In to Unlock" button
    - Premium badges
    - `PremiumButton` helper component

- [x] **CustomRowWizard.tsx** - Main wizard shell component
    - Step navigation (1-4)
    - Progress bar with completed/current indicators
    - Quick Create vs Advanced path logic
    - State management for form data
    - Step validation
    - Loading states

### Existing Components (Ready to Reuse)

- [x] **GenrePills.tsx** - Genre selection with clickable pills
- [x] **AdvancedFiltersSection.tsx** - All advanced filter inputs
- [x] **CustomRowForm.tsx** - Original form (will be refactored into wizard steps)

## 🚧 In Progress / Next Steps

### Frontend Components Needed

#### 1. WizardStep1Basic.tsx

**Purpose**: Basic setup step (media type, genres, genre logic)

**Structure**:

```tsx
'use client'

interface WizardStep1BasicProps {
    formData: CustomRowFormData
    onChange: (updates: Partial<CustomRowFormData>) => void
    onQuickCreate: () => void
    onUseAdvanced: () => void
    canProgress: boolean
    isAuthenticated: boolean
}

export function WizardStep1Basic({ ... }) {
    return (
        <div className="space-y-6">
            {/* Media Type Selection */}
            <MediaTypeSelector
                selected={formData.mediaType}
                onChange={(type) => onChange({ mediaType: type })}
            />

            {/* Genre Pills */}
            <GenrePills
                selectedGenres={formData.genres}
                onChange={(genres) => onChange({ genres })}
                mediaType={formData.mediaType}
            />

            {/* Genre Logic (if >1 genre) */}
            {formData.genres.length > 1 && (
                <GenreLogicSelector
                    selected={formData.genreLogic}
                    onChange={(logic) => onChange({ genreLogic: logic })}
                />
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
                <button onClick={onQuickCreate} disabled={!canProgress}>
                    Quick Create
                </button>

                <PremiumFeatureGate
                    isLocked={!isAuthenticated}
                    feature="advanced_filters"
                    onUnlockClick={handleSignIn}
                >
                    <button onClick={onUseAdvanced} disabled={!canProgress}>
                        Use Advanced Features
                    </button>
                </PremiumFeatureGate>
            </div>
        </div>
    )
}
```

#### 2. WizardStep2Advanced.tsx

**Purpose**: Advanced filters step (auth users only)

**Structure**:

```tsx
'use client'

interface WizardStep2AdvancedProps {
    filters: AdvancedFilters
    onChange: (filters: AdvancedFilters) => void
    onBack: () => void
    onContinue: () => void
}

export function WizardStep2Advanced({ ... }) {
    return (
        <div className="space-y-6">
            {/* Premium badge */}
            <div className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/30 rounded-lg">
                <SparklesIcon className="w-5 h-5 text-purple-400" />
                <span className="text-purple-300 text-sm">
                    Premium Feature - Available for authenticated users
                </span>
            </div>

            {/* Reuse existing AdvancedFiltersSection */}
            <AdvancedFiltersSection
                filters={filters}
                onChange={onChange}
            />

            {/* Navigation buttons */}
            <div className="flex gap-3 pt-4">
                <button onClick={onBack}>Back</button>
                <button onClick={onContinue}>Continue</button>
            </div>
        </div>
    )
}
```

#### 3. WizardStep3NamePreview.tsx

**Purpose**: Name input, AI generation, and preview

**Structure**:

```tsx
'use client'

interface WizardStep3NamePreviewProps {
    formData: CustomRowFormData
    onChange: (updates: Partial<CustomRowFormData>) => void
    onBack: () => void
    onCreate: () => void
    isCreating: boolean
    isAuthenticated: boolean
}

export function WizardStep3NamePreview({ ... }) {
    const [isGeneratingName, setIsGeneratingName] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const [previewContent, setPreviewContent] = useState<Content[]>([])

    const handleAIGenerate = async () => {
        // Call /api/generate-row-name
    }

    const handlePreview = async () => {
        // Call /api/custom-rows/preview
        setShowPreview(true)
    }

    return (
        <div className="space-y-6">
            {/* Filter Summary */}
            <FilterSummaryCard formData={formData} />

            {/* Name Input */}
            <div>
                <label>Row Name</label>
                <div className="flex gap-2">
                    <input
                        value={formData.name}
                        onChange={(e) => onChange({ name: e.target.value })}
                        placeholder="e.g., Epic Sci-Fi Adventures"
                    />

                    <PremiumFeatureGate
                        isLocked={!isAuthenticated}
                        feature="ai_generation"
                    >
                        <button onClick={handleAIGenerate} disabled={isGeneratingName}>
                            {isGeneratingName ? 'Generating...' : 'AI Generate'}
                        </button>
                    </PremiumFeatureGate>
                </div>
            </div>

            {/* Preview Button */}
            <PremiumFeatureGate
                isLocked={!isAuthenticated}
                feature="preview"
            >
                <button onClick={handlePreview}>
                    Preview Content
                </button>
            </PremiumFeatureGate>

            {/* Preview Modal */}
            {showPreview && (
                <ContentPreviewModal
                    content={previewContent}
                    onClose={() => setShowPreview(false)}
                />
            )}

            {/* Navigation */}
            <div className="flex gap-3 pt-4">
                <button onClick={onBack}>Back</button>
                <button onClick={onCreate} disabled={formData.name.length < 3 || isCreating}>
                    {isCreating ? 'Creating...' : 'Create Row'}
                </button>
            </div>
        </div>
    )
}
```

#### 4. WizardStep4Confirmation.tsx

**Purpose**: Success screen with preview

**Structure**:

```tsx
'use client'

interface WizardStep4ConfirmationProps {
    rowId: string
    rowName: string
    onViewHomepage: () => void
    onCreateAnother: () => void
}

export function WizardStep4Confirmation({ ... }) {
    const [previewContent, setPreviewContent] = useState<Content[]>([])

    useEffect(() => {
        // Fetch preview content for the created row
        fetchRowContent(rowId)
    }, [rowId])

    return (
        <div className="space-y-6 text-center">
            {/* Success animation */}
            <div className="flex justify-center">
                <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center animate-bounce">
                    <CheckIcon className="w-12 h-12 text-white" />
                </div>
            </div>

            <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                    Row Created Successfully!
                </h3>
                <p className="text-gray-300">
                    "{rowName}" is now live on your homepage
                </p>
            </div>

            {/* Preview of created row */}
            <div className="bg-black/30 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">Preview</h4>
                <div className="grid grid-cols-5 gap-3">
                    {previewContent.slice(0, 5).map((item) => (
                        <ContentCard key={item.id} content={item} size="small" />
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
                <button onClick={onViewHomepage}>
                    View on Homepage
                </button>
                <button onClick={onCreateAnother}>
                    Create Another
                </button>
            </div>
        </div>
    )
}
```

#### 5. ContentPreviewModal.tsx

**Purpose**: Modal showing preview of content

**Structure**:

```tsx
'use client'

interface ContentPreviewModalProps {
    content: Content[]
    totalResults: number
    filterSummary: string
    onClose: () => void
    onAdjustFilters: () => void
}

export function ContentPreviewModal({ ... }) {
    return (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
            <div className="fixed inset-0 bg-black/90" onClick={onClose} />

            <div className="relative min-h-screen flex items-center justify-center p-4">
                <div className="bg-[#181818] rounded-lg max-w-6xl w-full p-6">
                    <h2>Content Preview</h2>
                    <p className="text-gray-400">{totalResults} results found</p>

                    {/* Filter summary */}
                    <div className="bg-purple-600/10 border border-purple-500/30 rounded p-3 mb-4">
                        {filterSummary}
                    </div>

                    {/* Content grid */}
                    <div className="grid grid-cols-5 gap-4 mb-6">
                        {content.map((item) => (
                            <ContentCard key={item.id} content={item} />
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button onClick={onAdjustFilters}>
                            Adjust Filters
                        </button>
                        <button onClick={onClose}>
                            Looks Good
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
```

#### 6. FilterSummaryCard.tsx

**Purpose**: Show summary of selected filters

**Structure**:

```tsx
'use client'

interface FilterSummaryCardProps {
    formData: CustomRowFormData
}

export function FilterSummaryCard({ formData }: FilterSummaryCardProps) {
    const genreNames = getGenreNames(formData.genres, formData.mediaType)
    const hasAdvanced = formData.advancedFilters && Object.keys(formData.advancedFilters).length > 0

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">Your Selection</h4>

            <div className="space-y-2 text-sm">
                <div>
                    <span className="text-gray-400">Media Type:</span>{' '}
                    <span className="text-white">{formData.mediaType}</span>
                </div>
                <div>
                    <span className="text-gray-400">Genres:</span>{' '}
                    <span className="text-white">{genreNames.join(', ')}</span>
                </div>
                {formData.genres.length > 1 && (
                    <div>
                        <span className="text-gray-400">Logic:</span>{' '}
                        <span className="text-white">{formData.genreLogic}</span>
                    </div>
                )}

                {hasAdvanced && (
                    <>
                        <div className="border-t border-gray-700 my-2 pt-2">
                            <span className="text-purple-400 font-medium">Advanced Filters</span>
                        </div>
                        {/* Show each advanced filter */}
                    </>
                )}
            </div>
        </div>
    )
}
```

### Backend API Endpoints Needed

#### 1. Preview Content API

**File**: `app/api/custom-rows/preview/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { discoverContent } from '@/utils/tmdbApi'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { genres, genreLogic, mediaType, advancedFilters, limit = 10 } = body

        // Build TMDB Discover API parameters
        const params = buildDiscoverParams({
            genres,
            genreLogic,
            mediaType,
            advancedFilters,
            limit,
        })

        // Call TMDB API
        const results = await discoverContent(params)

        // Apply child safety filtering
        const filteredResults = applyChildSafety(results)

        return NextResponse.json({
            results: filteredResults.slice(0, limit),
            total_results: results.total_results,
            sample_count: Math.min(limit, filteredResults.length),
            filters_applied: formatFilterSummary(body),
        })
    } catch (error) {
        console.error('Preview error:', error)
        return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 })
    }
}

function buildDiscoverParams(data: any) {
    const params: any = {}

    // Genres
    params.with_genres = data.genres.join(',')

    // Advanced filters (if present)
    if (data.advancedFilters) {
        const af = data.advancedFilters

        // Year range
        if (af.yearMin) {
            params['primary_release_date.gte'] = `${af.yearMin}-01-01`
        }
        if (af.yearMax) {
            params['primary_release_date.lte'] = `${af.yearMax}-12-31`
        }

        // Rating range
        if (af.ratingMin !== undefined) {
            params['vote_average.gte'] = af.ratingMin
        }
        if (af.ratingMax !== undefined) {
            params['vote_average.lte'] = af.ratingMax
        }

        // Popularity
        if (af.popularity !== undefined) {
            const popMapping = [
                { min: 0, max: null },
                { min: 10, max: 50 },
                { min: 50, max: 100 },
                { min: 100, max: 200 },
                { min: 200, max: null },
            ]
            const range = popMapping[af.popularity]
            if (range.min) params['popularity.gte'] = range.min
            if (range.max) params['popularity.lte'] = range.max
        }

        // Vote count
        if (af.voteCount !== undefined) {
            const voteMapping = [0, 100, 1000, 5000, 10000]
            params['vote_count.gte'] = voteMapping[af.voteCount]
        }

        // Cast and director (would need TMDB person ID lookup)
        // TODO: Implement person search and ID mapping
    }

    return params
}
```

#### 2. Update Custom Rows Create API

**File**: `app/api/custom-rows/route.ts`

Add authentication check for advanced filters:

```typescript
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const body = await request.json()

        // Check if using advanced filters
        const hasAdvancedFilters = body.advancedFilters &&
            Object.keys(body.advancedFilters).length > 0

        // Require authentication for advanced filters
        if (hasAdvancedFilters && !session?.user) {
            return NextResponse.json(
                { error: 'Authentication required for advanced filters' },
                { status: 401 }
            )
        }

        // Continue with row creation...
    }
}
```

#### 3. AI Name Generation API

**File**: `app/api/generate-row-name/route.ts`

Add authentication check:

```typescript
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        // Require authentication
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Authentication required for AI name generation' },
                { status: 401 }
            )
        }

        // Continue with name generation...
    }
}
```

### Helper Utilities Needed

#### Advanced Filter Value Mappers

**File**: `utils/advancedFilterMappers.ts`

```typescript
export const POPULARITY_SCALE = [
    { label: 'Any', value: 0, min: 0, max: null },
    { label: 'Low', value: 10, min: 10, max: 50 },
    { label: 'Medium', value: 50, min: 50, max: 100 },
    { label: 'High', value: 100, min: 100, max: 200 },
    { label: 'Very High', value: 200, min: 200, max: null },
]

export const VOTE_COUNT_SCALE = [
    { label: 'Any', value: 0 },
    { label: 'Few (100+)', value: 100 },
    { label: 'Some (1K+)', value: 1000 },
    { label: 'Many (5K+)', value: 5000 },
    { label: 'Tons (10K+)', value: 10000 },
]

export function mapPopularityToRange(index: number) {
    return POPULARITY_SCALE[index] || POPULARITY_SCALE[0]
}

export function mapVoteCountToValue(index: number) {
    return VOTE_COUNT_SCALE[index]?.value || 0
}
```

## 📋 Implementation Checklist

### Phase 1: Core Wizard Components (Frontend)

- [ ] Build WizardStep1Basic component
- [ ] Build WizardStep2Advanced component (reuse AdvancedFiltersSection)
- [ ] Build WizardStep3NamePreview component
- [ ] Build WizardStep4Confirmation component
- [ ] Build FilterSummaryCard component
- [ ] Build ContentPreviewModal component
- [ ] Integrate wizard into CustomRowModal
- [ ] Test wizard flow (both quick and advanced paths)

### Phase 2: Backend Integration

- [ ] Create preview API endpoint (`/api/custom-rows/preview`)
- [ ] Implement advanced filter mapping utilities
- [ ] Update create API with authentication checks
- [ ] Update AI name generation with auth checks
- [ ] Test API endpoints

### Phase 3: Premium Feature Integration

- [ ] Add authentication state to wizard
- [ ] Integrate PremiumFeatureGate in Step 1
- [ ] Show sign-in modal when locked features are clicked
- [ ] Test guest vs auth user flows
- [ ] Add premium badges and indicators

### Phase 4: Preview Functionality

- [ ] Implement preview content fetching in Step 3
- [ ] Build content preview modal UI
- [ ] Add loading states for preview
- [ ] Add error handling for failed previews
- [ ] Test preview with various filter combinations

### Phase 5: Polish & Testing

- [ ] Add step transition animations
- [ ] Improve loading states and error messages
- [ ] Test full flow end-to-end
- [ ] Test with child safety enabled
- [ ] Performance optimization
- [ ] Add analytics tracking

## 🎯 Next Immediate Actions

1. **Build WizardStep1Basic** - Extract media type and genre selection from existing form
2. **Build WizardStep3NamePreview** - Extract name input, add preview button placeholder
3. **Build WizardStep4Confirmation** - Create success screen
4. **Integrate into CustomRowModal** - Replace current form with wizard
5. **Create preview API** - Backend endpoint for content preview

## 📝 Notes

- The wizard reuses existing components (GenrePills, AdvancedFiltersSection) where possible
- Premium features are gated by authentication status
- Preview functionality requires backend integration but UI can be built first
- Content preview shows actual TMDB results based on filters
- Quick Create path skips Step 2 (advanced filters)
- All steps are navigable (can go back)

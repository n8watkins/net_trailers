# Smart Row Builder - Architecture Document

## Concept Overview

Instead of manually selecting filters, users start by adding movies/shows they already love. The system analyzes these titles in the background and suggests what makes them similar (genres, actors, directors, decades, ratings, etc.). Users then choose which attributes to base their custom row on.

**Example Flow:**

1. User adds: "The Matrix", "Inception", "Blade Runner 2049"
2. System analyzes and finds common attributes:
    - **Genres**: Sci-Fi (100%), Action (100%), Thriller (67%)
    - **Directors**: All different (no pattern)
    - **Key Actors**: Keanu Reeves (33%)
    - **Decade**: 1990s-2020s (Modern)
    - **Rating Range**: 7.5-8.8 (High rated)
    - **Themes**: Mind-bending, dystopian, philosophical
3. User selects: "Sci-Fi + Action genres" and "High rated (7.5+)"
4. System generates row: "Mind-Bending Sci-Fi Thrillers"
5. Preview shows similar movies

## UI/UX Flow

```
┌─────────────────────────────────────────────────┐
│ Smart Row Builder                               │
│ "Start with movies you love"                    │
├─────────────────────────────────────────────────┤
│                                                 │
│ Step 1: Add Your Favorite Titles (1-5)         │
│ ┌───────────────────────────────────────────┐   │
│ │ 🔍 Search for movies or TV shows...       │   │
│ └───────────────────────────────────────────┘   │
│                                                 │
│ Added (3):                                      │
│ ┌──────────────┐ ┌──────────────┐ ┌─────────┐  │
│ │ The Matrix   │ │ Inception    │ │ Blade   │  │
│ │ (1999)    [X]│ │ (2010)    [X]│ │ Runner  │  │
│ └──────────────┘ └──────────────┘ │ 2049 [X]│  │
│                                    └─────────┘  │
│                                                 │
│ [Analyze & Continue →]                          │
└─────────────────────────────────────────────────┘

                     ↓ (Analyzing...)

┌─────────────────────────────────────────────────┐
│ Step 2: What Makes These Special?              │
│ "We found these patterns"                       │
├─────────────────────────────────────────────────┤
│                                                 │
│ Strongest Patterns (Select what matters):       │
│                                                 │
│ ✓ [Selected Card]                               │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🎭 Genres                                   │ │
│ │ Science Fiction • Action • Thriller         │ │
│ │ Found in: All 3 movies                      │ │
│ │ ───────────────────────────────────         │ │
│ │ "Build a row with these genres"             │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ □ [Unselected Card]                             │
│ ┌─────────────────────────────────────────────┐ │
│ │ ⭐ High Ratings (7.5 - 8.8)                 │ │
│ │ All critically acclaimed films              │ │
│ │ ───────────────────────────────────         │ │
│ │ "Include only highly-rated content"         │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ □ [Card]                                        │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🎬 Directors                                │ │
│ │ Wachowskis • Nolan • Villeneuve            │ │
│ │ Visionary filmmakers                        │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ □ [Card]                                        │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🎭 Key Actors                               │ │
│ │ Keanu Reeves appears in 33% of titles      │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ □ [Card]                                        │
│ ┌─────────────────────────────────────────────┐ │
│ │ 📅 Era - Modern (1999-2024)                 │ │
│ │ Contemporary sci-fi storytelling            │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ □ [Card]                                        │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🎨 Visual Style                             │ │
│ │ Stunning cinematography • Visual effects   │ │
│ │ High production value (Budget >$100M)       │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [← Back]              [Preview Row →]           │
└─────────────────────────────────────────────────┘

                     ↓

┌─────────────────────────────────────────────────┐
│ Step 3: Preview Your Row                        │
│ "Mind-Bending Sci-Fi Action" (AI Generated)     │
├─────────────────────────────────────────────────┤
│                                                 │
│ Based on: Sci-Fi + Action genres, High ratings │
│                                                 │
│ Preview (78 matching titles):                   │
│ ┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐       │
│ │Tenet ││Dune  ││Edge  ││Looper││Total ││...   │
│ │      ││      ││of    ││      ││Recall││       │
│ └──────┘└──────┘│Tmrw  │└──────┘└──────┘       │
│                 └──────┘                        │
│                                                 │
│ ✓ Looks good!                                   │
│ □ Too many results - Add more filters           │
│ □ Not enough variety - Remove a filter          │
│                                                 │
│ Row Name: [Mind-Bending Sci-Fi Action____]      │
│           [🤖 Generate Different Name]           │
│                                                 │
│ [← Adjust Filters]    [Create Row 🎉]           │
└─────────────────────────────────────────────────┘
```

## Attribute Categories We Can Extract

### 1. **Genres** (Primary)

- Extract from TMDB genre IDs
- Show overlap percentage
- Most common = strongest signal

**Analysis**:

```typescript
{
  genreFrequency: {
    878: { name: "Science Fiction", count: 3, percentage: 100 },
    28: { name: "Action", count: 3, percentage: 100 },
    53: { name: "Thriller", count: 2, percentage: 67 }
  },
  suggestedGenres: [878, 28] // Genres in 100% of titles
}
```

### 2. **Rating Range**

- Calculate min/max of vote_average
- Bucket into ranges: "Critically Acclaimed (8+)", "Highly Rated (7-8)", etc.

**Analysis**:

```typescript
{
  ratingRange: { min: 7.5, max: 8.8 },
  suggestedLabel: "Critically Acclaimed (7.5+)",
  allHighlyRated: true
}
```

### 3. **Decade/Era**

- Group by release decade
- "Classic (pre-1980)", "80s/90s Nostalgia", "Modern (2000s+)", etc.

**Analysis**:

```typescript
{
  decades: {
    "1990s": 1,
    "2010s": 1,
    "2020s": 1
  },
  suggestedEra: "Modern (1999-2024)",
  span: 25 // years between oldest and newest
}
```

### 4. **Directors**

- Find common directors
- If none shared, don't suggest this attribute

**Analysis**:

```typescript
{
  directors: [
    { id: 9339, name: "Lana Wachowski", count: 1 },
    { id: 525, name: "Christopher Nolan", count: 1 },
    { id: 5655, name: "Denis Villeneuve", count: 1 }
  ],
  hasPattern: false, // No overlap
  suggestedDirectors: []
}
```

### 5. **Key Actors**

- Find actors appearing in multiple titles
- Only suggest if 50%+ overlap

**Analysis**:

```typescript
{
  actors: [
    { id: 6384, name: "Keanu Reeves", count: 1, percentage: 33 }
  ],
  hasPattern: false, // Less than 50%
  suggestedActors: []
}
```

### 6. **Popularity/Budget Tier**

- Blockbuster (high budget), Indie (low budget)
- Based on budget and popularity metrics

**Analysis**:

```typescript
{
  avgBudget: 150000000, // $150M
  tier: "Blockbuster",
  allHighBudget: true
}
```

### 7. **Runtime**

- Short (<90min), Standard (90-120), Long (120-150), Epic (150+)

**Analysis**:

```typescript
{
  avgRuntime: 138,
  suggestedRange: "Epic (120+ minutes)"
}
```

### 8. **Language/Region** (Optional)

- English, International, etc.

## Data Structure

### Movie Selection

```typescript
interface SelectedContent {
    id: number
    title: string
    media_type: 'movie' | 'tv'
    poster_path: string
    release_date: string
    vote_average: number
}

interface SmartBuilderState {
    selectedContent: SelectedContent[] // 1-5 titles
    analysis: ContentAnalysis | null
    selectedAttributes: AttributeType[]
    generatedRowName: string
    previewResults: Content[]
}
```

### Analysis Response

```typescript
interface ContentAnalysis {
    genres: {
        primary: GenrePattern[] // 100% overlap
        secondary: GenrePattern[] // 50%+ overlap
    }
    rating: {
        range: { min: number; max: number }
        suggested: RatingTier
    }
    era: {
        decades: Record<string, number>
        suggested: string
        span: number
    }
    directors: {
        common: PersonPattern[]
        hasPattern: boolean
    }
    actors: {
        common: PersonPattern[]
        hasPattern: boolean
    }
    production: {
        tier: 'blockbuster' | 'mainstream' | 'indie'
        avgBudget: number
    }
    runtime: {
        avg: number
        suggested: string
    }
    // Derived suggestions
    suggestedAttributes: AttributeCard[]
}

interface AttributeCard {
    type: AttributeType
    icon: string
    title: string
    description: string
    strength: 'strong' | 'medium' | 'weak' // How strong the pattern is
    matchPercentage: number
    filterConfig: Partial<AdvancedFilters> // What filters to apply if selected
}

type AttributeType = 'genres' | 'rating' | 'era' | 'directors' | 'actors' | 'production' | 'runtime'
```

## Frontend Components

### 1. SmartRowBuilder.tsx

Main component managing the flow

```typescript
interface SmartRowBuilderProps {
  onClose: () => void
  onComplete: (data: CustomRowFormData) => Promise<void>
  isAuthenticated: boolean
}

export function SmartRowBuilder({ onClose, onComplete, isAuthenticated }) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedContent, setSelectedContent] = useState<SelectedContent[]>([])
  const [analysis, setAnalysis] = useState<ContentAnalysis | null>(null)
  const [selectedAttributes, setSelectedAttributes] = useState<AttributeType[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [previewResults, setPreviewResults] = useState<Content[]>([])

  // Step 1: Add movies
  const handleAddContent = (content: SelectedContent) => {
    if (selectedContent.length < 5) {
      setSelectedContent([...selectedContent, content])
    }
  }

  // Step 1 -> 2: Analyze
  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    try {
      const result = await analyzeContent(selectedContent)
      setAnalysis(result)
      setStep(2)
    } catch (error) {
      // Handle error
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Step 2: Toggle attribute selection
  const handleToggleAttribute = (type: AttributeType) => {
    if (selectedAttributes.includes(type)) {
      setSelectedAttributes(selectedAttributes.filter((t) => t !== type))
    } else {
      setSelectedAttributes([...selectedAttributes, type])
    }
  }

  // Step 2 -> 3: Preview
  const handlePreview = async () => {
    // Build filters from selected attributes
    const filters = buildFiltersFromAttributes(selectedAttributes, analysis)

    // Fetch preview
    const preview = await fetchPreview(filters)
    setPreviewResults(preview.results)

    // Generate name
    const name = await generateSmartName(selectedContent, selectedAttributes)

    setStep(3)
  }

  // Step 3: Create row
  const handleCreate = async () => {
    const formData = buildFormDataFromAttributes(
      selectedAttributes,
      analysis,
      generatedRowName
    )
    await onComplete(formData)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Modal structure */}
      {step === 1 && <MovieSelectionStep />}
      {step === 2 && <AttributeSelectionStep />}
      {step === 3 && <PreviewStep />}
    </div>
  )
}
```

### 2. MovieSelectionStep.tsx

Search and add movies/shows

```typescript
export function MovieSelectionStep({
  selectedContent,
  onAdd,
  onRemove,
  onAnalyze,
  isAnalyzing,
}: MovieSelectionStepProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Content[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Search with debounce (reuse existing search logic)
  const handleSearch = useDebouncedSearch(searchQuery, async (query) => {
    const results = await searchContent(query)
    setSearchResults(results)
  })

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">
          Add Movies or Shows You Love
        </h3>
        <p className="text-gray-400">
          Pick 1-5 titles and we'll find what makes them special
        </p>
      </div>

      {/* Search input with dropdown */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 Search for movies or TV shows..."
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
        />

        {/* Dropdown results */}
        {searchResults.length > 0 && (
          <div className="absolute top-full mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-h-96 overflow-y-auto z-10">
            {searchResults.map((item) => (
              <button
                key={item.id}
                onClick={() => handleAdd(item)}
                disabled={selectedContent.some((c) => c.id === item.id)}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <img
                  src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                  alt={getTitle(item)}
                  className="w-12 h-16 object-cover rounded"
                />
                <div className="text-left">
                  <div className="text-white font-medium">{getTitle(item)}</div>
                  <div className="text-gray-400 text-sm">
                    {getYear(item)} • {item.media_type === 'movie' ? 'Movie' : 'TV'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected content cards */}
      {selectedContent.length > 0 && (
        <div>
          <div className="text-gray-400 text-sm mb-3">
            Added ({selectedContent.length}/5):
          </div>
          <div className="flex flex-wrap gap-3">
            {selectedContent.map((item) => (
              <div
                key={item.id}
                className="relative group bg-gray-800 rounded-lg p-3 border border-gray-700"
              >
                <button
                  onClick={() => onRemove(item.id)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XMarkIcon className="w-4 h-4 text-white" />
                </button>
                <img
                  src={`https://image.tmdb.org/t/p/w185${item.poster_path}`}
                  alt={item.title}
                  className="w-24 h-36 object-cover rounded mb-2"
                />
                <div className="text-white text-sm font-medium w-24 truncate">
                  {item.title}
                </div>
                <div className="text-gray-400 text-xs">
                  {getYear(item)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analyze button */}
      <button
        onClick={onAnalyze}
        disabled={selectedContent.length === 0 || isAnalyzing}
        className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {isAnalyzing ? (
          <>
            <span className="inline-block animate-spin mr-2">⚙️</span>
            Analyzing...
          </>
        ) : (
          `Analyze & Continue →`
        )}
      </button>
    </div>
  )
}
```

### 3. AttributeSelectionStep.tsx

Show analyzed patterns as selectable cards

```typescript
export function AttributeSelectionStep({
  analysis,
  selectedAttributes,
  onToggle,
  onBack,
  onPreview,
}: AttributeSelectionStepProps) {
  const cards = analysis?.suggestedAttributes || []

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">
          What Makes These Special?
        </h3>
        <p className="text-gray-400">
          Select the patterns you want your row to match
        </p>
      </div>

      {/* Attribute cards */}
      <div className="space-y-3">
        {cards.map((card) => {
          const isSelected = selectedAttributes.includes(card.type)
          const strengthColor =
            card.strength === 'strong'
              ? 'border-green-500/50 bg-green-500/10'
              : card.strength === 'medium'
                ? 'border-yellow-500/50 bg-yellow-500/10'
                : 'border-gray-600/50 bg-gray-800/50'

          return (
            <button
              key={card.type}
              onClick={() => onToggle(card.type)}
              className={`
                w-full text-left p-4 rounded-lg border-2 transition-all
                ${
                  isSelected
                    ? 'border-red-600 bg-red-600/20 shadow-lg shadow-red-600/20'
                    : strengthColor + ' hover:border-gray-500'
                }
              `}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{card.icon}</span>
                    <h4 className="text-white font-semibold">{card.title}</h4>
                    {card.strength === 'strong' && (
                      <span className="px-2 py-0.5 bg-green-600/20 text-green-400 text-xs rounded-full font-medium">
                        Strong Match
                      </span>
                    )}
                  </div>
                  <p className="text-gray-300 text-sm mb-2">{card.description}</p>
                  <div className="text-gray-400 text-xs">
                    Found in {card.matchPercentage}% of your selections
                  </div>
                </div>

                {/* Checkbox */}
                <div
                  className={`
                    w-6 h-6 rounded border-2 flex items-center justify-center
                    ${isSelected ? 'bg-red-600 border-red-600' : 'border-gray-600'}
                  `}
                >
                  {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={onPreview}
          disabled={selectedAttributes.length === 0}
          className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Preview Row →
        </button>
      </div>
    </div>
  )
}
```

## Backend API Endpoints

### 1. Analyze Content

**Endpoint**: `POST /api/smart-builder/analyze`

**Request**:

```typescript
{
    content: Array<{ id: number; media_type: 'movie' | 'tv' }>
}
```

**Implementation**:

```typescript
export async function POST(request: NextRequest) {
    const { content } = await request.json()

    // Fetch full details for each content item
    const details = await Promise.all(
        content.map((item) =>
            fetch(
                `https://api.themoviedb.org/3/${item.media_type}/${item.id}?api_key=...&append_to_response=credits`
            )
        )
    )

    // Analyze patterns
    const analysis = {
        genres: analyzeGenres(details),
        rating: analyzeRatings(details),
        era: analyzeEra(details),
        directors: analyzeDirectors(details),
        actors: analyzeActors(details),
        production: analyzeProduction(details),
        runtime: analyzeRuntime(details),
    }

    // Generate attribute cards
    const suggestedAttributes = generateAttributeCards(analysis)

    return NextResponse.json({
        ...analysis,
        suggestedAttributes,
    })
}

function analyzeGenres(details) {
    const genreCount = new Map()

    details.forEach((item) => {
        item.genres.forEach((genre) => {
            genreCount.set(genre.id, {
                ...genre,
                count: (genreCount.get(genre.id)?.count || 0) + 1,
            })
        })
    })

    const total = details.length
    const genres = Array.from(genreCount.values())
        .map((g) => ({ ...g, percentage: (g.count / total) * 100 }))
        .sort((a, b) => b.percentage - a.percentage)

    return {
        primary: genres.filter((g) => g.percentage === 100),
        secondary: genres.filter((g) => g.percentage >= 50 && g.percentage < 100),
        all: genres,
    }
}

// Similar for other analyzers...
```

### 2. Generate Smart Name

**Endpoint**: `POST /api/smart-builder/generate-name`

**Request**:

```typescript
{
  selectedContent: SelectedContent[]
  selectedAttributes: AttributeType[]
  analysis: ContentAnalysis
}
```

**Implementation**:
Uses AI to generate creative name based on the patterns.

## Color Theme Update

Replace purple (`purple-600`, etc.) with Netflix red (`red-600`) for primary actions and feature highlights. Keep purple only for AI-specific features.

**Color Mapping**:

- Primary actions: `bg-red-600` → `hover:bg-red-700`
- Selected states: `border-red-600 bg-red-600/20`
- AI features: Keep `bg-purple-600` (AI generation button, etc.)
- Strong patterns: `border-green-500` (good match indicator)
- Medium patterns: `border-yellow-500`
- Weak patterns: `border-gray-600`

## Integration Strategy

Both builders should coexist:

**CustomRowModal.tsx** - Choice screen:

```typescript
<div className="flex gap-4">
  <button onClick={() => setMode('smart')}>
    🎬 Start from Movies I Love
    <span className="text-sm text-gray-400">
      Quick & intuitive
    </span>
  </button>

  <button onClick={() => setMode('advanced')}>
    ⚙️ Build from Filters
    <span className="text-sm text-gray-400">
      Full control
    </span>
  </button>
</div>

{mode === 'smart' && <SmartRowBuilder />}
{mode === 'advanced' && <CustomRowWizard />}
```

## Next Steps

1. Build `SmartRowBuilder` shell component
2. Build `MovieSelectionStep` with search dropdown
3. Build `AttributeSelectionStep` with pattern cards
4. Create analysis API endpoint
5. Build filter converter (attributes → AdvancedFilters)
6. Update colors from purple to red throughout

# Hybrid Onboarding System - Implementation Roadmap

## Overview

**Goal:** Create a comprehensive onboarding system with:

1. **Tutorial Modal** - Reference documentation (what we have now, improved)
2. **Interactive Tour** - Step-by-step guided experience (new)
3. **Contextual Help** - Just-in-time tooltips (new)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    ONBOARDING SYSTEM                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Tutorial   │  │ Interactive  │  │  Contextual  │     │
│  │    Modal     │  │     Tour     │  │   Tooltips   │     │
│  │              │  │              │  │              │     │
│  │  Reference   │  │  First-time  │  │   On-demand  │     │
│  │    Guide     │  │  Walkthrough │  │     Help     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │          ONBOARDING STORE (Zustand)                │    │
│  │  - User progress tracking                          │    │
│  │  - Tour completion status                          │    │
│  │  - Feature discovery state                         │    │
│  │  - Tooltip dismiss history                         │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## STEP 1: Foundation Setup

**Goal:** Set up infrastructure for onboarding system

### 1.1 Install Dependencies

```bash
npm install react-joyride
npm install framer-motion  # For smooth animations
```

### 1.2 Create Onboarding Store

**File:** `stores/onboardingStore.ts`

**State to track:**

- `hasSeenWelcome: boolean`
- `hasCompletedTour: boolean`
- `tourProgress: number` (0-100%)
- `dismissedTooltips: string[]`
- `featuresDiscovered: string[]`
- `lastTourStep: number`
- `userLevel: 'beginner' | 'explorer' | 'expert'`

### 1.3 Create Storage Adapter

**File:** `utils/onboardingStorage.ts`

**Functions:**

- `saveProgress()` - Save to localStorage
- `loadProgress()` - Load from localStorage
- `resetProgress()` - Clear all progress
- `markFeatureDiscovered()` - Track feature usage

### Success Criteria:

- ✅ Store created and working
- ✅ Data persists across sessions
- ✅ Can track progress

**Time Estimate:** 1-2 hours

---

## STEP 2: Welcome Screen

**Goal:** Create choice screen when users first visit

### 2.1 Create Welcome Modal Component

**File:** `components/onboarding/WelcomeScreen.tsx`

**Design:**

```
┌──────────────────────────────────────────────┐
│                                               │
│         🎬 Welcome to Net Trailers!          │
│                                               │
│     Discover movies and TV shows you'll love │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │  🚀 Start Interactive Tour              │ │
│  │  Learn by doing (60 seconds)            │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │  📖 Browse Features                     │ │
│  │  Explore at your own pace               │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  [Skip - I know what I'm doing]               │
│                                               │
└──────────────────────────────────────────────┘
```

### 2.2 Integration Points

**Trigger when:**

- First visit (no localStorage data)
- User clicks "Help" in header
- Can be manually opened from settings

**Actions:**

- "Start Tour" → Launch interactive tour (Step 3)
- "Browse Features" → Open tutorial modal (current)
- "Skip" → Mark as seen, don't show again

### 2.3 Add to App

**File:** `app/page.tsx` or `app/layout.tsx`

```tsx
import { useOnboardingStore } from '../stores/onboardingStore'
import WelcomeScreen from '../components/onboarding/WelcomeScreen'

function App() {
    const { hasSeenWelcome, setHasSeenWelcome } = useOnboardingStore()

    return (
        <>
            {!hasSeenWelcome && <WelcomeScreen />}
            {/* rest of app */}
        </>
    )
}
```

### Success Criteria:

- ✅ Shows on first visit
- ✅ Doesn't show again after dismissed
- ✅ Can be reopened from help menu
- ✅ Cinematic styling matches app

**Time Estimate:** 2-3 hours

---

## STEP 3: Interactive Tour Setup

**Goal:** Implement step-by-step guided walkthrough

### 3.1 Define Tour Steps

**File:** `components/onboarding/tourSteps.ts`

**5 Essential Steps:**

```typescript
export const tourSteps = [
    {
        target: '.hero-carousel',
        content: 'Browse trending movies and TV shows. Click any poster to see details!',
        disableBeacon: true,
        placement: 'bottom',
    },
    {
        target: '[data-tour="like-button"]',
        content: "Like content to build your taste profile. We'll recommend similar titles!",
        placement: 'top',
    },
    {
        target: '[data-tour="add-to-list"]',
        content: 'Add to your watchlist to save for later. Syncs across all devices!',
        placement: 'left',
    },
    {
        target: '[data-tour="search"]',
        content: 'Search with filters or try AI-powered smart search with natural language!',
        placement: 'bottom',
    },
    {
        target: '[data-tour="collections"]',
        content: 'Create custom collections to organize your favorite content!',
        placement: 'bottom',
    },
]
```

### 3.2 Add Tour Targets to Components

**Update existing components to add `data-tour` attributes:**

**Example - Header.tsx:**

```tsx
<button data-tour="search" onClick={openSearch}>
    Search
</button>
```

**Example - ContentCard.tsx:**

```tsx
<button data-tour="like-button" onClick={handleLike}>
    <HandThumbUpIcon />
</button>
```

### 3.3 Create Tour Component

**File:** `components/onboarding/InteractiveTour.tsx`

```tsx
import Joyride from 'react-joyride'
import { tourSteps } from './tourSteps'
import { useOnboardingStore } from '../../stores/onboardingStore'

export default function InteractiveTour() {
    const { isTourActive, setTourActive, setTourCompleted, setTourProgress } = useOnboardingStore()

    return (
        <Joyride
            steps={tourSteps}
            run={isTourActive}
            continuous
            showProgress
            showSkipButton
            callback={(data) => {
                if (data.status === 'finished' || data.status === 'skipped') {
                    setTourActive(false)
                    if (data.status === 'finished') {
                        setTourCompleted(true)
                    }
                }
                setTourProgress((data.index / tourSteps.length) * 100)
            }}
            styles={{
                // Custom cinematic styling
                options: {
                    primaryColor: '#f97316', // Orange
                    backgroundColor: '#18181b',
                    textColor: '#ffffff',
                    overlayColor: 'rgba(0, 0, 0, 0.8)',
                },
            }}
        />
    )
}
```

### 3.4 Integration

**Add to root layout:**

```tsx
import InteractiveTour from '../components/onboarding/InteractiveTour'

export default function RootLayout({ children }) {
    return (
        <>
            <InteractiveTour />
            {children}
        </>
    )
}
```

### Success Criteria:

- ✅ Tour highlights correct elements
- ✅ Steps flow logically
- ✅ Progress is saved
- ✅ Can skip/restart tour
- ✅ Completion tracked

**Time Estimate:** 3-4 hours

---

## STEP 4: Improve Tutorial Modal

**Goal:** Enhance existing modal with search and better UX

### 4.1 Add Search Functionality

**File:** `components/modals/TutorialModal.tsx`

```tsx
const [searchQuery, setSearchQuery] = useState('')

// Filter features by search
const filteredFeatures = useMemo(() => {
    if (!searchQuery) return allFeatures

    return allFeatures.filter(
        (feature) =>
            feature.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            feature.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
}, [searchQuery, allFeatures])
```

**Add search UI:**

```tsx
<div className="mb-4">
    <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search features..."
        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg"
    />
</div>
```

### 4.2 Add Quick Links

**Popular features section:**

```tsx
<div className="mb-4">
    <p className="text-sm text-gray-400 mb-2">Popular:</p>
    <div className="flex flex-wrap gap-2">
        {['Collections', 'Rankings', 'Smart Search', 'Voice Search'].map((topic) => (
            <button
                onClick={() => setSearchQuery(topic)}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-full text-sm"
            >
                {topic}
            </button>
        ))}
    </div>
</div>
```

### 4.3 Add "Try It" Buttons

**Link features to actual actions:**

```tsx
<FeatureItem
    icon={<SparklesIcon />}
    title="AI Smart Search"
    description="Natural language queries..."
    action={
        <button
            onClick={() => {
                onClose()
                openSmartSearch()
            }}
            className="text-orange-400 text-sm hover:underline"
        >
            Try it now →
        </button>
    }
/>
```

### Success Criteria:

- ✅ Search works across all features
- ✅ Quick links filter instantly
- ✅ "Try it" buttons close modal and open feature
- ✅ Better visual hierarchy

**Time Estimate:** 2-3 hours

---

## STEP 5: Contextual Tooltips

**Goal:** Show helpful tips when users interact with features for the first time

### 5.1 Create Tooltip Component

**File:** `components/onboarding/ContextualTooltip.tsx`

```tsx
interface TooltipProps {
    id: string // Unique tooltip ID
    content: string
    targetRef: RefObject<HTMLElement>
    placement?: 'top' | 'bottom' | 'left' | 'right'
}

export default function ContextualTooltip({
    id,
    content,
    targetRef,
    placement = 'top',
}: TooltipProps) {
    const { dismissedTooltips, dismissTooltip } = useOnboardingStore()
    const [isVisible, setIsVisible] = useState(false)

    // Only show if not dismissed
    if (dismissedTooltips.includes(id)) return null

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute z-50 bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg"
                >
                    {content}
                    <button
                        onClick={() => dismissTooltip(id)}
                        className="ml-2 text-white/80 hover:text-white"
                    >
                        ×
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
```

### 5.2 Create useTooltip Hook

**File:** `hooks/useTooltip.ts`

```tsx
export function useTooltip(tooltipId: string) {
    const { featuresDiscovered, markFeatureDiscovered } = useOnboardingStore()
    const hasSeenFeature = featuresDiscovered.includes(tooltipId)

    const showTooltipOnFirstInteraction = () => {
        if (!hasSeenFeature) {
            markFeatureDiscovered(tooltipId)
            return true
        }
        return false
    }

    return { showTooltipOnFirstInteraction, hasSeenFeature }
}
```

### 5.3 Add to Components

**Example - Smart Search Button:**

```tsx
function SmartSearchButton() {
    const { showTooltipOnFirstInteraction } = useTooltip('smart-search')
    const [showTooltip, setShowTooltip] = useState(false)

    const handleClick = () => {
        if (showTooltipOnFirstInteraction()) {
            setShowTooltip(true)
            setTimeout(() => setShowTooltip(false), 5000)
        }
        openSmartSearch()
    }

    return (
        <>
            <button onClick={handleClick}>
                <SparklesIcon />
                Smart Search
            </button>
            {showTooltip && (
                <ContextualTooltip
                    id="smart-search"
                    content="💡 Try: 'rainy day movies' or 'mind-bending thrillers'"
                    placement="bottom"
                />
            )}
        </>
    )
}
```

### 5.4 Tooltip Triggers

**Define where tooltips appear:**

- First voice search → "Speak naturally, like 'show me action movies'"
- First collection creation → "Collections can auto-update daily!"
- First ranking → "Make it public to get likes and comments"
- First forum post → "Use markdown for formatting"
- First share → "Anyone with the link can view"

### Success Criteria:

- ✅ Shows on first interaction only
- ✅ Dismissible
- ✅ Persistent (doesn't show again)
- ✅ Non-intrusive
- ✅ Animated smoothly

**Time Estimate:** 3-4 hours

---

## STEP 6: Progress Tracking & Gamification

**Goal:** Show users their learning progress and celebrate achievements

### 6.1 Create Progress Component

**File:** `components/onboarding/ProgressTracker.tsx`

```tsx
export default function ProgressTracker() {
    const { tourProgress, featuresDiscovered, userLevel } = useOnboardingStore()

    const totalFeatures = 10 // Key features to discover
    const discovered = featuresDiscovered.length
    const percentage = (discovered / totalFeatures) * 100

    return (
        <div className="p-4 bg-zinc-900/60 backdrop-blur-lg rounded-xl border border-orange-500/40">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-white">Your Progress</span>
                <span className="text-xs text-gray-400">
                    {discovered}/{totalFeatures} features discovered
                </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                />
            </div>

            {/* Level badge */}
            <div className="mt-3">
                <LevelBadge level={userLevel} />
            </div>
        </div>
    )
}
```

### 6.2 Create Achievement System

**File:** `components/onboarding/AchievementBadge.tsx`

**Achievements:**

- 🎬 **First Steps** - Complete tutorial tour
- 👍 **Critic** - Rate 10 titles
- 📚 **Collector** - Create 3 collections
- 🏆 **Ranker** - Create first ranking
- 💬 **Community Member** - Post in forum
- 🔍 **Power Searcher** - Use AI search
- 🎯 **Expert** - Discover all features

### 6.3 Celebration Modal

**Show when user completes tour or unlocks achievement:**

```tsx
<motion.div
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    className="fixed inset-0 z-50 flex items-center justify-center"
>
    <div className="bg-gradient-to-br from-orange-500 to-red-600 p-8 rounded-2xl text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-white mb-2">Tour Completed!</h2>
        <p className="text-white/80">You've unlocked: Beginner Badge</p>
    </div>
</motion.div>
```

### Success Criteria:

- ✅ Progress saves automatically
- ✅ Badges unlock based on actions
- ✅ Celebrations feel rewarding
- ✅ Can view all achievements

**Time Estimate:** 3-4 hours

---

## STEP 7: Integration & Polish

**Goal:** Connect all pieces and ensure smooth experience

### 7.1 Add Help Menu to Header

**File:** `components/layout/Header.tsx`

```tsx
;<button onClick={toggleHelpMenu} className="relative">
    <AcademicCapIcon className="w-6 h-6" />
    {/* Show badge if tour not completed */}
    {!hasCompletedTour && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
    )}
</button>

{
    /* Dropdown menu */
}
{
    showHelpMenu && (
        <div className="absolute top-12 right-0 bg-zinc-900 rounded-lg shadow-xl">
            <button onClick={startTour}>🚀 Start Tour</button>
            <button onClick={openTutorial}>📖 Browse Features</button>
            <button onClick={openProgress}>📊 View Progress</button>
            <button onClick={resetProgress}>🔄 Reset Progress</button>
        </div>
    )
}
```

### 7.2 Add Settings Integration

**File:** `app/settings/preferences/page.tsx`

Add section:

```tsx
<div className="p-4 border-b border-zinc-800">
    <h3 className="font-semibold mb-2">Onboarding</h3>
    <button onClick={restartTour}>Restart Interactive Tour</button>
    <button onClick={resetProgress}>Reset All Progress</button>
</div>
```

### 7.3 Mobile Optimization

- Ensure tour works on mobile
- Touch-friendly tooltip dismissal
- Responsive modal sizing
- Swipeable tutorial cards

### 7.4 Accessibility

- Keyboard navigation for tour
- Screen reader announcements
- Focus management
- High contrast mode support

### Success Criteria:

- ✅ All pieces work together
- ✅ Mobile responsive
- ✅ Accessible
- ✅ No bugs or conflicts
- ✅ Performance optimized

**Time Estimate:** 4-5 hours

---

## STEP 8: Testing & Refinement

**Goal:** Ensure everything works perfectly

### 8.1 Test Scenarios

- [ ] First-time user (no data)
- [ ] Returning user (has progress)
- [ ] Tour completion flow
- [ ] Tour skip/restart
- [ ] Tooltip appearances
- [ ] Achievement unlocks
- [ ] Search functionality
- [ ] Mobile experience
- [ ] Offline behavior

### 8.2 Analytics Integration

**Track:**

- Tour completion rate
- Steps where users drop off
- Feature discovery rate
- Time to first action
- Modal interactions

### 8.3 Gather Feedback

- User testing with 3-5 people
- Iterate based on feedback
- Fix bugs and edge cases

### Success Criteria:

- ✅ >70% tour completion rate
- ✅ No critical bugs
- ✅ Positive user feedback
- ✅ Fast and smooth

**Time Estimate:** 3-4 hours

---

## Total Time Estimate

| Step      | Task                    | Time            |
| --------- | ----------------------- | --------------- |
| 1         | Foundation Setup        | 1-2 hours       |
| 2         | Welcome Screen          | 2-3 hours       |
| 3         | Interactive Tour        | 3-4 hours       |
| 4         | Improve Tutorial Modal  | 2-3 hours       |
| 5         | Contextual Tooltips     | 3-4 hours       |
| 6         | Progress & Gamification | 3-4 hours       |
| 7         | Integration & Polish    | 4-5 hours       |
| 8         | Testing & Refinement    | 3-4 hours       |
| **TOTAL** | **Full Implementation** | **21-29 hours** |

**Spread over:** 3-4 days of focused work

---

## Recommended Implementation Order

### Week 1: Core System

✅ **Day 1-2:** Steps 1, 2, 3 (Foundation + Welcome + Tour)

- Get the interactive tour working
- This is the "wow" factor

### Week 2: Enhancements

✅ **Day 3:** Step 4 (Improve Modal)

- Add search and quick links
- Make tutorial more useful

✅ **Day 4:** Step 5 (Tooltips)

- Add contextual help
- Polish the experience

### Week 3: Polish

✅ **Day 5:** Step 6 (Progress)

- Add gamification
- Make it engaging

✅ **Day 6-7:** Steps 7, 8 (Integration + Testing)

- Connect everything
- Test thoroughly
- Fix bugs

---

## Quick Wins (If Time-Constrained)

**Minimum Viable Onboarding (8-10 hours):**

1. Welcome screen (2 hours)
2. Interactive tour with 3 key steps (3 hours)
3. Improve tutorial modal with search (2 hours)
4. Basic progress tracking (2 hours)

**Skip for MVP:**

- Contextual tooltips (can add later)
- Achievement badges (nice to have)
- Advanced gamification (overkill for MVP)

---

## Files to Create

```
stores/
  onboardingStore.ts              ← Step 1

utils/
  onboardingStorage.ts            ← Step 1

components/onboarding/
  WelcomeScreen.tsx               ← Step 2
  InteractiveTour.tsx             ← Step 3
  tourSteps.ts                    ← Step 3
  ContextualTooltip.tsx           ← Step 5
  ProgressTracker.tsx             ← Step 6
  AchievementBadge.tsx            ← Step 6
  LevelBadge.tsx                  ← Step 6

hooks/
  useOnboarding.ts                ← Step 1
  useTooltip.ts                   ← Step 5

types/
  onboarding.ts                   ← Step 1
```

**Modified files:**

- Header.tsx (add help menu)
- TutorialModal.tsx (add search)
- Various components (add data-tour attributes)

---

## Success Metrics

**After full implementation, track:**

📈 **Engagement:**

- Tour completion rate: Target >70%
- Feature discovery: Target 8/10 features used in first week
- Return rate: Day 7 retention

📊 **Behavior:**

- Time to first action: Target <30 seconds
- Features tried per session: Target 3-5
- Help menu usage: Track frequency

💡 **Feedback:**

- User satisfaction: Survey after tour
- Support tickets: Should decrease
- Feature requests: Better understanding of existing features

---

## Next Steps

**What would you like to start with?**

**Option A:** Foundation first (Step 1)

- Set up the store and infrastructure
- Boring but necessary

**Option B:** Visual first (Step 2)

- Create welcome screen
- See immediate results

**Option C:** Interactive tour (Step 3)

- Most impactful piece
- Requires some setup first

**My recommendation:** Start with **Step 1 + Step 2** together (3-4 hours) to get a working welcome screen that launches a basic tour. Then we can iterate from there.

Ready to begin? 🚀

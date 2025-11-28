# Recommendations V2 - Improvement Plan

## Executive Summary

This plan addresses the V1 limitations by transforming the "Recommended For You" row from a shallow genre carousel into a truly personalized recommendation engine using full interaction history, feedback loops, and explicit reasoning.

---

## V1 Limitations Recap

### 1. Shallow Signal Depth

- Only 10-20 items per category sent to API
- Heavy users' history ignored
- No use of watch history or interaction events

### 2. Static Personalization

- No feedback loop for dislikes/skips
- After page 1, purely genre-based
- No learning from user behavior

### 3. Progressive Degradation

- Late pages become generic trending
- No collaborative signals
- Loses relevance as user scrolls

### 4. No Transparency

- Users don't know why content was recommended
- No "Because you liked..." explanations

---

## Proposed V2 Architecture

### Phase 1: Deep History Utilization (Priority: HIGH)

**Objective:** Use full user history instead of 10-20 item slices.

#### Changes to POST Handler

**Current (V1):**

```typescript
POST body:
  myRatings: slice(0, 20)
  likedMovies: slice(0, 10)
  watchlist: slice(0, 10)
  collectionItems: slice(0, 20)
```

**Proposed (V2):**

```typescript
POST body:
  // Aggregated summary instead of raw arrays
  interactionSummary: {
    totalInteractions: number
    genreScores: Record<genreId, weightedScore>
    contentScores: Record<contentId, weightedScore>
    timeRangePreferences: {
      recent: GenrePreference[]      // Last 30 days
      medium: GenrePreference[]      // 30-90 days
      longTerm: GenrePreference[]    // All time
    }
    topContent: {
      contentId: number
      mediaType: string
      totalScore: number
      lastInteraction: timestamp
    }[]
    negativeSig

nals: {
      hiddenGenres: number[]
      hiddenContent: number[]
    }
  }

  // Still send specific data for reasons
  recentRatings: myRatings.slice(0, 50)  // Up from 20
  recentInteractions: interactions.slice(0, 100)  // NEW
```

#### Implementation Details

**File:** `utils/recommendations/interactionAggregator.ts` (NEW)

```typescript
export interface InteractionSummary {
    userId: string
    totalInteractions: number
    genreScores: Record<number, number> // genreId → weighted score
    contentScores: Record<number, number> // contentId → weighted score
    timeRangePreferences: {
        recent: GenrePreference[]
        medium: GenrePreference[]
        longTerm: GenrePreference[]
    }
    topContent: TopContent[]
    negativeSignals: NegativeSignals
    lastCalculated: number
}

export function aggregateUserInteractions(
    interactions: UserInteraction[],
    ratings: RatedContent[],
    watchHistory?: WatchHistoryEntry[]
): InteractionSummary
```

**Benefits:**

- ✅ Full history considered (not just last 10-20)
- ✅ Time-weighted preferences (recent > old)
- ✅ Negative signals properly tracked
- ✅ Smaller payload (summary vs raw arrays)
- ✅ Can cache summary in Firestore for faster loads

---

### Phase 2: Feedback Loop Integration (Priority: HIGH)

**Objective:** Learn from user behavior and adjust recommendations in real-time.

#### Feedback Mechanisms

**1. Explicit Feedback (User Actions)**

```typescript
// Row component tracks user actions
- Click/open modal → positive signal
- Quick dismiss (< 2s) → neutral/negative
- Hide content → strong negative
- Add to watchlist → strong positive
- Like/dislike → strongest signals
```

**2. Implicit Feedback (Behavioral)**

```typescript
// Track scroll patterns
- Content scrolled past without interaction → weak negative
- Content viewed for >3s → weak positive
- Hover/focus → very weak positive
```

**3. Feedback Storage**

**File:** `types/recommendations.ts` (UPDATED)

```typescript
export interface RecommendationFeedback {
    id: string
    userId: string
    contentId: number
    mediaType: 'movie' | 'tv'
    recommendationPage: number // Which page it appeared on
    feedbackType: 'explicit' | 'implicit'
    action: 'viewed' | 'dismissed' | 'hidden' | 'liked' | 'watchlisted' | 'scrolled_past'
    timestamp: number
    source: 'recommended_row'
}
```

**Storage:** Firestore collection `/recommendation_feedback/{feedbackId}`

- TTL: 90 days (same as interactions)
- Indexed by: userId, contentId, timestamp

#### API Changes

**File:** `app/api/recommendations/feedback/route.ts` (NEW)

```typescript
POST /api/recommendations/feedback
  Body: {
    contentId: number
    mediaType: 'movie' | 'tv'
    action: string
    page: number
  }

  → Stores feedback
  → Returns success
```

**File:** `app/api/recommendations/personalized/route.ts` (UPDATED)

```typescript
GET handler additions:
  1. Fetch recent feedback for this user
  2. Exclude content user dismissed/hidden
  3. Boost genres user engaged with
  4. Penalize genres user scrolled past
```

**Benefits:**

- ✅ Recommendations improve as user scrolls
- ✅ Learn from dismissals/hides
- ✅ Adapt to changing tastes
- ✅ Reduce recommendation fatigue

---

### Phase 3: Collaborative Signals (Priority: MEDIUM)

**Objective:** Use patterns from similar users to improve recommendations.

#### Similar User Detection

**File:** `utils/recommendations/collaborativeFiltering.ts` (NEW)

```typescript
export interface UserSimilarity {
    userId: string
    otherUserId: string
    similarityScore: number // 0-1
    sharedGenres: number[]
    sharedContent: number[]
    calculatedAt: number
}

export async function findSimilarUsers(
    userId: string,
    interactionSummary: InteractionSummary,
    limit: number = 10
): Promise<UserSimilarity[]>
```

**Algorithm:**

1. Compare genre preference vectors (cosine similarity)
2. Find users with top 3 matching genres
3. Check content overlap (Jaccard similarity)
4. Score: 70% genre match + 30% content match

#### Collaborative Recommendations

**Logic:**

```typescript
1. Find 10 most similar users
2. Get their top-rated content (not in current user's history)
3. Filter by user's preferred genres (50% match minimum)
4. Score based on:
   - Similarity score (40%)
   - Content rating (30%)
   - Recency (20%)
   - Popularity (10%)
```

**Integration into GET handler:**

```typescript
Recommendation sources (priority order):
  1. Personal genre-based (50%)
  2. Collaborative (25%)
  3. TMDB similar (15%)
  4. Trending (10%)
```

**Privacy Considerations:**

- ✅ Only use aggregated data (no personal info exposed)
- ✅ User can opt-out via settings
- ✅ Minimum 100 users in similar pool before activating

**Benefits:**

- ✅ Discover content outside user's normal genres
- ✅ "Users who liked X also liked Y" quality
- ✅ Reduce filter bubble effect

---

### Phase 4: Explicit Reason Generation (Priority: MEDIUM)

**Objective:** Show users why content was recommended.

#### Reason Types

**File:** `types/recommendations.ts` (UPDATED)

```typescript
export interface RecommendationReason {
    type: 'similar_to' | 'genre_preference' | 'collaborative' | 'trending' | 'watch_history'
    confidence: number // 0-1
    explanation: string
    relatedContent?: Content // For "Similar to X"
    relatedGenre?: string // For "Trending in Action"
}

export interface Recommendation {
    content: Content
    source: string
    score: number
    reason: RecommendationReason // NEW
    generatedAt: number
}
```

#### Reason Generation Logic

**File:** `utils/recommendations/reasonGenerator.ts` (NEW)

```typescript
export function generateReason(
    content: Content,
    source: RecommendationSource,
    userProfile: InteractionSummary,
    relatedContent?: Content
): RecommendationReason {
    switch (source) {
        case 'genre_based':
            return {
                type: 'genre_preference',
                confidence: 0.8,
                explanation: `Trending in ${topMatchingGenre}`,
                relatedGenre: topMatchingGenre,
            }

        case 'tmdb_similar':
            return {
                type: 'similar_to',
                confidence: 0.9,
                explanation: `Because you liked ${relatedContent.title}`,
                relatedContent,
            }

        case 'collaborative':
            return {
                type: 'collaborative',
                confidence: 0.7,
                explanation: `Popular with viewers like you`,
            }

        case 'trending':
            return {
                type: 'trending',
                confidence: 0.6,
                explanation: `Trending now in ${genre}`,
                relatedGenre: genre,
            }
    }
}
```

#### UI Integration

**File:** `components/content/ContentCard.tsx` (UPDATED)

```tsx
{
    recommendation.reason && <div className="reason-badge">{recommendation.reason.explanation}</div>
}
```

**Styling:**

- Small badge below poster
- Subtle, non-intrusive
- Different colors per reason type
- Tooltip for more details

**Benefits:**

- ✅ Transparency builds trust
- ✅ Users understand personalization
- ✅ Helps validate recommendation quality
- ✅ Educational (users learn what drives their feed)

---

### Phase 5: Watch History Integration (Priority: LOW)

**Objective:** Use viewing patterns to refine recommendations.

**Note:** Watch history tracking already exists but isn't used in recommendations.

#### Integration Points

**File:** `utils/recommendations/genreEngine.ts` (UPDATED)

```typescript
export function buildRecommendationProfile(
    userData: UserData,
    genrePreferences: UserGenrePreference[],
    contentPreferences: UserContentPreference[],
    votedContent: UserVotedContent[],
    watchHistory?: WatchHistoryEntry[] // NEW
): RecommendationProfile
```

**Logic:**

```typescript
1. Extract genre patterns from watch history
   - Completed content (watched >80%) → strong positive
   - Abandoned content (watched <20%) → negative

2. Time-of-day patterns
   - User watches action at night → boost action in evening
   - User watches comedy on weekends → boost comedy Fri-Sun

3. Binge behavior
   - User binged similar titles → boost that genre
   - User stopped after one episode → penalize
```

**Benefits:**

- ✅ More nuanced preference signals
- ✅ Temporal personalization
- ✅ Validate ratings with actual viewing

---

## Implementation Phases

### Phase 1: Deep History (Week 1-2)

- [ ] Create `interactionAggregator.ts`
- [ ] Update POST handler to accept/use interaction summary
- [ ] Modify `RecommendedForYouRow.tsx` to send summary
- [ ] Add Firestore caching for summary
- [ ] Test with heavy users (>100 interactions)

### Phase 2: Feedback Loop (Week 2-3)

- [ ] Create `/api/recommendations/feedback` endpoint
- [ ] Add feedback tracking to Row component
- [ ] Update GET handler to use feedback
- [ ] Add feedback Firestore collection
- [ ] Test feedback improves recommendations

### Phase 3: Collaborative (Week 3-4)

- [ ] Create `collaborativeFiltering.ts`
- [ ] Implement user similarity scoring
- [ ] Integrate into GET handler
- [ ] Add privacy controls
- [ ] Test with user base (min 100 users)

### Phase 4: Explicit Reasons (Week 4-5)

- [ ] Create `reasonGenerator.ts`
- [ ] Update Recommendation type
- [ ] Modify engine to generate reasons
- [ ] Update UI to display reasons
- [ ] A/B test reason visibility

### Phase 5: Watch History (Week 5-6)

- [ ] Integrate watch history into profile building
- [ ] Add temporal pattern detection
- [ ] Test improvements
- [ ] Document new features

---

## Success Metrics

### Engagement

- **Click-through rate (CTR):** Target 15%+ (baseline: ~8%)
- **Add to watchlist rate:** Target 10%+ (baseline: ~5%)
- **Hide/dismiss rate:** Target <5% (baseline: ~12%)

### Quality

- **Diversity score:** Reduce genre concentration (target: max 40% same genre)
- **Novelty:** 30%+ content user hasn't seen in similar contexts
- **Relevance:** 70%+ match user's top 5 genres

### Technical

- **Latency:** <500ms for initial POST, <300ms for GET pagination
- **Cache hit rate:** >80% for interaction summaries
- **Feedback collection rate:** >20% of recommended items

---

## Risks & Mitigation

### Risk 1: Complexity Creep

**Mitigation:** Start with Phase 1+2 only, validate improvements before continuing

### Risk 2: Performance Degradation

**Mitigation:** Aggressive caching, async processing, pagination limits

### Risk 3: Privacy Concerns

**Mitigation:** Clear opt-out, anonymized collaborative data, transparent documentation

### Risk 4: Cold Start Problem

**Mitigation:** Keep trending fallback, require minimum interactions, onboarding quiz

---

## Alternative Approaches Considered

### Approach A: Full ML Model

**Pros:** Best personalization
**Cons:** Requires ML infrastructure, training data pipeline, ongoing maintenance
**Decision:** Too complex for current scope

### Approach B: Third-Party Service

**Pros:** Turnkey solution
**Cons:** Expensive, vendor lock-in, less control
**Decision:** Build in-house for flexibility

### Approach C: Simple Genre Boost

**Pros:** Minimal changes
**Cons:** Doesn't address core limitations
**Decision:** Not sufficient improvement

---

## Open Questions

1. **Should we cache interaction summaries in Firestore or calculate on-demand?**
    - Proposal: Cache with 24h TTL, rebuild on significant events (10+ new interactions)

2. **How many similar users should we find?**
    - Proposal: Start with 10, A/B test 5 vs 10 vs 20

3. **Should reasons be always visible or on-hover?**
    - Proposal: A/B test both, measure engagement

4. **Do we need a separate "Not Interested" button?**
    - Proposal: Yes, add to card actions (explicit negative feedback)

---

## Next Steps

1. **User Approval:** Review and approve this plan
2. **Technical Spike:** Test interaction aggregation performance (1 day)
3. **Phase 1 Implementation:** Deep history utilization (1 week)
4. **Validation:** Measure baseline metrics before/after Phase 1
5. **Phase 2+ Decision:** Continue based on Phase 1 results

---

**Status:** DRAFT - Awaiting Approval
**Created:** 2025-11-28
**Author:** Claude (AI Assistant)
**Version:** 2.0.0-PLAN

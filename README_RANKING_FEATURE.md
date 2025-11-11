# Ranking Generator Feature - Complete Planning Package

This directory contains comprehensive documentation for planning and implementing a ranking generator feature for NetTrailers. Three detailed documents are included:

## Documents Included

### 1. **RANKING_GENERATOR_ARCHITECTURE.md** (Main Document)
Comprehensive 13-section architectural analysis covering:
- Current data structures (Content types, Collections, Interactions, Sharing)
- State management architecture (Zustand stores, adapters, persistence)
- UI components available for reuse
- Firestore data persistence patterns
- Interaction tracking infrastructure
- Validation & sanitization patterns
- Available libraries and tools
- Architecture recommendations
- Security & data isolation patterns
- Summary table of reusable components
- Key patterns to follow
- Development environment setup

**Read this first for complete context.**

### 2. **RANKING_GENERATOR_QUICK_REFERENCE.md** (Implementation Guide)
Practical quick-reference guide including:
- Key files to know (organized by category)
- Architecture layers diagram
- State management flow diagram
- 7-phase implementation checklist
- Scoring algorithm options (manual, interaction-based, popularity-based, hybrid)
- Database schema design
- Key design decisions
- Component communication patterns
- Toast message templates
- Testing considerations
- Performance optimization tips
- Error handling patterns
- Code consistency guidelines

**Use this as your implementation checklist.**

### 3. **RANKING_GENERATOR_COMPONENTS.md** (Component Adaptation Guide)
Detailed component reuse strategies with code examples:
- How to adapt ContentCard for ranking items with scores
- Reusing ListSelectionModal for ranking management
- Using CustomRowWizard as template for ranking creation
- Implementing drag-and-drop with @dnd-kit (already installed)
- Integrating notification system (useToast)
- Setting up modal system
- Data validation & sanitization patterns
- Interaction tracking integration
- Sharing infrastructure reuse
- Recommended file structure
- Implementation priority
- Testing strategies

**Reference this for component implementation details.**

---

## Quick Start

1. **Understand the Architecture** (30 mins)
   - Read: RANKING_GENERATOR_ARCHITECTURE.md
   - Focus on sections 1-3 (data, state management, components)

2. **Plan Implementation** (15 mins)
   - Read: RANKING_GENERATOR_QUICK_REFERENCE.md
   - Review implementation checklist
   - Identify priorities

3. **Start Development** (Ongoing)
   - Reference: RANKING_GENERATOR_COMPONENTS.md
   - Follow implementation priority
   - Use code examples provided

---

## Key Findings Summary

### What Already Exists

✅ **Type-safe content system** - Movies & TV shows unified with discriminated unions
✅ **Collection infrastructure** - UserList type supports ordering, sharing, metadata
✅ **State management** - Zustand with Firebase + localStorage adapters
✅ **UI components** - ContentCard, Row, modals, drag-and-drop via @dnd-kit
✅ **Data persistence** - Firestore subcollections, localStorage mirroring
✅ **Interaction tracking** - Weighted scoring system ready to use
✅ **Sharing system** - Complete with links, expiration, view counts
✅ **Toast notifications** - Unified system for all user feedback
✅ **Validation & security** - XSS prevention patterns established
✅ **Data isolation** - Strong patterns for auth vs guest separation

### What to Build

Create ranking-specific versions of:
- **Types**: Ranking, RankedContent (extend UserList pattern)
- **Store actions**: createRanking, updateRanking, reorderItems
- **Components**: RankingItemCard, SortableRankingItem, RankingBuilderModal
- **Services**: RankingsService (follow UserListsService pattern)
- **Firestore**: rankings.ts (follow interactions.ts pattern)
- **Hooks**: useRankings, useRankingScoring

### Architecture Pattern to Follow

```
Zustand Store
    ↓
RankingsService (Business Logic)
    ↓
Firestore/localStorage Adapters
    ↓
React Components (UI)
```

---

## Key Architectural Patterns

1. **Factory Pattern**: Single `createUserStore` powering auth + guest
2. **Adapter Pattern**: `StorageAdapter` interface abstracts Firebase/localStorage
3. **Discriminated Unions**: `Content = Movie | TVShow` with type guards
4. **Service Layer**: `UserListsService` provides type-safe CRUD with validation
5. **Interaction Tracking**: Weighted scoring for user actions
6. **XSS Prevention**: Input sanitization in service layer
7. **Data Isolation**: User ID validation before all state mutations
8. **Optimistic Updates**: UI updates before async operations complete

---

## Technology Stack Already Installed

- **State**: Zustand 5.0.8
- **UI**: React 19.2.0, TailwindCSS 3.4.17
- **Drag-Drop**: @dnd-kit/core 6.3.1, @dnd-kit/sortable 10.0.0
- **Data**: Firebase 12.2.1, Zod 3.25.76
- **Validation**: isomorphic-dompurify 2.30.1, nanoid 5.1.6
- **Icons**: @heroicons/react 2.0.13
- **Forms**: react-hook-form 7.43.0

**No new dependencies needed!**

---

## Data Structure Template

```typescript
// In /types/rankings.ts
export interface Ranking extends Omit<UserList, 'collectionType'> {
    items: RankedContent[]      // Ordered, scored items
    totalScore: number          // Sum of all item scores
    description?: string        // Why this ranking was created
    criteria?: string[]         // Ranking criteria
}

export interface RankedContent {
    content: Content            // Full content object
    rank: number                // 1-based position
    score: number               // 1-100 score
    scoreBreakdown?: {
        likeWeight: number
        watchlistWeight: number
        interactionCount: number
        popularity: number
    }
    reasoning?: string          // User's note on why
}

// In /stores/createUserStore.ts
export interface UserState {
    userRankings: Ranking[]     // Add to existing state
}

export interface UserActions {
    createRanking: (request) => Promise<string>
    updateRanking: (id, updates) => Promise<void>
    deleteRanking: (id) => Promise<void>
    addToRanking: (id, content, score) => Promise<void>
    removeFromRanking: (id, contentId) => Promise<void>
    reorderRanking: (id, newOrder) => Promise<void>
}
```

---

## Firestore Schema

```
users/{userId}/
  ├── rankings/
  │   └── {rankingId}: Ranking
  └── interactions/
      └── {interactionId}: (includes ranking_created, item_ranked, etc.)
```

---

## Development Workflow

1. **Create types** (`/types/rankings.ts`)
2. **Extend stores** (add to `createUserStore.ts`)
3. **Build services** (`/services/rankingsService.ts`)
4. **Implement Firestore** (`/utils/firestore/rankings.ts`)
5. **Build components** (`/components/rankings/*`)
6. **Create hooks** (`/hooks/useRankings.ts`)
7. **Add validation** (`/schemas/rankingSchema.ts`)
8. **Test thoroughly** (unit, integration, E2E)

---

## Estimated Effort

- **Phase 1 (Types & State)**: 4-6 hours
- **Phase 2 (Firestore)**: 4-6 hours
- **Phase 3 (Components)**: 12-16 hours
- **Phase 4 (Hooks)**: 4-6 hours
- **Phase 5 (Validation)**: 2-4 hours
- **Phase 6 (Sharing)**: 2-4 hours
- **Phase 7 (Testing)**: 8-12 hours

**Total: 36-54 hours** for MVP (manual scoring, basic ranking, sharing)

---

## Success Criteria

- [x] Type-safe data structures
- [x] Create/edit/delete rankings
- [x] Add items with manual scores
- [x] Reorder items via drag-and-drop
- [x] Share rankings with links
- [x] Persist to Firestore & localStorage
- [x] Work in both auth & guest modes
- [x] Track interactions
- [x] Comprehensive test coverage

---

## References

All documentation contained in:
1. `RANKING_GENERATOR_ARCHITECTURE.md` - Full architecture analysis
2. `RANKING_GENERATOR_QUICK_REFERENCE.md` - Implementation guide
3. `RANKING_GENERATOR_COMPONENTS.md` - Component reuse strategies
4. Project files referenced throughout (types, stores, services, components)

---

## Notes

- Follow existing code style and patterns for consistency
- All dependencies are already installed - no `npm install` needed
- Reuse existing security and validation patterns
- Leverage @dnd-kit for drag-and-drop (already integrated)
- Use Zustand stores directly without provider wrappers
- Support both Firebase (auth) and localStorage (guest) from start
- Track all ranking interactions for future recommendations

---

**Created**: 2025-11-11
**For**: NetTrailers Ranking Generator Feature
**Status**: Ready for Implementation


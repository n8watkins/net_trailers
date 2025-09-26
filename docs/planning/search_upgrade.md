# Search System Upgrade Plan

## Executive Summary

This document outlines a comprehensive plan to upgrade the NetTrailer search system, addressing critical bugs, missing features, and user experience improvements. The plan is divided into 4 phases prioritized by impact and implementation complexity.

## Current Issues Assessment

### 🚨 Critical Issues

- **Broken filtered search logic**: Using `with_keywords` instead of proper text search
- **Inefficient pagination**: Client-side pagination for filtered results
- **No keyboard navigation**: Missing arrow key support in suggestions

### ⚠️ Medium Issues

- **Poor retry logic**: Window reload instead of request retry
- **Limited error context**: Generic error messages
- **Mixed search approaches**: Inconsistent result ordering

### 📈 Missing Features

- Advanced filters UI
- Search autocomplete
- Search by person/actor
- Infinite scroll
- Search categories
- Voice search
- Search analytics

---

## Phase 1: Critical Bug Fixes (Week 1-2)

_Priority: HIGH | Estimated Effort: 16-20 hours_

### 1.1 Fix Filtered Search Logic

**Issue**: `pages/api/search.ts:149-152` uses `with_keywords` incorrectly
**Files**: `pages/api/search.ts`

**Implementation**:

```typescript
// Replace discover + keywords approach with proper search + filter combination
// Use /search/multi for text matching, then apply filters client-side
// Or use separate movie/tv search endpoints with proper query handling
```

**Tasks**:

- [ ] Rewrite `fetchDiscoverMovies()` and `fetchDiscoverTV()` functions
- [ ] Implement proper text search with post-filtering
- [ ] Add server-side result deduplication
- [ ] Test with various filter combinations

### 1.2 Fix Pagination Logic

**Issue**: Client-side pagination limits scalability
**Files**: `pages/api/search.ts`, `hooks/useSearch.ts`

**Implementation**:

- Implement proper server-side pagination
- Handle page management between filtered and unfiltered searches
- Maintain pagination state across filter changes

**Tasks**:

- [ ] Refactor API to handle server-side pagination properly
- [ ] Update `useSearch` hook to manage page state correctly
- [ ] Implement proper "Load More" functionality
- [ ] Add pagination state reset on filter changes

### 1.3 Add Keyboard Navigation

**Issue**: No arrow key support in suggestion dropdown
**Files**: `components/SearchBar.tsx`

**Implementation**:

```typescript
// Add keyboard event handlers for:
// - Arrow up/down: Navigate suggestions
// - Enter: Select current suggestion
// - Tab: Select current suggestion and move focus
// - Escape: Close suggestions
```

**Tasks**:

- [ ] Add keyboard event handlers to SearchBar
- [ ] Implement suggestion highlighting state
- [ ] Add ARIA accessibility attributes
- [ ] Test keyboard navigation flow

### 1.4 Improve Error Handling

**Issue**: Generic error messages and poor retry logic
**Files**: `components/SearchResults.tsx`, `utils/errorHandler.ts`

**Tasks**:

- [ ] Replace window.reload() with proper retry mechanism
- [ ] Add specific error messages for different failure types
- [ ] Implement exponential backoff for retries
- [ ] Add error boundary for search components

---

## Phase 2: Core Feature Additions (Week 3-4)

_Priority: HIGH | Estimated Effort: 24-30 hours_

### 2.1 Advanced Filters UI Component

**Missing**: Visual interface for existing filter state
**Files**: `components/SearchFilters.tsx` (new), `pages/search.tsx`

**Features**:

- Genre selection (multi-select dropdown)
- Year range slider (1900 - current year)
- Rating range slider (0-10)
- Sort options (popularity, rating, release date, title)
- Sort order toggle (asc/desc)
- Clear all filters button

**Tasks**:

- [ ] Create `SearchFilters.tsx` component
- [ ] Design responsive filter UI layout
- [ ] Integrate with existing `useSearch` hook
- [ ] Add filter persistence in URL params
- [ ] Implement filter animation/transitions

### 2.2 Search Autocomplete/Suggestions

**Missing**: API-driven search suggestions
**Files**: `hooks/useSearch.ts`, `pages/api/suggestions.ts` (new)

**Implementation**:

- Use TMDB search API for real-time suggestions
- Combine with search history for hybrid suggestions
- Debounce suggestion requests (150ms)
- Cache suggestions for performance

**Tasks**:

- [ ] Create `/api/suggestions` endpoint
- [ ] Update `useSearch` hook for API suggestions
- [ ] Implement suggestion caching
- [ ] Add suggestion categories (movies, TV, people)
- [ ] Update SearchBar to display rich suggestions

### 2.3 Infinite Scroll Implementation

**Missing**: Automatic loading of more results
**Files**: `components/SearchResults.tsx`, `hooks/useInfiniteScroll.ts` (new)

**Implementation**:

```typescript
// Use Intersection Observer API
// Load more content when user scrolls near bottom
// Maintain "Load More" button as fallback
```

**Tasks**:

- [ ] Create `useInfiniteScroll` hook
- [ ] Implement Intersection Observer logic
- [ ] Update SearchResults for infinite scroll
- [ ] Add loading indicators for scroll loading
- [ ] Implement scroll position restoration

---

## Phase 3: Enhanced User Experience (Week 5-6)

_Priority: MEDIUM | Estimated Effort: 20-25 hours_

### 3.1 Search Categories/Tabs

**Missing**: Separation of Movies, TV Shows, People results
**Files**: `components/SearchTabs.tsx` (new), `atoms/searchAtom.ts`

**Features**:

- Tab interface: "All", "Movies", "TV Shows", "People"
- Individual result counts per category
- Maintain separate pagination per tab
- URL state management for active tab

**Tasks**:

- [ ] Add search category to search state
- [ ] Create SearchTabs component
- [ ] Update API to support category filtering
- [ ] Implement tab-specific pagination
- [ ] Add category-specific result layouts

### 3.2 Voice Search Integration

**Missing**: Voice input capability
**Files**: `components/VoiceSearch.tsx` (new), `hooks/useVoiceSearch.ts` (new)

**Implementation**:

```typescript
// Use Web Speech API (SpeechRecognition)
// Free browser feature, no API costs
// Add microphone button to search bar
// Visual feedback during listening
```

**Tasks**:

- [ ] Create `useVoiceSearch` hook with Web Speech API
- [ ] Add VoiceSearch button component
- [ ] Implement listening state management
- [ ] Add browser compatibility checks
- [ ] Design voice search UI feedback

### 3.3 Search Result Previews

**Missing**: Quick content preview on hover
**Files**: `components/SearchPreview.tsx` (new), `components/SearchResults.tsx`

**Features**:

- Hover preview with basic movie/show info
- Quick actions (Add to favorites, More info)
- Trailer preview integration
- Responsive preview positioning

**Tasks**:

- [ ] Create SearchPreview component
- [ ] Implement hover detection and positioning
- [ ] Add preview content API integration
- [ ] Design preview layout and animations
- [ ] Add quick action buttons

### 3.4 Enhanced Search History Management

**Missing**: Search history organization and management
**Files**: `components/SearchHistory.tsx` (new), `atoms/searchAtom.ts`

**Features**:

- Clear individual history items
- Search history categories (recent, frequent)
- Search history limit and cleanup
- Export/import search history

**Tasks**:

- [ ] Enhance search history state management
- [ ] Create SearchHistory component
- [ ] Add history item management functions
- [ ] Implement history categories logic
- [ ] Add history cleanup utilities

---

## Phase 4: Advanced Features & Analytics (Week 7-8)

_Priority: LOW | Estimated Effort: 15-20 hours_

### 4.1 Search Analytics

**Missing**: Search behavior tracking and insights
**Files**: `utils/analytics.ts` (new), `hooks/useSearchAnalytics.ts` (new)

**Features**:

- Track popular search terms
- Monitor search success rates
- Analyze filter usage patterns
- Performance metrics (search speed, results relevance)

**Tasks**:

- [ ] Design analytics data structure
- [ ] Implement search event tracking
- [ ] Create analytics dashboard (admin)
- [ ] Add performance monitoring
- [ ] Implement privacy-compliant tracking

### 4.2 Search Export & Sharing

**Missing**: Ability to save and share search results
**Files**: `utils/searchExport.ts` (new), `components/SearchShare.tsx` (new)

**Features**:

- Export search results to CSV/JSON
- Generate shareable search URLs with all filters
- Save search configurations as presets
- Email search results functionality

**Tasks**:

- [ ] Implement search state serialization
- [ ] Create export functionality
- [ ] Add sharing URL generation
- [ ] Design share/export UI components
- [ ] Add search preset management

### 4.3 Offline Search Capabilities

**Missing**: Basic offline functionality
**Files**: `utils/serviceWorker.ts`, `utils/offlineSearch.ts` (new)

**Features**:

- Cache recent search results
- Offline search history access
- Background sync for search updates
- Offline indicator and messaging

**Tasks**:

- [ ] Implement service worker for caching
- [ ] Create offline search storage
- [ ] Add offline detection logic
- [ ] Design offline UI states
- [ ] Implement background sync

### 4.4 Search Performance Optimization

**Missing**: Advanced performance features
**Files**: Multiple files across the search system

**Features**:

- Search result prefetching
- Optimistic UI updates
- Advanced caching strategies
- Search index optimization

**Tasks**:

- [ ] Implement result prefetching logic
- [ ] Add optimistic loading states
- [ ] Optimize cache invalidation strategies
- [ ] Add search performance monitoring
- [ ] Implement search result preloading

---

## Implementation Guidelines

### Code Standards

- **TypeScript**: Strict typing for all new components
- **Testing**: Unit tests for all hooks and utilities
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: Lighthouse score >90
- **Error Handling**: Comprehensive error boundaries

### File Organization

```
src/
├── components/search/
│   ├── SearchBar.tsx (existing, enhanced)
│   ├── SearchResults.tsx (existing, enhanced)
│   ├── SearchFilters.tsx (new)
│   ├── SearchTabs.tsx (new)
│   ├── SearchPreview.tsx (new)
│   ├── SearchHistory.tsx (new)
│   ├── VoiceSearch.tsx (new)
│   └── SearchShare.tsx (new)
├── hooks/search/
│   ├── useSearch.ts (existing, enhanced)
│   ├── useInfiniteScroll.ts (new)
│   ├── useVoiceSearch.ts (new)
│   └── useSearchAnalytics.ts (new)
├── utils/search/
│   ├── searchExport.ts (new)
│   ├── offlineSearch.ts (new)
│   └── analytics.ts (new)
└── pages/api/
    ├── search.ts (existing, rewritten)
    └── suggestions.ts (new)
```

### Testing Strategy

- **Unit Tests**: All hooks and utilities (Jest + React Testing Library)
- **Integration Tests**: Search flow end-to-end (Cypress)
- **Performance Tests**: Search speed and memory usage
- **Accessibility Tests**: Screen reader and keyboard navigation

### Success Metrics

- **Performance**: Search response time < 200ms
- **User Experience**: Task completion rate > 95%
- **Error Rate**: < 1% search failures
- **Accessibility**: WCAG 2.1 AA compliance
- **Mobile**: Touch-friendly interface, voice search adoption

---

## Risk Assessment

### High Risk

- **API Changes**: TMDB API modifications could break functionality
- **Browser Support**: Voice search limited to modern browsers
- **Performance**: Complex filtering could slow down searches

### Mitigation Strategies

- **API**: Implement API versioning and fallbacks
- **Browser Support**: Progressive enhancement for voice features
- **Performance**: Implement result streaming and virtualization

### Dependencies

- No new external dependencies required
- Uses existing React, Next.js, and Recoil stack
- Leverages browser APIs (Web Speech, Intersection Observer)

---

## Timeline Summary

| Phase     | Duration    | Features              | Effort     |
| --------- | ----------- | --------------------- | ---------- |
| Phase 1   | Week 1-2    | Critical bug fixes    | 16-20h     |
| Phase 2   | Week 3-4    | Core features         | 24-30h     |
| Phase 3   | Week 5-6    | UX enhancements       | 20-25h     |
| Phase 4   | Week 7-8    | Advanced features     | 15-20h     |
| **Total** | **8 weeks** | **Complete overhaul** | **75-95h** |

This plan provides a systematic approach to upgrading the search system while maintaining backward compatibility and ensuring a smooth user experience throughout the implementation process.

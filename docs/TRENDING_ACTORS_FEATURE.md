# Trending Actors Feature

## Overview

A new system recommendation row that displays trending actors from TMDB. Clicking an actor shows their filmography.

## Components

- `ActorCard.tsx` - Circular profile card
- `TrendingActorsRow.tsx` - Horizontal scrollable row
- `ActorContentModal.tsx` - Filmography modal on click

## API Routes

- `GET /api/people/trending` - Fetches trending actors (filtered to Acting)
- `GET /api/discover/by-actor?actorId={id}` - Searches content by actor

## Integration

- Added `'trending-actors'` to `SystemRecommendationId` type
- Added `TrendingPerson` interface to `typings.ts`
- Added `actorContentModal` state to `modalStore.ts`
- Integrated into `HomeClient.tsx` with other system rows

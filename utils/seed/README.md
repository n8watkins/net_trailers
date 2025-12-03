# Seed Data System - Demo Profiles with Interconnected Data

This directory contains utilities for seeding the NetTrailers app with realistic demo data, including multiple user profiles that interact with each other through rankings, comments, likes, and forum discussions.

## Quick Start

### Create Demo Profiles with Interconnected Data

```bash
# Create 3 demo profiles with default settings (2 rankings, 2 threads, 1 poll each)
npm run seed:demo-profiles

# Create 5 profiles with custom content counts
npx tsx scripts/seedDemoProfiles.ts --count=5 --rankings=3 --threads=2 --polls=1
```

### What Gets Created

When you run the demo profile seeder, it creates:

**Phase 1: Profile Creation**

- Multiple user profiles with unique names, avatars, and interests
- Each profile creates:
    - 2-3 rankings (customizable)
    - 2-3 forum discussion threads (customizable)
    - 1-2 polls (customizable)

**Phase 2: Cross-Profile Interactions**

- **Comments**: Each ranking receives 2-4 comments from other profiles
- **Replies**: 50% chance of ranking owner replying to comments
- **Likes**: Each ranking receives likes from 60-80% of other profiles
- **Realistic engagement**: Mix of short reactions and detailed discussions

## Available Demo Profiles

The system includes 5 pre-configured demo profiles with distinct personalities:

1. **Alex Chen** - Film enthusiast (Drama, Thriller, Mystery)
2. **Jordan Smith** - Sci-fi fanatic (Sci-Fi, Fantasy, Adventure)
3. **Sam Rivera** - Horror connoisseur (Horror, Thriller, Mystery)
4. **Taylor Kim** - Classic film aficionado (Drama, Romance, Comedy)
5. **Riley Park** - Anime and animation lover (Animation, Fantasy, Adventure)

## Command Line Options

```bash
npx tsx scripts/seedDemoProfiles.ts [options]

Options:
  --count=N        Number of profiles to create (default: 3, max: 5)
  --rankings=N     Rankings per profile (default: 2)
  --threads=N      Forum threads per profile (default: 2)
  --polls=N        Polls per profile (default: 1)
```

## Examples

### Minimal Setup (Quick Testing)

```bash
# 2 profiles, minimal content
npx tsx scripts/seedDemoProfiles.ts --count=2 --rankings=1 --threads=1 --polls=0
```

### Full Community Simulation

```bash
# All 5 profiles, maximum engagement
npx tsx scripts/seedDemoProfiles.ts --count=5 --rankings=3 --threads=3 --polls=2
```

### Rankings-Only Demo

```bash
# Focus on ranking interactions
npx tsx scripts/seedDemoProfiles.ts --count=4 --rankings=3 --threads=0 --polls=0
```

## Architecture

### File Structure

```
utils/seed/
├── README.md                    # This file
├── index.ts                     # Main exports and orchestration
├── seedProfiles.ts              # Profile creation and coordination
├── seedRankings.ts              # Ranking templates (29 categories)
├── seedRankingComments.ts       # Comment and like generation
├── seedForum.ts                 # Forum threads and polls
├── seedNotifications.ts         # Notification generation
├── seedCollections.ts           # Custom collection generation
├── seedWatchHistory.ts          # Watch history seeding
├── seedLiked.ts                 # Liked content seeding
├── seedHidden.ts                # Hidden content seeding
├── seedWatchLater.ts            # Watch later seeding
└── sampleContent.ts             # Movie and TV show data pool
```

### Two-Phase Seeding Process

#### Phase 1: Profile & Content Creation

1. Create user profile in Firestore
2. Generate rankings from templates
3. Create forum threads
4. Create polls
5. Update profile statistics

#### Phase 2: Cross-Profile Interactions

1. Load all rankings from all profiles
2. For each ranking:
    - Select 2-4 random commenters (excluding owner)
    - Generate mix of detailed comments (70%) and short reactions (30%)
    - 50% chance of owner replying to comments
    - Assign likes from 60-80% of other profiles

### Comment Template System

The system uses realistic comment templates with replies:

**Detailed Comments** (70%):

```typescript
{
  text: "Love this ranking! Your taste is impeccable...",
  type: "ranking" | "position",
  replies: [
    "Thanks! Yeah I went back and forth on the top 2...",
    "Appreciate it! What would you put at #1?"
  ]
}
```

**Short Reactions** (30%):

```typescript
'Great list! 🔥'
'100% agree with this'
'Excellent taste!'
```

## Viewing Demo Data

After seeding, you can:

1. **Browse Community Page**: See all public rankings from demo profiles
2. **View Profile Pages**: Visit `/users/[userId]` for any demo profile
3. **Read Comments**: Click into rankings to see conversations
4. **Check Forum**: See threads and polls from demo users
5. **Test Interactions**: Like, comment, or create your own content

## Demo Profile IDs

Demo profiles have IDs in the format:

```
demo_[name_slug]_[timestamp]_[random]

Example: demo_alex_chen_1701234567890_abc123
```

### Finding Demo Profiles

```typescript
import { getDemoProfileIds } from '@/utils/seed'

// Get all existing demo profile IDs
const demoIds = await getDemoProfileIds()
console.log('Demo profiles:', demoIds)
```

## Cleaning Up Demo Data

### Automated Deletion Script

Use the comprehensive delete script to remove all demo profiles and their associated data:

```bash
# Dry run (preview what will be deleted)
npm run delete:demo-profiles

# Actually delete the data (requires --confirm flag)
npm run delete:demo-profiles -- --confirm
```

The delete script removes:

- ✓ Demo user profiles (profiles collection)
- ✓ Demo user data (users collection + subcollections)
- ✓ Rankings created by demo users
- ✓ Ranking comments by demo users
- ✓ Ranking likes by demo users
- ✓ Forum threads created by demo users
- ✓ Thread replies by demo users
- ✓ Polls created by demo users
- ✓ Poll votes by demo users
- ✓ Watch history for demo users
- ✓ Collections created by demo users
- ✓ Notifications for demo users

### Manual Deletion (Advanced)

For manual cleanup or custom queries:

```typescript
import { db } from '@/firebase'
import { collection, query, where, getDocs, deleteDoc } from 'firebase/firestore'

// Query and delete demo profiles
const q = query(
    collection(db, 'profiles'),
    where('__name__', '>=', 'demo_'),
    where('__name__', '<', 'demo`')
)
const snapshot = await getDocs(q)
for (const doc of snapshot.docs) {
    await deleteDoc(doc.ref)
}
```

**Note**: Manual deletion may leave orphaned data in related collections. The automated script is recommended for complete cleanup.

## Extending the System

### Adding New Comment Templates

Edit `seedRankingComments.ts`:

```typescript
export const COMMENT_TEMPLATES: CommentTemplate[] = [
    {
        text: 'Your new comment template here',
        type: 'ranking',
        replies: ['Reply 1', 'Reply 2'],
    },
    // ... more templates
]
```

### Adding New Demo Profiles

Edit `seedProfiles.ts`:

```typescript
export const DEMO_PROFILES: DemoProfile[] = [
    {
        displayName: 'Your Name',
        description: 'Profile description',
        favoriteGenres: ['Action', 'Comedy'],
    },
    // ... more profiles
]
```

### Adding New Ranking Templates

Edit `seedRankings.ts`:

```typescript
const RANKING_TEMPLATES = [
  {
    title: 'Your Ranking Title',
    description: 'Description',
    movies: [movie1, movie2, ...],
    tvShows: [show1, show2, ...]
  },
  // ... more rankings
]
```

## Best Practices

1. **Start Small**: Test with 2-3 profiles before scaling up
2. **Monitor Firestore**: Check usage limits when creating many profiles
3. **Unique Data**: Each run creates new profiles with unique IDs
4. **Clean Up**: Remove old demo data periodically to avoid clutter
5. **Rate Limits**: The system includes delays to respect Firebase rate limits

## Troubleshooting

### "Authentication required" errors

- Demo profiles need Firebase Auth initialization
- Ensure your Firebase config is set up correctly

### Missing comments on rankings

- Comments are created in Phase 2 after all profiles exist
- Check console logs for Phase 2 execution

### Rankings not showing up

- Rankings are only created for authenticated users (not guests)
- Verify demo profile creation succeeded in Phase 1

### TypeScript errors

- Run `npm run type-check` to identify issues
- Ensure all imports from `@/utils/seed` are correct

## Performance Considerations

**Creation Time**:

- 1 profile: ~3-5 seconds
- 3 profiles: ~15-20 seconds
- 5 profiles with interactions: ~40-60 seconds

**Firestore Operations**:

- Each profile: ~10-15 writes
- Each ranking: ~5-8 writes
- Each comment: ~3-5 writes
- **Total for 5 profiles**: ~200-300 writes

**Rate Limiting**:

- System includes automatic delays (100-500ms between operations)
- Respects Firestore's rate limits
- Staggers operations to avoid throttling

## Integration with User Seeding

The demo profile system is separate from regular user seeding (`seedUserData`):

```typescript
// Seed your own user data
import { seedUserData } from '@/utils/seed'
await seedUserData(userId, {
    likedCount: 10,
    watchHistoryCount: 50,
    createCollections: true,
})

// Create demo profiles (separate system)
import { seedDemoProfiles } from '@/utils/seed'
await seedDemoProfiles({
    count: 3,
    rankingsPerProfile: 2,
})
```

## Future Enhancements

Potential additions to the seeding system:

- [ ] Thread replies between profiles
- [ ] Poll voting from demo profiles
- [ ] Collection sharing between profiles
- [ ] Notification system testing
- [ ] Follow/follower relationships
- [ ] Direct messaging simulation
- [ ] Trending content tracking
- [ ] User activity timelines

## Support

For questions or issues:

1. Check the main `CLAUDE.md` documentation
2. Review Firestore rules in `firestore.rules`
3. Examine store implementations in `stores/`
4. Look at component usage in `components/rankings/`

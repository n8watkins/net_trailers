# Current Firebase Data Structure (OLD SCHEMA)

## 🔍 What You See in Firebase Console Right Now

When you navigate to:

```
Firebase Console → Firestore Database → users/yk8OnMO8r8NgJipst8jclngjj3o1
```

You'll see this **OLD schema structure**:

```json
{
  "watchlist": [
    {
      "id": 550,
      "title": "Fight Club",
      "media_type": "movie",
      "release_date": "1999-10-15",
      "backdrop_path": "/path.jpg",
      "genre_ids": [18],
      "overview": "An insomniac office worker...",
      "popularity": 100,
      "poster_path": "/path.jpg",
      "vote_average": 8.4,
      "vote_count": 30000,
      "adult": false,
      "original_language": "en",
      "origin_country": ["US"]
    }
  ],

  "ratings": [
    {
      "contentId": 550,
      "rating": "liked",
      "timestamp": 1760142157988,
      "content": {
        "id": 550,
        "title": "Fight Club",
        ...full content object...
      }
    },
    {
      "contentId": 27205,
      "rating": "liked",
      "timestamp": 1760142158991,
      "content": {
        "id": 27205,
        "title": "Inception",
        ...full content object...
      }
    }
  ],

  "userLists": {
    "lists": [
      {
        "id": "list_1760142142420_v011t76qj",
        "name": "Watchlist",
        "description": "Movies and TV shows to watch later",
        "items": [],
        "isPublic": false,
        "createdAt": 1760142142420,
        "updatedAt": 1760142142420,
        "color": "#ef4444",
        "emoji": "📺"
      },
      {
        "id": "list_1760142142420_lodwz6fei",
        "name": "Liked",
        "description": "Content you've given a thumbs up",
        "items": [],
        "isPublic": false,
        "createdAt": 1760142142420,
        "updatedAt": 1760142142420,
        "color": "#10b981",
        "emoji": "👍"
      },
      {
        "id": "list_1760142142420_1oq50xd35",
        "name": "Not For Me",
        "description": "Content you've given a thumbs down",
        "items": [],
        "isPublic": false,
        "createdAt": 1760142142420,
        "updatedAt": 1760142142420,
        "color": "#6b7280",
        "emoji": "👎"
      },
      {
        "id": "list_1760142150952_e2srv0hk9",
        "name": "My Test Watchlist 📺",
        "description": "",
        "items": [
          {
            "id": 550,
            "title": "Fight Club",
            ...full content object...
          },
          {
            "id": 27205,
            "title": "Inception",
            ...full content object...
          }
        ],
        "isPublic": false,
        "createdAt": 1760142150952,
        "updatedAt": 1760142153961,
        "color": undefined,
        "emoji": undefined
      }
    ],
    "defaultListIds": {
      "watchlist": "list_1760142142420_v011t76qj",
      "liked": "list_1760142142420_lodwz6fei",
      "disliked": "list_1760142142420_1oq50xd35"
    }
  },

  "lastActive": 1760142158991
}
```

---

## ❌ Problems with OLD Schema

### 1. **Redundant Data**

- `ratings` array has liked/disliked content
- `userLists.lists` has "Liked" and "Not For Me" lists (duplicates ratings!)
- Main `watchlist` array duplicates the "Watchlist" list in `userLists`

### 2. **Confusing Structure**

- Three different places for essentially the same data
- Default lists are mixed with custom lists
- Hard to know which is the source of truth

### 3. **Inefficient**

- Stores full Content objects in multiple places
- Larger document size (~3.1KB for 2 movies)

---

## ✅ What NEW Schema Will Look Like (After Migration)

```json
{
  "likedMovies": [
    {
      "id": 550,
      "title": "Fight Club",
      ...content object...
    },
    {
      "id": 27205,
      "title": "Inception",
      ...content object...
    }
  ],

  "hiddenMovies": [],

  "defaultWatchlist": [
    {
      "id": 550,
      "title": "Fight Club",
      ...content object...
    }
  ],

  "userCreatedWatchlists": [
    {
      "id": "list_1760142150952_e2srv0hk9",
      "name": "My Test Watchlist 📺",
      "description": "",
      "items": [
        {
          "id": 550,
          "title": "Fight Club",
          ...content object...
        },
        {
          "id": 27205,
          "title": "Inception",
          ...content object...
        }
      ],
      "isPublic": false,
      "createdAt": 1760142150952,
      "updatedAt": 1760142153961
    }
  ],

  "lastActive": 1760142158991
}
```

---

## 🔄 Migration Mapping

**OLD → NEW:**

```
ratings (where rating === 'liked')          → likedMovies
ratings (where rating === 'disliked')       → hiddenMovies
watchlist                                   → defaultWatchlist
userLists.lists (custom only)               → userCreatedWatchlists
userLists.lists (defaults: 3 lists)         → REMOVED (redundant)
userLists.defaultListIds                    → REMOVED (not needed)
```

---

## 📊 Data Size Comparison

**OLD Schema:**

- Document size: ~3.1KB
- Contains: 1 watchlist + 2 ratings + 4 lists (3 default empty + 1 custom with 2 movies)
- Redundancy: Default lists are empty but still stored

**NEW Schema (estimated):**

- Document size: ~2.5KB (20% smaller)
- Contains: 2 liked + 0 hidden + 1 watchlist + 1 custom list
- No redundancy: Only actual data, no empty default lists

---

## 🧪 Test Commands

```bash
# Clear test user data
npm run test:clear-user

# Populate with OLD schema (current)
npm run test:user-watchlist

# View in Firebase Console
# Navigate to: Firestore Database → users/yk8OnMO8r8NgJipst8jclngjj3o1
```

**Test User Credentials:**

- Email: `test@nettrailer.dev`
- Password: `TestPassword123!`
- User ID: `yk8OnMO8r8NgJipst8jclngjj3o1`

---

## ⚠️ Important Note

**The tests currently create the OLD schema structure.**

After we implement the migration (updating type definitions, stores, services, hooks, and components), the tests will automatically use the NEW schema.

We need to:

1. Update all 27 files to use new schema
2. Test migration works correctly
3. Run migration script on all existing users
4. Then tests will populate the new clean structure

---

**Next Step:** Start implementing the new schema by updating TypeScript interfaces (Phase 1 of migration plan)

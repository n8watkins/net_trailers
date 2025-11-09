# Smart Row Builder - AI Enhancement Plans (Future Phase)

## 🎯 When to Add Gemini AI

**Phase 2 Enhancement** - After TMDB-only version is working and tested.

---

## 💡 Use Cases Where AI Would Help

### 1. Complex Natural Language Understanding

```
User: "mind-bending movies that make you think"
→ AI interprets: complex plots + philosophical themes + high ratings
→ TMDB alone: Just keyword match on "mind-bending"
```

### 2. Creative Row Naming

```
Entities: Sci-Fi + Nolan + High Ratings
→ AI: "Cerebral Sci-Fi Masterworks"
→ Template: "Nolan's High-Rated Sci-Fi Films" (functional but generic)
```

### 3. Contextual Contradictions

```
User: "Studio Ghibli but darker themes"
→ AI understands: Ghibli style BUT exclude family-friendly
→ TMDB: Just tags Studio Ghibli (misses the nuance)
```

### 4. Multi-Entity Reasoning

```
User tags: Tarantino + Scorsese + Cohen Brothers
→ AI: "These directors share gritty crime dramas with dark humor"
→ TMDB: Can analyze each separately, but not the combined pattern
```

---

## 🔧 Implementation Plan

### Endpoint: `/api/gemini/enhance-suggestions`

````typescript
// app/api/gemini/enhance-suggestions/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: NextRequest) {
    const { entities, rawText, mediaType, tmdbSuggestions } = await request.json()

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    const prompt = `
You are a movie/TV recommendation expert enhancing an existing recommendation system.

USER INPUT:
- Raw text: "${rawText}"
- Tagged entities: ${JSON.stringify(entities)}
- Media type: ${mediaType}

EXISTING TMDB-BASED SUGGESTIONS:
${JSON.stringify(tmdbSuggestions, null, 2)}

TASK:
Enhance these suggestions with context-aware reasoning:
1. Interpret the raw text for themes, tone, style preferences
2. Find patterns across multiple tagged entities
3. Suggest 1-3 CREATIVE row names that capture the essence
4. Provide a one-sentence insight about what makes these picks special

Return JSON:
{
  "enhancedSuggestions": [
    {
      "type": "genre" | "rating" | "theme" | "tone",
      "value": any,
      "confidence": 0-100,
      "reason": "why this makes sense given the context"
    }
  ],
  "creativeRowNames": ["name1", "name2", "name3"],
  "insight": "one sentence capturing the pattern"
}
`

    try {
        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/)
        const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text

        const enhancement = JSON.parse(jsonStr)

        return NextResponse.json(enhancement)
    } catch (error) {
        console.error('Gemini enhancement error:', error)
        return NextResponse.json({ error: 'AI enhancement failed' }, { status: 500 })
    }
}
````

---

## 🎨 UI Integration

### Optional Enhancement Button

```typescript
export function SmartStep2Suggestions({ ... }) {
  const [tmdbSuggestions, setTmdbSuggestions] = useState([])
  const [aiEnhanced, setAiEnhanced] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)

  // Always show TMDB suggestions instantly
  useEffect(() => {
    const instant = generateTMDBSuggestions(inputData)
    setTmdbSuggestions(instant)
  }, [])

  // Optional: Enhance with AI
  const handleEnhanceWithAI = async () => {
    setIsEnhancing(true)
    try {
      const response = await fetch('/api/gemini/enhance-suggestions', {
        method: 'POST',
        body: JSON.stringify({
          entities: inputData.entities,
          rawText: inputData.rawText,
          mediaType: inputData.mediaType,
          tmdbSuggestions
        }),
        signal: AbortSignal.timeout(10000)
      })

      if (response.ok) {
        const enhanced = await response.json()
        setTmdbSuggestions([...tmdbSuggestions, ...enhanced.enhancedSuggestions])
        setAiEnhanced(true)
      }
    } finally {
      setIsEnhancing(false)
    }
  }

  return (
    <div>
      {/* TMDB suggestions display */}

      {/* Optional AI enhancement */}
      {!aiEnhanced && (
        <button
          onClick={handleEnhanceWithAI}
          disabled={isEnhancing}
          className="w-full mt-4 px-4 py-3 bg-purple-600/20 border border-purple-500/30 text-purple-400 rounded-lg hover:bg-purple-600/30"
        >
          ✨ {isEnhancing ? 'Enhancing with AI...' : 'Enhance with AI (Premium)'}
        </button>
      )}
    </div>
  )
}
```

---

## 💰 Cost Management

### Rate Limiting Strategy

```typescript
// Limit AI enhancements per user
const aiEnhancementLimits = {
    guest: 0, // No AI for guests
    authenticated: 3, // 3 free enhancements per day
    premium: 999, // Unlimited for premium users
}

// Track usage in session store
export function checkAIQuota(userId: string, sessionType: string) {
    const today = new Date().toISOString().split('T')[0]
    const key = `ai_usage:${userId}:${today}`

    const usage = getFromCache(key) || 0
    const limit = aiEnhancementLimits[sessionType] || 0

    return usage < limit
}
```

---

## 📊 A/B Testing

### Test if AI Actually Improves Results

```typescript
// Track which suggestions users accept
export function trackSuggestionAcceptance(suggestion: Suggestion, source: 'tmdb' | 'ai') {
    analytics.track('suggestion_accepted', {
        source,
        type: suggestion.type,
        confidence: suggestion.confidence,
    })
}

// Compare metrics:
// - Acceptance rate (TMDB vs AI suggestions)
// - Time to complete (with vs without AI)
// - User satisfaction (ratings/feedback)
```

---

## 🎯 Success Metrics for AI

| Metric               | Target               |
| -------------------- | -------------------- |
| AI acceptance rate   | >30% (vs TMDB-only)  |
| Creative name usage  | >50% choose AI names |
| Completion time      | Not >10% slower      |
| Cost per enhancement | <$0.002              |
| Error rate           | <5%                  |

---

## 🚀 Rollout Plan

### Phase 1: TMDB-Only (Current)

- Build and launch with TMDB suggestions
- Template-based row names
- Collect baseline metrics

### Phase 2: AI Beta

- Add "✨ Enhance with AI" button
- Limit to authenticated users
- A/B test 20% of users

### Phase 3: AI Integration (If Successful)

- Auto-enhance for premium users
- Keep optional for free users
- Monitor costs and adjust limits

---

## 🔮 Future AI Features

### 1. Collaborative Filtering

```
"Users who created this row also created:"
→ AI finds patterns in user behavior
```

### 2. Trend Detection

```
"Rising genres this month: Dystopian Sci-Fi"
→ AI analyzes recent row creations
```

### 3. Personal Recommendations

```
Based on your viewing history + custom rows
→ AI suggests row ideas personalized to you
```

---

## 📝 Notes

- **Don't block on AI**: TMDB version should be fully functional
- **Cost awareness**: Each Gemini call ~$0.001-0.002
- **Fallback always**: Never fail if AI is down
- **Measure ROI**: Only keep if it improves user satisfaction

---

**Status**: 📋 Documented for future implementation
**Priority**: Low (after TMDB version is stable)
**Dependencies**: Gemini API key, usage tracking, A/B test framework

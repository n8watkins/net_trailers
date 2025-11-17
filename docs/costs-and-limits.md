# Notification Costs & Account Limits - Complete Breakdown

## 📊 Notification Costs Breakdown

### Firestore Pricing (as of 2024)

```
Reads:     $0.06 per 100,000 reads
Writes:    $0.18 per 100,000 writes
Deletes:   $0.02 per 100,000 deletes
Storage:   $0.18 per GB/month

Free Tier (per day):
- 50,000 reads
- 20,000 writes
- 20,000 deletes
- 1 GB storage
```

### Cost Calculation: Trending Notifications

#### Scenario 1: 10 Users (Your Current Case)

**Daily Cron Job Operations:**

```
1. Read trending snapshots:        2 reads   (movies + TV)
2. Write trending snapshots:        2 writes  (update movies + TV)
3. Fetch TMDB trending:             0 cost    (external API)
4. Compare snapshots:               0 cost    (computation only)
5. Create notifications (3 new items × 10 users):
   - Write notifications:          30 writes
   - Total per day:                30 writes
6. User reads notifications:       30 reads  (assume each user checks once)
7. Mark as read:                   30 writes (when users click)
8. Cleanup old notifications:      ~10 deletes (30-day expiration)
```

**Monthly Totals (30 days):**

```
Reads:    60 + 900 =     960 reads      ($0.00 - well within free tier)
Writes:   60 + 900 + 900 = 1,860 writes ($0.00 - well within free tier)
Deletes:  300 deletes                   ($0.00 - well within free tier)

TOTAL COST: $0.00/month (completely free)
```

#### Scenario 2: 100 Users

**Monthly Totals (30 days):**

```
Reads:    60 + 9,000 =    9,060 reads   ($0.00 - free tier)
Writes:   60 + 9,000 + 9,000 = 18,060 writes ($0.00 - free tier)
Deletes:  3,000 deletes                 ($0.00 - free tier)

TOTAL COST: $0.00/month (completely free)
```

#### Scenario 3: 1,000 Users (Beyond Portfolio Scale)

**Monthly Totals (30 days):**

```
Reads:    60 + 90,000 =    90,060 reads   ($0.05)
Writes:   60 + 90,000 + 90,000 = 180,060 writes ($0.32)
Deletes:  30,000 deletes                 ($0.01)

TOTAL COST: $0.38/month
```

#### Scenario 4: 10,000 Users (Worst Case)

**Monthly Totals (30 days):**

```
Reads:    60 + 900,000 =    900,060 reads   ($0.54)
Writes:   60 + 900,000 + 900,000 = 1,800,060 writes ($3.24)
Deletes:  300,000 deletes                 ($0.06)

TOTAL COST: $3.84/month
```

### Cost Breakdown: All Notification Types

**Per User Per Month:**

```
Notification Type    | Frequency | Reads | Writes | Cost (per user)
---------------------|-----------|-------|--------|----------------
Trending Updates     | Daily (3) | 90    | 180    | $0.0004
New Releases         | Weekly    | 12    | 24     | $0.0001
Share Activity       | Occasional| 5     | 10     | $0.00003
Collection Updates   | Weekly    | 12    | 24     | $0.0001

TOTAL PER USER/MONTH: ~$0.0006 (less than a penny)
```

**For 10 Users:**

```
TOTAL: $0.006/month (still within free tier)
```

**For 100 Users:**

```
TOTAL: $0.06/month (still within free tier)
```

### Other Firebase Costs

**Firebase Auth:**

- FREE for email/password and Google OAuth
- No cost per user
- Unlimited authentications

**Firebase Storage (if using for avatars):**

- FREE for first 5 GB
- $0.026/GB after that
- 10 users × 100KB avatars = 1 MB (essentially free)

**Cloud Functions (if added later):**

- FREE for first 2M invocations/month
- $0.40 per million invocations after

### TMDB API Costs

```
FREE TIER:
- 40 requests/second
- No daily/monthly limits
- No cost

Your usage:
- Trending cron: 2 requests/day
- User searches: ~100 requests/day (estimated)
- TOTAL: Well within free tier
```

## 🔒 Account Limits & Anti-Abuse Measures

### Current Risk: Malicious Account Creation

**Without limits, a bad actor could:**

1. Create 10,000+ accounts programmatically
2. Trigger notification writes for all accounts
3. Exceed Firestore free tier → incur charges
4. Fill your database with junk data

### Solution 1: Hard-Coded Account Limit (Recommended)

#### Implementation

**1. Create `utils/accountLimits.ts`:**

```typescript
/**
 * Account Limits Configuration
 *
 * IMPORTANT: For portfolio projects, hard-code maximum accounts
 * to prevent unexpected Firestore charges from abuse.
 */

export const ACCOUNT_LIMITS = {
    /** Maximum total accounts allowed (across all time) */
    MAX_TOTAL_ACCOUNTS: 50,

    /** Maximum accounts per IP address (24-hour window) */
    MAX_ACCOUNTS_PER_IP: 3,

    /** Maximum accounts per email domain (prevent @tempmail.com abuse) */
    MAX_ACCOUNTS_PER_DOMAIN: 5,

    /** Cooldown period between account creations (seconds) */
    ACCOUNT_CREATION_COOLDOWN: 300, // 5 minutes
} as const

/**
 * Check if account creation is allowed
 */
export async function canCreateAccount(
    ipAddress?: string,
    email?: string
): Promise<{ allowed: boolean; reason?: string }> {
    // Check total account limit
    const totalAccounts = await getTotalAccountCount()

    if (totalAccounts >= ACCOUNT_LIMITS.MAX_TOTAL_ACCOUNTS) {
        return {
            allowed: false,
            reason: `Account limit reached. This is a portfolio project with a maximum of ${ACCOUNT_LIMITS.MAX_TOTAL_ACCOUNTS} accounts. Please contact the developer if you need access.`,
        }
    }

    // Check IP-based limit
    if (ipAddress) {
        const accountsFromIP = await getAccountCountByIP(ipAddress)
        if (accountsFromIP >= ACCOUNT_LIMITS.MAX_ACCOUNTS_PER_IP) {
            return {
                allowed: false,
                reason: 'Too many accounts created from this location. Please try again in 24 hours.',
            }
        }
    }

    // Check email domain limit
    if (email) {
        const domain = email.split('@')[1]
        const accountsFromDomain = await getAccountCountByDomain(domain)
        if (accountsFromDomain >= ACCOUNT_LIMITS.MAX_ACCOUNTS_PER_DOMAIN) {
            return {
                allowed: false,
                reason: 'Too many accounts created with this email domain.',
            }
        }
    }

    return { allowed: true }
}
```

**2. Create Firestore collection for tracking:**

```typescript
// /accountCreationLog/{logId}
interface AccountCreationLog {
    userId: string
    ipAddress: string
    emailDomain: string
    createdAt: number
    userAgent: string
}
```

**3. Update signup flow:**

```typescript
// In your signup API route or auth component
async function handleSignup(email: string, password: string) {
    // Get user's IP address
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')

    // Check if account creation is allowed
    const check = await canCreateAccount(ipAddress, email)

    if (!check.allowed) {
        throw new Error(check.reason)
    }

    // Proceed with Firebase Auth signup
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)

    // Log the account creation
    await logAccountCreation(userCredential.user.uid, ipAddress, email)

    return userCredential
}
```

**4. Add Firestore security rules:**

```javascript
// firestore.rules
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Account creation logs (server-side only)
    match /accountCreationLog/{logId} {
      allow read: if false;
      allow write: if false; // Only via Admin SDK
    }

    // System-level account stats
    match /system/accountStats {
      allow read: if true; // Public read to show "X/50 accounts used"
      allow write: if false;
    }
  }
}
```

### Solution 2: IP-Based Rate Limiting

**Using Vercel Edge Config (Free):**

```typescript
// middleware.ts
import { next } from '@vercel/edge'
import { ipAddress } from '@vercel/edge'

export const config = {
    matcher: '/api/auth/signup',
}

const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000 // 24 hours
const MAX_SIGNUPS_PER_IP = 3

export async function middleware(request: Request) {
    const ip = ipAddress(request) || 'unknown'

    // Check rate limit (use Vercel KV or Edge Config)
    const signupCount = await getSignupCountForIP(ip)

    if (signupCount >= MAX_SIGNUPS_PER_IP) {
        return new Response(
            JSON.stringify({
                error: 'Rate limit exceeded. Too many signup attempts from this IP.',
            }),
            { status: 429 }
        )
    }

    return next()
}
```

### Solution 3: Display Account Usage (User-Facing)

**Show on signup page:**

```typescript
// components/auth/SignupModal.tsx
function SignupModal() {
  const [accountStats, setAccountStats] = useState<{
    used: number
    max: number
  }>()

  useEffect(() => {
    // Fetch public account stats
    fetch('/api/account-stats')
      .then(res => res.json())
      .then(setAccountStats)
  }, [])

  return (
    <div>
      <h2>Create Account</h2>

      {accountStats && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">
            📊 Portfolio Project Limit: {accountStats.used}/{accountStats.max} accounts used
          </p>
          {accountStats.used >= accountStats.max - 5 && (
            <p className="text-xs text-blue-600 mt-1">
              This is a demo project with limited capacity. Spots are filling up!
            </p>
          )}
        </div>
      )}

      {/* Signup form */}
    </div>
  )
}
```

### Solution 4: Firebase Security Rules (Additional Safety)

```javascript
// firestore.rules - Prevent notification spam
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // User notifications
    match /users/{userId}/notifications/{notificationId} {
      // Users can read their own notifications
      allow read: if request.auth != null && request.auth.uid == userId;

      // Only server can create notifications (via Admin SDK)
      // This prevents users from spamming their own notifications
      allow create: if false;

      // Users can mark as read or delete their notifications
      allow update, delete: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🛡️ Recommended Implementation for Portfolio

### Package: Complete Anti-Abuse Setup

**1. Hard Account Limit: 50 accounts**

```typescript
// .env.local
MAX_TOTAL_ACCOUNTS = 50
MAX_ACCOUNTS_PER_IP = 3
```

**2. Display Usage on Homepage:**

```tsx
<footer>
    <p>Demo Project: {accountsUsed}/50 spots available</p>
</footer>
```

**3. Grace Period Warning:**

```typescript
// When 45/50 accounts reached
if (accountStats.used >= 45) {
  showAdminNotification(
    "⚠️ Account limit approaching! 45/50 accounts used. " +
    "Consider closing signups soon."
  )
}

// Auto-close signups at limit
if (accountStats.used >= 50) {
  return (
    <div>
      <h2>Signups Closed</h2>
      <p>This portfolio project has reached its account limit.</p>
      <p>Please contact me if you'd like a demo account.</p>
    </div>
  )
}
```

**4. Monitoring Dashboard:**

```typescript
// /admin page (protected by your auth)
function AdminDashboard() {
  return (
    <div>
      <h1>Portfolio Stats</h1>
      <dl>
        <dt>Total Accounts</dt>
        <dd>{accountStats.used} / 50</dd>

        <dt>Firestore Reads (Today)</dt>
        <dd>{firestoreStats.reads} / 50,000 free</dd>

        <dt>Firestore Writes (Today)</dt>
        <dd>{firestoreStats.writes} / 20,000 free</dd>

        <dt>Estimated Monthly Cost</dt>
        <dd>${estimatedCost.toFixed(2)}</dd>
      </dl>
    </div>
  )
}
```

## 💰 Final Cost Summary

### For Your Portfolio (10 active users):

```
Firebase Auth:             $0.00 (free tier)
Firestore Operations:      $0.00 (well within 50K reads, 20K writes/day)
Firestore Storage:         $0.00 (< 1 GB)
TMDB API:                  $0.00 (free tier)
Vercel Hosting:            $0.00 (hobby plan)
Domain (if custom):        $12/year

TOTAL: $0-1/month (essentially free for portfolio scale)
```

### With 50 Accounts (Max Limit):

```
Firestore Operations:      $0.00 (still within free tier)
All other services:        $0.00

TOTAL: Still $0/month
```

### Firestore Free Tier Is VERY Generous:

```
Daily Limits:
- 50,000 reads   = ~1,666 reads per user (50 users)
- 20,000 writes  = ~666 writes per user (50 users)

Your actual usage per user/day:
- Reads:  ~10 (notifications, collections, rankings)
- Writes: ~5 (interactions, updates)

MARGIN: You're using <1% of free tier even with 50 users
```

## 🚨 When You WOULD Get Charged

**Scenario 1: Bot Attack (No Limits)**

- Bot creates 10,000 accounts
- Each account gets 3 trending notifications/day
- 10,000 × 3 × 30 = 900,000 writes/month
- Cost: ~$1.62/month

**Scenario 2: Viral Traffic (Unlikely for Portfolio)**

- 1,000 real users sign up
- Normal usage
- Cost: ~$0.38/month (see calculation above)

**Scenario 3: Bug in Notification Logic**

- Infinite loop creating notifications
- Could hit 1M writes before you notice
- Cost: ~$1.80 one-time

## ✅ Action Items

**High Priority (Prevent Abuse):**

1. ✅ Implement hard account limit (50 accounts)
2. ✅ Add IP-based rate limiting (3 signups per IP per day)
3. ✅ Add Firestore security rules (prevent client-side writes to notifications)
4. ✅ Display account usage on signup page

**Medium Priority (Monitoring):**

1. Set up Firebase budget alerts ($5 threshold)
2. Create admin dashboard to monitor usage
3. Set up email alerts when approaching limits

**Low Priority (Nice to Have):**

1. Email domain blocking for temporary email services
2. CAPTCHA on signup form
3. Phone verification (costs $0.06 per verification via Twilio)

## 📧 Firebase Budget Alerts Setup

**In Firebase Console:**

1. Go to Firebase Console → Project Settings → Usage and Billing
2. Click "Set budget alerts"
3. Set alert at $1.00 (way before you'd ever hit this with 50 users)
4. Add your email
5. You'll be notified immediately if costs increase

**Result:** You'll know about abuse BEFORE it costs you money.

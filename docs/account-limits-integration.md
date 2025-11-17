# Account Limits Integration Guide

## Overview

This guide shows how to integrate the account limiting system into your existing authentication flow to prevent abuse and unexpected costs.

## Files Created

- ✅ `utils/accountLimits.ts` - Core limiting logic
- ✅ `app/api/account-stats/route.ts` - Public stats endpoint
- ⏭️ Need to integrate into: `components/auth/SignupModal.tsx` (or wherever signup happens)
- ⏭️ Need to add: Firestore security rules
- ⏭️ Need to add: Environment variables

## Step 1: Add Environment Variables

### `.env.local`

```bash
# Account Limits (Portfolio Protection)
NEXT_PUBLIC_MAX_TOTAL_ACCOUNTS=50  # Adjust based on your comfort level

# Existing variables...
NEXT_PUBLIC_FIREBASE_API_KEY=...
# etc.
```

### Production (Vercel)

Add the same variable in Vercel Dashboard → Settings → Environment Variables

## Step 2: Update Firestore Security Rules

Add these rules to `firestore.rules`:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // ... existing rules ...

    // Account creation logs (read-only for clients, write-only via server)
    match /accountCreationLog/{logId} {
      // Allow reads for account stats aggregation (used by /api/account-stats)
      allow read: if true;

      // Only allow writes via Firebase Admin SDK (server-side)
      // This prevents users from manipulating the logs
      allow create, update, delete: if false;
    }

    // Existing rules continue below...
  }
}
```

Deploy rules:

```bash
firebase deploy --only firestore:rules
```

## Step 3: Get User's IP Address

Create helper to extract IP from request headers:

### `utils/getClientIP.ts`

```typescript
/**
 * Extract client IP address from request headers
 * Works with Vercel deployment and local development
 */
export function getClientIP(request: Request): string | null {
    // Try Vercel headers first
    const forwardedFor = request.headers.get('x-forwarded-for')
    if (forwardedFor) {
        // x-forwarded-for can be a comma-separated list, take first IP
        return forwardedFor.split(',')[0].trim()
    }

    // Try other common headers
    const realIP = request.headers.get('x-real-ip')
    if (realIP) {
        return realIP
    }

    // Fallback for local development
    const remoteAddr = request.headers.get('x-vercel-forwarded-for')
    if (remoteAddr) {
        return remoteAddr
    }

    // If all else fails, return null (will skip IP-based limiting)
    return null
}
```

## Step 4: Integration Options

You have two options for where to enforce the limit:

### Option A: Client-Side Check (Faster UX, Less Secure)

**In `components/auth/SignupModal.tsx` (or your signup component):**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { canCreateAccount, isEmailDomainBlocked, ACCOUNT_LIMITS } from '@/utils/accountLimits'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/firebase'

export function SignupModal() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [accountStats, setAccountStats] = useState<{
        used: number
        max: number
        percentUsed: number
    } | null>(null)

    // Fetch account stats on mount
    useEffect(() => {
        fetch('/api/account-stats')
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    setAccountStats(data.stats)
                }
            })
            .catch(console.error)
    }, [])

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        try {
            // 1. Check for blocked email domains
            if (isEmailDomainBlocked(email)) {
                throw new Error(
                    'Temporary email addresses are not allowed. Please use a permanent email.'
                )
            }

            // 2. Check account limits (client-side)
            // Note: We can't get IP on client-side, so skip IP check here
            // IP check will happen server-side in the API route
            const check = await canCreateAccount(null, email)

            if (!check.allowed) {
                throw new Error(check.reason || 'Account creation not allowed')
            }

            // 3. Create Firebase Auth account
            const userCredential = await createUserWithEmailAndPassword(auth, email, password)

            // 4. Log account creation (via API route to get IP address)
            await fetch('/api/auth/log-account-creation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userCredential.user.uid,
                    email: email,
                }),
            })

            // 5. Success - redirect or show success message
            console.log('Account created successfully!')
        } catch (err: any) {
            setError(err.message || 'Failed to create account')
        } finally {
            setLoading(false)
        }
    }

    // Show "signups closed" if at limit
    if (accountStats && accountStats.used >= accountStats.max) {
        return (
            <div className="p-6 text-center">
                <h2 className="text-2xl font-bold mb-4">Signups Closed</h2>
                <p className="text-gray-600 mb-4">
                    This portfolio project has reached its account limit ({accountStats.max}{' '}
                    accounts).
                </p>
                <p className="text-sm text-gray-500">
                    Please contact the developer if you need a demo account.
                </p>
            </div>
        )
    }

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Create Account</h2>

            {/* Account usage indicator */}
            {accountStats && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-800">
                            Portfolio Demo Accounts
                        </span>
                        <span className="text-sm text-blue-600">
                            {accountStats.used}/{accountStats.max} used
                        </span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${accountStats.percentUsed}%` }}
                        />
                    </div>
                    {accountStats.percentUsed >= 80 && (
                        <p className="text-xs text-blue-600 mt-2">
                            ⚠️ Spots filling up fast! Grab yours before they're gone.
                        </p>
                    )}
                </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-3 py-2 border rounded"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full px-3 py-2 border rounded"
                    />
                </div>

                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? 'Creating Account...' : 'Sign Up'}
                </button>
            </form>

            <p className="mt-4 text-xs text-gray-500 text-center">
                This is a portfolio demo with limited accounts. Your data may be reset
                periodically.
            </p>
        </div>
    )
}
```

### Option B: Server-Side Check (More Secure, Recommended)

Create an API route to handle signup with IP checking:

### `app/api/auth/signup/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { canCreateAccount, logAccountCreation, isEmailDomainBlocked } from '@/utils/accountLimits'
import { getClientIP } from '@/utils/getClientIP'
import { auth } from '@/lib/firebaseAdmin' // Firebase Admin SDK

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json()

        // Validate input
        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
        }

        // Check blocked domains
        if (isEmailDomainBlocked(email)) {
            return NextResponse.json(
                { error: 'Temporary email addresses are not allowed' },
                { status: 400 }
            )
        }

        // Get user's IP address
        const ipAddress = getClientIP(request)

        // Check account limits (server-side, includes IP check)
        const check = await canCreateAccount(ipAddress, email)

        if (!check.allowed) {
            return NextResponse.json({ error: check.reason }, { status: 429 })
        }

        // Create Firebase Auth user (via Admin SDK)
        const userRecord = await auth.createUser({
            email,
            password,
            emailVerified: false,
        })

        // Log account creation
        const userAgent = request.headers.get('user-agent') || undefined
        await logAccountCreation(userRecord.uid, ipAddress, email, userAgent)

        // Return success
        return NextResponse.json({
            success: true,
            userId: userRecord.uid,
            stats: check.stats,
        })
    } catch (error: any) {
        console.error('Signup error:', error)

        // Handle Firebase Auth errors
        if (error.code === 'auth/email-already-exists') {
            return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
        }

        if (error.code === 'auth/invalid-email') {
            return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
        }

        if (error.code === 'auth/weak-password') {
            return NextResponse.json(
                { error: 'Password should be at least 6 characters' },
                { status: 400 }
            )
        }

        return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
    }
}
```

**Then update your client component to use this API:**

```typescript
const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        })

        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.error || 'Signup failed')
        }

        // Success! Sign in the user
        await signInWithEmailAndPassword(auth, email, password)
    } catch (err: any) {
        setError(err.message)
    } finally {
        setLoading(false)
    }
}
```

## Step 5: Add Account Stats to Footer (Optional)

Show account availability site-wide:

### `components/layout/Footer.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'

export function Footer() {
    const [accountStats, setAccountStats] = useState<{
        used: number
        max: number
    } | null>(null)

    useEffect(() => {
        fetch('/api/account-stats')
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    setAccountStats(data.stats)
                }
            })
            .catch(console.error)
    }, [])

    return (
        <footer className="border-t py-6 text-center text-sm text-gray-600">
            <p>NetTrailers - A Portfolio Project by [Your Name]</p>
            {accountStats && (
                <p className="mt-1 text-xs text-gray-500">
                    Demo accounts: {accountStats.used}/{accountStats.max} used
                    {accountStats.used >= accountStats.max && ' (Signups closed)'}
                </p>
            )}
        </footer>
    )
}
```

## Step 6: Monitor Usage (Admin Dashboard)

Create an admin page to monitor account limits:

### `app/admin/page.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { redirect } from 'next/navigation'

// TODO: Replace with your actual admin user ID
const ADMIN_USER_ID = 'your-firebase-uid-here'

export default function AdminDashboard() {
    const userId = useAuthStore((state) => state.userId)
    const [stats, setStats] = useState<any>(null)

    // Protect route
    if (userId !== ADMIN_USER_ID) {
        redirect('/')
    }

    useEffect(() => {
        fetch('/api/account-stats')
            .then((res) => res.json())
            .then((data) => setStats(data.stats))
            .catch(console.error)
    }, [])

    if (!stats) return <div>Loading...</div>

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-white border rounded shadow">
                    <h3 className="text-sm font-medium text-gray-600">Total Accounts</h3>
                    <p className="text-3xl font-bold">
                        {stats.used}/{stats.max}
                    </p>
                </div>

                <div className="p-4 bg-white border rounded shadow">
                    <h3 className="text-sm font-medium text-gray-600">Available Slots</h3>
                    <p className="text-3xl font-bold">{stats.available}</p>
                </div>

                <div className="p-4 bg-white border rounded shadow">
                    <h3 className="text-sm font-medium text-gray-600">Usage</h3>
                    <p className="text-3xl font-bold">{stats.percentUsed}%</p>
                </div>

                <div className="p-4 bg-white border rounded shadow">
                    <h3 className="text-sm font-medium text-gray-600">Status</h3>
                    <p className="text-xl font-bold">
                        {stats.percentUsed >= 100
                            ? '🔴 Full'
                            : stats.percentUsed >= 80
                              ? '🟡 Filling Up'
                              : '🟢 Open'}
                    </p>
                </div>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <h3 className="font-medium mb-2">⚠️ Important Notes</h3>
                <ul className="text-sm space-y-1 text-gray-700">
                    <li>• Account limit prevents unexpected Firebase charges</li>
                    <li>
                        • When at capacity, new signups will see "Signups Closed" message
                    </li>
                    <li>• IP rate limiting: 3 accounts per IP per 24 hours</li>
                    <li>• Domain rate limiting: 5 accounts per email domain per 7 days</li>
                </ul>
            </div>
        </div>
    )
}
```

## Summary

**Implementation Checklist:**

- ✅ Created `utils/accountLimits.ts`
- ✅ Created `app/api/account-stats/route.ts`
- ⏭️ Add `NEXT_PUBLIC_MAX_TOTAL_ACCOUNTS=50` to `.env.local`
- ⏭️ Update Firestore security rules
- ⏭️ Deploy Firestore rules: `firebase deploy --only firestore:rules`
- ⏭️ Integrate into signup flow (Option A or B)
- ⏭️ Add account stats display to signup modal
- ⏭️ (Optional) Add stats to footer
- ⏭️ (Optional) Create admin dashboard

**Expected Outcome:**

1. Signups automatically stop at 50 accounts
2. Users see account availability before signing up
3. IP-based rate limiting prevents bot attacks
4. You're protected from unexpected Firestore charges
5. Still completely free for up to ~100 users (within Firestore free tier)

**Testing:**

```bash
# Test account stats endpoint
curl http://localhost:3000/api/account-stats

# Expected response:
{
  "success": true,
  "stats": {
    "used": 5,
    "max": 50,
    "available": 45,
    "percentUsed": 10
  }
}
```

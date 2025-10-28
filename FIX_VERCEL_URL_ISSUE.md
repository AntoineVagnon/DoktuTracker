# Fix Vercel URL Issue - Password Reset & Email Links

## Problem
Password reset and email links are pointing to `https://doktu-tracker.vercel.app/` instead of your custom domain `https://doktu.co`

## Root Cause Analysis

### Two Separate Issues

#### 1. **Supabase Auth Links** (Password Reset, Email Verification)
- **Controlled by**: Supabase Auth Settings
- **Status**: ✅ You already configured this in Supabase:
  - Site URL: `https://doktu.co`
  - Redirect URLs: `https://doktu.co/**`
- **Action Needed**: Make sure you clicked **"Save changes"** button

#### 2. **Backend Notification Links** (Appointment confirmations, reminders)
- **Controlled by**: Railway `CLIENT_URL` environment variable
- **Status**: ✅ You already added `CLIENT_URL=https://doktu.co` in Railway

### But There's a THIRD Issue!

#### 3. **Frontend-Generated Links** (Forms, booking flows, etc.)
- **Controlled by**: Vercel `VITE_APP_URL` environment variable
- **Current Value**: `https://doktu-tracker.vercel.app` ❌
- **Should Be**: `https://doktu.co` ✅

## Solution: Update Vercel Environment Variables

### Step 1: Go to Vercel Dashboard

1. Open: https://vercel.com/dashboard
2. Select your **DoktuTracker** project
3. Click on **"Settings"** tab
4. Click on **"Environment Variables"** in the left sidebar

### Step 2: Find and Update VITE_APP_URL

Look for the variable named `VITE_APP_URL`:

**Current Value:**
```
https://doktu-tracker.vercel.app
```

**New Value:**
```
https://doktu.co
```

### Step 3: Redeploy

After updating the environment variable, you need to trigger a new deployment:

1. Go to the **"Deployments"** tab
2. Find the latest deployment
3. Click the **⋮** (three dots) menu
4. Click **"Redeploy"**
5. Check **"Use existing build cache"** (optional, faster)
6. Click **"Redeploy"**

**OR** simply push a new commit to trigger auto-deployment.

## How to Verify in Vercel

### Check Current Environment Variables

In Vercel Dashboard → Settings → Environment Variables, you should see:

| Name | Value | Environment |
|------|-------|-------------|
| `VITE_APP_URL` | `https://doktu.co` | Production |
| `VITE_API_URL` | `https://web-production-b2ce.up.railway.app` | Production |
| `VITE_SUPABASE_URL` | `https://hzmrkvooqjbxptqjqxii.supabase.co` | Production |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` | Production |

## Summary of All Environment Variables

### Railway (Backend)
```bash
CLIENT_URL=https://doktu.co
SUPABASE_URL=https://hzmrkvooqjbxptqjqxii.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
MAILGUN_API_KEY=...
# ... other backend env vars
```

### Vercel (Frontend)
```bash
VITE_APP_URL=https://doktu.co  # ← CHANGE THIS!
VITE_API_URL=https://web-production-b2ce.up.railway.app
VITE_SUPABASE_URL=https://hzmrkvooqjbxptqjqxii.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Supabase Auth Settings
```
Site URL: https://doktu.co
Redirect URLs: https://doktu.co/**
```

## After Fixing

Test the following scenarios:

1. **Password Reset**:
   - Go to `https://doktu.co/reset-password`
   - Enter email
   - Check email → Click "Reset Password" button
   - Should redirect to `https://doktu.co/reset-password?token=...` ✅

2. **Appointment Confirmation**:
   - Book a new appointment
   - Check email
   - All links should point to `https://doktu.co/...` ✅

3. **Appointment Reminders**:
   - 24h before appointment
   - Check email links
   - Should point to `https://doktu.co/appointments/...` ✅

## Why This Happens

Vercel environment variables are **separate** from the `.env.production` file in your repo:

- **`.env.production`** (in repo) → Used for local builds and reference
- **Vercel Dashboard Environment Variables** → Used for actual deployments

The `.env.production` file shows:
```bash
VITE_APP_URL=https://doktu-tracker.vercel.app  # Wrong!
```

But this file is just for reference. The **actual** environment variable used in Vercel deployments comes from the Vercel Dashboard settings.

## Optional: Update .env.production in Repo

While not required for fixing the issue, you should also update the local file for consistency:

```bash
# .env.production
VITE_APP_URL=https://doktu.co  # ← Update this
```

Then commit:
```bash
git add .env.production
git commit -m "Update VITE_APP_URL to custom domain doktu.co"
git push
```

This will trigger a Vercel deployment with the updated variable.

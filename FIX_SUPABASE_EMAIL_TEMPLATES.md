# Fix Supabase Email Templates - Password Reset Still Points to Vercel

## Problem
Despite updating:
- ✅ Supabase Site URL → `https://doktu.co`
- ✅ Supabase Redirect URLs → `https://doktu.co/**`
- ✅ Railway `CLIENT_URL` → `https://doktu.co`
- ✅ Vercel `VITE_APP_URL` → `https://doktu.co`

Password reset emails **still** redirect to `https://doktu-tracker.vercel.app/`

## Root Cause: Custom Email Templates

Supabase has **two ways** to set URLs in emails:

### 1. Site URL (Global Setting) ✅
- Location: Auth → URL Configuration
- You already set this to `https://doktu.co`

### 2. Email Templates (Override Site URL) ⚠️
- Location: Auth → Email Templates
- **These templates can have HARDCODED URLs that override Site URL!**

## Solution: Check and Fix Email Templates

### Step 1: Go to Email Templates

1. Open Supabase Dashboard
2. Navigate to your project: `hzmrkvooqjbxptqjqxii`
3. Click **"Authentication"** → **"Email Templates"**
4. Direct link: https://supabase.com/dashboard/project/hzmrkvooqjbxptqjqxii/auth/templates

### Step 2: Check Each Template

Look for these templates and check for hardcoded URLs:

#### Templates to Check:
1. **Confirm signup** (email verification)
2. **Magic Link** (passwordless login)
3. **Change Email Address**
4. **Reset Password** ← **THIS IS THE CULPRIT!**

### Step 3: Find Hardcoded URLs

Look for any of these patterns in the templates:

❌ **Wrong - Hardcoded URL:**
```html
<a href="https://doktu-tracker.vercel.app/reset-password?token={{ .Token }}">
```

❌ **Wrong - Old domain:**
```html
<a href="https://doktu-tracker.vercel.app{{ .ConfirmationURL }}">
```

✅ **Correct - Uses Site URL:**
```html
<a href="{{ .ConfirmationURL }}">Reset Password</a>
```

✅ **Correct - Uses variable:**
```html
<a href="{{ .SiteURL }}/reset-password?token={{ .Token }}">
```

### Step 4: Fix the Template

If you find a hardcoded URL, replace it:

**Before (Wrong):**
```html
<a href="https://doktu-tracker.vercel.app/reset-password?token={{ .Token }}">
  Reset Password
</a>
```

**After (Correct):**
```html
<a href="{{ .ConfirmationURL }}">
  Reset Password
</a>
```

Or use:
```html
<a href="{{ .SiteURL }}/reset-password?token={{ .Token }}">
  Reset Password
</a>
```

### Step 5: Available Template Variables

Supabase provides these variables in email templates:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{ .SiteURL }}` | Your Site URL setting | `https://doktu.co` |
| `{{ .ConfirmationURL }}` | Full confirmation link with token | `https://doktu.co/auth/confirm?token=...` |
| `{{ .Token }}` | Just the token | `abc123...` |
| `{{ .TokenHash }}` | Hashed token | `hash...` |
| `{{ .Email }}` | User's email | `user@example.com` |

## Step 6: Reset to Default Template (Recommended)

If you're not sure what to fix, you can reset to Supabase's default template:

1. In the Email Template editor
2. Look for a button like **"Reset to default"** or **"Use default template"**
3. Click it to restore Supabase's original template
4. The default template uses `{{ .ConfirmationURL }}` which respects your Site URL setting

## Step 7: Save and Test

1. After editing, click **"Save"**
2. Wait 1-2 minutes for changes to propagate
3. Test password reset again
4. Check email - link should now point to `https://doktu.co`

## How to Test

### Quick Test:
```bash
# In the browser console on doktu.co
1. Go to password reset page
2. Enter email: avagnonperso@gmail.com
3. Click "Send reset email"
4. Check email inbox
5. Look at the "Reset Password" button link
6. Should be: https://doktu.co/reset-password?token=...
```

## Alternative: Check Template via API

Run this to see what template is currently being used:

```bash
cd /c/Users/mings/.apps/DoktuTracker
node debug-password-reset-flow.mjs
```

This will trigger a real password reset email so you can inspect the actual link.

## Common Mistakes

### ❌ Mistake 1: Hardcoded Domain in Template
```html
<a href="https://doktu-tracker.vercel.app{{ .ConfirmationURL }}">
```
**Fix:** Remove the domain, just use `{{ .ConfirmationURL }}`

### ❌ Mistake 2: Wrong Variable
```html
<a href="{{ .RedirectTo }}">  <!-- This variable doesn't exist -->
```
**Fix:** Use `{{ .ConfirmationURL }}` or `{{ .SiteURL }}`

### ❌ Mistake 3: Forgot to Save
After editing, you MUST click **"Save"** button in Supabase dashboard

## If It's Still Not Working

### Check Browser Cache
1. Open password reset page in **Incognito/Private** window
2. Some browsers cache the email template

### Check Email Client
1. Delete old password reset emails
2. Request a NEW password reset
3. Old emails in your inbox still have old links

### Verify Deployment
1. Check Vercel deployment completed: https://vercel.com/dashboard
2. Check Railway deployment completed: https://railway.app/
3. Both should show latest deployment as "Ready"

### Nuclear Option: Clear Supabase Email Cache
Sometimes Supabase caches the email template:

1. Change Site URL to something else temporarily (e.g., `https://example.com`)
2. Save
3. Wait 1 minute
4. Change back to `https://doktu.co`
5. Save again
6. This forces Supabase to refresh the template cache

## What You Should See

After fixing:

✅ **Password Reset Email:**
- Link: `https://doktu.co/reset-password?token=abc123...`
- **NOT**: `https://doktu-tracker.vercel.app/...`

✅ **Appointment Confirmation Email:**
- Links: `https://doktu.co/appointments/123/join`
- **NOT**: `https://doktu-tracker.vercel.app/...`

✅ **All Other Emails:**
- All links point to `https://doktu.co`
- No references to `vercel.app` anywhere

## Next Steps

1. **Go to Supabase Email Templates NOW**: https://supabase.com/dashboard/project/hzmrkvooqjbxptqjqxii/auth/templates
2. **Check the "Reset Password" template**
3. **Look for hardcoded `doktu-tracker.vercel.app` URLs**
4. **Replace with `{{ .ConfirmationURL }}` or reset to default**
5. **Save and test**

This is almost certainly the issue since everything else is configured correctly.

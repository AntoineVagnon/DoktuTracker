# Required Railway Environment Variables

## Critical Missing Variable

You need to add this environment variable in Railway dashboard:

```
CLIENT_URL=https://www.doktu.co
```

### Why This is Critical

**Current Problem:**
- Password reset links → `undefined/reset-password` (404 error)
- Appointment links → `undefined/appointments/123/join` (404 error)
- Doctor dashboard links → `undefined/doctor/dashboard` (404 error)

**After Setting CLIENT_URL:**
- Password reset links → `https://www.doktu.co/reset-password` ✅
- Appointment links → `https://www.doktu.co/appointments/123/join` ✅
- Doctor dashboard links → `https://www.doktu.co/doctor/dashboard` ✅

### How to Set in Railway

1. Go to Railway dashboard: https://railway.app/
2. Select your DoktuTracker project
3. Click on your backend service
4. Go to "Variables" tab
5. Click "+ New Variable"
6. Add:
   - **Name**: `CLIENT_URL`
   - **Value**: `https://www.doktu.co`
7. Click "Add" then "Deploy"

### Alternative Domain

If you prefer `doktu.co` without the `www`:
```
CLIENT_URL=https://doktu.co
```

Make sure it matches your actual frontend domain.

## Why Vercel Links Appear

Your Vercel deployment URL is likely set as the fallback somewhere. After setting `CLIENT_URL` in Railway, all email links will point to the correct production domain.

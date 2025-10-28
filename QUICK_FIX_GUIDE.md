# Quick Fix Guide - Doctor Registration System
**Problem**: Backend won't start, registration system non-functional
**Time to Fix**: ~30 minutes

---

## THE PROBLEM

When starting the backend server with `npm run dev`, you get:

```
Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set
    at server/supabaseAuth.ts:8:9
```

And registration fails with:
```
404 Not Found: http://localhost:5174/api/doctor-registration/signup
```

---

## THE SOLUTION

### Step 1: Create/Update .env File (5 min)

Create or update `/c/Users/mings/.apps/DoktuTracker/.env` with:

```env
# ========================================
# BACKEND CONFIGURATION
# ========================================

# PostgreSQL Database
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@[YOUR_HOST]:[PORT]/[DATABASE]?sslmode=require

# Supabase Backend (NOT prefixed with VITE_)
SUPABASE_URL=https://hzmrkvooqjbxptqjqxii.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[GET_THIS_FROM_SUPABASE_DASHBOARD]

# Session Secret
SESSION_SECRET=[GENERATE_RANDOM_STRING]

# Stripe Backend
STRIPE_SECRET_KEY=[GET_FROM_STRIPE_DASHBOARD]

# SendGrid Email
SENDGRID_API_KEY=[GET_FROM_SENDGRID_DASHBOARD]
SENDGRID_FROM_EMAIL=noreply@doktu.com

# ========================================
# FRONTEND CONFIGURATION (VITE_* prefix)
# ========================================

# API URL (local development)
VITE_API_URL=http://localhost:5000

# Stripe Frontend
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51RkD7D2YxuDmKTPwVAr4axsu4Pb6tCWRWIUNy97fgZqicl2EuY4iJh0RFPHtrCh3Ry1HiCSgYM3SamSJGCn8BIFy00wPFx6mNy

# Supabase Frontend
VITE_SUPABASE_URL=https://hzmrkvooqjbxptqjqxii.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bXJrdm9vcWpieHB0cWpxeGlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcyODk1NjQsImV4cCI6MjA0Mjg2NTU2NH0.gO8F0Y1yD6kSE_LLyHBx1jhQAPuHgGkkl0J8Vbw-Dzk

# Environment
NODE_ENV=development
VITE_NODE_ENV=development
```

**Where to find missing values:**

1. **DATABASE_URL**: Check Railway dashboard or your PostgreSQL provider
2. **SUPABASE_SERVICE_ROLE_KEY**: Supabase Dashboard → Settings → API → service_role key (secret)
3. **SESSION_SECRET**: Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
4. **STRIPE_SECRET_KEY**: Stripe Dashboard → Developers → API Keys → Secret key
5. **SENDGRID_API_KEY**: SendGrid Dashboard → Settings → API Keys

---

### Step 2: Update vite.config.ts (5 min)

Add API proxy to `vite.config.ts`:

```typescript
export default defineConfig(async ({ mode }) => {
  return {
    // ... existing config ...

    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
      },
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});
```

---

### Step 3: Start Backend Server (2 min)

**Terminal 1** (Backend):
```bash
cd /c/Users/mings/.apps/DoktuTracker
npm run dev
```

Wait for:
```
✅ Server started on port 5000
✅ Database connected
✅ Supabase initialized
```

**Terminal 2** (Frontend):
```bash
cd /c/Users/mings/.apps/DoktuTracker
npm run dev:frontend
```

---

### Step 4: Verify It Works (3 min)

1. Open browser: http://localhost:5174/doctor-signup
2. Fill all 4 steps:
   - Step 1: Personal info
   - Step 2: Medical credentials (select Cardiology, pick future date, select country)
   - Step 3: Bio and price (optional)
   - Step 4: Accept all 3 checkboxes
3. Click **"Submit Application"**
4. **Expected**: Redirect to `/doctor-signup-success` ✅
5. **If fails**: Check backend terminal for errors

---

## VERIFICATION CHECKLIST

After fix, verify these work:

- [ ] Backend server starts without errors
- [ ] Frontend connects to backend (no 404 errors)
- [ ] Registration submission succeeds
- [ ] Redirect to success page works
- [ ] Database record created (check with SQL: `SELECT * FROM doctors WHERE email='test@example.com'`)
- [ ] Doctor has `status='pending_review'`
- [ ] No console errors in browser

---

## COMMON ISSUES

### Issue: "Cannot find module 'dotenv'"
**Fix**: `npm install dotenv`

### Issue: "Port 5000 already in use"
**Fix**: Change backend port in `server/index.ts` and update `VITE_API_URL`

### Issue: "Supabase connection failed"
**Fix**: Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct

### Issue: "Database connection failed"
**Fix**: Verify `DATABASE_URL` format: `postgresql://user:pass@host:port/db?sslmode=require`

### Issue: "CORS error in browser"
**Fix**: Verify Vite proxy config is correct and backend server is running

---

## AFTER FIX: RUN FULL TESTS

Once backend works, run:

```bash
# Integration tests
npm run test:e2e

# Security tests
npm run qa:security

# Full QA suite
npm run qa:full
```

**Expected time**: ~7.5 hours for full regression

---

## NEED HELP?

1. Check backend logs in Terminal 1
2. Check browser console (F12) in Chrome
3. Verify .env file has all required variables
4. Review full test report: `TEST_EXECUTION_REPORT_2025-10-14.md`
5. Check evidence screenshots: `/c/Users/mings/.playwright-mcp/evidence/`

---

**Last Updated**: 2025-10-14
**Status**: Awaiting environment configuration

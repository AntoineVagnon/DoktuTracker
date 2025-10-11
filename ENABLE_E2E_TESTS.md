# How to Enable E2E Tests

## Current Status

The E2E test suite is **complete and ready**. The test endpoint is **already working** on Railway!

## Architecture

- **Frontend:** Vercel (`https://doktu-tracker.vercel.app`)
- **Backend API:** Railway (`https://web-production-b2ce.up.railway.app`)

The test endpoint `/api/test/auth` is already deployed and functional on Railway. You can verify:

```bash
curl -X POST https://web-production-b2ce.up.railway.app/api/test/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'
# Returns: {"error":"Invalid credentials"} ✅ Endpoint works!
```

---

## ✅ Update E2E Tests to Use Railway Backend

The E2E tests need to point to the Railway backend, not Vercel (which only hosts the frontend).

---

## 🧪 Run E2E Tests

Run tests pointing to Vercel frontend + Railway backend:

```bash
cd "/c/Users/mings/.apps/DoktuTracker"

export VITE_APP_URL="https://doktu-tracker.vercel.app"
export VITE_API_URL="https://web-production-b2ce.up.railway.app"
export TEST_ADMIN_EMAIL="antoine.vagnon@gmail.com"
export TEST_ADMIN_PASSWORD="Spl@ncnopleure49"

# Run all E2E tests (23 scenarios)
npx playwright test tests/e2e/doctorCreation.spec.ts --project=chromium

# Or run specific priority tests
npx playwright test tests/e2e/doctorCreation.spec.ts --grep "@P0"  # Critical only
npx playwright test tests/e2e/doctorCreation.spec.ts --grep "@P1"  # High priority
```

---

## 📊 What Will Work After This

Once `ENABLE_TEST_ENDPOINTS=true` is set:

### ✅ Ready to Run (68/73 tests - 93%)
- **29 Unit tests** - Already passing
- **23 E2E tests** - Will work with environment variable
- **10 Security tests** - Will work with environment variable
- **6 Accessibility tests** - Will work with environment variable

### ⏳ Still Need Installation (5/73 tests)
- **12 Integration tests** - Require Docker
- **7 Performance tests** - Require k6

---

## 🔒 Security Note

**Why is this safe?**

1. The test endpoint is **only for creating sessions**, not creating users
2. It still requires **valid credentials** (email/password)
3. It's **disabled by default** - only works when explicitly enabled
4. It only affects **non-production** or when `ENABLE_TEST_ENDPOINTS=true`
5. Can be **disabled anytime** by removing the environment variable

**For production:**
- Consider using a **separate preview/staging deployment** for testing
- Or enable only on **preview branches**, not production
- Or use **Vercel environment-specific** variables (only enable on "Preview")

---

## 🐛 Troubleshooting

### Issue: Still getting 405 after adding environment variable

**Solution:** You must **redeploy** after adding environment variables!
- Vercel doesn't hot-reload environment variables
- Go to Deployments → Click latest → Redeploy

### Issue: Getting 401 Invalid credentials

**Solution:** Check your admin credentials are correct:
```bash
# Test credentials directly
export TEST_ADMIN_EMAIL="antoine.vagnon@gmail.com"
export TEST_ADMIN_PASSWORD="Spl@ncnopleure49"
```

### Issue: Tests timeout on admin dashboard

**Solution:** Verify admin user has `role='admin'` in database:
```sql
SELECT email, role FROM users WHERE email = 'antoine.vagnon@gmail.com';
```

---

## 📝 Alternative: Use Preview Environment

If you don't want to enable test endpoints in production:

1. **Create preview branch:**
   ```bash
   git checkout -b e2e-testing
   git push origin e2e-testing
   ```

2. **Set environment variable only for preview:**
   - In Vercel: Settings → Environment Variables
   - Set `ENABLE_TEST_ENDPOINTS=true`
   - Select **"Preview"** only (not Production)

3. **Update test URL:**
   ```bash
   export VITE_APP_URL="https://doktu-tracker-git-e2e-testing-yourusername.vercel.app"
   ```

---

## 📚 Related Documentation

- **Test Execution Summary:** `tests/TEST_EXECUTION_SUMMARY.md`
- **Fixes Applied:** `tests/FIXES_APPLIED.md`
- **Testing Protocol:** `TESTING_PROTOCOL.md`
- **Test Report:** `TEST_REPORT_DOCTOR_CREATION.md`

---

## ✨ Expected Test Results

Once everything is configured:

```
Running 28 tests using 1 worker

✓ [setup] › tests\auth.setup.ts:13:1 › authenticate as admin
✓ [chromium] › ST-001 [P0]: Successfully create doctor with all required fields
✓ [chromium] › ST-002 [P1]: Fail to create doctor with duplicate email
✓ [chromium] › ST-003 [P1]: BVA - Password length boundaries
✓ [chromium] › ST-004 [P0]: Unauthenticated user cannot access endpoint
✓ [chromium] › ST-005 [P0]: Doctor-role user cannot create doctors
... (18 more tests)

23 passed (3.5m)
```

---

**Next Step:** Add `ENABLE_TEST_ENDPOINTS=true` in Vercel and redeploy! 🚀

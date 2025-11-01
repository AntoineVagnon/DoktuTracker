# Railway Deployment Verification Checklist

## Current Status
🔄 **Deploying**: Railway is currently building and deploying
📦 **Commit**: 043df6f - Automatic migration on startup
⏰ **Started**: Now

---

## Step 1: Check Deployment Logs (In Progress)

### What to Look For in Railway Logs:

#### ✅ Migration Success Messages:
```
🔄 Connecting to database...
📝 Running doctor documents migration...
✅ Migration completed successfully!

Created:
  - doctor_documents table
  - Indexes for efficient queries
  - documents_uploaded_at column in doctors table

🔌 Database connection closed
```

#### ✅ Server Start Message:
```
serving on port 5000
```

#### ⚠️ If You See Errors:
- `DATABASE_URL not set` → Check Railway environment variables
- `already exists` → Table already created (OK, expected on re-deploy)
- `permission denied` → Database user needs CREATE TABLE permissions

---

## Step 2: Verify Migration Success

Once deployment shows "Active" or "Success", verify the table was created:

### Option A: Via Railway Query Tab
1. Go to Railway Dashboard
2. Click on your **PostgreSQL** service (not the web service)
3. Click "Query" or "Data" tab
4. Run this query:

```sql
-- Check if table exists
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'doctor_documents';
```

**Expected Result**: One row showing `doctor_documents`

### Option B: Check Table Structure
```sql
-- View table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'doctor_documents'
ORDER BY ordinal_position;
```

**Expected Columns**:
- id (uuid)
- doctor_id (integer)
- document_type (character varying)
- file_name (character varying)
- original_file_name (character varying)
- file_size (integer)
- mime_type (character varying)
- storage_url (text)
- verification_status (character varying)
- verified_by (integer)
- verified_at (timestamp)
- rejection_reason (text)
- issue_date (date)
- expiry_date (date)
- issuing_authority (character varying)
- document_number (character varying)
- upload_date (timestamp)
- uploaded_at (timestamp)
- created_at (timestamp)
- updated_at (timestamp)

### Option C: Check Indexes
```sql
-- View indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'doctor_documents';
```

**Expected Indexes**:
- `doctor_documents_pkey` (primary key on id)
- `idx_doctor_documents_doctor_id`
- `idx_doctor_documents_type`
- `idx_doctor_documents_status`

---

## Step 3: Verify Doctors Table Update

Check if the new column was added:

```sql
-- Check if documents_uploaded_at column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'doctors'
  AND column_name = 'documents_uploaded_at';
```

**Expected Result**: One row showing `documents_uploaded_at | timestamp without time zone`

---

## Step 4: Test Application Endpoints

Once Railway deployment is complete, test these endpoints:

### Test Server Health
```bash
curl https://web-production-b2ce.up.railway.app/api/health
```

**Expected**: `{"status": "ok"}` or similar

### Test Database Connection
Check Railway logs for database connection messages:
- ✅ "Connecting to database..."
- ✅ "✅ Supabase Storage Service initialized"
- ✅ "[CRON] All cron jobs initialized successfully"

---

## Step 5: Verify Schema in Application

Check that TypeScript recognizes the new table:

```bash
# Run type check
cd /c/Users/mings/.apps/DoktuTracker
npm run check
```

**Expected**: No TypeScript errors related to doctorDocuments

---

## Common Issues & Solutions

### Issue: Migration runs but table not created
**Solution**: Check user permissions
```sql
-- Grant permissions (run as superuser)
GRANT CREATE ON SCHEMA public TO your_db_user;
```

### Issue: "table already exists" error
**Status**: ✅ **This is OK!** Migration is idempotent.
**Action**: No action needed. The migration script uses `IF NOT EXISTS`.

### Issue: Deployment fails immediately
**Check**:
1. Syntax errors in package.json
2. Migration script path is correct
3. DATABASE_URL is set in Railway

### Issue: Server doesn't start after migration
**Check Railway logs for**:
- Migration errors
- Node.js version compatibility
- Missing dependencies

---

## Success Criteria

✅ **Deployment Status**: "Active" or "Success" in Railway
✅ **Migration Logs**: See success messages
✅ **Table Exists**: Query returns `doctor_documents`
✅ **Indexes Created**: All 3 indexes present
✅ **Column Added**: `documents_uploaded_at` in doctors table
✅ **Server Running**: Application responds to requests
✅ **No Errors**: Clean logs without migration failures

---

## After Successful Deployment

### Immediate Next Steps:
1. ✅ Mark deployment as verified
2. ✅ Document any issues encountered
3. ⏳ Create Supabase storage bucket (next session)
4. ⏳ Continue with Phase 2 implementation

### For Next Session:
1. **Create Supabase Bucket**: `doctor-documents`
2. **Implement API Routes**: Upload/download endpoints
3. **Build Frontend Components**: Upload UI
4. **Remove License Fields**: From registration form

---

## Rollback Plan (If Needed)

If migration causes issues:

### Option 1: Drop the table (least destructive)
```sql
DROP TABLE IF EXISTS doctor_documents CASCADE;
```

### Option 2: Revert deployment
1. In Railway, go to deployments
2. Find previous working deployment (ebf461e)
3. Click "Redeploy"

### Option 3: Remove migration from startup
```json
// In package.json, change back to:
"start": "NODE_ENV=production node dist/index.js"
```

---

## Contact Info

If issues persist:
- Check Railway logs first
- Review `RAILWAY_DEPLOYMENT_INSTRUCTIONS.md`
- Review `NEXT_SESSION_PLAN.md` for what's coming

---

**Deployment Started**: Now
**Estimated Time**: 2-5 minutes
**Status**: 🔄 In Progress

Check Railway dashboard for real-time progress!

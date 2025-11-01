# Railway Deployment Instructions - Doctor Documents Migration

## Current Situation

✅ Code pushed to GitHub (commit: ebf461e)
⏳ Railway will auto-deploy the code changes
❌ **Database migration NOT automatically run on production**

The `doctor_documents` table was created in your **local database** but needs to be created in **Railway's production database**.

## Option 1: Run Migration via Railway Logs (Recommended)

### Step 1: Wait for Railway Deployment
Railway should be building now. Check your Railway dashboard for the deployment status.

### Step 2: Run Migration via Railway CLI
Once deployed, connect to Railway and run the migration:

```bash
# Install Railway CLI if not already installed
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Run the migration script
railway run node run-doctor-documents-migration.mjs
```

## Option 2: Run Migration via SQL Editor (Fastest)

### Copy the SQL from the migration file and run it directly:

1. Go to your Railway dashboard
2. Click on your PostgreSQL database
3. Click "Query" or "Connect"
4. Open the SQL migration file: `migrations/add-doctor-documents.sql`
5. Copy ALL the SQL content
6. Paste and execute in Railway's query editor

**Migration SQL Preview:**
```sql
-- Create doctor_documents table
CREATE TABLE IF NOT EXISTS doctor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('approbation', 'facharzturkunde', 'zusatzbezeichnung')),
  -- ... (full SQL is in migrations/add-doctor-documents.sql)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_doctor_documents_doctor_id ON doctor_documents(doctor_id);
-- ... etc
```

## Option 3: Add Migration to Startup Script

### Automatic migration on every deployment (safest for production):

1. **Update package.json** to run migration on start:

```json
{
  "scripts": {
    "start": "node run-doctor-documents-migration.mjs && node dist/index.js",
    "dev": "tsx watch server/index.ts",
    "build": "npm run build:backend",
    "build:backend": "esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js --external:./vite"
  }
}
```

2. **Commit and push**:
```bash
git add package.json
git commit -m "chore: Add automatic database migration on Railway startup"
git push
```

3. **Railway will redeploy** and run the migration automatically on startup

## Option 4: Manual Database Connection

If you have the DATABASE_URL from Railway:

```bash
# Set the DATABASE_URL from Railway
export DATABASE_URL="postgresql://postgres:xxx@xxx.railway.app:xxxx/railway"

# Run migration locally but against production DB
node run-doctor-documents-migration.mjs
```

⚠️ **Warning**: Be careful with this approach - you're running against production!

## Recommended Approach

**For immediate fix**: Use **Option 2** (SQL Editor) - fastest and safest

**For future deployments**: Use **Option 3** (Startup Script) - automatic and safe

## After Migration is Complete

### Verify Migration Success

1. Check Railway logs for migration confirmation:
```
✅ Migration completed successfully!
Created:
  - doctor_documents table
  - Indexes for efficient queries
  - documents_uploaded_at column in doctors table
```

2. Verify table exists in Railway database:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'doctor_documents';
```

3. Check the schema:
```sql
\d doctor_documents
```

### Create Supabase Storage Bucket

Once migration is complete, you'll need to create the storage bucket:

```sql
-- Run in Supabase SQL editor (not Railway)
INSERT INTO storage.buckets (id, name, public)
VALUES ('doctor-documents', 'doctor-documents', false);
```

### Set Storage Policies (Supabase)

```sql
-- Allow authenticated users to upload to their own doctor folder
CREATE POLICY "Doctors can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'doctor-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow admins to view all documents
CREATE POLICY "Admins can view all documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'doctor-documents' AND auth.jwt()->>'role' = 'admin');

-- Allow doctors to view their own documents
CREATE POLICY "Doctors can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'doctor-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
```

## Troubleshooting

### If Railway deployment failed:
1. Check Railway logs for errors
2. Verify all dependencies are in package.json
3. Ensure DATABASE_URL is set in Railway environment

### If migration fails:
1. Check if table already exists: `SELECT * FROM doctor_documents LIMIT 1;`
2. Check for conflicting table names
3. Verify database user has CREATE TABLE permissions

### If file uploads fail later:
1. Verify Supabase bucket exists
2. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Railway env vars
3. Verify storage policies are set correctly

## Current Deployment Status

**Code Status**: ✅ Pushed to GitHub
**Railway Build**: ⏳ Should be building now (check dashboard)
**Database Migration**: ❌ Needs to be run manually (choose option above)
**Storage Bucket**: ❌ Needs to be created in Supabase
**Ready to Use**: ❌ Complete above steps first

## Next Steps After Deployment

Once migration is complete on Railway:

1. ✅ Verify table exists in production DB
2. ✅ Create Supabase bucket
3. ✅ Test document upload (Phase 2 implementation)
4. ✅ Continue with frontend components

---

**Quick Command Reference:**

```bash
# Check Railway deployment status
railway status

# View Railway logs
railway logs

# Run migration on Railway
railway run node run-doctor-documents-migration.mjs

# Connect to Railway database
railway connect postgres
```

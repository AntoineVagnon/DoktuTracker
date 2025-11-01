# Supabase Bucket Setup for Doctor Documents

## ⚠️ IMPORTANT: Switch Buckets to Private

**Current Status**: All buckets are PUBLIC (security risk!)
**Required**: Switch to PRIVATE for medical documents

### Why Private Buckets?
- **Security**: Sensitive medical credentials should not be publicly accessible
- **GDPR Compliance**: Private data requires access control
- **Audit Trail**: Signed URLs allow tracking who accessed what
- **Temporary Access**: URLs expire after defined time (default 1 hour)

---

## Step 1: Switch Buckets to Private

### For `doctor-documents` bucket (REQUIRED):

1. Go to **Supabase Dashboard** → **Storage** → **doctor-documents**
2. Click the **⋮** (three dots menu) next to the bucket name
3. Click **Edit Bucket**
4. **UNCHECK** the "Public bucket" option
5. Click **Save**

### For other buckets (RECOMMENDED):

Do the same for:
- ✅ `patient-documents` (contains sensitive medical records)
- ⚠️ `profile-photos` (can stay public if you want, but private is more secure)
- ✅ `Doktu` (switch to private for security)

**After switching to private**, the application will use **signed URLs** which:
- Expire after 1 hour (configurable)
- Are generated on-demand with access control
- Work with RLS policies for additional security

---

## Step 2: Verify Bucket Settings

Go to Supabase Dashboard → Storage → doctor-documents

**Settings should be**:
- ✅ **Public**: NO (unchecked) - Documents must be private ⚠️ **CURRENTLY PUBLIC - FIX THIS!**
- ✅ **File size limit**: 10MB (10485760 bytes)
- ✅ **Allowed MIME types**: `application/pdf`, `image/jpeg`, `image/png`

---

## 2. Set Up Row Level Security (RLS) Policies

Run these SQL commands in Supabase SQL Editor:

### Policy 1: Doctors can upload to their own folder
```sql
CREATE POLICY "Doctors can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'doctor-documents'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1]::integer IN (
    SELECT id FROM doctors WHERE user_id = auth.uid()::integer
  )
);
```

### Policy 2: Doctors can view their own documents
```sql
CREATE POLICY "Doctors can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'doctor-documents'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1]::integer IN (
    SELECT id FROM doctors WHERE user_id = auth.uid()::integer
  )
);
```

### Policy 3: Doctors can delete their own documents
```sql
CREATE POLICY "Doctors can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'doctor-documents'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1]::integer IN (
    SELECT id FROM doctors WHERE user_id = auth.uid()::integer
  )
);
```

### Policy 4: Admins can view all documents
```sql
CREATE POLICY "Admins can view all documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'doctor-documents'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()::integer
    AND role = 'admin'
  )
);
```

### Policy 5: Admins can delete documents (for management)
```sql
CREATE POLICY "Admins can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'doctor-documents'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()::integer
    AND role = 'admin'
  )
);
```

---

## 3. Verify Policies Are Active

Check that RLS is enabled and policies are created:

```sql
-- Check if RLS is enabled on storage.objects
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'storage'
  AND tablename = 'objects';

-- List all policies for doctor-documents bucket
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%doctor%';
```

---

## 4. Test Access (Optional)

### Test Doctor Upload
```javascript
// As authenticated doctor
const { data, error } = await supabase.storage
  .from('doctor-documents')
  .upload(`${doctorId}/approbation/test.pdf`, file);
```

### Test Admin Access
```javascript
// As admin
const { data, error } = await supabase.storage
  .from('doctor-documents')
  .list('', {
    limit: 100,
    offset: 0,
  });
```

### Test Patient Access (Should Fail)
```javascript
// As patient (should be denied)
const { data, error } = await supabase.storage
  .from('doctor-documents')
  .list('');
// Expected: error about policy violation
```

---

## Storage Structure

Documents are organized by doctor ID and document type:

```
doctor-documents/
├── {doctorId}/
│   ├── approbation/
│   │   └── {uuid}.pdf
│   ├── facharzturkunde/
│   │   └── {uuid}.pdf
│   └── zusatzbezeichnung/
│       └── {uuid}.pdf
```

**Example**:
```
doctor-documents/
├── 123/
│   ├── approbation/
│   │   └── f47ac10b-58cc-4372-a567-0e02b2c3d479.pdf
│   ├── facharzturkunde/
│   │   └── 7c9e6679-7425-40de-944b-e07fc1f90ae7.pdf
│   └── zusatzbezeichnung/
│       └── 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d.jpg
```

---

## Security Features

### ✅ What's Protected:
- Only doctors can upload to their own folder
- Only doctors can view their own documents
- Only admins can view all documents
- Patients cannot access any doctor documents
- Unauthenticated users have no access

### ✅ File Validation:
- File type validation (PDF, JPG, PNG only)
- File size limit (10MB max)
- Unique filenames (UUID-based)
- Automatic folder structure by doctor ID

### ✅ Access Patterns:
- **Doctor Upload**: `/{doctorId}/{documentType}/{uuid}.{ext}`
- **Doctor View**: Can list their own folder only
- **Admin View**: Can list and view all folders
- **Download**: Via signed URLs (temporary, expiring)

---

## Troubleshooting

### Issue: Upload fails with "new row violates row-level security policy"
**Solution**:
1. Verify RLS policies are created (run verification query)
2. Check that user is authenticated
3. Verify doctor record exists for the user
4. Ensure folder path matches `{doctorId}/...` format

### Issue: Can't view uploaded documents
**Solution**:
1. Use signed URLs for private buckets
2. Verify SELECT policy is created
3. Check user has permission (doctor owns document or is admin)

### Issue: Admin can't see documents
**Solution**:
1. Verify user role is exactly 'admin' (case-sensitive)
2. Check admin policy is created
3. Ensure user record exists in users table

---

## How Signed URLs Work in the Application

### ✅ Code Already Updated

The application code has been updated to support private buckets with signed URLs:

**Storage Service** (`server/supabaseStorage.ts`):
```typescript
// Generate signed URL for temporary access (1 hour)
async getSignedUrl(filePath: string, expiresIn: number = 3600, bucketName?: string): Promise<string>
```

**Doctor Documents Service** (`server/services/doctorDocumentsService.ts`):
```typescript
// Automatically generates signed URLs when accessing documents
async getDocumentUrl(documentId: string, requesterId: number, requesterRole: string): Promise<string>
```

### How It Works:

1. **Upload**: Files are uploaded to private bucket with path `{doctorId}/{documentType}/{uuid}.{ext}`
2. **Storage**: File path is stored in database (e.g., `123/approbation/abc-123.pdf`)
3. **Access**: When a user requests to view/download:
   - Access control checks if user is authorized (doctor owns it OR user is admin)
   - If authorized, generates signed URL valid for 1 hour
   - User gets temporary URL to download file
   - URL expires after 1 hour for security

**Benefits**:
- No one can directly access files without authorization
- Each download is checked against access control
- URLs expire automatically
- Audit trail of who accessed what

---

## Current Status

✅ **Bucket Created**: `doctor-documents`
❌ **Privacy**: Currently PUBLIC - **SWITCH TO PRIVATE** (see Step 1 above)
⏳ **RLS Policies**: Need to be created after switching to private (run SQL from Step 2)
⏳ **Testing**: Test upload/download after buckets are private and policies are set
✅ **Code Updated**: Signed URL support already implemented

---

## Next Steps

1. ✅ Create bucket (DONE)
2. ✅ Update code for signed URLs (DONE)
3. ❌ **Switch buckets to PRIVATE** (Do this first!)
4. ⏳ Run RLS policy SQL commands (after switching to private)
5. ⏳ Verify policies are active
6. ⏳ Test document upload (Phase 2)
7. ⏳ Implement API routes (Phase 2)

### Quick Action Checklist:
- [ ] Switch `doctor-documents` to private (Supabase Dashboard)
- [ ] Switch `patient-documents` to private (Supabase Dashboard)
- [ ] Switch `Doktu` to private (Supabase Dashboard)
- [ ] Run 5 RLS policy SQL statements (SQL Editor)
- [ ] Verify policies with test query
- [ ] Test signed URL generation in application

---

## Notes

- Bucket is in the same region as your Supabase database for optimal performance
- GDPR compliant (data stays in EU if Supabase is EU region)
- Automatic encryption at rest
- Audit logging via Supabase dashboard
- Can set up lifecycle policies later for document retention/archival

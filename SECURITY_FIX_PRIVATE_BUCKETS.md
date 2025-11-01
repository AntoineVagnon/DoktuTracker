# Security Fix: Private Buckets with Signed URLs

## ⚠️ Security Issue Identified

**Issue**: All Supabase storage buckets are currently set to PUBLIC
**Risk Level**: HIGH - Sensitive medical documents accessible without authentication
**Affected Buckets**:
- `doctor-documents` - Medical credentials (Approbationsurkunde, Facharzturkunde, etc.)
- `patient-documents` - Patient medical records
- `Doktu` - Unknown content (should be private by default)
- `profile-photos` - User profile pictures (lower risk, but should be private)

## Why This Is a Security Problem

### 1. **Direct File Access**
Anyone with the file URL can access documents without authentication:
```
https://[your-supabase-url]/storage/v1/object/public/doctor-documents/123/approbation/abc.pdf
```
This URL is publicly accessible to anyone on the internet!

### 2. **GDPR Compliance Risk**
- Medical documents are personal data under GDPR
- Must have access controls and audit trails
- Public storage violates data minimization principles
- Fines can be up to €20 million or 4% of global turnover

### 3. **No Audit Trail**
- Can't track who accessed what documents
- Can't revoke access once URL is shared
- Can't expire access after a certain time

### 4. **Privacy Violations**
- Doctor credentials visible to anyone
- Patient records accessible without authorization
- No way to verify who should have access

## ✅ Solution Implemented

### Code Changes (Already Deployed)

**1. Extended Storage Service** (`server/supabaseStorage.ts`):
```typescript
// Now supports custom buckets and generates signed URLs
async getSignedUrl(
  filePath: string,
  expiresIn: number = 3600,  // Default 1 hour
  bucketName?: string
): Promise<string>

async downloadFile(
  filePath: string,
  bucketName?: string
): Promise<Buffer>
```

**2. Updated Document Service** (`server/services/doctorDocumentsService.ts`):
```typescript
async getDocumentUrl(
  documentId: string,
  requesterId: number,
  requesterRole: string
): Promise<string> {
  // Access control checks
  if (requesterRole !== 'admin' && document.doctorId !== requesterId) {
    throw new Error('Access denied');
  }

  // Generate signed URL (expires in 1 hour)
  const signedUrl = await this.storageService.getSignedUrl(
    document.storageUrl,
    3600,  // 1 hour
    DOCTOR_DOCUMENTS_BUCKET
  );

  return signedUrl;
}
```

### How Signed URLs Work

**Before (Public Bucket - INSECURE)**:
```
1. File uploaded → https://supabase.co/storage/v1/object/public/doctor-documents/123/doc.pdf
2. Anyone can access this URL forever
3. No access control
4. No expiration
```

**After (Private Bucket with Signed URLs - SECURE)**:
```
1. File uploaded → Stored at path: 123/approbation/doc.pdf
2. User requests download → Access control checks authorization
3. If authorized → Generate signed URL valid for 1 hour
4. User downloads file using temporary URL
5. After 1 hour → URL expires and becomes invalid
```

**Example Signed URL**:
```
https://[supabase].storage.v1/object/sign/doctor-documents/123/doc.pdf?token=eyJ...&exp=1234567890
```
This URL:
- ✅ Expires after 1 hour
- ✅ Only generated after access control check
- ✅ Can't be reused after expiration
- ✅ Provides audit trail

## Required Actions (Manual Steps)

### Step 1: Switch Buckets to Private

You must do this in the Supabase Dashboard:

1. Go to **Supabase Dashboard** → **Storage**
2. For each bucket (`doctor-documents`, `patient-documents`, `Doktu`):
   - Click **⋮** (three dots) next to bucket name
   - Click **Edit Bucket**
   - **UNCHECK** "Public bucket"
   - Click **Save**

**Do this for**:
- ✅ `doctor-documents` (CRITICAL - medical credentials)
- ✅ `patient-documents` (CRITICAL - patient records)
- ✅ `Doktu` (RECOMMENDED)
- ⚠️ `profile-photos` (OPTIONAL - can stay public, but private is better)

### Step 2: Apply RLS Policies

After switching to private, run these SQL statements in Supabase SQL Editor:

See `SUPABASE_BUCKET_SETUP.md` for the complete 5 RLS policies.

Quick summary:
1. Doctors can upload to their own folder
2. Doctors can view their own documents
3. Doctors can delete their own documents
4. Admins can view all documents
5. Admins can delete documents

## Security Benefits

### ✅ After Switching to Private:

**Access Control**:
- Only authenticated users can access files
- Access checked on every download request
- Role-based permissions (doctors vs admins)
- No patient access to doctor credentials

**Audit Trail**:
- Track who accessed what documents
- Log all download requests
- Monitor access patterns

**Time-Limited Access**:
- URLs expire after 1 hour (configurable)
- Must request new URL for each access
- Can't share URLs that work forever

**GDPR Compliance**:
- Data minimization (only authorized access)
- Purpose limitation (access control enforced)
- Storage limitation (expiring URLs)
- Accountability (audit logs)

## Deployment Status

✅ **Code Changes**: Pushed to GitHub (commit `5ace5ce`)
✅ **Railway Deployment**: Will deploy automatically
✅ **Documentation**: `SUPABASE_BUCKET_SETUP.md` created
⏳ **Bucket Privacy**: **YOU MUST SWITCH BUCKETS TO PRIVATE**
⏳ **RLS Policies**: Run SQL after switching to private

## Testing After Changes

### Test 1: Verify Private Bucket
Try to access a file directly:
```
https://[supabase-url]/storage/v1/object/public/doctor-documents/123/doc.pdf
```
**Expected Result**: 404 Not Found or Access Denied

### Test 2: Verify Signed URL Generation
In your application, request a document download:
```typescript
const url = await doctorDocumentsService.getDocumentUrl(docId, userId, userRole);
```
**Expected Result**: URL like `https://...?token=...&exp=...`

### Test 3: Verify URL Expiration
1. Generate a signed URL
2. Wait 1 hour
3. Try to access the URL
**Expected Result**: URL should no longer work

### Test 4: Verify Access Control
Try to access another doctor's document:
```typescript
// As Doctor A, try to get Doctor B's document
const url = await doctorDocumentsService.getDocumentUrl(docB_id, doctorA_id, 'doctor');
```
**Expected Result**: "Access denied" error

## Rollback Plan

If something breaks after switching to private:

### Option 1: Temporary - Switch Back to Public
In Supabase Dashboard, check "Public bucket" again.
This will restore old behavior while you debug.

### Option 2: Check Code Deployment
Ensure the new code with signed URLs is deployed to Railway.
Check Railway logs for errors.

### Option 3: Check RLS Policies
If files can't be accessed, check RLS policies are correctly set.
Run verification queries from `SUPABASE_BUCKET_SETUP.md`.

## Next Steps Checklist

- [ ] **CRITICAL**: Switch `doctor-documents` to private
- [ ] **CRITICAL**: Switch `patient-documents` to private
- [ ] **RECOMMENDED**: Switch `Doktu` to private
- [ ] Run 5 RLS policy SQL statements
- [ ] Verify policies with test queries
- [ ] Test signed URL generation in application
- [ ] Test that old public URLs no longer work
- [ ] Monitor Railway logs for any errors
- [ ] Test document upload/download in UI (Phase 2)

## References

- **Main Setup Guide**: `SUPABASE_BUCKET_SETUP.md`
- **Code Changes**: Commit `5ace5ce`
- **Previous Deployment**: Commit `043df6f`
- **Supabase Docs**: https://supabase.com/docs/guides/storage/security/access-control

---

**Summary**: Your medical document storage is currently PUBLIC and insecure. The code has been updated to support private buckets with signed URLs. **You must manually switch the buckets to private in Supabase Dashboard** to secure the data.

**Estimated Time**: 5-10 minutes to switch buckets and apply RLS policies
**Priority**: HIGH - Should be done immediately for GDPR compliance

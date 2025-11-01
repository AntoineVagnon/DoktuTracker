# Phase 2 Testing Guide

## Testing Checklist

### ✅ What We're Testing
1. Doctor registration without license fields
2. API endpoints for document upload/management
3. Database schema changes
4. Frontend form validation
5. Backend validation

---

## Test 1: Doctor Registration (No License Fields)

### Frontend Test
**URL**: http://localhost:5000/doctor-signup (or your Railway URL)

**Steps**:
1. Fill out Step 1 (Personal Info):
   - Email: test-doctor@example.com
   - Password: Test123!
   - First Name: Test
   - Last Name: Doctor
   - Phone: +49 123 456 7890

2. Fill out Step 2 (Medical Credentials):
   - Specialty: General Medicine
   - Primary Country: Germany (DE)
   - Additional Countries: (optional - select any)
   - **NOTE**: Should NOT see license number or expiration date fields
   - **Should see**: Blue alert about uploading documents after registration

3. Fill out Step 3 (Professional Details):
   - Bio: (optional)
   - Consultation Price: 50

4. Fill out Step 4 (Terms):
   - Accept all checkboxes

5. Submit

**Expected Result**:
- ✅ Registration succeeds
- ✅ Redirect to success page
- ✅ Success message mentions uploading documents
- ✅ No errors about missing license fields

**Backend Verification**:
```sql
-- Check if doctor was created without license fields
SELECT
  id,
  user_id,
  specialty,
  license_number, -- Should be NULL
  license_expiration_date, -- Should be NULL
  countries,
  status
FROM doctors
WHERE user_id = (SELECT id FROM users WHERE email = 'test-doctor@example.com')
LIMIT 1;
```

**Expected**:
- license_number: NULL
- license_expiration_date: NULL
- countries: ['DE'] or ['DE', ...additional]
- status: 'pending_review'

---

## Test 2: Document Upload API

### Prerequisites
- Have a test doctor account created
- Be logged in as that doctor
- Have test PDF/JPG files ready

### Test 2a: Upload Approbationsurkunde (PDF)

**Endpoint**: `POST /api/doctor-documents/upload`

**Using curl**:
```bash
curl -X POST http://localhost:5000/api/doctor-documents/upload \
  -H "Content-Type: multipart/form-data" \
  -H "Cookie: your-session-cookie" \
  -F "file=@test-approbation.pdf" \
  -F "documentType=approbation"
```

**Using Postman**:
1. Method: POST
2. URL: http://localhost:5000/api/doctor-documents/upload
3. Headers: (none needed if logged in via browser)
4. Body → form-data:
   - file: (select PDF file)
   - documentType: approbation

**Expected Response** (201 Created):
```json
{
  "message": "Document uploaded successfully",
  "document": {
    "id": "uuid-here",
    "documentType": "approbation",
    "fileName": "test-approbation.pdf",
    "fileSize": 123456,
    "uploadedAt": "2025-11-01T...",
    "verificationStatus": "pending"
  }
}
```

### Test 2b: Upload Facharzturkunde (JPG)

Same as above but:
- file: JPG image
- documentType: facharzturkunde

### Test 2c: Upload Zusatzbezeichnung (PNG)

Same as above but:
- file: PNG image
- documentType: zusatzbezeichnung

### Test 2d: File Validation Tests

**Test oversized file** (should fail):
```bash
# Try to upload 15MB file
curl -X POST http://localhost:5000/api/doctor-documents/upload \
  -F "file=@large-file.pdf" \
  -F "documentType=approbation"
```

**Expected**: 500 error with message about file size limit

**Test invalid file type** (should fail):
```bash
# Try to upload .exe file
curl -X POST http://localhost:5000/api/doctor-documents/upload \
  -F "file=@test.exe" \
  -F "documentType=approbation"
```

**Expected**: Error about invalid file type

---

## Test 3: List Documents API

### Test 3a: List Own Documents

**Endpoint**: `GET /api/doctor-documents`

**Request**:
```bash
curl http://localhost:5000/api/doctor-documents \
  -H "Cookie: your-session-cookie"
```

**Expected Response** (200 OK):
```json
{
  "documents": [
    {
      "id": "uuid-1",
      "documentType": "approbation",
      "fileName": "test-approbation.pdf",
      "fileSize": 123456,
      "uploadedAt": "2025-11-01T...",
      "verificationStatus": "pending",
      "verifiedAt": null,
      "rejectionReason": null
    },
    {
      "id": "uuid-2",
      "documentType": "facharzturkunde",
      "fileName": "test-facharzturkunde.jpg",
      "fileSize": 234567,
      "uploadedAt": "2025-11-01T...",
      "verificationStatus": "pending"
    }
  ]
}
```

---

## Test 4: Download Document (Signed URL)

### Test 4a: Get Download URL

**Endpoint**: `GET /api/doctor-documents/:id/download`

**Request**:
```bash
curl http://localhost:5000/api/doctor-documents/uuid-1/download \
  -H "Cookie: your-session-cookie"
```

**Expected Response** (200 OK):
```json
{
  "url": "https://[supabase].storage.v1/object/sign/doctor-documents/123/approbation/abc.pdf?token=...",
  "expiresIn": 3600
}
```

### Test 4b: Access Signed URL

**Request**:
```bash
curl "https://[returned-signed-url]" --output downloaded.pdf
```

**Expected**:
- ✅ File downloads successfully
- ✅ File matches uploaded file
- ✅ URL works for 1 hour
- ❌ URL expires after 1 hour

---

## Test 5: Delete Document

### Test 5a: Delete Own Document

**Endpoint**: `DELETE /api/doctor-documents/:id`

**Request**:
```bash
curl -X DELETE http://localhost:5000/api/doctor-documents/uuid-1 \
  -H "Cookie: your-session-cookie"
```

**Expected Response** (200 OK):
```json
{
  "message": "Document deleted successfully"
}
```

**Verification**:
- File removed from Supabase storage
- Record removed from database
- Subsequent GET returns 404

---

## Test 6: Admin Verification (Admin Only)

### Prerequisites
- Be logged in as admin

### Test 6a: Approve Document

**Endpoint**: `PATCH /api/doctor-documents/:id/verify`

**Request**:
```bash
curl -X PATCH http://localhost:5000/api/doctor-documents/uuid-1/verify \
  -H "Content-Type: application/json" \
  -H "Cookie: admin-session-cookie" \
  -d '{
    "verified": true
  }'
```

**Expected Response** (200 OK):
```json
{
  "message": "Document verified successfully",
  "document": {
    "id": "uuid-1",
    "documentType": "approbation",
    "verificationStatus": "verified",
    "verifiedBy": 1,
    "verifiedAt": "2025-11-01T...",
    "rejectionReason": null
  }
}
```

### Test 6b: Reject Document

**Request**:
```bash
curl -X PATCH http://localhost:5000/api/doctor-documents/uuid-2/verify \
  -H "Content-Type: application/json" \
  -H "Cookie: admin-session-cookie" \
  -d '{
    "verified": false,
    "rejectionReason": "Document is blurry and unreadable"
  }'
```

**Expected Response** (200 OK):
```json
{
  "message": "Document rejected",
  "document": {
    "id": "uuid-2",
    "documentType": "facharzturkunde",
    "verificationStatus": "rejected",
    "verifiedBy": 1,
    "verifiedAt": "2025-11-01T...",
    "rejectionReason": "Document is blurry and unreadable"
  }
}
```

---

## Test 7: Access Control Tests

### Test 7a: Patient Tries to Upload (Should Fail)

**Setup**: Log in as patient

**Request**:
```bash
curl -X POST http://localhost:5000/api/doctor-documents/upload \
  -H "Cookie: patient-session-cookie" \
  -F "file=@test.pdf" \
  -F "documentType=approbation"
```

**Expected**: 403 Forbidden - "Doctor access required"

### Test 7b: Doctor Tries to Access Another Doctor's Document (Should Fail)

**Setup**:
- Doctor A uploads document (id: uuid-a)
- Doctor B tries to access it

**Request** (as Doctor B):
```bash
curl http://localhost:5000/api/doctor-documents/uuid-a/download \
  -H "Cookie: doctor-b-session-cookie"
```

**Expected**: 403 Forbidden - "Access denied"

### Test 7c: Doctor Tries to Verify Document (Should Fail)

**Request** (as doctor, not admin):
```bash
curl -X PATCH http://localhost:5000/api/doctor-documents/uuid-1/verify \
  -H "Content-Type: application/json" \
  -H "Cookie: doctor-session-cookie" \
  -d '{"verified": true}'
```

**Expected**: 403 Forbidden - "Admin access required"

---

## Test 8: Document Completeness Check

### Test 8a: Check Completeness (Missing Documents)

**Endpoint**: `GET /api/doctor-documents/doctor/:doctorId/completeness`

**Request**:
```bash
curl http://localhost:5000/api/doctor-documents/doctor/123/completeness \
  -H "Cookie: doctor-session-cookie"
```

**Expected Response** (if only uploaded approbation):
```json
{
  "complete": false,
  "missing": ["facharzturkunde"],
  "pending": ["approbation"],
  "rejected": []
}
```

### Test 8b: Check Completeness (All Verified)

**Expected Response** (after both required docs verified):
```json
{
  "complete": true,
  "missing": [],
  "pending": [],
  "rejected": []
}
```

---

## Test 9: Database Verification

### Check doctor_documents table

```sql
-- View all documents
SELECT * FROM doctor_documents ORDER BY uploaded_at DESC LIMIT 10;

-- Check specific doctor's documents
SELECT
  id,
  doctor_id,
  document_type,
  file_name,
  file_size,
  verification_status,
  verified_at,
  rejection_reason
FROM doctor_documents
WHERE doctor_id = 123;

-- Check indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'doctor_documents';
```

**Expected Indexes**:
- doctor_documents_pkey (primary key)
- idx_doctor_documents_doctor_id
- idx_doctor_documents_type
- idx_doctor_documents_status

---

## Test 10: Supabase Storage Verification

### Check files in bucket

1. Go to Supabase Dashboard → Storage → doctor-documents
2. Should see folder structure:
   ```
   123/
     approbation/
       uuid-123.pdf
     facharzturkunde/
       uuid-456.jpg
   ```

3. Try to access file directly (should fail - bucket is private):
   ```
   https://[supabase]/storage/v1/object/public/doctor-documents/123/approbation/uuid.pdf
   ```
   Expected: 404 or Access Denied

---

## Quick Test Script

Create a file `test-doctor-documents.sh`:

```bash
#!/bin/bash

API_URL="http://localhost:5000"
SESSION_COOKIE="your-session-cookie-here"

echo "Testing Document Upload API..."

# Test 1: Upload PDF
echo "1. Uploading Approbationsurkunde (PDF)..."
curl -X POST $API_URL/api/doctor-documents/upload \
  -H "Cookie: $SESSION_COOKIE" \
  -F "file=@test-approbation.pdf" \
  -F "documentType=approbation" \
  -w "\nStatus: %{http_code}\n"

# Test 2: List documents
echo "2. Listing documents..."
curl $API_URL/api/doctor-documents \
  -H "Cookie: $SESSION_COOKIE" \
  -w "\nStatus: %{http_code}\n"

# Test 3: Get download URL
echo "3. Getting download URL..."
DOC_ID="uuid-from-step-1"
curl $API_URL/api/doctor-documents/$DOC_ID/download \
  -H "Cookie: $SESSION_COOKIE" \
  -w "\nStatus: %{http_code}\n"

echo "Tests complete!"
```

---

## Success Criteria

### ✅ Registration
- [ ] Doctor can register without license fields
- [ ] Form validation works (no license errors)
- [ ] Doctor record created with NULL license fields
- [ ] Countries array populated correctly

### ✅ Document Upload
- [ ] Can upload PDF (approbation)
- [ ] Can upload JPG (facharzturkunde)
- [ ] Can upload PNG (zusatzbezeichnung)
- [ ] File size validation works (>10MB rejected)
- [ ] File type validation works (.exe rejected)
- [ ] Files stored in Supabase bucket
- [ ] Database records created

### ✅ Document Access
- [ ] Doctor can list own documents
- [ ] Doctor can get download URL
- [ ] Signed URL works for download
- [ ] Doctor can delete own documents
- [ ] Doctor CANNOT access other doctor's docs

### ✅ Admin Verification
- [ ] Admin can approve documents
- [ ] Admin can reject with reason
- [ ] Verification status updates correctly
- [ ] Doctor CANNOT verify own documents

### ✅ Security
- [ ] Private bucket enforced (no direct access)
- [ ] Signed URLs expire after 1 hour
- [ ] Role-based access control works
- [ ] Patient cannot upload documents

---

## Troubleshooting

### Issue: "Authentication required" error
**Solution**: Make sure you're logged in and session cookie is included

### Issue: "Doctor access required" error
**Solution**: Make sure user role is 'doctor', not 'patient' or 'admin'

### Issue: File upload fails
**Solution**:
- Check file size (max 10MB)
- Check file type (PDF/JPG/PNG only)
- Check Supabase bucket exists
- Check SUPABASE_SERVICE_ROLE_KEY is set

### Issue: Signed URL doesn't work
**Solution**:
- Bucket must be private
- Check URL hasn't expired (1 hour)
- Check Supabase project is running

---

**Start testing!** 🚀

Go through each test systematically and report any failures.

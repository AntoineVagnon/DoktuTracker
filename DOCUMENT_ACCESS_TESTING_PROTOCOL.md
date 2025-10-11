# Document Access Control - Testing Protocol

## Overview
This document provides a comprehensive testing protocol to ensure proper access control for patient documents, GDPR compliance, and security.

## Security Requirements

### Core Access Rules
1. ✅ **Patients can only access their own documents**
2. ✅ **Doctors can only access documents attached to their appointments**
3. ✅ **Doctors cannot access documents from other doctors' appointments**
4. ✅ **Patient library documents are private to the patient**
5. ✅ **No cross-patient document access**

## Test Users Setup

Create the following test accounts:

### Patients
- **Patient 1**: `patient1-test@doktu.co` / `TestPassword123!`
- **Patient 2**: `patient2-test@doktu.co` / `TestPassword123!`

### Doctors
- **Doctor 1**: `doctor1-test@doktu.co` / `TestPassword123!`
- **Doctor 2**: `doctor2-test@doktu.co` / `TestPassword123!`

## Test Fixtures

Prepare these test documents:
- `test-medical-report.pdf` (any PDF file)
- `patient1-xray.pdf` (any PDF or image)
- `patient2-bloodwork.pdf` (any PDF)
- `patient1-insurance.pdf` (any PDF or image)

---

## Manual Testing Protocol

### Phase 1: Patient 1 - Library Documents

#### Test 1.1: Upload Document to Library
1. Login as **Patient 1**
2. Click on "Document Library" sidebar icon
3. Click "Upload" button in "Attach from Library" section
4. Select `test-medical-report.pdf`
5. ✅ Verify: Document appears in library with correct filename
6. ✅ Verify: Success toast "Document uploaded" appears
7. Logout

#### Test 1.2: Download Own Library Document
1. Login as **Patient 1**
2. Open "Document Library"
3. Click download icon on the uploaded document
4. ✅ Verify: Console shows `📥 [DOWNLOAD] Initiating download: https://web-production-b2ce.up.railway.app/api/download/...`
5. ✅ Verify: File downloads successfully
6. ✅ Verify: Downloaded file opens correctly
7. Logout

#### Test 1.3: Delete Own Library Document
1. Login as **Patient 1**
2. Open "Document Library"
3. Click delete (trash) icon on a document
4. ✅ Verify: Custom dialog appears (not browser confirm)
5. ✅ Verify: Dialog shows document filename
6. Click "Delete"
7. ✅ Verify: Document disappears from library
8. ✅ Verify: Success toast appears
9. Logout

---

### Phase 2: Patient 1 + Doctor 1 - Appointment Documents

#### Test 2.1: Book Appointment
1. Login as **Patient 1**
2. Navigate to "Book Appointment"
3. Select **Doctor 1**
4. Choose an available time slot
5. Complete booking
6. ✅ Verify: Appointment appears in dashboard
7. **Note the appointment ID** from URL or appointment card
8. Logout

#### Test 2.2: Upload Document to Appointment
1. Login as **Patient 1**
2. Click on the appointment with Doctor 1
3. Click "Upload Docs" button
4. Upload `patient1-xray.pdf` using "Files for this appointment" upload button
5. ✅ Verify: Console shows `📤 [LIBRARY-PANEL] Uploading document`
6. ✅ Verify: Console shows `📤 [LIBRARY-PANEL] Full URL: https://web-production-b2ce.up.railway.app/api/documents/upload`
7. ✅ Verify: Document appears in "Files for this appointment" section
8. ✅ Verify: Success toast appears
9. Logout

#### Test 2.3: Doctor 1 Accesses Appointment Documents
1. Login as **Doctor 1**
2. Navigate to "Appointments" (doctor view)
3. Click on the appointment with Patient 1
4. Open document library panel
5. ✅ Verify: `patient1-xray.pdf` is visible in appointment files
6. Click download on the document
7. ✅ Verify: Document downloads successfully
8. ✅ Check Railway logs: Should show doctor's access
9. Logout

#### Test 2.4: Doctor 1 CANNOT Access Patient 1 Library
1. Login as **Doctor 1**
2. Navigate to Patient 1's appointment
3. Open document library
4. ✅ Verify: Only appointment documents are visible
5. ✅ Verify: Patient 1's library documents are NOT visible
6. ✅ Verify: No library section appears for doctor
7. Logout

---

### Phase 3: Patient 2 - Isolation Tests

#### Test 3.1: Patient 2 Cannot See Patient 1 Documents
1. Login as **Patient 2**
2. Open "Document Library"
3. ✅ Verify: Library is empty OR only shows Patient 2's documents
4. ✅ Verify: `patient1-xray.pdf` is NOT visible
5. ✅ Verify: No Patient 1 documents appear anywhere
6. Logout

#### Test 3.2: Patient 2 Cannot Access Patient 1 Appointment
1. Login as **Patient 2**
2. Open browser DevTools Console
3. Try to navigate to Patient 1's appointment URL directly:
   - `https://doktu-tracker.vercel.app/dashboard?appointment=[Patient1-AppointmentID]`
4. ✅ Verify: Either redirected or "Access denied" message
5. ✅ Verify: No documents are visible
6. Logout

#### Test 3.3: Direct API Access Prevention
1. Login as **Patient 2**
2. Open browser DevTools Console
3. Try to fetch Patient 1's documents directly:
   ```javascript
   fetch('https://web-production-b2ce.up.railway.app/api/documents/[Patient1-AppointmentID]')
     .then(r => console.log(r.status))
   ```
4. ✅ Verify: Returns 403 Forbidden or 404 Not Found
5. ✅ Check Railway logs: Should log unauthorized access attempt
6. Logout

---

### Phase 4: Patient 2 + Doctor 2 - Cross-Doctor Isolation

#### Test 4.1: Patient 2 Books with Doctor 2
1. Login as **Patient 2**
2. Book appointment with **Doctor 2**
3. Upload `patient2-bloodwork.pdf` to the appointment
4. ✅ Verify: Document uploads successfully
5. **Note the appointment ID**
6. Logout

#### Test 4.2: Doctor 2 Accesses Only Their Appointment
1. Login as **Doctor 2**
2. Navigate to appointments
3. Open Patient 2's appointment
4. Open document library
5. ✅ Verify: `patient2-bloodwork.pdf` is visible
6. ✅ Verify: `patient1-xray.pdf` is NOT visible
7. ✅ Verify: Only documents from their own appointments appear
8. Logout

#### Test 4.3: Doctor 2 CANNOT Access Doctor 1 Appointments
1. Login as **Doctor 2**
2. Try to navigate to Doctor 1's appointment:
   - `https://doktu-tracker.vercel.app/doctor/appointments/[Doctor1-AppointmentID]`
3. ✅ Verify: Access denied or redirected
4. Open DevTools Console and try API call:
   ```javascript
   fetch('https://web-production-b2ce.up.railway.app/api/documents/[Doctor1-AppointmentID]')
     .then(r => console.log(r.status))
   ```
5. ✅ Verify: Returns 403 Forbidden
6. ✅ Check Railway logs: Unauthorized attempt logged
7. Logout

#### Test 4.4: Doctor 1 CANNOT Access Doctor 2 Appointments
1. Login as **Doctor 1**
2. Try to access Doctor 2's appointment (Patient 2)
3. ✅ Verify: Access denied
4. Try direct API call to Patient 2's documents
5. ✅ Verify: Returns 403 Forbidden
6. Logout

---

### Phase 5: Document Attachment & Import

#### Test 5.1: Attach Library Document to Appointment
1. Login as **Patient 1**
2. Upload `patient1-insurance.pdf` to library (if not already there)
3. Navigate to Doctor 1 appointment
4. Open document library
5. In "Attach from Library" section, find `patient1-insurance.pdf`
6. Click paperclip/attach icon
7. ✅ Verify: Success toast "Document attached"
8. ✅ Verify: Document now appears in "Files for this appointment"
9. Logout

#### Test 5.2: Doctor Can Access Attached Library Document
1. Login as **Doctor 1**
2. Navigate to Patient 1's appointment
3. Open documents
4. ✅ Verify: `patient1-insurance.pdf` is now visible
5. Download the document
6. ✅ Verify: Download succeeds
7. Logout

#### Test 5.3: Import Appointment Document to Library
1. Login as **Patient 1**
2. Navigate to appointment with Doctor 1
3. Find `patient1-xray.pdf` in appointment files
4. Click archive/import icon
5. ✅ Verify: Success toast "Document imported"
6. Navigate to library
7. ✅ Verify: `patient1-xray.pdf` now appears in library
8. ✅ Verify: Document can be reused for other appointments
9. Logout

---

### Phase 6: GDPR Compliance - Data Deletion

#### Test 6.1: Delete Appointment Document
1. Login as **Patient 1**
2. Navigate to appointment
3. Click delete on an appointment document
4. Confirm deletion in dialog
5. ✅ Verify: Document removed from appointment
6. ✅ Verify: Success toast appears
7. Logout

#### Test 6.2: Deleted Document Inaccessible to Doctor
1. Login as **Doctor 1**
2. Navigate to Patient 1's appointment
3. ✅ Verify: Deleted document is no longer visible
4. ✅ Verify: Document count decreased
5. Try to download using old document ID (if known)
6. ✅ Verify: Returns 404 Not Found
7. Logout

#### Test 6.3: Deleted Document Removed from Supabase
1. Login to Supabase Dashboard
2. Navigate to Storage → `patient-documents` bucket
3. Browse to Patient 1's folder (222/...)
4. ✅ Verify: Deleted file is no longer in storage
5. ✅ Verify: Right to be forgotten implemented

---

### Phase 7: Security & Audit Tests

#### Test 7.1: Unauthenticated Access Prevention
1. Open incognito/private browser window
2. Try to access document download URL directly:
   - Copy a document download URL from previous tests
   - `https://web-production-b2ce.up.railway.app/api/download/[document-id]`
3. ✅ Verify: Returns 401 Unauthorized or redirects to login
4. Try to access documents list:
   - `https://web-production-b2ce.up.railway.app/api/documents`
5. ✅ Verify: Returns 401 Unauthorized

#### Test 7.2: Session Validation
1. Login as **Patient 1**
2. Copy a document download URL
3. Logout
4. Try to access the copied URL
5. ✅ Verify: Access denied (session expired)
6. ✅ Verify: Redirected to login

#### Test 7.3: Audit Logging
1. Perform various document operations (upload, download, delete)
2. Check Railway logs for audit trail
3. ✅ Verify: All operations are logged with:
   - Timestamp
   - User ID
   - Action type (upload/download/delete)
   - Document ID
   - Success/failure status
4. ✅ Verify: Unauthorized attempts are logged

#### Test 7.4: CORS & Origin Validation
1. Open browser DevTools Console on a different domain
2. Try to make API request:
   ```javascript
   fetch('https://web-production-b2ce.up.railway.app/api/documents', {
     credentials: 'include'
   }).then(r => console.log(r.status))
   ```
3. ✅ Verify: CORS blocks the request
4. ✅ Verify: Only Vercel domain is allowed

---

## Expected Railway Log Patterns

### Successful Upload
```
🔒 GDPR-compliant document upload request received
📤 Uploading to Supabase Storage: { fileName: '...', size: ..., userId: ... }
✅ File uploaded to Supabase Storage: 222/uuid.pdf
✅ GDPR-compliant document saved: { id: '...', encrypted: true }
[RES] POST /api/documents/upload -> 200
```

### Successful Download
```
✅ DOWNLOAD ROUTE - DocumentId: [id]
📄 Document found: { fileName: '...', fileType: '...', uploadUrl: '...' }
[RES] GET /api/download/[id] -> 200
```

### Unauthorized Access Attempt
```
Auth middleware - Session check: { hasAuthHeader: false }
[RES] GET /api/documents/[id] -> 401
```

### Forbidden Access (Wrong User)
```
Auth middleware - User validated: patient2@gmail.com
❌ Access denied - Document owner mismatch
[RES] GET /api/download/[id] -> 403
```

---

## Supabase Storage Verification

### Check Storage Structure
1. Login to Supabase Dashboard
2. Go to Storage → `patient-documents` bucket
3. ✅ Verify folder structure:
   ```
   patient-documents/
   ├── 222/  (Patient 1 ID)
   │   ├── uuid1.pdf
   │   ├── uuid2.png
   │   └── ...
   └── 223/  (Patient 2 ID)
       ├── uuid3.pdf
       └── ...
   ```
4. ✅ Verify: Each patient has separate folder
5. ✅ Verify: No cross-contamination

### Check Bucket Settings
1. Navigate to bucket settings
2. ✅ Verify: Bucket is **Private** (not public)
3. ✅ Verify: No public access policies
4. ✅ Verify: Only service role can access

---

## Automated Test Execution

To run the automated Playwright tests:

```bash
# Install dependencies
npm install

# Run all document access control tests
npx playwright test document-access-control.spec.ts

# Run with UI mode for debugging
npx playwright test document-access-control.spec.ts --ui

# Run specific test suite
npx playwright test -g "Patient 1 - Document Upload"

# Generate HTML report
npx playwright test document-access-control.spec.ts --reporter=html
```

---

## Pass/Fail Criteria

### ✅ PASS: All tests must pass
- All uploads succeed with proper auth
- Downloads work for authorized users only
- 403/404 returned for unauthorized access
- Documents properly isolated by patient and appointment
- Doctors only see their appointment documents
- Deletion removes files from storage and database
- Audit logs record all operations

### ❌ FAIL: If any of these occur
- Cross-patient document access
- Cross-doctor appointment access
- Unauthenticated access succeeds
- Documents not deleted from Supabase
- Missing audit logs
- Doctor can see patient library
- Browser confirm dialog appears (should be custom UI)

---

## Security Checklist

- [ ] Patients can only access their own documents
- [ ] Doctors can only access documents from their appointments
- [ ] No cross-patient access possible
- [ ] No cross-doctor appointment access possible
- [ ] Unauthenticated requests return 401
- [ ] Unauthorized requests return 403
- [ ] Deleted documents removed from storage
- [ ] All operations are audit logged
- [ ] CORS configured correctly
- [ ] Session validation working
- [ ] Supabase bucket is private
- [ ] Documents encrypted at rest
- [ ] HTTPS enforced for all requests

---

## GDPR Compliance Checklist

- [ ] Right to access: Patients can view their documents
- [ ] Right to download: Patients can download their data
- [ ] Right to be forgotten: Deletion removes from storage
- [ ] Data minimization: Only necessary data stored
- [ ] Purpose limitation: Documents only used for healthcare
- [ ] Storage limitation: Documents can be deleted
- [ ] Integrity and confidentiality: Encryption + access control
- [ ] Accountability: Audit logs for all access
- [ ] Data portability: Download feature available
- [ ] Consent management: Upload is explicit action

---

## Troubleshooting

### Upload Fails with 500
- Check Railway logs for error details
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Verify bucket `patient-documents` exists
- Check Supabase Storage quotas

### Download Returns 404
- Verify document exists in database
- Check Supabase Storage for file
- Verify file path format: `userId/uuid.ext`
- Check user has access rights

### 403 Forbidden When Should Work
- Check user authentication status
- Verify appointment ownership
- Check doctor assignment to appointment
- Review Railway auth logs

### Browser Confirm Dialog Appears
- Frontend code not deployed
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Check Vercel deployment status

---

## Post-Testing Actions

After completing all tests:

1. **Document Results**: Note any failures or issues
2. **Review Logs**: Check Railway logs for anomalies
3. **Security Review**: Ensure no security gaps found
4. **Performance Check**: Verify upload/download speeds acceptable
5. **User Feedback**: Note any UX improvements needed
6. **GDPR Audit**: Confirm all compliance requirements met
7. **Cleanup**: Delete test accounts and documents (optional)

---

## Continuous Monitoring

### Production Monitoring
- Monitor Railway logs for unauthorized access attempts
- Set up alerts for 403/404 spikes
- Review Supabase Storage usage
- Track document upload/download metrics
- Audit logs regular review schedule

### Monthly Security Audit
- Review access control rules
- Test with new user accounts
- Verify GDPR compliance
- Check for security updates
- Review and update test protocol

---

**Last Updated**: 2025-10-11
**Test Protocol Version**: 1.0
**GDPR Compliant**: ✅
**Security Reviewed**: ✅

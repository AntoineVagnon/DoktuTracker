# Next Session: Complete Doctor Documents System

## Current Status (End of This Session)

### ✅ Phase 1 Completed:
1. **Database**:
   - ✅ Created `doctor_documents` table via migration
   - ✅ Added indexes for performance
   - ✅ Added `documents_uploaded_at` to doctors table
   - ✅ Updated TypeScript schema with proper types

2. **Backend Services**:
   - ✅ Created `DoctorDocumentsService` in `server/services/doctorDocumentsService.ts`
     - Upload documents (approbation, facharzturkunde, zusatzbezeichnung)
     - Get/delete documents
     - Verify/reject documents (admin)
     - Check document completeness
     - Access control
   - ✅ Updated `SupabaseStorageService` to support custom buckets

3. **Files Created**:
   - `migrations/add-doctor-documents.sql`
   - `server/services/doctorDocumentsService.ts`
   - `run-doctor-documents-migration.mjs`
   - `DOCTOR_DOCUMENTS_MIGRATION_PLAN.md`

## Next Session TODO List

### Priority 1: Complete Backend (Phase 1)

#### 1. Create Doctor Documents API Routes
**File**: `server/routes/doctorDocuments.ts` (NEW)
- `POST /api/doctor-documents/upload` - Upload document with multer
- `GET /api/doctor-documents` - Get doctor's documents
- `GET /api/doctor-documents/:documentId` - Get specific document
- `DELETE /api/doctor-documents/:documentId` - Delete document
- `GET /api/doctor-documents/:documentId/download` - Download with signed URL
- `PATCH /api/doctor-documents/:documentId/verify` - Admin verify/reject

**Key Points**:
- Use `multer` for file upload middleware
- Validate user is authenticated doctor
- Check file size and type
- Return proper error messages

#### 2. Register Routes in Main Router
**File**: `server/routes.ts`
- Import and register doctorDocuments routes
- Apply authentication middleware

#### 3. Update Doctor Registration
**File**: `server/routes/doctorRegistration.ts`
- **REMOVE**:
  - `licenseNumber` validation
  - `licenseExpirationDate` validation
  - Both fields from request body handling
- **UPDATE**:
  - Success message to mention document upload
  - Validation schema

#### 4. Update Admin Doctor Management
**File**: `server/routes/adminDoctorManagement.ts`
- Add document status to doctor list response
- Add endpoint to get doctor documents
- Add endpoint to verify documents
- Include document counts in statistics

#### 5. Update Doctor Dashboard
**File**: `server/routes/doctorDashboard.ts`
- Add document status to profile data
- Add document completeness check

### Priority 2: Frontend Components (Phase 2)

#### 1. Create Document Upload Component
**File**: `client/src/components/DoctorDocumentUpload.tsx` (NEW)
```typescript
interface Props {
  documentType: 'approbation' | 'facharzturkunde' | 'zusatzbezeichnung';
  required: boolean;
  currentDocument?: DoctorDocument;
  onUploadSuccess: (doc: DoctorDocument) => void;
  onDelete: (docId: string) => void;
}
```

Features:
- Drag-and-drop file upload
- File type validation (PDF, JPG, PNG)
- Size validation (max 10MB)
- Upload progress
- Preview uploaded document
- Show verification status with badges
- Delete/replace functionality

#### 2. Create Documents Management Page
**File**: `client/src/pages/DoctorDocuments.tsx` (NEW)
- List all three document types
- Show upload status for each
- Display verification status
- Allow re-upload if rejected
- Show rejection reasons

#### 3. Update Doctor Signup Form
**File**: `client/src/pages/DoctorSignup.tsx`
- **Step 2 - REMOVE**:
  - License Number input field
  - License Expiration Date picker
  - All related validation
- **Step 2 - ADD**:
  - Info card about documents needed after signup
  - List: Approbationsurkunde, Facharzturkunde

#### 4. Update Doctor Success Page
**File**: `client/src/pages/DoctorSignupSuccess.tsx`
- Update document requirements section
- Change from "Medical License Copy" to specific documents:
  - Approbationsurkunde (required)
  - Facharzturkunde (required)
  - Zusatzbezeichnung (optional)

#### 5. Update Doctor Dashboard
**File**: `client/src/pages/DoctorDashboard.tsx`
- Add "Documents" tab/section
- Show document upload alerts if missing
- Include in profile completion percentage

#### 6. Update Admin Dashboard
**File**: `client/src/pages/AdminDashboard.tsx`
- Add "Documents" column to doctor table showing status
- Create document verification modal:
  - Preview documents
  - Verify or reject with reason
  - Track verification history

### Priority 3: Translations (Phase 2)

#### Add Translation Keys

**File**: `client/src/locales/en/doctors.json`
Add entire `documents` section (see DOCTOR_DOCUMENTS_MIGRATION_PLAN.md for full keys)

**File**: `client/src/locales/bs/doctors.json`
Add Bosnian translations for all document keys

### Priority 4: Testing & Deployment (Phase 3)

1. **Create Supabase Bucket**:
   ```sql
   -- Run in Supabase SQL editor
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('doctor-documents', 'doctor-documents', false);
   ```

2. **Set RLS Policies** (if using Supabase Storage):
   - Only authenticated users can upload to their own folder
   - Only admins can view all documents
   - No public access

3. **Test Flow**:
   - [ ] Doctor signs up (without license fields)
   - [ ] Doctor uploads Approbationsurkunde
   - [ ] Doctor uploads Facharzturkunde
   - [ ] Doctor uploads Zusatzbezeichnung (optional)
   - [ ] Admin sees documents in dashboard
   - [ ] Admin can preview/download documents
   - [ ] Admin can verify documents
   - [ ] Admin can reject with reason
   - [ ] Doctor sees verification status
   - [ ] Doctor can re-upload rejected documents

4. **Deploy**:
   - Commit all changes
   - Push to GitHub
   - Railway auto-deploys
   - Verify production works

## Implementation Order

**Session 2 (Next):**
1. ✅ Create API routes (30 min)
2. ✅ Update registration to remove license fields (15 min)
3. ✅ Create upload component (45 min)
4. ✅ Update signup form (20 min)
5. ✅ Add translations (20 min)
6. ✅ Test and commit (20 min)

**Session 3:**
1. Create documents management page
2. Update admin dashboard
3. Update doctor dashboard
4. Full end-to-end testing

## Quick Reference

### Document Types
- `approbation` - Approbationsurkunde (mandatory)
- `facharzturkunde` - Facharzturkunde (mandatory)
- `zusatzbezeichnung` - Zusatzbezeichnung (optional)

### Verification Statuses
- `pending` - Awaiting admin review
- `verified` - Approved by admin
- `rejected` - Rejected with reason
- `expired` - Document has expired

### File Validations
- **Types**: PDF, JPG, PNG
- **Max Size**: 10MB
- **Storage**: Supabase bucket `doctor-documents`
- **Path**: `{doctorId}/{documentType}/{uuid}.{ext}`

## Notes
- License number and expiration fields kept in database for backward compatibility
- Marked as DEPRECATED in schema
- Hidden from all UI
- Can be dropped in future migration after full transition

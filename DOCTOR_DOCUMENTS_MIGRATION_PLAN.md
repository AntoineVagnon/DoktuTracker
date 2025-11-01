# Doctor Documents Migration Plan

## Overview
Replace license number and expiration date fields with German medical document uploads system.

**Required Documents:**
- **Approbationsurkunde** (Mandatory) - Medical license document
- **Facharzturkunde** (Mandatory) - Specialist certification
- **Zusatzbezeichnung** (Optional) - Additional qualifications

## Database Changes

### ✅ Completed
1. Created migration SQL file: `migrations/add-doctor-documents.sql`
2. Added `doctorDocuments` table to `shared/schema.ts`
3. Added Zod schemas for doctorDocuments

### 📋 Pending - Run Migration
```bash
# Connect to Supabase and run the migration
psql <database_connection_string> < migrations/add-doctor-documents.sql
```

## Backend Changes Required

### 1. File Upload Service
**File:** `server/services/documentUploadService.ts` (NEW)
- Create document upload handler
- Support PDF, JPG, PNG file types
- Max file size: 10MB per document
- Store in Supabase Storage or local uploads directory
- Generate secure file names with UUIDs

### 2. Doctor Document Routes
**File:** `server/routes/doctorDocuments.ts` (NEW)
- `POST /api/doctor-documents/upload` - Upload document
- `GET /api/doctor-documents/:doctorId` - Get all documents for a doctor
- `DELETE /api/doctor-documents/:documentId` - Delete document
- `PATCH /api/doctor-documents/:documentId/verify` - Admin verify document

### 3. Update Doctor Registration Route
**File:** `server/routes/doctorRegistration.ts`
- Remove `licenseNumber` and `licenseExpirationDate` validation
- Update registration to not require these fields
- Update success response to guide users to upload documents

### 4. Update Admin Doctor Management
**File:** `server/routes/adminDoctorManagement.ts`
- Add endpoint to view doctor documents
- Add endpoint to verify/reject documents
- Include document status in doctor list API

### 5. Update Doctor Dashboard Routes
**File:** `server/routes/doctorDashboard.ts`
- Add endpoint to upload documents
- Add endpoint to check document status
- Add endpoint to re-upload rejected documents

## Frontend Changes Required

### 1. Create Document Upload Component
**File:** `client/src/components/DoctorDocumentUpload.tsx` (NEW)
```typescript
interface DoctorDocumentUploadProps {
  documentType: 'approbation' | 'facharzturkunde' | 'zusatzbezeichnung';
  required: boolean;
  onUploadSuccess: (document: DoctorDocument) => void;
}
```

### 2. Update Doctor Registration Form
**File:** `client/src/pages/DoctorSignup.tsx`
- **Step 2: Remove**:
  - License Number field
  - License Expiration Date picker
- **Step 2: Add**:
  - Info message about document upload requirements
  - "Documents will be uploaded after account creation" notice

### 3. Create Doctor Documents Page
**File:** `client/src/pages/DoctorDocuments.tsx` (NEW)
- Show upload status for each document type
- Upload interface for each required document
- Display uploaded documents with preview
- Show verification status (pending/verified/rejected)
- Allow re-upload if rejected

### 4. Update Doctor Dashboard
**File:** `client/src/pages/DoctorDashboard.tsx`
- Add "Documents" section to sidebar/navigation
- Show document upload status in profile completion
- Alert if documents are missing or rejected

### 5. Update Admin Dashboard
**File:** `client/src/pages/AdminDashboard.tsx`
- Add "Documents" column to doctor list showing status
- Add document verification interface when viewing doctor details
- Show document preview/download links
- Add verify/reject buttons with reason textarea

### 6. Update Doctor Success Page
**File:** `client/src/pages/DoctorSignupSuccess.tsx`
- Update document requirements list to show new document types
- Change text from "Medical License Copy" to specific German documents
- Update translations

## Translation Updates

### English (`client/src/locales/en/doctors.json`)
```json
{
  "documents": {
    "title": "Medical Credentials",
    "approbation": {
      "title": "Approbationsurkunde",
      "description": "Medical license document (required)",
      "required": true
    },
    "facharzturkunde": {
      "title": "Facharzturkunde",
      "description": "Specialist certification (required)",
      "required": true
    },
    "zusatzbezeichnung": {
      "title": "Zusatzbezeichnung",
      "description": "Additional qualifications (optional)",
      "required": false
    },
    "upload": {
      "button": "Upload Document",
      "drag": "Drag and drop or click to upload",
      "formats": "PDF, JPG, PNG (max 10MB)",
      "success": "Document uploaded successfully",
      "error": "Upload failed. Please try again."
    },
    "status": {
      "pending": "Pending verification",
      "verified": "Verified",
      "rejected": "Rejected",
      "missing": "Not uploaded"
    }
  }
}
```

### Bosnian (`client/src/locales/bs/doctors.json`)
```json
{
  "documents": {
    "title": "Medicinske vjerodajnice",
    "approbation": {
      "title": "Approbationsurkunde",
      "description": "Dokument medicinske licence (obavezan)",
      "required": true
    },
    "facharzturkunde": {
      "title": "Facharzturkunde",
      "description": "Certifikat specijalizacije (obavezan)",
      "required": true
    },
    "zusatzbezeichnung": {
      "title": "Zusatzbezeichnung",
      "description": "Dodatne kvalifikacije (opciono)",
      "required": false
    },
    "upload": {
      "button": "Otpremi dokument",
      "drag": "Prevucite i ispustite ili kliknite za otpremanje",
      "formats": "PDF, JPG, PNG (maks 10MB)",
      "success": "Dokument uspješno otpremljen",
      "error": "Otpremanje nije uspjelo. Pokušajte ponovo."
    },
    "status": {
      "pending": "Na čekanju verifikacije",
      "verified": "Verifikovan",
      "rejected": "Odbijen",
      "missing": "Nije otpremljen"
    }
  }
}
```

## Security Considerations

1. **File Validation**:
   - Check MIME types on backend
   - Scan for malware
   - Verify file sizes
   - Sanitize filenames

2. **Access Control**:
   - Only doctor can upload their own documents
   - Only admin can view/verify documents
   - Documents not visible to patients

3. **Storage**:
   - Store files with UUID filenames
   - Organize by doctor ID in folders
   - Use secure storage with encryption at rest

## Migration Steps

### Phase 1: Backend Infrastructure
1. ✅ Create database migration
2. ✅ Update schema.ts
3. ⏳ Create document upload service
4. ⏳ Create document API routes
5. ⏳ Update existing routes

### Phase 2: Frontend Components
6. ⏳ Create upload component
7. ⏳ Create documents management page
8. ⏳ Update registration form
9. ⏳ Update admin dashboard
10. ⏳ Update doctor dashboard

### Phase 3: Testing & Deployment
11. ⏳ Test document upload flow
12. ⏳ Test admin verification flow
13. ⏳ Test existing doctor accounts
14. ⏳ Run database migration in production
15. ⏳ Deploy changes

## Backward Compatibility

- Keep `licenseNumber` and `licenseExpirationDate` columns in database
- Mark as DEPRECATED in schema
- Hide in all UI
- Can be dropped in future migration after data migration complete
- Existing doctors should upload new documents

## Testing Checklist

- [ ] Doctor can upload Approbationsurkunde
- [ ] Doctor can upload Facharzturkunde
- [ ] Doctor can upload Zusatzbezeichnung (optional)
- [ ] Cannot upload documents > 10MB
- [ ] Cannot upload invalid file types
- [ ] Documents show in admin dashboard
- [ ] Admin can verify documents
- [ ] Admin can reject documents with reason
- [ ] Doctor can re-upload rejected documents
- [ ] Doctor cannot upload without being logged in
- [ ] Admin cannot see patient documents
- [ ] Document URLs are secure

## File Upload Implementation Notes

### Storage Options
1. **Local Storage** (Development):
   - Store in `uploads/doctor-documents/{doctorId}/`
   - Serve via Express static middleware with authentication

2. **Supabase Storage** (Production - Recommended):
   - Bucket: `doctor-documents`
   - Path: `{doctorId}/{documentType}/{uuid}.{ext}`
   - Enable RLS policies
   - Private bucket with signed URLs

3. **AWS S3** (Alternative):
   - Bucket with private access
   - Pre-signed URLs for viewing
   - Lifecycle policies for old documents

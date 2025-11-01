import { Router } from 'express';
import multer from 'multer';
import { doctorDocumentsService } from '../services/doctorDocumentsService';
import type { Request, Response } from 'express';

export const doctorDocumentsRouter = Router();

// Configure multer for memory storage (files stored in memory as Buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept only PDF, JPG, PNG
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, and PNG files are allowed.'));
    }
  }
});

/**
 * Middleware to ensure user is authenticated
 */
function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

/**
 * Middleware to ensure user is a doctor
 */
function requireDoctor(req: Request, res: Response, next: Function) {
  if (!req.user || req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Doctor access required' });
  }
  next();
}

/**
 * Middleware to ensure user is an admin
 */
function requireAdmin(req: Request, res: Response, next: Function) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * POST /api/doctor-documents/upload
 * Upload a doctor document (Approbationsurkunde, Facharzturkunde, or Zusatzbezeichnung)
 *
 * Required: Authentication as doctor
 * Body: multipart/form-data with:
 *   - file: The document file (PDF, JPG, or PNG, max 10MB)
 *   - documentType: 'approbation' | 'facharzturkunde' | 'zusatzbezeichnung'
 */
doctorDocumentsRouter.post('/upload', requireAuth, requireDoctor, upload.single('file'), async (req, res) => {
  try {
    const { documentType } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!documentType) {
      return res.status(400).json({ error: 'Document type is required' });
    }

    // Validate document type
    const validDocumentTypes = ['approbation', 'facharzturkunde', 'zusatzbezeichnung'];
    if (!validDocumentTypes.includes(documentType)) {
      return res.status(400).json({
        error: `Invalid document type. Must be one of: ${validDocumentTypes.join(', ')}`
      });
    }

    // Get doctor ID from authenticated user
    const doctorId = req.user.doctorId;
    if (!doctorId) {
      return res.status(400).json({ error: 'Doctor profile not found for user' });
    }

    // Upload document
    const document = await doctorDocumentsService.uploadDocument(
      doctorId,
      documentType as 'approbation' | 'facharzturkunde' | 'zusatzbezeichnung',
      {
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size
      }
    );

    res.status(201).json({
      message: 'Document uploaded successfully',
      document: {
        id: document.id,
        documentType: document.documentType,
        fileName: document.originalFileName,
        fileSize: document.fileSize,
        uploadedAt: document.uploadedAt,
        verificationStatus: document.verificationStatus
      }
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to upload document'
    });
  }
});

/**
 * GET /api/doctor-documents
 * Get all documents for the authenticated doctor
 *
 * Required: Authentication as doctor
 */
doctorDocumentsRouter.get('/', requireAuth, requireDoctor, async (req, res) => {
  try {
    const doctorId = req.user.doctorId;
    if (!doctorId) {
      return res.status(400).json({ error: 'Doctor profile not found for user' });
    }

    const documents = await doctorDocumentsService.getDoctorDocuments(doctorId);

    res.json({
      documents: documents.map(doc => ({
        id: doc.id,
        documentType: doc.documentType,
        fileName: doc.originalFileName,
        fileSize: doc.fileSize,
        uploadedAt: doc.uploadedAt,
        verificationStatus: doc.verificationStatus,
        verifiedAt: doc.verifiedAt,
        rejectionReason: doc.rejectionReason,
        issueDate: doc.issueDate,
        expiryDate: doc.expiryDate
      }))
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve documents'
    });
  }
});

/**
 * GET /api/doctor-documents/:id
 * Get a specific document by ID
 *
 * Required: Authentication (doctor owns document OR admin)
 */
doctorDocumentsRouter.get('/:id', requireAuth, async (req, res) => {
  try {
    const documentId = req.params.id;
    const document = await doctorDocumentsService.getDocument(documentId);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check access: doctor must own document OR user must be admin
    const isOwner = req.user.doctorId && document.doctorId === req.user.doctorId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      document: {
        id: document.id,
        documentType: document.documentType,
        fileName: document.originalFileName,
        fileSize: document.fileSize,
        uploadedAt: document.uploadedAt,
        verificationStatus: document.verificationStatus,
        verifiedAt: document.verifiedAt,
        rejectionReason: document.rejectionReason,
        issueDate: document.issueDate,
        expiryDate: document.expiryDate,
        issuingAuthority: document.issuingAuthority,
        documentNumber: document.documentNumber
      }
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve document'
    });
  }
});

/**
 * GET /api/doctor-documents/:id/download
 * Get a signed URL to download a document
 *
 * Required: Authentication (doctor owns document OR admin)
 */
doctorDocumentsRouter.get('/:id/download', requireAuth, async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get signed URL (access control handled in service)
    const signedUrl = await doctorDocumentsService.getDocumentUrl(
      documentId,
      userId,
      userRole
    );

    res.json({
      url: signedUrl,
      expiresIn: 3600 // 1 hour
    });
  } catch (error) {
    console.error('Download URL error:', error);

    if (error instanceof Error && error.message === 'Access denied') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (error instanceof Error && error.message === 'Document not found') {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate download URL'
    });
  }
});

/**
 * DELETE /api/doctor-documents/:id
 * Delete a document
 *
 * Required: Authentication as doctor (owns document)
 */
doctorDocumentsRouter.delete('/:id', requireAuth, requireDoctor, async (req, res) => {
  try {
    const documentId = req.params.id;
    const doctorId = req.user.doctorId;

    if (!doctorId) {
      return res.status(400).json({ error: 'Doctor profile not found for user' });
    }

    await doctorDocumentsService.deleteDocument(documentId, doctorId);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);

    if (error instanceof Error && error.message === 'Document not found or access denied') {
      return res.status(404).json({ error: 'Document not found or access denied' });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete document'
    });
  }
});

/**
 * PATCH /api/doctor-documents/:id/verify
 * Verify or reject a document (admin only)
 *
 * Required: Authentication as admin
 * Body:
 *   - verified: boolean (true = verify, false = reject)
 *   - rejectionReason?: string (required if verified = false)
 */
doctorDocumentsRouter.patch('/:id/verify', requireAuth, requireAdmin, async (req, res) => {
  try {
    const documentId = req.params.id;
    const { verified, rejectionReason } = req.body;

    if (typeof verified !== 'boolean') {
      return res.status(400).json({ error: 'verified field is required (boolean)' });
    }

    if (!verified && !rejectionReason) {
      return res.status(400).json({ error: 'rejectionReason is required when rejecting a document' });
    }

    const document = await doctorDocumentsService.verifyDocument(
      documentId,
      req.user.id,
      verified,
      rejectionReason
    );

    res.json({
      message: verified ? 'Document verified successfully' : 'Document rejected',
      document: {
        id: document.id,
        documentType: document.documentType,
        verificationStatus: document.verificationStatus,
        verifiedBy: document.verifiedBy,
        verifiedAt: document.verifiedAt,
        rejectionReason: document.rejectionReason
      }
    });
  } catch (error) {
    console.error('Verify document error:', error);

    if (error instanceof Error && error.message === 'Document not found') {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to verify document'
    });
  }
});

/**
 * GET /api/doctor-documents/doctor/:doctorId/completeness
 * Check if a doctor has all required documents uploaded and verified
 *
 * Required: Authentication (accessing own profile OR admin)
 */
doctorDocumentsRouter.get('/doctor/:doctorId/completeness', requireAuth, async (req, res) => {
  try {
    const doctorId = parseInt(req.params.doctorId);

    // Check access: accessing own profile OR admin
    const isOwnProfile = req.user.doctorId === doctorId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const completeness = await doctorDocumentsService.checkDocumentCompleteness(doctorId);

    res.json({
      complete: completeness.complete,
      missing: completeness.missing,
      pending: completeness.pending,
      rejected: completeness.rejected
    });
  } catch (error) {
    console.error('Check completeness error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to check document completeness'
    });
  }
});

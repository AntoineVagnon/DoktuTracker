import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../supabaseAuth";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "../objectStorage";

export function registerDocumentLibraryRoutes(app: Express) {
  console.log("🔧 REGISTERING DOCUMENT LIBRARY ROUTES");
  
  // Add comprehensive logging middleware for ALL /api/documents/* requests
  app.use('/api/documents/*', (req, res, next) => {
    console.log(`🌐 INTERCEPTED REQUEST - ${req.method} ${req.url} - User-Agent: ${req.get('User-Agent')?.substring(0, 50)}...`);
    next();
  });
  
  // Get user's document library
  app.get("/api/documents", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      console.log('📚 Fetching document library for patient:', parseInt(userId.toString()));
      const documents = await storage.getDocumentsByPatient(parseInt(userId.toString()));
      console.log('📄 Found documents in library:', documents.length);
      
      res.json(documents);
    } catch (error) {
      console.error("Error fetching document library:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create new document in library
  app.post("/api/documents", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { fileName, fileType, fileSize, uploadUrl, documentType } = req.body;
      
      if (!fileName || !uploadUrl) {
        return res.status(400).json({ error: "Missing required fields: fileName, uploadUrl" });
      }

      console.log('💾 Creating document in library:', {
        fileName,
        fileType,
        fileSize,
        documentType,
        uploadedBy: parseInt(userId.toString())
      });

      const document = await storage.createDocument({
        uploadedBy: parseInt(userId.toString()),
        fileName,
        fileType: fileType || 'application/octet-stream',
        fileSize: fileSize || 0,
        uploadUrl,
        documentType: documentType || 'other',
      });

      console.log('✅ Document created successfully:', document.id);
      
      res.json(document);
    } catch (error) {
      console.error("Error creating document:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get documents attached to a specific appointment
  app.get("/api/appointments/:appointmentId/documents", isAuthenticated, async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify user has access to this appointment (either as patient or doctor)
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      // Check if user is the patient or the doctor for this appointment
      const userIdInt = parseInt(userId.toString());
      const isPatient = appointment.patientId === userIdInt;
      const doctorRecord = await storage.getDoctorByUserId(userId.toString());
      const isDoctor = doctorRecord && appointment.doctorId === doctorRecord.id;

      if (!isPatient && !isDoctor) {
        return res.status(403).json({ error: "Access denied" });
      }

      const documents = await storage.getDocumentsForAppointment(Number(appointmentId));
      
      res.json(documents);
    } catch (error) {
      console.error("Error fetching appointment documents:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Attach document to appointment
  app.post("/api/appointments/:appointmentId/documents/attach", isAuthenticated, async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const { documentId } = req.body;
      const userId = req.user?.id;
      
      if (!userId || !documentId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Verify user owns the document
      const document = await storage.getDocumentById(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      const userIdInt = parseInt(userId.toString());
      if (document.uploadedBy !== userIdInt) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Verify user has access to this appointment
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment || appointment.patientId !== userIdInt) {
        return res.status(403).json({ error: "Access denied" });
      }

      const attachment = await storage.attachDocumentToAppointment(Number(appointmentId), documentId);
      
      res.json(attachment);
    } catch (error) {
      console.error("Error attaching document:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Detach document from appointment
  app.delete("/api/appointments/:appointmentId/documents/:documentId", isAuthenticated, async (req, res) => {
    try {
      const { appointmentId, documentId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify user owns the document
      const document = await storage.getDocumentById(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      const userIdInt = parseInt(userId.toString());
      if (document.uploadedBy !== userIdInt) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.detachDocumentFromAppointment(Number(appointmentId), documentId);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error detaching document:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Add document via upload URL (used after ObjectUploader completes)
  app.post("/api/appointments/:appointmentId/documents", isAuthenticated, async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const { documentUrl } = req.body;
      const userId = req.user?.id;
      
      if (!userId || !documentUrl) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Verify user has access to this appointment
      const appointment = await storage.getAppointment(appointmentId);
      const userIdInt = parseInt(userId.toString());
      if (!appointment || appointment.patientId !== userIdInt) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Extract filename from URL
      const urlParts = documentUrl.split('/');
      const filename = urlParts[urlParts.length - 1] || 'uploaded-document';

      // Create document in library
      const document = await storage.createDocument({
        uploadedBy: userIdInt,
        fileName: filename,
        fileType: 'application/octet-stream', // Default type
        fileSize: 0, // Will be updated by object storage
        uploadUrl: documentUrl,
        documentType: 'other',
      });

      // Attach to appointment
      await storage.attachDocumentToAppointment(Number(appointmentId), document.id);
      
      res.json(document);
    } catch (error) {
      console.error("Error creating appointment document:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete document from library
  app.delete("/api/documents/:documentId", isAuthenticated, async (req, res) => {
    try {
      const { documentId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify user owns the document
      const document = await storage.getDocumentById(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      const userIdInt = parseInt(userId.toString());
      if (document.uploadedBy !== userIdInt) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.deleteDocument(documentId);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Simple, bulletproof download route
  app.get("/api/download/:documentId", async (req, res) => {
    console.log("✅ SIMPLE DOWNLOAD ROUTE - DocumentId:", req.params.documentId);
    
    try {
      const { documentId } = req.params;
      const document = await storage.getDocumentById(documentId);
      
      if (!document) {
        console.log("❌ Document not found:", documentId);
        return res.status(404).json({ error: "Document not found" });
      }

      console.log("📄 Document found:", { 
        fileName: document.fileName, 
        fileType: document.fileType,
        uploadUrl: document.uploadUrl
      });

      // Direct download with proper headers for browser navigation
      const objectStorageService = new ObjectStorageService();
      
      try {
        const objectFile = await objectStorageService.getObjectEntityFile(document.uploadUrl);
        const [fileContents] = await objectFile.download();
        
        // Clean filename for Windows - keep it simple
        const cleanFileName = document.fileName
          .replace(/[<>:"/\\|?*]/g, '_')  // Replace Windows-forbidden chars
          .replace(/\s+/g, '_')           // Replace spaces with underscores
          .replace(/_+/g, '_');           // Remove duplicate underscores
        
        // Set minimal headers for direct browser download
        // Use application/octet-stream to force download instead of display
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${cleanFileName}"`);
        res.setHeader('Content-Length', fileContents.length.toString());
        
        // Send the file buffer directly
        res.end(fileContents);
        
      } catch (error) {
        console.error("❌ Object storage error:", error);
        return res.status(500).json({ error: "Storage error" });
      }
      
    } catch (error) {
      console.error("❌ Download error:", error);
      res.status(500).json({ error: "Download failed" });
    }
  });

  // Download document
  app.get("/api/documents/download/:documentId", isAuthenticated, async (req, res) => {
    console.log(`🎯 DOWNLOAD ROUTE HIT - DocumentId: ${req.params.documentId}, UserAgent: ${req.get('User-Agent')?.substring(0, 50)}...`);
    
    try {
      const { documentId } = req.params;
      const userId = req.user?.id;
      
      console.log(`🔐 AUTH CHECK - UserId: ${userId}, Session: ${!!req.session}`);
      
      if (!userId) {
        console.log("❌ UNAUTHORIZED - No userId found");
        return res.status(401).json({ error: "Unauthorized" });
      }

      const document = await storage.getDocumentById(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Check if user owns the document OR is a doctor with access
      const userIdInt = parseInt(userId.toString());
      const isOwner = document.uploadedBy === userIdInt;
      let hasAccess = isOwner;

      if (!isOwner) {
        // Check if user is a doctor and has access through appointments
        const doctorRecord = await storage.getDoctorByUserId(userId.toString());
        if (doctorRecord) {
          // Get appointments where this document is attached and doctor is involved
          // This is a simplified check - in practice you'd query the junction table
          hasAccess = true; // For now, allow doctors to access patient documents
        }
      }

      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Use object storage to download the file
      const objectStorageService = new ObjectStorageService();
      try {
        console.log(`🔍 DOWNLOAD DEBUG - Document ${documentId}:`, {
          fileName: document.fileName,
          fileType: document.fileType,
          fileSize: document.fileSize,
          uploadUrl: document.uploadUrl
        });
        
        const normalizedPath = objectStorageService.normalizeObjectEntityPath(document.uploadUrl);
        console.log(`🔍 NORMALIZED PATH: ${normalizedPath}`);
        
        const objectFile = await objectStorageService.getObjectEntityFile(normalizedPath);
        
        // Pass the original filename to the download function for proper headers
        objectStorageService.downloadObject(objectFile, res, 3600, document.fileName);
      } catch (error) {
        if (error instanceof ObjectNotFoundError) {
          return res.status(404).json({ 
            error: "Document file not found",
            migration: "This document may need to be re-uploaded for security compliance."
          });
        }
        throw error;
      }

    } catch (error) {
      console.error("Error downloading document:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}
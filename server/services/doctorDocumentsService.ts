import { db } from "../db";
import { doctorDocuments, doctors } from "@shared/schema";
import type { DoctorDocument, InsertDoctorDocument } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { SupabaseStorageService } from '../supabaseStorage';
import { randomUUID } from 'crypto';
import path from 'path';

const DOCTOR_DOCUMENTS_BUCKET = 'doctor-documents';

/**
 * Service for managing doctor credential documents
 * Handles German medical documents: Approbationsurkunde, Facharzturkunde, Zusatzbezeichnung
 */
export class DoctorDocumentsService {
  private storageService: SupabaseStorageService;

  constructor() {
    this.storageService = new SupabaseStorageService();
  }

  /**
   * Upload a doctor document
   */
  async uploadDocument(
    doctorId: number,
    documentType: 'approbation' | 'facharzturkunde' | 'zusatzbezeichnung',
    file: {
      buffer: Buffer;
      originalName: string;
      mimeType: string;
      size: number;
    }
  ): Promise<DoctorDocument> {
    // Validate file type
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedMimeTypes.includes(file.mimeType)) {
      throw new Error('Invalid file type. Only PDF, JPG, and PNG files are allowed.');
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('File size exceeds 10MB limit.');
    }

    // Generate unique filename
    const fileExt = path.extname(file.originalName);
    const uniqueFileName = `${randomUUID()}${fileExt}`;
    const storagePath = `${doctorId}/${documentType}/${uniqueFileName}`;

    try {
      // Upload to Supabase Storage
      const { path: uploadedPath, publicUrl } = await this.storageService.uploadFile(
        file.buffer,
        storagePath,
        file.mimeType,
        String(doctorId),
        DOCTOR_DOCUMENTS_BUCKET
      );

      // Check if document already exists for this doctor and type
      const existing = await db.query.doctorDocuments.findFirst({
        where: and(
          eq(doctorDocuments.doctorId, doctorId),
          eq(doctorDocuments.documentType, documentType)
        )
      });

      const documentData: InsertDoctorDocument = {
        doctorId,
        documentType,
        fileName: uniqueFileName,
        originalFileName: file.originalName,
        fileSize: file.size,
        mimeType: file.mimeType,
        storageUrl: publicUrl || uploadedPath,
        verificationStatus: 'pending'
      };

      let result: DoctorDocument;

      if (existing) {
        // Update existing document
        const [updated] = await db
          .update(doctorDocuments)
          .set({
            ...documentData,
            updatedAt: new Date()
          })
          .where(eq(doctorDocuments.id, existing.id))
          .returning();
        result = updated;

        // Delete old file from storage if it exists
        if (existing.storageUrl) {
          try {
            await this.storageService.deleteFile(
              existing.storageUrl,
              DOCTOR_DOCUMENTS_BUCKET
            );
          } catch (error) {
            console.error('Failed to delete old file:', error);
            // Continue anyway, we don't want to fail the upload
          }
        }
      } else {
        // Insert new document
        const [inserted] = await db
          .insert(doctorDocuments)
          .values(documentData)
          .returning();
        result = inserted;
      }

      // Update doctor's documents_uploaded_at timestamp
      await db
        .update(doctors)
        .set({
          documentsUploadedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(doctors.id, doctorId));

      return result;
    } catch (error) {
      console.error('Document upload failed:', error);
      throw new Error(`Failed to upload document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all documents for a doctor
   */
  async getDoctorDocuments(doctorId: number): Promise<DoctorDocument[]> {
    return await db.query.doctorDocuments.findMany({
      where: eq(doctorDocuments.doctorId, doctorId),
      orderBy: (docs, { desc }) => [desc(docs.uploadedAt)]
    });
  }

  /**
   * Get a specific document
   */
  async getDocument(documentId: string): Promise<DoctorDocument | undefined> {
    return await db.query.doctorDocuments.findFirst({
      where: eq(doctorDocuments.id, documentId)
    });
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string, doctorId: number): Promise<boolean> {
    const document = await db.query.doctorDocuments.findFirst({
      where: and(
        eq(doctorDocuments.id, documentId),
        eq(doctorDocuments.doctorId, doctorId)
      )
    });

    if (!document) {
      throw new Error('Document not found or access denied');
    }

    try {
      // Delete from storage
      if (document.storageUrl) {
        await this.storageService.deleteFile(
          document.storageUrl,
          DOCTOR_DOCUMENTS_BUCKET
        );
      }

      // Delete from database
      await db
        .delete(doctorDocuments)
        .where(eq(doctorDocuments.id, documentId));

      return true;
    } catch (error) {
      console.error('Document deletion failed:', error);
      throw new Error(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify a document (admin only)
   */
  async verifyDocument(
    documentId: string,
    verifiedBy: number,
    verified: boolean,
    rejectionReason?: string
  ): Promise<DoctorDocument> {
    const document = await this.getDocument(documentId);

    if (!document) {
      throw new Error('Document not found');
    }

    const [updated] = await db
      .update(doctorDocuments)
      .set({
        verificationStatus: verified ? 'verified' : 'rejected',
        verifiedBy,
        verifiedAt: new Date(),
        rejectionReason: verified ? null : rejectionReason,
        updatedAt: new Date()
      })
      .where(eq(doctorDocuments.id, documentId))
      .returning();

    return updated;
  }

  /**
   * Check if doctor has all required documents uploaded and verified
   */
  async checkDocumentCompleteness(doctorId: number): Promise<{
    complete: boolean;
    missing: string[];
    pending: string[];
    rejected: string[];
  }> {
    const documents = await this.getDoctorDocuments(doctorId);

    const requiredTypes = ['approbation', 'facharzturkunde'];
    const uploaded = documents.map(d => d.documentType);
    const missing = requiredTypes.filter(type => !uploaded.includes(type));

    const pending = documents
      .filter(d => d.verificationStatus === 'pending')
      .map(d => d.documentType);

    const rejected = documents
      .filter(d => d.verificationStatus === 'rejected')
      .map(d => d.documentType);

    const complete = missing.length === 0 && pending.length === 0 && rejected.length === 0;

    return { complete, missing, pending, rejected };
  }

  /**
   * Get document download URL (with access control)
   * Generates a signed URL for secure temporary access to private bucket files
   */
  async getDocumentUrl(documentId: string, requesterId: number, requesterRole: string): Promise<string> {
    const document = await this.getDocument(documentId);

    if (!document) {
      throw new Error('Document not found');
    }

    // Access control: only doctor who owns the document or admin can access
    if (requesterRole !== 'admin' && document.doctorId !== requesterId) {
      throw new Error('Access denied');
    }

    // Generate signed URL for secure temporary access (1 hour expiration)
    // This works for both public and private buckets
    const signedUrl = await this.storageService.getSignedUrl(
      document.storageUrl,
      3600, // 1 hour
      DOCTOR_DOCUMENTS_BUCKET
    );

    return signedUrl;
  }
}

// Export singleton instance
export const doctorDocumentsService = new DoctorDocumentsService();

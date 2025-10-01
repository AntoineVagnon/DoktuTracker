import { Express } from 'express';
import { isAuthenticated } from '../supabaseAuth';
import { db } from '../db';
import { 
  users, 
  healthProfiles, 
  appointments, 
  reviews, 
  consultationNotes,
  patientFiles,
  documentUploads,
  dataSubjectRequests
} from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { AuditLogger, auditAdminMiddleware } from '../middleware/auditMiddleware';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

// Interface pour les données d'export GDPR
interface GDPRExportData {
  exportDate: string;
  patientId: string;
  personalData: any;
  healthProfile: any;
  appointments: any[];
  reviews: any[];
  consultationNotes: any[];
  patientFiles: any[];
  documents: any[];
  metadata: {
    totalRecords: number;
    exportedBy: string;
    dataCategories: string[];
  };
}

export function registerGDPRRoutes(app: Express) {

  // POST /api/admin/gdpr/export/:patientId - Export données patient
  app.post('/api/admin/gdpr/export/:patientId',
    isAuthenticated,
    auditAdminMiddleware('gdpr_data_export', 'patient_data'),
    async (req, res) => {
      try {
        const user = req.user as any;
        if (!user || user.role !== 'admin') {
          return res.status(403).json({ message: "Admin access required" });
        }

        const patientId = parseInt(req.params.patientId);
        const { format = 'json' } = req.body; // json ou pdf

        // Vérifier que le patient existe
        const patient = await db
          .select()
          .from(users)
          .where(eq(users.id, patientId))
          .limit(1);

        if (!patient.length) {
          return res.status(404).json({ message: "Patient not found" });
        }

        // Log de l'export
        await AuditLogger.logAdminAction(
          user.id,
          'gdpr_export_initiated',
          'patient_data',
          patientId.toString(),
          {
            format,
            patientEmail: patient[0].email,
            exportTimestamp: new Date().toISOString()
          },
          req
        );

        // Collecter toutes les données du patient
        const exportData: GDPRExportData = {
          exportDate: new Date().toISOString(),
          patientId: patientId.toString(),
          personalData: patient[0],
          healthProfile: null,
          appointments: [],
          reviews: [],
          consultationNotes: [],
          patientFiles: [],
          documents: [],
          metadata: {
            totalRecords: 0,
            exportedBy: user.email || user.id,
            dataCategories: []
          }
        };

        // Récupérer le profil santé
        try {
          const healthProfile = await db
            .select()
            .from(healthProfiles)
            .where(eq(healthProfiles.patientId, patientId))
            .limit(1);
          
          if (healthProfile.length) {
            exportData.healthProfile = healthProfile[0];
            exportData.metadata.dataCategories.push('health_profile');
          }
        } catch (error) {
          console.log('No health profile found for patient');
        }

        // Récupérer les rendez-vous
        try {
          const patientAppointments = await db
            .select()
            .from(appointments)
            .where(eq(appointments.patientId, patientId))
            .orderBy(desc(appointments.createdAt));
          
          exportData.appointments = patientAppointments;
          if (patientAppointments.length > 0) {
            exportData.metadata.dataCategories.push('appointments');
          }
        } catch (error) {
          console.log('No appointments found for patient');
        }

        // Récupérer les avis
        try {
          const patientReviews = await db
            .select()
            .from(reviews)
            .where(eq(reviews.patientId, patientId))
            .orderBy(desc(reviews.createdAt));
          
          exportData.reviews = patientReviews;
          if (patientReviews.length > 0) {
            exportData.metadata.dataCategories.push('reviews');
          }
        } catch (error) {
          console.log('No reviews found for patient');
        }

        // Récupérer les notes de consultation
        try {
          // Join pour récupérer seulement les notes des RDV du patient
          const notes = await db
            .select({
              id: consultationNotes.id,
              appointmentId: consultationNotes.appointmentId,
              doctorId: consultationNotes.doctorId,
              contentMd: consultationNotes.contentMd,
              createdAt: consultationNotes.createdAt,
              updatedAt: consultationNotes.updatedAt
            })
            .from(consultationNotes)
            .innerJoin(appointments, eq(consultationNotes.appointmentId, appointments.id))
            .where(eq(appointments.patientId, patientId))
            .orderBy(desc(consultationNotes.createdAt));
          
          exportData.consultationNotes = notes;
          if (notes.length > 0) {
            exportData.metadata.dataCategories.push('consultation_notes');
          }
        } catch (error) {
          console.log('No consultation notes found for patient');
        }

        // Récupérer les fichiers patients
        try {
          const files = await db
            .select()
            .from(patientFiles)
            .where(eq(patientFiles.patientId, patientId))
            .orderBy(desc(patientFiles.uploadedAt));
          
          exportData.patientFiles = files;
          if (files.length > 0) {
            exportData.metadata.dataCategories.push('patient_files');
          }
        } catch (error) {
          console.log('No patient files found');
        }

        // Récupérer les documents uploadés
        try {
          const documents = await db
            .select()
            .from(documentUploads)
            .where(eq(documentUploads.uploadedBy, patientId))
            .orderBy(desc(documentUploads.uploadedAt));
          
          exportData.documents = documents;
          if (documents.length > 0) {
            exportData.metadata.dataCategories.push('documents');
          }
        } catch (error) {
          console.log('No documents found');
        }

        // Calculer le total des enregistrements
        exportData.metadata.totalRecords = 
          1 + // patient
          (exportData.healthProfile ? 1 : 0) +
          exportData.appointments.length +
          exportData.reviews.length +
          exportData.consultationNotes.length +
          exportData.patientFiles.length +
          exportData.documents.length;

        if (format === 'pdf') {
          // Générer un PDF lisible
          const pdfBuffer = await generateGDPRPDF(exportData);
          
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="gdpr-export-patient-${patientId}-${Date.now()}.pdf"`);
          res.send(pdfBuffer);
          
          // Log de l'export réussi
          await AuditLogger.logAdminAction(
            user.id,
            'gdpr_export_completed',
            'patient_data',
            patientId.toString(),
            {
              format: 'pdf',
              totalRecords: exportData.metadata.totalRecords,
              dataCategories: exportData.metadata.dataCategories
            },
            req
          );
        } else {
          // Retourner JSON
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="gdpr-export-patient-${patientId}-${Date.now()}.json"`);
          res.json({
            success: true,
            data: exportData
          });

          // Log de l'export réussi
          await AuditLogger.logAdminAction(
            user.id,
            'gdpr_export_completed',
            'patient_data',
            patientId.toString(),
            {
              format: 'json',
              totalRecords: exportData.metadata.totalRecords,
              dataCategories: exportData.metadata.dataCategories
            },
            req
          );
        }

      } catch (error) {
        console.error('❌ Erreur export GDPR:', error);
        
        // Log de l'erreur
        await AuditLogger.logAdminAction(
          (req.user as any)?.id || 'unknown',
          'gdpr_export_failed',
          'patient_data',
          req.params.patientId,
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          },
          req
        );

        res.status(500).json({ 
          message: "Failed to export patient data",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  // GET /api/admin/gdpr/requests - Récupérer les demandes GDPR
  app.get('/api/admin/gdpr/requests',
    isAuthenticated,
    auditAdminMiddleware('view_gdpr_requests', 'gdpr_requests'),
    async (req, res) => {
      try {
        const user = req.user as any;
        if (!user || user.role !== 'admin') {
          return res.status(403).json({ message: "Admin access required" });
        }

        const { status = 'all', page = '1', limit = '20' } = req.query;
        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const offset = (pageNum - 1) * limitNum;

        let whereCondition;
        if (status !== 'all') {
          whereCondition = eq(dataSubjectRequests.status, status as string);
        }

        const requests = await db
          .select()
          .from(dataSubjectRequests)
          .where(whereCondition)
          .orderBy(desc(dataSubjectRequests.createdAt))
          .limit(limitNum)
          .offset(offset);

        res.json({
          requests,
          pagination: {
            page: pageNum,
            limit: limitNum,
            hasMore: requests.length === limitNum
          }
        });

      } catch (error) {
        console.error('❌ Erreur récupération demandes GDPR:', error);
        res.status(500).json({ message: "Failed to fetch GDPR requests" });
      }
    }
  );

  // POST /api/admin/gdpr/requests/:requestId/respond - Répondre à une demande GDPR
  app.post('/api/admin/gdpr/requests/:requestId/respond',
    isAuthenticated,
    auditAdminMiddleware('respond_gdpr_request', 'gdpr_requests'),
    async (req, res) => {
      try {
        const user = req.user as any;
        if (!user || user.role !== 'admin') {
          return res.status(403).json({ message: "Admin access required" });
        }

        const requestId = req.params.requestId;
        const { status, response, responseDetails } = req.body;

        await db
          .update(dataSubjectRequests)
          .set({
            status,
            response,
            responseDetails,
            completedAt: status === 'completed' ? new Date() : undefined,
            updatedAt: new Date()
          })
          .where(eq(dataSubjectRequests.id, requestId));

        // Log de la réponse
        await AuditLogger.logAdminAction(
          user.id,
          'gdpr_request_responded',
          'gdpr_requests',
          requestId,
          {
            newStatus: status,
            responseProvided: !!response
          },
          req
        );

        res.json({ success: true, message: "GDPR request updated successfully" });

      } catch (error) {
        console.error('❌ Erreur réponse demande GDPR:', error);
        res.status(500).json({ message: "Failed to respond to GDPR request" });
      }
    }
  );
}

// Fonction pour générer un PDF GDPR lisible
async function generateGDPRPDF(data: GDPRExportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // En-tête
      doc.fontSize(20).text('Export des Données GDPR - Doktu', { align: 'center' });
      doc.moveDown();
      
      doc.fontSize(12).text(`Date d'export: ${new Date(data.exportDate).toLocaleString('fr-FR')}`);
      doc.text(`ID Patient: ${data.patientId}`);
      doc.text(`Total d'enregistrements: ${data.metadata.totalRecords}`);
      doc.text(`Catégories de données: ${data.metadata.dataCategories.join(', ')}`);
      doc.moveDown();

      // Données personnelles
      doc.fontSize(16).text('1. Données Personnelles', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12);
      if (data.personalData) {
        doc.text(`Email: ${data.personalData.email || 'N/A'}`);
        doc.text(`Nom: ${data.personalData.firstName || ''} ${data.personalData.lastName || ''}`);
        doc.text(`Téléphone: ${data.personalData.phone || 'N/A'}`);
        doc.text(`Rôle: ${data.personalData.role || 'N/A'}`);
        doc.text(`Compte créé: ${data.personalData.createdAt ? new Date(data.personalData.createdAt).toLocaleString('fr-FR') : 'N/A'}`);
      }
      doc.moveDown();

      // Profil santé
      if (data.healthProfile) {
        doc.fontSize(16).text('2. Profil Santé', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12);
        doc.text(`Date de naissance: ${data.healthProfile.dateOfBirth || 'N/A'}`);
        doc.text(`Genre: ${data.healthProfile.gender || 'N/A'}`);
        doc.text(`Taille: ${data.healthProfile.height || 'N/A'}`);
        doc.text(`Poids: ${data.healthProfile.weight || 'N/A'}`);
        doc.text(`Groupe sanguin: ${data.healthProfile.bloodType || 'N/A'}`);
        if (data.healthProfile.allergies?.length) {
          doc.text(`Allergies: ${data.healthProfile.allergies.join(', ')}`);
        }
        if (data.healthProfile.medications?.length) {
          doc.text(`Médicaments: ${data.healthProfile.medications.join(', ')}`);
        }
        doc.moveDown();
      }

      // Rendez-vous
      if (data.appointments.length > 0) {
        doc.fontSize(16).text('3. Rendez-vous Médicaux', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12);
        data.appointments.slice(0, 10).forEach((apt, index) => { // Limiter à 10 pour éviter un PDF trop long
          doc.text(`${index + 1}. Date: ${new Date(apt.appointmentDate).toLocaleString('fr-FR')}`);
          doc.text(`   Statut: ${apt.status}`);
          doc.text(`   Prix: ${apt.price}€`);
          doc.moveDown(0.3);
        });
        if (data.appointments.length > 10) {
          doc.text(`... et ${data.appointments.length - 10} autres rendez-vous`);
        }
        doc.moveDown();
      }

      // Notes de consultation
      if (data.consultationNotes.length > 0) {
        doc.fontSize(16).text('4. Notes de Consultation', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12);
        data.consultationNotes.slice(0, 5).forEach((note, index) => {
          doc.text(`${index + 1}. Date: ${new Date(note.createdAt).toLocaleString('fr-FR')}`);
          doc.text(`   Contenu: ${note.contentMd.substring(0, 200)}...`);
          doc.moveDown(0.3);
        });
        if (data.consultationNotes.length > 5) {
          doc.text(`... et ${data.consultationNotes.length - 5} autres notes`);
        }
        doc.moveDown();
      }

      // Fichiers
      if (data.patientFiles.length > 0 || data.documents.length > 0) {
        doc.fontSize(16).text('5. Fichiers et Documents', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12);
        
        const allFiles = [...data.patientFiles, ...data.documents];
        allFiles.slice(0, 10).forEach((file, index) => {
          doc.text(`${index + 1}. ${file.filename || file.fileName || 'Fichier'}`);
          doc.text(`   Type: ${file.mimeType || file.fileType || 'N/A'}`);
          doc.text(`   Taille: ${file.fileSize ? `${Math.round(file.fileSize/1024)}KB` : 'N/A'}`);
          doc.text(`   Uploadé: ${new Date(file.uploadedAt || file.createdAt).toLocaleString('fr-FR')}`);
          doc.moveDown(0.3);
        });
        doc.moveDown();
      }

      // Pied de page
      doc.fontSize(10).text(
        'Ce document contient toutes les données personnelles associées à votre compte conformément au RGPD.',
        { align: 'center' }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
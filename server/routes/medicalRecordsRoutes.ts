import { Express } from 'express';
import { isAuthenticated } from '../supabaseAuth';
import { db } from '../db';
import { 
  medicalRecords, 
  medicalRecordAccess, 
  patientHealthProfiles, 
  prescriptions,
  medicalDocuments,
  users
} from '../../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { AuditLogger, auditPatientDataMiddleware } from '../middleware/auditMiddleware';
import { encryptionService, encryptSensitiveFields, decryptSensitiveFields } from '../services/encryptionService';
import { medicalDataCache, invalidateMedicalRecordCache, cacheStatsMiddleware } from '../middleware/cacheMiddleware';

// Champs sensibles qui doivent être chiffrés
const MEDICAL_RECORD_SENSITIVE_FIELDS = ['diagnosis', 'symptoms', 'treatment', 'medications', 'allergies', 'notes'];
const HEALTH_PROFILE_SENSITIVE_FIELDS = ['bloodType', 'height', 'weight', 'emergencyContact', 'chronicConditions', 'surgicalHistory', 'familyHistory', 'currentMedications', 'knownAllergies', 'smokingStatus', 'alcoholConsumption', 'exerciseLevel'];
const PRESCRIPTION_SENSITIVE_FIELDS = ['medications', 'diagnosis', 'notes'];

export function registerMedicalRecordsRoutes(app: Express) {

  // Helper function: Vérifier l'accès aux dossiers médicaux
  const checkMedicalRecordAccess = async (
    userId: string, 
    patientId: number, 
    accessType: string,
    req: any
  ): Promise<{ granted: boolean; reason?: string }> => {
    const user = req.user;
    
    // Les patients peuvent accéder à leurs propres dossiers
    if (user.role === 'patient' && parseInt(user.id) === patientId) {
      return { granted: true };
    }
    
    // Les docteurs peuvent accéder aux dossiers de leurs patients (via RDV)
    if (user.role === 'doctor') {
      // TODO: Vérifier si le docteur a eu/a un RDV avec ce patient
      return { granted: true };
    }
    
    // Les admins ont accès complet
    if (user.role === 'admin') {
      return { granted: true };
    }
    
    return { granted: false, reason: 'Insufficient permissions' };
  };

  // Helper function: Log accès aux dossiers médicaux
  const logMedicalAccess = async (
    recordId: number,
    accessedBy: number,
    patientId: number,
    accessType: string,
    granted: boolean,
    denialReason?: string,
    req?: any
  ) => {
    try {
      await db.insert(medicalRecordAccess).values({
        recordId,
        accessedBy,
        patientId,
        accessType,
        accessGranted: granted,
        denialReason,
        ipAddress: req?.ip || req?.connection?.remoteAddress,
        userAgent: req?.get('User-Agent')
      });
    } catch (error) {
      console.error('❌ Failed to log medical access:', error);
    }
  };

  // GET /api/medical-records/patient/:patientId - Récupérer dossiers d'un patient
  app.get('/api/medical-records/patient/:patientId',
    isAuthenticated,
    cacheStatsMiddleware,
    medicalDataCache,
    auditPatientDataMiddleware('view', 'medical_records'),
    async (req, res) => {
      try {
        const user = req.user as any;
        const patientId = parseInt(req.params.patientId);

        // Vérifier l'accès
        const accessCheck = await checkMedicalRecordAccess(user.id, patientId, 'view', req);
        if (!accessCheck.granted) {
          return res.status(403).json({ 
            message: "Access denied to medical records",
            reason: accessCheck.reason 
          });
        }

        // Récupérer les dossiers médicaux
        const records = await db
          .select()
          .from(medicalRecords)
          .where(and(
            eq(medicalRecords.patientId, patientId),
            eq(medicalRecords.status, 'active')
          ))
          .orderBy(desc(medicalRecords.createdAt));

        // Déchiffrer les données sensibles
        const decryptedRecords = records.map(record => {
          try {
            return decryptSensitiveFields(record, MEDICAL_RECORD_SENSITIVE_FIELDS);
          } catch (error) {
            console.error('❌ Failed to decrypt medical record:', record.id, error);
            // Retourner l'enregistrement sans les champs sensibles en cas d'erreur
            const safeRecord = { ...record };
            MEDICAL_RECORD_SENSITIVE_FIELDS.forEach(field => {
              safeRecord[field] = '[Encrypted - Unable to decrypt]';
            });
            return safeRecord;
          }
        });

        // Logger l'accès pour chaque dossier
        for (const record of records) {
          await logMedicalAccess(record.id, parseInt(user.id), patientId, 'view', true, undefined, req);
        }

        res.json({
          success: true,
          records: decryptedRecords,
          total: records.length
        });

      } catch (error) {
        console.error('❌ Error fetching medical records:', error);
        res.status(500).json({ 
          message: "Failed to fetch medical records",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  // POST /api/medical-records - Créer un nouveau dossier médical
  app.post('/api/medical-records',
    isAuthenticated,
    invalidateMedicalRecordCache,
    auditPatientDataMiddleware('create', 'medical_records'),
    async (req, res) => {
      try {
        const user = req.user as any;
        const { 
          patientId, 
          appointmentId,
          diagnosis, 
          symptoms, 
          treatment, 
          medications, 
          allergies, 
          notes,
          recordType = 'consultation',
          severity = 'normal'
        } = req.body;

        // Vérifier l'accès
        const accessCheck = await checkMedicalRecordAccess(user.id, patientId, 'create', req);
        if (!accessCheck.granted) {
          return res.status(403).json({ 
            message: "Access denied to create medical records",
            reason: accessCheck.reason 
          });
        }

        // Préparer les données avec chiffrement
        const recordData = {
          patientId,
          doctorId: user.role === 'doctor' ? parseInt(user.id) : null,
          appointmentId,
          diagnosis,
          symptoms,
          treatment,
          medications,
          allergies,
          notes,
          recordType,
          severity,
          lastAccessedBy: parseInt(user.id),
          lastAccessedAt: new Date()
        };

        // Chiffrer les champs sensibles
        const encryptedData = encryptSensitiveFields(recordData, MEDICAL_RECORD_SENSITIVE_FIELDS);

        // Insérer en base
        const [newRecord] = await db
          .insert(medicalRecords)
          .values(encryptedData)
          .returning();

        // Logger la création
        await logMedicalAccess(newRecord.id, parseInt(user.id), patientId, 'create', true, undefined, req);

        // Log audit
        await AuditLogger.logPatientDataAccess(
          user.id,
          patientId.toString(),
          'create',
          'medical_record',
          newRecord.id.toString(),
          req
        );

        res.status(201).json({
          success: true,
          record: {
            id: newRecord.id,
            recordType: newRecord.recordType,
            severity: newRecord.severity,
            createdAt: newRecord.createdAt
          },
          message: "Medical record created successfully"
        });

      } catch (error) {
        console.error('❌ Error creating medical record:', error);
        res.status(500).json({ 
          message: "Failed to create medical record",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  // GET /api/medical-records/:recordId - Récupérer un dossier spécifique
  app.get('/api/medical-records/:recordId',
    isAuthenticated,
    auditPatientDataMiddleware('view', 'medical_record'),
    async (req, res) => {
      try {
        const user = req.user as any;
        const recordId = parseInt(req.params.recordId);

        // Récupérer le dossier
        const [record] = await db
          .select()
          .from(medicalRecords)
          .where(eq(medicalRecords.id, recordId))
          .limit(1);

        if (!record) {
          return res.status(404).json({ message: "Medical record not found" });
        }

        // Vérifier l'accès
        const accessCheck = await checkMedicalRecordAccess(user.id, record.patientId, 'view', req);
        if (!accessCheck.granted) {
          await logMedicalAccess(recordId, parseInt(user.id), record.patientId, 'view', false, accessCheck.reason, req);
          return res.status(403).json({ 
            message: "Access denied to medical record",
            reason: accessCheck.reason 
          });
        }

        // Déchiffrer les données sensibles
        const decryptedRecord = decryptSensitiveFields(record, MEDICAL_RECORD_SENSITIVE_FIELDS);

        // Mettre à jour l'accès
        await db
          .update(medicalRecords)
          .set({
            lastAccessedBy: parseInt(user.id),
            lastAccessedAt: new Date()
          })
          .where(eq(medicalRecords.id, recordId));

        // Logger l'accès
        await logMedicalAccess(recordId, parseInt(user.id), record.patientId, 'view', true, undefined, req);

        res.json({
          success: true,
          record: decryptedRecord
        });

      } catch (error) {
        console.error('❌ Error fetching medical record:', error);
        res.status(500).json({ 
          message: "Failed to fetch medical record",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  // PUT /api/medical-records/:recordId - Modifier un dossier médical
  app.put('/api/medical-records/:recordId',
    isAuthenticated,
    auditPatientDataMiddleware('update', 'medical_record'),
    async (req, res) => {
      try {
        const user = req.user as any;
        const recordId = parseInt(req.params.recordId);
        const updateData = req.body;

        // Récupérer le dossier existant
        const [existingRecord] = await db
          .select()
          .from(medicalRecords)
          .where(eq(medicalRecords.id, recordId))
          .limit(1);

        if (!existingRecord) {
          return res.status(404).json({ message: "Medical record not found" });
        }

        // Vérifier l'accès
        const accessCheck = await checkMedicalRecordAccess(user.id, existingRecord.patientId, 'edit', req);
        if (!accessCheck.granted) {
          await logMedicalAccess(recordId, parseInt(user.id), existingRecord.patientId, 'edit', false, accessCheck.reason, req);
          return res.status(403).json({ 
            message: "Access denied to edit medical record",
            reason: accessCheck.reason 
          });
        }

        // Préparer les données avec chiffrement
        const dataToUpdate = {
          ...updateData,
          lastAccessedBy: parseInt(user.id),
          lastAccessedAt: new Date(),
          updatedAt: new Date()
        };

        // Chiffrer les champs sensibles modifiés
        const encryptedData = encryptSensitiveFields(dataToUpdate, MEDICAL_RECORD_SENSITIVE_FIELDS);

        // Mettre à jour
        await db
          .update(medicalRecords)
          .set(encryptedData)
          .where(eq(medicalRecords.id, recordId));

        // Logger la modification
        await logMedicalAccess(recordId, parseInt(user.id), existingRecord.patientId, 'edit', true, undefined, req);

        // Log audit
        await AuditLogger.logPatientDataAccess(
          user.id,
          existingRecord.patientId.toString(),
          'update',
          'medical_record',
          recordId.toString(),
          req
        );

        res.json({
          success: true,
          message: "Medical record updated successfully"
        });

      } catch (error) {
        console.error('❌ Error updating medical record:', error);
        res.status(500).json({ 
          message: "Failed to update medical record",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  // GET /api/health-profile/:patientId - Récupérer profil santé
  app.get('/api/health-profile/:patientId',
    isAuthenticated,
    cacheStatsMiddleware,
    medicalDataCache,
    auditPatientDataMiddleware('view', 'health_profile'),
    async (req, res) => {
      try {
        const user = req.user as any;
        const patientId = parseInt(req.params.patientId);

        // Vérifier l'accès
        const accessCheck = await checkMedicalRecordAccess(user.id, patientId, 'view', req);
        if (!accessCheck.granted) {
          return res.status(403).json({ 
            message: "Access denied to health profile",
            reason: accessCheck.reason 
          });
        }

        // Récupérer le profil santé actif
        const [profile] = await db
          .select()
          .from(patientHealthProfiles)
          .where(and(
            eq(patientHealthProfiles.patientId, patientId),
            eq(patientHealthProfiles.isActive, true)
          ))
          .orderBy(desc(patientHealthProfiles.version))
          .limit(1);

        if (!profile) {
          return res.json({
            success: true,
            profile: null,
            message: "No health profile found"
          });
        }

        // Déchiffrer les données sensibles
        const decryptedProfile = decryptSensitiveFields(profile, HEALTH_PROFILE_SENSITIVE_FIELDS);

        res.json({
          success: true,
          profile: decryptedProfile
        });

      } catch (error) {
        console.error('❌ Error fetching health profile:', error);
        res.status(500).json({ 
          message: "Failed to fetch health profile",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  // GET /api/medical-records/access-log/:patientId - Récupérer logs d'accès (admin/patient seulement)
  app.get('/api/medical-records/access-log/:patientId',
    isAuthenticated,
    auditPatientDataMiddleware('view', 'medical_access_logs'),
    async (req, res) => {
      try {
        const user = req.user as any;
        const patientId = parseInt(req.params.patientId);

        // Seuls les patients (leurs propres logs) et admins peuvent voir les logs
        if (user.role !== 'admin' && (user.role !== 'patient' || parseInt(user.id) !== patientId)) {
          return res.status(403).json({ message: "Access denied to access logs" });
        }

        const { limit = '50', offset = '0' } = req.query;

        // Récupérer les logs d'accès avec infos utilisateur
        const accessLogs = await db
          .select({
            id: medicalRecordAccess.id,
            recordId: medicalRecordAccess.recordId,
            accessType: medicalRecordAccess.accessType,
            accessGranted: medicalRecordAccess.accessGranted,
            denialReason: medicalRecordAccess.denialReason,
            accessedAt: medicalRecordAccess.accessedAt,
            ipAddress: medicalRecordAccess.ipAddress,
            userEmail: users.email,
            userRole: users.role,
            userName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`
          })
          .from(medicalRecordAccess)
          .innerJoin(users, eq(medicalRecordAccess.accessedBy, users.id))
          .where(eq(medicalRecordAccess.patientId, patientId))
          .orderBy(desc(medicalRecordAccess.accessedAt))
          .limit(parseInt(limit as string))
          .offset(parseInt(offset as string));

        res.json({
          success: true,
          accessLogs,
          total: accessLogs.length
        });

      } catch (error) {
        console.error('❌ Error fetching access logs:', error);
        res.status(500).json({ 
          message: "Failed to fetch access logs",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  // GET /api/encryption/health - Vérifier l'état du chiffrement
  app.get('/api/encryption/health',
    isAuthenticated,
    async (req, res) => {
      try {
        const user = req.user as any;
        
        // Seuls les admins peuvent vérifier l'état du chiffrement
        if (user.role !== 'admin') {
          return res.status(403).json({ message: "Admin access required" });
        }

        const healthStatus = encryptionService.getHealthStatus();
        
        res.json({
          success: true,
          encryption: healthStatus,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('❌ Error checking encryption health:', error);
        res.status(500).json({ 
          message: "Failed to check encryption status",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );
}
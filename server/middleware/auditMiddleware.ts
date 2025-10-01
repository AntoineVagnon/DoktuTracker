import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { auditEvents } from '../../shared/schema';

// Actions critiques qui doivent être auditées
const CRITICAL_ACTIONS = [
  'login',
  'logout', 
  'admin_access',
  'patient_data_access',
  'doctor_data_access',
  'medical_record_view',
  'medical_record_create',
  'medical_record_update',
  'medical_record_delete',
  'appointment_create',
  'appointment_cancel',
  'appointment_reschedule',
  'payment_process',
  'user_role_change',
  'gdpr_export',
  'data_deletion',
  'admin_dashboard_access',
  'sensitive_data_export',
  'prescription_create',
  'prescription_update',
  'health_data_view',
  'health_data_modify'
];

// Ressources sensibles à tracker
const SENSITIVE_RESOURCES = [
  'patient_records',
  'health_profiles', 
  'consultation_notes',
  'patient_files',
  'appointments',
  'prescriptions',
  'medical_history',
  'user_data',
  'payment_data'
];

interface AuditLogData {
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  success?: boolean;
  errorMessage?: string;
}

export class AuditLogger {
  static async log(data: AuditLogData): Promise<void> {
    try {
      await db.insert(auditEvents).values({
        userId: data.userId || null,
        action: data.action,
        resourceType: data.resourceType || null,
        resourceId: data.resourceId || null,
        details: data.details || {},
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        createdAt: new Date()
      });
      
      console.log(`🔍 AUDIT LOG: ${data.action} by user ${data.userId || 'anonymous'} on ${data.resourceType || 'system'}`);
    } catch (error) {
      console.error('❌ Erreur logging audit:', error);
      // Ne pas bloquer l'opération si l'audit échoue
    }
  }

  static async logAdminAction(
    userId: string,
    action: string,
    resourceType?: string,
    resourceId?: string,
    details?: any,
    req?: Request
  ): Promise<void> {
    await this.log({
      userId,
      action: `admin_${action}`,
      resourceType,
      resourceId,
      details: {
        ...details,
        userRole: 'admin',
        timestamp: new Date().toISOString()
      },
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('User-Agent'),
      sessionId: req?.sessionID
    });
  }

  static async logPatientDataAccess(
    userId: string,
    patientId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    req?: Request
  ): Promise<void> {
    await this.log({
      userId,
      action: `patient_data_${action}`,
      resourceType,
      resourceId: resourceId || patientId,
      details: {
        targetPatientId: patientId,
        accessType: action,
        dataCategory: resourceType,
        timestamp: new Date().toISOString()
      },
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('User-Agent'),
      sessionId: req?.sessionID
    });
  }

  static async logAuthEvent(
    userId: string | undefined,
    action: 'login' | 'logout' | 'login_failed',
    details?: any,
    req?: Request
  ): Promise<void> {
    await this.log({
      userId,
      action: `auth_${action}`,
      resourceType: 'authentication',
      details: {
        ...details,
        timestamp: new Date().toISOString()
      },
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('User-Agent'),
      sessionId: req?.sessionID
    });
  }
}

// Middleware pour audit automatique des routes admin
export const auditAdminMiddleware = (action: string, resourceType?: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    try {
      // Log l'accès
      await AuditLogger.logAdminAction(
        user?.id || 'unknown',
        action,
        resourceType,
        req.params.id || req.body.id,
        {
          method: req.method,
          url: req.originalUrl,
          body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined,
          query: req.query
        },
        req
      );

      next();
    } catch (error) {
      console.error('❌ Erreur audit middleware:', error);
      next(); // Continue même si l'audit échoue
    }
  };
};

// Middleware pour audit des accès aux données patients
export const auditPatientDataMiddleware = (action: string, resourceType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    const patientId = req.params.patientId || req.body.patientId || req.query.patientId;
    
    try {
      await AuditLogger.logPatientDataAccess(
        user?.id || 'unknown',
        patientId,
        action,
        resourceType,
        req.params.id || req.body.id,
        req
      );

      next();
    } catch (error) {
      console.error('❌ Erreur audit patient data:', error);
      next();
    }
  };
};

// Middleware pour audit des échecs de requêtes
export const auditErrorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = (req as any).user;
  
  // Log les erreurs sur les routes sensibles
  if (req.originalUrl.includes('/admin') || 
      req.originalUrl.includes('/patient') ||
      req.originalUrl.includes('/api/')) {
    
    AuditLogger.log({
      userId: user?.id,
      action: 'request_error',
      resourceType: 'api_request',
      details: {
        error: err.message,
        stack: err.stack,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode
      },
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID
    }).catch(console.error);
  }

  next(err);
};

// Helper pour vérifier si une action nécessite un audit
export const requiresAudit = (action: string): boolean => {
  return CRITICAL_ACTIONS.includes(action);
};

// Helper pour vérifier si une ressource est sensible
export const isSensitiveResource = (resourceType: string): boolean => {
  return SENSITIVE_RESOURCES.includes(resourceType);
};

export default {
  AuditLogger,
  auditAdminMiddleware,
  auditPatientDataMiddleware,
  auditErrorMiddleware,
  requiresAudit,
  isSensitiveResource
};
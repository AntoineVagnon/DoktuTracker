import { Express } from 'express';
import { isAuthenticated } from '../supabaseAuth';
import { db } from '../db';
import { auditEvents } from '../../shared/schema';
import { eq, desc, and, gte, lte, sql, count } from 'drizzle-orm';
import { AuditLogger, auditAdminMiddleware } from '../middleware/auditMiddleware';

// Route pour l'interface admin des logs d'audit
export function registerAuditRoutes(app: Express) {
  
  // GET /api/admin/audit-logs - Récupérer les logs d'audit avec filtres
  app.get('/api/admin/audit-logs', 
    isAuthenticated, 
    auditAdminMiddleware('view_audit_logs', 'audit_events'),
    async (req, res) => {
      try {
        const user = req.user as any;
        if (!user || user.role !== 'admin') {
          return res.status(403).json({ message: "Admin access required" });
        }

        const { 
          page = '1', 
          limit = '50', 
          action, 
          userId, 
          resourceType, 
          dateFrom, 
          dateTo 
        } = req.query;

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const offset = (pageNum - 1) * limitNum;

        // Construire les filtres
        const filters = [];
        
        if (action) {
          filters.push(eq(auditEvents.action, action as string));
        }
        
        if (userId) {
          filters.push(eq(auditEvents.userId, userId as string));
        }
        
        if (resourceType) {
          filters.push(eq(auditEvents.resourceType, resourceType as string));
        }
        
        if (dateFrom) {
          filters.push(gte(auditEvents.createdAt, new Date(dateFrom as string)));
        }
        
        if (dateTo) {
          filters.push(lte(auditEvents.createdAt, new Date(dateTo as string)));
        }

        // Récupérer les logs avec pagination
        const logs = await db
          .select()
          .from(auditEvents)
          .where(filters.length > 0 ? and(...filters) : undefined)
          .orderBy(desc(auditEvents.createdAt))
          .limit(limitNum)
          .offset(offset);

        // Compter le total pour la pagination
        const totalResult = await db
          .select({ count: count() })
          .from(auditEvents)
          .where(filters.length > 0 ? and(...filters) : undefined);
        
        const total = totalResult[0]?.count || 0;

        res.json({
          logs,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
          }
        });

      } catch (error) {
        console.error('❌ Erreur récupération logs audit:', error);
        res.status(500).json({ message: "Failed to fetch audit logs" });
      }
    }
  );

  // GET /api/admin/audit-summary - Statistiques d'audit
  app.get('/api/admin/audit-summary',
    isAuthenticated,
    auditAdminMiddleware('view_audit_summary', 'audit_events'),
    async (req, res) => {
      try {
        const user = req.user as any;
        if (!user || user.role !== 'admin') {
          return res.status(403).json({ message: "Admin access required" });
        }

        const { period = '7d' } = req.query;
        
        const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Statistiques par action
        const actionStats = await db
          .select({
            action: auditEvents.action,
            count: count()
          })
          .from(auditEvents)
          .where(gte(auditEvents.createdAt, startDate))
          .groupBy(auditEvents.action)
          .orderBy(desc(count()));

        // Statistiques par type de ressource
        const resourceStats = await db
          .select({
            resourceType: auditEvents.resourceType,
            count: count()
          })
          .from(auditEvents)
          .where(and(
            gte(auditEvents.createdAt, startDate),
            sql`${auditEvents.resourceType} IS NOT NULL`
          ))
          .groupBy(auditEvents.resourceType)
          .orderBy(desc(count()));

        // Activité quotidienne
        const dailyActivity = await db
          .select({
            date: sql<string>`DATE(${auditEvents.createdAt})`,
            count: count()
          })
          .from(auditEvents)
          .where(gte(auditEvents.createdAt, startDate))
          .groupBy(sql`DATE(${auditEvents.createdAt})`)
          .orderBy(sql`DATE(${auditEvents.createdAt})`);

        // Total des événements
        const totalEvents = await db
          .select({ count: count() })
          .from(auditEvents)
          .where(gte(auditEvents.createdAt, startDate));

        res.json({
          period,
          totalEvents: totalEvents[0]?.count || 0,
          actionStats,
          resourceStats,
          dailyActivity
        });

      } catch (error) {
        console.error('❌ Erreur statistiques audit:', error);
        res.status(500).json({ message: "Failed to fetch audit summary" });
      }
    }
  );

  // GET /api/admin/audit-actions - Liste des actions disponibles
  app.get('/api/admin/audit-actions',
    isAuthenticated,
    async (req, res) => {
      try {
        const user = req.user as any;
        if (!user || user.role !== 'admin') {
          return res.status(403).json({ message: "Admin access required" });
        }

        const actions = await db
          .selectDistinct({ action: auditEvents.action })
          .from(auditEvents)
          .orderBy(auditEvents.action);

        res.json(actions.map(a => a.action));

      } catch (error) {
        console.error('❌ Erreur liste actions audit:', error);
        res.status(500).json({ message: "Failed to fetch audit actions" });
      }
    }
  );

  // GET /api/admin/audit-resources - Liste des types de ressources
  app.get('/api/admin/audit-resources',
    isAuthenticated,
    async (req, res) => {
      try {
        const user = req.user as any;
        if (!user || user.role !== 'admin') {
          return res.status(403).json({ message: "Admin access required" });
        }

        const resources = await db
          .selectDistinct({ resourceType: auditEvents.resourceType })
          .from(auditEvents)
          .where(sql`${auditEvents.resourceType} IS NOT NULL`)
          .orderBy(auditEvents.resourceType);

        res.json(resources.map(r => r.resourceType));

      } catch (error) {
        console.error('❌ Erreur liste ressources audit:', error);
        res.status(500).json({ message: "Failed to fetch audit resources" });
      }
    }
  );

  // POST /api/admin/audit-test - Test manuel du système d'audit
  app.post('/api/admin/audit-test',
    isAuthenticated,
    auditAdminMiddleware('test_audit_system', 'audit_test'),
    async (req, res) => {
      try {
        const user = req.user as any;
        if (!user || user.role !== 'admin') {
          return res.status(403).json({ message: "Admin access required" });
        }

        // Créer un log de test
        await AuditLogger.logAdminAction(
          user.id,
          'audit_system_test',
          'system_test',
          undefined,
          {
            testTimestamp: new Date().toISOString(),
            testDescription: 'Manual audit system test',
            userEmail: user.email,
            testType: 'manual'
          },
          req
        );

        res.json({ 
          success: true, 
          message: "Audit test log created successfully",
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('❌ Erreur test audit:', error);
        res.status(500).json({ message: "Failed to create audit test log" });
      }
    }
  );
}
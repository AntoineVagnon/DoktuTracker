# Database Migration Plan
## Elderly Care Management Platform

**Version:** 1.0
**Date:** January 2025
**Migration Tool:** Prisma Migrate
**Database:** PostgreSQL 15 (RDS Multi-AZ, eu-central-1)

---

## Executive Summary

This document defines a **zero-downtime** database migration strategy for safely deploying schema changes to production. The strategy prioritizes:
- ✅ **Patient Safety:** No disruption to medication logging
- ✅ **Data Integrity:** 10-year audit trail preserved (§630f BGB, GoBD)
- ✅ **Zero Downtime:** Rolling deployments with backward-compatible migrations
- ✅ **Rollback Safety:** Every migration must be reversible

**Key Principle:** **Expand-Contract Pattern**
1. **Expand:** Add new columns/tables (backward compatible)
2. **Migrate:** Backfill data, update application code
3. **Contract:** Remove old columns/tables (cleanup)

---

## 1. Migration Tool: Prisma Migrate

### **1.1 Why Prisma Migrate?**

```yaml
Advantages:
  - ✅ Type-safe schema.prisma → SQL DDL generation
  - ✅ Automatic migration history tracking (prisma/migrations/)
  - ✅ Built-in rollback support (prisma migrate resolve)
  - ✅ Zero-downtime migrations (CREATE INDEX CONCURRENTLY)
  - ✅ Git-friendly (migrations are text files)

Disadvantages:
  - ⚠️ No batched data migrations (requires custom scripts)
  - ⚠️ No automatic rollback (manual intervention required)

Alternative Considered:
  - Flyway: Java-based, heavier, enterprise features (not needed for MVP)
  - Liquibase: XML/YAML format, steeper learning curve
  - Raw SQL: No version control, error-prone
```

### **1.2 Prisma Migrate Commands**

```bash
# Development: Create and apply migration
npx prisma migrate dev --name add_notifications_table

# Production: Apply pending migrations (CI/CD)
npx prisma migrate deploy

# Rollback: Mark migration as failed (manual cleanup required)
npx prisma migrate resolve --rolled-back 20260115123456_add_notifications_table

# Generate Prisma Client (after schema changes)
npx prisma generate

# Diff: Preview SQL changes without applying
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource postgresql://... \
  --script > migration-preview.sql
```

---

## 2. Migration Workflow

### **2.1 Development Environment**

```yaml
Step 1: Developer modifies schema.prisma
  File: prisma/schema.prisma
  Change: Add new table "notifications"

  model Notification {
    id        String   @id @default(uuid())
    userId    String   @map("user_id")
    title     String   @db.VarChar(200)
    body      Text
    createdAt DateTime @default(now()) @map("created_at")

    user User @relation(fields: [userId], references: [id])

    @@map("notifications")
  }

Step 2: Generate migration
  Command: npx prisma migrate dev --name add_notifications_table
  Output:
    - prisma/migrations/20260115123456_add_notifications_table/migration.sql
    - Migration applied to local PostgreSQL
    - Prisma Client regenerated (npx prisma generate)

Step 3: Review generated SQL
  File: prisma/migrations/20260115123456_add_notifications_table/migration.sql

  -- CreateTable
  CREATE TABLE "notifications" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "user_id" UUID NOT NULL,
      "title" VARCHAR(200) NOT NULL,
      "body" TEXT NOT NULL,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
  );

  -- CreateIndex
  CREATE INDEX "idx_notifications_user" ON "notifications"("user_id", "created_at" DESC);

  -- AddForeignKey
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

Step 4: Test migration locally
  - Run: npm run test:integration
  - Verify: SELECT * FROM notifications; (empty table exists)
  - Test: Create notification via API (POST /api/notifications)

Step 5: Commit to Git
  Command:
    git add prisma/schema.prisma
    git add prisma/migrations/20260115123456_add_notifications_table/
    git commit -m "feat: Add notifications table for push notification history"
    git push origin feature/add-notifications
```

### **2.2 Staging Environment**

```yaml
Step 1: CI/CD Pipeline (GitHub Actions / GitLab CI)
  Trigger: Merge to develop branch

  Pipeline Steps:
    1. Checkout code
    2. Install dependencies: npm ci
    3. Run migrations: npx prisma migrate deploy
    4. Generate Prisma Client: npx prisma generate
    5. Run tests: npm run test:e2e
    6. Deploy to staging ECS

Step 2: Smoke Testing (Automated)
  - Health check: GET /api/health (verify database connectivity)
  - Migration check:
      SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 1;
      -- Expected: '20260115123456_add_notifications_table'

Step 3: QA Testing (Manual)
  - QA team tests notification feature on staging
  - Verify: Notifications appear in UI
  - Verify: Database query: SELECT COUNT(*) FROM notifications; (>0)

Step 4: Approval Gate
  - QA sign-off required before production deployment
  - Staging soak time: 24 hours minimum (catch latent bugs)
```

### **2.3 Production Environment**

```yaml
Step 1: Pre-Deployment Checklist
  - ✅ Staging tests passed (QA sign-off)
  - ✅ Backup database (manual RDS snapshot)
      aws rds create-db-snapshot \
        --db-instance-identifier elderly-care-prod \
        --db-snapshot-identifier pre-migration-20260115

  - ✅ Schedule maintenance window (if downtime expected)
      - Notify facility 7 days in advance
      - Preferred: Sunday 2:00-3:00 AM CET (lowest traffic)

  - ✅ Review migration SQL (estimate execution time)
      - Small change (<1 minute): Deploy anytime
      - Large change (5-10 minutes): Maintenance window required
      - ALTER TABLE on large table: See "Zero-Downtime Migrations" below

Step 2: Deploy Migration (Zero-Downtime)
  CI/CD Pipeline (Production):
    1. Checkout main branch
    2. npm ci
    3. npx prisma migrate deploy
       - Applies all pending migrations sequentially
       - Each migration runs in a transaction (rollback on failure)
    4. npx prisma generate
    5. Build Docker image
    6. Deploy to ECS (rolling deployment):
       - Stop 1 old container → Start 1 new container (repeat 10 times)
       - Health checks ensure new container healthy before stopping next

  Expected Duration:
    - Migration: <1 minute (CREATE TABLE is instant)
    - Rolling deployment: 10 minutes (10 containers × 1 minute)
    - Total downtime: ZERO (rolling deployment maintains availability)

Step 3: Post-Deployment Verification
  - Health check: GET /api/health (all containers healthy)
  - Database check:
      SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 1;
      -- Expected: '20260115123456_add_notifications_table'

  - Feature test: Create test notification (admin user)
  - Monitoring: CloudWatch dashboard (no errors, latency normal)

Step 4: Monitor for 1 hour
  - Watch CloudWatch Logs (no 500 errors)
  - Watch CloudWatch RDS metrics (CPU, connections normal)
  - Watch application errors (Sentry/New Relic)

Step 5: Announce Success
  - Post in Slack #deployments: "✅ Notifications feature deployed"
  - Update change log: docs/CHANGELOG.md
```

---

## 3. Zero-Downtime Migration Patterns

### **Pattern 1: Adding a Column (Simple)**

```sql
-- ✅ SAFE: Adding nullable column (instant, no table rewrite)
ALTER TABLE residents ADD COLUMN preferred_language VARCHAR(10);

-- ✅ SAFE: Adding column with DEFAULT (PostgreSQL 11+ fast path)
ALTER TABLE residents ADD COLUMN preferred_language VARCHAR(10) DEFAULT 'de';
-- PostgreSQL 11+: No table rewrite if DEFAULT is constant

-- ❌ UNSAFE: Adding NOT NULL column without DEFAULT
ALTER TABLE residents ADD COLUMN preferred_language VARCHAR(10) NOT NULL;
-- Fails if table has existing rows (cannot be NULL)

-- ✅ WORKAROUND: Add nullable, backfill, add NOT NULL
-- Step 1: Add nullable column
ALTER TABLE residents ADD COLUMN preferred_language VARCHAR(10);

-- Step 2: Backfill data (batched UPDATE, see "Data Migrations" below)
UPDATE residents SET preferred_language = 'de' WHERE preferred_language IS NULL;

-- Step 3: Add NOT NULL constraint
ALTER TABLE residents ALTER COLUMN preferred_language SET NOT NULL;
```

### **Pattern 2: Adding an Index (Zero Downtime)**

```sql
-- ✅ SAFE: CREATE INDEX CONCURRENTLY (no table lock)
CREATE INDEX CONCURRENTLY idx_residents_preferred_language
ON residents(preferred_language);

-- ❌ UNSAFE: CREATE INDEX without CONCURRENTLY
CREATE INDEX idx_residents_preferred_language ON residents(preferred_language);
-- Locks table for writes during index creation (minutes for large tables)

-- Note: CONCURRENTLY cannot run inside a transaction
-- Prisma Migrate requires manual SQL for CONCURRENTLY
```

**Prisma Migration with CONCURRENTLY:**
```sql
-- File: prisma/migrations/20260115_add_language_index/migration.sql

-- CreateIndex (manually edited to add CONCURRENTLY)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_residents_preferred_language"
ON "residents"("preferred_language");
```

### **Pattern 3: Renaming a Column (Expand-Contract)**

**Problem:** Renaming breaks backward compatibility (old code references old column name).

**Solution:** Expand-Contract (3-phase deployment)

```sql
-- Phase 1: EXPAND (Add new column, dual-write)
-- Migration 1: Add new column
ALTER TABLE residents ADD COLUMN full_name VARCHAR(200);

-- Application code (Phase 1):
-- Write to BOTH old and new columns
await prisma.resident.create({
  data: {
    first_name: 'Helga',
    last_name: 'Schmidt',
    full_name: 'Helga Schmidt', // New column
  },
});

-- Deploy Phase 1 (backward compatible)

-- Phase 2: MIGRATE (Backfill old data)
-- Batch update: Set full_name = first_name || ' ' || last_name
UPDATE residents
SET full_name = first_name || ' ' || last_name
WHERE full_name IS NULL;

-- Application code (Phase 2):
-- Read from new column, fallback to old columns
const fullName = resident.full_name || `${resident.first_name} ${resident.last_name}`;

-- Deploy Phase 2

-- Phase 3: CONTRACT (Remove old columns)
-- Migration 3: Drop old columns (only after Phase 2 deployed for 7 days)
ALTER TABLE residents DROP COLUMN first_name;
ALTER TABLE residents DROP COLUMN last_name;

-- Application code (Phase 3):
-- Read only from new column
const fullName = resident.full_name;

-- Deploy Phase 3
```

### **Pattern 4: Changing Column Type (Zero Downtime)**

```sql
-- ❌ UNSAFE: Direct column type change (table rewrite)
ALTER TABLE residents ALTER COLUMN care_level_pflegegrad TYPE VARCHAR(10);
-- Locks table for hours on large tables

-- ✅ SAFE: Expand-Contract (3-phase)
-- Phase 1: Add new column with new type
ALTER TABLE residents ADD COLUMN care_level_pflegegrad_new VARCHAR(10);

-- Phase 2: Backfill data
UPDATE residents
SET care_level_pflegegrad_new = care_level_pflegegrad::TEXT
WHERE care_level_pflegegrad_new IS NULL;

-- Phase 3: Swap columns (drop old, rename new)
ALTER TABLE residents DROP COLUMN care_level_pflegegrad;
ALTER TABLE residents RENAME COLUMN care_level_pflegegrad_new TO care_level_pflegegrad;
```

### **Pattern 5: Adding Foreign Key (Zero Downtime)**

```sql
-- ✅ SAFE: Add FK with NOT VALID (skips existing rows validation)
ALTER TABLE medication_logs
ADD CONSTRAINT medication_logs_resident_id_fkey
FOREIGN KEY (resident_id) REFERENCES residents(id)
NOT VALID;

-- Then validate asynchronously (no table lock)
ALTER TABLE medication_logs
VALIDATE CONSTRAINT medication_logs_resident_id_fkey;
-- Validates in background, no write lock
```

---

## 4. Data Migrations (Batch Updates)

### **Problem: Backfilling Large Tables**

```sql
-- ❌ BAD: Single UPDATE locks table for minutes
UPDATE medication_logs SET is_billed = FALSE WHERE is_billed IS NULL;
-- Locks 847,600 rows for 5 minutes (production outage)

-- ✅ GOOD: Batched UPDATE (10,000 rows at a time)
DO $$
DECLARE
    batch_size INT := 10000;
    rows_updated INT;
BEGIN
    LOOP
        UPDATE medication_logs
        SET is_billed = FALSE
        WHERE id IN (
            SELECT id FROM medication_logs
            WHERE is_billed IS NULL
            LIMIT batch_size
        );

        GET DIAGNOSTICS rows_updated = ROW_COUNT;
        EXIT WHEN rows_updated = 0;

        -- Commit transaction (release locks)
        COMMIT;

        -- Sleep 100ms between batches (reduce load)
        PERFORM pg_sleep(0.1);
    END LOOP;
END $$;
```

**Prisma Data Migration (Custom Script):**
```typescript
// scripts/backfill-is-billed.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function backfillIsBilled() {
  const batchSize = 10000;
  let updatedCount = 0;

  while (true) {
    // Find batch of rows with NULL is_billed
    const rows = await prisma.medicationLog.findMany({
      where: { isBilled: null },
      select: { id: true },
      take: batchSize,
    });

    if (rows.length === 0) break;

    // Update batch
    await prisma.medicationLog.updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: { isBilled: false },
    });

    updatedCount += rows.length;
    console.log(`Backfilled ${updatedCount} rows...`);

    // Sleep 100ms between batches
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`✅ Backfill complete: ${updatedCount} rows updated`);
}

backfillIsBilled()
  .catch((e) => {
    console.error('❌ Backfill failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

**Run Data Migration:**
```bash
# Run on production (via SSH to ECS container or AWS Lambda)
tsx scripts/backfill-is-billed.ts
```

---

## 5. Rollback Procedures

### **5.1 Migration Failed (Transaction Rollback)**

```yaml
Scenario: Migration fails mid-execution (syntax error, constraint violation)

Automatic Rollback:
  - Prisma Migrate runs each migration in a transaction
  - If migration fails, PostgreSQL rolls back automatically
  - Database state: Unchanged (no partial migration)

Verification:
  - Check migration status:
      SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 1;
      -- Last successful migration (failed migration not recorded)

  - Application state: Continues using old schema (no code changes deployed)

Next Steps:
  1. Fix migration SQL (correct syntax error)
  2. Re-run: npx prisma migrate deploy
  3. Verify: Migration succeeds
```

### **5.2 Migration Succeeded, Application Broken**

```yaml
Scenario: Migration applied successfully, but application has bugs

Rollback Strategy:
  Option 1: Revert Application Code (Preferred)
    - Git revert: git revert HEAD
    - Redeploy: CI/CD deploys previous version
    - Database: Keep new schema (backward compatible)
    - Duration: 10 minutes (rolling deployment)

  Option 2: Rollback Migration (Last Resort)
    - Create reverse migration (DROP TABLE, DROP COLUMN, etc.)
    - Apply: npx prisma migrate deploy
    - Redeploy: Application code to match old schema
    - Duration: 20 minutes (migration + deployment)
    - Risk: Data loss if new columns had data

Recommended: Design migrations as backward compatible (old code works with new schema)
```

### **5.3 Data Corruption After Migration**

```yaml
Scenario: Migration succeeded, but data integrity compromised (e.g., audit_log_ledger chain broken)

Detection:
  - Daily verify_audit_chain() detects is_valid = FALSE
  - CRITICAL alert to on-call DevOps + DBA

Rollback Strategy:
  1. Stop all writes immediately:
     - Set application to read-only mode (maintenance page)

  2. Assess corruption scope:
     - Query: SELECT * FROM verify_audit_chain() WHERE NOT is_valid;
     - Determine: When did corruption start? (timestamp)

  3. Point-in-Time Recovery:
     - Restore RDS snapshot to pre-migration timestamp
     - Create new instance: elderly-care-prod-restored
     - Verify: Run verify_audit_chain() on restored database

  4. Cutover to restored database:
     - Update DNS: elderly-care-db.example.com → restored instance
     - Restart API servers
     - Duration: 2 hours (within RTO)

  5. Post-mortem:
     - Investigate root cause (migration bug? application bug?)
     - Fix migration script
     - Implement prevention (add verify_audit_chain() to migration tests)
```

### **5.4 Rollback Decision Tree**

```
Migration applied successfully?
├─ NO → Automatic rollback (transaction failed)
│       └─ Fix migration SQL, retry
│
└─ YES → Application deployed successfully?
    ├─ NO → Revert application code (keep new schema)
    │       └─ Duration: 10 minutes
    │
    └─ YES → Data integrity compromised?
        ├─ NO → Monitor for 1 hour (success)
        │       └─ Announce deployment success
        │
        └─ YES → Point-in-time recovery (restore snapshot)
                └─ Duration: 2 hours (within RTO)
```

---

## 6. Partitioning Migration (audit_log_ledger)

### **Problem: Converting to Partitioned Table**

```yaml
Current State:
  - audit_log_ledger is a regular table (non-partitioned)
  - Contains 500,000 rows after 6 months
  - Will grow to 43.8M rows over 10 years

Goal:
  - Convert to partitioned table (yearly partitions)
  - Zero downtime (no write locks)

Challenge:
  - PostgreSQL cannot convert existing table to partitioned in-place
  - Must create new partitioned table, copy data, swap tables
```

### **6.1 Partitioning Migration Steps (Zero Downtime)**

```sql
-- Step 1: Create new partitioned table (shadow table)
CREATE TABLE audit_log_ledger_partitioned (
    LIKE audit_log_ledger INCLUDING ALL
) PARTITION BY RANGE (event_timestamp);

-- Step 2: Create partitions (2026-2036)
CREATE TABLE audit_log_2026 PARTITION OF audit_log_ledger_partitioned
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE TABLE audit_log_2027 PARTITION OF audit_log_ledger_partitioned
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

-- ... (10 partitions total)

-- Step 3: Copy data from old table to partitioned table (batched)
DO $$
DECLARE
    batch_size INT := 10000;
    min_id BIGINT;
    max_id BIGINT;
    current_id BIGINT := 0;
BEGIN
    SELECT MIN(id), MAX(id) INTO min_id, max_id FROM audit_log_ledger;

    WHILE current_id < max_id LOOP
        INSERT INTO audit_log_ledger_partitioned
        SELECT * FROM audit_log_ledger
        WHERE id > current_id AND id <= current_id + batch_size;

        current_id := current_id + batch_size;

        RAISE NOTICE 'Copied rows up to ID %', current_id;

        -- Sleep 100ms between batches (reduce load)
        PERFORM pg_sleep(0.1);
    END LOOP;
END $$;

-- Step 4: Verify row counts match
SELECT COUNT(*) FROM audit_log_ledger; -- 500,000
SELECT COUNT(*) FROM audit_log_ledger_partitioned; -- 500,000

-- Step 5: Swap tables (atomic rename)
BEGIN;
    ALTER TABLE audit_log_ledger RENAME TO audit_log_ledger_old;
    ALTER TABLE audit_log_ledger_partitioned RENAME TO audit_log_ledger;
COMMIT;

-- Step 6: Verify application writes to new partitioned table
INSERT INTO audit_log_ledger (user_id, action, ...) VALUES (...);
SELECT * FROM audit_log_ledger ORDER BY id DESC LIMIT 1; -- Verify new row

-- Step 7: Drop old table (after 7 days of monitoring)
DROP TABLE audit_log_ledger_old;
```

**Duration:**
- Step 1-2: 1 minute (CREATE TABLE is instant)
- Step 3: 15 minutes (500,000 rows, batched copy)
- Step 4-6: 1 minute (verification + swap)
- **Total: 17 minutes (zero downtime, application continues writing to old table during copy)**

---

## 7. Migration Testing

### **7.1 Local Testing (Required)**

```bash
# Test migration on local PostgreSQL
npm run migrate:dev

# Verify tables created
psql elderly_care_dev -c "\dt"

# Run integration tests
npm run test:integration

# Test rollback (reset database)
npm run migrate:reset
npm run migrate:dev
```

### **7.2 Staging Testing (Required)**

```yaml
Pre-Deployment:
  - Load test data (10,000 rows per table)
  - Run migration: npx prisma migrate deploy
  - Verify: Schema matches production

Post-Deployment:
  - Smoke tests: npm run test:e2e
  - Manual QA: Test all critical user flows
  - Performance test: Artillery load test (100 concurrent users)

Soak Time:
  - Minimum: 24 hours on staging before production
  - Monitor: CloudWatch metrics (latency, errors)
```

### **7.3 Production Testing (Post-Deployment)**

```yaml
Immediate Verification (0-5 minutes):
  - Health check: GET /api/health (200 OK)
  - Database check: SELECT 1; (connectivity)
  - Migration check: SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 1;

Smoke Tests (5-15 minutes):
  - Create test resident (admin user)
  - Log test medication (caregiver user)
  - Send test notification (system)

Monitoring (15-60 minutes):
  - CloudWatch RDS: CPU, connections, latency
  - CloudWatch Logs: No 500 errors
  - Sentry: No new error types

Load Test (60+ minutes):
  - Gradually increase traffic (10% → 50% → 100%)
  - Monitor: p95 latency stays <100ms
```

---

## 8. Migration Checklist

### **Pre-Migration Checklist**

```yaml
Planning:
  - [ ] Migration reviewed by DBA (SQL syntax, performance impact)
  - [ ] Migration tested on staging (24+ hours soak time)
  - [ ] QA sign-off (all tests passed)
  - [ ] Rollback plan documented (revert strategy)

Backup:
  - [ ] Manual RDS snapshot created (pre-migration-YYYYMMDD)
  - [ ] Snapshot verified (restore test successful)
  - [ ] Backup retention: 30 days minimum

Notification:
  - [ ] Facility notified (7 days advance for maintenance window)
  - [ ] On-call DevOps available (phone, Slack)
  - [ ] Post in Slack #deployments: "🚀 Deploying migration X at Y time"

Performance:
  - [ ] Migration SQL reviewed (no table locks expected)
  - [ ] Estimated duration: <1 minute (or maintenance window scheduled)
  - [ ] Index creation uses CONCURRENTLY (if applicable)
```

### **Post-Migration Checklist**

```yaml
Immediate (0-5 minutes):
  - [ ] Health check passed (200 OK)
  - [ ] Database connectivity verified (SELECT 1)
  - [ ] Migration recorded in schema_migrations table

Verification (5-15 minutes):
  - [ ] Smoke tests passed (test user flows)
  - [ ] CloudWatch metrics normal (CPU, connections, latency)
  - [ ] No errors in CloudWatch Logs

Monitoring (15-60 minutes):
  - [ ] Monitor CloudWatch dashboard (no anomalies)
  - [ ] Monitor Sentry (no new error types)
  - [ ] Monitor application APM (latency normal)

Documentation:
  - [ ] Update CHANGELOG.md (document schema changes)
  - [ ] Post in Slack #deployments: "✅ Migration X deployed successfully"
  - [ ] Document any manual steps (data migrations, index creation)

Cleanup (7+ days later):
  - [ ] Drop old columns/tables (if Expand-Contract pattern)
  - [ ] Verify no references to old schema in code
  - [ ] Delete pre-migration snapshot (cost optimization)
```

---

## 9. Emergency Procedures

### **9.1 Abort Migration (In Progress)**

```yaml
Scenario: Migration taking too long (>5 minutes), causing downtime

Action:
  1. Cancel migration (Ctrl+C in terminal)
     - PostgreSQL rolls back transaction automatically
     - Database state: Unchanged

  2. Verify rollback:
     - Query: SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 1;
     - Expected: Last successful migration (not the failed one)

  3. Investigate:
     - Check migration SQL (table locks? missing index?)
     - Estimate duration: EXPLAIN ANALYZE <migration SQL>

  4. Reschedule:
     - If >1 minute: Schedule maintenance window
     - Notify facility 7 days in advance
```

### **9.2 Hotfix Migration (Emergency)**

```yaml
Scenario: Critical bug requires immediate schema change (e.g., wrong data type causes data loss)

Fast-Track Process:
  1. Create hotfix branch: git checkout -b hotfix/fix-column-type
  2. Generate migration: npx prisma migrate dev --name fix_column_type_urgent
  3. Test on local database (5 minutes)
  4. Deploy to staging (skip soak time, immediate QA test)
  5. QA approval (30 minutes)
  6. Deploy to production (rolling deployment)
  7. Monitor for 15 minutes (instead of 1 hour)
  8. Post-mortem: Document root cause, prevention

Duration: 1 hour (vs 24+ hours normal process)
Risk: Higher (less testing time)
Justification: Data loss prevention (patient safety)
```

---

## 10. Migration History Tracking

### **10.1 schema_migrations Table**

```sql
-- Prisma Migrate stores migration history here
SELECT * FROM "_prisma_migrations" ORDER BY finished_at DESC;

-- Columns:
--   id: UUID (migration identifier)
--   checksum: SHA-256 hash of migration SQL (detects tampering)
--   finished_at: Timestamp when migration completed
--   migration_name: Human-readable name (e.g., "20260115_add_notifications")
--   logs: Execution logs (errors, warnings)
--   rolled_back_at: Timestamp if migration rolled back
--   started_at: Timestamp when migration started
--   applied_steps_count: Number of SQL statements executed

-- Custom table for human-readable history
CREATE TABLE schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    description TEXT,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO schema_migrations (version, description) VALUES
('1.0.0', 'Initial schema with all 17 tables, indexes, triggers');
```

### **10.2 Migration Audit Log**

```yaml
Requirement: GoBD compliance requires audit trail of schema changes

Implementation:
  - All DDL statements logged to audit_log_ledger
  - event_type: 'SYSTEM_ALERT'
  - action: 'SCHEMA_MIGRATION'
  - resource_type: 'database'
  - current_state: { migration_name, sql_statements, applied_at }

Example:
INSERT INTO audit_log_ledger (
    user_id, user_role, action, resource_type, resource_id,
    current_state, ip_address, event_type
) VALUES (
    '00000000-0000-0000-0000-000000000000', -- System user
    'system',
    'SCHEMA_MIGRATION',
    'database',
    '20260115123456_add_notifications_table',
    '{"migration": "add_notifications_table", "applied_at": "2026-01-15T12:34:56Z"}',
    '127.0.0.1',
    'DATA_MODIFICATION'
);
```

---

## 11. Best Practices Summary

### **DO:**
- ✅ Test migrations on local + staging before production
- ✅ Use CREATE INDEX CONCURRENTLY (zero downtime)
- ✅ Batch data migrations (10,000 rows at a time)
- ✅ Use Expand-Contract for breaking changes (3-phase deployment)
- ✅ Document rollback strategy before deploying
- ✅ Monitor for 1 hour after deployment
- ✅ Keep migrations small (single logical change per migration)

### **DON'T:**
- ❌ Add NOT NULL column without DEFAULT (breaks existing rows)
- ❌ Use CREATE INDEX without CONCURRENTLY (table locks)
- ❌ Rename columns without Expand-Contract (backward incompatible)
- ❌ Deploy migrations without staging soak time (untested)
- ❌ Batch update entire table in single transaction (long locks)
- ❌ Deploy on Friday afternoon (weekend incident risk)

---

## 12. Next Steps

### **Immediate (Week 3 - Setup)**
1. ✅ Initialize Prisma: npx prisma init
2. ✅ Generate schema.prisma from SQL: npx prisma db pull
3. ✅ Create initial migration: npx prisma migrate dev --name init
4. ✅ Set up CI/CD pipeline (GitHub Actions: prisma migrate deploy)

### **Week 5-11 (Development)**
5. ✅ Train team on Prisma Migrate workflow
6. ✅ Document Expand-Contract pattern (in team wiki)
7. ✅ Create migration testing checklist
8. ✅ Set up staging environment (mirror production)

### **Week 12-14 (Pre-Production)**
9. ✅ Load test migrations (simulate 847,600 rows)
10. ✅ Practice rollback procedure (restore snapshot drill)
11. ✅ Document emergency hotfix process

---

**Document Version:** 1.0
**Last Updated:** January 2025
**Prepared By:** Database Architect (Claude Code)
**Review Status:** ✅ Complete - Ready for team training
**Approval Required:** CTO + DevOps Lead + DBA

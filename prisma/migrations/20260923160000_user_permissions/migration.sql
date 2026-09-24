-- Permissions granulaires administrables. Additive : aucun changement des tables existantes.

CREATE TYPE "AdminPermission" AS ENUM (
  'USERS_ROLES',
  'PRODUCTS_TARIFFS',
  'QUOTES_VALIDATION',
  'PRODUCTION',
  'COMMISSIONS',
  'MESSAGING'
);

CREATE TYPE "PermissionAuditAction" AS ENUM ('GRANTED', 'REVOKED');

CREATE TABLE "user_permissions" (
  "user_id" TEXT NOT NULL,
  "permission" "AdminPermission" NOT NULL,
  "granted_by_id" TEXT,
  "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("user_id", "permission")
);

CREATE TABLE "permission_audit_logs" (
  "id" TEXT NOT NULL,
  "target_user_id" TEXT NOT NULL,
  "permission" "AdminPermission" NOT NULL,
  "action" "PermissionAuditAction" NOT NULL,
  "changed_by_id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ip_address" TEXT,
  "user_agent" TEXT,

  CONSTRAINT "permission_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_permissions_granted_by_id_idx" ON "user_permissions"("granted_by_id");
CREATE INDEX "permission_audit_logs_target_user_id_idx" ON "permission_audit_logs"("target_user_id");
CREATE INDEX "permission_audit_logs_changed_by_id_idx" ON "permission_audit_logs"("changed_by_id");
CREATE INDEX "permission_audit_logs_createdAt_idx" ON "permission_audit_logs"("createdAt");

ALTER TABLE "user_permissions"
  ADD CONSTRAINT "user_permissions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_permissions"
  ADD CONSTRAINT "user_permissions_granted_by_id_fkey"
  FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "permission_audit_logs"
  ADD CONSTRAINT "permission_audit_logs_target_user_id_fkey"
  FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "permission_audit_logs"
  ADD CONSTRAINT "permission_audit_logs_changed_by_id_fkey"
  FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Bootstrap : chaque administrateur existant reçoit les 6 permissions.
INSERT INTO "user_permissions" ("user_id", "permission", "granted_at")
SELECT u."id", p.permission, CURRENT_TIMESTAMP
FROM "users" u
CROSS JOIN (
  SELECT unnest(ARRAY[
    'USERS_ROLES',
    'PRODUCTS_TARIFFS',
    'QUOTES_VALIDATION',
    'PRODUCTION',
    'COMMISSIONS',
    'MESSAGING'
  ]::"AdminPermission"[]) AS permission
) p
WHERE u."role" = 'ADMIN';

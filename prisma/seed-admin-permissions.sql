-- Bootstrap des administrateurs existants (rôle ADMIN = accès complet).
-- Relançable : une permission déjà présente n'est pas réécrite.

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
WHERE u."role" = 'ADMIN'
ON CONFLICT ("user_id", "permission") DO NOTHING;

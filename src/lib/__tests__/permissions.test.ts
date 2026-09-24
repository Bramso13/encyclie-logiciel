import { describe, expect, it } from "vitest";
import {
  ADMIN_PERMISSIONS,
  evaluateAccess,
  planPermissionMutation,
  SELF_REVOKE_USERS_ROLES_MESSAGE,
} from "@/lib/permissions";
import {
  applyPermissionChange,
  type PermissionStore,
} from "@/lib/permission-service";

describe("withPermission / evaluateAccess", () => {
  it("accorde un administrateur qui possède la permission", () => {
    expect(
      evaluateAccess({
        role: "ADMIN",
        permissions: ["PRODUCTION"],
        required: "PRODUCTION",
      }),
    ).toEqual({ ok: true });
  });

  it("refuse un administrateur sans la permission avec un message explicite", () => {
    const decision = evaluateAccess({
      role: "ADMIN",
      permissions: ["USERS_ROLES"],
      required: "PRODUCTION",
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.status).toBe(403);
      expect(decision.message).toContain("Production");
    }
  });

  it("refuse un non-administrateur", () => {
    const decision = evaluateAccess({
      role: "BROKER",
      permissions: [...ADMIN_PERMISSIONS],
      required: "PRODUCTION",
    });
    expect(decision).toEqual({
      ok: false,
      status: 403,
      message: "Accès refusé - rôle insuffisant",
    });
  });
});

describe("garde-fous permissions", () => {
  it("refuse l'auto-retrait de USERS_ROLES", () => {
    const plan = planPermissionMutation({
      actorId: "admin-1",
      targetId: "admin-1",
      targetRole: "ADMIN",
      currentPermissions: [...ADMIN_PERMISSIONS],
      permission: "USERS_ROLES",
      granted: false,
    });
    expect(plan).toEqual({
      ok: false,
      status: 403,
      message: SELF_REVOKE_USERS_ROLES_MESSAGE,
    });
  });

  it("autorise le retrait de USERS_ROLES sur un autre administrateur", () => {
    const plan = planPermissionMutation({
      actorId: "admin-1",
      targetId: "admin-2",
      targetRole: "ADMIN",
      currentPermissions: ["USERS_ROLES", "PRODUCTION"],
      permission: "USERS_ROLES",
      granted: false,
    });
    expect(plan.ok).toBe(true);
    if (plan.ok) expect(plan.revoke).toEqual(["USERS_ROLES"]);
  });

  it("rétrograde un admin en courtier en révoquant toutes ses permissions", () => {
    const plan = planPermissionMutation({
      actorId: "admin-1",
      targetId: "admin-2",
      targetRole: "ADMIN",
      currentPermissions: ["PRODUCTION", "MESSAGING"],
      nextRole: "BROKER",
    });
    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.roleUpdate).toBe("BROKER");
      expect(plan.revoke).toEqual(["PRODUCTION", "MESSAGING"]);
    }
  });

  it("refuse qu'un admin se rétrograde lui-même", () => {
    const plan = planPermissionMutation({
      actorId: "admin-1",
      targetId: "admin-1",
      targetRole: "ADMIN",
      currentPermissions: [...ADMIN_PERMISSIONS],
      nextRole: "BROKER",
    });
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.message).toBe(SELF_REVOKE_USERS_ROLES_MESSAGE);
  });
});

describe("écriture du journal d'audit", () => {
  it("journalise une attribution et un retrait", async () => {
    const audits: Array<{ action: string; permission: string; ipAddress?: string | null }> = [];
    const permissions = new Set<string>();

    const db: PermissionStore = {
      user: {
        findUnique: async () => ({
          id: "admin-2",
          role: "ADMIN",
          permissions: [...permissions].map((permission) => ({ permission })),
        }),
        update: async () => undefined,
      },
      userPermission: {
        findMany: async () =>
          [...permissions].map((permission) => ({ permission })),
        deleteMany: async ({ where }) => {
          permissions.delete(where.permission);
        },
        create: async ({ data }) => {
          permissions.add(data.permission);
        },
      },
      permissionAuditLog: {
        create: async ({ data }) => {
          audits.push(data);
        },
        findMany: async () => [],
      },
      $transaction: async (fn) => fn(db),
    };

    const granted = await applyPermissionChange(
      {
        actorId: "admin-1",
        targetUserId: "admin-2",
        permission: "PRODUCTION",
        granted: true,
        ipAddress: "10.0.0.8",
        userAgent: "vitest",
      },
      db,
    );
    expect(granted.ok).toBe(true);
    expect(audits).toEqual([
      expect.objectContaining({
        action: "GRANTED",
        permission: "PRODUCTION",
        ipAddress: "10.0.0.8",
      }),
    ]);

    const revoked = await applyPermissionChange(
      {
        actorId: "admin-1",
        targetUserId: "admin-2",
        permission: "PRODUCTION",
        granted: false,
      },
      db,
    );
    expect(revoked.ok).toBe(true);
    expect(audits[1]).toEqual(
      expect.objectContaining({ action: "REVOKED", permission: "PRODUCTION" }),
    );
    expect(permissions.size).toBe(0);
  });

  it("refuse l'auto-retrait sans écrire d'audit", async () => {
    const audits: unknown[] = [];
    const db: PermissionStore = {
      user: {
        findUnique: async () => ({
          id: "admin-1",
          role: "ADMIN",
          permissions: [{ permission: "USERS_ROLES" }],
        }),
        update: async () => undefined,
      },
      userPermission: {
        findMany: async () => [{ permission: "USERS_ROLES" }],
        deleteMany: async () => undefined,
        create: async () => undefined,
      },
      permissionAuditLog: {
        create: async () => {
          audits.push(true);
        },
        findMany: async () => [],
      },
      $transaction: async (fn) => fn(db),
    };

    const result = await applyPermissionChange(
      {
        actorId: "admin-1",
        targetUserId: "admin-1",
        permission: "USERS_ROLES",
        granted: false,
      },
      db,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
    expect(audits).toHaveLength(0);
  });
});

import { prisma } from "@/lib/prisma";
import {
  evaluateAccess,
  isAdminPermission,
  planPermissionMutation,
  type AdminPermission,
  type PermissionPlan,
} from "@/lib/permissions";

export interface PermissionStore {
  user: {
    findUnique(args: {
      where: { id: string };
      select: {
        id: true;
        role: true;
        permissions: { select: { permission: true } };
      };
    }): Promise<{
      id: string;
      role: string;
      permissions: { permission: string }[];
    } | null>;
    update(args: {
      where: { id: string };
      data: { role: "ADMIN" | "BROKER" };
    }): Promise<unknown>;
  };
  userPermission: {
    findMany(args: {
      where: { userId: string };
      select: { permission: true };
    }): Promise<{ permission: string }[]>;
    deleteMany(args: {
      where: { userId: string; permission: AdminPermission };
    }): Promise<unknown>;
    create(args: {
      data: {
        userId: string;
        permission: AdminPermission;
        grantedById: string;
      };
    }): Promise<unknown>;
  };
  permissionAuditLog: {
    create(args: {
      data: {
        targetUserId: string;
        permission: AdminPermission;
        action: "GRANTED" | "REVOKED";
        changedById: string;
        ipAddress?: string | null;
        userAgent?: string | null;
      };
    }): Promise<unknown>;
    findMany(args: {
      where: { targetUserId: string };
      orderBy: { createdAt: "desc" };
      take?: number;
      include: {
        changedBy: { select: { id: true; name: true; email: true } };
      };
    }): Promise<
      Array<{
        id: string;
        permission: string;
        action: string;
        createdAt: Date;
        ipAddress: string | null;
        userAgent: string | null;
        changedBy: { id: string; name: string | null; email: string };
      }>
    >;
  };
  $transaction<T>(fn: (tx: PermissionStore) => Promise<T>): Promise<T>;
}

function store(): PermissionStore {
  return prisma as unknown as PermissionStore;
}

export async function loadPermissionNames(
  userId: string,
  db: PermissionStore = store(),
): Promise<AdminPermission[]> {
  const rows = await db.userPermission.findMany({
    where: { userId },
    select: { permission: true },
  });
  return rows.map((row) => row.permission).filter(isAdminPermission);
}

export async function decideAccess(
  userId: string,
  role: string,
  required: AdminPermission,
  db: PermissionStore = store(),
) {
  const permissions = await loadPermissionNames(userId, db);
  return evaluateAccess({ role, permissions, required });
}

export type PermissionChangeInput = {
  actorId: string;
  targetUserId: string;
  permission?: AdminPermission;
  granted?: boolean;
  nextRole?: "ADMIN" | "BROKER";
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type PermissionChangeResult =
  | { ok: false; status: number; message: string }
  | { ok: true; plan: Extract<PermissionPlan, { ok: true }> };

export async function applyPermissionChange(
  input: PermissionChangeInput,
  db: PermissionStore = store(),
): Promise<PermissionChangeResult> {
  const target = await db.user.findUnique({
    where: { id: input.targetUserId },
    select: {
      id: true,
      role: true,
      permissions: { select: { permission: true } },
    },
  });

  if (!target) {
    return { ok: false, status: 404, message: "Utilisateur non trouvé" };
  }

  const plan = planPermissionMutation({
    actorId: input.actorId,
    targetId: target.id,
    targetRole: target.role,
    currentPermissions: target.permissions.map((row) => row.permission),
    permission: input.permission,
    granted: input.granted,
    nextRole: input.nextRole,
  });

  if (!plan.ok) return plan;
  if (!plan.roleUpdate && !plan.grant && plan.revoke.length === 0) {
    return { ok: true, plan };
  }

  await db.$transaction(async (tx) => {
    if (plan.roleUpdate) {
      await tx.user.update({
        where: { id: target.id },
        data: { role: plan.roleUpdate },
      });
    }

    for (const permission of plan.revoke) {
      await tx.userPermission.deleteMany({
        where: { userId: target.id, permission },
      });
      await tx.permissionAuditLog.create({
        data: {
          targetUserId: target.id,
          permission,
          action: "REVOKED",
          changedById: input.actorId,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });
    }

    if (plan.grant) {
      await tx.userPermission.create({
        data: {
          userId: target.id,
          permission: plan.grant,
          grantedById: input.actorId,
        },
      });
      await tx.permissionAuditLog.create({
        data: {
          targetUserId: target.id,
          permission: plan.grant,
          action: "GRANTED",
          changedById: input.actorId,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });
    }
  });

  return { ok: true, plan };
}

export async function listPermissionAudit(
  targetUserId: string,
  db: PermissionStore = store(),
) {
  return db.permissionAuditLog.findMany({
    where: { targetUserId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      changedBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export const ADMIN_PERMISSIONS = [
  "USERS_ROLES",
  "PRODUCTS_TARIFFS",
  "QUOTES_VALIDATION",
  "PRODUCTION",
  "COMMISSIONS",
  "MESSAGING",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<AdminPermission, string> = {
  USERS_ROLES: "Utilisateurs et rôles",
  PRODUCTS_TARIFFS: "Produits et tarifs",
  QUOTES_VALIDATION: "Validation des dossiers",
  PRODUCTION: "Production",
  COMMISSIONS: "Commissions",
  MESSAGING: "Messagerie",
};

export const SELF_REVOKE_USERS_ROLES_MESSAGE =
  "Vous ne pouvez pas retirer votre propre permission « Utilisateurs et rôles ».";

const NON_ADMIN_PERMISSION_MESSAGE =
  "Les permissions granulaires concernent uniquement les administrateurs.";

export function isAdminPermission(value: string): value is AdminPermission {
  return (ADMIN_PERMISSIONS as readonly string[]).includes(value);
}

export type AccessDecision =
  | { ok: true }
  | { ok: false; status: 403; message: string };

/**
 * Décision pure derrière `withPermission` : rôle ADMIN requis, puis permission.
 */
export function evaluateAccess(input: {
  role: string;
  permissions: readonly string[];
  required: AdminPermission;
}): AccessDecision {
  if (input.role !== "ADMIN") {
    return {
      ok: false,
      status: 403,
      message: "Accès refusé - rôle insuffisant",
    };
  }

  if (!input.permissions.includes(input.required)) {
    return {
      ok: false,
      status: 403,
      message: `Accès refusé — permission « ${PERMISSION_LABELS[input.required]} » requise`,
    };
  }

  return { ok: true };
}

export type PermissionPlan =
  | { ok: false; status: number; message: string }
  | {
      ok: true;
      roleUpdate?: "ADMIN" | "BROKER";
      grant?: AdminPermission;
      revoke: AdminPermission[];
    };

function knownPermissions(values: readonly string[]): AdminPermission[] {
  return values.filter(isAdminPermission);
}

export function planPermissionMutation(input: {
  actorId: string;
  targetId: string;
  targetRole: string;
  currentPermissions: readonly string[];
  permission?: AdminPermission;
  granted?: boolean;
  nextRole?: "ADMIN" | "BROKER";
}): PermissionPlan {
  const actorIsTarget = input.actorId === input.targetId;
  let role = input.targetRole;
  const held = new Set(knownPermissions(input.currentPermissions));
  const revoke: AdminPermission[] = [];
  let roleUpdate: "ADMIN" | "BROKER" | undefined;

  if (input.nextRole && input.nextRole !== role) {
    if (role === "ADMIN" && input.nextRole === "BROKER") {
      if (actorIsTarget) {
        return {
          ok: false,
          status: 403,
          message: SELF_REVOKE_USERS_ROLES_MESSAGE,
        };
      }
      for (const permission of held) {
        revoke.push(permission);
      }
      held.clear();
      role = "BROKER";
      roleUpdate = "BROKER";
    } else if (input.nextRole === "ADMIN") {
      role = "ADMIN";
      roleUpdate = "ADMIN";
    } else {
      return {
        ok: false,
        status: 400,
        message: "Rôle non pris en charge.",
      };
    }
  }

  let grant: AdminPermission | undefined;

  if (input.permission !== undefined && input.granted !== undefined) {
    const permission = input.permission;
    if (role !== "ADMIN") {
      return {
        ok: false,
        status: 400,
        message: NON_ADMIN_PERMISSION_MESSAGE,
      };
    }

    const hasIt = held.has(permission);
    if (input.granted && !hasIt) {
      grant = permission;
    } else if (!input.granted && hasIt) {
      if (permission === "USERS_ROLES" && actorIsTarget) {
        return {
          ok: false,
          status: 403,
          message: SELF_REVOKE_USERS_ROLES_MESSAGE,
        };
      }
      revoke.push(permission);
    }
  }

  return { ok: true, roleUpdate, grant, revoke };
}

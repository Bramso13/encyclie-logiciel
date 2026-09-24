"use client";

import { AdminPermissionGate } from "@/components/admin/AdminPermissionGate";
import { AdminUsersRolesPanel } from "@/components/admin/AdminUsersRolesPanel";
import { AuthenticatedAppShell } from "@/components/ui/AuthenticatedAppShell";

export default function AdminUsersPage() {
  return (
    <AuthenticatedAppShell>
      <AdminPermissionGate permission="USERS_ROLES">
        <AdminUsersRolesPanel />
      </AdminPermissionGate>
    </AuthenticatedAppShell>
  );
}

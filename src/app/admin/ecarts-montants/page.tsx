"use client";

import EcartsMontantsTab from "@/components/admin/EcartsMontantsTab";
import { AdminPermissionGate } from "@/components/admin/AdminPermissionGate";
import { AuthenticatedAppShell } from "@/components/ui/AuthenticatedAppShell";

export default function EcartsMontantsPage() {
  return (
    <AuthenticatedAppShell>
      <AdminPermissionGate permission="PRODUCTION">
        <EcartsMontantsTab />
      </AdminPermissionGate>
    </AuthenticatedAppShell>
  );
}

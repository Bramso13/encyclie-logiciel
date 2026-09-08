"use client";

import EcartsMontantsTab from "@/components/admin/EcartsMontantsTab";
import { AuthenticatedAppShell } from "@/components/ui/AuthenticatedAppShell";

export default function EcartsMontantsPage() {
  return (
    <AuthenticatedAppShell>
      <EcartsMontantsTab />
    </AuthenticatedAppShell>
  );
}

"use client";

import {
  EmptyState,
  ErrorBanner,
  LoadingState,
} from "@/components/ui/Feedback";
import {
  PERMISSION_LABELS,
  type AdminPermission,
} from "@/lib/permissions";
import { usePermissions } from "@/lib/stores/permissions-store";

export function AdminPermissionGate({
  permission,
  children,
}: {
  permission: AdminPermission;
  children: React.ReactNode;
}) {
  const { hasPermission, loaded, loading, error } = usePermissions();

  if (!loaded || loading) {
    return <LoadingState label="Vérification des droits" />;
  }

  if (error) {
    return <ErrorBanner>{error}</ErrorBanner>;
  }

  if (!hasPermission(permission)) {
    return (
      <EmptyState
        title="Accès refusé"
        description={`La permission « ${PERMISSION_LABELS[permission]} » est requise pour cette fonction.`}
      />
    );
  }

  return children;
}

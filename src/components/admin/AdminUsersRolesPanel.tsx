"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/Controls";
import {
  EmptyState,
  ErrorBanner,
  LoadingState,
  PageHeader,
} from "@/components/ui/Feedback";
import {
  ADMIN_PERMISSIONS,
  PERMISSION_LABELS,
  SELF_REVOKE_USERS_ROLES_MESSAGE,
  type AdminPermission,
} from "@/lib/permissions";
import { notify } from "@/lib/ui/notify";
import { roleLabel } from "@/lib/ui/labels";

type ListedUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  companyName: string | null;
  isActive: boolean;
  permissions: AdminPermission[];
};

type AuditRow = {
  id: string;
  permission: AdminPermission;
  action: "GRANTED" | "REVOKED";
  createdAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  changedBy: { id: string; name: string | null; email: string };
};

export function AdminUsersRolesPanel() {
  const { data: session } = authClient.useSession();
  const [users, setUsers] = useState<ListedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [auditUserId, setAuditUserId] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/users");
      const raw = await response.json();
      if (!response.ok || !raw.success) {
        throw new Error(raw.error || "Impossible de charger les utilisateurs");
      }
      setUsers(raw.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const loadAudit = async (userId: string) => {
    setAuditUserId(userId);
    setAuditLoading(true);
    setAuditError(null);
    try {
      const response = await fetch(`/api/admin/users/${userId}/permission-audit`);
      const raw = await response.json();
      if (!response.ok || !raw.success) {
        throw new Error(raw.error || "Impossible de charger l'historique");
      }
      setAudit(raw.data ?? []);
    } catch (err) {
      setAudit([]);
      setAuditError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setAuditLoading(false);
    }
  };

  const updateUser = async (
    user: ListedUser,
    body: { permission?: AdminPermission; granted?: boolean; role?: "ADMIN" | "BROKER" },
    busy: string,
  ) => {
    setBusyKey(busy);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const raw = await response.json();
      if (!response.ok || !raw.success) {
        throw new Error(raw.error || "Mise à jour impossible");
      }
      notify("Droits mis à jour.", "success");
      await load();
      if (auditUserId === user.id) await loadAudit(user.id);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erreur", "error");
    } finally {
      setBusyKey(null);
    }
  };

  const onToggle = (user: ListedUser, permission: AdminPermission, granted: boolean) => {
    void updateUser(user, { permission, granted }, `${user.id}:${permission}`);
  };

  const onRole = (user: ListedUser, role: "ADMIN" | "BROKER") => {
    if (role === user.role) return;
    if (role === "BROKER" && user.id === session?.user?.id) {
      notify(SELF_REVOKE_USERS_ROLES_MESSAGE, "error");
      return;
    }
    if (role === "BROKER") {
      const confirmed = window.confirm(
        `Rétrograder ${user.name || user.email} en courtier retire toutes ses permissions. Continuer ?`,
      );
      if (!confirmed) return;
    }
    void updateUser(user, { role }, `${user.id}:role`);
  };

  if (loading) return <LoadingState label="Chargement des utilisateurs" />;
  if (error) {
    return (
      <div className="space-y-3">
        <ErrorBanner>{error}</ErrorBanner>
        <Button variant="secondary" onClick={() => void load()}>
          Réessayer
        </Button>
      </div>
    );
  }
  if (users.length === 0) {
    return (
      <EmptyState
        title="Aucun utilisateur"
        description="Les comptes apparaîtront ici dès qu'ils existent."
      />
    );
  }

  const selfId = session?.user?.id;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilisateurs et rôles"
        description="Attribuez les permissions des administrateurs. Chaque changement est journalisé."
      />
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Utilisateur</th>
              <th className="px-3 py-2 font-medium">Rôle</th>
              {ADMIN_PERMISSIONS.map((permission) => (
                <th key={permission} className="px-3 py-2 font-medium">
                  {PERMISSION_LABELS[permission]}
                </th>
              ))}
              <th className="px-3 py-2 font-medium">Historique</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isAdmin = user.role === "ADMIN";
              return (
                <tr key={user.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-3">
                    <p className="font-medium text-ink">{user.name || "—"}</p>
                    <p className="text-xs text-ink-muted">{user.email}</p>
                    {!user.isActive ? (
                      <p className="text-xs text-rose-700">Inactif</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <select
                      aria-label={`Rôle de ${user.email}`}
                      className="rounded-md border border-line bg-white px-2 py-1 text-sm"
                      value={user.role === "BROKER" || user.role === "ADMIN" ? user.role : "ADMIN"}
                      disabled={
                        busyKey === `${user.id}:role` ||
                        (user.role !== "ADMIN" && user.role !== "BROKER")
                      }
                      onChange={(event) =>
                        onRole(user, event.target.value as "ADMIN" | "BROKER")
                      }
                    >
                      <option value="ADMIN">Administrateur</option>
                      <option value="BROKER">Courtier</option>
                    </select>
                    {user.role !== "ADMIN" && user.role !== "BROKER" ? (
                      <p className="mt-1 text-xs text-ink-muted">{roleLabel(user.role)}</p>
                    ) : null}
                  </td>
                  {ADMIN_PERMISSIONS.map((permission) => {
                    const checked = user.permissions.includes(permission);
                    const selfLock =
                      user.id === selfId && permission === "USERS_ROLES" && checked;
                    return (
                      <td key={permission} className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          aria-label={`${PERMISSION_LABELS[permission]} pour ${user.email}`}
                          checked={isAdmin && checked}
                          disabled={
                            !isAdmin ||
                            selfLock ||
                            busyKey === `${user.id}:${permission}`
                          }
                          title={
                            selfLock
                              ? "Vous ne pouvez pas retirer votre propre permission Utilisateurs et rôles."
                              : undefined
                          }
                          onChange={(event) =>
                            onToggle(user, permission, event.target.checked)
                          }
                        />
                      </td>
                    );
                  })}
                  <td className="px-3 py-3">
                    <Button
                      variant="secondary"
                      onClick={() => void loadAudit(user.id)}
                    >
                      Voir
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {auditUserId ? (
        <section className="rounded-lg border border-line bg-white p-4">
          <h2 className="text-sm font-semibold text-ink">Historique des changements</h2>
          {auditLoading ? <LoadingState label="Chargement de l'historique" /> : null}
          {auditError ? <ErrorBanner>{auditError}</ErrorBanner> : null}
          {!auditLoading && !auditError && audit.length === 0 ? (
            <EmptyState
              title="Aucun changement"
              description="Les attributions et retraits apparaîtront ici."
            />
          ) : null}
          {!auditLoading && audit.length > 0 ? (
            <ul className="mt-3 divide-y divide-line text-sm">
              {audit.map((row) => (
                <li key={row.id} className="py-2">
                  <p className="font-medium text-ink">
                    {row.action === "GRANTED" ? "Attribution" : "Retrait"} —{" "}
                    {PERMISSION_LABELS[row.permission] ?? row.permission}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {new Date(row.createdAt).toLocaleString("fr-FR")} ·{" "}
                    {row.changedBy.name || row.changedBy.email}
                    {row.ipAddress ? ` · ${row.ipAddress}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

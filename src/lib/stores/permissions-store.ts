"use client";

import { useCallback, useEffect } from "react";
import { create } from "zustand";
import {
  isAdminPermission,
  type AdminPermission,
} from "@/lib/permissions";

type PermissionsState = {
  permissions: AdminPermission[];
  role: string | null;
  loaded: boolean;
  loading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  reset: () => void;
};

const usePermissionsStore = create<PermissionsState>((set, get) => ({
  permissions: [],
  role: null,
  loaded: false,
  loading: false,
  error: null,
  reset: () =>
    set({
      permissions: [],
      role: null,
      loaded: false,
      loading: false,
      error: null,
    }),
  hydrate: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/users/me/permissions");
      const raw = await response.json();
      if (!response.ok || !raw.success) {
        throw new Error(raw.error || "Impossible de charger les permissions");
      }
      const permissions = (raw.data?.permissions ?? []).filter(isAdminPermission);
      set({
        permissions,
        role: raw.data?.role ?? null,
        loaded: true,
        loading: false,
      });
    } catch (error) {
      set({
        permissions: [],
        loaded: true,
        loading: false,
        error: error instanceof Error ? error.message : "Erreur",
      });
    }
  },
}));

export function usePermissions() {
  const permissions = usePermissionsStore((state) => state.permissions);
  const loaded = usePermissionsStore((state) => state.loaded);
  const loading = usePermissionsStore((state) => state.loading);
  const error = usePermissionsStore((state) => state.error);
  const hydrate = usePermissionsStore((state) => state.hydrate);
  const reset = usePermissionsStore((state) => state.reset);

  useEffect(() => {
    if (!loaded && !loading) void hydrate();
  }, [loaded, loading, hydrate]);

  const hasPermission = useCallback(
    (permission: AdminPermission) => permissions.includes(permission),
    [permissions],
  );

  return {
    permissions,
    hasPermission,
    loaded,
    loading,
    error,
    refresh: hydrate,
    reset,
  };
}

export default usePermissionsStore;

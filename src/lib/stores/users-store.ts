import { create } from "zustand";
import { devtools } from "zustand/middleware";

// Types
interface User {
  id: string;
  name: string;
  email: string;
  role: "BROKER" | "ADMIN" | "UNDERWRITER";
  companyName?: string;
  phone?: string;
  address?: string;
  siretNumber?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UsersState {
  // Data
  users: User[];
  brokers: User[];
  underwriters: User[];
  loading: boolean;
  error: string | null;

  // Pagination
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  // Filters
  filters: {
    role?: string;
    isActive?: boolean;
    search?: string;
  };

  // Actions
  setUsers: (users: User[]) => void;
  setBrokers: (brokers: User[]) => void;
  setUnderwriters: (underwriters: User[]) => void;
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  removeUser: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPagination: (pagination: Partial<UsersState["pagination"]>) => void;
  setFilters: (filters: Partial<UsersState["filters"]>) => void;
  clearFilters: () => void;

  // API calls
  fetchUsers: () => Promise<void>;
  fetchBrokers: () => Promise<void>;
  fetchUnderwriters: () => Promise<void>;
  toggleUserStatus: (id: string) => Promise<void>;
  createUser: (data: any) => Promise<User | null>;
  updateUserData: (id: string, data: any) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

const useUsersStore = create<UsersState>()(
  devtools(
    (set, get) => ({
      // Initial state
      users: [],
      brokers: [],
      underwriters: [],
      loading: false,
      error: null,
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
      filters: {},

      // Basic setters
      setUsers: (users) => set({ users }),
      setBrokers: (brokers) => set({ brokers }),
      setUnderwriters: (underwriters) => set({ underwriters }),
      addUser: (user) =>
        set((state) => ({
          users: [user, ...state.users],
          brokers: user.role === "BROKER" ? [user, ...state.brokers] : state.brokers,
          underwriters: user.role === "UNDERWRITER" ? [user, ...state.underwriters] : state.underwriters,
        })),
      updateUser: (id, updates) =>
        set((state) => ({
          users: state.users.map((u) =>
            u.id === id ? { ...u, ...updates } : u
          ),
          brokers: state.brokers.map((u) =>
            u.id === id ? { ...u, ...updates } : u
          ),
          underwriters: state.underwriters.map((u) =>
            u.id === id ? { ...u, ...updates } : u
          ),
        })),
      removeUser: (id) =>
        set((state) => ({
          users: state.users.filter((u) => u.id !== id),
          brokers: state.brokers.filter((u) => u.id !== id),
          underwriters: state.underwriters.filter((u) => u.id !== id),
        })),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setPagination: (pagination) =>
        set((state) => ({
          pagination: { ...state.pagination, ...pagination },
        })),
      setFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
        })),
      clearFilters: () => set({ filters: {} }),

      // API calls
      fetchUsers: async () => {
        const { setLoading, setError, setPagination, filters, pagination } =
          get();

        setLoading(true);
        setError(null);

        try {
          const params = new URLSearchParams({
            page: pagination.page.toString(),
            limit: pagination.limit.toString(),
            ...filters,
          });

          const response = await fetch(`/api/users?${params}`);
          const result = await response.json();

          if (!result.success) {
            throw new Error(
              result.error || "Erreur lors du chargement des utilisateurs"
            );
          }

          set({ users: result.data.users });
          setPagination(result.data.pagination);
        } catch (error) {
          setError(error instanceof Error ? error.message : "Erreur inconnue");
        } finally {
          setLoading(false);
        }
      },

      fetchBrokers: async () => {
        const { setLoading, setError } = get();

        setLoading(true);
        setError(null);

        try {
          const response = await fetch("/api/users?role=BROKER");
          const result = await response.json();

          if (!result.success) {
            throw new Error(
              result.error || "Erreur lors du chargement des courtiers"
            );
          }

          set({ brokers: result.data.users });
        } catch (error) {
          setError(error instanceof Error ? error.message : "Erreur inconnue");
        } finally {
          setLoading(false);
        }
      },

      fetchUnderwriters: async () => {
        const { setLoading, setError } = get();

        setLoading(true);
        setError(null);

        try {
          const response = await fetch("/api/users?role=UNDERWRITER");
          const result = await response.json();

          if (!result.success) {
            throw new Error(
              result.error || "Erreur lors du chargement des souscripteurs"
            );
          }

          set({ underwriters: result.data.users });
        } catch (error) {
          setError(error instanceof Error ? error.message : "Erreur inconnue");
        } finally {
          setLoading(false);
        }
      },

      toggleUserStatus: async (id: string) => {
        const { setLoading, setError, updateUser, users } = get();
        const user = users.find((u) => u.id === id);
        
        if (!user) return;

        setLoading(true);
        setError(null);

        try {
          const response = await fetch(`/api/users/${id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ isActive: !user.isActive }),
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(
              result.error || "Erreur lors de la mise à jour de l'utilisateur"
            );
          }

          updateUser(id, result.data);
        } catch (error) {
          setError(error instanceof Error ? error.message : "Erreur inconnue");
          throw error;
        } finally {
          setLoading(false);
        }
      },

      createUser: async (data: any) => {
        const { setLoading, setError, addUser } = get();

        setLoading(true);
        setError(null);

        try {
          const response = await fetch("/api/users", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(
              result.error || "Erreur lors de la création de l'utilisateur"
            );
          }

          addUser(result.data);
          return result.data;
        } catch (error) {
          setError(error instanceof Error ? error.message : "Erreur inconnue");
          return null;
        } finally {
          setLoading(false);
        }
      },

      updateUserData: async (id: string, data: any) => {
        const { setLoading, setError, updateUser } = get();

        setLoading(true);
        setError(null);

        try {
          const response = await fetch(`/api/users/${id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(
              result.error || "Erreur lors de la mise à jour de l'utilisateur"
            );
          }

          updateUser(id, result.data);
        } catch (error) {
          setError(error instanceof Error ? error.message : "Erreur inconnue");
          throw error;
        } finally {
          setLoading(false);
        }
      },

      deleteUser: async (id: string) => {
        const { setLoading, setError, removeUser } = get();

        setLoading(true);
        setError(null);

        try {
          const response = await fetch(`/api/users/${id}`, {
            method: "DELETE",
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(
              result.error || "Erreur lors de la suppression de l'utilisateur"
            );
          }

          removeUser(id);
        } catch (error) {
          setError(error instanceof Error ? error.message : "Erreur inconnue");
          throw error;
        } finally {
          setLoading(false);
        }
      },
    }),
    {
      name: "users-store",
    }
  )
);

export default useUsersStore;
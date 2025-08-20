import { create } from "zustand";
import { devtools } from "zustand/middleware";

// Types basés sur le modèle Notification existant dans Prisma
interface DirectMessage {
  id: string;
  type: "GENERAL"; // Toujours GENERAL pour les messages directs
  title: string; // Sujet du message
  message: string; // Contenu du message
  userId: string; // Destinataire
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    companyName?: string;
  };
  isRead: boolean;
  isUrgent: boolean;
  readAt?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  scheduledFor?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface MessagesState {
  // Data
  sentMessages: DirectMessage[]; // Messages envoyés (qu'on a créés)
  receivedMessages: DirectMessage[]; // Messages reçus
  loading: boolean;
  error: string | null;

  // Stats
  unreadCount: number;

  // Pagination
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  // Filters
  filters: {
    isRead?: boolean;
    isUrgent?: boolean;
    search?: string;
  };

  // Actions
  setSentMessages: (messages: DirectMessage[]) => void;
  setReceivedMessages: (messages: DirectMessage[]) => void;
  addSentMessage: (message: DirectMessage) => void;
  markAsRead: (id: string) => void;
  setUnreadCount: (count: number) => void;
  removeMessage: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPagination: (pagination: Partial<MessagesState["pagination"]>) => void;
  setFilters: (filters: Partial<MessagesState["filters"]>) => void;
  clearFilters: () => void;

  // API calls
  fetchReceivedMessages: () => Promise<void>;
  sendMessage: (data: {
    title: string;
    message: string;
    userId: string; // destinataire
    isUrgent?: boolean;
  }) => Promise<DirectMessage | null>;
  markMessageAsRead: (id: string) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
}

const useMessagesStore = create<MessagesState>()(
  devtools(
    (set, get) => ({
      // Initial state
      sentMessages: [],
      receivedMessages: [],
      unreadCount: 0,
      loading: false,
      error: null,
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
      filters: {},

      // Basic setters
      setSentMessages: (messages) => set({ sentMessages: messages }),
      setReceivedMessages: (messages) => set({ receivedMessages: messages }),
      addSentMessage: (message) =>
        set((state) => ({
          sentMessages: [message, ...state.sentMessages],
        })),
      markAsRead: (id) =>
        set((state) => ({
          receivedMessages: state.receivedMessages.map((m) =>
            m.id === id ? { ...m, isRead: true, readAt: new Date().toISOString() } : m
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        })),
      setUnreadCount: (count) => set({ unreadCount: count }),
      removeMessage: (id) =>
        set((state) => ({
          receivedMessages: state.receivedMessages.filter((m) => m.id !== id),
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
      fetchReceivedMessages: async () => {
        const { setLoading, setError, setPagination, filters, pagination } =
          get();

        setLoading(true);
        setError(null);

        try {
          const params = new URLSearchParams({
            page: pagination.page.toString(),
            limit: pagination.limit.toString(),
            ...Object.fromEntries(
              Object.entries(filters).filter(([_, value]) => value !== undefined)
            ),
          });

          const response = await fetch(`/api/notifications?${params}`);
          const result = await response.json();

          if (!result.success) {
            throw new Error(
              result.error || "Erreur lors du chargement des messages"
            );
          }

          set({ receivedMessages: result.data.notifications });
          setPagination(result.data.pagination);
        } catch (error) {
          setError(error instanceof Error ? error.message : "Erreur inconnue");
        } finally {
          setLoading(false);
        }
      },

      sendMessage: async (data) => {
        const { setLoading, setError, addSentMessage } = get();

        setLoading(true);
        setError(null);

        try {
          const response = await fetch("/api/notifications", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...data,
              type: "GENERAL",
              sentAt: new Date().toISOString(),
            }),
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(
              result.error || "Erreur lors de l'envoi du message"
            );
          }

          addSentMessage(result.data);
          return result.data;
        } catch (error) {
          setError(error instanceof Error ? error.message : "Erreur inconnue");
          return null;
        } finally {
          setLoading(false);
        }
      },

      markMessageAsRead: async (id: string) => {
        const { setError, markAsRead } = get();

        try {
          const response = await fetch(`/api/notifications/${id}/read`, {
            method: "PUT",
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(
              result.error || "Erreur lors du marquage comme lu"
            );
          }

          markAsRead(id);
        } catch (error) {
          setError(error instanceof Error ? error.message : "Erreur inconnue");
        }
      },

      deleteMessage: async (id: string) => {
        const { setLoading, setError, removeMessage } = get();

        setLoading(true);
        setError(null);

        try {
          const response = await fetch(`/api/notifications/${id}`, {
            method: "DELETE",
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(
              result.error || "Erreur lors de la suppression du message"
            );
          }

          removeMessage(id);
        } catch (error) {
          setError(error instanceof Error ? error.message : "Erreur inconnue");
          throw error;
        } finally {
          setLoading(false);
        }
      },

      fetchUnreadCount: async () => {
        const { setError, setUnreadCount } = get();

        try {
          const response = await fetch("/api/notifications/unread-count");
          const result = await response.json();

          if (!result.success) {
            throw new Error(
              result.error || "Erreur lors du chargement du compteur"
            );
          }

          setUnreadCount(result.data.count);
        } catch (error) {
          setError(error instanceof Error ? error.message : "Erreur inconnue");
        }
      },
    }),
    {
      name: "messages-store",
    }
  )
);

export default useMessagesStore;
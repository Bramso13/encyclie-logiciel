import { create } from "zustand";
import { devtools } from "zustand/middleware";

// Types pour les messages de chat de devis
interface QuoteMessage {
  id: string;
  content: string;
  quoteId: string;
  senderId: string;
  receiverId: string;
  isRead: boolean;
  readAt?: string;
  sender: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  receiver: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  attachments?: Array<{
    id: string;
    fileName: string;
    originalName: string;
    filePath: string;
    fileType: string;
    fileSize: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface QuoteChatState {
  // Data
  messages: QuoteMessage[];
  loading: boolean;
  error: string | null;

  // Stats
  unreadCount: number;

  // Current chat context
  currentQuoteId: string | null;
  currentReceiverId: string | null; // L'autre participant du chat

  // Actions
  setMessages: (messages: QuoteMessage[]) => void;
  addMessage: (message: QuoteMessage) => void;
  markAsRead: (messageId: string) => void;
  setUnreadCount: (count: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentQuoteId: (quoteId: string | null) => void;
  setCurrentReceiverId: (receiverId: string | null) => void;
  clearMessages: () => void;

  // API calls
  fetchMessages: (quoteId: string) => Promise<void>;
  sendMessage: (data: {
    content: string;
    quoteId: string;
    receiverId: string;
  }) => Promise<QuoteMessage | null>;
  markMessageAsRead: (messageId: string) => Promise<void>;
  fetchUnreadCount: (quoteId: string) => Promise<void>;
}

const useQuoteChatStore = create<QuoteChatState>()(
  devtools(
    (set, get) => ({
      // Initial state
      messages: [],
      loading: false,
      error: null,
      unreadCount: 0,
      currentQuoteId: null,
      currentReceiverId: null,

      // Basic setters
      setMessages: (messages) => set({ messages }),
      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),
      markAsRead: (messageId) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === messageId
              ? { ...m, isRead: true, readAt: new Date().toISOString() }
              : m
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        })),
      setUnreadCount: (count) => set({ unreadCount: count }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setCurrentQuoteId: (quoteId) => set({ currentQuoteId: quoteId }),
      setCurrentReceiverId: (receiverId) =>
        set({ currentReceiverId: receiverId }),
      clearMessages: () => set({ messages: [], unreadCount: 0 }),

      // API calls
      fetchMessages: async (quoteId: string) => {
        const { setLoading, setError, setCurrentQuoteId } = get();

        setLoading(true);
        setError(null);
        setCurrentQuoteId(quoteId);

        try {
          const response = await fetch(`/api/quotes/${quoteId}/messages`);
          const result = await response.json();

          if (!result.success) {
            throw new Error(
              result.error || "Erreur lors du chargement des messages"
            );
          }

          set({ messages: result.data });
        } catch (error) {
          setError(error instanceof Error ? error.message : "Erreur inconnue");
        } finally {
          setLoading(false);
        }
      },

      sendMessage: async (data) => {
        const { setLoading, setError, addMessage } = get();

        setLoading(true);
        setError(null);

        try {
          const response = await fetch(`/api/quotes/${data.quoteId}/messages`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content: data.content,
              receiverId: data.receiverId,
            }),
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(
              result.error || "Erreur lors de l'envoi du message"
            );
          }

          if (Array.isArray(result.data)) {
            result.data[0] && addMessage(result.data[0]);
          } else if (result.data) {
            result.data && addMessage(result.data);
          }

          return result.data;
        } catch (error) {
          setError(error instanceof Error ? error.message : "Erreur inconnue");
          return null;
        } finally {
          setLoading(false);
        }
      },

      markMessageAsRead: async (messageId: string) => {
        const { setError, markAsRead } = get();

        try {
          const response = await fetch(
            `/api/quote-messages/${messageId}/read`,
            {
              method: "PUT",
            }
          );

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || "Erreur lors du marquage comme lu");
          }

          markAsRead(messageId);
        } catch (error) {
          setError(error instanceof Error ? error.message : "Erreur inconnue");
        }
      },

      fetchUnreadCount: async (quoteId: string) => {
        const { setError, setUnreadCount } = get();

        try {
          const response = await fetch(
            `/api/quotes/${quoteId}/messages/unread-count`
          );
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
      name: "quote-chat-store",
    }
  )
);

export default useQuoteChatStore;

import { create } from "zustand";
import { devtools } from "zustand/middleware";

// Types
interface Quote {
  id: string;
  reference: string;
  status: string;
  productId: string;
  product: {
    name: string;
    code: string;
  };
  companyData: Record<string, any>;
  formData: Record<string, any>;
  calculatedPremium?: number;
  validUntil?: string;
  broker: {
    name: string;
    companyName?: string;
  };
  documents: Array<{
    id: string;
    fileName: string;
    documentType: string;
    uploadedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface QuotesState {
  // Data
  quotes: Quote[];
  currentQuote: Quote | null;
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
    status?: string;
    productId?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  
  // Actions
  setQuotes: (quotes: Quote[]) => void;
  setCurrentQuote: (quote: Quote | null) => void;
  addQuote: (quote: Quote) => void;
  updateQuote: (id: string, updates: Partial<Quote>) => void;
  removeQuote: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPagination: (pagination: Partial<QuotesState["pagination"]>) => void;
  setFilters: (filters: Partial<QuotesState["filters"]>) => void;
  clearFilters: () => void;
  
  // API calls
  fetchQuotes: () => Promise<void>;
  fetchQuote: (id: string) => Promise<void>;
  createQuote: (data: any) => Promise<Quote | null>;
  updateQuoteStatus: (id: string, status: string) => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;
}

const useQuotesStore = create<QuotesState>()(
  devtools(
    (set, get) => ({
      // Initial state
      quotes: [],
      currentQuote: null,
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
      setQuotes: (quotes) => set({ quotes }),
      setCurrentQuote: (quote) => set({ currentQuote: quote }),
      addQuote: (quote) => set((state) => ({ 
        quotes: [quote, ...state.quotes] 
      })),
      updateQuote: (id, updates) => set((state) => ({
        quotes: state.quotes.map(q => 
          q.id === id ? { ...q, ...updates } : q
        ),
        currentQuote: state.currentQuote?.id === id 
          ? { ...state.currentQuote, ...updates }
          : state.currentQuote
      })),
      removeQuote: (id) => set((state) => ({
        quotes: state.quotes.filter(q => q.id !== id),
        currentQuote: state.currentQuote?.id === id ? null : state.currentQuote
      })),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setPagination: (pagination) => set((state) => ({
        pagination: { ...state.pagination, ...pagination }
      })),
      setFilters: (filters) => set((state) => ({
        filters: { ...state.filters, ...filters }
      })),
      clearFilters: () => set({ filters: {} }),

      // API calls
      fetchQuotes: async () => {
        const { setLoading, setError, setPagination, filters, pagination } = get();
        
        setLoading(true);
        setError(null);
        
        try {
          const params = new URLSearchParams({
            page: pagination.page.toString(),
            limit: pagination.limit.toString(),
            ...filters
          });

          const response = await fetch(`/api/quotes?${params}`);
          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || "Erreur lors du chargement des devis");
          }

          set({ quotes: result.data.quotes });
          setPagination(result.data.pagination);
        } catch (error) {
          setError(error instanceof Error ? error.message : "Erreur inconnue");
        } finally {
          setLoading(false);
        }
      },

      fetchQuote: async (id: string) => {
        const { setLoading, setError, setCurrentQuote } = get();
        
        setLoading(true);
        setError(null);
        
        try {
          const response = await fetch(`/api/quotes/${id}`);
          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || "Erreur lors du chargement du devis");
          }

          setCurrentQuote(result.data);
        } catch (error) {
          setError(error instanceof Error ? error.message : "Erreur inconnue");
        } finally {
          setLoading(false);
        }
      },

      createQuote: async (data: any) => {
        const { setLoading, setError, addQuote } = get();
        
        setLoading(true);
        setError(null);
        
        try {
          const response = await fetch("/api/quotes", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || "Erreur lors de la création du devis");
          }

          addQuote(result.data);
          return result.data;
        } catch (error) {
          setError(error instanceof Error ? error.message : "Erreur inconnue");
          return null;
        } finally {
          setLoading(false);
        }
      },

      updateQuoteStatus: async (id: string, status: string) => {
        const { setLoading, setError, updateQuote } = get();
        
        setLoading(true);
        setError(null);
        
        try {
          const response = await fetch(`/api/quotes/${id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status }),
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || "Erreur lors de la mise à jour du devis");
          }

          updateQuote(id, result.data);
        } catch (error) {
          setError(error instanceof Error ? error.message : "Erreur inconnue");
          throw error;
        } finally {
          setLoading(false);
        }
      },

      deleteQuote: async (id: string) => {
        const { setLoading, setError, removeQuote } = get();
        
        setLoading(true);
        setError(null);
        
        try {
          const response = await fetch(`/api/quotes/${id}`, {
            method: "DELETE",
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || "Erreur lors de la suppression du devis");
          }

          removeQuote(id);
        } catch (error) {
          setError(error instanceof Error ? error.message : "Erreur inconnue");
          throw error;
        } finally {
          setLoading(false);
        }
      },
    }),
    {
      name: "quotes-store",
    }
  )
);

export default useQuotesStore;
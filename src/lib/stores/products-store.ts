import { create } from "zustand";
import { devtools } from "zustand/middleware";

// Types
interface InsuranceProduct {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  formFields: Record<string, any>;
  pricingRules: Record<string, any>;
  requiredDocs: string[];
  workflowConfig?: Record<string, any>;
  createdBy: {
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ProductsState {
  // Data
  products: InsuranceProduct[];
  activeProducts: InsuranceProduct[];
  currentProduct: InsuranceProduct | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  setProducts: (products: InsuranceProduct[]) => void;
  setCurrentProduct: (product: InsuranceProduct | null) => void;
  addProduct: (product: InsuranceProduct) => void;
  updateProduct: (id: string, updates: Partial<InsuranceProduct>) => void;
  removeProduct: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // API calls
  fetchProducts: () => Promise<void>;
  fetchActiveProducts: () => Promise<void>;
  fetchProduct: (id: string) => Promise<void>;
  createProduct: (data: any) => Promise<InsuranceProduct | null>;
  updateProductData: (id: string, data: any) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  toggleProductStatus: (id: string) => Promise<void>;
}

const useProductsStore = create<ProductsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      products: [],
      activeProducts: [],
      currentProduct: null,
      loading: false,
      error: null,

      // Basic setters
      setProducts: (products) => {
        const activeProducts = products.filter(p => p.isActive);
        set({ products, activeProducts });
      },
      setCurrentProduct: (product) => set({ currentProduct: product }),
      addProduct: (product) => set((state) => {
        const products = [product, ...state.products];
        const activeProducts = products.filter(p => p.isActive);
        return { products, activeProducts };
      }),
      updateProduct: (id, updates) => set((state) => {
        const products = state.products.map(p => 
          p.id === id ? { ...p, ...updates } : p
        );
        const activeProducts = products.filter(p => p.isActive);
        const currentProduct = state.currentProduct?.id === id 
          ? { ...state.currentProduct, ...updates }
          : state.currentProduct;
        
        return { products, activeProducts, currentProduct };
      }),
      removeProduct: (id) => set((state) => {
        const products = state.products.filter(p => p.id !== id);
        const activeProducts = products.filter(p => p.isActive);
        const currentProduct = state.currentProduct?.id === id ? null : state.currentProduct;
        
        return { products, activeProducts, currentProduct };
      }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      // API calls
      fetchProducts: async () => {
        const { setLoading, setError, setProducts } = get();
        
        setLoading(true);
        setError(null);
        
        try {
          const response = await fetch("/api/products");
          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || "Erreur lors du chargement des produits");
          }

          setProducts(result.data);
        } catch (error) {
          setError(error instanceof Error ? error.message : "Erreur inconnue");
        } finally {
          setLoading(false);
        }
      },

      fetchActiveProducts: async () => {
        const { setLoading, setError } = get();
        
        setLoading(true);
        setError(null);
        
        try {
          const response = await fetch("/api/products?active=true");
          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || "Erreur lors du chargement des produits actifs");
          }

          set({ activeProducts: result.data });
        } catch (error) {
          setError(error instanceof Error ? error.message : "Erreur inconnue");
        } finally {
          setLoading(false);
        }
      },

      fetchProduct: async (id: string) => {
        const { setLoading, setError, setCurrentProduct } = get();
        
        setLoading(true);
        setError(null);
        
        try {
          const response = await fetch(`/api/products/${id}`);
          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || "Erreur lors du chargement du produit");
          }

          setCurrentProduct(result.data);
        } catch (error) {
          setError(error instanceof Error ? error.message : "Erreur inconnue");
        } finally {
          setLoading(false);
        }
      },

      createProduct: async (data: any) => {
        const { setLoading, setError, addProduct } = get();
        
        setLoading(true);
        setError(null);
        
        try {
          const response = await fetch("/api/products", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || "Erreur lors de la création du produit");
          }

          addProduct(result.data);
          return result.data;
        } catch (error) {
          setError(error instanceof Error ? error.message : "Erreur inconnue");
          return null;
        } finally {
          setLoading(false);
        }
      },

      updateProductData: async (id: string, data: any) => {
        const { setLoading, setError, updateProduct } = get();
        
        setLoading(true);
        setError(null);
        
        try {
          const response = await fetch(`/api/products/${id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || "Erreur lors de la mise à jour du produit");
          }

          updateProduct(id, result.data);
        } catch (error) {
          setError(error instanceof Error ? error.message : "Erreur inconnue");
          throw error;
        } finally {
          setLoading(false);
        }
      },

      deleteProduct: async (id: string) => {
        const { setLoading, setError, removeProduct } = get();
        
        setLoading(true);
        setError(null);
        
        try {
          const response = await fetch(`/api/products/${id}`, {
            method: "DELETE",
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || "Erreur lors de la suppression du produit");
          }

          removeProduct(id);
        } catch (error) {
          setError(error instanceof Error ? error.message : "Erreur inconnue");
          throw error;
        } finally {
          setLoading(false);
        }
      },

      toggleProductStatus: async (id: string) => {
        const { setLoading, setError, updateProduct, products } = get();
        
        const product = products.find(p => p.id === id);
        if (!product) return;
        
        setLoading(true);
        setError(null);
        
        try {
          const response = await fetch(`/api/products/${id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ isActive: !product.isActive }),
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || "Erreur lors de la mise à jour du statut");
          }

          updateProduct(id, { isActive: !product.isActive });
        } catch (error) {
          setError(error instanceof Error ? error.message : "Erreur inconnue");
          throw error;
        } finally {
          setLoading(false);
        }
      },
    }),
    {
      name: "products-store",
    }
  )
);

export default useProductsStore;
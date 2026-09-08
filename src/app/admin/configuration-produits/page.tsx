"use client";

import { useEffect } from "react";
import ProductConfigTab from "@/components/admin/ProductConfigTab";
import { AuthenticatedAppShell } from "@/components/ui/AuthenticatedAppShell";
import useProductsStore from "@/lib/stores/products-store";

export default function ConfigurationProduitsPage() {
  const { products, loading, fetchProducts } = useProductsStore();

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <AuthenticatedAppShell>
      <ProductConfigTab products={products} loading={loading} />
    </AuthenticatedAppShell>
  );
}

"use client";

import { useEffect } from "react";
import ProductConfigTab from "@/components/admin/ProductConfigTab";
import { AdminPermissionGate } from "@/components/admin/AdminPermissionGate";
import { AuthenticatedAppShell } from "@/components/ui/AuthenticatedAppShell";
import useProductsStore from "@/lib/stores/products-store";

export default function ConfigurationProduitsPage() {
  const { products, loading, fetchProducts } = useProductsStore();

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <AuthenticatedAppShell>
      <AdminPermissionGate permission="PRODUCTS_TARIFFS">
        <ProductConfigTab products={products} loading={loading} />
      </AdminPermissionGate>
    </AuthenticatedAppShell>
  );
}

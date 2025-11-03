
"use client";

import { ProductCard } from "@/components/product-card";
import { type Product } from "@/lib/data";
import { SearchX } from "lucide-react";

interface ProductGridProps {
  products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[40vh] text-center bg-muted/50 rounded-lg">
        <SearchX className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">No Products Found</h2>
        <p className="mt-2 text-muted-foreground">Try adjusting your filters or search terms.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard key={product.firestoreId || product.id} product={product} />
      ))}
    </div>
  );
}

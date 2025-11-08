
"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { type Product } from '@/lib/data';
import { db } from '@/lib/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import { Filter, Loader2 } from 'lucide-react';
import { ProductFilters } from '@/components/product-filters';
import { useProductFilters } from '@/hooks/use-product-filters';
import { ProductGrid } from '@/components/product-grid';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

function ShopContent() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const productsRef = collection(db, "products");
        const productsQuery = query(productsRef);
        const querySnapshot = await getDocs(productsQuery);
        const productsData = querySnapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() } as Product));
        setAllProducts(productsData);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const {
    filteredProducts,
    filters,
    setFilters,
    sort,
    setSort,
    maxPrice,
    highestPrice
  } = useProductFilters(allProducts);

  if (loading) {
    return (
      <div className="container mx-auto flex h-[60vh] flex-col items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center">
        <h1 className="font-headline text-3xl font-bold tracking-tight">Shop Our Products</h1>
        <p className="mt-2 text-muted-foreground">
          Showing {filteredProducts.length} of {allProducts.length} products
        </p>
      </div>
      
      <div className="md:hidden mt-6 flex justify-center">
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline"><Filter className="mr-2 h-4 w-4" /> Filters</Button>
            </SheetTrigger>
            <SheetContent>
                <ProductFilters 
                    filters={filters}
                    setFilters={setFilters}
                    sort={sort}
                    setSort={setSort}
                    maxPrice={maxPrice}
                    highestPrice={highestPrice}
                />
            </SheetContent>
        </Sheet>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-8">
        <aside className="hidden md:block md:col-span-1">
          <ProductFilters 
            filters={filters}
            setFilters={setFilters}
            sort={sort}
            setSort={setSort}
            maxPrice={maxPrice}
            highestPrice={highestPrice}
          />
        </aside>
        <main className="md:col-span-3">
          <ProductGrid products={filteredProducts} />
        </main>
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={
        <div className="container mx-auto flex h-[60vh] flex-col items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    }>
        <ShopContent />
    </Suspense>
  )
}

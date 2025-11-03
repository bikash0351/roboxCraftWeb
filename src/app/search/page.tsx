
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { type Product } from "@/lib/data";
import { Filter, Loader2, SearchX } from "lucide-react";
import { ProductFilters } from "@/components/product-filters";
import { useProductFilters } from "@/hooks/use-product-filters";
import { ProductGrid } from "@/components/product-grid";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q");
  const [searchedProducts, setSearchedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!q) {
        setSearchedProducts([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const productsRef = collection(db, "products");
        const querySnapshot = await getDocs(productsRef);
        const allProducts = querySnapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() } as Product));
        
        const lowerCaseQuery = q.toLowerCase();
        const filtered = allProducts.filter(p => 
            p.name.toLowerCase().includes(lowerCaseQuery) ||
            (p.description && p.description.toLowerCase().includes(lowerCaseQuery)) ||
            (p.shortDescription && p.shortDescription.toLowerCase().includes(lowerCaseQuery)) ||
            (p.tags && p.tags.some(tag => tag.toLowerCase().includes(lowerCaseQuery)))
        );

        setSearchedProducts(filtered);
      } catch (error) {
        console.error("Error searching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [q]);
  
  const {
    filteredProducts,
    filters,
    setFilters,
    sort,
    setSort,
    maxPrice,
    highestPrice
  } = useProductFilters(searchedProducts);


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Searching for &quot;{q}&quot;...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {searchedProducts.length > 0 ? (
        <>
           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h1 className="text-3xl font-bold font-headline">
                    Search results for &quot;{q}&quot;
                </h1>
                <p className="mt-2 text-muted-foreground">
                    Found {filteredProducts.length} matching products.
                </p>
            </div>
             <div className="md:hidden mt-4 sm:mt-0">
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
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center">
            <SearchX className="h-24 w-24 text-muted-foreground" />
            <h1 className="mt-6 text-3xl font-bold font-headline">No results for &quot;{q}&quot;</h1>
            <p className="mt-2 text-muted-foreground">Try searching for something else.</p>
        </div>
      )}
    </div>
  );
}


export default function SearchPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center h-[50vh]">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        }>
            <SearchResults />
        </Suspense>
    )
}

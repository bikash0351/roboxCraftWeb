
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { collection, getDocs, query, where, or } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { type Product } from "@/lib/data";
import { ProductCard } from "@/components/product-card";
import { Loader2, SearchX } from "lucide-react";

function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!q) {
        setProducts([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const productsRef = collection(db, "products");
        // Firestore doesn't support case-insensitive search natively, 
        // and full-text search requires a third-party service like Algolia or Typesense.
        // As a basic workaround, we can query for the exact match, but a real-world app would need a better solution.
        // For this demo, we'll fetch all and filter client-side. This is NOT scalable.
        const querySnapshot = await getDocs(productsRef);
        const allProducts = querySnapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() } as Product));
        
        const lowerCaseQuery = q.toLowerCase();
        const filteredProducts = allProducts.filter(p => 
            p.name.toLowerCase().includes(lowerCaseQuery) ||
            (p.description && p.description.toLowerCase().includes(lowerCaseQuery)) ||
            (p.shortDescription && p.shortDescription.toLowerCase().includes(lowerCaseQuery)) ||
            (p.tags && p.tags.some(tag => tag.toLowerCase().includes(lowerCaseQuery)))
        );

        setProducts(filteredProducts);
      } catch (error) {
        console.error("Error searching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [q]);

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
      {products.length > 0 ? (
        <>
          <h1 className="text-3xl font-bold font-headline">
            Search results for &quot;{q}&quot;
          </h1>
          <p className="mt-2 text-muted-foreground">
            Found {products.length} matching products.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.firestoreId} product={product} />
            ))}
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

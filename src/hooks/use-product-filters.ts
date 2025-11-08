
"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { Product } from "@/lib/data";

export type SortOption = "price-asc" | "price-desc" | "name-asc" | "name-desc";

export interface FilterState {
  categories: string[];
  maxPrice: number;
  inStock: boolean;
}

export function useProductFilters(products: Product[]) {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category');
  const [isMounted, setIsMounted] = useState(false);
  const highestPrice = useMemo(() => Math.ceil(Math.max(...products.map(p => p.price), 0) / 10) * 10, [products]);

  const [filters, setFilters] = useState<FilterState>({
    categories: initialCategory ? [initialCategory] : [],
    maxPrice: highestPrice,
    inStock: false,
  });
  const [sort, setSort] = useState<SortOption>("price-asc");

  // When products load, update the maxPrice in filters
  useEffect(() => {
    if (highestPrice > 0) {
      setFilters(prev => ({ ...prev, maxPrice: highestPrice }));
    }
  }, [highestPrice]);

  // Set isMounted to true after initial render to avoid hydration issues with slider
  useEffect(() => {
      setIsMounted(true);
  }, []);

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter(p => filters.categories.includes(p.category));
    }

    // Price filter
    filtered = filtered.filter(p => p.price <= filters.maxPrice);

    // Stock filter
    if (filters.inStock) {
      filtered = filtered.filter(p => p.stock > 0);
    }

    // Sorting
    switch (sort) {
      case "price-asc":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "name-asc":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }

    return filtered;
  }, [products, filters, sort]);

  return {
    filteredProducts,
    filters,
    setFilters,
    sort,
    setSort,
    maxPrice: isMounted ? filters.maxPrice : highestPrice,
    highestPrice: isMounted ? highestPrice : 0,
  };
}

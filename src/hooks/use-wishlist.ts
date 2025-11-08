
"use client";

import { useContext } from "react";
import { WishlistContext } from "@/components/wishlist-provider";

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
};


"use client";

import { useState, createContext, useEffect, type ReactNode, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import type { Product } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";

export interface WishlistItem extends Product {}

interface WishlistContextType {
  items: WishlistItem[];
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
  loading: boolean;
  removeFromWishlist: (productId: string) => void;
}

export const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const LOCAL_STORAGE_WISHLIST_KEY = 'roboxcraft-wishlist';

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const getWishlistFromLocalStorage = (): WishlistItem[] => {
    try {
      const storedWishlist = localStorage.getItem(LOCAL_STORAGE_WISHLIST_KEY);
      const wishlistItems = storedWishlist ? JSON.parse(storedWishlist) : [];
      if (Array.isArray(wishlistItems)) {
        return wishlistItems;
      }
    } catch (error) {
      console.error("Failed to parse wishlist from localStorage", error);
    }
    return [];
  };

  const loadWishlistFromFirestore = useCallback(async (userId: string) => {
    setLoading(true);
    const wishlistColRef = collection(db, 'users', userId, 'wishlist');
    const wishlistSnap = await getDocs(wishlistColRef);
    
    if (!wishlistSnap.empty) {
      const wishlistData = wishlistSnap.docs.map(doc => doc.data() as WishlistItem);
      setItems(wishlistData);
    } else {
        // If firestore is empty, check local storage and migrate if necessary
        const localItems = getWishlistFromLocalStorage();
        if (localItems.length > 0) {
            setItems(localItems);
            // Migrate to Firestore
            const batch = [];
            for (const item of localItems) {
                const itemRef = doc(db, 'users', userId, 'wishlist', item.id);
                batch.push(setDoc(itemRef, item));
            }
            await Promise.all(batch);
            localStorage.removeItem(LOCAL_STORAGE_WISHLIST_KEY);
        } else {
            setItems([]);
        }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        loadWishlistFromFirestore(user.uid);
      } else {
        const localItems = getWishlistFromLocalStorage();
        setItems(localItems);
        setLoading(false);
      }
    }
  }, [user, authLoading, loadWishlistFromFirestore]);

  const saveWishlistToFirestore = async (userId: string, product: Product, add: boolean) => {
    if (!userId) return;
    try {
      const wishlistItemRef = doc(db, 'users', userId, 'wishlist', product.id);
      if (add) {
        await setDoc(wishlistItemRef, product);
      } else {
        await deleteDoc(wishlistItemRef);
      }
    } catch (error) {
      console.error("Failed to save wishlist to Firestore", error);
    }
  };

  const saveWishlistToLocalStorage = (wishlistItems: WishlistItem[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_WISHLIST_KEY, JSON.stringify(wishlistItems));
    } catch (error) {
      console.error("Failed to save wishlist to localStorage", error);
    }
  };
  
  const isInWishlist = (productId: string) => items.some(item => item.id === productId);

  const toggleWishlist = (product: Product) => {
    const isCurrentlyInWishlist = isInWishlist(product.id);
    let newItems: WishlistItem[];

    if (isCurrentlyInWishlist) {
      newItems = items.filter(item => item.id !== product.id);
      toast({ title: "Removed from Wishlist", description: `${product.name} has been removed from your wishlist.` });
    } else {
      newItems = [...items, { ...product }];
      toast({ title: "Added to Wishlist", description: `${product.name} has been added to your wishlist.` });
    }

    setItems(newItems);

    if (user) {
      saveWishlistToFirestore(user.uid, product, !isCurrentlyInWishlist);
    } else {
      saveWishlistToLocalStorage(newItems);
    }
  };

  const removeFromWishlist = (productId: string) => {
    const productToRemove = items.find(item => item.id === productId);
    if (!productToRemove) return;

    const newItems = items.filter(item => item.id !== productId);
    setItems(newItems);

    if (user) {
        saveWishlistToFirestore(user.uid, productToRemove, false);
    } else {
        saveWishlistToLocalStorage(newItems);
    }
    toast({ title: "Removed from Wishlist", description: `${productToRemove.name} has been removed from your wishlist.` });
  }

  return (
    <WishlistContext.Provider
      value={{
        items,
        toggleWishlist,
        isInWishlist,
        loading,
        removeFromWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

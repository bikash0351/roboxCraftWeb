

"use client";

import { useState, createContext, useEffect, type ReactNode, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { Product } from "@/lib/data";

export interface CartItem extends Product {
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => Promise<void>;
  totalItems: number;
  totalPrice: number;
  loading: boolean;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_STORAGE_CART_KEY = 'robomart-cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Function to load cart from Firestore
  const loadCartFromFirestore = useCallback(async (userId: string) => {
    setLoading(true);
    const cartRef = doc(db, 'carts', userId);
    const cartSnap = await getDoc(cartRef);

    if (cartSnap.exists()) {
      const cartData = cartSnap.data();
      // TODO: Add validation here
      setItems(cartData.items || []);
    } else {
      // If no Firestore cart, check local storage and merge if necessary
      const localCart = getCartFromLocalStorage();
      if (localCart.length > 0) {
        setItems(localCart);
        await saveCartToFirestore(userId, localCart);
        localStorage.removeItem(LOCAL_STORAGE_CART_KEY);
      } else {
        setItems([]);
      }
    }
    setLoading(false);
  }, []);

  // Function to load cart from local storage
  const getCartFromLocalStorage = (): CartItem[] => {
    try {
      const storedCart = localStorage.getItem(LOCAL_STORAGE_CART_KEY);
      if (storedCart) {
        const parsed = JSON.parse(storedCart);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (error) {
      console.error("Failed to parse cart from localStorage", error);
    }
    return [];
  };
  
  // Effect to handle user state changes
  useEffect(() => {
    if (!authLoading) {
      if (user) {
        loadCartFromFirestore(user.uid);
      } else {
        setItems(getCartFromLocalStorage());
        setLoading(false);
      }
    }
  }, [user, authLoading, loadCartFromFirestore]);


  // Function to save cart to Firestore
  const saveCartToFirestore = async (userId: string, cartItems: CartItem[]) => {
    if (!userId) return;
    try {
      const cartRef = doc(db, 'carts', userId);
      await setDoc(cartRef, { items: cartItems });
    } catch (error) {
      console.error("Failed to save cart to Firestore", error);
    }
  };

  // Function to save cart to local storage
  const saveCartToLocalStorage = (cartItems: CartItem[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_CART_KEY, JSON.stringify(cartItems));
    } catch (error) {
      console.error("Failed to save cart to localStorage", error);
    }
  };

  const updateCart = (newItems: CartItem[]) => {
    setItems(newItems);
    if (user) {
      saveCartToFirestore(user.uid, newItems);
    } else {
      saveCartToLocalStorage(newItems);
    }
  };

  const addItem = (product: Product, quantity = 1) => {
    const newItems = [...items];
    const existingItemIndex = newItems.findIndex((item) => item.id === product.id);

    if (existingItemIndex > -1) {
      newItems[existingItemIndex].quantity += quantity;
    } else {
      newItems.push({ ...product, quantity });
    }
    updateCart(newItems);
  };

  const removeFromCart = (productId: string) => {
    const newItems = items.filter((item) => item.id !== productId);
    updateCart(newItems);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    const newItems = items.map((item) =>
      item.id === productId ? { ...item, quantity } : item
    );
    updateCart(newItems);
  };

  const clearCart = async () => {
    setItems([]);
    if (user) {
      try {
        const cartRef = doc(db, 'carts', user.uid);
        await setDoc(cartRef, { items: [] });
      } catch (error) {
        console.error("Failed to clear cart in Firestore", error);
      }
    } else {
      localStorage.removeItem(LOCAL_STORAGE_CART_KEY);
    }
  };

  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        loading
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

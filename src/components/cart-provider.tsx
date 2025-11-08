
"use client";

import { useState, createContext, useEffect, type ReactNode, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, getDocs, collection, query, where, Timestamp } from "firebase/firestore";
import type { Product } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";

export interface CartItem extends Product {
  quantity: number;
}

export interface Coupon {
  firestoreId: string;
  code: string;
  discountType: 'percentage' | 'amount';
  discountValue: number;
  categoryType: 'Universal' | 'Kits' | 'Components';
  status: 'active' | 'paused';
  expiryDate?: Timestamp;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => Promise<void>;
  totalItems: number;
  totalPrice: number;
  shippingCost: number;
  taxAmount: number;
  total: number;
  loading: boolean;
  appliedCoupon: Coupon | null;
  applyCoupon: (couponCode: string) => Promise<boolean>;
  removeCoupon: () => void;
  discountAmount: number;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_STORAGE_CART_KEY = 'robomart-cart';
const LOCAL_STORAGE_COUPON_KEY = 'robomart-coupon';
const TAX_RATE = 0.18;
const SHIPPING_COST = 100.00;

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const getCartFromLocalStorage = (): { items: CartItem[], coupon: Coupon | null } => {
    try {
      const storedCart = localStorage.getItem(LOCAL_STORAGE_CART_KEY);
      const storedCoupon = localStorage.getItem(LOCAL_STORAGE_COUPON_KEY);
      const cartItems = storedCart ? JSON.parse(storedCart) : [];
      const coupon = storedCoupon ? JSON.parse(storedCoupon) : null;
      if (Array.isArray(cartItems)) {
        return { items: cartItems, coupon };
      }
    } catch (error) {
      console.error("Failed to parse cart/coupon from localStorage", error);
    }
    return { items: [], coupon: null };
  };

  const loadCartFromFirestore = useCallback(async (userId: string) => {
    setLoading(true);
    const cartRef = doc(db, 'carts', userId);
    const cartSnap = await getDoc(cartRef);

    if (cartSnap.exists()) {
      const cartData = cartSnap.data();
      setItems(cartData.items || []);
      setAppliedCoupon(cartData.coupon || null);
    } else {
      const { items: localItems, coupon: localCoupon } = getCartFromLocalStorage();
      setItems(localItems);
      setAppliedCoupon(localCoupon);
      if (localItems.length > 0 || localCoupon) {
        await saveCartToFirestore(userId, localItems, localCoupon);
        localStorage.removeItem(LOCAL_STORAGE_CART_KEY);
        localStorage.removeItem(LOCAL_STORAGE_COUPON_KEY);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        loadCartFromFirestore(user.uid);
      } else {
        const { items: localItems, coupon: localCoupon } = getCartFromLocalStorage();
        setItems(localItems);
        setAppliedCoupon(localCoupon);
        setLoading(false);
      }
    }
  }, [user, authLoading, loadCartFromFirestore]);


  const saveCartToFirestore = async (userId: string, cartItems: CartItem[], coupon: Coupon | null) => {
    if (!userId) return;
    try {
      const cartRef = doc(db, 'carts', userId);
      await setDoc(cartRef, { items: cartItems, coupon });
    } catch (error) {
      console.error("Failed to save cart to Firestore", error);
    }
  };

  const saveCartToLocalStorage = (cartItems: CartItem[], coupon: Coupon | null) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_CART_KEY, JSON.stringify(cartItems));
      if (coupon) {
        localStorage.setItem(LOCAL_STORAGE_COUPON_KEY, JSON.stringify(coupon));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_COUPON_KEY);
      }
    } catch (error) {
      console.error("Failed to save cart to localStorage", error);
    }
  };

  const updateCart = (newItems: CartItem[], newCoupon: Coupon | null = appliedCoupon) => {
    setItems(newItems);
    setAppliedCoupon(newCoupon);
    if (user) {
      saveCartToFirestore(user.uid, newItems, newCoupon);
    } else {
      saveCartToLocalStorage(newItems, newCoupon);
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
    updateCart([], null);
  };

  const applyCoupon = async (couponCode: string): Promise<boolean> => {
    try {
        const q = query(collection(db, "coupons"), where("code", "==", couponCode.toUpperCase()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            toast({ variant: "destructive", title: "Invalid Coupon Code" });
            return false;
        } 
        
        const couponDoc = querySnapshot.docs[0];
        const couponData = { firestoreId: couponDoc.id, ...couponDoc.data() } as Coupon;

        const now = new Date();
        const expiryDate = couponData.expiryDate?.toDate();

        if (couponData.status !== 'active') {
            toast({ variant: "destructive", title: "Coupon is not active" });
            return false;
        }

        if (expiryDate && expiryDate < now) {
            toast({ variant: "destructive", title: "This coupon has expired" });
            return false;
        }
        
        updateCart(items, couponData);
        toast({ title: "Coupon Applied!", description: `Discount of ${'${couponData.discountValue}'}${'${couponData.discountType === \'percentage\' ? \'%\' : \'₹\'}'} applied.` });
        return true;
    } catch (error) {
        toast({ variant: "destructive", title: "Error applying coupon" });
        return false;
    }
  }

  const removeCoupon = () => {
    updateCart(items, null);
    toast({ title: "Coupon removed" });
  }

  const totalPrice = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const discountAmount = useMemo(() => {
    if (!appliedCoupon || totalPrice === 0) return 0;
    
    let applicableTotal = 0;
    if (appliedCoupon.categoryType === 'Universal') {
        applicableTotal = totalPrice;
    } else {
        applicableTotal = items
            .filter(item => item.category === appliedCoupon.categoryType)
            .reduce((sum, item) => sum + item.price * item.quantity, 0);
    }

    let discount = 0;
    if (appliedCoupon.discountType === 'percentage') {
        discount = (applicableTotal * appliedCoupon.discountValue) / 100;
    } else {
        discount = appliedCoupon.discountValue;
    }
    
    return Math.min(discount, applicableTotal);
  }, [appliedCoupon, items, totalPrice]);


  const finalSubtotal = totalPrice - discountAmount;
  const taxAmount = finalSubtotal * TAX_RATE;
  const total = finalSubtotal + taxAmount + SHIPPING_COST;
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);

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
        shippingCost: SHIPPING_COST,
        taxAmount,
        total,
        loading,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        discountAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}


"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import type { Product } from "@/lib/data";
import { Check, Loader2, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


export function AddToCartButton({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [buttonState, setButtonState] = useState<"idle" | "loading" | "added">("idle");
  const { toast } = useToast();

  const handleAddToCart = () => {
    setButtonState("loading");
    setTimeout(() => {
      const imageId = product.imageIds && product.imageIds.length > 0 ? product.imageIds[0] : 'ai-product';
      const productToAdd = {
        ...product,
        imageId,
      };
      addItem(productToAdd);
      setButtonState("added");
      toast({
        title: "Added to Cart",
        description: `${product.name} has been added to your cart.`,
      })
    }, 500); // Simulate network delay
  };

  useEffect(() => {
    if (buttonState === "added") {
      const timer = setTimeout(() => setButtonState("idle"), 2000);
      return () => clearTimeout(timer);
    }
  }, [buttonState]);

  return (
    <Button 
      size="lg" 
      onClick={handleAddToCart} 
      className="w-full sm:w-auto"
      disabled={buttonState !== 'idle'}
    >
      {buttonState === 'loading' && (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Adding...
        </>
      )}
      {buttonState === 'added' && (
        <>
          <Check className="mr-2 h-5 w-5" />
          Added!
        </>
      )}
      {buttonState === 'idle' && (
        <>
          <ShoppingCart className="mr-2 h-5 w-5" />
          Add to Cart
        </>
      )}
    </Button>
  );
}

    
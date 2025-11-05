
"use client";

import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import type { Product } from "@/lib/data";
import { Bolt } from "lucide-react";
import { useRouter } from "next/navigation";

export function BuyNowButton({ product }: { product: Product }) {
  const { addItem } = useCart();
  const router = useRouter();

  const handleBuyNow = () => {
    // First, add the item to the cart
    addItem(product);
    // Then, immediately redirect to checkout
    router.push('/checkout');
  };

  return (
    <Button 
      size="lg" 
      onClick={handleBuyNow} 
      className="w-full sm:w-auto"
    >
      <Bolt className="mr-2 h-5 w-5" />
      Buy Now
    </Button>
  );
}


"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import type { Product } from "@/lib/data";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { useCart } from "@/hooks/use-cart";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { Check, Loader2, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const [buttonState, setButtonState] = useState<"idle" | "loading" | "added">("idle");
  const { toast } = useToast();

  const handleAddToCart = () => {
    setButtonState("loading");
    setTimeout(() => {
      addItem(product);
      setButtonState("added");
      toast({
          title: "Added to Cart",
          description: `${product.name} has been added to your cart.`
      });
    }, 500); // Simulate network delay
  };

  useEffect(() => {
    if (buttonState === "added") {
      const timer = setTimeout(() => setButtonState("idle"), 2000);
      return () => clearTimeout(timer);
    }
  }, [buttonState]);

  const hasDiscount = product.costPrice && product.costPrice > product.price;
  const discountPercentage = hasDiscount
    ? Math.round(((product.costPrice - product.price) / product.costPrice) * 100)
    : 0;
  
  const imageSrc = product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : "https://placehold.co/400x400";
  const productLink = `/shop/${product.id}`;


  return (
    <Card className="flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-lg">
      <Link href={productLink} className="flex flex-col flex-1">
        <CardHeader className="relative p-0">
          <div className="relative aspect-square w-full bg-muted">
            <Image
                src={imageSrc}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
            {hasDiscount && (
              <Badge
                variant="destructive"
                className={cn(
                  "absolute top-2 left-2 rounded-full h-10 w-10 flex items-center justify-center text-sm font-bold bg-primary text-primary-foreground",
                  "border-2 border-background"
                  )}
              >
                -{discountPercentage}%
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-4 pb-2 flex flex-col justify-between">
            <div>
                <h3 className="line-clamp-2 font-semibold text-sm md:text-base">{product.name}</h3>
            </div>
            <div className="mt-2">
                <div className="flex items-baseline gap-2">
                    <span className="text-base md:text-lg font-bold text-foreground">
                    ₹{product.price.toFixed(2)}
                    </span>
                    {hasDiscount && (
                    <span className="text-xs md:text-sm text-muted-foreground line-through">
                        ₹{product.costPrice?.toFixed(2)}
                    </span>
                    )}
                </div>
            </div>
        </CardContent>
      </Link>
      <CardFooter className="p-4 pt-2">
        <Button 
          className="w-full" 
          onClick={handleAddToCart} 
          disabled={buttonState !== 'idle'}
          variant="outline"
        >
          {buttonState === 'loading' && (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          )}
          {buttonState === 'added' && (
            <>
              <Check className="mr-2 h-4 w-4" />
              Added
            </>
          )}
          {buttonState === 'idle' && (
            <>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Add to Cart
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}



"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import type { Product } from "@/lib/data";
import { PlaceHolderImages as placeholderImages } from "@/lib/placeholder-images";
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
      const imageId = product.imageIds && product.imageIds.length > 0 ? product.imageIds[0] : 'ai-product';
      const productToAdd = {
        ...product,
        imageId: imageId,
      };
      addItem(productToAdd);
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
  
  const primaryImageId = product.imageIds && product.imageIds.length > 0 ? product.imageIds[0] : 'ai-product';
  const productImage = placeholderImages.find((p) => p.id === primaryImageId);
  const imageSrc = product.imageUrl || productImage?.imageUrl;
  const imageHint = productImage?.imageHint;
  const productLink = `/shop/${product.id}`;


  return (
    <Card className="flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-lg">
      <Link href={productLink} className="flex flex-col flex-1">
        <CardHeader className="relative p-0">
          <div className="relative aspect-square w-full bg-muted">
            {imageSrc ? (
              <Image
                src={imageSrc}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                data-ai-hint={imageHint}
              />
            ) : (
                 <Image
                src={"https://placehold.co/400x400"}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              />
            )}
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
        <CardContent className="flex-1 p-4 pb-2">
          <h3 className="line-clamp-2 font-semibold h-12">{product.name}</h3>
          
          <div className="mt-2 flex items-baseline gap-2">
            {hasDiscount && (
              <span className="text-sm text-muted-foreground line-through">
                ₹{product.costPrice?.toFixed(2)}
              </span>
            )}
            <span className="text-lg font-bold text-foreground">
              ₹{product.price.toFixed(2)}
            </span>
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

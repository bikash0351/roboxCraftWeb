
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useWishlist } from "@/hooks/use-wishlist";
import { Loader2, Heart } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";

export default function WishlistPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { items: wishlistItems, loading: wishlistLoading, removeFromWishlist } = useWishlist();
    const { addItem } = useCart();
    const { toast } = useToast();

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/login?redirect=/account/wishlist');
        }
    }, [user, authLoading, router]);

    const handleAddToCart = (product: any) => {
        addItem(product);
        toast({
            title: "Added to Cart",
            description: `${product.name} has been added to your cart.`
        });
    }

    if (authLoading || wishlistLoading || !user) {
        return (
            <div className="container mx-auto flex h-[60vh] flex-col items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    if (wishlistItems.length === 0) {
        return (
             <div className="container mx-auto flex h-[60vh] flex-col items-center justify-center gap-6 text-center">
                <Heart className="h-24 w-24 text-muted-foreground" />
                <h1 className="font-headline text-3xl font-bold">Your Wishlist is Empty</h1>
                <p className="text-muted-foreground">You haven't added any products to your wishlist yet.</p>
                <Button asChild>
                    <Link href="/shop">Explore Products</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 mb-8">
                <Heart className="h-8 w-8 text-primary" />
                <h1 className="font-headline text-3xl font-bold">My Wishlist</h1>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {wishlistItems.map((item) => {
                    const imageSrc = item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls[0] : "https://placehold.co/400x400";
                    return (
                    <Card key={item.id} className="overflow-hidden flex flex-col">
                        <Link href={`/shop/${item.id}`} className="block">
                            <div className="relative aspect-square w-full bg-muted">
                                 <Image
                                    src={imageSrc}
                                    alt={item.name}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                />
                            </div>
                        </Link>
                        <CardHeader>
                             <Link href={`/shop/${item.id}`} className="block">
                                <CardTitle className="font-semibold text-base line-clamp-2 h-12">{item.name}</CardTitle>
                             </Link>
                        </CardHeader>
                        <CardContent className="flex-grow">
                             <span className="text-lg font-bold text-foreground">
                                ₹{item.price.toFixed(2)}
                            </span>
                        </CardContent>
                        <CardFooter className="flex-col items-stretch gap-2">
                             <Button onClick={() => handleAddToCart(item)}>Add to Cart</Button>
                             <Button variant="outline" onClick={() => removeFromWishlist(item.id)}>Remove</Button>
                        </CardFooter>
                    </Card>
                )})}
            </div>
        </div>
    );
}

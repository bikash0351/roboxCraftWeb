
"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/hooks/use-cart";
import { Minus, Plus, ShoppingCart, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function CartPage() {
    const { 
        items, updateQuantity, removeFromCart, clearCart, 
        totalPrice, taxAmount, shippingCost, total,
        appliedCoupon, applyCoupon, removeCoupon, discountAmount 
    } = useCart();
    
    const [couponCode, setCouponCode] = useState("");
    const [couponLoading, setCouponLoading] = useState(false);

    const handleApplyCoupon = async () => {
        if (!couponCode) return;
        setCouponLoading(true);
        await applyCoupon(couponCode);
        setCouponLoading(false);
    };

    if (items.length === 0) {
        return (
            <div className="container mx-auto flex h-[60vh] flex-col items-center justify-center gap-6 text-center">
                <ShoppingCart className="h-24 w-24 text-muted-foreground" />
                <h1 className="font-headline text-3xl font-bold">Your cart is empty</h1>
                <p className="text-muted-foreground">Looks like you haven't added anything to your cart yet.</p>
                <Button asChild>
                    <Link href="/shop">Start Shopping</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-5xl py-8 px-4 sm:px-6 lg:px-8">
            <h1 className="font-headline text-3xl font-bold tracking-tight">Shopping Cart</h1>
            <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-3 lg:items-start">
                <div className="space-y-6 lg:col-span-2">
                    {items.map((item) => {
                        const imageSrc = item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls[0] : "https://placehold.co/96x96";
                        return (
                            <Card key={item.id} className="overflow-hidden">
                                <CardContent className="flex items-center gap-4 p-4">
                                    <div className="relative h-24 w-24 flex-shrink-0 rounded-md bg-muted">
                                        <Image 
                                            src={imageSrc} 
                                            alt={item.name} 
                                            fill 
                                            className="object-cover"
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold">{item.name}</h3>
                                        <p className="text-sm text-muted-foreground">₹{item.price.toFixed(2)}</p>
                                        <div className="mt-2 flex items-center gap-2">
                                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1}>
                                                <Minus className="h-4 w-4" />
                                            </Button>
                                            <span className="w-8 text-center">{item.quantity}</span>
                                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => removeFromCart(item.id)}>
                                        <Trash2 className="h-5 w-5" />
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                     <Button variant="outline" onClick={() => clearCart()}>
                        Clear Cart
                    </Button>
                </div>

                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Order Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                {!appliedCoupon ? (
                                    <div className="flex items-end gap-2">
                                        <div className="flex-grow">
                                            <Label htmlFor="coupon">Coupon Code</Label>
                                            <Input id="coupon" placeholder="Enter coupon" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} disabled={couponLoading} />
                                        </div>
                                        <Button type="button" onClick={handleApplyCoupon} disabled={!couponCode || couponLoading}>
                                            {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                                        </Button>
                                    </div>
                                    ) : (
                                    <div className="flex justify-between items-center text-sm">
                                        <p className="text-muted-foreground">Coupon Applied:</p>
                                        <Badge>
                                            {appliedCoupon.code}
                                            <button type="button" onClick={removeCoupon} className="ml-2 font-bold text-lg leading-none">&times;</button>
                                        </Badge>
                                    </div>
                                )}
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>₹{totalPrice.toFixed(2)}</span>
                            </div>
                             <div className="flex justify-between text-green-600">
                                <span>Discount</span>
                                <span>- ₹{discountAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Tax (18%)</span>
                                <span>₹{taxAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Shipping</span>
                                <span>₹{shippingCost.toFixed(2)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-bold">
                                <span>Total</span>
                                <span>₹{total.toFixed(2)}</span>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" asChild>
                                <Link href="/checkout">Proceed to Checkout</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}

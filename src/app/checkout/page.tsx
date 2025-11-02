
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from "next/image";
import { PlaceHolderImages as placeholderImages } from "@/lib/placeholder-images";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/hooks/use-cart";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useEffect, Suspense } from "react";
import { useAuth } from "@/hooks/use-auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2 } from "lucide-react";

const checkoutSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  postalCode: z.string().min(5, "Postal code is required"),
  country: z.string().min(2, "Country is required"),
  paymentMethod: z.enum(["cod"], {
    required_error: "You need to select a payment method.",
  }),
});

function CheckoutForm() {
    const { user, loading: authLoading } = useAuth();
    const { items, totalPrice, clearCart, loading: cartLoading } = useCart();
    const router = useRouter();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const redirect = searchParams.get('redirect');

    const shippingCost = 50.00;
    const total = totalPrice + shippingCost;

    const form = useForm<z.infer<typeof checkoutSchema>>({
        resolver: zodResolver(checkoutSchema),
        defaultValues: {
            fullName: "",
            email: "",
            address: "",
            city: "",
            postalCode: "",
            country: "India",
            paymentMethod: "cod",
        },
    });
    
    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/login?redirect=/checkout');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user) {
            form.reset({
                fullName: user.displayName || "",
                email: user.email || "",
                address: "", // Keep address fields empty for user to fill
                city: "",
                postalCode: "",
                country: "India",
                paymentMethod: "cod",
            });
        }
    }, [user, form.reset]);


    useEffect(() => {
        // Only redirect if cart is empty AND we weren't just sent here from login
        if (!cartLoading && items.length === 0 && !redirect) {
            router.replace("/shop");
        }
    }, [items, cartLoading, router, redirect]);


    async function onSubmit(data: z.infer<typeof checkoutSchema>) {
        if (!user) {
             toast({
                variant: "destructive",
                title: "Authentication Error",
                description: "You must be logged in to place an order.",
            });
            router.push('/login?redirect=/checkout');
            return;
        }

        try {
            const orderData = {
                userId: user.uid,
                ...data,
                items,
                subtotal: totalPrice,
                shipping: shippingCost,
                total,
                status: 'pending',
                createdAt: serverTimestamp(),
            };

            await addDoc(collection(db, "orders"), orderData);

            clearCart();
            toast({
                title: "Order Placed!",
                description: "Thank you for your purchase.",
            });
            router.push("/order-confirmation");

        } catch (error) {
            console.error("Error placing order:", error);
            toast({
                variant: "destructive",
                title: "Order Failed",
                description: "There was a problem placing your order. Please try again.",
            });
        }
    }

    if (authLoading || cartLoading || !user) {
        return (
             <div className="container mx-auto flex h-[60vh] flex-col items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="font-headline text-3xl font-bold tracking-tight">Checkout</h1>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-12">
                    <div className="md:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Shipping Information</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="fullName"
                                    render={({ field }) => (
                                        <FormItem className="sm:col-span-2">
                                            <FormLabel>Full Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Your Name" {...field} value={field.value ?? ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem className="sm:col-span-2">
                                            <FormLabel>Email Address</FormLabel>
                                            <FormControl>
                                                <Input placeholder="you@example.com" type="email" {...field} value={field.value ?? ''} readOnly />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => (
                                        <FormItem className="sm:col-span-2">
                                            <FormLabel>Address</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Your Address" {...field} value={field.value ?? ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>City</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Your City" {...field} value={field.value ?? ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="postalCode"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Postal Code</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Your Postal Code" {...field} value={field.value ?? ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name="country"
                                    render={({ field }) => (
                                        <FormItem className="sm:col-span-2">
                                            <FormLabel>Country</FormLabel>
                                            <FormControl>
                                                <Input {...field} value={field.value ?? ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>
                        
                        <Card className="mt-8">
                            <CardHeader>
                                <CardTitle className="font-headline">Payment Method</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <FormField
                                    control={form.control}
                                    name="paymentMethod"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <RadioGroup
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                    className="flex flex-col space-y-1"
                                                >
                                                    <FormItem className="flex items-center space-x-3 space-y-0 rounded-md border p-4">
                                                        <FormControl>
                                                            <RadioGroupItem value="cod" />
                                                        </FormControl>
                                                        <FormLabel className="font-normal">
                                                            Cash on Delivery (COD)
                                                        </FormLabel>
                                                    </FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="md:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Order Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-4">
                                    {items.map(item => {
                                        const productImage = placeholderImages.find(p => p.id === item.imageId);
                                        return (
                                        <div key={item.id} className="flex items-center gap-4">
                                            <div className="relative h-16 w-16 flex-shrink-0 rounded-md bg-muted">
                                            {productImage && (
                                                <Image 
                                                    src={productImage.imageUrl} 
                                                    alt={item.name} 
                                                    fill 
                                                    className="object-cover"
                                                    sizes="64px"
                                                />
                                            )}
                                            <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                                                {item.quantity}
                                            </div>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">{item.name}</p>
                                                <p className="text-sm text-muted-foreground">₹{item.price.toFixed(2)}</p>
                                            </div>
                                            <p className="text-sm font-medium">₹{(item.price * item.quantity).toFixed(2)}</p>
                                        </div>
                                    )})}
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span>Subtotal</span>
                                        <span>₹{totalPrice.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Shipping</span>
                                        <span>₹{shippingCost.toFixed(2)}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between font-bold text-lg">
                                        <span>Total</span>
                                        <span>₹{total.toFixed(2)}</span>
                                    </div>

                                </div>
                            </CardContent>
                        </Card>
                        <Button type="submit" className="w-full mt-6" size="lg" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {form.formState.isSubmitting ? "Placing Order..." : "Place Order"}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={
            <div className="container mx-auto flex h-[60vh] flex-col items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        }>
            <CheckoutForm />
        </Suspense>
    )
}

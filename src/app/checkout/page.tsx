
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
import { useCart, type CartItem } from "@/hooks/use-cart";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useEffect, Suspense, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { addDoc, collection, serverTimestamp, getDocs, query, where, doc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { type Timestamp } from "firebase/firestore";


const checkoutSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  mobileNumber: z.string().regex(/^[6-9]\d{9}$/, "Invalid mobile number"),
  email: z.string().email("Invalid email address"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  postalCode: z.string().regex(/^\d{6}$/, "Invalid Pincode"),
  country: z.string().min(2, "Country is required"),
  paymentMethod: z.enum(["cod"], {
    required_error: "You need to select a payment method.",
  }),
});

interface Coupon {
  firestoreId: string;
  code: string;
  discountType: 'percentage' | 'amount';
  discountValue: number;
  categoryType: 'Universal' | 'Kits' | 'Components';
  status: 'active' | 'paused';
  expiryDate?: Timestamp;
}

function CheckoutForm() {
    const { user, loading: authLoading } = useAuth();
    const { items, totalPrice, clearCart, loading: cartLoading } = useCart();
    const router = useRouter();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const redirect = searchParams.get('redirect');

    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
    const [couponLoading, setCouponLoading] = useState(false);

    const shippingCost = 50.00;

    const discountAmount = useMemo(() => {
        if (!appliedCoupon) return 0;
        
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
        } else { // 'amount'
            discount = appliedCoupon.discountValue;
        }
        
        // Ensure discount doesn't exceed the applicable total
        return Math.min(discount, applicableTotal);

    }, [appliedCoupon, items, totalPrice]);

    const total = totalPrice - discountAmount + shippingCost;

    const form = useForm<z.infer<typeof checkoutSchema>>({
        resolver: zodResolver(checkoutSchema),
        defaultValues: {
            fullName: "",
            mobileNumber: "",
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
                mobileNumber: "",
                address: "", 
                city: "",
                postalCode: "",
                country: "India",
                paymentMethod: "cod",
            });
        }
    }, [user, form.reset]);


    useEffect(() => {
        if (!cartLoading && items.length === 0 && !redirect) {
            router.replace("/shop");
        }
    }, [items, cartLoading, router, redirect]);

    const handleApplyCoupon = async () => {
        if (!couponCode) return;
        setCouponLoading(true);
        try {
            const q = query(collection(db, "coupons"), where("code", "==", couponCode.toUpperCase()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                toast({ variant: "destructive", title: "Invalid Coupon Code" });
                setAppliedCoupon(null);
                return;
            } 
            
            const couponDoc = querySnapshot.docs[0];
            const couponData = { firestoreId: couponDoc.id, ...couponDoc.data() } as Coupon;

            // Check if coupon is active and not expired
            const now = new Date();
            const expiryDate = couponData.expiryDate?.toDate();

            if (couponData.status !== 'active') {
                toast({ variant: "destructive", title: "Coupon is not active" });
                setAppliedCoupon(null);
                return;
            }

            if (expiryDate && expiryDate < now) {
                toast({ variant: "destructive", title: "This coupon has expired" });
                setAppliedCoupon(null);
                return;
            }

            setAppliedCoupon(couponData);
            toast({ title: "Coupon Applied!", description: `Discount of ${couponData.discountValue}${couponData.discountType === 'percentage' ? '%' : '₹'} applied.` });

        } catch (error) {
            toast({ variant: "destructive", title: "Error applying coupon" });
        } finally {
            setCouponLoading(false);
        }
    };

    const removeCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode("");
        toast({ title: "Coupon removed" });
    }

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
                discount: discountAmount,
                coupon: appliedCoupon?.code || null,
                total,
                status: 'pending',
                createdAt: serverTimestamp(),
            };

            await addDoc(collection(db, "orders"), orderData);

            // Increment coupon usage count if a coupon was applied
            if (appliedCoupon) {
                const couponRef = doc(db, "coupons", appliedCoupon.firestoreId);
                await updateDoc(couponRef, {
                    usageCount: increment(1)
                });
            }

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
                    <div className="md:col-span-2 space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Shipping Information</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="fullName"
                                    render={({ field }) => (
                                        <FormItem>
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
                                    name="mobileNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Mobile Number</FormLabel>
                                            <FormControl>
                                                <Input placeholder="10-digit mobile number" {...field} value={field.value ?? ''} />
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
                                            <FormLabel>Pincode</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Your Pincode" {...field} value={field.value ?? ''} />
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
                        
                        <Card>
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

    
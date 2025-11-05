
"use client";

import { notFound, useRouter, useParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useEffect, Suspense, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { addDoc, collection, serverTimestamp, getDocs, query, where, doc, getDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2 } from "lucide-react";
import type { Product } from "@/lib/data";
import { Label } from "@/components/ui/label";

const rentCheckoutSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  mobileNumber: z.string().regex(/^[6-9]\d{9}$/, "Invalid mobile number"),
  email: z.string().email("Invalid email address"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  postalCode: z.string().regex(/^\d{6}$/, "Invalid Pincode"),
  country: z.string().min(2, "Country is required"),
  rentalPlanId: z.string({ required_error: "You must select a rental plan." }),
});

interface RentalPlan {
  id: string;
  duration: number;
  feePercentage: number;
}

function RentCheckoutForm() {
    const params = useParams();
    const productId = params.id as string;
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [product, setProduct] = useState<Product | null>(null);
    const [rentalPlans, setRentalPlans] = useState<RentalPlan[]>([]);
    const [loadingProduct, setLoadingProduct] = useState(true);

    const shippingCost = 100.00;

    const form = useForm<z.infer<typeof rentCheckoutSchema>>({
        resolver: zodResolver(rentCheckoutSchema),
        defaultValues: {
            fullName: "",
            mobileNumber: "",
            email: "",
            address: "",
            city: "",
            postalCode: "",
            country: "India",
        },
    });

    const selectedPlanId = form.watch("rentalPlanId");

    const { rentalFee, refundAmount, securityDeposit, taxAmount, totalAmount } = useMemo(() => {
        if (!product || !selectedPlanId) {
            return { rentalFee: 0, refundAmount: 0, securityDeposit: 0, taxAmount: 0, totalAmount: 0 };
        }
        const plan = rentalPlans.find(p => p.id === selectedPlanId);
        if (!plan) {
            return { rentalFee: 0, refundAmount: 0, securityDeposit: 0, taxAmount: 0, totalAmount: 0 };
        }

        const securityDeposit = product.price;
        const rentalFee = (securityDeposit * plan.feePercentage) / 100;
        const refundAmount = securityDeposit - rentalFee;
        const taxAmount = rentalFee * 0.18;
        const totalAmount = securityDeposit + taxAmount + shippingCost; // User pays deposit + tax on fee + shipping

        return { rentalFee, refundAmount, securityDeposit, taxAmount, totalAmount };
    }, [product, selectedPlanId, rentalPlans, shippingCost]);

    useEffect(() => {
        const fetchProductAndPlans = async () => {
            if (!productId) return;
            setLoadingProduct(true);
            try {
                // Fetch Product
                const productQuery = query(collection(db, "products"), where("id", "==", productId));
                const productSnapshots = await getDocs(productQuery);

                if (productSnapshots.empty || productSnapshots.docs[0].data().category !== 'Kits') {
                    return notFound();
                }
                const productDoc = productSnapshots.docs[0];
                setProduct({ firestoreId: productDoc.id, ...productDoc.data() } as Product);

                // Fetch Rental Plans
                const plansQuery = query(collection(db, "rentalPlans"), orderBy("duration"));
                const plansSnapshot = await getDocs(plansQuery);
                const plansData = plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RentalPlan));
                setRentalPlans(plansData);

            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoadingProduct(false);
            }
        };
        fetchProductAndPlans();
    }, [productId]);
    
    useEffect(() => {
        if (!authLoading && !user) {
            router.replace(`/login?redirect=/rent/${productId}`);
        }
    }, [user, authLoading, router, productId]);

    useEffect(() => {
        if (user) {
            form.reset({
                ...form.getValues(),
                fullName: user.displayName || "",
                email: user.email || "",
            });
        }
    }, [user, form]);


    async function onSubmit(data: z.infer<typeof rentCheckoutSchema>) {
        if (!user || !product || !selectedPlanId) return;

        const plan = rentalPlans.find(p => p.id === selectedPlanId);
        if (!plan) return;

        try {
            const rentalOrderData = {
                userId: user.uid,
                productId: product.id,
                productName: product.name,
                ...data,
                rentalPlan: plan,
                securityDeposit: product.price,
                rentalFee,
                taxAmount,
                shippingCost,
                totalPaid: totalAmount,
                potentialRefund: refundAmount,
                status: 'rented',
                createdAt: serverTimestamp(),
            };

            await addDoc(collection(db, "rentals"), rentalOrderData);

            toast({
                title: "Rental Order Placed!",
                description: "Your rental has been confirmed. We'll ship your kit shortly.",
            });
            router.push("/order-confirmation");

        } catch (error) {
            console.error("Error placing rental order:", error);
            toast({
                variant: "destructive",
                title: "Order Failed",
                description: "There was a problem placing your rental order. Please try again.",
            });
        }
    }

    if (authLoading || loadingProduct || !user || !product) {
        return (
             <div className="container mx-auto flex h-[60vh] flex-col items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        )
    }
    
    const imageSrc = product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : "https://placehold.co/64x64";

    return (
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="font-headline text-3xl font-bold tracking-tight">Rent Kit</h1>
            <p className="text-muted-foreground mt-1">You are renting: <span className="font-semibold text-foreground">{product.name}</span></p>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-12">
                    <div className="md:col-span-2 space-y-8">
                        {/* Rental Plan Selection */}
                        <Card>
                             <CardHeader>
                                <CardTitle className="font-headline">Choose Your Rental Plan</CardTitle>
                             </CardHeader>
                             <CardContent>
                                 <FormField
                                    control={form.control}
                                    name="rentalPlanId"
                                    render={({ field }) => (
                                        <FormItem>
                                             <FormControl>
                                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {rentalPlans.map(plan => (
                                                         <FormItem key={plan.id}>
                                                            <Label htmlFor={plan.id} className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 text-center hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer">
                                                                <RadioGroupItem value={plan.id} id={plan.id} className="sr-only" />
                                                                <span className="text-xl font-bold">{plan.duration}</span>
                                                                <span className="font-normal mb-2 text-sm">Days</span>
                                                                <Separator/>
                                                                <span className="mt-2 text-xs text-muted-foreground">Fee: {plan.feePercentage}%</span>
                                                            </Label>
                                                        </FormItem>
                                                    ))}
                                                </RadioGroup>
                                             </FormControl>
                                             <FormMessage className="pt-2"/>
                                        </FormItem>
                                    )}
                                 />
                             </CardContent>
                        </Card>
                        {/* Shipping Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Shipping Information</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                               <FormField control={form.control} name="fullName" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Your Name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="mobileNumber" render={({ field }) => (<FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input placeholder="10-digit mobile number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="email" render={({ field }) => (<FormItem className="sm:col-span-2"><FormLabel>Email Address</FormLabel><FormControl><Input placeholder="you@example.com" type="email" {...field} value={field.value ?? ''} readOnly /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="address" render={({ field }) => (<FormItem className="sm:col-span-2"><FormLabel>Address</FormLabel><FormControl><Input placeholder="Your Address" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="city" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="Your City" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="postalCode" render={({ field }) => (<FormItem><FormLabel>Pincode</FormLabel><FormControl><Input placeholder="Your Pincode" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                 <FormField control={form.control} name="country" render={({ field }) => (<FormItem className="sm:col-span-2"><FormLabel>Country</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Order Summary */}
                    <div className="md:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Rental Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                               <div className="flex items-center gap-4">
                                    <div className="relative h-16 w-16 flex-shrink-0 rounded-md bg-muted">
                                        <Image src={imageSrc} alt={product.name} fill className="object-cover" sizes="64px" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">{product.name}</p>
                                        <p className="text-sm text-muted-foreground">Rental</p>
                                    </div>
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span>Security Deposit</span>
                                        <span>₹{securityDeposit.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Rental Fee</span>
                                        <span>₹{rentalFee.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Tax on Fee (18%)</span>
                                        <span>₹{taxAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Shipping</span>
                                        <span>₹{shippingCost.toFixed(2)}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between font-bold text-lg">
                                        <span>Total Due Today</span>
                                        <span>₹{totalAmount.toFixed(2)}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between text-sm text-green-600 font-medium">
                                        <span>Potential Refund</span>
                                        <span>₹{refundAmount.toFixed(2)}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">The potential refund is the security deposit minus the rental fee. It will be processed after the kit is returned in good condition.</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Button type="submit" className="w-full mt-6" size="lg" disabled={form.formState.isSubmitting || !selectedPlanId}>
                            {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {form.formState.isSubmitting ? "Placing Order..." : "Pay and Rent"}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}

export default function RentPage() {
    return (
        <Suspense fallback={
            <div className="container mx-auto flex h-[60vh] flex-col items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        }>
            <RentCheckoutForm />
        </Suspense>
    )
}

    